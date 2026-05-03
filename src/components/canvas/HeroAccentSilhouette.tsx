// 280×280 SVG silhouette of an icosahedron — kept outside R3F so removing
// the R3F flag swaps to this with identical bbox.
export function HeroAccentSilhouette() {
  return (
    <svg viewBox="0 0 280 280" width="100%" height="100%" aria-hidden="true">
      <g fill="none" stroke="#A2D2FF" strokeWidth="1.5">
        <polygon points="140,30 240,90 200,210 80,210 40,90" />
        <polygon points="140,30 200,210 80,210" opacity="0.6" />
        <line x1="140" y1="30" x2="140" y2="210" />
        <line x1="40" y1="90" x2="240" y2="90" />
      </g>
    </svg>
  )
}
