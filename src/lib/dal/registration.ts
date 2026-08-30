/**
 * DAL — Registration domain
 *
 * Household registration transaction (create or update a household with
 * guardians, emergency contacts, children, enrollments, and consents).
 * All functions delegate to the Supabase adapter (dbAdapter).  The legacy
 * Dexie/IndexedDB branches have been removed following the demo-mode
 * removal in Wave 3 (issue #191).
 */

import { db as dbAdapter } from '../database/factory';
import type { Child, Guardian, Household, EmergencyContact } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { gradeToCode } from '../gradeUtils';
import { ageOn } from './utils';

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

type RegistrationPayload = {
    household?: Partial<Household>;
    guardians?: Array<Partial<Guardian>>;
    emergencyContact?: Partial<EmergencyContact>;
    children?: Array<
        Partial<Child> & {
            ministrySelections?: Record<string, boolean>;
            interestSelections?: Record<string, boolean>;
            customData?: Record<string, unknown>;
        }
    >;
    consents?: { liability?: boolean; photoRelease?: boolean };
};

/**
 * Register or update a household including guardians, emergency contacts,
 * children, ministry enrollments, and consents.
 *
 * @param data    Registration payload (household, guardians, children, etc.)
 * @param cycle_id  Active registration cycle ID.
 * @param isPrefill  Deprecated — kept for test compatibility; ignored (always writes).
 */
