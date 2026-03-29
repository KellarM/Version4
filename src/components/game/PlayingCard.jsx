import { SUITS, SUIT_COLORS } from '@/lib/gameEngine';

export default function PlayingCard({ card, size = 'md', faceDown = false, glow = false, showWatermark = false }) {
  const sizeClasses = {
    xs: 'w-8 h-11 text-xs',
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
  const isCourtCard = ['J', 'Q', 'K'].includes(card.rank);
  const isAce = card.rank === 'A';

  return (
    <div className={`${sizeClasses[size]} rounded-sm border-2 bg-white flex flex-col justify-between p-1.5 shadow-lg select-none overflow-hidden relative
      ${isRed ? 'text-red-600 border-red-300' : 'text-black border-gray-400'}
      ${glow ? 'border-yellow-400 shadow-yellow-400/80 shadow-lg ring-2 ring-yellow-400' : ''}
    `}>
      {/* Top-left corner index */}
      <div className="flex flex-col items-start leading-none">
        <span className="font-black" style={{ fontSize: '0.7em', lineHeight: '0.8' }}>{card.rank}</span>
        <span style={{ fontSize: '0.5em', lineHeight: '0.8' }}>{suitSymbol}</span>
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center">
        {isCourtCard ? (
          <div className="text-center text-lg font-bold opacity-60">{suitSymbol}</div>
        ) : isAce ? (
          <div className="text-6xl">♠</div>
        ) : (
          <CardPips rank={card.rank} suit={suitSymbol} isRed={isRed} />
        )}
      </div>

      {/* Bottom-right corner index (upside down) */}
      <div className="flex flex-col items-end leading-none" style={{ transform: 'rotate(180deg)' }}>
        <span className="font-black" style={{ fontSize: '0.7em', lineHeight: '0.8' }}>{card.rank}</span>
        <span style={{ fontSize: '0.5em', lineHeight: '0.8' }}>{suitSymbol}</span>
      </div>
    </div>
  );
}

function CardPips({ rank, suit, isRed }) {
  const n = parseInt(rank);
  const suitClass = `text-${isRed ? 'red' : 'black'}-600`;

  const PipView = ({ layout }) => (
    <div className="w-full h-full flex items-center justify-center">
      {layout}
    </div>
  );

  switch (n) {
    case 2:
      return <PipView layout={
        <div className="flex flex-col gap-8 items-center">
          <span style={{ fontSize: '1.8em' }}>{suit}</span>
          <span style={{ fontSize: '1.8em' }}>{suit}</span>
        </div>
      } />;

    case 3:
      return <PipView layout={
        <div className="flex flex-col gap-6 items-center">
          <span style={{ fontSize: '1.8em' }}>{suit}</span>
          <span style={{ fontSize: '1.8em' }}>{suit}</span>
          <span style={{ fontSize: '1.8em' }}>{suit}</span>
        </div>
      } />;

    case 4:
      return <PipView layout={
        <div className="grid grid-cols-2 gap-4">
          <span style={{ fontSize: '1.6em' }}>{suit}</span>
          <span style={{ fontSize: '1.6em' }}>{suit}</span>
          <span style={{ fontSize: '1.6em' }}>{suit}</span>
          <span style={{ fontSize: '1.6em' }}>{suit}</span>
        </div>
      } />;

    case 5:
      return <PipView layout={
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-4">
            <span style={{ fontSize: '1.4em' }}>{suit}</span>
            <span style={{ fontSize: '1.4em' }}>{suit}</span>
          </div>
          <span style={{ fontSize: '1.4em' }}>{suit}</span>
          <div className="flex gap-4">
            <span style={{ fontSize: '1.4em' }}>{suit}</span>
            <span style={{ fontSize: '1.4em' }}>{suit}</span>
          </div>
        </div>
      } />;

    case 6:
      return <PipView layout={
        <div className="flex flex-col gap-3">
          <div className="flex gap-4">
            <span style={{ fontSize: '1.4em' }}>{suit}</span>
            <span style={{ fontSize: '1.4em' }}>{suit}</span>
          </div>
          <div className="flex gap-4">
            <span style={{ fontSize: '1.4em' }}>{suit}</span>
            <span style={{ fontSize: '1.4em' }}>{suit}</span>
          </div>
          <div className="flex gap-4">
            <span style={{ fontSize: '1.4em' }}>{suit}</span>
            <span style={{ fontSize: '1.4em' }}>{suit}</span>
          </div>
        </div>
      } />;

    case 7:
      return <PipView layout={
        <div className="flex flex-col gap-2 items-center">
          <div className="flex gap-3">
            <span style={{ fontSize: '1.2em' }}>{suit}</span>
            <span style={{ fontSize: '1.2em' }}>{suit}</span>
          </div>
          <span style={{ fontSize: '1.2em' }}>{suit}</span>
          <div className="flex gap-3">
            <span style={{ fontSize: '1.2em' }}>{suit}</span>
            <span style={{ fontSize: '1.2em' }}>{suit}</span>
          </div>
          <div className="flex gap-3">
            <span style={{ fontSize: '1.2em' }}>{suit}</span>
            <span style={{ fontSize: '1.2em' }}>{suit}</span>
          </div>
        </div>
      } />;

    case 8:
      return <PipView layout={
        <div className="flex flex-col gap-2 items-center">
          <div className="flex gap-3">
            <span style={{ fontSize: '1.2em' }}>{suit}</span>
            <span style={{ fontSize: '1.2em' }}>{suit}</span>
          </div>
          <span style={{ fontSize: '1.2em' }}>{suit}</span>
          <div className="flex gap-3">
            <span style={{ fontSize: '1.2em' }}>{suit}</span>
            <span style={{ fontSize: '1.2em' }}>{suit}</span>
          </div>
          <span style={{ fontSize: '1.2em' }}>{suit}</span>
          <div className="flex gap-3">
            <span style={{ fontSize: '1.2em' }}>{suit}</span>
            <span style={{ fontSize: '1.2em' }}>{suit}</span>
          </div>
        </div>
      } />;

    case 9:
      return <PipView layout={
        <div className="grid grid-cols-3 gap-1.5">
          <span style={{ fontSize: '1em' }}>{suit}</span>
          <span style={{ fontSize: '1em' }}>{suit}</span>
          <span style={{ fontSize: '1em' }}>{suit}</span>
          <span style={{ fontSize: '1em' }}>{suit}</span>
          <span style={{ fontSize: '1em' }}>{suit}</span>
          <span style={{ fontSize: '1em' }}>{suit}</span>
          <span style={{ fontSize: '1em' }}>{suit}</span>
          <span style={{ fontSize: '1em' }}>{suit}</span>
          <span style={{ fontSize: '1em' }}>{suit}</span>
        </div>
      } />;

    case 10:
      return <PipView layout={
        <div className="flex flex-col gap-1.5 items-center">
          <div className="flex gap-2">
            <span style={{ fontSize: '0.9em' }}>{suit}</span>
            <span style={{ fontSize: '0.9em' }}>{suit}</span>
          </div>
          <div className="flex gap-2">
            <span style={{ fontSize: '0.9em' }}>{suit}</span>
            <span style={{ fontSize: '0.9em' }}>{suit}</span>
          </div>
          <div className="flex gap-2">
            <span style={{ fontSize: '0.9em' }}>{suit}</span>
            <span style={{ fontSize: '0.9em' }}>{suit}</span>
          </div>
          <div className="flex gap-2">
            <span style={{ fontSize: '0.9em' }}>{suit}</span>
            <span style={{ fontSize: '0.9em' }}>{suit}</span>
          </div>
          <div className="flex gap-2">
            <span style={{ fontSize: '0.9em' }}>{suit}</span>
            <span style={{ fontSize: '0.9em' }}>{suit}</span>
          </div>
        </div>
      } />;

    default:
      return null;
  }
}