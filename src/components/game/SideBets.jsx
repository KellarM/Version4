import { motion } from 'framer-motion';
import { cardColor, isLowCard } from '@/lib/gameEngine';

const RED_BLACK_OPTIONS = [
  { key: '5R', label: '5 Red',   payout: '40:1', color: 'red' },
  { key: '4R', label: '4 Red',   payout: '4:1',  color: 'red' },
  { key: '3R', label: '3 Red',   payout: '1:1',  color: 'red' },
  { key: '3B', label: '3 Black', payout: '1:1',  color: 'black' },
  { key: '4B', label: '4 Black', payout: '4:1',  color: 'black' },
  { key: '5B', label: '5 Black', payout: '40:1', color: 'black' },
];

export default function SideBets({
  communityCards,
  redBlackBets,
  lowHighBet,
  onRedBlackBet,
  onLowHighBet,
  gamePhase,
  winningRedBlack,
  winningLowHigh,
  disabled,
}) {
  const canBetRB = (gamePhase === 'betting') && !disabled;
  const canBetLH = (gamePhase === 'lowHighBetting') && !disabled;

  const reds = communityCards.filter(c => cardColor(c) === 'red').length;
  const blacks = communityCards.filter(c => cardColor(c) === 'black').length;
  const lows = communityCards.filter(c => isLowCard(c)).length;
  const highs = communityCards.length - lows;

  // Determine which RB slots are currently "live" (partially winning in progress)
  // e.g. if 4 reds showing, 3R and 4R are both live
  const liveRedBlack = [];
  if (reds >= 3) for (let i = 3; i <= reds; i++) liveRedBlack.push(`${i}R`);
  if (blacks >= 3) for (let i = 3; i <= blacks; i++) liveRedBlack.push(`${i}B`);

  return (
    <div className="flex flex-col gap-2">
      {/* Red/Black Bets */}
      <div>
        <div className="text-yellow-400 text-xs font-bold tracking-wider uppercase mb-1 text-center">Color Board</div>
        <div className="grid grid-cols-2 gap-1">
          {RED_BLACK_OPTIONS.map(opt => {
            const bet = redBlackBets[opt.key] || 0;
            const isWinner = winningRedBlack && winningRedBlack.includes(opt.key);
            const isLive = liveRedBlack.includes(opt.key) && !isWinner && communityCards.length > 0 && communityCards.length < 5;
            const isRed = opt.color === 'red';

            let cls;
            if (isWinner) {
              cls = 'border-yellow-400 bg-yellow-900/50 text-yellow-200 shadow-yellow-400/50 shadow-lg';
            } else if (isLive) {
              cls = isRed
                ? 'border-red-400 bg-red-900/50 text-red-100 shadow-red-400/40 shadow-md'
                : 'border-gray-300 bg-gray-700/60 text-gray-100 shadow-gray-300/40 shadow-md';
            } else if (bet > 0) {
              cls = isRed ? 'border-red-500 bg-red-900/40 text-red-200' : 'border-gray-500 bg-gray-800 text-gray-200';
            } else if (canBetRB) {
              cls = isRed
                ? 'border-red-700/50 bg-red-950/40 text-red-300 hover:border-red-500 hover:bg-red-900/30 cursor-pointer'
                : 'border-gray-600/50 bg-gray-900/40 text-gray-300 hover:border-gray-400 hover:bg-gray-800/40 cursor-pointer';
            } else {
              cls = isRed ? 'border-red-900/30 bg-red-950/20 text-red-400/50' : 'border-gray-700/30 bg-gray-900/20 text-gray-500/50';
            }

            return (
              <motion.button
                key={opt.key}
                onClick={() => canBetRB && onRedBlackBet(opt.key)}
                whileTap={canBetRB ? { scale: 0.95 } : {}}
                className={`relative rounded-lg px-1 py-1.5 text-xs font-bold border-2 transition-all duration-300 ${cls} ${canBetRB ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className={`w-2 h-2 rounded-full ${isRed ? 'bg-red-500' : 'bg-gray-300'}`} />
                  <span className="text-xs">{opt.label}</span>
                  <span className="text-yellow-400/80 text-xs">{opt.payout}</span>
                </div>
                {bet > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    ${bet}
                  </span>
                )}
                {isLive && !isWinner && (
                  <div className="absolute inset-0 rounded-lg bg-white/10 animate-pulse pointer-events-none" />
                )}
                {isWinner && (
                  <div className="absolute inset-0 rounded-lg bg-yellow-400/10 animate-pulse pointer-events-none" />
                )}
              </motion.button>
            );
          })}
        </div>
        {communityCards.length > 0 && (
          <div className="mt-0.5 text-center text-xs text-green-400/70">{reds}R / {blacks}B showing</div>
        )}
      </div>

      {/* Low/High Bets */}
      <div>
        <div className={`text-yellow-400 text-xs font-bold tracking-wider uppercase mb-1 text-center ${canBetLH ? 'animate-pulse' : ''}`}>
          River — Low / High
        </div>
        <div className="grid grid-cols-2 gap-1">
          {['LOW', 'HIGH'].map(type => {
            const isLow = type === 'LOW';
            const hasBet = lowHighBet && lowHighBet.type === type;
            const isWinner = winningLowHigh === type;

            let cls;
            if (isWinner) cls = 'border-yellow-400 bg-yellow-900/50 text-yellow-300 shadow-yellow-400/50 shadow-lg';
            else if (hasBet) cls = 'border-blue-500 bg-blue-900/40 text-blue-200';
            else if (canBetLH) cls = 'border-blue-700/50 bg-blue-950/30 text-blue-300 hover:border-blue-400 cursor-pointer';
            else cls = 'border-blue-900/20 bg-blue-950/10 text-blue-400/40';

            return (
              <motion.button
                key={type}
                onClick={() => canBetLH && onLowHighBet(type)}
                whileTap={canBetLH ? { scale: 0.95 } : {}}
                className={`relative rounded-lg px-1 py-2 text-xs font-bold border-2 transition-all duration-200 ${cls} ${canBetLH ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-black text-sm">{type}</span>
                  <span className="text-yellow-400/80 text-xs">{isLow ? '2–7' : '8–A'}</span>
                  <span className="text-yellow-400/60 text-xs">1:1</span>
                </div>
                {hasBet && (
                  <span className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    ${lowHighBet.amount}
                  </span>
                )}
                {isWinner && (
                  <div className="absolute inset-0 rounded-lg bg-yellow-400/10 animate-pulse pointer-events-none" />
                )}
              </motion.button>
            );
          })}
        </div>
        {communityCards.length >= 4 && (
          <div className="mt-0.5 text-center text-xs text-green-400/70">{lows} Low / {highs} High (of 4)</div>
        )}
      </div>
    </div>
  );
}