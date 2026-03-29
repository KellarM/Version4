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
      <div
        className={`${sizeClasses[size]} rounded-md border-2 border-yellow-500/80 shadow-lg shadow-yellow-900/60 overflow-hidden relative`}
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2040 30%, #1a0a2e 60%, #0a1628 100%)' }}
      >
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 6px)' }} />
        <div className="absolute inset-[3px] rounded-sm border border-yellow-500/40 pointer-events-none z-10" />
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-0 leading-none" style={{ transform: 'rotate(-45deg)' }}>
            <div className="flex items-baseline gap-0.5 leading-none">
              <span className="font-black italic leading-none" style={{ fontFamily: 'Oswald, sans-serif', fontSize: '0.5em', transform: 'skewX(-12deg)', background: 'linear-gradient(90deg, #e2e8f0 0%, #ffffff 60%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.05em' }}>RAPID</span>
              <span style={{ fontSize: '0.5em', lineHeight: 1 }}>🔥</span>
              <span className="font-black italic leading-none" style={{ fontFamily: 'Oswald, sans-serif', fontSize: '0.5em', transform: 'skewX(-12deg)', background: 'linear-gradient(180deg, #fef08a 0%, #f97316 60%, #dc2626 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FIRE</span>
            </div>
            <span className="font-black italic leading-none text-green-400" style={{ fontFamily: 'Oswald, sans-serif', fontSize: '0.45em', transform: 'skewX(-12deg)', marginTop: '2px', letterSpacing: '0.02em' }}>TEXAS 10</span>
          </div>
        </div>
        <div className="absolute top-1 left-1 z-20 leading-none" style={{ fontSize: '0.9em' }}>🔥</div>
        <div className="absolute bottom-1 right-1 z-20 leading-none" style={{ fontSize: '0.9em', transform: 'rotate(180deg)' }}>🔥</div>
      </div>
    );
  }

  if (!card) return <div className={`${sizeClasses[size]} rounded-md border-2 border-dashed border-yellow-600/30 bg-transparent`} />;

  const isRed = SUIT_COLORS[card.suit] === 'red';
  const suitSymbol = SUITS[card.suit];
  const textColor = isRed ? 'text-red-600' : 'text-black';
  const borderColor = isRed ? 'border-red-500/60' : 'border-gray-500/60';

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg border-2 bg-white flex flex-col justify-between p-1.5 shadow-lg select-none overflow-hidden relative ${borderColor} ${glow ? 'ring-2 ring-yellow-400 shadow-yellow-400/80' : ''}`}
    >
      {/* Top-left corner: rank & suit */}
      <div className={`flex flex-col items-start leading-none font-black ${textColor}`} style={{ fontSize: '0.65em' }}>
        <div>{card.rank}</div>
        <div style={{ fontSize: '0.7em', marginTop: '0.1em' }}>{suitSymbol}</div>
      </div>

      {/* Center: main pip display */}
      <div className="flex-1 flex items-center justify-center">
        {card.rank === 'A' ? (
          <Ace suit={card.suit} isRed={isRed} />
        ) : ['J', 'Q', 'K'].includes(card.rank) ? (
          <CourtCard rank={card.rank} isRed={isRed} />
        ) : (
          <NumberCard rank={parseInt(card.rank)} suit={suitSymbol} isRed={isRed} />
        )}
      </div>

      {/* Bottom-right corner: rank & suit (upside down) */}
      <div className={`flex flex-col items-end leading-none font-black ${textColor}`} style={{ fontSize: '0.65em', transform: 'rotate(180deg)' }}>
        <div>{card.rank}</div>
        <div style={{ fontSize: '0.7em', marginTop: '0.1em' }}>{suitSymbol}</div>
      </div>
    </div>
  );
}

// Ace: Large ornate pip centered
function Ace({ suit, isRed }) {
  const color = isRed ? '#dc2626' : '#000';
  return (
    <div style={{ fontSize: '2.8em', color, opacity: 0.8, lineHeight: 1 }}>
      {suit === 0 ? '♠' : suit === 1 ? '♥' : suit === 2 ? '♦' : '♣'}
    </div>
  );
}

// Court: Large suit symbol with rank label
function CourtCard({ rank, isRed }) {
  const color = isRed ? '#dc2626' : '#000';
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div style={{ fontSize: '1.8em', color, opacity: 0.6, fontWeight: 'bold', lineHeight: 1 }}>
        {rank === 'J' ? '♠' : rank === 'Q' ? '♥' : '♦'}
      </div>
      <div style={{ fontSize: '0.7em', color, fontWeight: 'black', opacity: 0.7 }}>{rank}</div>
    </div>
  );
}

// Number cards: pips in standard layout per rank
function NumberCard({ rank, suit, isRed }) {
  const color = isRed ? '#dc2626' : '#000';
  const pipSize = { 2: '1.1em', 3: '1em', 4: '0.9em', 5: '0.8em', 6: '0.75em', 7: '0.7em', 8: '0.65em', 9: '0.55em', 10: '0.48em' }[rank];

  const renderPips = () => {
    const Pip = () => <div style={{ fontSize: pipSize, color, opacity: 0.8, fontWeight: 'bold', lineHeight: 1 }}>{suit}</div>;

    switch (rank) {
      case 2:
        return (
          <div className="flex flex-col items-center justify-between h-full">
            <Pip />
            <Pip />
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col items-center justify-between h-full">
            <Pip />
            <Pip />
            <Pip />
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-1">
            <Pip />
            <Pip />
            <Pip />
            <Pip />
          </div>
        );
      case 5:
        return (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex gap-1.5">
              <Pip />
              <Pip />
            </div>
            <Pip />
            <div className="flex gap-1.5">
              <Pip />
              <Pip />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex gap-1.5 justify-center">
              <Pip />
              <Pip />
            </div>
            <div className="flex gap-1.5 justify-center">
              <Pip />
              <Pip />
            </div>
            <div className="flex gap-1.5 justify-center">
              <Pip />
              <Pip />
            </div>
          </div>
        );
      case 7:
        return (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex gap-1.5">
              <Pip />
              <Pip />
            </div>
            <Pip />
            <div className="flex gap-1.5">
              <Pip />
              <Pip />
            </div>
            <div className="flex gap-1.5">
              <Pip />
              <Pip />
            </div>
          </div>
        );
      case 8:
        return (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex gap-1.5">
              <Pip />
              <Pip />
            </div>
            <div className="flex gap-1.5">
              <Pip />
              <Pip />
            </div>
            <Pip />
            <div className="flex gap-1.5">
              <Pip />
              <Pip />
            </div>
            <div className="flex gap-1.5">
              <Pip />
              <Pip />
            </div>
          </div>
        );
      case 9:
        return (
          <div className="grid grid-cols-3 gap-0.5 w-full place-items-center">
            <Pip />
            <Pip />
            <Pip />
            <Pip />
            <Pip />
            <Pip />
            <Pip />
            <Pip />
            <Pip />
          </div>
        );
      case 10:
        return (
          <div className="flex flex-col items-center gap-0.5 text-center">
            <div className="flex gap-1">
              <Pip />
              <Pip />
            </div>
            <div className="flex gap-1">
              <Pip />
              <Pip />
            </div>
            <div className="flex gap-1">
              <Pip />
              <Pip />
            </div>
            <div className="flex gap-1">
              <Pip />
              <Pip />
            </div>
            <div className="flex gap-1">
              <Pip />
              <Pip />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return <div>{renderPips()}</div>;
}