import { act, renderHook } from '@testing-library/react';
import { useAuth, AuthProvider } from '@/contexts/auth-context';
import { ROLES } from '@/lib/constants/roles';
import { ReactNode } from 'react';

describe('AuthContext', () => {
	const wrapper = ({ children }: { children: ReactNode }) => (
		<AuthProvider>{children}</AuthProvider>
	);

	beforeEach(() => {
		localStorage.clear();
	});

	it('provides loading state initially', async () => {
		const { result } = renderHook(() => useAuth(), { wrapper });

		// Need to wait for the initial render
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

	it('allows login and stores user in localStorage', async () => {
		const { result } = renderHook(() => useAuth(), { wrapper });

		const testUser = {
			id: 'test-id',
			email: 'test@example.com',
			name: 'Test User',
			is_active: true,
			metadata: {
				role: ROLES.ADMIN,
			},
		};

		await act(async () => {
			await result.current.login(testUser);
		});

		// Check user is set in context
		expect(result.current.user).toEqual(expect.objectContaining(testUser));

		// Check user is stored in localStorage
		const storedUser = JSON.parse(
			localStorage.getItem('gatherkids-user') || '{}'
		);
		expect(storedUser).toEqual(
			expect.objectContaining({
				id: testUser.id,
				email: testUser.email,
			})
		);
	});

	it('allows logout and clears localStorage', async () => {
		const { result } = renderHook(() => useAuth(), { wrapper });

		// First login
		const testUser = {
			id: 'test-id',
			email: 'test@example.com',
			name: 'Test User',
			is_active: true,
			metadata: {
				role: ROLES.ADMIN,
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

		// Check user is cleared from localStorage
		expect(localStorage.getItem('gatherkids-user')).toBe(null);
	});

	it('restores user from localStorage on mount', async () => {
		// Setup stored user
		const storedUser = {
			id: 'stored-id',
			email: 'stored@example.com',
			name: 'Stored User',
			is_active: true,
			metadata: {
				role: ROLES.ADMIN,
			},
		};
		localStorage.setItem('gatherkids-user', JSON.stringify(storedUser));

		// Render hook
		const { result } = renderHook(() => useAuth(), { wrapper });

		// Wait for initialization
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		// Check user is restored
		expect(result.current.user).toEqual(expect.objectContaining(storedUser));
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
					role: ROLES.ADMIN,
				},
			});
		});

		expect(result.current.userRole).toBe(ROLES.ADMIN);

		// Change role
		act(() => {
			result.current.setUserRole(ROLES.GUARDIAN);
		});

		expect(result.current.userRole).toBe(ROLES.GUARDIAN);
	});
});
