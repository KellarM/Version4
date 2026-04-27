import { useState } from 'react';
import { X, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CARDED_HAND_PAYOUTS, HAND_RANK_PAYOUTS, COLOR_BOARD_PAYOUTS, LOW_HIGH_PAYOUT } from '@/lib/payoutConstants';

const FIXED_HANDS = [
  { id: 1,  label: 'A♦ / 10♥', payout: CARDED_HAND_PAYOUTS[0] },
  { id: 2,  label: 'K♣ / K♠',  payout: CARDED_HAND_PAYOUTS[1] },
  { id: 3,  label: 'Q♣ / J♠',  payout: CARDED_HAND_PAYOUTS[2] },
  { id: 4,  label: 'Q♠ / 10♠', payout: CARDED_HAND_PAYOUTS[3] },
  { id: 5,  label: 'J♣ / 9♣',  payout: CARDED_HAND_PAYOUTS[4] },
  { id: 6,  label: '8♦ / 6♦',  payout: CARDED_HAND_PAYOUTS[5] },
  { id: 7,  label: '7♦ / 7♠',  payout: CARDED_HAND_PAYOUTS[6] },
  { id: 8,  label: '4♥ / 2♥',  payout: CARDED_HAND_PAYOUTS[7] },
  { id: 9,  label: '3♣ / 3♥',  payout: CARDED_HAND_PAYOUTS[8] },
  { id: 10, label: 'A♥ / 5♦',  payout: CARDED_HAND_PAYOUTS[9] },
];

const RANK_BETS = [
  { name: 'Four of a Kind',  payout: `${HAND_RANK_PAYOUTS['Four of a Kind']}:1`,  note: '', color: 'text-yellow-300' },
  { name: 'Full House',      payout: `${HAND_RANK_PAYOUTS['Full House']}:1`,      note: '', color: 'text-green-300' },
  { name: 'Flush',           payout: `${HAND_RANK_PAYOUTS['Flush']}:1`,           note: '', color: 'text-blue-300' },
  { name: 'Straight',        payout: `${HAND_RANK_PAYOUTS['Straight']}:1`,        note: '', color: 'text-teal-300' },
  { name: 'Three of a Kind', payout: `${HAND_RANK_PAYOUTS['Three of a Kind']}:1`, note: '', color: 'text-green-300' },
  { name: 'Two Pair',        payout: `${HAND_RANK_PAYOUTS['Two Pair']}:1`,        note: '(minimum qualifying rank)', color: 'text-green-300' },
];

const COLOR_BETS = [
  { key: '3 Red',   payout: `${COLOR_BOARD_PAYOUTS['3R']}:1` },
  { key: '4 Red',   payout: `${COLOR_BOARD_PAYOUTS['4R']}:1` },
  { key: '5 Red',   payout: `${COLOR_BOARD_PAYOUTS['5R']}:1` },
  { key: '3 Black', payout: `${COLOR_BOARD_PAYOUTS['3B']}:1` },
  { key: '4 Black', payout: `${COLOR_BOARD_PAYOUTS['4B']}:1` },
  { key: '5 Black', payout: `${COLOR_BOARD_PAYOUTS['5B']}:1` },
];

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 bg-slate-800/80 hover:bg-slate-700/60 transition-colors"
      >
        <span className="font-bold text-yellow-400 text-sm tracking-wide uppercase">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 py-4 bg-slate-900/40 text-sm text-gray-300 space-y-2">{children}</div>}
    </div>
  );
}

function Rule({ label, children }) {
  return (
    <div className="flex gap-2">
      <span className="text-yellow-500 mt-0.5 flex-shrink-0">•</span>
      <div><span className="text-white font-semibold">{label}</span>{children && <span className="text-gray-300"> — {children}</span>}</div>
    </div>
  );
}

