import { SUITS } from '@/lib/gameEngine';
import { motion, AnimatePresence } from 'framer-motion';

// Abbreviate hand rank for compact display
function shortRank(rank) {
  const map = {
    'Royal Flush': 'R.FLUSH',
    'Straight Flush': 'S.FLUSH',
    'Four of a Kind': '4OAK',
    'Full House': 'HOUSE',
    'Flush': 'FLUSH',
    'Straight': 'STRA.',
    'Three of a Kind': '3OAK',
    'Two Pair': '2 PAIR',
    'One Pair': '1 PAIR',
    'High Card': 'HI CRD',
  };
  return map[rank] || rank;
}

export default function HistoryRail({ history }) {
  return (
    <div className="flex flex-col gap-1.5 h-full overflow-hidden">
      {/* History Rail — full height, no jackpot section */}
      <div className="border border-yellow-700/40 rounded-xl bg-black/30 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="text-yellow-400 text-xs font-bold tracking-wider uppercase py-1.5 text-center border-b border-yellow-700/30">
          Previous Hands
        </div>
        {/* Column headers */}
        <div className="grid px-1 py-0.5 border-b border-yellow-700/20" style={{gridTemplateColumns:'auto 1fr auto auto', gap:'0 2px'}}>
          <span className="text-yellow-400/60 text-xs font-semibold pr-1">HAND</span>
          <span className="text-yellow-400/60 text-xs font-semibold">TYPE</span>
          <span className="text-yellow-400/60 text-xs font-semibold text-center px-1">R/B</span>
          <span className="text-yellow-400/60 text-xs font-semibold text-right">L/H</span>
        </div>
        <div className="flex flex-col overflow-y-auto flex-1">
          <AnimatePresence>
            {history.length === 0 && (
              <div className="text-green-400/30 text-xs text-center py-4">No hands yet</div>
            )}
            {history.map((entry, idx) => {
              const isRecent = idx === 0;
              const isRed = entry.colorResult?.includes('R');
              const rankColor =
                entry.handRank === 'Royal Flush' ? 'text-gray-400' :
                entry.handRank === 'Straight Flush' ? 'text-gray-400' :
                entry.handRank === 'Four of a Kind' ? 'text-yellow-400' :
                entry.handRank === 'Full House' ? 'text-green-300' :
                entry.handRank === 'Straight' ? 'text-teal-300' :
                entry.handRank === 'Flush' ? 'text-orange-400' :
                entry.handRank === 'Three of a Kind' ? 'text-purple-400' :
                entry.handRank === 'Two Pair' ? 'text-blue-400' :  
                'text-gray-400';

              const handColor0 = entry.cards[0]?.suit === 'hearts' || entry.cards[0]?.suit === 'diamonds' ? 'text-red-400' : 'text-gray-200';
              const handColor1 = entry.cards[1]?.suit === 'hearts' || entry.cards[1]?.suit === 'diamonds' ? 'text-red-400' : 'text-gray-200';

              return (
                <motion.div
                  key={entry.roundId}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`grid px-1 py-0.5 border-b border-green-900/30 ${isRecent ? 'bg-green-900/20' : ''}`}
                  style={{gridTemplateColumns:'auto 1fr auto auto', gap:'0 2px'}}
                >
                  {/* Winning Hand cards */}
                  <div className="flex items-center pr-1">
                    {entry.cards.length >= 2 ? (
                      <span className="text-xs font-mono leading-none whitespace-nowrap">
                        <span className={handColor0}>{entry.cards[0].rank}{SUITS[entry.cards[0].suit]}</span>
                        <span className="text-gray-500">/</span>
                        <span className={handColor1}>{entry.cards[1].rank}{SUITS[entry.cards[1].suit]}</span>
                      </span>
                    ) : null}
                  </div>
                  {/* Type */}
                  <div className={`text-xs font-semibold leading-none flex items-center truncate ${rankColor}`}>
                    {shortRank(entry.handRank)}
                  </div>
                  {/* R/B */}
                  <div className={`text-xs font-bold leading-none flex items-center justify-center px-1 ${isRed ? 'text-red-400' : 'text-gray-300'}`}>
                    {entry.colorResult}
                  </div>
                  {/* L/H */}
                  <div className={`text-xs font-bold leading-none flex items-center justify-end ${entry.lowHighResult === 'HIGH' ? 'text-blue-400' : 'text-green-400'}`}>
                    {entry.lowHighResult === 'HIGH' ? 'H' : entry.lowHighResult === 'LOW' ? 'L' : '-'}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}