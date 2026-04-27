import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ALERT_CONFIGS = {
  closed: {
    gradient: 'from-red-600 to-red-700',
    border: 'border-red-400',
    text: 'text-red-100',
    title: 'Rank Betting Closed',
    body: '3 or more hands selected — Rank, Color, and River are locked.',
    sub: 'Reduce to 1–2 hand selections to unlock side markets.',
  },
  limit: {
    gradient: 'from-orange-600 to-orange-700',
    border: 'border-orange-400',
    text: 'text-orange-100',
    title: 'Rank Slot Limit Reached',
    body: '1 hand bet = 1 rank slot. 2 hand bets = 2 rank slots.',
    sub: 'You cannot add another rank bet at your current hand count.',
  },
  no_hands: {
    gradient: 'from-orange-600 to-orange-700',
    border: 'border-orange-400',
    text: 'text-orange-100',
    title: 'Hand Bet Required',
    body: 'You must place at least 1 Hand bet before betting on Rank.',
    sub: 'Select a hand first, then return to the Rank Board.',
  },
  rank_cap: {
    gradient: 'from-red-700 to-red-800',
    border: 'border-red-500',
    text: 'text-red-100',
    title: 'Snowball Cap — Rank',
    body: 'Rank bets cannot exceed total hand bets.',
    sub: 'Increase your hand bets or reduce rank bets to continue.',
  },
  color_cap: {
    gradient: 'from-red-700 to-red-800',
    border: 'border-red-500',
    text: 'text-red-100',
    title: 'Snowball Cap — Color',
    body: 'Color bets cannot exceed Hand + Rank total.',
    sub: 'Add more hand or rank bets to unlock additional color betting.',
  },
  color_locked: {
    gradient: 'from-red-600 to-red-700',
    border: 'border-red-400',
    text: 'text-red-100',
    title: 'Color Board Locked',
    body: '3 or more hands selected — side markets are disabled.',
    sub: 'Reduce to 1–2 hand selections to access Color bets.',
  },
  river_cap: {
    gradient: 'from-red-700 to-red-800',
    border: 'border-red-500',
    text: 'text-red-100',
    title: 'Snowball Cap — River',
    body: 'River bets cannot exceed Hand + Rank + Color total.',
    sub: 'Increase your earlier tier bets to unlock a larger River bet.',
  },
  round_limit: {
    gradient: 'from-red-700 to-red-800',
    border: 'border-red-500',
    text: 'text-red-100',
    title: 'Round Limit Reached',
    body: 'You have reached the maximum bet for this round.',
    sub: 'The Snowball Caps limit total bets per tier. Start a new round to reset.',
  },
  impossible: {
    gradient: 'from-gray-800 to-gray-900',
    border: 'border-yellow-900/60',
    text: 'text-yellow-200/80',
    title: 'Mathematically Impossible',
    body: 'This rank has 0% probability given your current hand selection.',
    sub: 'Add a pocket pair hand (K/K, 7/7, or 3/3) to unlock Four of a Kind.',
  },
  color_needs_rank: {
    gradient: 'from-amber-700 to-amber-800',
    border: 'border-amber-400',
    text: 'text-amber-100',
    title: 'Rank Bet Required',
    body: 'The Color Board is locked until you place a Rank Bet.',
    sub: 'Place at least one Rank Bet first — it is the key to unlocking Color and River.',
  },
  river_needs_rank: {
    gradient: 'from-amber-700 to-amber-800',
    border: 'border-amber-400',
    text: 'text-amber-100',
    title: 'Rank Bet Required',
    body: 'The River Window is locked until you place a Rank Bet.',
    sub: 'A Rank Bet is required to access the River. Color is optional.',
  },
};

export default function RankBetLimitAlert({ isOpen, onClose, currentHandBets, alertType = 'limit', maxRankSlots }) {
  const [countdown, setCountdown] = useState(2);
  const [dismissing, setDismissing] = useState(false);
  const consumedRef = useRef(false);

  const dismiss = () => {
    if (dismissing || !isOpen) return;
    setDismissing(true);
    setTimeout(() => {
      onClose();
      setDismissing(false);
      consumedRef.current = false;
    }, 100);
  };

  useEffect(() => {
    if (!isOpen) {
      setCountdown(2);
      setDismissing(false);
      consumedRef.current = false;
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          dismiss();
          return 2;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (!consumedRef.current) {
        consumedRef.current = true;
        e.stopPropagation();
        dismiss();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, { capture: true });
    return () => document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
  }, [isOpen, dismissing]);

  const cfg = ALERT_CONFIGS[alertType] || ALERT_CONFIGS.limit;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: dismissing ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dismissing ? 0.1 : 0.25 }}
            className="fixed inset-0 z-30 bg-black/60"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -50 }}
            animate={{ opacity: dismissing ? 0 : 1, scale: dismissing ? 0.9 : 1, y: dismissing ? -30 : 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            transition={{ duration: dismissing ? 0.1 : 0.3 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div
              className={`bg-gradient-to-b ${cfg.gradient} border-2 ${cfg.border} rounded-2xl px-8 py-6 shadow-2xl max-w-sm pointer-events-auto`}
            >
              <div className="text-center">
                <div className="text-white font-black text-2xl mb-2">⚠️</div>
                <h2 className="text-white font-bold text-xl mb-4">{cfg.title}</h2>
                <p className={`${cfg.text} text-lg font-semibold mb-3`}>{cfg.body}</p>
                <p className={`${cfg.text} text-sm font-medium mb-5`}>{cfg.sub}</p>
                {!dismissing && (
                  <div className={cfg.text + ' text-sm'}>
                    Closing in <span className="font-black text-white text-lg">{countdown}</span> seconds
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}