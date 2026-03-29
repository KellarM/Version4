import { SUITS, SUIT_COLORS } from '@/lib/gameEngine';

export default function PlayingCard({ card, size = 'md', faceDown = false, glow = false }) {
  const sizeClasses = {
    xs: 'w-8 h-11 text-xs',
    sm: 'w-[3.9rem] h-[5.5rem] text-lg',
    md: 'w-14 h-20 text-sm',
    lg: 'w-16 h-24 text-base',
    xl: 'w-20 h-28 text-lg',
  };

  if (faceDown) {
    return (
      <div className={`${sizeClasses[size]} rounded-md border-2 border-yellow-500/80 shadow-lg shadow-yellow-900/60 overflow-hidden relative`}
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2040 30%, #1a0a2e 60%, #0a1628 100%)' }}
      >
        {/* Felt texture pattern */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 6px)',
          }}
        />
        {/* Inner border frame */}
        <div className="absolute inset-[3px] rounded-sm border border-yellow-500/40 pointer-events-none z-10" />

        {/* Decorative suit symbols scattered in background */}
        <div className="absolute inset-0 flex flex-wrap items-start content-start gap-0 overflow-hidden opacity-10">
          {['♠','♥','♦','♣','♠','♥','♦','♣','♠','♥','♦','♣'].map((s, i) => (
            <span key={i} className={`text-xs leading-none ${i % 2 === 0 ? 'text-red-400' : 'text-white'}`}
              style={{ transform: `rotate(${(i * 30) % 360}deg)`, margin: '2px' }}>
              {s}
            </span>
          ))}
        </div>

        {/* Diagonal fire streak */}
        <div className="absolute inset-0 opacity-20"
          style={{
            background: 'linear-gradient(135deg, transparent 20%, rgba(251,146,60,0.3) 45%, rgba(239,68,68,0.2) 55%, transparent 75%)',
          }}
        />

        {/* Diagonal logo — centered bottom-left to upper-right */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-0 leading-none"
            style={{ transform: 'rotate(-45deg)' }}
          >
            {/* Top line: RAPID 🔥 FIRE */}
            <div className="flex items-baseline gap-0.5 leading-none">
              <span className="font-black italic leading-none"
                style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '0.5em',
                  transform: 'skewX(-12deg)',
                  background: 'linear-gradient(90deg, #e2e8f0 0%, #ffffff 60%, #94a3b8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.05em',
                  filter: 'drop-shadow(1px 0 2px rgba(148,163,184,0.6))',
                }}
              >RAPID</span>
              <span style={{ fontSize: '0.5em', lineHeight: 1 }}>🔥</span>
              <span className="font-black italic leading-none"
                style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: '0.5em',
                  transform: 'skewX(-12deg)',
                  background: 'linear-gradient(180deg, #fef08a 0%, #f97316 60%, #dc2626 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 3px rgba(251,146,60,0.8))',
                }}
              >FIRE</span>
            </div>
            {/* Bottom line: TEXAS 10 centered under the flame */}
            <span className="font-black italic leading-none text-green-400"
              style={{
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.45em',
                transform: 'skewX(-12deg)',
                marginTop: '2px',
                letterSpacing: '0.02em',
                textShadow: '0 0 4px rgba(74,222,128,0.6)',
              }}
            >TEXAS 10</span>
          </div>
        </div>

        {/* Flame — top-left corner */}
        <div className="absolute top-1 left-1 z-20 leading-none"
          style={{ fontSize: '0.9em', filter: 'drop-shadow(0 0 3px rgba(251,146,60,0.8))' }}
        >🔥</div>

        {/* Flame — bottom-right corner */}
        <div className="absolute bottom-1 right-1 z-20 leading-none"
          style={{ fontSize: '0.9em', filter: 'drop-shadow(0 0 3px rgba(251,146,60,0.8))', transform: 'rotate(180deg)' }}
        >🔥</div>
      </div>
    );
  }

  if (!card) return (
    <div className={`${sizeClasses[size]} rounded-md border-2 border-dashed border-yellow-600/30 bg-transparent`} />
  );

  const isRed = SUIT_COLORS[card.suit] === 'red';
  const suitSymbol = SUITS[card.suit];

  return (
    <div className={`${sizeClasses[size]} rounded-md border bg-white flex flex-col items-stretch justify-between p-0.5 shadow-lg select-none overflow-hidden relative
      ${isRed ? 'text-red-600' : 'text-gray-900'}
      ${glow ? 'border-yellow-400 shadow-yellow-400/80 shadow-lg ring-2 ring-yellow-400' : 'border-gray-200'}
    `}>
      <div className="flex flex-col leading-none text-xs">
        <span className="font-bold">{card.rank}</span>
        <span>{suitSymbol}</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <span className="text-base font-bold">{suitSymbol}</span>
      </div>
      <div className="flex flex-col leading-none text-xs items-end self-end">
        <span className="font-bold">{card.rank}</span>
        <span>{suitSymbol}</span>
      </div>

      {/* Centered diagonal logo — suit replaces fire */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.18 }}>
        <div className="flex flex-col items-center gap-0 leading-none" style={{ transform: 'rotate(-45deg)' }}>
          {/* RAPID {suit} FIRE */}
          <div className="flex items-baseline gap-0.5 leading-none">
            <span className="font-black italic leading-none"
              style={{
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.55rem',
                transform: 'skewX(-12deg)',
                color: isRed ? '#dc2626' : '#111827',
                letterSpacing: '-0.04em',
              }}
            >RAPID</span>
            <span style={{ fontSize: '0.55rem', lineHeight: 1, color: isRed ? '#dc2626' : '#111827' }}>{suitSymbol}</span>
            <span className="font-black italic leading-none"
              style={{
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.55rem',
                transform: 'skewX(-12deg)',
                color: isRed ? '#dc2626' : '#111827',
                letterSpacing: '-0.02em',
              }}
            >FIRE</span>
          </div>
          {/* TEXAS 10 */}
          <span className="font-black italic leading-none"
            style={{
              fontFamily: 'Oswald, sans-serif',
              fontSize: '0.5rem',
              transform: 'skewX(-12deg)',
              color: '#16a34a',
              marginTop: '1px',
              letterSpacing: '0.02em',
            }}
          >TEXAS 10</span>
        </div>
      </div>
    </div>
  );
}