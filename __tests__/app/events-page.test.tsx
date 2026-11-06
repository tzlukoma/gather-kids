import React from 'react';
import { render, screen } from '@testing-library/react';

let mockRole = 'ADMIN';
jest.mock('@/contexts/auth-context', () => ({
	useAuth: () => ({ user: { uid: 'u-1', metadata: { role: mockRole } }, loading: false }),
}));
jest.mock('@/components/gatherKids/events-admin', () => ({
	EventsAdmin: () => <div>events admin</div>,
}));

import EventsPage from '@/app/(admin)/events/page';

describe('/events (#565)', () => {
	it('shows the event manager to an admin', () => {
		mockRole = 'ADMIN';
		render(<EventsPage />);
		expect(screen.getByText('events admin')).toBeInTheDocument();
	});

	it.each(['MINISTRY_LEADER', 'GUARDIAN', 'VOLUNTEER'])('withholds it from %s', (role) => {
		mockRole = role;
		render(<EventsPage />);
		expect(screen.queryByText('events admin')).not.toBeInTheDocument();
		expect(screen.getByText('Events are managed by administrators')).toBeInTheDocument();
	});
});
