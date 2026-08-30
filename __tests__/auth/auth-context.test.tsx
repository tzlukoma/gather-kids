import { act, renderHook } from '@testing-library/react';
import { useAuth, AuthProvider } from '@/contexts/auth-context';
import { AuthRole } from '@/lib/auth-types';
import { ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { isOfflineSupabase } from '@/lib/offline-supabase';

// Mock Supabase client
jest.mock('@/lib/supabaseClient', () => ({
	supabase: {
		auth: {
			getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
			onAuthStateChange: jest.fn().mockReturnValue({
				data: { subscription: { unsubscribe: jest.fn() } }
			}),
			signOut: jest.fn().mockResolvedValue({ error: null }),
		},
	},
}));

jest.mock('@/lib/offline-supabase', () => ({
	isOfflineSupabase: jest.fn(() => false),
}));

// Mock DB adapter
jest.mock('@/lib/db-utils', () => ({
	dbAdapter: {
		listAccessibleMinistriesForEmail: jest.fn().mockResolvedValue([]),
	},
}));

describe('AuthContext', () => {
	const wrapper = ({ children }: { children: ReactNode }) => (
		<AuthProvider>{children}</AuthProvider>
	);

	beforeEach(() => {
		jest.clearAllMocks();
		(isOfflineSupabase as jest.Mock).mockReturnValue(false);
		(supabase.auth.getSession as jest.Mock).mockResolvedValue({
			data: { session: null },
			error: null,
		});
		(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
			data: { subscription: { unsubscribe: jest.fn() } },
		});
	});

	it('skips supabase session lookup in dummy mode', async () => {
		(isOfflineSupabase as jest.Mock).mockReturnValue(true);
		const { result } = renderHook(() => useAuth(), { wrapper });

		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		expect(supabase.auth.getSession).not.toHaveBeenCalled();
		expect(result.current.loading).toBe(false);
		expect(result.current.user).toBe(null);
	});

	it('provides loading state initially', async () => {
		const { result } = renderHook(() => useAuth(), { wrapper });

		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		expect(result.current.loading).toBe(false);
		expect(result.current.user).toBe(null);
	});

	it('starts with no user', () => {
		const { result } = renderHook(() => useAuth(), { wrapper });
		expect(result.current.user).toBe(null);
	});

	it('allows login and sets user in context', async () => {
		const { result } = renderHook(() => useAuth(), { wrapper });

		const testUser = {
			id: 'test-id',
			email: 'test@example.com',
			name: 'Test User',
			is_active: true,
			metadata: {
				role: AuthRole.ADMIN,
			},
		};

		await act(async () => {
			await result.current.login(testUser);
		});

		// Check user is set in context
		expect(result.current.user).toEqual(expect.objectContaining({
			id: testUser.id,
			email: testUser.email,
		}));
	});

	it('allows logout and clears user from context', async () => {
		const { result } = renderHook(() => useAuth(), { wrapper });

		// First login
		const testUser = {
			id: 'test-id',
			email: 'test@example.com',
			name: 'Test User',
			is_active: true,
			metadata: {
				role: AuthRole.ADMIN,
			},
		};

		await act(async () => {
			await result.current.login(testUser);
		});

		// Then logout
		act(() => {
			result.current.logout();
		});

		// Check user is cleared from context
		expect(result.current.user).toBe(null);
	});

	it('manages user role state', async () => {
		const { result } = renderHook(() => useAuth(), { wrapper });

		// Login with admin role
		await act(async () => {
			await result.current.login({
				id: 'test-id',
				email: 'test@example.com',
				name: 'Test User',
				is_active: true,
				metadata: {
					role: AuthRole.ADMIN,
				},
			});
		});

		expect(result.current.userRole).toBe(AuthRole.ADMIN);

		// Change role
		act(() => {
			result.current.setUserRole(AuthRole.GUARDIAN);
		});

		expect(result.current.userRole).toBe(AuthRole.GUARDIAN);
	});
});
