import { SUITS, SUIT_COLORS } from '@/lib/gameEngine';

export default function PlayingCard({ card, size = 'md', faceDown = false, glow = false }) {
  const sizeClasses = {
    xs: 'w-8 h-11 text-xs',
    sm: 'w-10 h-14 text-xs',
    md: 'w-14 h-20 text-sm',
    lg: 'w-16 h-24 text-base',
    xl: 'w-20 h-28 text-lg',
  };

  if (faceDown) {
    return (
      <div className={`${sizeClasses[size]} rounded-md border-2 border-yellow-600 bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center shadow-lg`}>
        <div className="w-full h-full rounded-sm p-0.5">
          <div className="w-full h-full rounded-sm border border-yellow-700 bg-gradient-to-br from-blue-800 to-blue-900 flex items-center justify-center">
            <span className="text-yellow-600 text-lg font-bold opacity-60">🂠</span>
          </div>
        </div>
      </div>
    );
  }

  if (!card) return (
    <div className={`${sizeClasses[size]} rounded-md border-2 border-dashed border-yellow-600/30 bg-transparent`} />
  );

  const isRed = SUIT_COLORS[card.suit] === 'red';
  const suitSymbol = SUITS[card.suit];

  return (
    <div className={`${sizeClasses[size]} rounded-md border bg-white flex flex-col justify-between p-0.5 shadow-lg select-none
      ${isRed ? 'text-red-600' : 'text-gray-900'}
      ${glow ? 'border-yellow-400 shadow-yellow-400/80 shadow-lg ring-2 ring-yellow-400' : 'border-gray-200'}
    `}>
      <div className="flex flex-col leading-none">
        <span className="font-bold leading-none">{card.rank}</span>
        <span className="leading-none">{suitSymbol}</span>
      </div>
      <div className="text-center text-lg font-bold leading-none">{suitSymbol}</div>
      <div className="flex flex-col leading-none rotate-180 self-end">
        <span className="font-bold leading-none">{card.rank}</span>
        <span className="leading-none">{suitSymbol}</span>
      </div>
    </div>
  );
}