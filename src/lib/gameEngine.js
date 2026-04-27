// ============================================================
// RAPID FIRE TEXAS HOLD'EM | Game Engine
// ============================================================

import { CARDED_HAND_PAYOUTS } from '@/lib/payoutConstants';

export const SUITS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
export const SUIT_COLORS = { spades: 'black', hearts: 'red', diamonds: 'red', clubs: 'black' };

// ============================================================
// CONST — Absolute deck definitions (single source of truth)
// ============================================================
export const CONST = Object.freeze({
  PLAYER_HOLE_CARDS: Object.freeze([
    // H1
    Object.freeze({ rank: 'A',  suit: 'diamonds' }),
    Object.freeze({ rank: '10', suit: 'hearts'   }),
    // H2
    Object.freeze({ rank: 'K',  suit: 'clubs'    }),
    Object.freeze({ rank: 'K',  suit: 'spades'   }),
    // H3
    Object.freeze({ rank: 'Q',  suit: 'clubs'    }),
    Object.freeze({ rank: 'J',  suit: 'spades'   }),
    // H4
    Object.freeze({ rank: 'Q',  suit: 'spades'   }),
    Object.freeze({ rank: '10', suit: 'spades'   }),
    // H5
    Object.freeze({ rank: 'J',  suit: 'clubs'    }),
    Object.freeze({ rank: '9',  suit: 'clubs'    }),
    // H6
    Object.freeze({ rank: '8',  suit: 'diamonds' }),
    Object.freeze({ rank: '6',  suit: 'diamonds' }),
    // H7
    Object.freeze({ rank: '7',  suit: 'diamonds' }),
    Object.freeze({ rank: '7',  suit: 'spades'   }),
    // H8
    Object.freeze({ rank: '4',  suit: 'hearts'   }),
    Object.freeze({ rank: '2',  suit: 'hearts'   }),
    // H9
    Object.freeze({ rank: '3',  suit: 'clubs'    }),
    Object.freeze({ rank: '3',  suit: 'hearts'   }),
    // H10
    Object.freeze({ rank: 'A',  suit: 'hearts'   }),
    Object.freeze({ rank: '5',  suit: 'diamonds' }),
  ]),

  DEALER_DECK: Object.freeze([
    // Spades (8 cards — J♠ K♠ removed for hands)
    Object.freeze({ rank: 'A', suit: 'spades' }),
    Object.freeze({ rank: '9', suit: 'spades' }),
    Object.freeze({ rank: '8', suit: 'spades' }),
    Object.freeze({ rank: '6', suit: 'spades' }),
    Object.freeze({ rank: '5', suit: 'spades' }),
    Object.freeze({ rank: '4', suit: 'spades' }),
    Object.freeze({ rank: '3', suit: 'spades' }),
    Object.freeze({ rank: '2', suit: 'spades' }),
    // Hearts (8 cards — A♥ 4♥ 2♥ removed for hands)
    Object.freeze({ rank: 'K', suit: 'hearts' }),
    Object.freeze({ rank: 'Q', suit: 'hearts' }),
    Object.freeze({ rank: 'J', suit: 'hearts' }),
    Object.freeze({ rank: '9', suit: 'hearts' }),
    Object.freeze({ rank: '8', suit: 'hearts' }),
    Object.freeze({ rank: '7', suit: 'hearts' }),
    Object.freeze({ rank: '6', suit: 'hearts' }),
    Object.freeze({ rank: '5', suit: 'hearts' }),
    // Diamonds (8 cards — A♦ 8♦ 6♦ 7♦ 5♦ removed for hands)
    Object.freeze({ rank: 'K',  suit: 'diamonds' }),
    Object.freeze({ rank: 'Q',  suit: 'diamonds' }),
    Object.freeze({ rank: 'J',  suit: 'diamonds' }),
    Object.freeze({ rank: '10', suit: 'diamonds' }),
    Object.freeze({ rank: '9',  suit: 'diamonds' }),
    Object.freeze({ rank: '4',  suit: 'diamonds' }),
    Object.freeze({ rank: '3',  suit: 'diamonds' }),
    Object.freeze({ rank: '2',  suit: 'diamonds' }),
    // Clubs (8 cards — K♣ Q♣ J♣ 9♣ 3♣ removed for hands)
    Object.freeze({ rank: 'A',  suit: 'clubs' }),
    Object.freeze({ rank: '10', suit: 'clubs' }),
    Object.freeze({ rank: '8',  suit: 'clubs' }),
    Object.freeze({ rank: '7',  suit: 'clubs' }),
    Object.freeze({ rank: '6',  suit: 'clubs' }),
    Object.freeze({ rank: '5',  suit: 'clubs' }),
    Object.freeze({ rank: '4',  suit: 'clubs' }),
    Object.freeze({ rank: '2',  suit: 'clubs' }),
  ]),
});

