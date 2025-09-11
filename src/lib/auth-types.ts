export const AuthRole = {
    ADMIN: 'ADMIN',
    MINISTRY_LEADER: 'MINISTRY_LEADER',
    GUARDIAN: 'GUARDIAN',
    VOLUNTEER: 'VOLUNTEER',
    GUEST: 'GUEST'
} as const;

export type AuthRole = typeof AuthRole[keyof typeof AuthRole];

export interface BaseUser {
    // support either `uid` or `id` depending on caller
    uid?: string;
    id?: string;
    email: string;
    name?: string;
    displayName?: string;
    metadata: {
        role: AuthRole;
        household_id?: string;
        onboarding_dismissed?: boolean;
    };
    is_active: boolean;
    assignedMinistryIds?: string[];
    // Optional Supabase-derived fields (present on some user shapes)
    last_sign_in_at?: string;
    email_confirmed_at?: string;
    created_at?: string;
    user_metadata?: any;
    identities?: any[];
}

export interface AuthState {
    user: BaseUser | null;
    userRole: AuthRole | null;
    isLoading: boolean;
    error: Error | null;
}

export interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    setUserRole: (role: AuthRole) => void;
    updateUser: (user: Partial<BaseUser>) => void;
}
