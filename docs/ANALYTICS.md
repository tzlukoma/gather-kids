yarn add @vercel/analytics

# Vercel Web Analytics — Implementation guide for this app

This file documents exact steps to add Vercel Web Analytics to this repository (Next.js App Router). It shows the files to create or update in this app, testing notes, and how to verify the integration.

Summary (high level)

- Install the official package: `@vercel/analytics`
- Add a small client component at `src/components/VercelAnalytics.tsx`
- Mount that component from the app root layout (`src/app/layout.tsx`) inside the `<body>`
- Deploy to Vercel and enable Web Analytics in your project settings

Requirements / assumptions

- This repo uses the Next.js App Router (see `src/app/`). Instructions below assume App Router.

Step 1 — install the package

Run one of these in your project root:

```bash
npm install @vercel/analytics
# or
pnpm add @vercel/analytics
```

Step 2 — add a client wrapper component (exact file)

Create the file `src/components/VercelAnalytics.tsx` with the following content:

```tsx
// src/components/VercelAnalytics.tsx
'use client';

import { Analytics } from '@vercel/analytics/react';

export default function VercelAnalytics() {
	// The Analytics component is intentionally minimal — it attaches the client
	// analytics script and starts collecting events when deployed on Vercel.
	return <Analytics />;
}
```

Step 3 — mount the wrapper in this app's root layout

Open `src/app/layout.tsx` and add the component inside the `<body>` right after `{children}`. Example patch (insert near the bottom of the body):

```tsx
import VercelAnalytics from '@/components/VercelAnalytics';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>
				{children}
				{/* Vercel Web Analytics (client only) */}
				{process.env.NODE_ENV === 'production' && <VercelAnalytics />}
			</body>
		</html>
	);
}
```

Notes:

- The `process.env.NODE_ENV === 'production'` guard is optional but recommended so you don't render analytics during local development.
- If you prefer to always include analytics on preview deploys as well, remove the guard or change the condition.

Step 4 — testing and Jest notes

- Some tests render the app layout or client components. To avoid errors during Jest runs:
  - If a test imports `@vercel/analytics/react`, Jest may attempt to render it; you can add this manual mock to `__mocks__/@vercel/analytics/react.js`:

```js
// __mocks__/@vercel/analytics/react.js
module.exports = {
	Analytics: () => null,
};
```

- Or in your Jest setup file, add:

```js
jest.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));
```

- No app-specific environment variables are required for Vercel Web Analytics — it works automatically when a project is deployed on Vercel and Analytics is enabled in the dashboard.

Step 5 — deploy and enable Web Analytics in the Vercel dashboard

1. Push your changes and deploy to Vercel (Preview or Production).
2. In the Vercel dashboard, go to your Project → Settings → Analytics (or the Analytics tab) and enable Web Analytics.
3. Wait a few minutes; then visit your deployed app and check the Vercel Analytics dashboard for events.

Verification checklist

- [ ] `@vercel/analytics` is added to `package.json` and installed.
- [ ] `src/components/VercelAnalytics.tsx` exists with the Analytics wrapper.
- [ ] `src/app/layout.tsx` imports and renders `<VercelAnalytics />` inside `<body>`.
- [ ] Project deployed to Vercel and Analytics enabled in project settings.

Troubleshooting

- "Module not found: '@vercel/analytics'": run the install command and restart your dev server.
- No data in Vercel Analytics dashboard: confirm the deployment you're checking is the one receiving traffic and that Web Analytics is enabled for that deployment/domain.
- Tests failing due to the Analytics component: mock `@vercel/analytics/react` as shown above.

Privacy and considerations

- Vercel Web Analytics is privacy-first (no cookies, no localStorage-based identifiers by default). See Vercel docs for details and data retention settings.
- If you need to conditionally disable analytics for certain users (e.g., opt-out) wrap `<VercelAnalytics />` in a conditional using your auth/consent logic.

References

- Official docs: https://vercel.com/docs/web-analytics

---

File updated: `docs/ANALYTICS.md` — follow the steps above to implement analytics in this repo.