// The 10 fixed carded hands (20 locked cards, never in deck)
// Payouts sourced from payoutConstants.js (CARDED_HAND_PAYOUTS) — single source of truth
export const FIXED_HANDS = [
  { id: 1,  cards: [CONST.PLAYER_HOLE_CARDS[0],  CONST.PLAYER_HOLE_CARDS[1]  ], payout: CARDED_HAND_PAYOUTS[0]  },
  { id: 2,  cards: [CONST.PLAYER_HOLE_CARDS[2],  CONST.PLAYER_HOLE_CARDS[3]  ], payout: CARDED_HAND_PAYOUTS[1]  },
  { id: 3,  cards: [CONST.PLAYER_HOLE_CARDS[4],  CONST.PLAYER_HOLE_CARDS[5]  ], payout: CARDED_HAND_PAYOUTS[2]  },
  { id: 4,  cards: [CONST.PLAYER_HOLE_CARDS[6],  CONST.PLAYER_HOLE_CARDS[7]  ], payout: CARDED_HAND_PAYOUTS[3]  },
  { id: 5,  cards: [CONST.PLAYER_HOLE_CARDS[8],  CONST.PLAYER_HOLE_CARDS[9]  ], payout: CARDED_HAND_PAYOUTS[4]  },
  { id: 6,  cards: [CONST.PLAYER_HOLE_CARDS[10], CONST.PLAYER_HOLE_CARDS[11] ], payout: CARDED_HAND_PAYOUTS[5]  },
  { id: 7,  cards: [CONST.PLAYER_HOLE_CARDS[12], CONST.PLAYER_HOLE_CARDS[13] ], payout: CARDED_HAND_PAYOUTS[6]  },
  { id: 8,  cards: [CONST.PLAYER_HOLE_CARDS[14], CONST.PLAYER_HOLE_CARDS[15] ], payout: CARDED_HAND_PAYOUTS[7]  },
  { id: 9,  cards: [CONST.PLAYER_HOLE_CARDS[16], CONST.PLAYER_HOLE_CARDS[17] ], payout: CARDED_HAND_PAYOUTS[8]  },
  { id: 10, cards: [CONST.PLAYER_HOLE_CARDS[18], CONST.PLAYER_HOLE_CARDS[19] ], payout: CARDED_HAND_PAYOUTS[9]  },
];

// Legacy alias — always points to the frozen CONST definition
export const DEALER_DECK = CONST.DEALER_DECK;

