/**
 * PER-HAND RANK PAYOUTS — RAPID FIRE TEXAS HOLD'EM
 * ==================================================
 * Each card hand has its own unique rank payout odds.
 * Key: hand ID (1–10)
 * Value: object mapping rank name → payout ratio (e.g. 2.87 means 2.87:1)
 *
 * Only ranks that are achievable for that hand are listed.
 * Ranks not listed are not available (locked) for that hand.
 */

export const PER_HAND_RANK_PAYOUTS = {
  // Hand 1: A♦ / 10♥
  1: {
    'Full House':      2.86,
    'Two Pair':        3.30,
    'Straight':        3.31,
    'Flush':           5.55,
    'Three of a Kind': 8.16,
    'One Pair':        28.20,
  },

  // Hand 2: K♣ / K♠
  2: {
    'Full House':      1.34,
    'Three of a Kind': 1.63,
    'Four of a Kind':  7.63,
    'Flush':           12.67,
    'One Pair':        37.04,
    'Straight':        70.00,
  },

  // Hand 3: Q♣ / J♠
  3: {
    'Straight':        0.74,
    'Full House':      4.29,
    'Two Pair':        5.17,
    'Three of a Kind': 8.15,
  },

  // Hand 4: Q♠ / 10♠
  4: {
    'Flush':           0.75,
    'Straight':        2.02,
    'Full House':      8.94,
    'Two Pair':        25.45,
  },

  // Hand 5: J♣ / 9♣
  5: {
    'Flush':           1.11,
    'Straight':        3.53,
    'Full House':      4.74,
    'Three of a Kind': 10.81,
    'Two Pair':        20.25,
    'Four of a Kind':  54.0,
  },

  // Hand 6: 8♦ / 6♦
  6: {
    'Flush':           1.56,
    'Straight':        3.51,
    'Full House':      3.78,
    'Three of a Kind': 7.73,
    'Two Pair':        14.13,
    'Four of a Kind':  32.48,
  },

  // Hand 7: 7♦ / 7♠
  7: {
    'Full House':      1.17,
    'Three of a Kind': 2.11,
    'Four of a Kind':  5.04,
    'Straight':        10.69,
  },

  // Hand 8: 4♥ / 2♥
  8: {
    'Flush':           1.17,
    'Full House':      5.16,
    'Straight':        5.57,
    'Three of a Kind': 5.70,
    'Two Pair':        12.43,
    'Four of a Kind':  27.30,
  },

  // Hand 9: 3♣ / 3♥
  9: {
    'Full House':      1.28,
    'Three of a Kind': 2.21,
    'Four of a Kind':  3.63,
    'Straight':        14.6,
  },

  // Hand 10: A♥ / 5♦
  10: {
    'Full House':      2.46,
    'Straight':        2.84,
    'Three of a Kind': 4.79,
    'Two Pair':        4.97,
    'Flush':           7.71,
    'Four of a Kind':  26.4,
  },
};

/**
 * Get the payout ratio for a specific hand + rank combination.
 * Returns null if the rank is not available for that hand.
 */
export function getPerHandRankPayout(handId, rankName) {
  return PER_HAND_RANK_PAYOUTS[handId]?.[rankName] ?? null;
}

/**
 * Get the set of available rank names for a given hand ID.
 */
export function getAvailableRanksForHand(handId) {
  return new Set(Object.keys(PER_HAND_RANK_PAYOUTS[handId] || {}));
}

/**
 * DEPRECATED (2026-05-09): No longer used in live game logic.
 * Kept for simulation tool compatibility.
 * Under the new Open Win Rule, all ranks are available regardless of hand selection.
 */
export function getUnionRanksForHands(handIds) {
  const union = new Set();
  for (const id of handIds) {
    for (const rank of getAvailableRanksForHand(id)) {
      union.add(rank);
    }
  }
  return union;
}

/**
 * DEPRECATED (2026-05-09): Rank odds are no longer shown on the board.
 * Under the Open Win Rule, odds are revealed at settlement in the win display,
 * tied to the actual winning hand. This function is kept for reference only.
 */
export function getRankDisplayOdds(rankName, activeHandIds) {
  return null; // Odds not shown on board — revealed at settlement
}