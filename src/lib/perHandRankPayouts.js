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
    'Two Pair':        25.16,
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
    'Three of a Kind': 5.60,
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
 * Given a set of active hand IDs, return the union of available ranks.
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
 * Given a rank and a set of active hand IDs, determine the display odds string.
 * - 0 hands selected: null (no odds shown, locked)
 * - 1 hand selected: the specific odds for that hand (or null if not available)
 * - 2 hands selected: "MIXED" if both hands have that rank, or the specific odds if only one has it
 * - 3+ hands selected: null (kill switch, all locked)
 */
export function getRankDisplayOdds(rankName, activeHandIds) {
  if (!activeHandIds || activeHandIds.length === 0 || activeHandIds.length >= 3) {
    return null;
  }

  if (activeHandIds.length === 1) {
    const payout = getPerHandRankPayout(activeHandIds[0], rankName);
    return payout !== null ? `${payout}:1` : null;
  }

  // 2 hands
  const available = activeHandIds.filter(id => getPerHandRankPayout(id, rankName) !== null);
  if (available.length === 0) return null;
  if (available.length === 1) {
    // Only one of the two hands can achieve this rank — show that hand's odds
    const payout = getPerHandRankPayout(available[0], rankName);
    return payout !== null ? `${payout}:1` : null;
  }
  // Both hands have this rank with different odds
  return 'MIXED';
}