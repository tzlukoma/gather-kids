export enum AuthRole {
    ADMIN = 'ADMIN',
    MINISTRY_LEADER = 'MINISTRY_LEADER',
    GUARDIAN = 'GUARDIAN',
    VOLUNTEER = 'VOLUNTEER'
}

export interface BaseUser {
    uid: string;
    email: string;
    displayName?: string;
    metadata: {
        role: AuthRole;
        household_id?: string;
    };
    is_active: boolean;
    assignedMinistryIds?: string[];
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
