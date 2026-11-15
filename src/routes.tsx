import { lazy, useState, type ComponentType, type ReactElement } from 'react'

/**
 * A page whose code arrives on its own: fetched ahead by `preload` (a pointer
 * over a link, a click), and rendered without a pause when it is already
 * here. Only a page asked for before its code has landed waits for it.
 */
export interface LoadablePage {
  Page: ComponentType
  preload: () => Promise<void>
}

function loadable(load: () => Promise<ComponentType>): LoadablePage {
  let ready: ComponentType | null = null
  let pending: Promise<ComponentType> | null = null
  const fetch = (): Promise<ComponentType> => {
    pending ??= load().then((component) => {
      ready = component
      return component
    })
    return pending
  }
  const Waiting = lazy(() => fetch().then((component) => ({ default: component })))
  function Page(): ReactElement {
    // Chosen once for each mount, so a page never swaps its own root under the reader.
    const [Now] = useState<ComponentType | null>(() => ready)
    return Now ? <Now /> : <Waiting />
  }
  return {
    Page,
    preload: () =>
      fetch().then(
        () => undefined,
        () => {
          pending = null
        },
      ),
  }
}

export const projectPage = loadable(() => import('./pages/ProjectDetail').then((m) => m.ProjectDetail))
export const allWorkPage = loadable(() => import('./pages/AllWork').then((m) => m.AllWork))

/** Fetch a route's code ahead of the click that needs it; resolves once it is here (or never will be). */
export function preloadRoute(to: string): Promise<void> {
  if (to.startsWith('/projects')) return projectPage.preload()
  if (to === '/all-work') return allWorkPage.preload()
  return Promise.resolve()
}
