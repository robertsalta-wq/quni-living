/**
 * Living Console backdrop.
 *
 * Per HANDOFF.md non-goal 6 this is the **single** non-flat surface allowed
 * across admin. The prototype layers a hand-drawn aerial suburb SVG behind
 * three radial washes; PR 3 ships only the washes so the layout review isn't
 * blocked on the decorative tile. The aerial SVG can be ported as a polish
 * pass — slot it in front of the wash divs below and the rest stays intact.
 */
export function HomeBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{ background: '#FDF7DF', opacity: 0.55 }}
      />
      <div
        className="absolute"
        style={{
          inset: '-20% -10% 40% -10%',
          background:
            'radial-gradient(ellipse 70% 50% at 20% 0%, rgba(254,249,228,.85), rgba(254,249,228,0) 70%)',
        }}
      />
      <div
        className="absolute"
        style={{
          top: '-12%',
          right: '-8%',
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,111,97,.08), rgba(255,111,97,0) 65%)',
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: '-10%',
          left: '-6%',
          width: 640,
          height: 640,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(31,42,68,.05), rgba(31,42,68,0) 65%)',
        }}
      />
    </div>
  )
}
