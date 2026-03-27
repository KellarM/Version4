import { motion } from 'framer-motion';
import { cardColor, isLowCard } from '@/lib/gameEngine';

const RED_BLACK_OPTIONS = [
  { key: '3R', label: '3 Red', payout: '1.5:1', color: 'red' },
  { key: '3B', label: '3 Black', payout: '1.5:1', color: 'black' },
  { key: '4R', label: '4 Red', payout: '4:1', color: 'red' },
  { key: '4B', label: '4 Black', payout: '4:1', color: 'black' },
  { key: '5R', label: '5 Red', payout: '40:1', color: 'red' },
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

  // Current color counts for live display
  const reds = communityCards.filter(c => cardColor(c) === 'red').length;
  const blacks = communityCards.filter(c => cardColor(c) === 'black').length;
  const lows = communityCards.filter(c => isLowCard(c)).length;
  const highs = communityCards.length - lows;

  return (
    <div className="flex flex-col gap-3">
      {/* Red/Black Bets */}
      <div>
        <div className="text-yellow-400 text-xs font-bold tracking-wider uppercase mb-2 text-center">Color Board</div>
        <div className="grid grid-cols-2 gap-1.5">
          {RED_BLACK_OPTIONS.map(opt => {
            const bet = redBlackBets[opt.key] || 0;
            const isWinner = winningRedBlack && winningRedBlack.includes(opt.key);
            const isRed = opt.color === 'red';

            return (
              <motion.button
                key={opt.key}
                onClick={() => canBetRB && onRedBlackBet(opt.key)}
                whileTap={canBetRB ? { scale: 0.95 } : {}}
                className={`relative rounded-lg px-2 py-2 text-xs font-bold border-2 transition-all duration-200
                  ${isWinner ? 'border-yellow-400 bg-yellow-900/50 text-yellow-300 shadow-yellow-400/50 shadow-lg' :
                    bet > 0 ? (isRed ? 'border-red-500 bg-red-900/40 text-red-200' : 'border-gray-500 bg-gray-800 text-gray-200') :
                    canBetRB ? (isRed ? 'border-red-700/50 bg-red-950/40 text-red-300 hover:border-red-500 hover:bg-red-900/30 cursor-pointer' : 
                                        'border-gray-600/50 bg-gray-900/40 text-gray-300 hover:border-gray-400 hover:bg-gray-800/40 cursor-pointer') :
                    (isRed ? 'border-red-900/30 bg-red-950/20 text-red-400/50' : 'border-gray-700/30 bg-gray-900/20 text-gray-500/50')}
                  ${canBetRB ? 'cursor-pointer' : 'cursor-default'}
                `}
              >
                <div className="flex flex-col items-center">
                  <span className={`w-2 h-2 rounded-full mb-0.5 ${isRed ? 'bg-red-500' : 'bg-gray-300'}`} />
                  <span>{opt.label}</span>
                  <span className="text-yellow-400/80 text-xs">{opt.payout}</span>
                </div>
                {bet > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    ${bet}
                  </span>
                )}
                {isWinner && (
                  <div className="absolute inset-0 rounded-lg bg-yellow-400/10 animate-pulse pointer-events-none" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Live Color Count */}
        {communityCards.length > 0 && (
          <div className="mt-1 text-center text-xs text-green-400/70">
            {reds}R / {blacks}B showing
          </div>
        )}
      </div>

      {/* Low/High Bets */}
      <div>
        <div className={`text-yellow-400 text-xs font-bold tracking-wider uppercase mb-2 text-center
          ${canBetLH ? 'animate-pulse' : ''}`}>
          River Card — Low / High
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {['LOW', 'HIGH'].map(type => {
            const isLow = type === 'LOW';
            const bet = lowHighBet === type ? lowHighBet : (lowHighBet?.type === type ? lowHighBet.amount : 0);
            const isWinner = winningLowHigh === type;
            const hasBet = lowHighBet && lowHighBet.type === type;

            return (
              <motion.button
                key={type}
                onClick={() => canBetLH && onLowHighBet(type)}
                whileTap={canBetLH ? { scale: 0.95 } : {}}
                className={`relative rounded-lg px-2 py-3 text-xs font-bold border-2 transition-all duration-200
                  ${isWinner ? 'border-yellow-400 bg-yellow-900/50 text-yellow-300 shadow-yellow-400/50 shadow-lg' :
                    hasBet ? 'border-blue-500 bg-blue-900/40 text-blue-200' :
                    canBetLH ? 'border-blue-700/50 bg-blue-950/30 text-blue-300 hover:border-blue-400 cursor-pointer' :
                    'border-blue-900/20 bg-blue-950/10 text-blue-400/40'}
                  ${canBetLH ? 'cursor-pointer' : 'cursor-default'}
                `}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-black text-sm">{type}</span>
                  <span className="text-yellow-400/80">{isLow ? '2–7' : '8–Ace'}</span>
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

        {/* Live Low/High Count (shown after Turn) */}
        {communityCards.length >= 4 && (
          <div className="mt-1 text-center text-xs text-green-400/70">
            {lows} Low / {highs} High (of 4)
          </div>
        )}
      </div>
    </div>
  );
}