import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const PLAYER_CHIP_COLORS = [
  { bg: 'bg-yellow-500',  text: 'text-black',  border: 'border-yellow-400'  },
  { bg: 'bg-blue-500',    text: 'text-white',  border: 'border-blue-300'    },
  { bg: 'bg-pink-500',    text: 'text-white',  border: 'border-pink-300'    },
  { bg: 'bg-green-500',   text: 'text-black',  border: 'border-green-300'   },
  { bg: 'bg-orange-500',  text: 'text-black',  border: 'border-orange-300'  },
];

export default function PlayerStatsPanel({ isOpen, onClose, playerStats, playerCount }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-screen w-96 bg-gradient-to-b from-slate-900 to-slate-800 border-l border-yellow-700/40 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-yellow-700/30 flex-shrink-0">
              <h2 className="text-yellow-400 font-bold text-lg">Player Statistics</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-yellow-900/30 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-yellow-400" />
              </button>
            </div>

            {/* Stats Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {Array.from({ length: playerCount }, (_, i) => {
                const stats = playerStats[i] || { totalBets: 0, totalWins: 0, roundsPlayed: 0, roundsWon: 0, highestMultiplier: 0 };
                const color = PLAYER_CHIP_COLORS[i % PLAYER_CHIP_COLORS.length];
                const roi = stats.totalBets > 0 ? (((stats.totalWins - stats.totalBets) / stats.totalBets) * 100).toFixed(1) : 0;
                const winRate = stats.roundsPlayed > 0 ? ((stats.roundsWon / stats.roundsPlayed) * 100).toFixed(0) : 0;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`${color.bg} ${color.text} rounded-lg p-4 border ${color.border}`}
                  >
                    {/* Player name */}
                    <div className="font-bold text-lg mb-3">Player {i + 1}</div>

                    {/* Stats grid */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="opacity-80">Total Bets</span>
                        <span className="font-bold">${stats.totalBets.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-80">Total Wins</span>
                        <span className="font-bold">${stats.totalWins.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-80">Profit/Loss</span>
                        <span className={`font-bold ${stats.totalWins >= stats.totalBets ? 'text-green-200' : 'text-red-200'}`}>
                          {stats.totalWins >= stats.totalBets ? '+' : ''}${(stats.totalWins - stats.totalBets).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-current border-opacity-30 pt-2">
                        <span className="opacity-80">ROI</span>
                        <span className={`font-bold ${roi >= 0 ? 'text-green-200' : 'text-red-200'}`}>{roi}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-80">Win Rate</span>
                        <span className="font-bold">{winRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-80">Best Multiplier</span>
                        <span className="font-bold">{stats.highestMultiplier > 0 ? `${stats.highestMultiplier.toFixed(1)}x` : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-80">Rounds Played</span>
                        <span className="font-bold">{stats.roundsPlayed || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-80">Winning Rounds</span>
                        <span className="font-bold">{stats.roundsWon}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}