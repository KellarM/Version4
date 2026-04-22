import { useState } from 'react';
import PlayingCard from './PlayingCard';
import { SUITS, evaluateBestHand } from '@/lib/gameEngine';
import { motion, AnimatePresence } from 'framer-motion';

const PLAYER_CHIP_COLORS = [
{ bg: 'bg-yellow-500', text: 'text-black', border: 'border-yellow-400' },
{ bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-300' },
{ bg: 'bg-pink-500', text: 'text-white', border: 'border-pink-300' },
{ bg: 'bg-green-500', text: 'text-black', border: 'border-green-300' },
{ bg: 'bg-orange-500', text: 'text-black', border: 'border-orange-300' }];


export default function FixedHandCard({
  hand,
  isLeading,
  isWinner,
  communityCards,
  betAmount,
  allHandBets,
  playerCount,
  activePlayerId,
  onBet,
  onRemoveBet,
  onDropChip,
  gamePhase,
  disabled,
  disabledByConstraint,
  onAttemptLockedBet
}) {
  const allBets = [];
  for (let i = 0; i < (playerCount || 1); i++) {
    const amt = (allHandBets || {})[i]?.[hand?.id] || 0;
    if (amt > 0) allBets.push({ pid: i, amt, color: PLAYER_CHIP_COLORS[i % PLAYER_CHIP_COLORS.length] });
  }

  const [hovered, setHovered] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const canBet = gamePhase === 'betting' && !disabled && !disabledByConstraint;
  const isBettingPhase = gamePhase === 'betting';

  let currentEval = null;
  if (communityCards && communityCards.length > 0) {
    currentEval = evaluateBestHand(hand.cards, communityCards);
  }

  const cardDisplayName = hand.cards.map((c) => `${c.rank}${SUITS[c.suit]}`).join('/');

  // Border class
  let borderCls;
  if (isWinner) borderCls = 'border-yellow-400 bg-yellow-900/40 shadow-yellow-400/60 shadow-xl winner-flash';else
  if (isLeading) borderCls = 'border-yellow-300 bg-yellow-900/20 shadow-yellow-300/40 shadow-lg';else
  if (disabledByConstraint) borderCls = 'border-red-600/40 bg-red-900/20 opacity-60';else
  if (dragOver && isBettingPhase) borderCls = 'border-green-300 bg-green-800/60';else
  if (hovered && canBet) borderCls = 'border-yellow-600/70 bg-green-900/60';else
  borderCls = 'border-green-700/60 bg-green-900/40';

  return (
    <motion.div className="bg-green-900/40 rounded-xl relative border-2 cursor-pointer transition-colors duration-200 select-none flex flex-col justify-between border-green-700/60"

    animate={isLeading && !isWinner ? { scale: [1, 1.02, 1] } : { scale: 1 }}
    transition={{ duration: 0.5, repeat: isLeading && !isWinner ? Infinity : 0, repeatDelay: 1.5 }}
    onMouseDown={() => {
      if (isBettingPhase) {
        if (disabledByConstraint) {
          onAttemptLockedBet?.();
        } else {
          onBet(hand.id);
        }
      }
    }}
    onContextMenu={(e) => {e.preventDefault();if (isBettingPhase) onRemoveBet(hand.id);}}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    // Drop target
    onDragOver={(e) => {if (isBettingPhase) {e.preventDefault();setDragOver(true);}}}
    onDragLeave={() => setDragOver(false)}
    onDrop={(e) => {
      e.preventDefault();
      setDragOver(false);
      if (!isBettingPhase) return;
      const data = e.dataTransfer.getData('text/plain');
      if (!data) return;
      try {
        const parsed = JSON.parse(data);
        const { from, pid, type, amount } = parsed;
        if (type === 'hand' && from !== hand.id) {
          onDropChip(from, hand.id, pid);
        }
      } catch (e) {}
    }}>
      
      {(isLeading || isWinner) && !isWinner &&
      <div className="absolute inset-0 rounded-xl pointer-events-none">
          <div className="absolute inset-0 rounded-xl animate-pulse bg-yellow-300/5" />
        </div>
      }

      {/* Payout — top center */}
      <div className="bg-[hsl(var(--card-foreground))] mb-1 flex items-center justify-center">
        <span className="text-yellow-300 text-sm font-bold">{hand.payout}:1</span>
      </div>

      {/* Cards */}
      <div className="mx-1 py-1 flex gap-0.5 justify-center" style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}>
        {hand.cards.map((card, i) =>
        <PlayingCard key={i} card={card} size="sm" glow={isLeading || isWinner} />
        )}
      </div>

      {/* Card names */}
      <div className="text-green-300/80 text-xs text-center leading-none opacity-100 truncate">{cardDisplayName}</div>

      {/* Current eval */}
      {currentEval && currentEval.name !== 'No Hand' && currentEval.name !== 'High Card' &&
      <div className={`text-center text-xs font-semibold leading-none mt-0.5 truncate
          ${isLeading || isWinner ? 'text-yellow-300' : 'text-green-400/70'}`}>
          {currentEval.name}
        </div>
      }

      {/* Bet chips — draggable during betting */}
      {allBets && allBets.length > 0 &&
      <div className="absolute -top-2 -right-2 flex flex-row-reverse gap-0.5 z-10">
          {allBets.map(({ pid, amt, color }, idx) =>
        <span
          key={pid}
          draggable={isBettingPhase && pid === activePlayerId}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData('text/plain', JSON.stringify({ from: hand.id, pid, type: 'hand' }));
            e.dataTransfer.effectAllowed = 'move';
          }}
          style={{ zIndex: 10 + idx, cursor: isBettingPhase && pid === activePlayerId ? 'grab' : 'default' }}
          className={`${color.bg} ${color.text} text-xs font-black rounded-full w-6 h-6 flex items-center justify-center border ${color.border} shadow-lg transition-transform hover:scale-110`}
          title={`P${pid + 1}: $${amt} — drag to move`}>
          
              {amt >= 100 ? '99+' : amt}
            </span>
        )}
        </div>
      }

      {/* Winner banner */}
      {isWinner &&
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-black px-1.5 py-0.5 rounded-full whitespace-nowrap z-10">
        
          WIN!
        </motion.div>
      }

      {/* Lock icon when disabled by constraint */}
      {disabledByConstraint && betAmount === 0 &&
      <div className="absolute inset-0 rounded-xl flex items-center justify-center pointer-events-none">
          <span className="text-red-400 font-black text-2xl">🔒</span>
        </div>
      }

      {/* Bet prompt */}
      {canBet && hovered && betAmount === 0 &&
      <div className="absolute inset-0 rounded-xl bg-yellow-400/10 flex items-center justify-center pointer-events-none">
          <span className="text-yellow-300 font-bold text-xs">BET</span>
        </div>
      }
    </motion.div>);

}