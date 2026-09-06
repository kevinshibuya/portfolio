# The e2e web server stays `wrangler dev`, pinned to a pkg.pr.new PR build

`npm run preview` is `npm run build && wrangler dev` (`package.json`), and Playwright uses it as its `webServer` (`playwright.config.ts`). From wrangler 4.114.0 onward a keep-alive race inside wrangler's own ProxyWorker hop became fatal, killing the dev server mid-suite: full runs went green for 72 tests and then failed the rest with `ERR_CONNECTION_REFUSED`. The root cause was traced to a ~10 ms window where a pooled connection is reused exactly as the server closes it.

Two things were settled. First, `wrangler dev` stays as the web server — that is the owner's ruling, and swapping to `vite preview` was previously rejected. Second, the fix is the upstream PR's prebuilt package rather than a local patch: `npm i -D https://pkg.pr.new/cloudflare/workers-sdk/wrangler@15252`, which is wrangler 4.124.0 plus fix PR #15252. It landed at `a3f0bfa` and was proven RED to GREEN on a committed reproducer, with the full Playwright suite then running to completion.

## Considered and rejected

`patch-package` onto 4.123.0 (kept as fallback B, not needed); `retries: 1`; `freePort`; bumping to 4.125.0, which carries the same code; waiting for the ~10 ms window to stop being hit; swapping the web server to `vite preview`.

## Consequences

`package.json` pins a URL where a semver belongs, so a fresh `npm ci` depends on pkg.pr.new staying up. The revert condition is recorded: go back to a plain `wrangler@^4.x` in the first release that contains #15252, which is neither 4.124.0 nor 4.125.0.

Because `npm run preview` is wrangler rather than a static server, Lighthouse and ad-hoc preview work use `npx vite preview --port 4173` instead (`CONTEXT.md`).

## Source

`package.json`, `playwright.config.ts`, `CONTEXT.md`
