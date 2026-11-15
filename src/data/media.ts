import manifest from './media.json'
import { galleries, type RowLayout } from './galleries'
import type { Bilingual, MediaClip, MediaItem, MediaStill } from '../types/content'

/**
 * A project's captures and recordings, in the order the media pass wrote them:
 * clips first, then desktop stills, then phone stills.
 */
const MEDIA = manifest as unknown as Record<string, { items: MediaItem[] }>

const isStill = (item: MediaItem): item is MediaStill => item.type === 'still'
const isClip = (item: MediaItem): item is MediaClip => item.type === 'clip'

export function mediaOf(slug: string): MediaItem[] {
  return MEDIA[slug]?.items ?? []
}

/** The picture that stands for a project: its first desktop recording, or its first desktop still. */
export function leadOf(slug: string): MediaItem | undefined {
  const items = mediaOf(slug)
  return items.find((item) => isClip(item) && item.shape === 'wide') ?? items.find((item) => item.shape === 'wide') ?? items[0]
}

/** The first desktop still: the picture of a project in a list. */
export function coverOf(slug: string): MediaStill | undefined {
  const stills = mediaOf(slug).filter(isStill)
  return stills.find((item) => item.shape === 'wide') ?? stills[0]
}

/** The mat: the black margin of a frame, as a share of the frame's own width, the same on every side. */
export const MAT = 0.04

/** Width over height of the frame that holds a capture inside its mat. */
export function frameAspect(item: MediaItem | undefined): number {
  if (!item) return 8 / 5
  return 1 / ((1 - 2 * MAT) * (item.h / item.w) + 2 * MAT)
}

/**
 * The three pictures of a project's row on the work index: a desktop screen,
 * a phone screen, a second desktop screen. A second state of a screen already
 * in the row is passed over while another screen is left.
 */
export function stripOf(slug: string): MediaStill[] {
  const stills = mediaOf(slug).filter(isStill)
  const wide = stills.filter((item) => item.shape === 'wide').sort((a, b) => Number(a.like !== undefined) - Number(b.like !== undefined))
  const phone = stills.filter((item) => item.shape === 'phone')
  return [wide[0], phone[0], wide[1]].filter((item): item is MediaStill => item !== undefined)
}

export interface EvidenceRow {
  layout: RowLayout
  items: MediaItem[]
}

export interface EvidenceGroup {
  label: Bilingual | undefined
  rows: EvidenceRow[]
}

export interface Gallery {
  /** The recording, or still, that travels down the page from the opening screen. */
  lead: MediaItem | undefined
  /** The evidence, group by group, in page order. */
  groups: EvidenceGroup[]
}

/**
 * A project page's media: the lead, then its groups as planned in
 * `galleries.ts`. A project with no plan gets one made from what it has: a
 * recording across the page, two screens side by side, three phone screens.
 */
export function galleryOf(slug: string): Gallery {
  const items = mediaOf(slug)
  const lead = leadOf(slug)
  const byId = new Map(items.map((item) => [item.id, item]))
  const plan = galleries[slug]
  if (plan) {
    const groups = plan
      .map((group) => ({
        label: group.label,
        rows: group.rows
          .map((row) => ({ layout: row.layout, items: row.items.map((id) => byId.get(id)).filter((item): item is MediaItem => item !== undefined) }))
          .filter((row) => row.items.length > 0),
      }))
      .filter((group) => group.rows.length > 0)
    return { lead, groups }
  }
  // A still whose screen a recording already opens on is not shown a second time.
  const twins = new Set(items.filter(isClip).map((item) => item.twin))
  const others = items.filter((item) => item !== lead && !(isStill(item) && twins.has(item.id)))
  const wide = others.filter((item) => item.shape === 'wide')
  const full = wide.find(isClip) ?? wide[0]
  const pair = wide.filter((item) => item !== full).slice(0, 2)
  const phones = others.filter((item) => item.shape === 'phone').slice(0, 3)
  const rows: EvidenceRow[] = []
  if (full) rows.push({ layout: 'full', items: [full] })
  if (pair.length === 2) rows.push({ layout: 'pair', items: pair })
  const groups: EvidenceGroup[] = []
  if (rows.length) groups.push({ label: undefined, rows })
  if (phones.length) groups.push({ label: undefined, rows: [{ layout: 'phones', items: phones }] })
  return { lead, groups }
}

/**
 * A project page's media as one column, for the wide page: everything after
 * the lead, in page order. Desktop captures come two at a time, stills and
 * recordings alternating, with a pair of phone captures between.
 */
export function columnOf(slug: string): MediaItem[] {
  const items = mediaOf(slug)
  const lead = leadOf(slug)
  // A still whose screen a recording already opens on is not shown a second time.
  const twins = new Set(items.filter(isClip).map((item) => item.twin))
  const twin = (item: MediaItem): boolean => isStill(item) && (twins.has(item.id) || (item.like !== undefined && twins.has(item.like)))
  const others = items.filter((item) => item !== lead)
  const wide = others.filter((item) => item.shape === 'wide' && !twin(item)).sort((a, b) => Number(isClip(a)) - Number(isClip(b)))
  // Phone captures sit two to a row: a twin goes only when that leaves the rows whole.
  const phones = others.filter((item) => item.shape === 'phone')
  const untwinned = phones.filter((item) => !twin(item))
  // Stills first, so a kept twin never sits beside its own recording.
  const phone = (untwinned.length % 2 === 0 ? untwinned : phones).sort((a, b) => Number(isClip(a)) - Number(isClip(b)))
  const stills = wide.filter(isStill)
  const clips = wide.filter(isClip)
  const mixed: MediaItem[] = []
  while (stills.length || clips.length) {
    const still = stills.shift()
    if (still) mixed.push(still)
    const clip = clips.shift()
    if (clip) mixed.push(clip)
  }
  const column: MediaItem[] = []
  while (mixed.length || phone.length) {
    column.push(...mixed.splice(0, 2))
    if (phone.length >= 2) column.push(...phone.splice(0, 2))
    else if (!mixed.length) column.push(...phone.splice(0))
  }
  return column
}
