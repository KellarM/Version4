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