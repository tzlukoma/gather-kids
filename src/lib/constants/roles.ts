export const ROLES = {
    ADMIN: 'ADMIN',
    MINISTRY_LEADER: 'MINISTRY_LEADER',
    GUARDIAN: 'GUARDIAN'
} as const;

export type UserRole = keyof typeof ROLES;

export type User = {
    id: string;
    email: string;
    metadata: {
        role?: UserRole;
        household_id?: string;
    };
};
