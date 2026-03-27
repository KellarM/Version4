import { SUITS } from '@/lib/gameEngine';
import { motion, AnimatePresence } from 'framer-motion';

export default function HistoryRail({ history, royalFlushJackpot, straightFlushJackpot }) {
  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Jackpots */}
      <div className="border border-yellow-700/40 rounded-xl p-3 bg-black/30">
        <div className="text-yellow-400 text-xs font-bold tracking-wider uppercase mb-2 text-center">Progressive Jackpots</div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-red-400 text-xs font-semibold">Royal Flush</span>
            <span className="text-yellow-300 font-bold text-sm">${royalFlushJackpot.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-orange-400 text-xs font-semibold">Straight Flush</span>
            <span className="text-yellow-300 font-bold text-sm">${straightFlushJackpot.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* History Rail */}
      <div className="border border-yellow-700/40 rounded-xl p-3 bg-black/30 flex-1 overflow-hidden">
        <div className="text-yellow-400 text-xs font-bold tracking-wider uppercase mb-2 text-center">Previous Hands</div>
        <div className="text-yellow-400/40 text-xs text-center mb-2">Newest → Top</div>
        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-72">
          <AnimatePresence>
            {history.length === 0 && (
              <div className="text-green-400/30 text-xs text-center py-4">No hands yet</div>
            )}
            {history.map((entry, idx) => (
              <motion.div
                key={entry.roundId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="border border-green-700/30 rounded-lg p-2 bg-green-900/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-yellow-400 text-xs font-bold">Hand {entry.winningHandId}</span>
                  <span className={`text-xs font-semibold
                    ${entry.handRank === 'Royal Flush' ? 'text-purple-400' :
                      entry.handRank === 'Straight Flush' ? 'text-orange-400' :
                      entry.handRank === 'Four of a Kind' ? 'text-yellow-400' :
                      'text-green-300'}`}>
                    {entry.handRank}
                  </span>
                </div>
                <div className="flex gap-1 mt-1">
                  {entry.cards.map((c, i) => (
                    <span key={i} className={`text-xs font-mono ${c.suit === 'hearts' || c.suit === 'diamonds' ? 'text-red-400' : 'text-gray-300'}`}>
                      {c.rank}{SUITS[c.suit]}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className={`text-xs ${entry.colorResult?.includes('R') ? 'text-red-400' : 'text-gray-400'}`}>
                    {entry.colorResult} Cards
                  </span>
                  <span className={`text-xs ${entry.lowHighResult === 'HIGH' ? 'text-blue-400' : 'text-green-400'}`}>
                    {entry.lowHighResult}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}