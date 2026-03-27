import { motion } from 'framer-motion';

// High Card removed - always at least 1 pair minimum (K/K)
export const RANK_BET_OPTIONS = [
  { key: 'Royal Flush',     label: 'Royal Flush',     payout: 'JACKPOT', color: 'purple' },
  { key: 'Straight Flush',  label: 'Straight Flush',  payout: 'JACKPOT', color: 'orange' },
  { key: 'Four of a Kind',  label: 'Four of a Kind',  payout: '10:1',    color: 'yellow' },
  { key: 'Full House',      label: 'Full House',       payout: '2:1',     color: 'green'  },
  { key: 'Flush',           label: 'Flush',            payout: '3:1',     color: 'blue'   },
  { key: 'Straight',        label: 'Straight',         payout: '5:1',     color: 'teal'   },
  { key: 'Three of a Kind', label: 'Three of a Kind', payout: '3:1',     color: 'green'  },
  { key: 'Two Pair',        label: 'Two Pair',         payout: '12:1',    color: 'green'  },
  { key: 'One Pair',        label: 'One Pair',         payout: '15:1',    color: 'green'  },
];

const COLOR_STYLES = {
  purple: { active: 'border-purple-400 bg-purple-900/50 text-purple-200', inactive: 'border-purple-800/40 bg-purple-950/20 text-purple-400/60', winner: 'border-purple-300 bg-purple-800/60 text-purple-100 shadow-purple-400/60 shadow-lg' },
  orange: { active: 'border-orange-400 bg-orange-900/50 text-orange-200', inactive: 'border-orange-800/40 bg-orange-950/20 text-orange-400/60', winner: 'border-orange-300 bg-orange-800/60 text-orange-100 shadow-orange-400/60 shadow-lg' },
  yellow: { active: 'border-yellow-400 bg-yellow-900/50 text-yellow-200', inactive: 'border-yellow-800/40 bg-yellow-950/20 text-yellow-400/60', winner: 'border-yellow-300 bg-yellow-700/60 text-yellow-100 shadow-yellow-400/60 shadow-lg' },
  blue:   { active: 'border-blue-400 bg-blue-900/50 text-blue-200',       inactive: 'border-blue-800/40 bg-blue-950/20 text-blue-400/60',       winner: 'border-blue-300 bg-blue-800/60 text-blue-100 shadow-blue-400/60 shadow-lg' },
  teal:   { active: 'border-teal-400 bg-teal-900/50 text-teal-200',       inactive: 'border-teal-800/40 bg-teal-950/20 text-teal-400/60',       winner: 'border-teal-300 bg-teal-800/60 text-teal-100 shadow-teal-400/60 shadow-lg' },
  green:  { active: 'border-green-500 bg-green-900/50 text-green-200',    inactive: 'border-green-800/40 bg-green-950/20 text-green-400/60',    winner: 'border-green-300 bg-green-800/60 text-green-100 shadow-green-400/60 shadow-lg' },
};

export default function RankBets({ rankBets, onRankBet, gamePhase, winningRank, leadingRank, disabled }) {
  const canBet = gamePhase === 'betting' && !disabled;

  return (
    <div>
      <div className="text-yellow-400 text-xs font-bold tracking-wider uppercase mb-1 text-center">Hand Rank Board</div>
      <div className="flex flex-col gap-0.5">
        {RANK_BET_OPTIONS.map(opt => {
          const bet = rankBets[opt.key] || 0;
          const isWinner = winningRank === opt.key;
          const isLeading = leadingRank === opt.key && !isWinner;
          const styles = COLOR_STYLES[opt.color];

          let cls = styles.inactive;
          if (isWinner) cls = styles.winner;
          else if (isLeading) cls = styles.active;
          else if (bet > 0) cls = styles.active;

          return (
            <motion.button
              key={opt.key}
              onClick={() => canBet && onRankBet(opt.key)}
              whileTap={canBet ? { scale: 0.97 } : {}}
              className={`relative flex items-center justify-between px-2 py-1 rounded-lg border-2 text-xs font-bold transition-all duration-200
                ${cls}
                ${canBet ? 'cursor-pointer hover:brightness-125' : 'cursor-default'}
              `}
            >
              <span className="truncate">{opt.label}</span>
              <span className="text-yellow-400/80 ml-1 flex-shrink-0">{opt.payout}</span>

              {bet > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-black text-xs font-black rounded-full w-5 h-5 flex items-center justify-center z-10">
                  ${bet}
                </span>
              )}
              {isLeading && (
                <div className="absolute inset-0 rounded-lg bg-white/5 animate-pulse pointer-events-none" />
              )}
              {isWinner && (
                <div className="absolute inset-0 rounded-lg bg-yellow-400/10 animate-pulse pointer-events-none" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}