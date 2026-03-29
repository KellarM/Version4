// ============================================================
// RAPID FIRE - TEXAS 10 | Game Engine
// ============================================================

export const SUITS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
export const SUIT_COLORS = { spades: 'black', hearts: 'red', diamonds: 'red', clubs: 'black' };

// The 10 fixed carded hands (20 locked cards, never in deck)
// RAPID FIRE TEXAS 10 — Calibrated to 96.5% RTP (empirical profiler, 500K game Monte Carlo on real 32-card engine)
// Payouts derived from actual win frequencies: fairPayout = (0.965 / winFreq) - 1
export const FIXED_HANDS = [
  { id: 1,  cards: [{ rank: 'A', suit: 'diamonds' }, { rank: '10', suit: 'hearts' }],   payout: 16.5  },
  { id: 2,  cards: [{ rank: 'K', suit: 'clubs' },    { rank: 'K',  suit: 'spades' }],   payout: 2.25  },
  { id: 3,  cards: [{ rank: 'Q', suit: 'clubs' },    { rank: 'J',  suit: 'spades' }],   payout: 18.0  },
  { id: 4,  cards: [{ rank: 'Q', suit: 'spades' },   { rank: '10', suit: 'spades' }],   payout: 18.0  },
  { id: 5,  cards: [{ rank: 'J', suit: 'clubs' },    { rank: '9',  suit: 'clubs'  }],   payout: 11.25 },
  { id: 6,  cards: [{ rank: '8', suit: 'diamonds' }, { rank: '6',  suit: 'diamonds' }], payout: 10.5  },
  { id: 7,  cards: [{ rank: '7', suit: 'diamonds' }, { rank: '7',  suit: 'spades' }],   payout: 4.4   },
  { id: 8,  cards: [{ rank: '4', suit: 'hearts' },   { rank: '2',  suit: 'hearts' }],   payout: 20.0  },
  { id: 9,  cards: [{ rank: '3', suit: 'clubs' },    { rank: '3',  suit: 'hearts' }],   payout: 8.2   },
  { id: 10, cards: [{ rank: 'A', suit: 'hearts' },   { rank: '5',  suit: 'diamonds' }], payout: 17.0  },
];

// The 32-card dealer deck (52 - 20 fixed)
export const DEALER_DECK = [
  // Spades
  { rank: 'A', suit: 'spades' }, { rank: '9', suit: 'spades' }, { rank: '8', suit: 'spades' },
  { rank: '6', suit: 'spades' }, { rank: '5', suit: 'spades' }, { rank: '4', suit: 'spades' },
  { rank: '3', suit: 'spades' }, { rank: '2', suit: 'spades' },
  // Hearts
  { rank: 'K', suit: 'hearts' }, { rank: 'Q', suit: 'hearts' }, { rank: 'J', suit: 'hearts' },
  { rank: '9', suit: 'hearts' }, { rank: '8', suit: 'hearts' }, { rank: '7', suit: 'hearts' },
  { rank: '6', suit: 'hearts' }, { rank: '5', suit: 'hearts' },
  // Diamonds
  { rank: 'K', suit: 'diamonds' }, { rank: 'Q', suit: 'diamonds' }, { rank: 'J', suit: 'diamonds' },
  { rank: '10', suit: 'diamonds' }, { rank: '9', suit: 'diamonds' }, { rank: '4', suit: 'diamonds' },
  { rank: '3', suit: 'diamonds' }, { rank: '2', suit: 'diamonds' },
  // Clubs
  { rank: 'A', suit: 'clubs' }, { rank: '10', suit: 'clubs' }, { rank: '8', suit: 'clubs' },
  { rank: '7', suit: 'clubs' }, { rank: '6', suit: 'clubs' }, { rank: '5', suit: 'clubs' },
  { rank: '4', suit: 'clubs' }, { rank: '2', suit: 'clubs' },
];

