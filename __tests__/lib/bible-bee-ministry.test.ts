import { db } from '@/lib/db';

// Mock the database with proper Dexie-like interface
jest.mock('@/lib/db', () => ({
    db: {
        ministries: {
            where: jest.fn().mockReturnValue({
                equals: jest.fn().mockReturnValue({
                    first: jest.fn()
                })
            })
        }
    }
}));

// Mock the adapter
jest.mock('@/lib/database/factory', () => ({
    db: {
        listMinistries: jest.fn()
    }
}));

// Mock shouldUseAdapter and featureFlags
jest.mock('@/lib/featureFlags', () => ({
    isDemo: jest.fn(() => true)
}));

describe('getBibleBeeMinistry', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns Bible Bee ministry when found in Dexie mode', async () => {
        const mockMinistry = {
            ministry_id: 'bible-bee-id',
            code: 'bible-bee',
            name: 'Bible Bee',
            open_at: '2025-01-01',
            close_at: '2025-10-08'
        };

        // Mock the chain properly
        const mockFirst = jest.fn().mockResolvedValue(mockMinistry);
        const mockEquals = jest.fn().mockReturnValue({ first: mockFirst });
        const mockWhere = jest.fn().mockReturnValue({ equals: mockEquals });
        
        (db.ministries as any) = { where: mockWhere };

        // Dynamic import to avoid initialization issues
        const { getBibleBeeMinistry } = await import('@/lib/dal');
        const result = await getBibleBeeMinistry();

        expect(mockWhere).toHaveBeenCalledWith('code');
        expect(mockEquals).toHaveBeenCalledWith('bible-bee');
        expect(result).toEqual(mockMinistry);
    });

    it('returns null when Bible Bee ministry not found in Dexie mode', async () => {
        const mockFirst = jest.fn().mockResolvedValue(undefined);
        const mockEquals = jest.fn().mockReturnValue({ first: mockFirst });
        const mockWhere = jest.fn().mockReturnValue({ equals: mockEquals });
        
        (db.ministries as any) = { where: mockWhere };

        const { getBibleBeeMinistry } = await import('@/lib/dal');
        const result = await getBibleBeeMinistry();

        expect(result).toBeNull();
    });

    it('handles database errors gracefully', async () => {
        const mockFirst = jest.fn().mockRejectedValue(new Error('Database error'));
        const mockEquals = jest.fn().mockReturnValue({ first: mockFirst });
        const mockWhere = jest.fn().mockReturnValue({ equals: mockEquals });
        
        (db.ministries as any) = { where: mockWhere };

        const { getBibleBeeMinistry } = await import('@/lib/dal');
        await expect(getBibleBeeMinistry()).rejects.toThrow('Database error');
    });
});