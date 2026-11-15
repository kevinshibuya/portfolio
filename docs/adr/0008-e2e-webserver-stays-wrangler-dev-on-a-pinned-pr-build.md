# The e2e web server stays `wrangler dev`, pinned to a pkg.pr.new PR build

`npm run preview` is `npm run build && wrangler dev` (`package.json`), and Playwright uses it as its `webServer` (`playwright.config.ts`). From wrangler 4.114.0 onward a keep-alive race inside wrangler's own ProxyWorker hop became fatal, killing the dev server mid-suite: full runs went green for 72 tests and then failed the rest with `ERR_CONNECTION_REFUSED`. The root cause was traced to a ~10 ms window where a pooled connection is reused exactly as the server closes it.

Two things were settled. First, `wrangler dev` stays as the web server — that is the owner's ruling, and swapping to `vite preview` was previously rejected. Second, the fix is the upstream PR's prebuilt package rather than a local patch: `npm i -D https://pkg.pr.new/cloudflare/workers-sdk/wrangler@15252`, which is wrangler 4.124.0 plus fix PR #15252. It landed at `a3f0bfa` and was proven RED to GREEN on a committed reproducer, with the full Playwright suite then running to completion.

## Considered and rejected

`patch-package` onto 4.123.0 (kept as fallback B, not needed); `retries: 1`; `freePort`; bumping to 4.125.0, which carries the same code; waiting for the ~10 ms window to stop being hit; swapping the web server to `vite preview`.

## Consequences

`package.json` pins a URL where a semver belongs, so a fresh `npm ci` depends on pkg.pr.new staying up. The URL is also MUTABLE: pkg.pr.new rebuilds `@15252` against the PR head, and the artifact behind it has already moved from the 4.124.0 recorded above to **4.128.0** in `package-lock.json`. The lockfile `integrity` hash means a fresh push to that PR makes a clean clone fail loudly with EINTEGRITY rather than install something unexpected · but it does make the repo un-installable until someone re-pins. The revert condition is recorded: go back to a plain `wrangler@^4.x` in the first release that contains #15252, which is neither 4.124.0 nor 4.125.0.

Because `npm run preview` is wrangler rather than a static server, Lighthouse and ad-hoc preview work use `npx vite preview --port 4173` instead (`CONTEXT.md`).

## Pin reverted, 2026-09-27

The revert condition is met. #15252 merged on 2026-09-07 and first shipped in wrangler 4.129.1, so `package.json` is back on a plain registry `wrangler`. The first decision stands: `wrangler dev` is still the e2e web server. What goes is the URL pin, and with it the npm audit findings it held in place (7 high, wrangler → miniflare → sharp), which `npm audit fix` could not reach because the pin gave npm no newer version to move to.

The pin had also left `@cloudflare/kv-asset-handler` resolved from pkg.pr.new in the lockfile: the PR build already called itself 0.5.0, the version wrangler asks for, so npm kept the entry instead of re-resolving it. That entry was deleted and re-resolved from the registry; `grep pkg.pr.new package-lock.json` must stay empty.

Amended 2026-10-06, on review: `wrangler@^4.148.0` (with `@cloudflare/vite-plugin@^1.63.0`, which peers on it) clears the undici advisories published after the revert. miniflare still pins `sharp` to exactly 0.35.4, below the librsvg fix in 0.35.5, so `overrides` sends it to the direct `sharp` range (`"sharp": "$sharp"`). Drop that override once miniflare's own pin reaches 0.35.5.

Verified on 4.148.0: a clean `npm ci` from the registry alone, `npm audit` at 0, and the full e2e suite in five chunks, 138 passed, 0 failed on rerun, with no dev-server exit and no `ERR_CONNECTION_REFUSED` or `ECONNRESET`. Two timing tests wobbled under load (`perf-budget` long tasks, the loader's text) and passed on rerun; the built site is byte-identical to `staging`'s build before this change, so neither can come from this change.

## Source

`package.json`, `playwright.config.ts`, `CONTEXT.md`
