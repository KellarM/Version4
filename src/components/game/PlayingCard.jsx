import { SUITS, SUIT_COLORS } from '@/lib/gameEngine';

export default function PlayingCard({ card, size = 'md', faceDown = false, glow = false }) {
  const sizeClasses = {
    xs: 'w-8 h-11',
    sm: 'w-[3.9rem] h-[5.5rem]',
    md: 'w-14 h-20',
    lg: 'w-16 h-24',
    xl: 'w-20 h-28',
  };

  if (faceDown) {
    return (
      <div className={`${sizeClasses[size]} rounded-md border-2 border-yellow-500/80 shadow-lg shadow-yellow-900/60 overflow-hidden relative`}
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2040 30%, #1a0a2e 60%, #0a1628 100%)' }}
      >
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 6px)' }}
        />
        <div className="absolute inset-[3px] rounded-sm border border-yellow-500/40 pointer-events-none z-10" />
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-0 leading-none" style={{ transform: 'rotate(-45deg)' }}>
            <div className="flex items-baseline gap-0.5 leading-none">
              <span className="font-black italic leading-none" style={{ fontFamily: 'Oswald, sans-serif', fontSize: '0.5em', transform: 'skewX(-12deg)', background: 'linear-gradient(90deg, #e2e8f0 0%, #ffffff 60%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.05em', filter: 'drop-shadow(1px 0 2px rgba(148,163,184,0.6))' }}>RAPID</span>
              <span style={{ fontSize: '0.5em', lineHeight: 1 }}>🔥</span>
              <span className="font-black italic leading-none" style={{ fontFamily: 'Oswald, sans-serif', fontSize: '0.5em', transform: 'skewX(-12deg)', background: 'linear-gradient(180deg, #fef08a 0%, #f97316 60%, #dc2626 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 3px rgba(251,146,60,0.8))' }}>FIRE</span>
            </div>
            <span className="font-black italic leading-none text-green-400" style={{ fontFamily: 'Oswald, sans-serif', fontSize: '0.45em', transform: 'skewX(-12deg)', marginTop: '2px', letterSpacing: '0.02em', textShadow: '0 0 4px rgba(74,222,128,0.6)' }}>TEXAS 10</span>
          </div>
        </div>
        <div className="absolute top-1 left-1 z-20 leading-none" style={{ fontSize: '0.9em', filter: 'drop-shadow(0 0 3px rgba(251,146,60,0.8))' }}>🔥</div>
        <div className="absolute bottom-1 right-1 z-20 leading-none" style={{ fontSize: '0.9em', filter: 'drop-shadow(0 0 3px rgba(251,146,60,0.8))', transform: 'rotate(180deg)' }}>🔥</div>
      </div>
    );
  }

  if (!card) return (
    <div className={`${sizeClasses[size]} rounded-md border-2 border-dashed border-yellow-600/30 bg-transparent`} />
  );

  const isRed = SUIT_COLORS[card.suit] === 'red';
  const suitSymbol = SUITS[card.suit];
  const textColor = isRed ? 'text-red-600' : 'text-black';
  const isCourtCard = ['J', 'Q', 'K'].includes(card.rank);
  const isAce = card.rank === 'A';

  return (
    <div className={`${sizeClasses[size]} rounded-sm border-2 bg-white flex flex-col justify-between p-1 shadow-lg select-none overflow-hidden relative
      ${isRed ? 'border-red-300' : 'border-gray-400'}
      ${glow ? 'border-yellow-400 shadow-yellow-400/80 shadow-lg ring-2 ring-yellow-400' : ''}
    `}>
      {/* Top-left corner index */}
      <div className={`flex flex-col items-start leading-none ${textColor}`}>
        <div className="font-black" style={{ fontSize: '0.65em', lineHeight: '0.75' }}>{card.rank}</div>
        <SuitSymbol suit={card.suit} size="sm" />
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center">
        {isCourtCard ? (
          <CourtCard rank={card.rank} suit={card.suit} isRed={isRed} />
        ) : isAce ? (
          <AceCard suit={card.suit} isRed={isRed} />
        ) : (
          <NumberCard rank={parseInt(card.rank)} suit={card.suit} isRed={isRed} />
        )}
      </div>

      {/* Bottom-right corner index (upside down) */}
      <div className={`flex flex-col items-end leading-none ${textColor}`} style={{ transform: 'rotate(180deg)' }}>
        <div className="font-black" style={{ fontSize: '0.65em', lineHeight: '0.75' }}>{card.rank}</div>
        <SuitSymbol suit={card.suit} size="sm" />
      </div>
    </div>
  );
}

// SVG Suit Symbol Component
function SuitSymbol({ suit, size = 'md' }) {
  const sizeMap = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' };
  const isRed = suit === 1 || suit === 3; // Hearts or Diamonds

  let svg;
  switch (suit) {
    case 0: // Spades
      svg = <path d="M6 2L2 6L4 6L6 10L8 6L10 6L6 2Z" fill="currentColor" />;
      break;
    case 1: // Hearts
      svg = <path d="M5 3C5 3 3 5 3 7C3 9 4 10 6 10C8 10 9 9 9 7C9 5 7 3 6 3C5 3 5 3 5 3Z" fill="currentColor" />;
      break;
    case 2: // Diamonds
      svg = <path d="M6 1L10 6L6 11L2 6L6 1Z" fill="currentColor" />;
      break;
    case 3: // Clubs
      svg = <path d="M3 5C3 4 4 3 5 3C6 3 7 4 7 5C7 6 6.5 6.5 6 6.5L8 8L6 8L6 10L6 10L4 10L4 8L2 8L4 6.5C3.5 6.5 3 6 3 5Z" fill="currentColor" />;
      break;
    default:
      svg = null;
  }

  return (
    <svg viewBox="0 0 12 12" className={`${sizeMap[size]} ${isRed ? 'text-red-600' : 'text-black'}`}>
      {svg}
    </svg>
  );
}

