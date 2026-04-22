import { SUITS, SUIT_COLORS } from '@/lib/gameEngine';

export default function PlayingCard({ card, size = 'md', faceDown = false, glow = false }) {
  const sizeClasses = {
    xs: 'w-8 h-11',
    sm: 'w-[3.9rem] h-[5.5rem]',
    md: 'w-14 h-20',
    lg: 'w-16 h-24',
    xl: 'w-20 h-28'
  };

  if (faceDown) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-md border-2 border-yellow-500/80 shadow-lg shadow-yellow-900/60 overflow-hidden relative`}
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2040 30%, #1a0a2e 60%, #0a1628 100%)' }}>
        
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
      </div>);

  }

  if (!card) return <div className={`${sizeClasses[size]} rounded-md border-2 border-dashed border-yellow-600/30 bg-transparent`} />;

  const isRed = SUIT_COLORS[card.suit] === 'red';
  const suitSymbol = SUITS[card.suit];
  const textColor = isRed ? 'text-red-600' : 'text-black';
  const borderColor = isRed ? 'border-red-500/60' : 'border-gray-500/60';

  return (
    <div className="bg-white rounded-lg w-[3.9rem] h-[5.5rem] border-2 flex flex-col shadow-lg select-none overflow-hidden relative border-red-500/60">
      
      
      {/* Top-left: rank + suit below it */}
      <div className={`flex flex-col items-start leading-none p-1 ${textColor}`} style={{ fontWeight: 'bold' }}>
        <div style={{ fontSize: '1.1em' }}>{card.rank}</div>
        <div style={{ fontSize: '0.55em' }}>{suitSymbol}</div>
      </div>

      {/* Center: Large suit symbol (5x) - vertically centered with equal spacing */}
      <div className="px-1 flex-1 flex items-center justify-center -my-1">
        <div style={{ fontSize: '2.5em', color: isRed ? '#dc2626' : '#000', opacity: 0.7, lineHeight: 1 }} className="mx-1">
          {suitSymbol}
        </div>
      </div>

      {/* Bottom-right: rank + suit below it (right-side up) */}
      <div className={`flex flex-col items-end leading-none p-1 pb-0.5 ${textColor}`} style={{ fontWeight: 'bold' }}>
        <div style={{ fontSize: '1.1em' }}>{card.rank}</div>
        <div style={{ fontSize: '0.55em' }}>{suitSymbol}</div>
      </div>
    </div>);

}