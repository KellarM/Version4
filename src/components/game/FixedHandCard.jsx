import { useState } from 'react';
import PlayingCard from './PlayingCard';
import { SUITS, evaluateBestHand } from '@/lib/gameEngine';
import { getCardImageUrl } from '@/lib/cardImages';
import { motion, AnimatePresence } from 'framer-motion';
import Chip from './Chip';


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
    if (amt > 0) allBets.push({ pid: i, amt });
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
  if (isWinner) borderCls = 'border-yellow-400 shadow-yellow-400/60 shadow-xl winner-flash' + ' ' + 'bg-yellow-900/30';
  else if (isLeading) borderCls = 'border-yellow-300 shadow-yellow-300/40 shadow-lg bg-yellow-900/20';
  else if (disabledByConstraint) borderCls = 'border-red-800/40 bg-black/40 opacity-60';
  else if (dragOver && isBettingPhase) borderCls = 'slot-border-active bg-yellow-900/20';
  else if (hovered && canBet) borderCls = 'slot-border-active bg-black/30';
  else borderCls = 'slot-border-dormant bg-black/25';

  return (
    <motion.div
      className={`relative rounded-xl border-[3px] cursor-pointer transition-colors duration-200 select-none flex flex-col h-full w-full ${borderCls}`}
      style={{ padding: '1.5%' }}
      animate={isLeading && !isWinner ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, repeat: isLeading && !isWinner ? Infinity : 0, repeatDelay: 1.5 }}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        // Ignore mousedown that originates from a draggable chip — it's a drag, not a bet
        if (e.target.closest('[data-chip]')) return;
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

      {/* Payout — top center, scales with cell width */}
      <div className="flex items-center justify-center flex-shrink-0" style={{ padding: '2% 0 1%' }}>
        <span style={{
          color: '#e8b84b',
          fontFamily: 'Oswald, sans-serif',
          fontWeight: 700,
          fontSize: 'clamp(0.55rem, 1.1vw, 0.95rem)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textShadow: '0 0 2px #000, 1px 1px 2px #000, -1px -1px 2px #000, 2px 2px 0 #000',
          whiteSpace: 'nowrap',
        }}>{hand.payout}:1</span>
      </div>

      {/* Cards — scale to fill the available vertical space of the cell */}
      <div
        className="flex gap-[3%] justify-center card-felt-shadow flex-1 items-center min-h-0 w-full"
        style={{ padding: '0 4%' }}
      >
        {hand.cards.map((card, i) => {
          const imgUrl = getCardImageUrl(card);
          return imgUrl
            ? (
              <img
                key={i}
                src={imgUrl}
                alt={`${card.rank} of ${card.suit}`}
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  height: '100%',
                  maxHeight: '100%',
                  aspectRatio: '5 / 7',
                  objectFit: 'cover',
                  borderRadius: '6%',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  display: 'block',
                }}
              />
            )
            : <PlayingCard key={i} card={card} size="sm" glow={isLeading || isWinner} />;
        })}
      </div>

      {/* Card names — always hidden, space reserved to prevent layout shift */}
      <div className="text-center text-xs text-yellow-200/70 truncate leading-none text-halo">
        {'\u00A0'}
      </div>

      {/* Current eval — always occupies the same space to prevent layout shift */}
      <div
        className={`text-center font-semibold leading-none truncate flex-shrink-0 ${isLeading || isWinner ? 'text-yellow-300' : 'text-yellow-100/60'}`}
        style={{ fontSize: 'clamp(0.5rem, 0.85vw, 0.75rem)', padding: '1% 0 2%' }}
      >
        {currentEval && currentEval.name !== 'No Hand' && currentEval.name !== 'High Card'
          ? currentEval.name
          : ' '}
      </div>


      {/* Bet chips — left side (P1–P5) and right side (P6–P10), stacked vertically */}
      {allBets && allBets.length > 0 && (() => {
        const leftBets = allBets.filter(b => b.pid < 5);
        const rightBets = allBets.filter(b => b.pid >= 5);
        const renderChip = ({ pid, amt }, idx) => (
          <Chip
            key={pid}
            playerId={pid}
            amount={amt}
            scale={0.75}
            draggable={isBettingPhase && pid === activePlayerId}
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('text/plain', JSON.stringify({ from: hand.id, pid, type: 'hand' }));
              e.dataTransfer.effectAllowed = 'move';
            }}
            style={{ zIndex: 10 + idx }}
            className="transition-transform hover:scale-110"
            title={`P${pid + 1}: $${amt} — drag to move`}
          />
        );
        return (
          <>
            {/* Left column: Players 1–5 */}
            {leftBets.length > 0 && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-10">
                {leftBets.map(renderChip)}
              </div>
            )}
            {/* Right column: Players 6–10 */}
            {rightBets.length > 0 && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-10">
                {rightBets.map(renderChip)}
              </div>
            )}
          </>
        );
      })()}

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