import { useState } from 'react';
import PlayingCard from './PlayingCard';
import { SUITS, evaluateBestHand } from '@/lib/gameEngine';
import { motion, AnimatePresence } from 'framer-motion';

export default function FixedHandCard({
  hand,
  isLeading,
  isWinner,
  communityCards,
  betAmount,
  onBet,
  gamePhase,
  disabled,
}) {
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

      {/* Bet indicator */}
      {betAmount > 0 && (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg z-10">
          ${betAmount}
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