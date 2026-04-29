import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { HAND_RANK_PAYOUTS } from '@/lib/payoutConstants';
import Chip from './Chip';

export const RANK_BET_OPTIONS = [
  { key: 'Four of a Kind',  label: '4 Of A Kind',  payout: `${HAND_RANK_PAYOUTS['Four of a Kind']}:1`  },
  { key: 'Full House',      label: 'Full House',   payout: `${HAND_RANK_PAYOUTS['Full House']}:1`      },
  { key: 'Flush',           label: 'Flush',        payout: `${HAND_RANK_PAYOUTS['Flush']}:1`           },
  { key: 'Straight',        label: 'Straight',     payout: `${HAND_RANK_PAYOUTS['Straight']}:1`        },
  { key: 'Three of a Kind', label: '3 Of A Kind',  payout: `${HAND_RANK_PAYOUTS['Three of a Kind']}:1` },
  { key: 'Two Pair',        label: '2 Pair',       payout: `${HAND_RANK_PAYOUTS['Two Pair']}:1`        },
];

function useUnlockPulse(rankKey, unlockedRanks) {
  const [pulseActive, setPulseActive] = useState(false);
  const prevUnlocked = useRef(false);

  useEffect(() => {
    const nowUnlocked = unlockedRanks && unlockedRanks.has(rankKey);
    if (!prevUnlocked.current && nowUnlocked) {
      setPulseActive(true);
      const t = setTimeout(() => setPulseActive(false), 900);
      return () => clearTimeout(t);
    }
    prevUnlocked.current = !!nowUnlocked;
  }, [rankKey, unlockedRanks]);

  return pulseActive;
}

function LockIcon({ dim = false, onGold = false }) {
  const bodyFill = onGold
    ? `rgba(0,0,0,${dim ? 0.45 : 0.88})`
    : `rgba(197,160,89,${dim ? 0.35 : 0.80})`;
  const shackleColor = onGold
    ? `rgba(0,0,0,${dim ? 0.45 : 0.88})`
    : `rgba(197,160,89,${dim ? 0.35 : 0.80})`;
  const keyholeColor = onGold ? 'rgba(230,180,20,0.9)' : 'rgba(10,6,2,0.9)';
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, display: 'block' }}>
      <rect x="3" y="11" width="18" height="12" rx="2.5" fill={bodyFill} />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={shackleColor} strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="12" cy="17" r="2" fill={keyholeColor} />
      <rect x="11" y="17" width="2" height="3" rx="1" fill={keyholeColor} />
    </svg>
  );
}

