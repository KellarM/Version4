const PHASE_GRADIENT = {
  betting:        'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)',
  flop:           'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)',
  turn:           'linear-gradient(90deg, #fb923c 0%, #f97316 100%)',
  lowHighBetting: 'linear-gradient(90deg, #60a5fa 0%, #93c5fd 100%)',
  river:          'linear-gradient(90deg, #fef08a 0%, #f97316 100%)',
  settlement:     'linear-gradient(90deg, #a3a3a3 0%, #737373 100%)',
  winner:         'linear-gradient(90deg, #fef08a 0%, #f97316 100%)',
};

export default function DealerAnnouncement({ message, phase }) {
  const gradient = PHASE_GRADIENT[phase] || PHASE_GRADIENT.betting;
  const text = message || '';
  const duration = Math.max(7, text.length * 0.15);

  return (
    <div
      style={{
        width: '100%',
        height: '32px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      {text && (
        <span
          key={text}
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            fontFamily: 'Oswald, sans-serif',
            fontSize: '0.8rem',
            fontWeight: 700,
            fontStyle: 'italic',
            lineHeight: '32px',
            height: '32px',
            transform: 'skewX(-8deg)',
            background: gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: `dealer-marquee ${duration}s linear infinite`,
            willChange: 'transform',
            paddingLeft: '0.75rem',
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
}