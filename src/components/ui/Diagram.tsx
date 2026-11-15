import type { ReactElement } from 'react'
import { useI18n } from '../../i18n'
import type { Architecture, ArchNode } from '../../data/architecture'
import type { Bilingual, Lang } from '../../types/content'

/**
 * A project's architecture, drawn as SVG in the site's own shapes: each
 * pipeline is a row of boxes joined by orange arrows. A box the project owns
 * is an outline, like a tag; a service outside it is a pale chip; where the
 * data rests the box is tinted. Two drawings are made from the same data: one
 * that reads across, for a wide column, and one that reads down, for a phone.
 */
const CREAM = '#F9F4EC'
const CHIP = '#EDE8DE'
const ORANGE = '#D94300'
const MUTED = 'rgba(249, 244, 236, 0.62)'
const LINE = 'rgba(249, 244, 236, 0.32)'
const TINT = 'rgba(249, 244, 236, 0.1)'

const say = (text: string | Bilingual, lang: Lang): string => (typeof text === 'string' ? text : text[lang])

function Box({
  node,
  x,
  y,
  w,
  h,
  lang,
  row,
}: {
  node: ArchNode
  x: number
  y: number
  w: number
  h: number
  lang: Lang
  /** A phone row: the name at the left, the note at the right, on one line. */
  row: boolean
}): ReactElement {
  const outside = node.kind === 'outside'
  const ink = outside ? '#000' : CREAM
  const soft = outside ? 'rgba(0, 0, 0, 0.62)' : MUTED
  const label = say(node.label, lang)
  const sub = node.sub ? say(node.sub, lang) : null
  return (
    <g>
      <rect
        x={x + 0.5}
        y={y + 0.5}
        width={w - 1}
        height={h - 1}
        rx={4}
        fill={outside ? CHIP : node.kind === 'store' ? TINT : 'none'}
        stroke={outside ? 'none' : LINE}
      />
      {row ? (
        <>
          <text x={x + 12} y={y + h / 2 + 5} fill={ink}>
            {label}
          </text>
          {sub && (
            <text x={x + w - 12} y={y + h / 2 + 5} fill={soft} textAnchor="end">
              {sub}
            </text>
          )}
        </>
      ) : (
        <>
          <text x={x + w / 2} y={sub ? y + h / 2 - 3 : y + h / 2 + 5} fill={ink} textAnchor="middle">
            {label}
          </text>
          {sub && (
            <text x={x + w / 2} y={y + h / 2 + 15} fill={soft} textAnchor="middle">
              {sub}
            </text>
          )}
        </>
      )}
    </g>
  )
}

/** An arrow from (x1, y1) to (x2, y2), along one axis. */
function Link({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }): ReactElement {
  const down = x1 === x2
  const head = down
    ? `M${x2 - 4.5} ${y2 - 5.5}L${x2} ${y2 - 1}L${x2 + 4.5} ${y2 - 5.5}`
    : `M${x2 - 5.5} ${y2 - 4.5}L${x2 - 1} ${y2}L${x2 - 5.5} ${y2 + 4.5}`
  return <path d={`M${x1} ${y1}L${down ? x2 : x2 - 1} ${down ? y2 - 1 : y2}${head}`} fill="none" stroke={ORANGE} strokeWidth={1.75} />
}

export function Diagram({ architecture, title }: { architecture: Architecture; title: string }): ReactElement {
  const { lang } = useI18n()
  const { lanes } = architecture
  const most = Math.max(...lanes.map((lane) => lane.nodes.length))

  // Across: every lane shares one set of columns.
  const W = 656
  const GAP = 30
  const boxW = (W - (most - 1) * GAP) / most
  const BOX_H = 56
  const LANE_H = 24 + BOX_H + 36
  const wideH = lanes.length * LANE_H - 36

  // Down: one box a line.
  const N = 318
  const ROW_H = 40
  const ROW_GAP = 18
  let cursor = 0
  const tops = lanes.map((lane) => {
    const top = cursor
    cursor += 24 + lane.nodes.length * ROW_H + (lane.nodes.length - 1) * ROW_GAP + 32
    return top
  })
  const narrowH = cursor - 32

  return (
    <>
      <svg className="diagram-svg--wide" viewBox={`0 0 ${W} ${wideH}`} role="img" aria-label={title}>
        {lanes.map((lane, i) => {
          const top = i * LANE_H
          return (
            <g key={i}>
              <text x={0} y={top + 11} fill={MUTED}>
                {lane.label[lang]}
              </text>
              {lane.nodes.map((node, k) => {
                const x = k * (boxW + GAP)
                const y = top + 24
                return (
                  <g key={k}>
                    {k > 0 && <Link x1={x - GAP + 5} y1={y + BOX_H / 2} x2={x - 5} y2={y + BOX_H / 2} />}
                    <Box node={node} x={x} y={y} w={boxW} h={BOX_H} lang={lang} row={false} />
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
      <svg className="diagram-svg--narrow" viewBox={`0 0 ${N} ${narrowH}`} role="img" aria-label={title}>
        {lanes.map((lane, i) => (
          <g key={i}>
            <text x={0} y={tops[i] + 11} fill={MUTED}>
              {lane.label[lang]}
            </text>
            {lane.nodes.map((node, k) => {
              const y = tops[i] + 24 + k * (ROW_H + ROW_GAP)
              return (
                <g key={k}>
                  {k > 0 && <Link x1={N / 2} y1={y - ROW_GAP + 3} x2={N / 2} y2={y - 3} />}
                  <Box node={node} x={0} y={y} w={N} h={ROW_H} lang={lang} row />
                </g>
              )
            })}
          </g>
        ))}
      </svg>
    </>
  )
}
