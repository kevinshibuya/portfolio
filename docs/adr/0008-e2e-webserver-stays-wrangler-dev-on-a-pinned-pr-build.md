# The e2e web server stays `wrangler dev`, pinned to a pkg.pr.new PR build

`npm run preview` is `npm run build && wrangler dev` (`package.json:14`), and Playwright uses it as its `webServer` (`playwright.config.ts:28-36`). From wrangler 4.114.0 onward a keep-alive race inside wrangler's own ProxyWorker hop became fatal, killing the dev server mid-suite: full runs went green for 72 tests and then failed the rest with `ERR_CONNECTION_REFUSED` (`HANDOFF.md:84-86`). The root cause was traced to a ~10 ms window where a pooled connection is reused exactly as the server closes it (`HANDOFF.md:88-108`).

Two things were settled. First, `wrangler dev` stays as the web server — that is the owner's ruling, and swapping to `vite preview` was previously rejected (`HANDOFF.md:123`, `:140-141`). Second, the fix is the upstream PR's prebuilt package rather than a local patch: `npm i -D https://pkg.pr.new/cloudflare/workers-sdk/wrangler@15252`, which is wrangler 4.124.0 plus fix PR #15252 (`HANDOFF.md:63-64`, `:125-130`). It landed at `a3f0bfa` and was proven RED to GREEN on a committed reproducer, with the full Playwright suite then running to completion (`HANDOFF.md:66-74`).

## Considered and rejected

`patch-package` onto 4.123.0 (kept as fallback B, not needed); `retries: 1`; `freePort`; bumping to 4.125.0, which carries the same code; waiting for the ~10 ms window to stop being hit; swapping the web server to `vite preview` (`HANDOFF.md:131-142`).

## Consequences

`package.json` pins a URL where a semver belongs, so a fresh `npm ci` depends on pkg.pr.new staying up. The revert condition is recorded: go back to a plain `wrangler@^4.x` in the first release that contains #15252, which is neither 4.124.0 nor 4.125.0 (`HANDOFF.md:76-78`).

Because `npm run preview` is wrangler rather than a static server, Lighthouse and ad-hoc preview work use `npx vite preview --port 4173` instead (`HANDOFF-press-revamp-plan1-exec.archived.md:62-63`, `HANDOFF-bento-content-revamp.archived.md:90`).

## Source

`package.json:14`, `playwright.config.ts:28-36`, `HANDOFF.md:60-80`, `:84-108`, `:123-142`, `HANDOFF-press-revamp-plan1-exec.archived.md:62-63`, `HANDOFF-bento-content-revamp.archived.md:90`
