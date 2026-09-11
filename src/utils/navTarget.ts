// From the LEAF, never from `./sceneMotion`. This module is reached from
// `Header.tsx` and `Home.tsx`, both eager, and importing these names through
// `sceneMotion`'s re-exports would drag the whole motion module back into
// `index.js` — which is the 9 146 B the split exists to undo.
import {
  ACT_ONE_SVH,
  ACT_TWO_APPROACH_SVH,
  ACT_TWO_RELEASE_SVH,
  ACT_TWO_SVH_PER_COLUMN,
  scrollTargetFor,
  volumeShotPlayhead,
} from './playhead'

/**
 * Where the nav's "all work" link goes.
 *
 * The archive is no longer a section of its own: it is act two of the Selected
 * Work scene, so `#archive` names no scroll box the browser can reach. The link
 * has to become a NUMBER — the document scrollY at which the whole frieze is in
 * frame — and this module is the one place that turns the id into it.
 *
 * It composes, it does not derive. Pipeline 1 owns the beat arithmetic
 * (`volumeShotPlayhead`, `scrollTargetFor`); all this adds is reading the
 * column count back off the DOM.
 */

/**
 * The svh the wrapper publishes below act two's first column: act one's scrub
 * plus the pin's viewport, plus the release and the approach, which every
 * non-empty frieze pays. Written from the constants so a re-timed beat moves it.
 */
const BASE_SVH = ACT_ONE_SVH + ACT_TWO_RELEASE_SVH + ACT_TWO_APPROACH_SVH

/**
 * The frieze column count the scene actually laid out, from `.scene-scroll`'s
 * `data-svh`. `null` when the wrapper is absent or its `data-svh` is not a
 * finite number.
 *
 * The inverse of `sceneWrapperSvh`, and deliberately the DOM's answer rather
 * than `friezeLayout(archive, FRIEZE_ROWS).columns`: the wrapper's height is
 * what the scene actually set. A recomputed packing that disagreed by one
 * column would aim the link at a frame the scene is not on, and it would pull
 * the whole archive dataset and the layout packer into the header's chunk.
 */
export function columnsFromSvh(svh: number | null): number | null {
  if (svh === null || !Number.isFinite(svh)) return null
  const columns = (svh - BASE_SVH) / ACT_TWO_SVH_PER_COLUMN
  if (!Number.isInteger(columns) || columns < 0) return null
  return columns
}

/**
 * What the nav's `#<id>` should scroll to on Home: a number for `archive` while
 * a measured `.scene-scroll` exists, else the selector.
 *
 * Three cases, and the two fallbacks differ on purpose. With NO wrapper the
 * scene never mounted (no WebGL2, or the context was lost) and the stream is a
 * real element in normal flow, so `#archive` is the right target. With a
 * wrapper present but no readable `data-svh`, the stream is the hidden twin —
 * a fixed 0×0 box — and scrolling to it is a no-op, so the section's own top
 * stands in until the measurement arrives.
 */
export function resolveNavTarget(
  id: string,
  doc: Document,
  viewportHeight: number,
): number | string {
  if (id !== 'archive') return `#${id}`

  const wrapper = doc.querySelector<HTMLElement>('#projects .scene-scroll')
  if (!wrapper) return '#archive'

  const raw = wrapper.dataset.svh
  const columns = columnsFromSvh(raw === undefined || raw === '' ? null : Number(raw))
  if (columns === null) return '#projects'

  const wrapperTop =
    wrapper.getBoundingClientRect().top + (doc.defaultView?.scrollY ?? 0)

  // `columns` goes to BOTH: with the default 0, `scrollTargetFor` maps this
  // playhead through act one alone and the link lands past the wrapper's end.
  return scrollTargetFor(
    volumeShotPlayhead(columns),
    wrapperTop,
    wrapper.offsetHeight,
    viewportHeight,
    columns,
  )
}