export async function registerHousehold(
    data: unknown,
    cycle_id: string,
    isPrefill: boolean,
): Promise<{ household_id: string }> {
    const input = data as RegistrationPayload;

    const householdId = input.household?.household_id || uuidv4();
    const isUpdate = !!input.household?.household_id;
    const now = new Date().toISOString();

    return await dbAdapter.transaction(async () => {
        // ---------------------------------------------------------------
        // Household
        // ---------------------------------------------------------------
        const household = {
            household_id: householdId,
            name:
                input.household?.name ||
                `${
                    (input.guardians && (input.guardians[0] as Partial<Guardian>)?.last_name) ||
                    'Household'
                } Household`,
            address_line1: input.household?.address_line1,
            address_line2: input.household?.address_line2,
            city: input.household?.city,
            state: input.household?.state,
            zip: input.household?.zip,
            preferredScriptureTranslation: input.household?.preferredScriptureTranslation,
        };

        if (isUpdate) {
            await dbAdapter.updateHousehold(householdId, household);
            // Delete existing guardians and contacts so they can be recreated.
            const existingGuardians = await dbAdapter.listGuardians(householdId);
            const existingContacts = await dbAdapter.listEmergencyContacts(householdId);
            for (const guardian of existingGuardians) {
                await dbAdapter.deleteGuardian(guardian.guardian_id);
            }
            for (const contact of existingContacts) {
                await dbAdapter.deleteEmergencyContact(contact.contact_id);
            }
        } else {
            await dbAdapter.createHousehold(household);
        }

        // ---------------------------------------------------------------
        // Guardians
        // ---------------------------------------------------------------
        const createdGuardians: Guardian[] = [];
        for (const guardianData of input.guardians || []) {
            const gp = guardianData as Partial<Guardian>;
            const guardianPayload: Omit<Guardian, 'guardian_id' | 'created_at' | 'updated_at'> = {
                household_id: householdId,
                first_name: gp.first_name || '',
                last_name: gp.last_name || '',
                mobile_phone: gp.mobile_phone || '',
                email: gp.email || '',
                relationship: gp.relationship || '',
                is_primary: gp.is_primary ?? false,
            };
            const createdGuardian = await dbAdapter.createGuardian(guardianPayload);
            createdGuardians.push(createdGuardian);
        }

        // ---------------------------------------------------------------
        // Emergency contact
        // ---------------------------------------------------------------
        const emergencyPartial = input.emergencyContact as Partial<EmergencyContact> | undefined;
        if (emergencyPartial) {
            const emergencyPayload: Omit<EmergencyContact, 'contact_id' | 'created_at' | 'updated_at'> = {
                household_id: householdId,
                first_name: emergencyPartial.first_name || '',
                last_name: emergencyPartial.last_name || '',
                mobile_phone: emergencyPartial.mobile_phone || '',
                relationship: emergencyPartial.relationship || '',
            };
            await dbAdapter.createEmergencyContact(emergencyPayload);
        }

        // ---------------------------------------------------------------
        // Children, enrollments, and registrations
        // ---------------------------------------------------------------
        const existingChildrenBeforeLoop = isUpdate
            ? await dbAdapter.listChildren({ householdId })
            : [];
        const existingChildIdSet = new Set(
            existingChildrenBeforeLoop.map(c => c.child_id),
        );

        for (const childData of input.children || []) {
            type IncomingChild = Partial<Child> & {
                ministrySelections?: Record<string, boolean>;
                interestSelections?: Record<string, boolean>;
                customData?: Record<string, unknown>;
            };
            const childDataAny = childData as IncomingChild;
            const { ministrySelections, interestSelections, customData, ...childCore } = childDataAny;
            const childId = (childCore as Partial<Child>).child_id || uuidv4();

            const child = {
                ...childCore,
                child_id: childId,
                household_id: householdId,
                is_active: true,
            };

            if (existingChildIdSet.has(childId)) {
                await dbAdapter.updateChild(childId, child);
            } else {
                await dbAdapter.createChild(
                    child as unknown as Omit<Child, 'child_id' | 'created_at' | 'updated_at'>,
                );
            }

            if (isUpdate) {
                const existingEnrollments = await dbAdapter.listMinistryEnrollments(
                    childId,
                    undefined,
                    cycle_id,
                );
                for (const enrollment of existingEnrollments) {
                    await dbAdapter.deleteMinistryEnrollment(enrollment.enrollment_id);
                }

                const existingRegistrations = await dbAdapter.listRegistrations({
                    childId,
                    cycleId: cycle_id,
                });
                for (const registration of existingRegistrations) {
                    await dbAdapter.deleteRegistration(registration.registration_id);
                }
            }

            // Create registration record
            const primaryGuardian = createdGuardians[0];
            await dbAdapter.createRegistration({
                child_id: childId,
                cycle_id: cycle_id,
                status: 'active',
                pre_registered_sunday_school: true,
                consents: [
                    {
                        type: 'liability',
                        accepted_at: input.consents?.liability ? now : null,
                        signer_id: primaryGuardian.guardian_id,
                        signer_name: `${primaryGuardian.first_name} ${primaryGuardian.last_name}`,
                    },
                    {
                        type: 'photoRelease',
                        accepted_at: input.consents?.photoRelease ? now : null,
                        signer_id: primaryGuardian.guardian_id,
                        signer_name: `${primaryGuardian.first_name} ${primaryGuardian.last_name}`,
                    },
                ],
                submitted_at: now,
                submitted_via: 'web',
            });

            // Auto-enroll in Sunday School
            await dbAdapter.createMinistryEnrollment({
                child_id: childId,
                cycle_id: cycle_id,
                ministry_id: 'min_sunday_school',
                status: 'enrolled',
            });

            // Handle ministry and interest selections
            const allSelections = {
                ...(ministrySelections || {}),
                ...(interestSelections || {}),
            };
            const allMinistries = await dbAdapter.listMinistries();
            const ministryMap = new Map(allMinistries.map(m => [m.code, m]));

            for (const ministryCode in allSelections) {
                if (allSelections[ministryCode] && ministryCode !== 'min_sunday_school') {
                    const ministry = ministryMap.get(ministryCode);
                    if (ministry) {
                        const age = child.dob ? ageOn(now, child.dob) : null;
                        const minAge = ministry.min_age ?? -1;
                        const maxAge = ministry.max_age ?? 999;
                        if (age !== null && (age < minAge || age > maxAge)) {
                            console.warn(
                                `Skipping enrollment for ${child.first_name} in ${ministry.name} due to age restrictions.`,
                            );
                            continue;
                        }

                        const custom_fields: Record<string, unknown> = {};
                        if (customData && ministry.custom_questions) {
                            for (const q of ministry.custom_questions) {
                                if (customData[q.id] !== undefined) {
                                    custom_fields[q.id] = customData[q.id];
                                }
                            }
                        }

                        await dbAdapter.createMinistryEnrollment({
                            child_id: childId,
                            cycle_id: cycle_id,
                            ministry_id: ministry.ministry_id,
                            status: ministry.enrollment_type,
                            custom_fields:
                                Object.keys(custom_fields).length > 0 ? custom_fields : undefined,
                        });

                        // Handle Bible Bee enrollment
                        if (ministry.code === 'bible-bee') {
                            try {
                                const bibleBeeYears = await dbAdapter.listBibleBeeYears();
                                const bibleBeeYear = bibleBeeYears.find(year => year.is_active);

                                if (bibleBeeYear) {
                                    const gradeNum = child.grade ? gradeToCode(child.grade) : 0;
                                    const divisions = await dbAdapter.listDivisions(bibleBeeYear.id);

                                    const appropriateDivision = divisions.find(
                                        d =>
                                            gradeNum !== null &&
                                            gradeNum >= d.min_grade &&
                                            gradeNum <= d.max_grade,
                                    );

                                    if (appropriateDivision) {
                                        await dbAdapter.createEnrollment({
                                            id: uuidv4(),
                                            child_id: childId,
                                            bible_bee_cycle_id: bibleBeeYear.id,
                                            division_id: appropriateDivision.id,
                                            auto_enrolled: false,
                                            enrolled_at: now,
                                        });
                                        console.log(
                                            `Created Bible Bee enrollment for child ${child.first_name} in division ${appropriateDivision.name}`,
                                        );
                                    }
                                }
                            } catch (error) {
                                console.error('Error creating Bible Bee enrollment:', error);
                            }
                        }
                    }
                }
            }
        }

        return { household_id: householdId };
    });
}
