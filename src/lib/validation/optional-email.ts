import { z } from 'zod';

/**
 * An email address a person may legitimately leave blank.
 *
 * `z.string().email(message).optional()` admits `undefined` but not `''`, and
 * `''` is exactly what an untouched text input holds — so the plain form quietly
 * makes the whole enclosing object invalid over a field nobody was required to
 * fill in.
 *
 * #460: that happened at two layers of registration at once. In the wizard the
 * submit button is gated on whole-form validity, so a blank guardian email left
 * it disabled forever with no message on any step the guardian could see; and in
 * `GuardianWriteDto` the same rule threw *after* submit, surfacing as a generic
 * "Submission Error" toast. Fixing either one alone just moves the dead end.
 *
 * Blank and absent both mean "not provided". Anything else has to be an address.
 */
export function optionalEmail(message: string) {
	return z
		.string()
		.refine((value) => value === '' || z.string().email().safeParse(value).success, {
			message,
		})
		.optional();
}