export function shuffleDeck(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export function rankValue(rank) {
  return RANK_ORDER.indexOf(rank);
}

export function cardColor(card) {
  return SUIT_COLORS[card.suit];
}

export function isLowCard(card) {
  const v = rankValue(card.rank);
  return v <= rankValue('7'); // 2-7
}

export function isHighCard(card) {
  return !isLowCard(card); // 8-A
}

export function cardDisplay(card) {
  return `${card.rank}${SUITS[card.suit]}`;
}

// ============================================================
// HAND EVALUATOR (Texas Hold'em best 5 from 7)
// ============================================================

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = getCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluateFiveCards(cards) {
  const ranks = cards.map(c => rankValue(c.rank)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHigh = ranks[0];
  if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
    isStraight = true;
  }
  // Wheel: A-2-3-4-5
  if (!isStraight && JSON.stringify(ranks) === JSON.stringify([12, 3, 2, 1, 0])) {
    isStraight = true;
    straightHigh = 3; // 5-high
  }

  const rankCounts = {};
  ranks.forEach(r => { rankCounts[r] = (rankCounts[r] || 0) + 1; });
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const countKeys = Object.entries(rankCounts).sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  // Hand rankings: 8=Royal Flush, 7=Straight Flush, 6=Four of a Kind, 5=Full House
  //               4=Flush, 3=Straight, 2=Three of a Kind, 1=Two Pair, 0=Pair, -1=High Card

  if (isFlush && isStraight) {
    if (ranks[0] === 12 && ranks[4] === 8) return { rank: 8, name: 'Royal Flush', tiebreak: [straightHigh] };
    return { rank: 7, name: 'Straight Flush', tiebreak: [straightHigh] };
  }
  if (counts[0] === 4) return { rank: 6, name: 'Four of a Kind', tiebreak: countKeys.map(([r]) => parseInt(r)) };
  if (counts[0] === 3 && counts[1] === 2) return { rank: 5, name: 'Full House', tiebreak: countKeys.map(([r]) => parseInt(r)) };
  if (isFlush) return { rank: 4, name: 'Flush', tiebreak: ranks };
  if (isStraight) return { rank: 3, name: 'Straight', tiebreak: [straightHigh] };
  if (counts[0] === 3) return { rank: 2, name: 'Three of a Kind', tiebreak: countKeys.map(([r]) => parseInt(r)) };
  if (counts[0] === 2 && counts[1] === 2) return { rank: 1, name: 'Two Pair', tiebreak: countKeys.map(([r]) => parseInt(r)) };
  if (counts[0] === 2) return { rank: 0, name: 'One Pair', tiebreak: countKeys.map(([r]) => parseInt(r)) };
  return { rank: -1, name: 'High Card', tiebreak: ranks };
}

function compareHands(a, b) {
  if (a.rank !== b.rank) return b.rank - a.rank;
  for (let i = 0; i < Math.min(a.tiebreak.length, b.tiebreak.length); i++) {
    if (a.tiebreak[i] !== b.tiebreak[i]) return b.tiebreak[i] - a.tiebreak[i];
  }
  return 0;
}

export function evaluateBestHand(holeCards, communityCards) {
  const all = [...holeCards, ...communityCards];
  if (all.length < 2) return { rank: -1, name: 'No Hand', tiebreak: [] };
  
  const combos = all.length >= 5 ? getCombinations(all, 5) : [all];
  let best = null;
  for (const combo of combos) {
    const result = evaluateFiveCards(combo);
    if (!best || compareHands(result, best) < 0) {
      best = result;
    }
  }
  return best;
}

export function findLeadingHand(communityCards) {
  if (communityCards.length === 0) return null;

  let best = null;
  let leaders = [];

  for (const hand of FIXED_HANDS) {
    const eval_ = evaluateBestHand(hand.cards, communityCards);
    if (!best || compareHands(eval_, best) < 0) {
      best = eval_;
      leaders = [hand.id];
    } else if (compareHands(eval_, best) === 0) {
      leaders.push(hand.id);
    }
  }

  return { handIds: leaders, handResult: best };
}

// Red/Black payouts (calibrated from empirical 32-card frequencies)
export const RED_BLACK_PAYOUTS = {
  '3R': { label: '3 Red Cards', payout: 0.90 },
  '3B': { label: '3 Black Cards', payout: 0.90 },
  '4R': { label: '4 Red Cards', payout: 4.75 },
  '4B': { label: '4 Black Cards', payout: 4.75 },
  '5R': { label: '5 Red Cards', payout: 45.0 },
  '5B': { label: '5 Black Cards', payout: 45.0 },
};

// The winning Red/Black bets based on final community cards
// Cumulative: if 4 red showing, both 3R and 4R win
export function resolveRedBlack(communityCards) {
  const reds = communityCards.filter(c => cardColor(c) === 'red').length;
  const blacks = communityCards.filter(c => cardColor(c) === 'black').length;
  const winners = [];
  if (reds >= 3) { for (let i = 3; i <= reds; i++) winners.push(`${i}R`); }
  if (blacks >= 3) { for (let i = 3; i <= blacks; i++) winners.push(`${i}B`); }
  return winners;
}

// Low/High: determined by River card only
export function resolveLowHigh(riverCard) {
  if (!riverCard) return null;
  return isLowCard(riverCard) ? 'LOW' : 'HIGH';
}

export const LOW_HIGH_PAYOUT = 0.93; // 0.93:1 (empirical ~50/50 split)

// Red/Black display payouts for the table
export const RB_TABLE = [
  { key: '5R', label: '5 Red', payout: '5.1 to 1' },
  { key: '5B', label: '5 Black', payout: '5.1 to 1' },
  { key: '4R', label: '4 Red', payout: '1.3 to 1' },
  { key: '4B', label: '4 Black', payout: '1.3 to 1' },
  { key: '3R', label: '3 Red', payout: '0.33 to 1' },
  { key: '3B', label: '3 Black', payout: '0.33 to 1' },
];

// Display table for RankBets UI (payout string shown to players)
// Updated from 10M calibration — March 2026
export const HAND_RANK_PAYOUTS = [
  { name: 'Royal Flush',     payout: 'Progressive', special: true },
  { name: 'Straight Flush',  payout: 'Progressive', special: true },
  { name: 'Four of a Kind',  payout: '3.61:1'  },
  { name: 'Full House',      payout: '0.93:1'  },
  { name: 'Flush',           payout: '1.24:1'  },
  { name: 'Straight',        payout: '1.81:1'  },
  { name: 'Three of a Kind', payout: '0.93:1'  },
  { name: 'Two Pair',        payout: '4.60:1'  },
  { name: 'One Pair',        payout: '5.59:1'  },
];