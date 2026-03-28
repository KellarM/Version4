/**
 * CENTRALIZED PAYOUT CONSTANTS
 * =============================
 * Single source of truth for all game payouts.
 * All payouts are stored as RATIOS (e.g., 0.70 means 0.70:1)
 * Formula: Total Payout = Bet + (Bet × Ratio) = Bet × (1 + Ratio)
 * 
 * Example: $25 bet at 0.70:1 ratio = $25 + ($25 × 0.70) = $42.50
 */

// CARDED HANDS: 10 fixed hands with their payout ratios
export const CARDED_HAND_PAYOUTS = [
  8.10,  // Hand 1: A♦10♥
  6.75,  // Hand 2: K♣K♠
  8.52,  // Hand 3: Q♣J♠
  7.90,  // Hand 4: Q♠10♠
  8.31,  // Hand 5: J♣9♣
  10.18, // Hand 6: 8♦6♦
  7.48,  // Hand 7: 7♦7♠
  11.95, // Hand 8: 4♥2♥
  7.27,  // Hand 9: 3♣3♥
  9.77,  // Hand 10: A♥5♦
];

// HAND RANK PAYOUTS: 9 poker hand rankings
export const HAND_RANK_PAYOUTS = {
  'Royal Flush': null,        // Progressive jackpot
  'Straight Flush': null,     // Progressive jackpot
  'Four of a Kind': 3.79,
  'Full House': 0.98,
  'Flush': 1.30,
  'Straight': 1.90,
  'Three of a Kind': 0.98,
  'Two Pair': 4.83,
  'One Pair': 5.87,
};

// COLOR BOARD PAYOUTS: Red/Black board outcomes (cumulative)
export const COLOR_BOARD_PAYOUTS = {
  '3R': 0.78,   // 3 Red
  '3B': 0.78,   // 3 Black
  '4R': 5.04,   // 4 Red
  '4B': 5.04,   // 4 Black
  '5R': 19.74,  // 5 Red
  '5B': 19.74,  // 5 Black
};

// LOW/HIGH PAYOUT: River card low (2-7) vs high (8-A)
export const LOW_HIGH_PAYOUT = 0.88;

/**
 * VALIDATION HELPERS
 * ==================
 */

/**
 * Calculate total payout from bet and ratio
 * @param {number} bet - Bet amount
 * @param {number} ratio - Payout ratio (e.g., 0.70)
 * @returns {number} Total payout (bet + winnings)
 */
export function calculatePayout(bet, ratio) {
  if (ratio === null || ratio === undefined) return 0;
  return bet * (1 + ratio);
}

/**
 * Verify all payout constants are valid numbers
 * @throws {Error} If any payout is invalid
 */
export function validateAllPayouts() {
  const errors = [];

  // Validate carded hands
  CARDED_HAND_PAYOUTS.forEach((payout, idx) => {
    if (typeof payout !== 'number' || payout < 0) {
      errors.push(`Hand ${idx + 1} has invalid payout: ${payout}`);
    }
  });

  // Validate hand ranks
  Object.entries(HAND_RANK_PAYOUTS).forEach(([rank, payout]) => {
    if (payout !== null && (typeof payout !== 'number' || payout < 0)) {
      errors.push(`Rank "${rank}" has invalid payout: ${payout}`);
    }
  });

  // Validate color board
  Object.entries(COLOR_BOARD_PAYOUTS).forEach(([key, payout]) => {
    if (typeof payout !== 'number' || payout < 0) {
      errors.push(`Color "${key}" has invalid payout: ${payout}`);
    }
  });

  // Validate low/high
  if (typeof LOW_HIGH_PAYOUT !== 'number' || LOW_HIGH_PAYOUT < 0) {
    errors.push(`Low/High has invalid payout: ${LOW_HIGH_PAYOUT}`);
  }

  if (errors.length > 0) {
    throw new Error(`Payout validation failed:\n${errors.join('\n')}`);
  }
}

// Run validation on import
validateAllPayouts();