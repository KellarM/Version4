import { SUITS } from '@/lib/gameEngine';
import { motion, AnimatePresence } from 'framer-motion';

function shortRank(rank) {
  const map = {
    'Royal Flush': 'R.FLUSH',
    'Four of a Kind': '4 OF KIND',
    'Full House': 'FULL HSE',
    'Flush': 'FLUSH',
    'Straight': 'STRAIGHT',
    'Three of a Kind': '3 OF KIND',
    'Two Pair': '2 PAIR',
    'High Card': 'HI CARD',
  };
  return map[rank] || rank;
}

function cardSuitColor(card) {
  return card?.suit === 'hearts' || card?.suit === 'diamonds' ? 'text-red-400' : 'text-gray-200';
}

function HandSlot({ cards }) {
  if (!cards || cards.length < 2) {
    return <span className="inline-block w-[52px]" />;
  }
  return (
    <span className="text-xs font-mono leading-none whitespace-nowrap inline-block w-[52px]">
      <span className={cardSuitColor(cards[0])}>{cards[0].rank}{SUITS[cards[0].suit]}</span>
      <span className="text-gray-500">/</span>
      <span className={cardSuitColor(cards[1])}>{cards[1].rank}{SUITS[cards[1].suit]}</span>
    </span>
  );
}

export default function HistoryRail({ history }) {
  return (
    <div className="flex flex-col gap-1.5 h-full overflow-hidden">
      <div className="border border-yellow-700/40 rounded-xl bg-black/30 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="text-yellow-400 text-xs font-bold tracking-wider uppercase py-1.5 text-center border-b border-yellow-700/30">
          Previous Hands
        </div>

        {/* Column headers */}
        <div className="flex items-center px-1 py-0.5 border-b border-yellow-700/20 gap-0">
          {/* HAND header spans both slots: 52px slot A + 4px divider + 52px slot B = 108px */}
          <span className="text-yellow-400/60 text-xs font-semibold" style={{ width: 108, flexShrink: 0 }}>HAND</span>
          <span className="text-yellow-400/60 text-xs font-semibold flex-1 pl-1">TYPE</span>
          <span className="text-yellow-400/60 text-xs font-semibold text-center" style={{ width: 26, flexShrink: 0 }}>R/B</span>
          <span className="text-yellow-400/60 text-xs font-semibold text-right" style={{ width: 18, flexShrink: 0 }}>L/H</span>
        </div>

        <div className="flex flex-col overflow-hidden flex-1">
          <AnimatePresence>
            {history.length === 0 && (
              <div className="text-green-400/30 text-xs text-center py-4">No hands yet</div>
            )}
            {history.map((entry, idx) => {
              const isRecent = idx === 0;
              const isRed = entry.colorResult?.includes('R');
              const rankColor =
                entry.handRank === 'Royal Flush' ? 'text-gray-400' :
                entry.handRank === 'Four of a Kind' ? 'text-yellow-400' :
                entry.handRank === 'Full House' ? 'text-green-300' :
                entry.handRank === 'Straight' ? 'text-teal-300' :
                entry.handRank === 'Flush' ? 'text-orange-400' :
                entry.handRank === 'Three of a Kind' ? 'text-purple-400' :
                entry.handRank === 'Two Pair' ? 'text-blue-400' :
                'text-gray-400';

              return (
                <motion.div
                  key={entry.roundId}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center px-1 py-0.5 border-b border-green-900/30 gap-0 ${isRecent ? 'bg-green-900/20' : ''}`}
                >
                  {/* Slot A — primary winner (or "Board" label) */}
                  <div style={{ width: 52, flexShrink: 0 }}>
                    {entry.isBoardWin ? (
                      <span className="text-xs font-mono text-amber-400 leading-none whitespace-nowrap">Board</span>
                    ) : (
                      <HandSlot cards={entry.cardsA} />
                    )}
                  </div>

                  {/* Divider between slots */}
                  <div style={{ width: 4, flexShrink: 0 }} className="flex items-center justify-center">
                    {!entry.isBoardWin && entry.cardsB?.length >= 2 && (
                      <span className="text-gray-600 text-xs leading-none">|</span>
                    )}
                  </div>

                  {/* Slot B — second winner (tie) or blank */}
                  <div style={{ width: 52, flexShrink: 0 }}>
                    {!entry.isBoardWin && <HandSlot cards={entry.cardsB} />}
                  </div>

                  {/* TYPE */}
                  <div className={`text-xs font-semibold leading-none flex items-center truncate flex-1 pl-1 ${rankColor}`}>
                    {entry.isBoardWin ? 'BOARD' : shortRank(entry.handRank)}
                  </div>

                  {/* R/B */}
                  <div
                    className={`text-xs font-bold leading-none flex items-center justify-center ${isRed ? 'text-red-400' : 'text-gray-300'}`}
                    style={{ width: 26, flexShrink: 0 }}
                  >
                    {entry.colorResult}
                  </div>

                  {/* L/H */}
                  <div
                    className={`text-xs font-bold leading-none flex items-center justify-end ${entry.lowHighResult === 'HIGH' ? 'text-blue-400' : 'text-green-400'}`}
                    style={{ width: 18, flexShrink: 0 }}
                  >
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