/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useCreateUser, useUpdateUser } from '@/hooks/data/users';

jest.unmock('@tanstack/react-query');

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		);
	};
};

describe('useCreateUser', () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		global.fetch = jest.fn();
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it('calls POST /api/users/create with correct body', async () => {
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true, user: { id: 'new-id' } }),
		});

		const wrapper = createWrapper();
		const { result } = renderHook(() => useCreateUser(), { wrapper });

		await act(async () => {
			await result.current.mutateAsync({
				email: 'new@example.com',
				password: 'password123',
				full_name: 'New User',
				role: 'GUARDIAN',
				email_confirm: true,
			});
		});

		expect(global.fetch).toHaveBeenCalledWith(
			'/api/users/create',
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'new@example.com',
					password: 'password123',
					full_name: 'New User',
					role: 'GUARDIAN',
					email_confirm: true,
				}),
			})
		);
	});

	it('invalidates users query on success', async () => {
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		});

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
		});
		const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(() => useCreateUser(), { wrapper });

		await act(async () => {
			await result.current.mutateAsync({
				email: 'a@b.com',
				password: 'password123',
				role: 'GUEST',
				email_confirm: false,
			});
		});

		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
	});

	it('throws on non-OK response', async () => {
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ error: 'User already exists' }),
		});

		const wrapper = createWrapper();
		const { result } = renderHook(() => useCreateUser(), { wrapper });

		await expect(
			act(async () => {
				await result.current.mutateAsync({
					email: 'existing@example.com',
					password: 'password123',
					role: 'GUARDIAN',
					email_confirm: true,
				});
			})
		).rejects.toThrow();
	});
});

describe('useUpdateUser', () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		global.fetch = jest.fn();
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it('calls PATCH /api/users/{userId} with correct body', async () => {
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		});

		const wrapper = createWrapper();
		const { result } = renderHook(() => useUpdateUser(), { wrapper });

		await act(async () => {
			await result.current.mutateAsync({
				userId: 'user-uuid-123',
				role: 'ADMIN',
			});
		});

		expect(global.fetch).toHaveBeenCalledWith(
			'/api/users/user-uuid-123',
			expect.objectContaining({
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'ADMIN' }),
			})
		);
	});

	it('invalidates users query on success', async () => {
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true }),
		});

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
		});
		const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(() => useUpdateUser(), { wrapper });

		await act(async () => {
			await result.current.mutateAsync({
				userId: 'user-1',
				email_confirmed: true,
			});
		});

		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
	});

	it('throws on non-OK response', async () => {
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ error: 'User not found' }),
		});

		const wrapper = createWrapper();
		const { result } = renderHook(() => useUpdateUser(), { wrapper });

		await expect(
			act(async () => {
				await result.current.mutateAsync({
					userId: 'nonexistent',
					password: 'newpass123',
				});
			})
		).rejects.toThrow();
	});
});
