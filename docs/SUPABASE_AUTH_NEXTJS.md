# Supabase Auth + Next.js (App Router) — Recommended Implementation

This document captures the diagnosis and recommended implementation patterns to avoid Magic Link / PKCE cross-tab breakage and infinite redirect/loop issues when using Supabase Auth with Next.js (App Router).

Findings — Good vs. Risky (summary)

Good (already implemented or correct):

- Cross-tab PKCE storage adapter: the repository includes a `CrossTabStorage` implementation that writes the PKCE verifier to both `localStorage` and `sessionStorage`. This is the correct approach to enable magic-link PKCE across browser tabs.
- Explicit PKCE flow: the client config sets `flowType: 'pkce'`, which ensures the PKCE flow is used instead of older implicit flows.
- Persisted session & auto-refresh: `persistSession: true` and `autoRefreshToken: true` are enabled, which is required for keeping sessions active and automatically refreshing tokens.
- Detailed logging and debug artifacts: the code contains rich debug logging and storage inspection which is useful for diagnosing failures during development.

Risky (can cause infinite loops, race conditions, or inconsistent auth state):

- `detectSessionInUrl: true` used in a browser factory that can be called from many client components: when multiple client instances initialize and auto-parse the URL, the same session URL can be consumed multiple times, triggering duplicate `onAuthStateChange` events and navigation loops.
- Multiple independent session sources: the app keeps a separate primary localStorage user blob (`gatherkids-user`) in `AuthProvider` rather than subscribing to `supabase.auth.onAuthStateChange` as the canonical source-of-truth. This can cause desync between Supabase's session and the app's user state and can trigger flip-flop navigation.
- Ad-hoc magic-link backups and manual PKCE metadata writes: extra backup keys like `gatherKids-magic-link-backup` increase the surface area for stale or conflicting verifier data and make debugging harder once the storage adapter is in use.
- Creating many Supabase client instances or storage adapter instances: non-shared instances may behave differently across components and can lead to inconsistent reads/writes of verifier/session keys.
- No single, dedicated callback route consuming the session URL: without a dedicated `/auth/callback` (or equivalent) that calls `getSessionFromUrl` exactly once, other components may inadvertently parse the URL and cause race conditions.

These good/risky points shaped the recommendations in the rest of this document: centralize session handling, parse the redirect URL exactly once, share the storage adapter/client instance, and prefer `onAuthStateChange` as the single update mechanism for application auth state.

Summary and plan

- Goal: make Magic Link + PKCE reliable across tabs and avoid infinite loops caused by multiple client initializations + URL session parsing.
- High-level plan:
  1. Centralize Supabase session handling in `AuthProvider` and use `onAuthStateChange`.
  2. Stop auto-parsing the URL from many client initializers; parse the redirect exactly once in a dedicated callback route.
  3. Keep cross-tab PKCE storage adapter, but remove ad-hoc backup writes once verified.
  4. Export a single browser client instance (or ensure the storage adapter is shared) so that behavior is deterministic.

Checklist (apply before merging changes)

- [ ] Add or update `src/lib/supabaseClient.ts` to set `detectSessionInUrl: false` by default in client factories.
- [ ] Add `/app/auth/callback/page.tsx` (client) that calls `supabase.auth.getSessionFromUrl({ storeSession: true })` and routes to the post-login location.
- [ ] Wire `AuthProvider` to:
  - create/consume the shared Supabase client once,
  - subscribe to `supabase.auth.onAuthStateChange`, and
  - update context state from the Supabase session (avoid primary reliance on a custom localStorage user copy).
- [ ] Remove or isolate `gatherKids-magic-link-backup` ad-hoc writes once PKCE cross-tab behavior is verified.
- [ ] Add tests / manual test steps (below) and a PR checklist for reviewers.

Why these changes

