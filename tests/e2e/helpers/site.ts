import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { runnerImport } from 'vite'
import { projects } from '../../../src/data/projects'
import type { Project } from '../../../src/types/content'

/**
 * Shared helpers for the browser suite.
 *
 * `testDir` is `tests/e2e` with the default `*.spec.ts` match, so this file is
 * not collected as a suite.
 */

/** Every project slug, in data order. */
export const SLUGS: readonly string[] = projects.map((p) => p.slug)

/** The case studies in the site's own ranking, as `rankedProjects` in src/data/archive.ts orders them. */
export const RANKED: readonly Project[] = [...projects].sort((a, b) => a.order - b.order)

const loaded = new Map<string, Promise<unknown>>()

/**
 * Import a module of `src/` through Vite, for the modules Node cannot load on
 * its own: `media.ts` imports JSON without an import attribute and `archive.ts`
 * imports a CSV with `?raw`. Cached per path for the worker's life.
 */
export function loadSrc<T>(path: string): Promise<T> {
  let pending = loaded.get(path)
  if (!pending) {
    const file = fileURLToPath(new URL(`../../../src/${path}`, import.meta.url))
    pending = runnerImport<T>(file, { configFile: false, logLevel: 'silent' }).then((result) => result.module)
    loaded.set(path, pending)
  }
  return pending as Promise<T>
}

/**
 * Console errors and page errors, collected from the moment this is called.
 * Attach it before `page.goto` so load-time errors are caught.
 */
export function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`))
  return errors
}

/**
 * Load a path and wait until the loader has gone (main.tsx sets
 * `body[data-loader-state="done"]` when it removes the loader). The entrance
 * itself holds the page for about two seconds; this waits on the attribute,
 * never on a fixed sleep.
 */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
}

/** Answer every WebGL context request with null, as a browser without WebGL would. 2D canvases still work. */
export async function disableWebgl(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
      if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl') return null
      return (original as unknown as (id: string, ...rest: unknown[]) => unknown).call(this, contextId, ...args)
    } as typeof HTMLCanvasElement.prototype.getContext
  })
}
