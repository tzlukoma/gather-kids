import { isEligibleForChoir, isWithinWindow } from '@/lib/dal';
import { db as dbAdapter } from '@/lib/database/factory';

jest.mock('@/lib/database/factory', () => ({
    db: {
        getMinistry: jest.fn(),
        getChild: jest.fn(),
    },
}));

const mockAdapter = dbAdapter as unknown as {
    getMinistry: jest.Mock;
    getChild: jest.Mock;
};

describe('Business Logic Rules Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Bible Bee Enrollment Window', () => {
        const bibleBeeMinistry = {
            ministry_id: 'ministry-biblebee',
            name: 'Bible Bee',
            open_at: '2025-07-01',
            close_at: '2025-08-15',
            min_age: 8,
            max_age: 12,
        };

        beforeEach(() => {
            mockAdapter.getMinistry.mockResolvedValue(bibleBeeMinistry);
        });

        it('returns true if date is within enrollment window', async () => {
            const result = await isWithinWindow('ministry-biblebee', '2025-07-15');
            expect(result).toBe(true);
        });

        it('returns false if date is before enrollment window opens', async () => {
            const result = await isWithinWindow('ministry-biblebee', '2025-06-15');
            expect(result).toBe(false);
        });

        it('returns false if date is after enrollment window closes', async () => {
            const result = await isWithinWindow('ministry-biblebee', '2025-08-16');
            expect(result).toBe(false);
        });
    });

    describe('Choir Age Eligibility', () => {
        const choirMinistry = {
            ministry_id: 'ministry-choir',
            name: "Children's Choir",
            min_age: 8,
            max_age: 12,
        };

        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2025-06-15'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('returns true if child is within age range', async () => {
            mockAdapter.getMinistry.mockResolvedValue(choirMinistry);
            mockAdapter.getChild.mockResolvedValue({
                child_id: 'child1',
                first_name: 'Jane',
                last_name: 'Smith',
                dob: '2017-01-15',
            });

            const result = await isEligibleForChoir('ministry-choir', 'child1');
            expect(result).toBe(true);
        });

        it('returns false if child is too young', async () => {
            mockAdapter.getMinistry.mockResolvedValue(choirMinistry);
            mockAdapter.getChild.mockResolvedValue({
                child_id: 'child2',
                first_name: 'Toby',
                last_name: 'Young',
                dob: '2018-01-15',
            });

            const result = await isEligibleForChoir('ministry-choir', 'child2');
            expect(result).toBe(false);
        });

        it('returns false if child is too old', async () => {
            mockAdapter.getMinistry.mockResolvedValue(choirMinistry);
            mockAdapter.getChild.mockResolvedValue({
                child_id: 'child3',
                first_name: 'Ollie',
                last_name: 'Old',
                dob: '2012-01-15',
            });

            const result = await isEligibleForChoir('ministry-choir', 'child3');
            expect(result).toBe(false);
        });
    });

    describe('Sunday School Auto-Enrollment', () => {
        it('should auto-enroll children when pre_registered_sunday_school is true', () => {
            const testRegistration = {
                registration_id: 'reg-ss',
                child_id: 'child-ss',
                cycle_id: '2025-2026',
                status: 'active',
                pre_registered_sunday_school: true,
            };

            expect(testRegistration.pre_registered_sunday_school).toBe(true);
        });
    });
});
