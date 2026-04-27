import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { CONST, SUITS, SUIT_COLORS } from '@/lib/gameEngine';

const HAND_NAMES = [
  'H1','H2','H3','H4','H5','H6','H7','H8','H9','H10',
];

const SUIT_BG = {
  spades:   'bg-slate-700 border-slate-500',
  clubs:    'bg-slate-700 border-slate-500',
  hearts:   'bg-red-900/60 border-red-700',
  diamonds: 'bg-red-900/60 border-red-700',
};

function CardPip({ rank, suit }) {
  const color = SUIT_COLORS[suit] === 'red' ? 'text-red-400' : 'text-slate-200';
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded border text-xs font-bold ${SUIT_BG[suit]} ${color}`}>
      {rank}{SUITS[suit]}
    </span>
  );
}

export default function DeckInspector() {
  const hands = [];
  for (let i = 0; i < 10; i++) {
    hands.push({
      name: HAND_NAMES[i],
      c1: CONST.PLAYER_HOLE_CARDS[i * 2],
      c2: CONST.PLAYER_HOLE_CARDS[i * 2 + 1],
    });
  }

  const dealerCards = [...CONST.DEALER_DECK];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4 pb-16">
      <div className="max-w-5xl mx-auto">

        <div className="mb-6">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm mb-3 inline-block">← Back to Game</Link>
          <div className="flex items-center gap-3 mb-1">
            <Layers className="w-8 h-8 text-yellow-400" />
            <h1 className="text-3xl font-bold">Deck Inspector</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Visualizes the absolute deck state. Player hole cards are permanently locked.
            The dealer is restricted to exactly these 32 cards.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Column A — Locked Players */}
          <div className="bg-slate-800/60 border border-yellow-700/40 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-yellow-700/30 bg-yellow-900/10">
              <h2 className="font-bold text-yellow-300 text-sm tracking-wide uppercase">
                Column A — Locked Players
              </h2>
              <p className="text-yellow-400/60 text-xs mt-0.5">20 hole cards · permanently removed from dealer pool</p>
            </div>
            <div className="p-4 space-y-2">
              {hands.map(h => (
                <div key={h.name} className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs w-6 font-mono">{h.name}</span>
                  <div className="flex gap-2">
                    <CardPip rank={h.c1.rank} suit={h.c1.suit} />
                    <CardPip rank={h.c2.rank} suit={h.c2.suit} />
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-3 border-t border-slate-700 text-xs text-gray-500">
                {CONST.PLAYER_HOLE_CARDS.length} cards locked · {10} hands
              </div>
            </div>
          </div>

          {/* Column B — Dealer Inventory */}
          <div className="bg-slate-800/60 border border-blue-700/40 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-blue-700/30 bg-blue-900/10">
              <h2 className="font-bold text-blue-300 text-sm tracking-wide uppercase">
                Column B — Dealer Inventory
              </h2>
              <p className="text-blue-400/60 text-xs mt-0.5">32 cards · only these may appear on the board</p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {dealerCards.map((card, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs w-5 font-mono text-right">{idx + 1}.</span>
                    <CardPip rank={card.rank} suit={card.suit} />
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700 text-xs text-gray-500">
                {CONST.DEALER_DECK.length} cards in dealer pool · 5 drawn per round
              </div>
            </div>
          </div>

        </div>

        {/* Integrity notice */}
        <div className="mt-6 bg-slate-800/40 border border-slate-700 rounded-xl px-5 py-4 text-xs text-gray-400 space-y-1">
          <p className="font-semibold text-gray-300">Deck Integrity Constraints</p>
          <p>• Total deck: 52 standard cards = 20 locked player hole cards + 32 dealer cards.</p>
          <p>• Every deal calls <code className="text-green-400 bg-slate-900 px-1 rounded">getSecureRandomBoard()</code> which clones
            <code className="text-blue-300 bg-slate-900 px-1 rounded">CONST.DEALER_DECK</code> fresh, applies Fisher-Yates, and slices 5 cards.</p>
          <p>• The source constant is frozen — no mutation is possible at runtime.</p>
          <p>• The audit worker independently verifies each deal and flags consecutive identical boards.</p>
        </div>
      </div>
    </div>
  );
}