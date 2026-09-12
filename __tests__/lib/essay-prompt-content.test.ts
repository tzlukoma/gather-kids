import {
	escapeHtml,
	formatEssayDueDate,
	isEssayHtmlEmpty,
	sanitizeEssayHtml,
	toEssayDisplayHtml,
	wrapPlainTextAsHtml,
} from '@/lib/essay-prompt-content';

describe('essay-prompt-content', () => {
	describe('sanitizeEssayHtml', () => {
		it('keeps allowed formatting tags', () => {
			const html =
				'<p>Choose <strong>one name</strong> or <em>title</em>.</p><ul><li>Use the book</li></ul>';
			expect(sanitizeEssayHtml(html)).toContain('<strong>one name</strong>');
			expect(sanitizeEssayHtml(html)).toContain('<em>title</em>');
			expect(sanitizeEssayHtml(html)).toContain('<li>Use the book</li>');
		});

		it('strips script tags', () => {
			const html = '<p>Safe</p><script>alert(1)</script>';
			const result = sanitizeEssayHtml(html);
			expect(result).not.toMatch(/<script/i);
			expect(result).toContain('Safe');
		});

		it('strips images and event handlers', () => {
			const html = '<p>Hi<img src="x" onerror="alert(1)"></p>';
			const result = sanitizeEssayHtml(html);
			expect(result).not.toMatch(/<img/i);
			expect(result).not.toMatch(/onerror/i);
			expect(result).toContain('Hi');
		});

		it('returns empty string for empty input', () => {
			expect(sanitizeEssayHtml('')).toBe('');
		});
	});

	describe('isEssayHtmlEmpty', () => {
		it('treats blank, empty paragraphs, and nbsp as empty', () => {
			expect(isEssayHtmlEmpty('')).toBe(true);
			expect(isEssayHtmlEmpty('   ')).toBe(true);
			expect(isEssayHtmlEmpty('<p></p>')).toBe(true);
			expect(isEssayHtmlEmpty('<p><br></p>')).toBe(true);
			expect(isEssayHtmlEmpty('<p>&nbsp;</p>')).toBe(true);
			expect(isEssayHtmlEmpty(null)).toBe(true);
		});

		it('treats real text as non-empty', () => {
			expect(isEssayHtmlEmpty('<p>Hello</p>')).toBe(false);
			expect(isEssayHtmlEmpty('plain text')).toBe(false);
		});
	});

	describe('toEssayDisplayHtml', () => {
		it('wraps legacy plain text, escaping characters and preserving paragraphs', () => {
			const result = toEssayDisplayHtml('Hello & friends\n\nSecond');
			expect(result).toContain('<p>Hello &amp; friends</p>');
			expect(result).toContain('<p>Second</p>');
		});

		it('sanitizes existing HTML rather than escaping tags', () => {
			const result = toEssayDisplayHtml(
				'<p>Use <strong>100 Names of God</strong></p>'
			);
			expect(result).toContain('<strong>100 Names of God</strong>');
		});
	});

	describe('wrapPlainTextAsHtml', () => {
		it('turns single newlines into br tags', () => {
			expect(wrapPlainTextAsHtml('a\nb')).toBe('<p>a<br>b</p>');
		});
	});

	describe('escapeHtml', () => {
		it('escapes markup characters', () => {
			expect(escapeHtml('<b>&</b>')).toBe('&lt;b&gt;&amp;&lt;/b&gt;');
		});
	});

	describe('formatEssayDueDate', () => {
		it('formats an ISO local wall-clock string', () => {
			const result = formatEssayDueDate('2027-01-03T23:59:00');
			expect(result).toContain('January 3, 2027');
			expect(result).toContain('11:59 PM');
		});
	});
});
