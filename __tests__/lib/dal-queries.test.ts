import { querySundaySchoolRoster, queryRostersForMinistry, queryDashboardMetrics } from '@/lib/dal';

// Mock the database module
jest.mock('@/lib/db', () => {
    const mockWhere = jest.fn();
    const mockAnd = jest.fn();
    const mockAnyOf = jest.fn();
    const mockToArray = jest.fn();
    const mockCount = jest.fn();

    // Setup default mock returns
    mockAnd.mockReturnValue({ toArray: mockToArray });
    mockAnyOf.mockReturnValue({ toArray: mockToArray });
    mockWhere.mockReturnValue({
        and: mockAnd,
        anyOf: mockAnyOf,
        toArray: mockToArray,
        count: mockCount,
    });

    return {
        db: {
            attendance: {
                where: mockWhere,
            },
            children: {
                where: mockWhere,
            },
            ministries: {
                get: jest.fn().mockResolvedValue(null),
            },
            ministry_enrollments: {
                where: mockWhere,
            },
            child_year_profiles: {
                where: mockWhere,
            },
            registrations: {
                where: mockWhere,
                count: mockCount,
            },
        },
        // Export mocks for test access
        _mocks: {
            where: mockWhere,
            and: mockAnd,
            anyOf: mockAnyOf,
            toArray: mockToArray,
            count: mockCount
        }
    };
});

// Import mocks after mock setup
const { _mocks } = jest.requireMock('@/lib/db');

describe('DAL Query Functions', () => {
    const { where, and, anyOf, toArray, count } = _mocks;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('querySundaySchoolRoster', () => {
        const mockAttendanceRecords = [
            { attendance_id: 'att1', child_id: 'child1', date: '2025-08-24', event_id: 'evt_sunday_school', timeslot_id: 'ts1' },
            { attendance_id: 'att2', child_id: 'child2', date: '2025-08-24', event_id: 'evt_sunday_school', timeslot_id: 'ts1' },
        ];

        const mockChildren = [
            { child_id: 'child1', first_name: 'John', last_name: 'Doe' },
            { child_id: 'child2', first_name: 'Jane', last_name: 'Doe' },
        ];

        it('queries attendance records for the specified date and event', async () => {
            toArray.mockResolvedValueOnce(mockAttendanceRecords);
            toArray.mockResolvedValueOnce(mockChildren);

            await querySundaySchoolRoster('2025-08-24');

            expect(where).toHaveBeenCalledWith({
                date: '2025-08-24',
                event_id: 'evt_sunday_school'
            });
        });

        it('filters by timeslot if provided', async () => {
            toArray.mockResolvedValueOnce(mockAttendanceRecords);
            toArray.mockResolvedValueOnce(mockChildren);

            await querySundaySchoolRoster('2025-08-24', 'ts1');

            expect(where).toHaveBeenCalledWith({
                date: '2025-08-24',
                event_id: 'evt_sunday_school'
            });
            expect(and).toHaveBeenCalled();
        });

        it('returns children based on attendance records', async () => {
            toArray.mockResolvedValueOnce(mockAttendanceRecords);
            toArray.mockResolvedValueOnce(mockChildren);

            const result = await querySundaySchoolRoster('2025-08-24');

            expect(where).toHaveBeenCalledWith('child_id');
            expect(anyOf).toHaveBeenCalledWith(['child1', 'child2']);
            expect(result).toEqual(mockChildren);
        });
    });

    describe('queryRostersForMinistry', () => {
        const mockEnrollments = [
            { enrollment_id: 'enr1', child_id: 'child1', ministry_id: 'min1', cycle_id: 'cycle1' },
            { enrollment_id: 'enr2', child_id: 'child2', ministry_id: 'min1', cycle_id: 'cycle1' },
        ];

        const mockChildren = [
            { child_id: 'child1', first_name: 'John', last_name: 'Doe' },
            { child_id: 'child2', first_name: 'Jane', last_name: 'Doe' },
        ];

        const mockProfiles = [
            { child_id: 'child1', cycle_id: 'cycle1', grade: 3 },
            { child_id: 'child2', cycle_id: 'cycle1', grade: 4 },
        ];

        it('fetches enrollments for the specified ministry and cycle', async () => {
            toArray.mockResolvedValueOnce(mockEnrollments);
            toArray.mockResolvedValueOnce(mockChildren);
            toArray.mockResolvedValueOnce(mockProfiles);

            await queryRostersForMinistry('min1', 'cycle1');

            expect(where).toHaveBeenCalledWith({
                ministry_id: 'min1',
                cycle_id: 'cycle1',
            });
        });

        it('fetches children and profiles based on enrollment', async () => {
            toArray.mockResolvedValueOnce(mockEnrollments);
            toArray.mockResolvedValueOnce(mockChildren);
            toArray.mockResolvedValueOnce(mockProfiles);

            const result = await queryRostersForMinistry('min1', 'cycle1');

            expect(where).toHaveBeenCalledWith('child_id');
            expect(where).toHaveBeenCalledWith('[child_id+cycle_id]');

            // Check that we merge the child and profile data
            expect(result).toEqual([
                {
                    ...mockChildren[0],
                    profile: mockProfiles[0],
                },
                {
                    ...mockChildren[1],
                    profile: mockProfiles[1],
                },
            ]);
        });
    });

    describe('queryDashboardMetrics', () => {
        it('calculates registration metrics', async () => {
            const mockActiveRegs = [
                { registration_id: 'reg1', cycle_id: 'cycle1', status: 'active', consents: [] },
                {
                    registration_id: 'reg2', cycle_id: 'cycle1', status: 'active', consents: [
                        { type: 'liability', accepted_at: '2025-07-01' },
                        { type: 'photoRelease', accepted_at: '2025-07-01' }
                    ]
                },
            ];

            // The real Dexie API uses where(...).count() and where(...).toArray()
            // Our mockWhere implementation returns the same helpers, so we simulate
            // calls by stubbing the helpers the code uses.
            // Sequence of toArray/count calls in queryDashboardMetrics:
            // 1) registrations.where(...).toArray() -> active registrations
            // 2) ministry_enrollments.where(...).toArray() -> choir enrollments
            // 3) children.where(...).anyOf(...).toArray() -> choir children
            _mocks.toArray.mockResolvedValueOnce(mockActiveRegs); // active registrations
            _mocks.toArray.mockResolvedValueOnce([]); // choir enrollments (none)
            _mocks.toArray.mockResolvedValueOnce([]); // choir children (none)
            // For count, some code calls where(...).count(), so provide a count mock
            _mocks.count.mockResolvedValueOnce(10);

            const result = await queryDashboardMetrics('cycle1');

            expect(where).toHaveBeenCalledWith({ cycle_id: 'cycle1' });
            expect(where).toHaveBeenCalledWith({ cycle_id: 'cycle1', status: 'active' });

            expect(result).toHaveProperty('totalCount', 10);
            expect(result).toHaveProperty('completedCount', 2);
            expect(result).toHaveProperty('missingConsentsCount', 1); // 1 registration missing consents
        });
    });
});
