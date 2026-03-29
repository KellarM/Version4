import { motion, AnimatePresence } from 'framer-motion';
import { HAND_RANK_PAYOUTS as RANK_PAYOUT_MAP, COLOR_BOARD_PAYOUTS, LOW_HIGH_PAYOUT } from '@/lib/payoutConstants';
import { cardDisplay, SUITS, FIXED_HANDS } from '@/lib/gameEngine';

const PLAYER_COLORS = [
  { bg: 'from-yellow-600 to-yellow-700', border: 'border-yellow-400', text: 'text-yellow-100' },
  { bg: 'from-blue-600 to-blue-700', border: 'border-blue-400', text: 'text-blue-100' },
  { bg: 'from-pink-600 to-pink-700', border: 'border-pink-400', text: 'text-pink-100' },
  { bg: 'from-green-600 to-green-700', border: 'border-green-400', text: 'text-green-100' },
  { bg: 'from-orange-600 to-orange-700', border: 'border-orange-400', text: 'text-orange-100' },
];

export default function DetailedPayoutDisplay({ winInfo, playerCount = 1 }) {
  if (!winInfo || !winInfo.playerPayouts) return null;

  const hasAnyWins = winInfo.playerPayouts?.some(p => p.wins.length > 0);

  // Helper to get hand symbol display
  const getHandSymbol = (label) => {
    const handMatch = label.match(/Hand (\d+)/);
    if (!handMatch) return label;
    const handId = parseInt(handMatch[1]);
    const hand = FIXED_HANDS.find(h => h.id === handId);
    if (!hand) return label;
    return `${hand.cards[0].rank}${SUITS[hand.cards[0].suit]} / ${hand.cards[1].rank}${SUITS[hand.cards[1].suit]}`;
  };

  return (
    <AnimatePresence>
      {winInfo && (
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center gap-4 p-4">
        {hasAnyWins ? (
          winInfo.playerPayouts.map((payout, playerId) => {
            if (!payout || payout.wins.length === 0) return null;

            const color = PLAYER_COLORS[playerId % PLAYER_COLORS.length];

            return (
              <motion.div
                key={`player-${playerId}`}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: playerId * 0.1 }}
                className={`bg-gradient-to-b ${color.bg} bg-opacity-50 border-2 ${color.border} rounded-2xl p-6 shadow-2xl min-w-80 max-w-md backdrop-blur-sm`}
              >
                {/* Header */}
                <div className="text-center mb-4">
                  {playerCount > 1 && (
                    <div className="text-sm font-bold opacity-80 mb-1">PLAYER {playerId + 1}</div>
                  )}
                  <div className="text-3xl font-black text-yellow-300">YOU WIN!</div>
                  <div className="text-2xl font-black text-yellow-200 mt-1">WINNER</div>
                </div>

                {/* Winning bets breakdown */}
                <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                  {payout.wins.map((win, idx) => {
                    const profit = win.payout - win.bet;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + idx * 0.1 }}
                        className="bg-black/20 rounded-lg p-3 border border-white/10 backdrop-blur-sm"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-bold text-sm">{getHandSymbol(win.label)}</div>
                          <div className="text-right">
                            <div className="text-xs opacity-80">Bet: ${win.bet.toFixed(2)}</div>
                            <div className="text-xs opacity-80">Odds: {win.odds}</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="opacity-70">${profit.toFixed(2)} + BET OF ${win.bet.toFixed(2)}</span>
                          <span className="font-bold text-yellow-200">= ${win.payout.toFixed(2)}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="border-t border-white/30 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Total Wagered</span>
                    <span className="font-bold">${payout.totalBet.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black">
                    <span>Net Win</span>
                    <span className="text-green-200">
                      ${payout.netWin.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Visual indicator */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="absolute top-0 left-0 right-0 h-1 bg-yellow-300 rounded-t-2xl"
                />
              </motion.div>
            );
          })
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-gradient-to-b from-gray-700 to-gray-800 border-2 border-gray-400 rounded-2xl p-8 shadow-2xl min-w-80 backdrop-blur-sm text-center"
          >
            <div className="text-5xl mb-4">🎰</div>
            <div className="text-2xl font-black text-gray-200 mb-6">No Winners This Round</div>
            <div className="text-gray-300 text-sm mb-6">Better luck next time!</div>
            <div className="text-4xl font-black text-yellow-400">Next Round?</div>
          </motion.div>
        )}
      </div>
      )}
    </AnimatePresence>
  );
}