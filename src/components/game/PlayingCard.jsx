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

        {/* Center emblem */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-0" style={{ transform: 'rotate(-5deg)' }}>
            <span style={{ fontSize: '1.1em', filter: 'drop-shadow(0 0 4px rgba(251,146,60,0.8))' }}>🔥</span>
            <div className="font-black italic leading-none"
              style={{
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.55em',
                transform: 'skewX(-12deg)',
                background: 'linear-gradient(90deg, #e2e8f0 0%, #ffffff 40%, #94a3b8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
                filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.4))',
              }}
            >RF</div>
          </div>
        </div>

        {/* Diagonal logo — bottom-left to upper-right */}
        <div className="absolute bottom-1 left-1 z-20"
          style={{ transform: 'rotate(-45deg)', transformOrigin: 'bottom left' }}
        >
          <div className="flex items-baseline gap-0.5 leading-none">
            <span className="font-black italic leading-none"
              style={{
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.45em',
                transform: 'skewX(-12deg)',
                background: 'linear-gradient(90deg, #e2e8f0 0%, #ffffff 60%, #94a3b8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.05em',
                filter: 'drop-shadow(1px 0 2px rgba(148,163,184,0.6))',
              }}
            >RAPID</span>
            <span className="font-black italic leading-none"
              style={{
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.45em',
                transform: 'skewX(-12deg)',
                background: 'linear-gradient(180deg, #fef08a 0%, #f97316 60%, #dc2626 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 3px rgba(251,146,60,0.8))',
              }}
            >🔥FIRE</span>
            <span className="font-black italic leading-none"
              style={{
                fontFamily: 'Oswald, sans-serif',
                fontSize: '0.35em',
                transform: 'skewX(-12deg)',
                background: 'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >T10</span>
          </div>
        </div>

        {/* Top-right corner glow accent */}
        <div className="absolute top-0 right-0 w-6 h-6 rounded-bl-full opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle at top right, rgba(251,146,60,0.8), transparent 70%)' }}
        />
        {/* Bottom-left corner glow accent */}
        <div className="absolute bottom-0 left-0 w-6 h-6 rounded-tr-full opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle at bottom left, rgba(74,222,128,0.6), transparent 70%)' }}
        />
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
      {/* Logo decals in corners */}
      <div className="absolute top-0.5 right-0.5 font-black italic leading-none" style={{ fontFamily: 'Oswald, sans-serif', fontSize: '0.55rem', transform: 'skewX(-8deg)', background: 'linear-gradient(90deg, #cbd5e1 0%, #f97316 50%, #dc2626 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', opacity: 0.85, filter: 'drop-shadow(0 0 1px rgba(249, 115, 22, 0.4))' }}>RF</div>
      <div className="absolute bottom-0.5 left-0.5 font-black italic leading-none" style={{ fontFamily: 'Oswald, sans-serif', fontSize: '0.55rem', transform: 'skewX(-8deg)', background: 'linear-gradient(90deg, #cbd5e1 0%, #f97316 50%, #dc2626 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', opacity: 0.85, filter: 'drop-shadow(0 0 1px rgba(249, 115, 22, 0.4))' }}>RF</div>
    </div>
  );
}