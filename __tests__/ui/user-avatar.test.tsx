import { render, screen } from '@testing-library/react';
import { UserAvatar } from '@/components/gatherKids/user-avatar';
import { useUserAvatar } from '@/hooks/data/branding';

jest.mock('@/hooks/data/branding', () => ({
	useUserAvatar: jest.fn(),
}));

jest.mock('@/components/ui/avatar', () => ({
	Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
	AvatarImage: ({ src, alt }: { src?: string; alt: string }) =>
		src ? <div data-testid="avatar-image" data-src={src} aria-label={alt} /> : null,
	AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockedUseUserAvatar = useUserAvatar as jest.Mock;

describe('UserAvatar', () => {
	it('renders the saved profile photo for the authenticated user', () => {
		mockedUseUserAvatar.mockReturnValue({ data: 'data:image/webp;base64,avatar' });

		render(
			<UserAvatar
				userId="user-123"
				alt="Taylor"
				className="h-10 w-10"
				fallback="TB"
			/>
		);

		expect(mockedUseUserAvatar).toHaveBeenCalledWith('user-123');
		expect(screen.getByTestId('avatar-image')).toHaveAttribute(
			'data-src',
			'data:image/webp;base64,avatar'
		);
	});

	it('keeps the supplied fallback when no profile photo exists', () => {
		mockedUseUserAvatar.mockReturnValue({ data: null });

		render(
			<UserAvatar userId="user-123" alt="Taylor" className="h-10 w-10" fallback="TB" />
		);

		expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument();
		expect(screen.getByText('TB')).toBeInTheDocument();
	});
});
