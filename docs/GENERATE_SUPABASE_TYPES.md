# Generating Supabase TypeScript types locally

This project uses the Supabase CLI to generate TypeScript types from the local Supabase database schema. The generated file is written to:

src/lib/database/supabase-types.ts

If the CLI isn't available or fails, the repository contains a fallback types file; prefer generating the real types for accurate typings.

Quick steps

1. Preferred (explicit CLI path):

```bash
SUPABASE_CLI=/usr/local/bin/supabase npm run gen:types
```

This forces the project's script to use the Supabase binary at `/usr/local/bin/supabase` (use the path where you installed the CLI).

2. Local flag (if you have a working `supabase` on your PATH):

```bash
npm run gen:types -- --local
```

3. Remote project (when connected to a remote Supabase project):

```bash
SUPABASE_PROJECT_ID=<your-project-id> npm run gen:types
```

Notes and troubleshooting

- If you see a fallback types file being created (the script logs a warning and writes a small fallback), it means the Supabase CLI invocation failed. The script now prefers the `SUPABASE_CLI` environment variable, then `~/.bin/supabase`, then the global `supabase`.

- To install the Supabase CLI, see the releases page:
  https://github.com/supabase/cli/releases

- CI recommendation: set `SUPABASE_CLI` to the installed binary path in CI or ensure the correct `supabase` binary is available on PATH so that `npm run gen:types` produces deterministic output.

- Output path reminder: the generated file is `src/lib/database/supabase-types.ts`. Commit it if the generated types should be checked into the repository, or add it to .gitignore if you prefer to generate on each machine/CI run.

If you'd like, I can also add a short CI job example that installs the Supabase CLI and runs `npm run gen:types`.
