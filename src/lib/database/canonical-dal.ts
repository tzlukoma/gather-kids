import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import * as CanonicalDtos from './canonical-dtos';
import { db } from '../db';
import { db as dbAdapter } from './factory';
import { isDemo } from '../featureFlags';
import type { Guardian, Registration } from '../types';
import { ageOn } from '../dal';
import { gradeToCode } from '../gradeUtils';
import { enrollChildInBibleBee } from '../bibleBee';

/**
 * Enhanced DAL functions that use canonical snake_case DTOs internally
 * while maintaining backward compatibility with existing UI interfaces
 * 
 * This provides the "fresh start" data shapes while preserving existing APIs
 */

/**
 * Convert registration form data to canonical DTOs for processing
 * This handles the legacy camelCase -> snake_case conversion
 */
// Small helpers to normalize unknown inputs to safer shapes
function toRecord(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  return {};
}

function toArrayRecords(value: unknown): Array<Record<string, unknown>> {
  if (!value) return [];
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  return [];
}

function convertFormDataToCanonical(data: Record<string, unknown>): {
  household: CanonicalDtos.HouseholdWrite;
  guardians: CanonicalDtos.GuardianWrite[];
  emergencyContact: CanonicalDtos.EmergencyContactWrite;
  children: CanonicalDtos.ChildWrite[];
  consents: Array<{
    liability: boolean;
    photo_release: boolean; // Convert from photoRelease
    group_consents?: Record<string, string>; // 'yes'/'no' values
    custom_consents?: Record<string, boolean>;
  }>;
} {
  const d = data as Record<string, unknown>;
  // Convert household data to canonical format
  const householdSrc = toRecord(d['household']);
  
  // Convert guardians to get primary guardian's email for household primary_email
  const guardiansSrc = toArrayRecords(d['guardians']);
  const primaryGuardian = guardiansSrc.find(g => g['is_primary'] === true) || guardiansSrc[0];
  const primaryGuardianEmail = primaryGuardian?.['email'] as string | undefined;
  
  const household = CanonicalDtos.HouseholdWriteDto.parse({
    household_id: householdSrc['household_id'] as string | undefined,
    name: householdSrc['name'] as string | undefined,
    address_line1: householdSrc['address_line1'] as string | undefined,
    address_line2: householdSrc['address_line2'] as string | undefined,
    city: householdSrc['city'] as string | undefined,
    state: householdSrc['state'] as string | undefined,
    zip: householdSrc['zip'] as string | undefined,
    preferred_scripture_translation: householdSrc['preferredScriptureTranslation'] as string | undefined, // camelCase -> snake_case
    primary_email: primaryGuardianEmail, // Derive from primary guardian's email
    primary_phone: householdSrc['primary_phone'] as string | undefined,
    photo_url: householdSrc['photo_url'] as string | undefined,
  });

  // Convert guardians to canonical format
  const householdIdToUse = (householdSrc['household_id'] as string | undefined) || uuidv4();
  const guardians = guardiansSrc.map((guardian) =>
    CanonicalDtos.GuardianWriteDto.parse({
      guardian_id: guardian['guardian_id'] as string | undefined,
      household_id: householdIdToUse,
      first_name: guardian['first_name'] as string | undefined,
      last_name: guardian['last_name'] as string | undefined,
      mobile_phone: guardian['mobile_phone'] as string | undefined,
      email: guardian['email'] as string | undefined,
      relationship: guardian['relationship'] as string | undefined,
      is_primary: guardian['is_primary'] as boolean | undefined,
    })
  );

  // Convert emergency contact to canonical format
  const emergencySrc = toRecord(d['emergencyContact']);
  const emergencyContact = CanonicalDtos.EmergencyContactWriteDto.parse({
    contact_id: emergencySrc['contact_id'] as string | undefined,
    household_id: householdIdToUse,
    first_name: emergencySrc['first_name'] as string | undefined,
    last_name: emergencySrc['last_name'] as string | undefined,
    mobile_phone: emergencySrc['mobile_phone'] as string | undefined,
    relationship: emergencySrc['relationship'] as string | undefined,
  });

  // Convert children to canonical format
  const childrenSrc = toArrayRecords(d['children']);
  const children = childrenSrc.map((child) =>
    CanonicalDtos.ChildWriteDto.parse({
      child_id: child['child_id'] as string | undefined,
      household_id: householdIdToUse,
      first_name: child['first_name'] as string | undefined,
      last_name: child['last_name'] as string | undefined,
      dob: child['dob'] as string | undefined,
      grade: child['grade'] as string | undefined,
      child_mobile: child['child_mobile'] as string | undefined,
      allergies: child['allergies'] as string | undefined,
      medical_notes: child['medical_notes'] as string | undefined,
      special_needs: child['special_needs'] as boolean | undefined,
      special_needs_notes: child['special_needs_notes'] as string | undefined,
      is_active: child['is_active'] !== undefined ? Boolean(child['is_active']) : true,
      photo_url: child['photo_url'] as string | undefined,
    })
  );

  // Convert consents to canonical format (photoRelease -> photo_release)
  const consentsSrc = toRecord(d['consents']);
  const consents = [{
    liability: Boolean(consentsSrc['liability']),
    photo_release: Boolean(consentsSrc['photoRelease']), // camelCase -> snake_case
    group_consents: consentsSrc['group_consents'] as Record<string, string> | undefined,
    custom_consents: consentsSrc['custom_consents'] as Record<string, boolean> | undefined,
  }];

  return {
    household,
    guardians,
    emergencyContact,
    children,
    consents,
  };
}

