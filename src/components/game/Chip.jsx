const PLAYER_CHIP_DEFS = [
  { body: '#eab308', edge: '#92400e', rim: '#78350f', shine: '#fef9c3', text: '#000' },  // P1 yellow
  { body: '#3b82f6', edge: '#1e3a8a', rim: '#172554', shine: '#bfdbfe', text: '#fff' },  // P2 blue
  { body: '#ec4899', edge: '#9d174d', rim: '#831843', shine: '#fce7f3', text: '#fff' },  // P3 pink
  { body: '#22c55e', edge: '#14532d', rim: '#052e16', shine: '#bbf7d0', text: '#000' },  // P4 green
  { body: '#f97316', edge: '#7c2d12', rim: '#431407', shine: '#ffedd5', text: '#000' },  // P5 orange
  { body: '#06b6d4', edge: '#164e63', rim: '#083344', shine: '#cffafe', text: '#000' },  // P6 cyan
  { body: '#ef4444', edge: '#7f1d1d', rim: '#450a0a', shine: '#fee2e2', text: '#fff' },  // P7 red
  { body: '#84cc16', edge: '#365314', rim: '#1a2e05', shine: '#ecfccb', text: '#000' },  // P8 lime
  { body: '#8b5cf6', edge: '#3b0764', rim: '#2e1065', shine: '#ede9fe', text: '#fff' },  // P9 violet
  { body: '#f59e0b', edge: '#78350f', rim: '#451a03', shine: '#fef3c7', text: '#000' },  // P10 amber
];

export function getPlayerChipDef(playerId) {
  return PLAYER_CHIP_DEFS[playerId % PLAYER_CHIP_DEFS.length];
}

export default function Chip({ playerId = 0, amount, scale = 1, draggable = false, onDragStart, title, style, className = '' }) {
  const def = getPlayerChipDef(playerId);
  const diameter = Math.round(24 * scale);
  const wallH = Math.max(4, Math.round(7 * scale));
  const totalH = diameter + wallH;
  const fontSize = Math.max(7, Math.round(9 * scale));
  const borderW = Math.max(1, Math.round(2 * scale));
  const notchInset = Math.max(3, Math.round(5 * scale));
  const notchBorderW = Math.max(1, Math.round(1.5 * scale));

  const label = amount === undefined ? null : (amount >= 100 ? '99+' : String(amount));

  return (
    <span
      draggable={draggable}
      onDragStart={onDragStart}
      title={title}
      className={`relative inline-flex select-none flex-shrink-0 ${className}`}
      style={{
        width: diameter,
        height: totalH,
        cursor: draggable ? 'grab' : 'default',
        overflow: 'visible',
        ...style,
      }}
    >
      {/* Ground shadow */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          bottom: -Math.round(2 * scale),
          left: Math.round(2 * scale),
          width: diameter - Math.round(4 * scale),
          height: Math.round(4 * scale),
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)',
          filter: `blur(${Math.round(3 * scale)}px)`,
          pointerEvents: 'none',
        }}
      />
      {/* Bottom rim — darkest layer, gives "thickness" */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: diameter,
          height: diameter,
          borderRadius: '50%',
          background: def.rim,
          boxShadow: `0 ${Math.round(4 * scale)}px ${Math.round(10 * scale)}px rgba(0,0,0,0.75), 0 ${Math.round(1 * scale)}px ${Math.round(3 * scale)}px rgba(0,0,0,0.9)`,
        }}
      />
      {/* Side wall band — shows chip depth/thickness */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          bottom: Math.round(2 * scale),
          left: 0,
          width: diameter,
          height: diameter,
          borderRadius: '50%',
          background: `radial-gradient(ellipse at 50% 75%, ${def.edge} 0%, ${def.body} 55%, ${def.edge} 100%)`,
          boxShadow: [
            `inset 0 -${Math.round(3 * scale)}px ${Math.round(4 * scale)}px rgba(0,0,0,0.45)`,
            `inset 0 ${Math.round(1 * scale)}px ${Math.round(2 * scale)}px rgba(255,255,255,0.15)`,
          ].join(', '),
        }}
      />
      {/* Top face */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: diameter,
          height: diameter,
          borderRadius: '50%',
          background: `radial-gradient(ellipse at 36% 28%, ${def.shine} 0%, ${def.body} 42%, ${def.edge} 100%)`,
          border: `${borderW}px solid ${def.rim}`,
          boxShadow: [
            `inset 0 ${Math.round(3 * scale)}px ${Math.round(7 * scale)}px rgba(255,255,255,0.4)`,
            `inset 0 -${Math.round(2 * scale)}px ${Math.round(5 * scale)}px rgba(0,0,0,0.45)`,
            `0 0 0 ${Math.round(1.5 * scale)}px ${def.edge}`,
            `0 ${Math.round(1 * scale)}px ${Math.round(3 * scale)}px rgba(0,0,0,0.6)`,
          ].join(', '),
        }}
      />
      {/* Edge stripe detail — decorative notch segments on rim */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: Math.round(2 * scale),
          left: Math.round(2 * scale),
          width: diameter - Math.round(4 * scale),
          height: diameter - Math.round(4 * scale),
          borderRadius: '50%',
          border: `${notchBorderW}px solid rgba(255,255,255,0.18)`,
          pointerEvents: 'none',
        }}
      />
      {/* Inner notch ring — dashed texture */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: notchInset,
          left: notchInset,
          width: diameter - notchInset * 2,
          height: diameter - notchInset * 2,
          borderRadius: '50%',
          border: `${notchBorderW}px dashed rgba(255,255,255,0.28)`,
          pointerEvents: 'none',
        }}
      />
      {/* Specular highlight — top-left glint */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: Math.round(2 * scale),
          left: Math.round(3 * scale),
          width: Math.round(8 * scale),
          height: Math.round(5 * scale),
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.45)',
          filter: `blur(${Math.round(1.5 * scale)}px)`,
          pointerEvents: 'none',
          transform: 'rotate(-20deg)',
        }}
      />
      {/* Label */}
      {label !== null && (
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: diameter,
            height: diameter,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: def.text,
            fontSize,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            textShadow: def.text === '#fff'
              ? '0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.5)'
              : '0 1px 2px rgba(255,255,255,0.5)',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 2,
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}