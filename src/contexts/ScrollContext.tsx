import { createContext, useContext } from 'react'

interface ScrollContextValue {
  scrollToSection: (id: string) => void
  scrollYRef: React.RefObject<number>
  contentRef: React.RefObject<HTMLDivElement | null>
  registerScrollCallback: (fn: () => void) => () => void
}

const noop = (): (() => void) => () => {}
const defaultRef = { current: 0 }
const defaultContentRef = { current: null }

const ScrollContext = createContext<ScrollContextValue>({
  scrollToSection: () => {},
  scrollYRef: defaultRef,
  contentRef: defaultContentRef,
  registerScrollCallback: noop,
})

export const ScrollProvider = ScrollContext.Provider

export function useScrollContext(): ScrollContextValue {
  return useContext(ScrollContext)
}

/** @deprecated Use useScrollContext instead */
export function useScrollTo(): ScrollContextValue {
  return useContext(ScrollContext)
}
