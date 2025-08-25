import { ageOn, isEligibleForChoir, isWithinWindow, getTodayIsoDate } from '@/lib/dal';
import * as db from '@/lib/db';

// Mock the database module
jest.mock('@/lib/db', () => ({
    db: {
        ministries: {
            get: jest.fn(),
        },
        children: {
            get: jest.fn(),
        },
    },
}));

describe('DAL Utility Functions', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getTodayIsoDate', () => {
        it('returns today\'s date in ISO format YYYY-MM-DD', () => {
            const mockDate = new Date('2025-08-25');
            jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

            expect(getTodayIsoDate()).toBe('2025-08-25');

            jest.restoreAllMocks();
        });
    });

    describe('ageOn', () => {
        it('calculates age correctly based on date and DOB', () => {
            expect(ageOn('2025-08-25', '2015-08-24')).toBe(10);
            expect(ageOn('2025-08-25', '2015-08-25')).toBe(10);
            expect(ageOn('2025-08-25', '2015-08-26')).toBe(9);
        });

        it('returns null for invalid dates', () => {
            expect(ageOn('2025-08-25', 'invalid-date')).toBe(null);
            expect(ageOn('invalid-date', '2015-08-25')).toBe(null);
        });

        it('returns null when DOB is undefined', () => {
            expect(ageOn('2025-08-25', undefined)).toBe(null);
        });
    });

    describe('isEligibleForChoir', () => {
        const mockMinistry = {
            ministry_id: 'ministry1',
            name: 'Children\'s Choir',
            min_age: 8,
            max_age: 12,
        };

        const mockChild = {
            child_id: 'child1',
            first_name: 'John',
            last_name: 'Doe',
            dob: '2015-08-25', // 10 years old on 2025-08-25
        };

        beforeEach(() => {
            (db.db.ministries.get as jest.Mock).mockResolvedValue(mockMinistry);
            (db.db.children.get as jest.Mock).mockResolvedValue(mockChild);
        });

        it('returns true if child is within age range', async () => {
            expect(await isEligibleForChoir('ministry1', 'child1')).toBe(true);
        });

        it('returns false if child is too young', async () => {
            (db.db.ministries.get as jest.Mock).mockResolvedValue({
                ...mockMinistry,
                min_age: 11,
            });
            expect(await isEligibleForChoir('ministry1', 'child1')).toBe(false);
        });

        it('returns false if child is too old', async () => {
            (db.db.ministries.get as jest.Mock).mockResolvedValue({
                ...mockMinistry,
                max_age: 9,
            });
            expect(await isEligibleForChoir('ministry1', 'child1')).toBe(false);
        });

        it('returns false if ministry not found', async () => {
            (db.db.ministries.get as jest.Mock).mockResolvedValue(null);
            expect(await isEligibleForChoir('ministry1', 'child1')).toBe(false);
        });

        it('returns false if child not found', async () => {
            (db.db.children.get as jest.Mock).mockResolvedValue(null);
            expect(await isEligibleForChoir('ministry1', 'child1')).toBe(false);
        });

        it('returns false if child has no DOB', async () => {
            (db.db.children.get as jest.Mock).mockResolvedValue({
                ...mockChild,
                dob: undefined,
            });
            expect(await isEligibleForChoir('ministry1', 'child1')).toBe(false);
        });
    });

    describe('isWithinWindow', () => {
        const mockMinistry = {
            ministry_id: 'ministry1',
            name: 'Bible Bee',
            open_at: '2025-07-01',
            close_at: '2025-09-01',
        };

        beforeEach(() => {
            (db.db.ministries.get as jest.Mock).mockResolvedValue(mockMinistry);
        });

        it('returns true if date is within window', async () => {
            expect(await isWithinWindow('ministry1', '2025-08-01')).toBe(true);
        });

        it('returns false if date is before open date', async () => {
            expect(await isWithinWindow('ministry1', '2025-06-01')).toBe(false);
        });

        it('returns false if date is after close date', async () => {
            expect(await isWithinWindow('ministry1', '2025-09-02')).toBe(false);
        });

        it('returns false if ministry not found', async () => {
            (db.db.ministries.get as jest.Mock).mockResolvedValue(null);
            expect(await isWithinWindow('ministry1', '2025-08-01')).toBe(false);
        });

        it('returns true if open_at is not set', async () => {
            (db.db.ministries.get as jest.Mock).mockResolvedValue({
                ...mockMinistry,
                open_at: undefined,
            });
            expect(await isWithinWindow('ministry1', '2025-06-01')).toBe(true);
        });

        it('returns true if close_at is not set', async () => {
            (db.db.ministries.get as jest.Mock).mockResolvedValue({
                ...mockMinistry,
                close_at: undefined,
            });
            expect(await isWithinWindow('ministry1', '2025-09-02')).toBe(true);
        });
    });
});