- Multiple client instances with `detectSessionInUrl: true` result in multiple URL parses. Each parse can trigger session store operations and `onAuthStateChange` events, which combined with manual redirects can produce infinite navigation loops.
- Centralizing session handling and redirect parsing makes the app deterministic and easier to debug.
- Cross-tab PKCE works when the verifier storage is accessible across tabs (localStorage). A single storage adapter instance reduces conflicts.

Concrete code snippets

1. `src/lib/supabaseClient.ts` (recommended delta)

- Set `detectSessionInUrl: false` and export a shared `supabaseBrowser()` singleton or a factory that does not auto-parse the URL.

```ts
// ...existing imports...
export const createSupabaseBrowserClient = () =>
	createBrowserClient(
		NEXT_PUBLIC_SUPABASE_URL!,
		NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: false, // <--- important
				flowType: 'pkce',
				storage: new CrossTabStorage(),
			},
		}
	);

// Option: export a singleton that callers can import
export const supabase = createSupabaseBrowserClient();
```

2. `AuthProvider` wiring (subscribe to auth events)

```tsx
useEffect(() => {
	const supabase = supabaseClientHere; // import the shared client
	// initialize from existing session
	const init = async () => {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		// set user state from session if present
	};
	init();

	const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
		// update context state atomically from session
	});
	return () => sub.subscription.unsubscribe();
}, []);
```

Notes:

- Derive user info from `session.user` (server has the canonical user) and fetch additional application user records only when needed.
- Avoid using a custom localStorage user blob as the primary source-of-truth. Keep demo-account fallbacks isolated behind feature flags.