// Ace Card
function AceCard({ suit, isRed }) {
  const color = isRed ? '#dc2626' : '#000';
  return (
    <svg viewBox="0 0 60 80" className="w-10 h-14" style={{ color }}>
      {/* Large decorative pip */}
      <g fill={color} opacity="0.7">
        {suit === 0 && ( // Spade
          <path d="M30 10L20 30L25 30L30 50L35 30L40 30L30 10Z" />
        )}
        {suit === 1 && ( // Heart
          <path d="M30 15C30 15 20 25 20 35C20 42 24 48 30 48C36 48 40 42 40 35C40 25 30 15 30 15Z" />
        )}
        {suit === 2 && ( // Diamond
          <path d="M30 5L50 30L30 55L10 30L30 5Z" />
        )}
        {suit === 3 && ( // Club
          <path d="M15 30C15 25 18 20 23 20C28 20 31 25 31 30C31 33 29 36 26 38L34 45L26 45L26 52L34 52L26 52L18 52L18 45L10 45L18 38C15 36 13 33 13 30Z" />
        )}
      </g>
    </svg>
  );
}

// Number Card (2-10)
function NumberCard({ rank, suit, isRed }) {
  const color = isRed ? '#dc2626' : '#000';

  const pipSizes = {
    2: '1.2em', 3: '1.2em', 4: '1em', 5: '0.95em',
    6: '0.85em', 7: '0.75em', 8: '0.7em', 9: '0.6em', 10: '0.5em'
  };

  return (
    <svg viewBox="0 0 40 56" className="w-8 h-12" style={{ color }}>
      <g fill={color} opacity="0.75" fontSize={pipSizes[rank]}>
        {rank === 2 && (
          <>
            <text x="4" y="8" textAnchor="start">♠</text>
            <text x="4" y="50" textAnchor="start">♠</text>
          </>
        )}
        {rank === 3 && (
          <>
            <text x="4" y="8" textAnchor="start">♠</text>
            <text x="20" y="28" textAnchor="middle">♠</text>
            <text x="4" y="50" textAnchor="start">♠</text>
          </>
        )}
        {rank === 4 && (
          <>
            <text x="4" y="8">♠</text>
            <text x="32" y="8">♠</text>
            <text x="4" y="50">♠</text>
            <text x="32" y="50">♠</text>
          </>
        )}
        {rank === 5 && (
          <>
            <text x="4" y="8">♠</text>
            <text x="32" y="8">♠</text>
            <text x="20" y="28" textAnchor="middle">♠</text>
            <text x="4" y="50">♠</text>
            <text x="32" y="50">♠</text>
          </>
        )}
        {rank === 6 && (
          <>
            <text x="4" y="8">♠</text>
            <text x="32" y="8">♠</text>
            <text x="4" y="28">♠</text>
            <text x="32" y="28">♠</text>
            <text x="4" y="50">♠</text>
            <text x="32" y="50">♠</text>
          </>
        )}
        {rank === 7 && (
          <>
            <text x="4" y="8">♠</text>
            <text x="32" y="8">♠</text>
            <text x="20" y="18" textAnchor="middle">♠</text>
            <text x="4" y="32">♠</text>
            <text x="32" y="32">♠</text>
            <text x="4" y="50">♠</text>
            <text x="32" y="50">♠</text>
          </>
        )}
        {rank === 8 && (
          <>
            <text x="4" y="8">♠</text>
            <text x="32" y="8">♠</text>
            <text x="4" y="20">♠</text>
            <text x="32" y="20">♠</text>
            <text x="20" y="28" textAnchor="middle">♠</text>
            <text x="4" y="40">♠</text>
            <text x="32" y="40">♠</text>
            <text x="4" y="50">♠</text>
            <text x="32" y="50">♠</text>
          </>
        )}
        {rank === 9 && (
          <>
            <text x="8" y="6">♠</text>
            <text x="20" y="6" textAnchor="middle">♠</text>
            <text x="32" y="6">♠</text>
            <text x="8" y="18">♠</text>
            <text x="32" y="18">♠</text>
            <text x="20" y="28" textAnchor="middle">♠</text>
            <text x="8" y="40">♠</text>
            <text x="32" y="40">♠</text>
            <text x="8" y="52">♠</text>
            <text x="20" y="52" textAnchor="middle">♠</text>
            <text x="32" y="52">♠</text>
          </>
        )}
        {rank === 10 && (
          <>
            <text x="4" y="6">♠</text>
            <text x="28" y="6">♠</text>
            <text x="4" y="16">♠</text>
            <text x="28" y="16">♠</text>
            <text x="4" y="26">♠</text>
            <text x="28" y="26">♠</text>
            <text x="4" y="36">♠</text>
            <text x="28" y="36">♠</text>
            <text x="4" y="48">♠</text>
            <text x="28" y="48">♠</text>
          </>
        )}
      </g>
    </svg>
  );
}

// Court Card
function CourtCard({ rank, suit, isRed }) {
  const color = isRed ? '#dc2626' : '#000';
  const label = rank === 'J' ? 'J' : rank === 'Q' ? 'Q' : 'K';

  return (
    <svg viewBox="0 0 40 56" className="w-8 h-12" style={{ color }}>
      {/* Court card representation */}
      <rect x="2" y="2" width="36" height="52" fill="none" stroke={color} strokeWidth="0.5" opacity="0.3" />
      <text x="20" y="28" textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="bold" fill={color} opacity="0.6">
        {label}
      </text>
    </svg>
  );
}