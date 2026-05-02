function getChipDef(amount) {
  if (amount <= 5) {
    return { outer: '#1D4ED8', mid: '#2563EB', edge: '#1E3A8A', rim: '#172554', shine: '#93C5FD' }; // Blue
  } else if (amount <= 20) {
    return { outer: '#15803D', mid: '#16A34A', edge: '#166534', rim: '#14532D', shine: '#86EFAC' }; // Green
  } else if (amount <= 45) {
    return { outer: '#92400E', mid: '#B45309', edge: '#78350F', rim: '#451A03', shine: '#D97706' }; // Brown
  } else if (amount <= 95) {
    return { outer: '#B8860B', mid: '#DAA520', edge: '#8B6914', rim: '#6B4F10', shine: '#FFD700' }; // Gold
  } else if (amount <= 150) {
    return { outer: '#BE185D', mid: '#EC4899', edge: '#9D174D', rim: '#831843', shine: '#F9A8D4' }; // Bright Pink
  } else {
    return { outer: '#1a1a1a', mid: '#2a2a2a', edge: '#B8860B', rim: '#8B6914', shine: '#DAA520', isBlack500: true }; // Black/Gold $500
  }
}

export default function Chip({ amount, scale = 1, draggable = false, onDragStart, title, style, className = '', playerId }) {
  const def = getChipDef(amount ?? 5);

  // Sizes
  const d = Math.round(54 * scale);         // outer diameter
  const centerD = Math.round(d * 0.52);     // white center circle diameter
  const wallH = Math.max(4, Math.round(6 * scale));
  const totalH = d + wallH;

  // Font size — scale down for large numbers to always fit
  const label = amount !== undefined ? String(amount) : null;
  const charCount = label ? label.length : 1;
  const baseFontSize = Math.round(16 * scale);
  const fontSize = charCount >= 4 ? Math.max(9, Math.round(baseFontSize * 0.7)) : charCount === 3 ? Math.max(11, Math.round(baseFontSize * 0.82)) : baseFontSize;

  return (
    <span
      draggable={draggable}
      onDragStart={onDragStart}
      title={title}
      data-chip="true"
      className={`relative inline-flex select-none flex-shrink-0 ${className}`}
      style={{ width: d, height: totalH, cursor: draggable ? 'grab' : 'default', overflow: 'visible', ...style }}
    >
      {/* Ground shadow */}
      <span aria-hidden style={{
        position: 'absolute', bottom: -2, left: Math.round(2 * scale),
        width: d - Math.round(4 * scale), height: Math.round(4 * scale),
        borderRadius: '50%', background: 'rgba(0,0,0,0.6)',
        filter: `blur(${Math.round(3 * scale)}px)`, pointerEvents: 'none',
      }} />

      {/* Bottom rim (thickness) */}
      <span aria-hidden style={{
        position: 'absolute', bottom: 0, left: 0, width: d, height: d,
        borderRadius: '50%', background: def.rim,
        boxShadow: `0 ${Math.round(4*scale)}px ${Math.round(10*scale)}px rgba(0,0,0,0.8)`,
      }} />

      {/* Side wall */}
      <span aria-hidden style={{
        position: 'absolute', bottom: Math.round(2 * scale), left: 0, width: d, height: d,
        borderRadius: '50%',
        background: `radial-gradient(ellipse at 50% 80%, ${def.edge} 0%, ${def.mid} 55%, ${def.edge} 100%)`,
        boxShadow: `inset 0 -${Math.round(3*scale)}px ${Math.round(5*scale)}px rgba(0,0,0,0.5), inset 0 ${Math.round(1*scale)}px ${Math.round(2*scale)}px rgba(255,255,255,0.15)`,
      }} />

      {/* Top face — colored outer ring */}
      <span aria-hidden style={{
        position: 'absolute', top: 0, left: 0, width: d, height: d,
        borderRadius: '50%',
        background: `radial-gradient(ellipse at 38% 30%, ${def.shine} 0%, ${def.mid} 38%, ${def.outer} 100%)`,
        border: `${Math.max(1, Math.round(2 * scale))}px solid ${def.rim}`,
        boxShadow: [
          `inset 0 ${Math.round(3*scale)}px ${Math.round(7*scale)}px rgba(255,255,255,0.35)`,
          `inset 0 -${Math.round(2*scale)}px ${Math.round(5*scale)}px rgba(0,0,0,0.5)`,
          `0 0 0 ${Math.max(1, Math.round(1.5*scale))}px ${def.edge}`,
        ].join(', '),
      }} />

      {/* Decorative segmented edge ring (notch marks) */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const r = d / 2 - Math.round(3 * scale);
        const cx = d / 2 + r * Math.cos(rad);
        const cy = d / 2 + r * Math.sin(rad);
        const notchW = Math.max(3, Math.round(4 * scale));
        const notchH = Math.max(2, Math.round(3 * scale));
        return (
          <span key={deg} aria-hidden style={{
            position: 'absolute',
            top: cy - notchH / 2,
            left: cx - notchW / 2,
            width: notchW, height: notchH,
            borderRadius: Math.round(1 * scale),
            background: 'rgba(255,255,255,0.55)',
            pointerEvents: 'none',
            transform: `rotate(${deg}deg)`,
          }} />
        );
      })}

      {/* White center circle — hidden for $500 black chip */}
      {!def.isBlack500 && (
        <span aria-hidden style={{
          position: 'absolute',
          top: (d - centerD) / 2,
          left: (d - centerD) / 2,
          width: centerD, height: centerD,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 38% 32%, #ffffff 0%, #f0f0f0 70%, #e0e0e0 100%)',
          border: `${Math.max(1, Math.round(1.5 * scale))}px solid rgba(0,0,0,0.25)`,
          boxShadow: `inset 0 ${Math.round(1*scale)}px ${Math.round(3*scale)}px rgba(0,0,0,0.15)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Specular glint on top */}
      <span aria-hidden style={{
        position: 'absolute',
        top: Math.round(3 * scale), left: Math.round(4 * scale),
        width: Math.round(9 * scale), height: Math.round(5 * scale),
        borderRadius: '50%', background: 'rgba(255,255,255,0.5)',
        filter: `blur(${Math.round(1.5 * scale)}px)`,
        pointerEvents: 'none', transform: 'rotate(-20deg)',
      }} />

      {/* Dollar value label — gold on black chip, black on others */}
      {label !== null && (
        <span style={{
          position: 'absolute',
          top: 0, left: 0, width: d, height: d,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: def.isBlack500 ? '#DAA520' : '#000000',
          fontSize,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          textShadow: 'none',
          pointerEvents: 'none', userSelect: 'none', zIndex: 2,
        }}>
          ${label}
        </span>
      )}
    </span>
  );
}