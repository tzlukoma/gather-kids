// Minimal manual mock for next/navigation used in tests.
// Provides useRouter and useSearchParams so components that call them won't throw.

const useRouter = () => ({
	push: jest.fn(),
	replace: jest.fn(),
	refresh: jest.fn(),
	back: jest.fn(),
	prefetch: jest.fn().mockResolvedValue(undefined),
	beforePopState: jest.fn(),
	forward: jest.fn(),
});

const useSearchParams = () => ({
	get: (k) => null,
});

module.exports = {
	useRouter,
	useSearchParams,
};
