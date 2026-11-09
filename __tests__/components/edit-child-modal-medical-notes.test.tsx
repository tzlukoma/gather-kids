import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditChildModal } from '@/components/gatherKids/edit-child-modal';
import type { Child } from '@/lib/types';

/**
 * #583: clearing Medical Notes in the edit-child modal must reach the adapter
 * as a value. Sending `undefined` let the adapter skip the field, so the save
 * reported success while the old note stayed.
 */

const mockUpdate = jest.fn();
jest.mock('@/hooks/data', () => ({
	useAddChild: () => ({ mutateAsync: jest.fn() }),
	useUpdateChild: () => ({ mutateAsync: mockUpdate }),
}));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/lib/dal', () => ({ getCurrentRegistrationCycle: jest.fn() }));

const child = {
	child_id: 'child-synthetic-1',
	household_id: 'hh-synthetic-1',
	first_name: 'Avery',
	last_name: 'Testchild',
	dob: '2017-04-02',
	grade: '3rd Grade',
	medical_notes: 'Synthetic note: uses an inhaler before sports',
	special_needs: false,
	is_active: true,
} as Child;

async function saveWithNotes(notes: string) {
	const user = userEvent.setup();
	render(<EditChildModal child={child} householdId="hh-synthetic-1" onClose={jest.fn()} />);

	const field = screen.getByLabelText('Medical Notes');
	await user.clear(field);
	if (notes) await user.type(field, notes);
	await user.click(screen.getByRole('button', { name: 'Update' }));

	await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
	return mockUpdate.mock.calls[0][0].data;
}

describe('EditChildModal medical notes (#583)', () => {
	beforeEach(() => {
		mockUpdate.mockReset().mockResolvedValue({});
	});

	it('sends an empty value when the note is cleared, so the update includes it', async () => {
		const data = await saveWithNotes('');
		expect(data).toHaveProperty('medical_notes', '');
	});

	it('still sends an edited note as typed', async () => {
		const data = await saveWithNotes('Synthetic note: no restrictions');
		expect(data.medical_notes).toBe('Synthetic note: no restrictions');
	});
});
