import {
	decodeQuotedPrintable,
	extractAuthCallbackUrl,
} from '@/lib/mailhog-link';

describe('quoted-printable MailHog bodies', () => {
	it('joins soft line breaks and decodes =3D', () => {
		expect(
			decodeQuotedPrintable(
				'http://localhost:3000/auth/callback?code=3Dabc=\ndef&type=3Dmagiclink'
			)
		).toBe(
			'http://localhost:3000/auth/callback?code=abcdef&type=magiclink'
		);
	});

	it('extracts a magic-link URL from a multipart quoted-printable body', () => {
		const rawBody = [
			'----_NmP-part',
			'Content-Type: text/plain; charset=utf-8',
			'Content-Transfer-Encoding: quoted-printable',
			'',
			'Click this link:',
			'http://localhost:3000/auth/callback?code=3DeyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20i=\nLCJ0eXBlIjoibWFnaWNfbGluayJ9&type=3Dmagiclink',
		].join('\n');

		expect(extractAuthCallbackUrl(rawBody)).toBe(
			'http://localhost:3000/auth/callback?code=eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ0eXBlIjoibWFnaWNfbGluayJ9&type=magiclink'
		);
	});

	it('extracts href after decoding quoted-printable HTML', () => {
		const html =
			'<a href=3D"http://localhost:3000/auth/callback?code=3Dabc&type=3Demail_verify">Verify</a>';
		expect(extractAuthCallbackUrl(html)).toBe(
			'http://localhost:3000/auth/callback?code=abc&type=email_verify'
		);
	});
});