function RankSlot({
  opt, rankBets, allRankBets, playerCount, canBet,
  isWinner, isLeading, isKillLocked, isMathLocked, isSlotLocked,
  onRankBet, onRemoveRankBet, onMoveRankBet, gamePhase, unlockedRanks, killSwitchActive,
  noHandBets, activePlayerId,
}) {
  const bet = rankBets[opt.key] || 0;
  const unlockPulse = useUnlockPulse(opt.key, unlockedRanks);

  const hardLocked = noHandBets || isKillLocked;
  const fullyLocked = hardLocked || isMathLocked || isSlotLocked;

  const chipsHere = [];
  for (let i = 0; i < (playerCount || 1); i++) {
    const amt = (allRankBets?.[i] || {})[opt.key] || 0;
    if (amt > 0) chipsHere.push({ pid: i, amt });
  }

  const goldBase = {
    background: 'linear-gradient(135deg, #f6d860 0%, #e8c22a 30%, #fef08a 55%, #c9960a 80%, #e8c22a 100%)',
    boxShadow: 'inset 0 1px 2px rgba(255,255,200,0.6), inset 0 -1px 2px rgba(100,60,0,0.5), 0 1px 4px rgba(0,0,0,0.5)',
  };
  const goldDim = {
    background: 'linear-gradient(135deg, #c9a820 0%, #b08a14 30%, #d4b830 55%, #8a6504 80%, #b08a14 100%)',
    boxShadow: 'inset 0 1px 2px rgba(200,170,80,0.3), inset 0 -1px 2px rgba(80,40,0,0.5)',
    opacity: 0.72,
  };
  const redVelvet = {
    background: 'linear-gradient(135deg, rgba(80,10,10,0.85) 0%, rgba(40,5,5,0.95) 100%)',
    boxShadow: 'inset 0 0 14px rgba(197,100,50,0.25)',
  };

  let slotCls, textColor, oddsColor, buttonStyle, showDarkLock;

  if (isWinner) {
    slotCls = 'winner-flash border-yellow-400';
    textColor = 'text-yellow-200';
    oddsColor = 'text-yellow-200';
    buttonStyle = { background: 'rgba(120,60,0,0.75)', boxShadow: '0 0 12px rgba(255,200,50,0.4)' };
    showDarkLock = false;
  } else if (isLeading) {
    slotCls = 'slot-border-active shadow-md cursor-pointer';
    textColor = 'text-yellow-100';
    oddsColor = 'text-yellow-400/90 text-halo';
    buttonStyle = redVelvet;
    showDarkLock = false;
  } else if (bet > 0) {
    slotCls = 'slot-border-active shadow-md cursor-pointer';
    textColor = 'text-yellow-100';
    oddsColor = 'text-yellow-400/90 text-halo';
    buttonStyle = redVelvet;
    showDarkLock = false;
  } else if (!fullyLocked && canBet) {
    slotCls = 'border-black cursor-pointer hover:brightness-110 transition-all';
    textColor = 'text-black';
    oddsColor = 'text-black';
    buttonStyle = goldBase;
    showDarkLock = false;
  } else if (fullyLocked) {
    slotCls = 'border-black';
    textColor = 'text-black/60';
    oddsColor = 'text-black/60';
    buttonStyle = goldDim;
    showDarkLock = true;
  } else {
    slotCls = 'border-black';
    textColor = 'text-black/50';
    oddsColor = 'text-black/50';
    buttonStyle = goldDim;
    showDarkLock = true;
  }

  return (
    <motion.button
      onMouseDown={() => {
        if (gamePhase === 'betting' && !fullyLocked) onRankBet(opt.key);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (gamePhase === 'betting' && bet > 0) onRemoveRankBet(opt.key);
      }}
      onDragOver={(e) => {
        if (gamePhase === 'betting' && !fullyLocked) { e.preventDefault(); e.stopPropagation(); }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (gamePhase !== 'betting' || fullyLocked) return;
        const data = e.dataTransfer.getData('text/plain');
        if (!data) return;
        try {
          const { from, type, pid: dragPid } = JSON.parse(data);
          if (type === 'rank' && from !== opt.key) {
            const amt = (allRankBets?.[dragPid] || {})[from] || 0;
            if (amt > 0 && onMoveRankBet) { onMoveRankBet(from, opt.key); }
          }
        } catch (_) {}
      }}
      whileTap={canBet && !fullyLocked ? { scale: 0.96 } : {}}
      style={{ ...buttonStyle, pointerEvents: (fullyLocked && bet === 0) ? 'none' : 'auto', overflow: 'visible' }}
      className={`relative w-full h-full rounded-lg border transition-all duration-300
        ${slotCls}
        ${canBet && !fullyLocked ? 'lp-magnetic' : ''}
      `}
    >
      {/* Unlock gold pulse */}
      <AnimatePresence>
        {unlockPulse && (
          <motion.div
            initial={{ opacity: 0.85, scale: 0.9 }}
            animate={{ opacity: 0, scale: 1.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
            className="absolute inset-0 rounded-lg pointer-events-none z-20"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(253,224,100,0.5) 0%, rgba(197,160,89,0.15) 55%, transparent 100%)',
              boxShadow: '0 0 20px 6px rgba(197,160,89,0.45)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Text layer — always centered, never displaced by chips */}
      <div
        className="absolute inset-0 flex items-center z-0 pointer-events-none"
        style={{ padding: '0 10px' }}
      >
        <span
          className={`text-left whitespace-nowrap ${textColor}`}
          style={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.01em', lineHeight: 1, flex: 1 }}
        >
          {opt.label}
        </span>
        <div className="flex items-center justify-center" style={{ minWidth: 28 }}>
          {(fullyLocked || showDarkLock) && (
            <LockIcon dim={hardLocked} onGold={true} />
          )}
        </div>
        <span
          className={`text-right whitespace-nowrap ${oddsColor}`}
          style={{ fontSize: '0.8rem', fontWeight: 900, lineHeight: 1, flex: 1 }}
        >
          {opt.payout}
        </span>
      </div>

      {/* Chip overlay — absolute, floats over text, pointer-events none so clicks pass through */}
      {chipsHere.length > 0 && (
        <div
          className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-around"
          style={{ padding: '3px 6px', overflow: 'visible' }}
        >
          {/* Row 1: P1–P5 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, overflow: 'visible' }}>
            {Array.from({ length: 5 }, (_, i) => {
              const chip = chipsHere.find(c => c.pid === i);
              if (!chip) return <span key={i} style={{ width: Math.round(24 * 0.65), height: Math.round(24 * 0.65) + 4, display: 'inline-block', flexShrink: 0 }} />;
              return (
                <Chip
                  key={i}
                  playerId={chip.pid}
                  amount={chip.amt}
                  scale={0.65}
                  draggable={gamePhase === 'betting' && chip.pid === activePlayerId}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData('text/plain', JSON.stringify({ from: opt.key, type: 'rank', pid: chip.pid, amount: rankBets[opt.key] || 0 }));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  className="transition-transform hover:scale-110"
                  title={`P${chip.pid + 1}: $${chip.amt}`}
                  style={{ pointerEvents: 'auto', flexShrink: 0 }}
                />
              );
            })}
          </div>
          {/* Row 2: P6–P10 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, overflow: 'visible' }}>
            {Array.from({ length: 5 }, (_, i) => {
              const pid = i + 5;
              const chip = chipsHere.find(c => c.pid === pid);
              if (!chip) return <span key={pid} style={{ width: Math.round(24 * 0.65), height: Math.round(24 * 0.65) + 4, display: 'inline-block', flexShrink: 0 }} />;
              return (
                <Chip
                  key={pid}
                  playerId={chip.pid}
                  amount={chip.amt}
                  scale={0.65}
                  draggable={gamePhase === 'betting' && chip.pid === activePlayerId}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData('text/plain', JSON.stringify({ from: opt.key, type: 'rank', pid: chip.pid, amount: rankBets[opt.key] || 0 }));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  className="transition-transform hover:scale-110"
                  title={`P${chip.pid + 1}: $${chip.amt}`}
                  style={{ pointerEvents: 'auto', flexShrink: 0 }}
                />
              );
            })}
          </div>
        </div>
      )}

      {isLeading && !isWinner && (
        <div className="absolute inset-0 rounded-lg bg-white/10 animate-pulse pointer-events-none" />
      )}
      {isWinner && (
        <div className="absolute inset-0 rounded-lg bg-yellow-400/10 animate-pulse pointer-events-none" />
      )}
    </motion.button>
  );
}

export default function RankBets({
  rankBets, allRankBets, playerCount, onRankBet, onRemoveRankBet, onMoveRankBet,
  gamePhase, winningRank, leadingRank, disabled, killSwitchActive,
  handBetCount, maxRankSlots, rankBetCount, unlockedRanks,
  activePlayerId,
  onAttemptLockedRank, onHoverRankRow,
}) {
  const canBet = gamePhase === 'betting' && !disabled && !killSwitchActive;
  const hasMathFilter = unlockedRanks && unlockedRanks.size > 0;
  const noHandBets = !handBetCount || handBetCount === 0;

  return (
    <div className="relative flex flex-col h-full" style={{ overflow: 'visible' }}>
      {/* Header */}
      <div
        className="text-xs font-bold tracking-wider uppercase mb-1 text-center flex-shrink-0 transition-all duration-500"
        style={{
          background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Hand Rank Board
      </div>

      {/* Kill Switch Overlay */}
      {killSwitchActive && gamePhase === 'betting' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-black/80 border-2 border-red-700/60 backdrop-blur-sm">
          <span className="text-red-400 font-black text-lg mb-1">LOCKED</span>
          <span className="text-red-300 text-xs font-semibold text-center px-2">4 Hands: Side Bets Disabled</span>
          <span className="text-red-400/60 text-xs mt-1 text-center px-2">Select 1–3 hands to unlock</span>
        </div>
      )}

      {/* Rank slot rows */}
      <div className="flex flex-col flex-1 min-h-0 gap-1">
        {RANK_BET_OPTIONS.map(opt => {
          const bet = rankBets[opt.key] || 0;
          const isWinner = winningRank === opt.key;
          const isLeading = leadingRank === opt.key && !isWinner;

          const currentRankSlots = Object.keys(rankBets).length;
          const slotLimitReached = maxRankSlots > 0 && !rankBets[opt.key] && currentRankSlots >= maxRankSlots;
          const isKillLocked = !!killSwitchActive;
          const isSlotLocked = slotLimitReached;
          const isMathLocked = hasMathFilter && !unlockedRanks.has(opt.key) && bet === 0 && gamePhase === 'betting';

          return (
            <div
              key={opt.key}
              className="relative flex-1 min-h-0"
              onMouseEnter={() => onHoverRankRow && !isMathLocked && !noHandBets && onHoverRankRow(opt.key)}
              onMouseLeave={() => onHoverRankRow && onHoverRankRow(null)}
            >
              <RankSlot
                opt={opt}
                rankBets={rankBets}
                allRankBets={allRankBets}
                playerCount={playerCount}
                canBet={canBet}
                isWinner={isWinner}
                isLeading={isLeading}
                isKillLocked={isKillLocked}
                isSlotLocked={isSlotLocked}
                isMathLocked={isMathLocked}
                noHandBets={noHandBets}
                onRankBet={onRankBet}
                onRemoveRankBet={onRemoveRankBet}
                onMoveRankBet={onMoveRankBet}
                gamePhase={gamePhase}
                unlockedRanks={unlockedRanks}
                killSwitchActive={killSwitchActive}
                activePlayerId={activePlayerId}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}