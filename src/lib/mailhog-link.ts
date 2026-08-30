/** Decode a quoted-printable MIME body (MailHog stores nodemailer output this way). */
export function decodeQuotedPrintable(input: string): string {
	return input
		.replace(/=\r?\n/g, '')
		.replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) =>
			String.fromCharCode(parseInt(hex, 16))
		);
}

/**
 * Find an /auth/callback URL in a raw MailHog message body.
 * Handles multipart MIME, quoted-printable `=3D` / soft line breaks, and href or bare URLs.
 */
export function extractAuthCallbackUrl(rawBody: string): string | null {
	const decoded = decodeQuotedPrintable(rawBody).replace(/&amp;/g, '&');

	const hrefMatch = decoded.match(/href="([^"]*\/auth\/callback[^"]*)"/i);
	if (hrefMatch?.[1]) {
		return hrefMatch[1];
	}

	const bareMatch = decoded.match(
		/https?:\/\/[^\s"'<>]+\/auth\/callback[^\s"'<>]*/i
	);
	if (bareMatch?.[0]) {
		return bareMatch[0].replace(/[.,;]+$/, '');
	}

	return null;
}
