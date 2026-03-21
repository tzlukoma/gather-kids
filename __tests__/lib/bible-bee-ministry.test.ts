// Mock the database adapter factory
jest.mock('@/lib/database/factory', () => ({
    db: {
        listMinistries: jest.fn()
    }
}));

describe('getBibleBeeMinistry', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns Bible Bee ministry when found via adapter', async () => {
        const mockMinistry = {
            ministry_id: 'bible-bee-id',
            code: 'bible-bee',
            name: 'Bible Bee',
            open_at: '2025-01-01',
            close_at: '2025-10-08',
        };
        mockListMinistries.mockResolvedValue([mockMinistry]);

        const { db } = require('@/lib/database/factory');
        (db.listMinistries as jest.Mock).mockResolvedValue([mockMinistry]);

        const { getBibleBeeMinistry } = await import('@/lib/dal');
        const result = await getBibleBeeMinistry();

        expect(result).toEqual(mockMinistry);
    });

    it('returns null when Bible Bee ministry not found', async () => {
        const { db } = require('@/lib/database/factory');
        (db.listMinistries as jest.Mock).mockResolvedValue([]);

        const { getBibleBeeMinistry } = await import('@/lib/dal');
        const result = await getBibleBeeMinistry();

        expect(result).toBeNull();
    });

    it('handles database errors gracefully', async () => {
        const { db } = require('@/lib/database/factory');
        (db.listMinistries as jest.Mock).mockRejectedValue(new Error('Database error'));

        const { getBibleBeeMinistry } = await import('@/lib/dal');
        await expect(getBibleBeeMinistry()).rejects.toThrow('Database error');
    });
});
