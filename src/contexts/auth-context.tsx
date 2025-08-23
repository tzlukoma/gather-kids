
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getLeaderAssignmentsForCycle } from '@/lib/dal';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'leader';
    is_active: boolean;
    assignedMinistryIds?: string[];
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (user: Omit<User, 'assignedMinistryIds'>) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeUser = async () => {
            try {
                const storedUserString = localStorage.getItem('gatherkids-user');
                if (storedUserString) {
                    const storedUser: Omit<User, 'assignedMinistryIds'> = JSON.parse(storedUserString);
                    let finalUser: User = { ...storedUser, assignedMinistryIds: [] };

                    if (storedUser.role === 'leader') {
                        const assignments = await getLeaderAssignmentsForCycle(storedUser.id, '2025');
                        finalUser.assignedMinistryIds = assignments.map(a => a.ministry_id);
                    }
                    setUser(finalUser);
                }
            } catch (error) {
                console.error("Failed to parse user from localStorage", error);
                localStorage.removeItem('gatherkids-user');
            } finally {
                setLoading(false);
            }
        };
        initializeUser();
    }, []);

    const login = async (userData: Omit<User, 'assignedMinistryIds'>) => {
        localStorage.setItem('gatherkids-user', JSON.stringify(userData));
        let finalUser: User = { ...userData, assignedMinistryIds: [] };
        
        if(userData.role === 'leader') {
            const assignments = await getLeaderAssignmentsForCycle(userData.id, '2025');
            finalUser.assignedMinistryIds = assignments.map(a => a.ministry_id);
        }
        setUser(finalUser);
    };

    const logout = () => {
        localStorage.removeItem('gatherkids-user');
        setUser(null);
    };

    const value = { user, loading, login, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
