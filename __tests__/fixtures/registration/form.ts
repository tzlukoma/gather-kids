import type { RegistrationFormInput } from '@/components/gatherKids/registration-wizard/registration-schema';
import { buildBaseConsents } from './consents';
import { buildChild, buildChildren, type BuildChildOptions } from './children';
import { buildGuardian, buildGuardians } from './guardians';
import { buildEmergencyContact, buildHousehold } from './household';

export type RegistrationFormOverrides = {
	household?: Partial<RegistrationFormInput['household']>;
	guardians?: RegistrationFormInput['guardians'];
	emergencyContact?: Partial<RegistrationFormInput['emergencyContact']>;
	children?: RegistrationFormInput['children'];
	consents?: Partial<RegistrationFormInput['consents']>;
};

export type BuildRegistrationFormOptions = {
	guardianCount?: number;
	childCount?: number;
	childOptions?: BuildChildOptions;
	overrides?: RegistrationFormOverrides;
};

/**
 * Full wizard-shaped registration form input for Jest / component tests.
 * Synthetic data only — safe for screenshots and DAL payload comparisons.
 */
export function buildRegistrationFormInput(
	options: BuildRegistrationFormOptions = {}
): RegistrationFormInput {
	const {
		guardianCount = 1,
		childCount = 1,
		childOptions,
		overrides = {},
	} = options;

	const base: RegistrationFormInput = {
		household: buildHousehold(),
		guardians:
			guardianCount === 1 ? [buildGuardian({ is_primary: true })] : buildGuardians(guardianCount),
		emergencyContact: buildEmergencyContact(),
		children:
			childCount === 1
				? [buildChild(childOptions)]
				: buildChildren(childCount, childOptions),
		consents: buildBaseConsents(),
	};

	return {
		...base,
		...overrides,
		household: { ...base.household, ...overrides.household },
		emergencyContact: {
			...base.emergencyContact,
			...overrides.emergencyContact,
		},
		consents: { ...base.consents, ...overrides.consents },
		guardians: overrides.guardians ?? base.guardians,
		children: overrides.children ?? base.children,
	};
}

/** Convenience: one guardian, one child, base consents accepted. */
export function buildMinimalRegistrationForm(): RegistrationFormInput {
	return buildRegistrationFormInput();
}

/** Multi-guardian / multi-child household for matrix coverage. */
export function buildMultiMemberRegistrationForm(
	guardianCount = 2,
	childCount = 2
): RegistrationFormInput {
	return buildRegistrationFormInput({ guardianCount, childCount });
}