// ── Fisher-Yates shuffle — always clones CONST.DEALER_DECK, never mutates it ──
export function shuffleDeck(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ── Secure board generation — canonical entry point for all deal operations ──
// Returns a fresh 5-card board drawn from CONST.DEALER_DECK every invocation.
// Clones the deck → Fisher-Yates shuffle → slice first 5.
export function getSecureRandomBoard() {
  const d = [...CONST.DEALER_DECK];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d.slice(0, 5);
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

/**
 * Calculates the effective payout ratio for a carded hand bet when there are ties.
 *
 * Rule — 5% Player Margin:
 *   If numberOfWinners === 1  → return originalOdds (no split)
 *   If numberOfWinners  > 1  → return ((originalOdds + 1) / 2) * 1.05 - 1
 *
 * The divisor is always 2 (halved), regardless of how many hands tied.
 * The "-1" converts back to a ratio so callers can still do bet * (1 + ratio).
 */
export function calculateTiePayout(originalOdds, numberOfWinners) {
  if (numberOfWinners <= 1) return originalOdds;
  return ((originalOdds + 1) / 2) * 1.05 - 1;
}

/**
 * Evaluates the 5-card community board as a standalone hand (no hole cards).
 * Used to check if the board outranks all player hands.
 */
export function evaluateBoardOnly(communityCards) {
  if (communityCards.length !== 5) return null;
  return evaluateFiveCards(communityCards);
}

/**
 * Returns true when the 5-card community board is strictly stronger than
 * every one of the 10 fixed hands combined with those same community cards.
 *
 * When this is true, the house collects all carded hand bets.
 * Rank, Color, and River side bets still resolve normally.
 *
 * Background: there are exactly 19 hole-card combinations across the 10 fixed
 * hands where at least one hand can tie or beat a board that would otherwise
 * stand as the best 5-card hand. The evaluator handles those naturally — if any
 * player hand is >= the board, this function returns false and normal winner
 * logic applies.
 */
export function isCommunityBoardWin(communityCards) {
  if (communityCards.length !== 5) return false;
  const boardStrength = evaluateBoardOnly(communityCards);
  if (!boardStrength) return false;

  for (const hand of FIXED_HANDS) {
    const playerBest = evaluateBestHand(hand.cards, communityCards);
    if (compareHands(playerBest, boardStrength) <= 0) {
      return false;
    }
  }
  return true;
}

export function findLeadingHand(communityCards) {
  if (communityCards.length === 0) return null;

  if (communityCards.length === 5 && isCommunityBoardWin(communityCards)) {
    return { handIds: [], handResult: null, communityBoardWin: true };
  }

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

  return { handIds: leaders, handResult: best, communityBoardWin: false };
}

// NOTE: Red/Black payouts are defined in payoutConstants.js (COLOR_BOARD_PAYOUTS) — single source of truth

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

// NOTE: LOW_HIGH_PAYOUT is defined in payoutConstants.js — single source of truth

// NOTE: HAND_RANK_PAYOUTS is defined in payoutConstants.js — single source of truth
// Re-export for any legacy imports
export { HAND_RANK_PAYOUTS } from '@/lib/payoutConstants';

// ============================================================
// MATHEMATICAL PATH — Hand-Rank Probability Matrix
// ============================================================
// Authoritative static matrix. Each hand ID maps to an object where each
// rank key holds 1 (possible) or 0 (impossible / locked) for betting purposes.
//
// Hand mapping (ID → cards → label):
//   1  A♦ 10♥  Hand A   6  8♦ 6♦   Hand G
//   2  K♣ K♠   Hand C   7  7♦ 7♠   Hand H
//   3  Q♣ J♠   Hand D   8  4♥ 2♥   Hand I
//   4  Q♠ 10♠  Hand E   9  3♣ 3♥   Hand J
//   5  J♣ 9♣   Hand F  10  A♥ 5♦   Hand B
//
// Rank keys match RANK_BET_OPTIONS exactly. Royal Flush / Straight Flush / One Pair are
// excluded from rank betting and therefore not represented here.
// 6-rank model: Four of a Kind (max) → Two Pair (min). One Pair removed 2026-04-14; Straight Flush removed 2026-04-14.
export const HAND_RANK_MATRIX = Object.freeze({
  //               FoaK  FH  Flush  Str  Trips  TwoPair
  1:  Object.freeze({ 'Four of a Kind': 0, 'Full House': 1, 'Flush': 1, 'Straight': 1, 'Three of a Kind': 1, 'Two Pair': 1 }),  // A (A♦ 10♥)
  10: Object.freeze({ 'Four of a Kind': 1, 'Full House': 1, 'Flush': 1, 'Straight': 1, 'Three of a Kind': 1, 'Two Pair': 1 }),  // B (A♥ 5♦)
  2:  Object.freeze({ 'Four of a Kind': 1, 'Full House': 1, 'Flush': 1, 'Straight': 1, 'Three of a Kind': 1, 'Two Pair': 0 }),  // C (K♣ K♠)
  3:  Object.freeze({ 'Four of a Kind': 0, 'Full House': 1, 'Flush': 0, 'Straight': 1, 'Three of a Kind': 1, 'Two Pair': 1 }),  // D (Q♣ J♠)
  4:  Object.freeze({ 'Four of a Kind': 0, 'Full House': 1, 'Flush': 1, 'Straight': 1, 'Three of a Kind': 0, 'Two Pair': 1 }),  // E (Q♠ 10♠)
  5:  Object.freeze({ 'Four of a Kind': 1, 'Full House': 1, 'Flush': 1, 'Straight': 1, 'Three of a Kind': 1, 'Two Pair': 1 }),  // F (J♣ 9♣)
  6:  Object.freeze({ 'Four of a Kind': 1, 'Full House': 1, 'Flush': 1, 'Straight': 1, 'Three of a Kind': 1, 'Two Pair': 1 }),  // G (8♦ 6♦)
  7:  Object.freeze({ 'Four of a Kind': 1, 'Full House': 1, 'Flush': 0, 'Straight': 1, 'Three of a Kind': 1, 'Two Pair': 0 }),  // H (7♦ 7♠)
  8:  Object.freeze({ 'Four of a Kind': 1, 'Full House': 1, 'Flush': 1, 'Straight': 1, 'Three of a Kind': 1, 'Two Pair': 1 }),  // I (4♥ 2♥)
  9:  Object.freeze({ 'Four of a Kind': 1, 'Full House': 1, 'Flush': 0, 'Straight': 1, 'Three of a Kind': 1, 'Two Pair': 0 }),  // J (3♣ 3♥)
});

// Returns the Set of rank names that are mathematically reachable (value > 0)
// across the union of the player's currently-betted hand IDs.
export function getUnlockedRanksForPlayer(activeBettedHandIds) {
  if (!activeBettedHandIds || activeBettedHandIds.length === 0) return new Set();
  const reachable = new Set();
  for (const id of activeBettedHandIds) {
    const row = HAND_RANK_MATRIX[id];
    if (!row) continue;
    for (const [rank, val] of Object.entries(row)) {
      if (val > 0) reachable.add(rank);
    }
  }
  return reachable;
}

// Legacy alias kept for any remaining imports
export const HAND_RANK_POSSIBILITY_MAP = HAND_RANK_MATRIX;

// ============================================================
// PATH SYSTEM (KILL SWITCH)
// ============================================================
// Professional Path: 1–2 Hand bets → Rank, Color, River OPEN
// Grinder Path:      3–4 Hand bets → Kill Switch fires, ALL side markets LOCKED
// Max Hand selections: 4 (once 4th is chosen, all others are locked for the round)

export const MAX_HAND_BETS = 4;

export function getPlayerPath(handBetCount) {
  if (handBetCount === 0) return 'none';
  if (handBetCount <= 2) return 'professional';
  return 'grinder';
}

export function isProfessionalPath(handBetCount) {
  return handBetCount >= 1 && handBetCount <= 2;
}

export function isGrinderPath(handBetCount) {
  return handBetCount >= 3;
}

// Kill Switch: returns true when side markets must be locked
export function isKillSwitchActive(handBetCount) {
  return isGrinderPath(handBetCount);
}

// ============================================================
// SNOWBALL CAP VALIDATORS
// ============================================================
// Cascade: each tier can only grow as large as the sum of the tier(s) below it.
//   Rank Cap:  Total Rank Bets  ≤  Total Hand Bets
//   Color Cap: Total Color Bets ≤  (Total Hand Bets + Total Rank Bets)
//   River Cap: Total River Bets ≤  (Total Hand Bets + Total Rank Bets + Total Color Bets)

export function getTotalHandBets(handBets) {
  return Object.values(handBets || {}).reduce((s, v) => s + v, 0);
}

export function getTotalRankBets(rankBets) {
  return Object.values(rankBets || {}).reduce((s, v) => s + v, 0);
}

export function getTotalColorBets(colorBets) {
  return Object.values(colorBets || {}).reduce((s, v) => s + v, 0);
}

// Returns true if the player has at least one active rank bet (Rank is the Master Key)
export function hasRankBet(rankBets) {
  return Object.values(rankBets || {}).some(v => v > 0);
}

// Returns true if the rank bet action satisfies the cap.
// Pass isDecrease=true when the net effect is a removal or move (no new chips added) — cap is always bypassed.
export function checkRankCap(handBets, rankBets, additionalBet = 0, isDecrease = false) {
  if (isDecrease) return true;
  const totalHand = getTotalHandBets(handBets);
  const totalRank = getTotalRankBets(rankBets) + additionalBet;
  return totalRank <= totalHand;
}

// Returns true if adding `additionalBet` to color bets still satisfies the cap
export function checkColorCap(handBets, rankBets, colorBets, additionalBet = 0) {
  const ceiling = getTotalHandBets(handBets) + getTotalRankBets(rankBets);
  const totalColor = getTotalColorBets(colorBets) + additionalBet;
  return totalColor <= ceiling;
}

// Returns true if adding `additionalBet` to river bets still satisfies the cap
// currentRiverBetAmount = what the player has already staked on the river this round
export function checkRiverCap(handBets, rankBets, colorBets, currentRiverBetAmount, additionalBet = 0) {
  const ceiling = getTotalHandBets(handBets) + getTotalRankBets(rankBets) + getTotalColorBets(colorBets);
  const totalRiver = (currentRiverBetAmount || 0) + additionalBet;
  return totalRiver <= ceiling;
}

// ============================================================
// UNIFIED SIMULATION ENGINE (Phase 1)
// ============================================================
// Single-run engine: one board deal → evaluates ALL 10 hands simultaneously.
// All downstream counters (Carded Hand Win, Rank Win, Color Win, River Win)
// derive from the same shared community cards. No independent re-rolls.
//
// Returns:
//   winnerHandIds  – hand IDs that won the round (tied hands both listed)
//   isBoardWin     – true if community board beat all player hands
//   handRanks      – { [handId]: { name, rank } } best rank for each hand
//   winningRank    – the rank name of the winning hand(s) (or null)
//   colorWinners   – array of color keys that won (e.g. ['3R', '4R'])
//   riverResult    – 'LOW' | 'HIGH' | null
//   boardStr       – human-readable community card string
//
// Usage:
//   const result = runUnifiedRound(getSecureRandomBoard());
export function runUnifiedRound(board) {
  const leadResult = findLeadingHand(board);
  const winnerHandIds = leadResult?.handIds ?? [];
  const isBoardWin = leadResult?.communityBoardWin ?? false;
  const winningRankResult = leadResult?.handResult ?? null;
  const winningRank = winningRankResult?.name ?? null;

  // Evaluate every hand's rank against the shared board (single pass)
  const handRanks = {};
  for (const hand of FIXED_HANDS) {
    handRanks[hand.id] = evaluateBestHand(hand.cards, board);
  }

  const colorWinners = resolveRedBlack(board);
  const riverCard = board[4] ?? null;
  const riverResult = resolveLowHigh(riverCard);
  const boardStr = board.map(cardDisplay).join(' ');

  return {
    board,
    boardStr,
    winnerHandIds,
    isBoardWin,
    handRanks,
    winningRank,
    colorWinners,
    riverResult,
  };
}

// ============================================================
// DEPENDENT RANK WIN RESOLVER
// ============================================================
// CRITICAL RULE: A Rank bet only pays when ALL of the following are true:
//   1. The player placed a Hand bet on at least one hand that won the round.
//   2. That specific winning hand's best poker result matches the rank the player bet on.
//
// This is NOT a global "board rank" check.
// It is a per-player, per-hand, per-rank validation.
//
// Parameters:
//   playerHandBets  – { [handId]: amount }  for the player being settled
//   playerRankBets  – { [rankName]: amount } for the player being settled
//   winnerHandIds   – array of hand IDs that won the round (from findLeadingHand)
//   communityCards  – the 5 final community cards
//
// Returns: array of rank key strings whose bets should pay out
export function resolveRankBetWin(playerHandBets, playerRankBets, winnerHandIds, communityCards) {
  if (!winnerHandIds || winnerHandIds.length === 0) return [];
  if (!playerRankBets || Object.keys(playerRankBets).length === 0) return [];
  if (!playerHandBets || Object.keys(playerHandBets).length === 0) return [];

  // Which winning hand IDs did this player actually bet on?
  const playerBetHandIds = Object.keys(playerHandBets).map(Number);
  const playerWinningHandIds = winnerHandIds.filter(id => playerBetHandIds.includes(id));

  if (playerWinningHandIds.length === 0) return [];

  // Determine the poker rank of each hand the player bet on that won
  const winningRanksForPlayer = new Set();
  for (const wid of playerWinningHandIds) {
    const hand = FIXED_HANDS.find(h => h.id === wid);
    if (!hand) continue;
    const result = evaluateBestHand(hand.cards, communityCards);
    if (result) winningRanksForPlayer.add(result.name);
  }

  // A rank bet pays only if its key is in the set above
  const payingRanks = [];
  for (const [rankKey, amount] of Object.entries(playerRankBets)) {
    if (amount > 0 && winningRanksForPlayer.has(rankKey)) {
      payingRanks.push(rankKey);
    }
  }
  return payingRanks;
}