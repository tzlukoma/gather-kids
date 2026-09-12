import DOMPurify from 'dompurify';

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;

export const ESSAY_HTML_ALLOWED_TAGS = [
	'p',
	'br',
	'strong',
	'em',
	'b',
	'i',
	'ul',
	'ol',
	'li',
] as const;

const PURIFY_CONFIG = {
	ALLOWED_TAGS: [...ESSAY_HTML_ALLOWED_TAGS],
	ALLOWED_ATTR: [] as string[],
	KEEP_CONTENT: true,
};

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export function sanitizeEssayHtml(dirty: string): string {
	if (!dirty) return '';
	try {
		return DOMPurify.sanitize(dirty, PURIFY_CONFIG);
	} catch {
		return escapeHtml(dirty);
	}
}

export function isEssayHtmlEmpty(value: string | null | undefined): boolean {
	if (!value) return true;
	const text = value
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&#160;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return text.length === 0;
}

export function wrapPlainTextAsHtml(text: string): string {
	const normalized = text.replace(/\r\n/g, '\n').trim();
	if (!normalized) return '';
	return normalized
		.split(/\n{2,}/)
		.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
		.join('');
}

/** Sanitize HTML, or wrap legacy plain-text prompts so they still display. */
export function toEssayDisplayHtml(value: string | null | undefined): string {
	if (!value || !value.trim()) return '';
	if (HTML_TAG_RE.test(value)) {
		return sanitizeEssayHtml(value);
	}
	return sanitizeEssayHtml(wrapPlainTextAsHtml(value));
}

/**
 * Parent-facing due date formatter from the existing essay card.
 * Parses ISO `YYYY-MM-DDTHH:mm` as a local wall clock, not a UTC instant.
 */
export function formatEssayDueDate(dateStr: string): string {
	const dateOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	};
	const timeOptions: Intl.DateTimeFormatOptions = {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	};

	if (dateStr.includes('T')) {
		const [datePart, timePart] = dateStr.split('T');
		const [year, month, day] = datePart.split('-');
		const [time] = timePart.split(/[+-]/);
		const [hours, minutes] = time.split(':');

		const localDate = new Date(
			parseInt(year, 10),
			parseInt(month, 10) - 1,
			parseInt(day, 10),
			parseInt(hours, 10),
			parseInt(minutes, 10)
		);

		return (
			localDate.toLocaleDateString('en-US', dateOptions) +
			' at ' +
			localDate.toLocaleTimeString('en-US', timeOptions)
		);
	}

	const fallbackDate = new Date(dateStr);
	return (
		fallbackDate.toLocaleDateString('en-US', dateOptions) +
		' at ' +
		fallbackDate.toLocaleTimeString('en-US', timeOptions)
	);
}
