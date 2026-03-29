import { SUITS, SUIT_COLORS } from '@/lib/gameEngine';

export default function PlayingCard({ card, size = 'md', faceDown = false, glow = false, showWatermark = false }) {
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
  const isCourtCard = ['J', 'Q', 'K'].includes(card.rank);

  return (
    <div className={`${sizeClasses[size]} rounded-sm border-2 bg-white flex flex-col items-stretch justify-between p-0.5 shadow-lg select-none overflow-hidden relative
      ${isRed ? 'text-red-600 border-red-400' : 'text-black border-gray-400'}
      ${glow ? 'border-yellow-400 shadow-yellow-400/80 shadow-lg ring-2 ring-yellow-400' : ''}
    `}>
      {/* Top-left index */}
      <div className="flex flex-col leading-none text-left">
        <span className="font-black" style={{ fontSize: '0.6em', lineHeight: '0.9' }}>{card.rank}</span>
        <span className="font-bold" style={{ fontSize: '0.45em', lineHeight: '0.8' }}>{suitSymbol}</span>
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center">
        {isCourtCard ? (
          // Court cards: show suit symbol in ornate style
          <div className="text-center">
            <div className="font-bold opacity-60" style={{ fontSize: '2.2em', lineHeight: '0.8' }}>{suitSymbol}</div>
            <div className="font-black text-center" style={{ fontSize: '0.55em' }}>
              {card.rank}
            </div>
          </div>
        ) : card.rank === 'A' ? (
          // Ace: single large pip
          <span className="font-bold" style={{ fontSize: '2.5em', lineHeight: '0.8' }}>{suitSymbol}</span>
        ) : (
          // Number cards: pips arranged in standard pattern
          <PipPattern rank={card.rank} suit={suitSymbol} />
        )}
      </div>

      {/* Bottom-right index (upside down) */}
      <div className="flex flex-col leading-none text-right items-end" style={{ transform: 'rotate(180deg)' }}>
        <span className="font-black" style={{ fontSize: '0.6em', lineHeight: '0.9' }}>{card.rank}</span>
        <span className="font-bold" style={{ fontSize: '0.45em', lineHeight: '0.8' }}>{suitSymbol}</span>
      </div>

      {showWatermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
          <span className="font-black text-center" style={{ fontSize: '0.8em' }}>RAPID FIRE</span>
        </div>
      )}
    </div>
  );
}

function PipPattern({ rank, suit }) {
  const pips = [];
  const n = parseInt(rank);

  // Standard pip layouts for numbered cards
  if (n === 2) {
    return (
      <div className="flex flex-col items-center justify-between h-full">
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
      </div>
    );
  }
  if (n === 3) {
    return (
      <div className="flex flex-col items-center justify-between h-full">
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
      </div>
    );
  }
  if (n === 4) {
    return (
      <div className="grid grid-cols-2 gap-1">
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
      </div>
    );
  }
  if (n === 5) {
    return (
      <div className="grid grid-cols-2 gap-0.5 w-full h-full items-center justify-center">
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <div className="col-span-2 text-center">
          <span className="font-bold text-xs">{suit}</span>
        </div>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
      </div>
    );
  }
  if (n === 6) {
    return (
      <div className="grid grid-cols-2 gap-1">
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
      </div>
    );
  }
  if (n === 7) {
    return (
      <div className="grid grid-cols-2 gap-0.5 w-full h-full items-center">
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs col-span-2 text-center">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
      </div>
    );
  }
  if (n === 8) {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
      </div>
    );
  }
  if (n === 9) {
    return (
      <div className="grid grid-cols-3 gap-0.5">
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
        <span className="font-bold text-xs">{suit}</span>
      </div>
    );
  }
  if (n === 10) {
    return (
      <div className="grid grid-cols-2 gap-0.5 text-xs">
        <span className="font-bold">{suit}</span>
        <span className="font-bold">{suit}</span>
        <span className="font-bold">{suit}</span>
        <span className="font-bold">{suit}</span>
        <span className="font-bold">{suit}</span>
        <span className="font-bold">{suit}</span>
        <span className="font-bold">{suit}</span>
        <span className="font-bold">{suit}</span>
        <span className="font-bold">{suit}</span>
        <span className="font-bold">{suit}</span>
      </div>
    );
  }

  return null;
}