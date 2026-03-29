import { motion } from 'framer-motion';

const PLAYER_CHIP_COLORS = [
  { bg: 'bg-yellow-500',  text: 'text-black',  border: 'border-yellow-400'  },
  { bg: 'bg-blue-500',    text: 'text-white',  border: 'border-blue-300'    },
  { bg: 'bg-pink-500',    text: 'text-white',  border: 'border-pink-300'    },
  { bg: 'bg-green-500',   text: 'text-black',  border: 'border-green-300'   },
  { bg: 'bg-orange-500',  text: 'text-black',  border: 'border-orange-300'  },
];

// High Card removed - always at least 1 pair minimum (K/K)
export const RANK_BET_OPTIONS = [
  { key: 'Royal Flush',     label: 'Royal Flush',     payout: 'Progressive', color: 'purple', minBet: 25 },
  { key: 'Straight Flush',  label: 'Straight Flush',  payout: 'Progressive', color: 'orange', minBet: 15 },
  { key: 'Four of a Kind',  label: 'Four of a Kind',  payout: '12.77:1',     color: 'yellow' },
  { key: 'Full House',      label: 'Full House',       payout: '2.53:1',      color: 'green'  },
  { key: 'Flush',           label: 'Flush',            payout: '3.21:1',      color: 'blue'   },
  { key: 'Straight',        label: 'Straight',         payout: '4.93:1',      color: 'teal'   },
  { key: 'Three of a Kind', label: 'Three of a Kind',  payout: '3.81:1',      color: 'green'  },
  { key: 'Two Pair',        label: 'Two Pair',         payout: '15.98:1',     color: 'green'  },
  { key: 'One Pair',        label: 'One Pair',         payout: 'Progressive', color: 'green',  minBet: 10 },
];

// Winner always highlights in gold/yellow with flash animation
const WINNER_STYLE = 'bg-yellow-900/50 text-yellow-200 winner-flash';

const COLOR_STYLES = {
  purple: { active: 'border-purple-400 bg-purple-900/50 text-purple-200', inactive: 'border-purple-800/40 bg-purple-950/20 text-purple-400/60', winner: WINNER_STYLE },
  orange: { active: 'border-orange-400 bg-orange-900/50 text-orange-200', inactive: 'border-orange-800/40 bg-orange-950/20 text-orange-400/60', winner: WINNER_STYLE },
  yellow: { active: 'border-yellow-400 bg-yellow-900/50 text-yellow-200', inactive: 'border-yellow-800/40 bg-yellow-950/20 text-yellow-400/60', winner: WINNER_STYLE },
  blue:   { active: 'border-blue-400 bg-blue-900/50 text-blue-200',       inactive: 'border-blue-800/40 bg-blue-950/20 text-blue-400/60',       winner: WINNER_STYLE },
  teal:   { active: 'border-teal-400 bg-teal-900/50 text-teal-200',       inactive: 'border-teal-800/40 bg-teal-950/20 text-teal-400/60',       winner: WINNER_STYLE },
  green:  { active: 'border-green-500 bg-green-900/50 text-green-200',    inactive: 'border-green-800/40 bg-green-950/20 text-green-400/60',    winner: WINNER_STYLE },
};

export default function RankBets({ rankBets, allRankBets, playerCount, onRankBet, onRemoveRankBet, gamePhase, winningRank, leadingRank, disabled, disabledByConstraint }) {
  const canBet = gamePhase === 'betting' && !disabled && !disabledByConstraint;

  return (
    <div>
      <div className="text-yellow-400 text-xs font-bold tracking-wider uppercase mb-1 text-center">Hand Rank Board</div>
      <div className="flex flex-col gap-0.5">
        {RANK_BET_OPTIONS.map(opt => {
          const bet = rankBets[opt.key] || 0;
          const isWinner = winningRank === opt.key;
          const isLeading = leadingRank === opt.key && !isWinner;
          const styles = COLOR_STYLES[opt.color];
          const qualifies = !opt.minBet || bet >= opt.minBet;

          let cls = styles.inactive;
          if (disabledByConstraint) cls = 'border-red-600/40 bg-red-900/20 text-red-400/50 opacity-60';
          else if (isWinner) cls = styles.winner;
          else if (isLeading) cls = styles.active;
          else if (bet > 0) cls = styles.active;

          // Collect all players' chips
          const chipsHere = [];
          for (let i = 0; i < (playerCount || 1); i++) {
            const amt = (allRankBets?.[i] || {})[opt.key] || 0;
            if (amt > 0) chipsHere.push({ pid: i, amt, color: PLAYER_CHIP_COLORS[i % PLAYER_CHIP_COLORS.length] });
          }

          return (
            <motion.button
              key={opt.key}
              onClick={() => canBet && onRankBet(opt.key)}
              onContextMenu={(e) => { e.preventDefault(); if (gamePhase === 'betting') onRemoveRankBet(opt.key); }}
              whileTap={canBet ? { scale: 0.97 } : {}}
              className={`relative flex items-center justify-between px-2 py-1 rounded-lg border-2 text-xs font-bold transition-all duration-200
                ${cls}
                ${canBet ? 'cursor-pointer hover:brightness-125' : 'cursor-default'}
              `}
            >
              <div className="flex flex-col items-start leading-tight min-w-0">
                <span className="truncate">{opt.label}</span>
                {opt.minBet && (
                  <span className={`text-xs font-normal leading-none mt-0.5 ${bet > 0 && !qualifies ? 'text-red-400' : bet >= opt.minBet ? 'text-green-400' : 'text-yellow-400/50'}`}>
                    {bet >= opt.minBet ? '✓ qualifies' : `min $${opt.minBet}`}
                  </span>
                )}
              </div>
              <span className="text-yellow-400/80 ml-1 flex-shrink-0">{opt.payout}</span>

              {chipsHere.length > 0 && (
                <div className="absolute -top-1.5 -right-1.5 flex flex-row-reverse gap-0.5 z-10">
                  {chipsHere.map(({ pid, amt, color }, idx) => (
                    <span
                      key={pid}
                      style={{ zIndex: 10 + idx }}
                      className={`${color.bg} ${color.text} text-xs font-black rounded-full w-5 h-5 flex items-center justify-center border ${color.border} shadow`}
                      title={`P${pid + 1}: $${amt}`}
                    >
                      {amt >= 100 ? '99+' : amt}
                    </span>
                  ))}
                </div>
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