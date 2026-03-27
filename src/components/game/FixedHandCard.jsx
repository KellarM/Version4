import { useState } from 'react';
import PlayingCard from './PlayingCard';
import { SUITS, evaluateBestHand } from '@/lib/gameEngine';
import { motion, AnimatePresence } from 'framer-motion';

const PLAYER_CHIP_COLORS = [
  { bg: 'bg-yellow-500',  text: 'text-black',  border: 'border-yellow-400'  },
  { bg: 'bg-blue-500',    text: 'text-white',  border: 'border-blue-300'    },
  { bg: 'bg-pink-500',    text: 'text-white',  border: 'border-pink-300'    },
  { bg: 'bg-green-500',   text: 'text-black',  border: 'border-green-300'   },
  { bg: 'bg-orange-500',  text: 'text-black',  border: 'border-orange-300'  },
];

export default function FixedHandCard({
  hand,
  isLeading,
  isWinner,
  communityCards,
  betAmount,
  allHandBets,     // { [pid]: amount } for all players on this hand
  playerCount,
  onBet,
  gamePhase,
  disabled,
}) {
  // Build chip list from all players
  const allBets = [];
  for (let i = 0; i < (playerCount || 1); i++) {
    const amt = (allHandBets || {})[i]?.[hand?.id] || 0;
    if (amt > 0) allBets.push({ pid: i, amt, color: PLAYER_CHIP_COLORS[i % PLAYER_CHIP_COLORS.length] });
  }

  const [hovered, setHovered] = useState(false);
  const canBet = gamePhase === 'betting' && !disabled;

  let currentEval = null;
  if (communityCards && communityCards.length > 0) {
    currentEval = evaluateBestHand(hand.cards, communityCards);
  }

  const cardDisplayName = hand.cards.map(c => `${c.rank}${SUITS[c.suit]}`).join('/');

  return (
    <motion.div
      className={`relative rounded-xl p-1.5 border-2 cursor-pointer transition-all duration-300 select-none flex flex-col justify-between
        ${isWinner ? 'border-yellow-400 bg-yellow-900/40 shadow-yellow-400/60 shadow-xl' :
          isLeading ? 'border-yellow-300 bg-yellow-900/20 shadow-yellow-300/40 shadow-lg' :
          hovered && canBet ? 'border-yellow-600/70 bg-green-900/60' :
          'border-green-700/60 bg-green-900/40'}
      `}
      animate={isLeading || isWinner ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, repeat: isLeading && !isWinner ? Infinity : 0, repeatDelay: 1.5 }}
      onClick={() => canBet && onBet(hand.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {(isLeading || isWinner) && (
        <div className="absolute inset-0 rounded-xl pointer-events-none">
          <div className={`absolute inset-0 rounded-xl animate-pulse ${isWinner ? 'bg-yellow-400/10' : 'bg-yellow-300/5'}`} />
        </div>
      )}

      {/* Hand number + payout */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-yellow-400 font-bold text-xs">H{hand.id}</span>
        <span className="text-yellow-300/80 text-xs font-semibold">{hand.payout}:1</span>
      </div>

      {/* Cards */}
      <div className="flex gap-0.5 justify-center mb-1">
        {hand.cards.map((card, i) => (
          <PlayingCard key={i} card={card} size="sm" glow={isLeading || isWinner} />
        ))}
      </div>

      {/* Card names */}
      <div className="text-center text-xs text-green-300/80 truncate leading-none">{cardDisplayName}</div>

      {/* Current eval */}
      {currentEval && currentEval.name !== 'No Hand' && currentEval.name !== 'High Card' && (
        <div className={`text-center text-xs font-semibold leading-none mt-0.5 truncate
          ${isLeading || isWinner ? 'text-yellow-300' : 'text-green-400/70'}`}>
          {currentEval.name}
        </div>
      )}

      {/* Bet indicator — show all players' chips */}
      {allBets && allBets.length > 0 && (
        <div className="absolute -top-2 -right-2 flex flex-row-reverse gap-0.5 z-10">
          {allBets.map(({ pid, amt, color }, idx) => (
            <span
              key={pid}
              style={{ zIndex: 10 + idx }}
              className={`${color.bg} ${color.text} text-xs font-black rounded-full w-6 h-6 flex items-center justify-center border ${color.border} shadow-lg`}
              title={`P${pid + 1}: $${amt}`}
            >
              {amt >= 100 ? '99+' : amt}
            </span>
          ))}
        </div>
      )}

      {/* Winner banner */}
      {isWinner && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-black px-1.5 py-0.5 rounded-full whitespace-nowrap z-10"
        >
          WIN!
        </motion.div>
      )}

      {/* Bet prompt */}
      {canBet && hovered && betAmount === 0 && (
        <div className="absolute inset-0 rounded-xl bg-yellow-400/10 flex items-center justify-center">
          <span className="text-yellow-300 font-bold text-xs">BET</span>
        </div>
      )}
    </motion.div>
  );
}