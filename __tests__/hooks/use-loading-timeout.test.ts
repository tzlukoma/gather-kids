import { act, renderHook } from '@testing-library/react';

import {
	DEFAULT_LOADING_TIMEOUT_MS,
	useLoadingTimeout,
} from '@/hooks/use-loading-timeout';

describe('useLoadingTimeout', () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it('is false while the load is still within its window', () => {
		const { result } = renderHook(() => useLoadingTimeout(true, 1000));
		expect(result.current).toBe(false);
		act(() => {
			jest.advanceTimersByTime(999);
		});
		expect(result.current).toBe(false);
	});

	it('reports overdue once the window passes', () => {
		const { result } = renderHook(() => useLoadingTimeout(true, 1000));
		act(() => {
			jest.advanceTimersByTime(1000);
		});
		expect(result.current).toBe(true);
	});

	it('never reports overdue when nothing is loading', () => {
		const { result } = renderHook(() => useLoadingTimeout(false, 1000));
		act(() => {
			jest.advanceTimersByTime(10_000);
		});
		expect(result.current).toBe(false);
	});

	it('clears once the load finishes, even after it went overdue', () => {
		const { result, rerender } = renderHook(
			({ loading }) => useLoadingTimeout(loading, 1000),
			{ initialProps: { loading: true } }
		);
		act(() => {
			jest.advanceTimersByTime(1000);
		});
		expect(result.current).toBe(true);

		rerender({ loading: false });
		expect(result.current).toBe(false);
	});

	it('gives a retry its own fresh window rather than reporting overdue at once', () => {
		const { result, rerender } = renderHook(
			({ loading }) => useLoadingTimeout(loading, 1000),
			{ initialProps: { loading: true } }
		);
		act(() => {
			jest.advanceTimersByTime(1000);
		});
		expect(result.current).toBe(true);

		// Finish, then start again. The second attempt must not inherit the first
		// attempt's verdict. The clear is a microtask, so flush it — the hook
		// resets asynchronously on purpose, to stay clear of setting state
		// directly in the effect body.
		rerender({ loading: false });
		rerender({ loading: true });
		act(() => {
			jest.runAllTicks();
		});
		expect(result.current).toBe(false);

		act(() => {
			jest.advanceTimersByTime(999);
		});
		expect(result.current).toBe(false);
		act(() => {
			jest.advanceTimersByTime(1);
		});
		expect(result.current).toBe(true);
	});

	it('defaults to a documented window', () => {
		expect(DEFAULT_LOADING_TIMEOUT_MS).toBe(10_000);
		const { result } = renderHook(() => useLoadingTimeout(true));
		act(() => {
			jest.advanceTimersByTime(DEFAULT_LOADING_TIMEOUT_MS - 1);
		});
		expect(result.current).toBe(false);
		act(() => {
			jest.advanceTimersByTime(1);
		});
		expect(result.current).toBe(true);
	});
});