/**
 * Enhanced registerHousehold function that uses canonical DTOs internally
 * Maintains exact API compatibility while standardizing data shapes
 */
export async function registerHouseholdCanonical(data: Record<string, unknown>, cycle_id: string, isPrefill: boolean) {
  console.log('🔄 Using canonical DTO-based registration flow');
  
  // Convert input data to canonical format and validate
  const canonicalData = convertFormDataToCanonical(data);
  
  const householdId = canonicalData.household.household_id || uuidv4();
  const isUpdate = !!canonicalData.household.household_id;
  const now = new Date().toISOString();

  if (!isDemo()) {
    // Use Supabase adapter with canonical data
    return await dbAdapter.transaction(async () => {
      // Handle household with canonical data
      const household = {
        household_id: householdId,
        name: canonicalData.household.name || `${canonicalData.guardians[0].last_name} Household`,
        address_line1: canonicalData.household.address_line1,
        address_line2: canonicalData.household.address_line2,
        city: canonicalData.household.city,
        state: canonicalData.household.state,
        zip: canonicalData.household.zip,
        // Use snake_case internally, but map to current DB schema as needed
        preferredScriptureTranslation: canonicalData.household.preferred_scripture_translation,
        email: canonicalData.household.primary_email, // Map primary_email to email field in DB
      };

      if (isUpdate) {
        await dbAdapter.updateHousehold(householdId, household);
        // Delete existing guardians and contacts for update
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

      // Create guardians using canonical data
      const createdGuardians: Guardian[] = [];
      for (const guardianData of canonicalData.guardians) {
        const createdGuardian = await dbAdapter.createGuardian({
          household_id: householdId,
          first_name: guardianData.first_name,
          last_name: guardianData.last_name,
          mobile_phone: guardianData.mobile_phone,
          email: guardianData.email,
          relationship: guardianData.relationship,
          is_primary: guardianData.is_primary,
        });
        createdGuardians.push(createdGuardian);
      }

      // Create emergency contact using canonical data
      await dbAdapter.createEmergencyContact({
        household_id: householdId,
        first_name: canonicalData.emergencyContact.first_name,
        last_name: canonicalData.emergencyContact.last_name,
        mobile_phone: canonicalData.emergencyContact.mobile_phone,
        relationship: canonicalData.emergencyContact.relationship,
      });

      // Handle robust update logic for existing children
      if (isUpdate && !isPrefill) {
        const existingChildren = await dbAdapter.listChildren({ householdId });
        const incomingChildIds = canonicalData.children.map(c => c.child_id).filter(Boolean);
        
        // Delete existing enrollments and registrations for children being updated
        for (const existingChild of existingChildren) {
          if (incomingChildIds.includes(existingChild.child_id)) {
            const existingEnrollments = await dbAdapter.listMinistryEnrollments(existingChild.child_id, undefined, cycle_id);
            for (const enrollment of existingEnrollments) {
              await dbAdapter.deleteMinistryEnrollment(enrollment.enrollment_id);
            }
            
            const existingRegistrations = await dbAdapter.listRegistrations({ childId: existingChild.child_id, cycleId: cycle_id });
            for (const registration of existingRegistrations) {
              await dbAdapter.deleteRegistration(registration.registration_id);
            }
          }
        }
        
        // Deactivate children who were removed from the form
        const childrenToRemove = existingChildren
          .filter(c => c.is_active)
          .map(c => c.child_id)
          .filter(id => !incomingChildIds.includes(id));
        
        for (const childIdToRemove of childrenToRemove) {
          await dbAdapter.updateChild(childIdToRemove, { is_active: false });
        }
      }

      // Handle children and enrollments with canonical data
      for (const [index, childData] of canonicalData.children.entries()) {
        console.log('DEBUG: Processing child at index', index, 'childData:', childData);
        const childId = childData.child_id || uuidv4();
        console.log('DEBUG: Generated childId:', childId, 'from childData.child_id:', childData.child_id);

        const child = {
          child_id: childId,
          household_id: householdId,
          first_name: childData.first_name,
          last_name: childData.last_name,
          dob: childData.dob,
          grade: childData.grade,
          child_mobile: childData.child_mobile,
          allergies: childData.allergies,
          medical_notes: childData.medical_notes,
          special_needs: childData.special_needs,
          special_needs_notes: childData.special_needs_notes,
          is_active: childData.is_active,
          photo_url: childData.photo_url,
        };

        if (isUpdate) {
          await dbAdapter.updateChild(childId, child);
        } else {
          console.log('DEBUG: About to create child with ID:', childId);
          const createdChild = await dbAdapter.createChild(child);
          console.log('DEBUG: Created child with ID:', createdChild.child_id);
        }

        // Create registration with canonical consent types

        // Create registration using canonical format
        const primaryGuardian = createdGuardians[0];
        const registrationData = CanonicalDtos.RegistrationWriteDto.parse({
          child_id: childId,
          cycle_id: cycle_id,
          status: 'active',
          pre_registered_sunday_school: true,
          consents: [
            { 
              type: 'liability' as const, 
              accepted_at: canonicalData.consents[0].liability ? now : null, 
              signer_id: primaryGuardian.guardian_id, 
              signer_name: `${primaryGuardian.first_name} ${primaryGuardian.last_name}` 
            },
            { 
              type: 'photo_release' as const, // Canonical snake_case
              accepted_at: canonicalData.consents[0].photo_release ? now : null, 
              signer_id: primaryGuardian.guardian_id, 
              signer_name: `${primaryGuardian.first_name} ${primaryGuardian.last_name}` 
            }
          ],
          submitted_via: 'web',
          submitted_at: now, // Set submitted_at in canonical format
        });

        // Convert back to legacy format for DAL compatibility
        const legacyRegistration = {
          registration_id: uuidv4(),
          child_id: registrationData.child_id,
          cycle_id: registrationData.cycle_id,
          status: registrationData.status,
          pre_registered_sunday_school: registrationData.pre_registered_sunday_school,
          consents: registrationData.consents.map((consent) => {
            const c = toRecord(consent);
            const rawType = String(c.type ?? 'custom');
            const mappedType = rawType === 'photo_release' ? 'photoRelease' : rawType === 'liability' ? 'liability' : 'custom';
            return {
              type: mappedType as 'photoRelease' | 'liability' | 'custom',
              accepted_at: (c.accepted_at as string | null) ?? null,
              signer_id: String(c.signer_id ?? ''),
              signer_name: String(c.signer_name ?? ''),
              text: c.text as string | undefined,
            };
          }),
          submitted_at: registrationData.submitted_at || now, // Use canonical submitted_at
          submitted_via: registrationData.submitted_via,
        };

        await dbAdapter.createRegistration(legacyRegistration);

        // Auto-enroll in Sunday School (same as legacy function)
        await dbAdapter.createMinistryEnrollment({
          child_id: childId,
          cycle_id: cycle_id,
          ministry_id: "min_sunday_school",
          status: 'enrolled',
        });

        // Handle ministry and interest selections with age validation and custom fields
  const childrenArray = toArrayRecords(data['children']);
        const originalChildData = childrenArray[index] ?? {};
        const ministrySelections = (originalChildData && (originalChildData['ministrySelections'] as Record<string, unknown> | undefined)) ?? undefined;
        const interestSelections = (originalChildData && (originalChildData['interestSelections'] as Record<string, unknown> | undefined)) ?? undefined;
        const customData = (originalChildData && (originalChildData['customData'] as Record<string, unknown> | undefined)) ?? undefined;
        
        // Combine ministry and interest selections
        const allSelections = { ...(ministrySelections || {}), ...(interestSelections || {}) };
        const allMinistries = await dbAdapter.listMinistries();
        const ministryMap = new Map(allMinistries.map(m => [m.code, m]));

        for (const ministryCode in allSelections) {
          if (allSelections[ministryCode] && ministryCode !== 'min_sunday_school') {
            const ministry = ministryMap.get(ministryCode);
            if (ministry) {
              // Age validation
              const age = child.dob ? ageOn(now, child.dob) : null;
              const minAge = ministry.min_age ?? -1;
              const maxAge = ministry.max_age ?? 999;
              if (age !== null && (age < minAge || age > maxAge)) {
                console.warn(`Skipping enrollment for ${child.first_name} in ${ministry.name} due to age restrictions.`);
                continue;
              }

              // Custom fields handling
              const custom_fields: { [key: string]: unknown } = {};
              if (customData && ministry.custom_questions) {
                for (const q of ministry.custom_questions) {
                  if (customData[q.id] !== undefined) {
                    custom_fields[q.id] = customData[q.id];
                  }
                }
              }

              try {
                console.log('DEBUG: Creating ministry enrollment for:', {
                  childId,
                  cycle_id,
                  ministry_id: ministry.ministry_id,
                  status: ministry.enrollment_type,
                  custom_fields
                });
                
                await dbAdapter.createMinistryEnrollment({
                  child_id: childId,
                  cycle_id: cycle_id,
                  ministry_id: ministry.ministry_id,
                  status: ministry.enrollment_type,
                  custom_fields: Object.keys(custom_fields).length > 0 ? custom_fields : undefined,
                });
                
                console.log('DEBUG: Successfully created ministry enrollment for ministry:', ministry.name);
              } catch (enrollmentError) {
                console.error('DEBUG: Failed to create ministry enrollment:', enrollmentError);
                throw enrollmentError;
              }

              // Handle Bible Bee enrollment through new system
              if (ministry.code === 'bible-bee') {
                try {
                  const bibleBeeYears = await dbAdapter.listBibleBeeYears();
                  const bibleBeeYear = bibleBeeYears.find(year => year.is_active);
                  
                  if (bibleBeeYear) {
                    const gradeNum = child.grade ? gradeToCode(child.grade) : 0;
                    const divisions = await dbAdapter.listDivisions(bibleBeeYear.id);
                    
                    const appropriateDivision = divisions.find(d => 
                      gradeNum !== null && gradeNum >= d.min_grade && gradeNum <= d.max_grade
                    );
                    
                    if (appropriateDivision) {
                      await dbAdapter.createEnrollment({
                        id: uuidv4(),
                        child_id: childId,
                        year_id: bibleBeeYear.id,
                        division_id: appropriateDivision.id,
                        auto_enrolled: false,
                        enrolled_at: now,
                      });
                      console.log(`Created Bible Bee enrollment for child ${child.first_name} in division ${appropriateDivision.name}`);
                      
                      // Also assign scriptures for the child
                      try {
                        await enrollChildInBibleBee(childId, bibleBeeYear.id);
                      } catch (scriptureError) {
                        console.warn(`Warning: Failed to assign scriptures for child ${child.first_name}:`, scriptureError);
                        // Don't fail the entire registration if scripture assignment fails
                      }
                    } else {
                      console.warn(`No appropriate Bible Bee division found for child ${child.first_name} in grade ${child.grade}`);
                    }
                  } else {
                    console.warn(`No active Bible Bee year found - skipping Bible Bee enrollment for ${child.first_name}`);
                    // Don't fail the entire registration if no Bible Bee year exists
                  }
                } catch (error) {
                  console.error('Error creating Bible Bee enrollment:', error);
                  // Don't fail the entire registration if Bible Bee enrollment fails
                }
              }
            }
          }
        }
      }

      console.log('✅ Canonical registration completed successfully');
      
      // Create user_households relationship for Supabase auth
      let userHouseholdsCreated = false;
      let roleAssigned = false;
      
      if (!isPrefill) { // Only create the relationship on final registration, not prefill
        console.log('DEBUG: Starting user_households creation and role assignment');
        try {
          // Import here to avoid circular dependency issues
          const { supabase } = await import('@/lib/supabaseClient');
          if (supabase) {
            console.log('DEBUG: Supabase client available');
            const { data: { session } } = await supabase.auth.getSession();
            console.log('DEBUG: Session check result:', {
              hasSession: !!session,
              hasUser: !!session?.user,
              userId: session?.user?.id
            });
            if (session?.user) {
              // Check if relationship already exists using adapter
              const existingHouseholdId = await dbAdapter.getHouseholdForUser(session.user.id);
              
              if (!existingHouseholdId) {
                // Create the user_households relationship using adapter
                const userHousehold = {
                  user_household_id: uuidv4(),
                  auth_user_id: session.user.id,
                  household_id: householdId,
                  created_at: now,
                };
                
                // For Supabase mode, we need to insert directly since there's no createUserHousehold method
                const { supabase } = await import('@/lib/supabaseClient');
                const { error } = await supabase.from('user_households').insert(userHousehold);
                if (error) {
                  console.error('Could not create user_households relationship:', error);
                } else {
                  console.log('Created user_households relationship:', userHousehold);
                  userHouseholdsCreated = true;
                }
              } else {
                console.log('User already has household relationship:', existingHouseholdId);
                userHouseholdsCreated = true; // Already exists
              }

              // Assign GUARDIAN role to the authenticated user
              console.log('DEBUG: About to assign GUARDIAN role to user:', session.user.id);
              const { error: roleError } = await supabase.auth.updateUser({
                data: {
                  role: 'GUARDIAN',
                  household_id: householdId,
                },
              });

              if (roleError) {
                console.warn('Could not assign GUARDIAN role:', roleError);
              } else {
                console.log('Assigned GUARDIAN role to user:', session.user.id);
                roleAssigned = true;
                
                // Force a session refresh to ensure the AuthContext picks up the role change
                try {
                  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                  if (refreshError) {
                    console.warn('Could not refresh session after role assignment:', refreshError);
                  } else {
                    console.log('Session refreshed successfully after role assignment');
                  }
                } catch (refreshErr) {
                  console.warn('Error refreshing session:', refreshErr);
                }
              }
            } else {
              console.log('DEBUG: No session or user found, skipping role assignment');
            }
          }
        } catch (error) {
          console.warn('Could not create user_households relationship:', error);
        }
      } else {
        // For prefill, we don't create relationships or assign roles
        userHouseholdsCreated = true;
        roleAssigned = true;
      }
      
      return { 
        household_id: householdId,
        userHouseholdsCreated,
        roleAssigned,
        isComplete: userHouseholdsCreated && roleAssigned
      };
    });
  } else {
    // Use dbAdapter for demo mode - same interface as Supabase mode
    console.log('🔄 Using dbAdapter for demo mode with canonical data validation');
    
    return await dbAdapter.transaction(async () => {
      // Handle household with canonical data
      const household = {
        household_id: householdId,
        name: canonicalData.household.name || `${canonicalData.guardians[0].last_name} Household`,
        address_line1: canonicalData.household.address_line1,
        address_line2: canonicalData.household.address_line2,
        city: canonicalData.household.city,
        state: canonicalData.household.state,
        zip: canonicalData.household.zip,
        preferredScriptureTranslation: canonicalData.household.preferred_scripture_translation,
        email: canonicalData.household.primary_email, // Map primary_email to email field in DB
      };

      if (isUpdate) {
        await dbAdapter.updateHousehold(householdId, household);
        // Delete existing guardians and contacts for update
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

      // Create guardians using canonical data
      const createdGuardians: Guardian[] = [];
      for (const guardianData of canonicalData.guardians) {
        const createdGuardian = await dbAdapter.createGuardian({
          household_id: householdId,
          first_name: guardianData.first_name,
          last_name: guardianData.last_name,
          mobile_phone: guardianData.mobile_phone,
          email: guardianData.email,
          relationship: guardianData.relationship,
          is_primary: guardianData.is_primary,
        });
        createdGuardians.push(createdGuardian);
      }

      // Create emergency contact using canonical data
      await dbAdapter.createEmergencyContact({
        household_id: householdId,
        first_name: canonicalData.emergencyContact.first_name,
        last_name: canonicalData.emergencyContact.last_name,
        mobile_phone: canonicalData.emergencyContact.mobile_phone,
        relationship: canonicalData.emergencyContact.relationship,
      });

      // Handle robust update logic for existing children
      if (isUpdate && !isPrefill) {
        const existingChildren = await dbAdapter.listChildren({ householdId });
        const incomingChildIds = canonicalData.children.map(c => c.child_id).filter(Boolean);
        
        // Delete existing enrollments and registrations for children being updated
        for (const existingChild of existingChildren) {
          if (incomingChildIds.includes(existingChild.child_id)) {
            const existingEnrollments = await dbAdapter.listMinistryEnrollments(existingChild.child_id, undefined, cycle_id);
            for (const enrollment of existingEnrollments) {
              await dbAdapter.deleteMinistryEnrollment(enrollment.enrollment_id);
            }
            
            const existingRegistrations = await dbAdapter.listRegistrations({ childId: existingChild.child_id, cycleId: cycle_id });
            for (const registration of existingRegistrations) {
              await dbAdapter.deleteRegistration(registration.registration_id);
            }
          }
        }
        
        // Deactivate children who were removed from the form
        const childrenToRemove = existingChildren
          .filter(c => c.is_active)
          .map(c => c.child_id)
          .filter(id => !incomingChildIds.includes(id));
        
        for (const childIdToRemove of childrenToRemove) {
          await dbAdapter.updateChild(childIdToRemove, { is_active: false });
        }
      }

      // Handle children and enrollments with canonical data
      for (const [index, childData] of canonicalData.children.entries()) {
        console.log('DEBUG: Processing child at index', index, 'childData:', childData);
        const childId = childData.child_id || uuidv4();
        console.log('DEBUG: Generated childId:', childId, 'from childData.child_id:', childData.child_id);

        const child = {
          child_id: childId,
          household_id: householdId,
          first_name: childData.first_name,
          last_name: childData.last_name,
          dob: childData.dob,
          grade: childData.grade,
          child_mobile: childData.child_mobile,
          allergies: childData.allergies,
          medical_notes: childData.medical_notes,
          special_needs: childData.special_needs,
          special_needs_notes: childData.special_needs_notes,
          is_active: childData.is_active,
          photo_url: childData.photo_url,
        };

        if (isUpdate) {
          await dbAdapter.updateChild(childId, child);
        } else {
          console.log('DEBUG: About to create child with ID:', childId);
          const createdChild = await dbAdapter.createChild(child);
          console.log('DEBUG: Created child with ID:', createdChild.child_id);
        }

        // Create registration with canonical consent types
        const primaryGuardian = createdGuardians[0];
        
        // Build consents array including group consents
        const consentEntries = [
          { 
            type: 'liability' as const, 
            accepted_at: canonicalData.consents[0].liability ? now : null, 
            signer_id: primaryGuardian.guardian_id, 
            signer_name: `${primaryGuardian.first_name} ${primaryGuardian.last_name}` 
          },
          { 
            type: 'photo_release' as const, // Canonical snake_case
            accepted_at: canonicalData.consents[0].photo_release ? now : null, 
            signer_id: primaryGuardian.guardian_id, 
            signer_name: `${primaryGuardian.first_name} ${primaryGuardian.last_name}` 
          }
        ];
        
        // Add group consents as custom consents
        if (canonicalData.consents[0].group_consents) {
          for (const [groupCode, consentValue] of Object.entries(canonicalData.consents[0].group_consents)) {
            consentEntries.push({
              type: 'custom' as const,
              accepted_at: consentValue === 'yes' ? now : null,
              signer_id: primaryGuardian.guardian_id,
              signer_name: `${primaryGuardian.first_name} ${primaryGuardian.last_name}`,
              text: `Group consent for ${groupCode}: ${consentValue}`
            });
          }
        }
        
        // Add custom consents
        if (canonicalData.consents[0].custom_consents) {
          for (const [consentKey, consentValue] of Object.entries(canonicalData.consents[0].custom_consents)) {
            consentEntries.push({
              type: 'custom' as const,
              accepted_at: consentValue ? now : null,
              signer_id: primaryGuardian.guardian_id,
              signer_name: `${primaryGuardian.first_name} ${primaryGuardian.last_name}`,
              text: `Custom consent for ${consentKey}: ${consentValue}`
            });
          }
        }
        
        const registrationData = CanonicalDtos.RegistrationWriteDto.parse({
          child_id: childId,
          cycle_id: cycle_id,
          status: 'active',
          pre_registered_sunday_school: true,
          consents: consentEntries,
          submitted_via: 'web',
          submitted_at: now, // Set submitted_at in canonical format
        });

        // Convert back to legacy format for DAL compatibility
        const legacyRegistration = {
          registration_id: uuidv4(),
          child_id: registrationData.child_id,
          cycle_id: registrationData.cycle_id,
          status: registrationData.status,
          pre_registered_sunday_school: registrationData.pre_registered_sunday_school,
          consents: registrationData.consents.map((consent) => {
            const c = toRecord(consent);
            const rawType = String(c.type ?? 'custom');
            const mappedType = rawType === 'photo_release' ? 'photoRelease' : rawType === 'liability' ? 'liability' : 'custom';
            return {
              type: mappedType as 'photoRelease' | 'liability' | 'custom',
              accepted_at: (c.accepted_at as string | null) ?? null,
              signer_id: String(c.signer_id ?? ''),
              signer_name: String(c.signer_name ?? ''),
              text: c.text as string | undefined,
            };
          }),
          submitted_at: registrationData.submitted_at || now, // Use canonical submitted_at
          submitted_via: registrationData.submitted_via,
        };

        await dbAdapter.createRegistration(legacyRegistration);

        // Auto-enroll in Sunday School (same as legacy function)
        await dbAdapter.createMinistryEnrollment({
          child_id: childId,
          cycle_id: cycle_id,
          ministry_id: "min_sunday_school",
          status: 'enrolled',
        });

        // Handle ministry and interest selections with age validation and custom fields
        const childrenArray = toArrayRecords(data['children']);
        const originalChildData = childrenArray[index] ?? {};
        const ministrySelections = (originalChildData && (originalChildData['ministrySelections'] as Record<string, unknown> | undefined)) ?? undefined;
        const interestSelections = (originalChildData && (originalChildData['interestSelections'] as Record<string, unknown> | undefined)) ?? undefined;
        const customData = (originalChildData && (originalChildData['customData'] as Record<string, unknown> | undefined)) ?? undefined;
        
        // Combine ministry and interest selections
        const allSelections = { ...(ministrySelections || {}), ...(interestSelections || {}) };
        const allMinistries = await dbAdapter.listMinistries();
        const ministryMap = new Map(allMinistries.map(m => [m.code, m]));

        for (const ministryCode in allSelections) {
          if (allSelections[ministryCode] && ministryCode !== 'min_sunday_school') {
            const ministry = ministryMap.get(ministryCode);
            if (ministry) {
              // Age validation
              const age = child.dob ? ageOn(now, child.dob) : null;
              const minAge = ministry.min_age ?? -1;
              const maxAge = ministry.max_age ?? 999;
              if (age !== null && (age < minAge || age > maxAge)) {
                console.warn(`Skipping enrollment for ${child.first_name} in ${ministry.name} due to age restrictions.`);
                continue;
              }

              // Custom fields handling
              const custom_fields: { [key: string]: unknown } = {};
              if (customData && ministry.custom_questions) {
                for (const q of ministry.custom_questions) {
                  if (customData[q.id] !== undefined) {
                    custom_fields[q.id] = customData[q.id];
                  }
                }
              }

              try {
                console.log('DEBUG: Creating ministry enrollment for:', {
                  childId,
                  cycle_id,
                  ministry_id: ministry.ministry_id,
                  status: ministry.enrollment_type,
                  custom_fields
                });
                
                await dbAdapter.createMinistryEnrollment({
                  child_id: childId,
                  cycle_id: cycle_id,
                  ministry_id: ministry.ministry_id,
                  status: ministry.enrollment_type,
                  custom_fields: Object.keys(custom_fields).length > 0 ? custom_fields : undefined,
                });
                
                console.log('DEBUG: Successfully created ministry enrollment for ministry:', ministry.name);
              } catch (enrollmentError) {
                console.error('DEBUG: Failed to create ministry enrollment:', enrollmentError);
                throw enrollmentError;
              }

              // Handle Bible Bee enrollment through new system
              if (ministry.code === 'bible-bee') {
                try {
                  const bibleBeeYears = await dbAdapter.listBibleBeeYears();
                  const bibleBeeYear = bibleBeeYears.find(year => year.is_active);
                  
                  if (bibleBeeYear) {
                    const gradeNum = child.grade ? gradeToCode(child.grade) : 0;
                    const divisions = await dbAdapter.listDivisions(bibleBeeYear.id);
                    
                    const appropriateDivision = divisions.find(d => 
                      gradeNum !== null && gradeNum >= d.min_grade && gradeNum <= d.max_grade
                    );
                    
                    if (appropriateDivision) {
                      await dbAdapter.createEnrollment({
                        id: uuidv4(),
                        child_id: childId,
                        year_id: bibleBeeYear.id,
                        division_id: appropriateDivision.id,
                        auto_enrolled: false,
                        enrolled_at: now,
                      });
                      console.log(`Created Bible Bee enrollment for child ${child.first_name} in division ${appropriateDivision.name}`);
                      
                      // Also assign scriptures for the child
                      try {
                        await enrollChildInBibleBee(childId, bibleBeeYear.id);
                      } catch (scriptureError) {
                        console.warn(`Warning: Failed to assign scriptures for child ${child.first_name}:`, scriptureError);
                        // Don't fail the entire registration if scripture assignment fails
                      }
                    } else {
                      console.warn(`No appropriate Bible Bee division found for child ${child.first_name} in grade ${child.grade}`);
                    }
                  } else {
                    console.warn(`No active Bible Bee year found - skipping Bible Bee enrollment for ${child.first_name}`);
                    // Don't fail the entire registration if no Bible Bee year exists
                  }
                } catch (error) {
                  console.error('Error creating Bible Bee enrollment:', error);
                  // Don't fail the entire registration if Bible Bee enrollment fails
                }
              }
            }
          }
        }
      }

      console.log('✅ Canonical registration completed successfully (demo mode)');
      
      // For demo mode, we don't create user_households or assign roles
      // But we still return the new format for consistency
      return { 
        household_id: householdId,
        userHouseholdsCreated: true, // Demo mode doesn't need this
        roleAssigned: true, // Demo mode doesn't need this
        isComplete: true
      };
    });
  }
}

/**
 * Test function to validate canonical DTO conversion
 * This helps ensure data shape conversion works correctly
 */
export function testCanonicalConversion(sampleFormData: Record<string, unknown>): boolean {
  try {
    const canonicalData = convertFormDataToCanonical(sampleFormData);
    console.log('✅ Canonical conversion successful:', canonicalData);
    
    // Validate all required snake_case fields are present
    const requiredSnakeCaseFields = [
      'preferred_scripture_translation',
      'address_line1',
      'first_name',
      'last_name',
      'mobile_phone',
      'child_mobile',
      'medical_notes',
      'special_needs',
      'special_needs_notes',
      'is_primary',
      'is_active',
    ];
    
    // Check that no camelCase equivalents exist in canonical data
    const jsonString = JSON.stringify(canonicalData);
    const camelCaseFields = [
      'preferredScriptureTranslation',
      'firstName',
      'lastName',
      'mobilePhone',
      'childMobile',
      'medicalNotes',
      'specialNeeds',
      'specialNeedsNotes',
      'isPrimary',
      'isActive',
      'photoRelease', // Should be photo_release
    ];
    
    for (const camelField of camelCaseFields) {
      if (jsonString.includes(camelField)) {
        console.error(`❌ Found camelCase field in canonical data: ${camelField}`);
        return false;
      }
    }
    
    console.log('✅ All canonical data uses snake_case');
    return true;
  } catch (error) {
    console.error('❌ Canonical conversion failed:', error);
    return false;
  }
}