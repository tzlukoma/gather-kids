import { isOnOrAfterInET, formatDateInET, getCurrentDateInET } from '@/lib/utils/timezone';

describe('Timezone utilities', () => {
    describe('isOnOrAfterInET', () => {
        it('returns true when current time is after target date in ET', () => {
            const now = '2025-09-20T10:00:00Z'; // Later date
            const target = '2025-09-19T10:00:00Z'; // Earlier date
            expect(isOnOrAfterInET(now, target)).toBe(true);
        });

        it('returns false when current time is before target date in ET', () => {
            const now = '2025-09-18T10:00:00Z'; // Earlier date  
            const target = '2025-09-19T10:00:00Z'; // Later date
            expect(isOnOrAfterInET(now, target)).toBe(false);
        });

        it('returns true when dates are equal in ET', () => {
            const date = '2025-09-19T12:00:00Z';
            expect(isOnOrAfterInET(date, date)).toBe(true);
        });

        it('works with Date objects', () => {
            const now = new Date('2025-09-20T10:00:00Z');
            const target = new Date('2025-09-19T10:00:00Z');
            expect(isOnOrAfterInET(now, target)).toBe(true);
        });

        it('handles EST/EDT transitions correctly', () => {
            // Test a date in winter (EST) vs summer (EDT)
            const winterDate = '2025-01-15T12:00:00Z';
            const summerDate = '2025-07-15T12:00:00Z';
            
            // These should work regardless of timezone transitions
            expect(isOnOrAfterInET(summerDate, winterDate)).toBe(true);
            expect(isOnOrAfterInET(winterDate, summerDate)).toBe(false);
        });
    });

    describe('formatDateInET', () => {
        it('formats dates correctly in ET timezone', () => {
            const date = '2025-09-28T12:00:00Z';
            const formatted = formatDateInET(date);
            
            // Should format as "Sep 28, 2025" regardless of server timezone
            expect(formatted).toMatch(/Sep 28, 2025/);
        });

        it('works with Date objects', () => {
            const date = new Date('2025-12-25T12:00:00Z');
            const formatted = formatDateInET(date);
            
            expect(formatted).toMatch(/Dec 25, 2025/);
        });

        it('handles different months correctly', () => {
            const jan = formatDateInET('2025-01-01T12:00:00Z');
            const jul = formatDateInET('2025-07-04T12:00:00Z');
            
            expect(jan).toMatch(/Jan 1, 2025/);
            expect(jul).toMatch(/Jul 4, 2025/);
        });
    });

    describe('getCurrentDateInET', () => {
        it('returns a Date object', () => {
            const current = getCurrentDateInET();
            expect(current).toBeInstanceOf(Date);
        });

        it('returns a valid date', () => {
            const current = getCurrentDateInET();
            expect(current.getTime()).not.toBeNaN();
        });
    });
});