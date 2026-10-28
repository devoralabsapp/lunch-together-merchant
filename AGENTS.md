<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project guidance
- Preserve Vietnamese default and English UI; keep the shared customer schema and financial authorization unchanged.
- Do not publish environment files, production IDs, auth state, private data, or test-only login routes.
- All commits use devoralabsapp and 339309483+devoralabsapp@users.noreply.github.com for author and committer.
- The canonical shared Rules are reviewed and regression-tested with the customer application. Preserve its existing primary-admin configuration outside this public repo.
