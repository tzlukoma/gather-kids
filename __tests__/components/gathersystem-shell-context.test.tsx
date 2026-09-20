/**
 * @jest-environment jsdom
 */

/**
 * #374 — the flag reaches staff pages, and fails closed when it does not.
 *
 * The `(admin)` layout resolves `gathersystem_admin` on the server and the
 * provider republishes it to the pages inside the shell. The default matters
 * more than the happy path: a page rendered without the provider must show the
 * legacy treatment, never the unreleased one, which is the same way
 * `getGatherSystemFlag` behaves when it cannot reach the flag service.
 */

import { render, screen } from '@testing-library/react';
import {
	GatherSystemShellProvider,
	useGatherSystemShell,
} from '@/components/gatherKids/gathersystem-shell-context';

function Probe() {
	return <span data-testid="probe">{String(useGatherSystemShell())}</span>;
}

describe('GatherSystem shell context', () => {
	it('fails closed to legacy with no provider', () => {
		render(<Probe />);
		expect(screen.getByTestId('probe')).toHaveTextContent('false');
	});

	it('stays legacy when the flag is off', () => {
		render(
			<GatherSystemShellProvider value={false}>
				<Probe />
			</GatherSystemShellProvider>
		);
		expect(screen.getByTestId('probe')).toHaveTextContent('false');
	});

	it('publishes the flag to pages inside the shell', () => {
		render(
			<GatherSystemShellProvider value={true}>
				<Probe />
			</GatherSystemShellProvider>
		);
		expect(screen.getByTestId('probe')).toHaveTextContent('true');
	});
});