3. Dedicated callback route: `/app/auth/callback/page.tsx` (client)

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
	const router = useRouter();
	useEffect(() => {
		(async () => {
			const { data, error } = await supabase.auth.getSessionFromUrl({
				storeSession: true,
			});
			// handle or log error
			// data.session now stored by the client
			// compute post-login redirect (e.g., saved `returnTo` or default)
			router.replace('/');
		})();
	}, [router]);
	return <div>Signing you in…</div>;
}
```

- Use `emailRedirectTo` in `signInWithOtp` to point to this route.
- The callback page does the one-time URL parsing/consumption (so other components don't need detectSessionInUrl).

Testing steps (manual)

1. Start dev server:

```bash
npm install
npm run dev
```

2. In one tab, open the login page and request a Magic Link (emailRedirectTo should target `/auth/callback`).
3. In a second tab, open the app before clicking the link (to simulate cross-tab). Click the magic link in the email.
4. Verify both tabs have the session (if intended) and that no infinite redirects occur.
5. Inspect `localStorage` for the PKCE verifier key (`auth-token-code-verifier` or your configured key). The CrossTabStorage should place it so both tabs can access it.
6. If failures occur, check browser console for multiple `getSessionFromUrl` calls and ensure only the callback page runs `getSessionFromUrl`.

PR checklist for reviewers

- [ ] `detectSessionInUrl` set to `false` in client init (or detect removed from non-callback initializers)
- [ ] New `auth/callback` route created and tested locally
- [ ] `AuthProvider` subscribes to `onAuthStateChange` and updates context from `session`
- [ ] All ad-hoc magic-link backup writes removed or gated under debug flag
- [ ] Manual cross-tab test documented in PR description and passed
- [ ] Smoke test: login (magic link) + password login + logout work with expected redirect targets

Edge cases & notes

- Middleware / SSR: If you rely on Next.js middleware or `@supabase/ssr` server helpers for protected server components, keep server-side session refresh logic separate; this document focuses on client-side (magic link / PKCE) cross-tab flows.
- Long-running tabs and refresh: `onAuthStateChange` will fire for token refresh events; design your handler to idempotently update context state and not redirect unless a user-initiated login occurred.
- Rate limiting: respect Supabase rate limits when repeatedly requesting magic links.

Rollout plan (safe)

1. Implement changes behind a feature branch.
2. Run local test plan (above) and add instructions to the PR description.
3. Deploy to a staging/UAT environment and run cross-tab tests with real SMTP/email flow.
4. Monitor for auth loops or multiple session events in logs for 24 hours before promoting to production.

If you want, I can implement these changes (AuthProvider wiring, callback page, client change) and run the local checks; say “Please implement” and I will apply the patch and run quick verification steps.

AI Agent Prompt

Use this section when directing an AI agent to perform the implementation and verification tasks. The agent should strictly follow these steps and report results clearly.

Context files to read first (in order):

1. `docs/SUPABASE_AUTH_NEXTJS.md` (this file) — read the whole document.
2. `src/lib/supabaseClient.ts` — current client factory and storage adapter.
3. `src/contexts/auth-context.tsx` — current AuthProvider implementation.
4. `src/app/login/page.tsx` — login UI and magic-link call sites.
5. Any other files that import `supabaseBrowser` or create a browser client.

Primary goal (machine-readable):

- Implement a deterministic Magic Link + PKCE flow with these properties:
  - `detectSessionInUrl` is `false` for general client init.
  - A single callback route (`/auth/callback`) calls `supabase.auth.getSessionFromUrl({ storeSession: true })` exactly once.
  - `AuthProvider` uses a shared Supabase client and subscribes to `onAuthStateChange` to update app auth state.
  - Remove ad-hoc backup writes to `localStorage` (or gate them behind a `DEBUG_SUPABASE_AUTH` env flag).

Implementation tasks (step-by-step for the agent):

1. Create or update `src/lib/supabaseClient.ts`:

- Ensure the CrossTabStorage is exported or used by a singleton client.
- Set `detectSessionInUrl: false` in the client config used by general components.
- Export a shared `supabase` instance.

2. Add `/app/auth/callback/page.tsx` (client component):

- Call `await supabase.auth.getSessionFromUrl({ storeSession: true })` in a `useEffect` and handle errors.
- After successful session consumption, redirect to the saved `returnTo` or a default path.

3. Update `src/contexts/auth-context.tsx`:

- Import the shared `supabase` instance.
- On mount, call `await supabase.auth.getSession()` and initialize auth state from this session.
- Subscribe to `supabase.auth.onAuthStateChange` and update `user`/`userRole` in the context.
- Remove (or make secondary) any code that treats a localStorage blob as primary auth source.

4. Update `src/app/login/page.tsx` and any other sign-in callers:

- Use `emailRedirectTo: 'https://<your-app>/auth/callback'` in `signInWithOtp`.
- Remove ad-hoc backup writes like `gatherKids-magic-link-backup`, or gate them under `process.env.DEBUG_SUPABASE_AUTH === 'true'`.

5. Run local verification (manual steps automated where possible):

- `npm install` && `npm run dev` and verify the app builds.
- Execute the manual cross-tab test described earlier.
- Run `npm test` to ensure no regressions (if tests exist locally).

6. Report back in a concise format:

- Files changed with brief description of changes.
- Any behavioral differences observed during testing (pass/fail per step).
- Console logs/errors captured.
- A short recommendation for rollback if production problems occur.

Acceptance criteria (what the AI agent should aim to satisfy):

- A single `getSessionFromUrl` call occurs per login flow (verify via logs or instrumentation).
- No infinite redirect loops during the magic-link flow across multiple tabs.
- `onAuthStateChange` updates the `AuthProvider` state reliably.
- No remaining ad-hoc backup writes to `localStorage` in production (debug-flagged if kept).

If the agent is blocked by missing environment variables (Supabase URL/anon key) or missing email/SMS delivery, it should:

- Run automated tests that don't require external services.
- Use a local mock or the demo users to validate UI paths where possible.
- Report which steps required real external services and what the expected results are.

Use this prompt to run autonomously. If you want, I will implement these changes myself — say “Please implement” and I will apply the changes and run quick local checks.
