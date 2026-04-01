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
  { name: 'Straight Flush',  payout: `${HAND_RANK_PAYOUTS['Straight Flush']}:1`,  note: '', color: 'text-orange-300' },
  { name: 'Four of a Kind',  payout: `${HAND_RANK_PAYOUTS['Four of a Kind']}:1`,  note: '', color: 'text-yellow-300' },
  { name: 'Full House',      payout: `${HAND_RANK_PAYOUTS['Full House']}:1`,      note: '', color: 'text-green-300' },
  { name: 'Flush',           payout: `${HAND_RANK_PAYOUTS['Flush']}:1`,           note: '', color: 'text-blue-300' },
  { name: 'Straight',        payout: `${HAND_RANK_PAYOUTS['Straight']}:1`,        note: '', color: 'text-teal-300' },
  { name: 'Three of a Kind', payout: `${HAND_RANK_PAYOUTS['Three of a Kind']}:1`, note: '', color: 'text-green-300' },
  { name: 'Two Pair',        payout: `${HAND_RANK_PAYOUTS['Two Pair']}:1`,        note: '', color: 'text-green-300' },
  { name: 'One Pair',        payout: `${HAND_RANK_PAYOUTS['One Pair']}:1`,        note: '', color: 'text-green-300' },
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
                      RAPID FIRE TEXAS 10 — GAME RULES
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
                  <Rule label="Objective">Bet on which of the 10 fixed starting hands will form the best 5-card poker hand using the 5 community cards dealt on the board.</Rule>
                  <Rule label="Community Cards">Five cards are revealed in three stages — Flop (3 cards), Turn (1 card), and River (1 card).</Rule>
                  <Rule label="Winning Hand">The fixed hand that forms the highest-ranking 5-card poker hand (using its 2 hole cards + 5 community cards) wins. Ties are split.</Rule>
                  <Rule label="No Player Decisions">Once bets are placed and the Deal button is pressed, the outcome is determined by the cards — no further choices affect the hand result.</Rule>
                </Section>

                {/* Game Flow */}
                <Section title="Round Flow">
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      ['1. Betting Phase', 'Place bets on any combination of Card Hands, Hand Ranks, and Color Board before the deal.'],
                      ['2. Deal Flop', '3 community cards are revealed. The leading hand is announced.'],
                      ['3. Deal Turn', '4th community card is revealed. Low/High betting opens for the River card.'],
                      ['4. Low / High Betting', 'Optional bet on whether the River card will be Low (2–7) or High (8–Ace).'],
                      ['5. Deal River', '5th and final community card is revealed. All bets are settled.'],
                      ['6. New Round', 'Collect winnings and start the next round.'],
                    ].map(([step, desc]) => (
                      <div key={step} className="flex gap-3 items-start">
                        <span className="text-yellow-400 font-bold text-xs whitespace-nowrap mt-0.5 w-36 flex-shrink-0">{step}</span>
                        <span className="text-gray-300 text-xs">{desc}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Card Hand Bets */}
                <Section title="Card Hand Bets — Payouts">
                  <p className="text-gray-400 text-xs mb-3">Bet on one (or more) of the 10 fixed starting hands. Win if your chosen hand achieves the best poker rank on the board.</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FIXED_HANDS.map(h => (
                      <div key={h.id} className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-1.5">
                        <span className="text-white font-semibold text-xs">Hand {h.id} — {h.label}</span>
                        <span className="text-yellow-400 font-bold text-xs ml-2">{h.payout}:1</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-blue-900/20 border border-blue-700/40 rounded-lg px-4 py-2 space-y-1">
                    <p className="text-blue-300 font-semibold text-xs">Betting Limits:</p>
                    <Rule label="0–2 Hand Rank bets">max 2 Carded Hand bets allowed.</Rule>
                    <Rule label="3+ Hand Rank bets">all Carded Hand bets locked.</Rule>
                    <Rule label="Right-click or use Clear">to remove a bet before the deal.</Rule>
                  </div>
                </Section>

                {/* Hand Rank Bets */}
                <Section title="Hand Rank Bets — Payouts">
                  <p className="text-gray-400 text-xs mb-3">Bet on what poker rank the winning hand will achieve.</p>
                  <div className="space-y-1.5">
                    {RANK_BETS.map(r => (
                      <div key={r.name} className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-1.5">
                        <div>
                          <span className={`font-bold text-xs ${r.color}`}>{r.name}</span>
                          {r.note && <span className="text-gray-500 text-xs ml-2">({r.note})</span>}
                        </div>
                        <span className="text-yellow-400 font-bold text-xs ml-2">{r.payout}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-purple-900/20 border border-purple-700/40 rounded-lg px-4 py-2 space-y-1">
                    <p className="text-purple-300 font-semibold text-xs">Hand Rank Betting Rules:</p>
                    <Rule label="0 card hand bets">unlimited rank bets — all positions open.</Rule>
                    <Rule label="1–2 card hand bets">max 2 rank bets allowed.</Rule>
                    <Rule label="3+ card hand bets">all rank bets locked.</Rule>
                    <Rule label="One Pair isolation">One Pair must be bet exclusively — cannot be combined with any other rank bet, and vice versa.</Rule>
                    <Rule label="No minimum bet">required — all ranks are standard fixed-odds bets.</Rule>
                  </div>
                </Section>

                {/* Color Board */}
                <Section title="Color Board Bets — Payouts">
                  <p className="text-gray-400 text-xs mb-3">Bet on how many Red or Black cards appear in the 5 community cards. Multiple color bets can be placed at once.</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {COLOR_BETS.map(c => (
                      <div key={c.key} className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-1.5">
                        <span className={`font-bold text-xs ${c.key.includes('Red') ? 'text-red-400' : 'text-gray-300'}`}>{c.key}</span>
                        <span className="text-yellow-400 font-bold text-xs">{c.payout}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-500 text-xs mt-2">Example: "4 Red" pays {COLOR_BOARD_PAYOUTS['4R']}:1 if at least 4 of the 5 community cards are red.</p>
                </Section>

                {/* Low / High */}
                <Section title="Low / High Bet">
                  <Rule label="When available">After the Turn card is dealt, you may bet on the River card.</Rule>
                  <Rule label="LOW">River card is 2, 3, 4, 5, 6, or 7. Pays {LOW_HIGH_PAYOUT}:1.</Rule>
                  <Rule label="HIGH">River card is 8, 9, 10, J, Q, K, or A. Pays {LOW_HIGH_PAYOUT}:1.</Rule>
                  <Rule label="Max bet size">Equal to your total board bets (Card Hands + Rank + Color) combined for that round.</Rule>
                </Section>

                {/* Poker Hands Reference */}
                <Section title="Poker Hand Rankings (Highest to Lowest)" defaultOpen={false}>
                  <div className="space-y-1.5">
                    {[
                      ['Royal Flush',     'A, K, Q, J, 10 — all same suit'],
                      ['Straight Flush',  'Five consecutive cards, all same suit'],
                      ['Four of a Kind',  'Four cards of the same rank'],
                      ['Full House',      'Three of a kind + a pair'],
                      ['Flush',           'Five cards of the same suit (not consecutive)'],
                      ['Straight',        'Five consecutive cards (mixed suits)'],
                      ['Three of a Kind', 'Three cards of the same rank'],
                      ['Two Pair',        'Two different pairs'],
                      ['One Pair',        'Two cards of the same rank'],
                    ].map(([name, desc]) => (
                      <div key={name} className="flex gap-3 items-start">
                        <span className="text-yellow-400 font-bold text-xs w-36 flex-shrink-0">{name}</span>
                        <span className="text-gray-400 text-xs">{desc}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Tips */}
                <Section title="Quick Tips for New Players" defaultOpen={false}>
                  <Rule label="Start simple">Place 1–2 card hand bets and watch how the community cards develop before adding more bets.</Rule>
                  <Rule label="Use chips wisely">Select your chip denomination ($5–$100) before clicking a betting spot. Right-click to remove a bet.</Rule>
                  <Rule label="Track the board">Watch the Color Board highlights — they update live as each community card is revealed.</Rule>
                  <Rule label="Low/High timing">Wait until 4 community cards are showing before deciding LOW or HIGH — you'll have better information.</Rule>
                  <Rule label="High-odds bets">One Pair (158.34:1) and Straight Flush (255.42:1) are rare but pay fixed odds — no minimum bet required.</Rule>
                  <Rule label="Repeat bets">After your first round, the Repeat button lets you instantly re-place the same bets for the next round.</Rule>
                </Section>

              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-yellow-700/20 bg-slate-900/60 flex-shrink-0 flex justify-between items-center">
                <span className="text-gray-500 text-xs">Rapid Fire Texas 10 — RTP 96.5%</span>
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