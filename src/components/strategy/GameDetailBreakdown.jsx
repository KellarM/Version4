import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';

export default function GameDetailBreakdown({ gameLog, onClose }) {
  const [expandedGame, setExpandedGame] = useState(null);

  if (!gameLog || gameLog.length === 0) {
    return (
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        className="fixed right-0 top-0 h-screen w-full md:w-96 bg-gradient-to-b from-slate-900 to-slate-800 border-l border-slate-700 z-50 flex flex-col overflow-hidden"
      >
        <div className="flex items-center gap-3 p-4 border-b border-slate-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded-lg transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h2 className="text-yellow-400 font-bold text-lg">Game Details</h2>
        </div>
        <div className="flex items-center justify-center h-full text-gray-400">
          No games to display
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="fixed right-0 top-0 h-screen w-full md:w-96 bg-gradient-to-b from-slate-900 to-slate-800 border-l border-slate-700 z-50 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-700 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-700 rounded-lg transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <h2 className="text-yellow-400 font-bold text-lg">Game Breakdown</h2>
        <span className="ml-auto text-yellow-400/60 text-xs">{gameLog.length} games</span>
      </div>

      {/* Scrollable game list */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          <AnimatePresence>
            {gameLog.map((game, idx) => {
              const isExpanded = expandedGame === idx;
              const won = game.gameWon;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-lg border-2 overflow-hidden ${
                    won
                      ? 'border-green-600/50 bg-green-900/20'
                      : 'border-red-600/50 bg-red-900/10'
                  }`}
                >
                  {/* Summary row */}
                  <button
                    onClick={() => setExpandedGame(isExpanded ? null : idx)}
                    className={`w-full px-3 py-2 flex items-center justify-between hover:brightness-110 transition-all ${
                      won ? 'bg-green-900/30' : 'bg-red-900/20'
                    }`}
                  >
                    <div className="text-left flex-1">
                      <div className="text-xs font-bold text-white">
                        Game #{game.gameNumber}
                      </div>
                      <div className="text-xs text-gray-300">
                        ${game.balanceBefore.toFixed(0)} → ${game.balanceAfter.toFixed(0)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div
                          className={`text-xs font-bold ${
                            won ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {won ? '+' : ''}{game.netResult.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">
                          Bet: ${game.totalBet}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-700 bg-black/50 overflow-hidden"
                      >
                        <div className="p-3 space-y-2 text-xs">
                          {/* Bets breakdown */}
                          <div>
                            <div className="font-bold text-yellow-400 mb-1">
                              Bets Placed:
                            </div>
                            <div className="space-y-1">
                              {game.bets && game.bets.length > 0 ? (
                                game.bets.map((bet, bidx) => (
                                  <div
                                    key={bidx}
                                    className={`flex justify-between px-2 py-1 rounded ${
                                      bet.won
                                        ? 'bg-green-900/30 text-green-300'
                                        : 'bg-red-900/20 text-red-300'
                                    }`}
                                  >
                                    <div>
                                      <span className="font-semibold">
                                        {bet.position}
                                      </span>
                                      <span className="text-gray-400 ml-1">
                                        (${bet.bet})
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      {bet.won ? (
                                        <span className="font-bold text-green-400">
                                          +${bet.payout.toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">Lost</span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-gray-400">No bets</div>
                              )}
                            </div>
                          </div>

                          {/* Community Cards */}
                          {game.communityCards && (
                            <div className="border-t border-slate-600 pt-2 mt-2">
                              <div className="font-bold text-yellow-400 mb-2">
                                Community Cards:
                              </div>
                              <div className="space-y-2 text-gray-300">
                                <div>
                                  <span className="text-gray-400 text-xs">Flop:</span>{' '}
                                  <span className="font-mono text-sm font-bold">
                                    {game.communityCards.flop.join(' ')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-xs">Turn:</span>{' '}
                                  <span className="font-mono text-sm font-bold">
                                    {game.communityCards.turn}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400 text-xs">River:</span>{' '}
                                  <span className="font-mono text-sm font-bold">
                                    {game.communityCards.river}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Winning positions */}
                          <div className="border-t border-slate-600 pt-2 mt-2">
                            <div className="font-bold text-yellow-400 mb-1">
                              Winning Positions:
                            </div>
                            <div className="space-y-1 text-gray-300">
                              <div>
                                <span className="text-gray-400">Hand:</span>{' '}
                                <span className="font-semibold">
                                  {game.winningPositions.hand}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Rank:</span>{' '}
                                <span className="font-semibold">
                                  {game.winningPositions.rank}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Colors:</span>{' '}
                                <span className="font-semibold">
                                  {game.winningPositions.colors.join(', ') ||
                                    'None'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">River:</span>{' '}
                                <span className="font-semibold">
                                  {game.winningPositions.lowHigh}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}