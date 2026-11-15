// The runner OWNS its server. Nothing else may be serving 4173 while it runs.
//
// WHY THIS IS NOT `npm run preview`: in this repo `npm run preview` is
// `npm run build && wrangler dev` — a workerd server, a different stack with a
// different asset pipeline. The e2e suite uses it and that is fine for
// functional tests, but a perf baseline assembled from a mix of two server
// stacks is not a baseline. Both perf layers (this and Task 4's Lighthouse
// bench) pin `npx vite preview` and record the exact command in every report.

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { freePort, killGroup, sleep, spawnDetached, run } from './proc.mjs'

export const PORT = 4173
export const BASE_URL = `http://localhost:${PORT}`
export const SERVE_COMMAND = `npx vite preview --port ${PORT} --strictPort`

/**
 * `--strictPort` is not cosmetic: without it vite silently walks to 4174 when
 * 4173 is busy, and every scenario would then load whatever stale thing still
 * owns 4173. The one failure mode a perf harness must never have is producing
 * confident numbers about the wrong build.
 */
const SERVE_ARGS = ['vite', 'preview', '--port', String(PORT), '--strictPort']

export async function buildOnce(repoRoot, log) {
  log('build: npm run build')
  const started = Date.now()
  const result = await run('npm', ['run', 'build'], { cwd: repoRoot })
  if (result.code !== 0) {
    throw new Error(`npm run build failed (exit ${result.code}):\n${result.stdout}\n${result.stderr}`)
  }
  log(`build: ok (${((Date.now() - started) / 1000).toFixed(1)}s)`)
}

/**
 * Content hash of the built entry document. Stamped into every report so a run
 * can never be silently compared against numbers from a different build — the
 * `--no-build` iteration flag makes that a live risk, not a theoretical one.
 */
export async function distFingerprint(repoRoot) {
  const indexPath = path.join(repoRoot, 'dist', 'index.html')
  if (!existsSync(indexPath)) {
    throw new Error(`dist/index.html is missing — run without --no-build (looked in ${indexPath})`)
  }
  const bytes = await readFile(indexPath)
  return {
    distIndexHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    distIndexBytes: bytes.length,
  }
}

export async function startPreview(repoRoot, log) {
  await freePort(PORT, log)

  const child = spawnDetached('npx', SERVE_ARGS, { cwd: repoRoot })
  const output = []
  child.stdout?.on('data', (chunk) => output.push(String(chunk)))
  child.stderr?.on('data', (chunk) => output.push(String(chunk)))

  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`preview server exited early (code ${child.exitCode}):\n${output.join('')}`)
    }
    if (await respondsOk()) {
      log(`serve: ${SERVE_COMMAND} (pid ${child.pid})`)
      return {
        child,
        stop: async () => {
          killGroup(child, 'SIGTERM')
          await sleep(300)
          killGroup(child, 'SIGKILL')
        },
      }
    }
    await sleep(250)
  }
  killGroup(child, 'SIGKILL')
  throw new Error(`preview server never answered on ${BASE_URL} within 60s:\n${output.join('')}`)
}

async function respondsOk() {
  try {
    const response = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(2000) })
    return response.ok
  } catch {
    return false
  }
}
