import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
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
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  // Reset to first winner when winInfo changes — must be before any early returns
  useEffect(() => {
    setCurrentPlayerIndex(0);
  }, [winInfo]);

  if (!winInfo || !winInfo.playerPayouts) return null;

  const hasAnyWins = winInfo.playerPayouts?.some(p => p.wins.length > 0);
  
  // Find the next player with wins starting from currentPlayerIndex
  const getNextWinningPlayer = (startIdx) => {
    for (let i = startIdx; i < winInfo.playerPayouts.length; i++) {
      if (winInfo.playerPayouts[i]?.wins.length > 0) return i;
    }
    return -1;
  };

  const nextWinnerIdx = getNextWinningPlayer(currentPlayerIndex);

  // Helper to get hand symbol display
  const getHandSymbol = (label) => {
    const handMatch = label.match(/Hand (\d+)/);
    if (!handMatch) return label;
    const handId = parseInt(handMatch[1]);
    const hand = FIXED_HANDS.find(h => h.id === handId);
    if (!hand) return label;
    return `${hand.cards[0].rank}${SUITS[hand.cards[0].suit]} / ${hand.cards[1].rank}${SUITS[hand.cards[1].suit]}`;
  };

  const handleNext = () => {
    const nextIdx = getNextWinningPlayer(currentPlayerIndex + 1);
    if (nextIdx !== -1) {
      setCurrentPlayerIndex(nextIdx);
    } else {
      setCurrentPlayerIndex(-1);
    }
  };

  // No wins at all — show a "no win" dismissal card so the game can proceed
  if (!hasAnyWins || (hasAnyWins && nextWinnerIdx === -1 && currentPlayerIndex !== -1)) {
    if (!hasAnyWins) {
      return (
        <AnimatePresence>
          {currentPlayerIndex !== -1 && (
            <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
              <motion.div
                key="no-win"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="border-2 border-slate-500 rounded-2xl p-8 shadow-2xl min-w-[400px] pointer-events-auto relative text-center"
                style={{ background: 'rgba(0, 0, 0, 0.15)' }}
              >
                <motion.button
                  onClick={() => setCurrentPlayerIndex(-1)}
                  animate={{ scale: [1, 1.15, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-yellow-400 border-2 border-yellow-300 shadow-lg shadow-yellow-400/60"
                >
                  <X className="w-7 h-7 text-black font-black" strokeWidth={3} />
                </motion.button>
                <div className="text-5xl mb-3">😔</div>
                <div className="text-3xl font-black text-yellow-400 mb-2" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}>NO WIN</div>
                <div className="text-red-500 font-bold text-sm" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>Better luck next round!</div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      );
    }
  }

  return (
    <AnimatePresence>
      {winInfo && hasAnyWins && nextWinnerIdx !== -1 && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
          {(() => {
            const playerId = nextWinnerIdx;
            const payout = winInfo.playerPayouts[playerId];
            const color = PLAYER_COLORS[playerId % PLAYER_COLORS.length];

            return (
              <motion.div
                key={`player-${playerId}`}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`border-2 ${color.border} rounded-2xl p-6 shadow-2xl min-w-[600px] pointer-events-auto relative`}
                style={{ background: 'rgba(0, 0, 0, 0.15)' }}
              >
                {/* Close Button */}
                <motion.button
                  onClick={handleNext}
                  animate={{ scale: [1, 1.15, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-yellow-400 border-2 border-yellow-300 shadow-lg shadow-yellow-400/60"
                  title="Next winner"
                >
                  <X className="w-7 h-7 text-black font-black" strokeWidth={3} />
                </motion.button>

                {/* Header */}
                <div className="text-center mb-4">
                  {playerCount > 1 && (
                    <div className="text-sm font-bold text-yellow-400 mb-1" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>PLAYER {playerId + 1}</div>
                  )}
                  <div className="text-3xl font-black text-yellow-400" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 2px 0 #000, 2px 0 0 #000, 0 -2px 0 #000, -2px 0 0 #000' }}>YOU WIN!</div>
                  <div className="text-2xl font-black text-yellow-400 mt-1" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 2px 0 #000, 2px 0 0 #000, 0 -2px 0 #000, -2px 0 0 #000' }}>WINNER</div>
                </div>

                {/* Winning bets breakdown */}
                <div className="space-y-2 mb-4 max-h-96 overflow-y-auto pr-2 pointer-events-auto">
                  {payout.wins.map((win, idx) => {
                    const profit = win.payout - win.bet;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + idx * 0.1 }}
                        className="rounded-lg p-3 border border-gray-600/40 backdrop-blur-sm"
                      >
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <div className="font-black text-2xl text-yellow-400" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}>{getHandSymbol(win.label)}</div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-yellow-400" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}>Bet: ${win.bet.toFixed(2)}</div>
                            <div className="text-2xl font-black text-yellow-400" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}>Odds: {win.odds}</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-2xl gap-2">
                          <span className="font-black text-yellow-400" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}>${profit.toFixed(2)} + BET OF ${win.bet.toFixed(2)}</span>
                          <span className="font-black text-yellow-400" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}>= ${win.payout.toFixed(2)}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="border-t border-gray-600/40 pt-3 space-y-2">
                  <div className="flex justify-between text-2xl font-black gap-2">
                    <span className="text-yellow-400" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}>Total Wagered</span>
                    <span className="text-yellow-400" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}>${payout.totalBet.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-2xl font-black gap-2">
                    <span className="text-yellow-400" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}>Net Win</span>
                    <span className={payout.netWin >= 0 ? "text-green-400" : "text-red-500"} style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}>
                      ${payout.netWin.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-2xl font-black gap-2">
                    <span className="text-yellow-400" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}>Total Win</span>
                    <span className="text-green-400" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' }}>
                      ${(payout.totalBet + payout.netWin).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Visual indicator */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${payout.netWin >= 0 ? 'bg-yellow-500' : 'bg-red-600'}`}
                />
              </motion.div>
            );
          })()}
        </div>
      )}
    </AnimatePresence>
  );
}