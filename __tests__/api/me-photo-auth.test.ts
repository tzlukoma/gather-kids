/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from 'next/server';

// Outside tests the browser client is null on the server by design. The old
// route authenticated through it and threw on every request; this suite runs
// with it null so a route that leans on it again fails here, not in production.
jest.mock('@/lib/supabaseClient', () => ({ supabase: null }));

jest.mock('@/lib/api-auth', () => ({ requireUserClient: jest.fn() }));
jest.mock('@/lib/dal', () => ({
	getEntityAvatar: jest.fn(),
	updateEntityAvatar: jest.fn(),
	clearEntityAvatar: jest.fn(),
}));
jest.mock('@/lib/photo/public-avatars', () => ({ logPhotoAudit: jest.fn() }));
jest.mock('@/lib/database/supabase-adapter', () => ({
	SupabaseAdapter: jest.fn().mockImplementation((_u, _k, client) => ({ client })),
}));

const { requireUserClient } = require('@/lib/api-auth');
const dal = require('@/lib/dal');
const { logPhotoAudit } = require('@/lib/photo/public-avatars');
const { POST, DELETE } = require('@/app/api/me/photo/route');

const CALLER = '00000000-0000-0000-0000-0000000000a1';
const callerClient = { marker: 'caller-session-client' };

function signedInAs(userId: string, role = 'GUARDIAN') {
	(requireUserClient as jest.Mock).mockResolvedValue({
		authorized: true,
		userId,
		role,
		supabase: callerClient,
	});
}

function upload(file: Blob | null, extra: Record<string, string> = {}) {
	const form = new FormData();
	if (file) form.append('file', file, 'avatar.webp');
	for (const [k, v] of Object.entries(extra)) form.append(k, v);
	return new NextRequest('http://localhost:9002/api/me/photo', { method: 'POST', body: form });
}

const webp = (bytes = 16) => new Blob([new Uint8Array(bytes)], { type: 'image/webp' });

beforeEach(() => {
	jest.clearAllMocks();
	(dal.getEntityAvatar as jest.Mock).mockResolvedValue(null);
});

describe('POST /api/me/photo', () => {
	it('passes the auth refusal through and writes nothing', async () => {
		(requireUserClient as jest.Mock).mockResolvedValue({
			authorized: false,
			response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
		});
		const res = await POST(upload(webp()));
		expect(res.status).toBe(401);
		expect(dal.updateEntityAvatar).not.toHaveBeenCalled();
		expect(logPhotoAudit).not.toHaveBeenCalled();
	});

	it("stores the photo as the caller's own avatar, through the caller's session", async () => {
		signedInAs(CALLER);
		const res = await POST(upload(webp(), { userId: 'someone-else', userData: '{"uid":"someone-else"}' }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.photoUrl).toMatch(/^data:image\/webp;base64,/);

		expect(dal.updateEntityAvatar).toHaveBeenCalledTimes(1);
		expect(dal.updateEntityAvatar).toHaveBeenCalledWith('user', CALLER, body.photoUrl, callerClient);
		expect(dal.getEntityAvatar).toHaveBeenCalledWith('user', CALLER, callerClient);
	});

	it('audits with the trusted role, through the caller, without copying the image', async () => {
		signedInAs(CALLER, 'MINISTRY_LEADER');
		(dal.getEntityAvatar as jest.Mock).mockResolvedValue('data:image/png;base64,AAAA');
		await POST(upload(webp()));

		const [entry, adapter] = (logPhotoAudit as jest.Mock).mock.calls[0];
		expect(entry).toMatchObject({ userId: CALLER, actorRole: 'MINISTRY_LEADER', entityId: CALLER });
		expect(entry.beforeUrl).toBe('image/png (26 chars)');
		expect(entry.afterUrl).toMatch(/^image\/webp \(\d+ chars\)$/);
		expect(adapter.client).toBe(callerClient);
	});

	it.each([
		['no file', null, 'No file provided'],
		['a non-image', new Blob(['x'], { type: 'text/plain' }), 'Invalid file type'],
		['more than 2MB', webp(2 * 1024 * 1024 + 1), 'File size too large'],
	])('refuses %s', async (_label, file, message) => {
		signedInAs(CALLER);
		const res = await POST(upload(file));
		expect(res.status).toBe(400);
		expect((await res.json()).error).toContain(message);
		expect(dal.updateEntityAvatar).not.toHaveBeenCalled();
	});

	it('reports a refused write as a failure', async () => {
		signedInAs(CALLER);
		(dal.updateEntityAvatar as jest.Mock).mockRejectedValue(new Error('new row violates row-level security policy'));
		const res = await POST(upload(webp()));
		expect(res.status).toBe(500);
		expect(logPhotoAudit).not.toHaveBeenCalled();
	});
});

describe('DELETE /api/me/photo', () => {
	it("clears only the caller's own avatar", async () => {
		signedInAs(CALLER);
		const res = await DELETE();
		expect(res.status).toBe(200);
		expect(dal.clearEntityAvatar).toHaveBeenCalledWith('user', CALLER, callerClient);
	});

	it('passes the auth refusal through', async () => {
		(requireUserClient as jest.Mock).mockResolvedValue({
			authorized: false,
			response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
		});
		const res = await DELETE();
		expect(res.status).toBe(401);
		expect(dal.clearEntityAvatar).not.toHaveBeenCalled();
	});
});