export default function GameRulesModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-700/50 bg-blue-900/20 text-blue-300 text-xs font-bold hover:border-blue-500 hover:bg-blue-900/40 transition-all"
      >
        <BookOpen className="w-3.5 h-3.5" />
        Game Rules
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-yellow-700/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-700/30 bg-gradient-to-r from-yellow-900/30 to-orange-900/20 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-yellow-400" />
                    <h2 className="text-xl font-black text-yellow-400" style={{ fontFamily: 'Oswald, sans-serif' }}>
                      RAPID FIRE TEXAS HOLD'EM — GAME RULES
                    </h2>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">Everything you need to know to play</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-700 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

                {/* Overview */}
                <Section title="How the Game Works">
                  <Rule label="Objective">Bet on which of the 10 hands wins the round.</Rule>
                  <Rule label="Minimum Bet">$5 per betting spot.</Rule>
                  <Rule label="Hand Limits">Select 1 to 4 hands per round.</Rule>
                </Section>

                {/* Unlocking Side Bets */}
                <Section title="Unlocking Side Bets">
                  <Rule label="1 or 2 hands selected">Rank, Color, and River betting areas are unlocked.</Rule>
                  <Rule label="3 or 4 hands selected">Play is restricted to Hand bets only — Rank, Color, and River are locked.</Rule>
                  <Rule label="Rank Slots">1 hand = 1 Rank slot. 2 hands = 2 Rank slots.</Rule>
                </Section>

                {/* Snowball Caps */}
                <Section title="Snowball Caps">
                  <p className="text-gray-400 text-xs mb-3">Your previous bets determine the ceiling for each subsequent tier.</p>
                  <Rule label="Rank total">cannot exceed your total Hand bets.</Rule>
                  <Rule label="Color total">cannot exceed Hand + Rank bets combined.</Rule>
                  <Rule label="River total">cannot exceed Hand + Rank + Color bets combined.</Rule>
                </Section>

                {/* Rank Betting */}
                <Section title="Rank Betting — Payouts">
                  <p className="text-gray-400 text-xs mb-3">Bet on what poker rank the winning hand will achieve. Two Pair is the minimum qualifying rank. All ranks can be combined freely.</p>
                  <div className="space-y-1.5">
                    {RANK_BETS.map(r => (
                      <div key={r.name} className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-xs ${r.color}`}>{r.name}</span>
                          {r.note && <span className="text-gray-500 text-xs italic">{r.note}</span>}
                        </div>
                        <span className="text-yellow-400 font-bold text-xs ml-2">{r.payout}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Dependent Payouts */}
                <Section title="Winning">
                  <Rule label="Hand bets">pay if the hand you backed has the highest 7-card rank at the table — it must beat all 9 other hands.</Rule>
                  <Rule label="Rank bets">pay if the best 7-card hand rank at the table matches your bet — independent of which hand you backed.</Rule>
                  <Rule label="Color bets">pay based solely on the 5 community cards — if 4 red cards appear, all 4R bets win, regardless of which hand wins.</Rule>
                  <Rule label="River (Low/High) bets">pay based solely on the 5th community card — Low wins if it is a 2–7, High wins if it is an 8–A, regardless of which hand wins.</Rule>
                  <Rule label="Community Board Win">If the 5-card Community Board is stronger than all 10 carded hands at showdown, all Hand bets lose. Rank Board, Color Board, and River bets remain active and pay based on the board's final composition.</Rule>
                  <Rule label="Tie Bonus">If 2 or more hands tie for the winning position, the payout is calculated by dividing the hand's odds in half (1/2) + adding a 5% bonus in the player's favor.</Rule>
                </Section>

                {/* Card Hand Bets */}
                <Section title="Card Hand Bets — Payouts" defaultOpen={false}>
                  <p className="text-gray-400 text-xs mb-3">Bet on one (or more) of the 10 fixed starting hands.</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FIXED_HANDS.map(h => (
                      <div key={h.id} className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-1.5">
                        <span className="text-white font-semibold text-xs">Hand {h.id} — {h.label}</span>
                        <span className="text-yellow-400 font-bold text-xs ml-2">{h.payout}:1</span>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Color Board */}
                <Section title="Color Board Bets — Payouts" defaultOpen={false}>
                  <p className="text-gray-400 text-xs mb-3">Bet on how many Red or Black cards appear in the 5 community cards. Requires a Rank Bet (Master Key).</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {COLOR_BETS.map(c => (
                      <div key={c.key} className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-1.5">
                        <span className={`font-bold text-xs ${c.key.includes('Red') ? 'text-red-400' : 'text-gray-300'}`}>{c.key}</span>
                        <span className="text-yellow-400 font-bold text-xs">{c.payout}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Low / High */}
                <Section title="Low / High (River) Bet" defaultOpen={false}>
                  <Rule label="When available">After the Turn card is dealt. Requires a Rank Bet (Master Key).</Rule>
                  <Rule label="LOW">River card is 2–7. Pays {LOW_HIGH_PAYOUT}:1.</Rule>
                  <Rule label="HIGH">River card is 8–Ace. Pays {LOW_HIGH_PAYOUT}:1.</Rule>
                  <Rule label="Applies">Regardless of which hand wins — board-state bet only.</Rule>
                </Section>

                {/* Poker Hands Reference */}
                <Section title="Poker Hand Rankings (Highest to Lowest)" defaultOpen={false}>
                  <div className="space-y-1.5">
                    {[
                      ['Royal Flush',     'A, K, Q, J, 10 — all same suit'],
                      ['Four of a Kind',  'Four cards of the same rank — highest Rank Board bet'],
                      ['Full House',      'Three of a kind + a pair'],
                      ['Flush',           'Five cards of the same suit (not consecutive)'],
                      ['Straight',        'Five consecutive cards (mixed suits)'],
                      ['Three of a Kind', 'Three cards of the same rank'],
                      ['Two Pair',        'Two different pairs — minimum qualifying rank for Rank Board bets'],
                    ].map(([name, desc]) => (
                      <div key={name} className="flex gap-3 items-start">
                        <span className="text-yellow-400 font-bold text-xs w-36 flex-shrink-0">{name}</span>
                        <span className="text-gray-400 text-xs">{desc}</span>
                      </div>
                    ))}
                  </div>
                </Section>

              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-yellow-700/20 bg-slate-900/60 flex-shrink-0 flex justify-between items-center">
                <span className="text-gray-500 text-xs">Rapid Fire Texas Hold'em — RTP 96.5%</span>
                <button
                  onClick={() => setOpen(false)}
                  className="px-5 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black font-black text-sm transition-all"
                >
                  Got It!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}