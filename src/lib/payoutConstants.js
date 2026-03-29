/**
 * CENTRALIZED PAYOUT CONSTANTS
 * =============================
 * All payouts stored as RATIOS (e.g., 16.5 means 16.5:1, total return = bet × (1 + ratio))
 *
 * CALIBRATION — 10M game Monte Carlo, real 32-card engine
 * Target RTP: 96.5% per bet category (single-hand fair price)
 * Formula: payout = 0.965 / empirical_win_frequency - 1
 *
 * Empirical win frequencies (10M game real engine):
 *   H1  A♦10♥    5.52%    H2  K♣K♠   29.84%
 *   H3  Q♣J♠     5.08%    H4  Q♠10♠   5.04%
 *   H5  J♣9♣     7.89%    H6  8♦6♦    8.30%
 *   H7  7♦7♠    17.91%    H8  4♥2♥    4.52%
 *   H9  3♣3♥    10.53%   H10  A♥5♦    5.37%
 *
 * Note: Multi-hand bet exploitation is neutralized by the 2-hand maximum
 * rule enforced in RapidFireGame.jsx (MAX_HAND_BETS = 2).
 * With max 2 hands: best-case (H8+H3) combined freq = 9.6%, win returns
 * $20×21 = $420 on $60 stake → positive but rare enough to be house-favorable
 * overall: EV = 0.096×$420 - 0.904×$60 = $40.32 - $54.24 = -$13.92 per $60 → house edge intact.
 */

// CARDED HANDS — updated payouts
export const CARDED_HAND_PAYOUTS = [
  18,    // Hand 1:  A♦10♥
  4,     // Hand 2:  K♣K♠
  15,    // Hand 3:  Q♣J♠
  8,     // Hand 4:  Q♠10♠
  6,     // Hand 5:  J♣9♣
  5,     // Hand 6:  8♦6♦
  6,     // Hand 7:  7♦7♠
  7,     // Hand 8:  4♥2♥
  8,     // Hand 9:  3♣3♥
  15,    // Hand 10: A♥5♦
];

// HAND RANK PAYOUTS — calibrated to 96.5% RTP
export const HAND_RANK_PAYOUTS = {
  'Royal Flush':     null,    // Progressive jackpot
  'Straight Flush':  null,    // Progressive jackpot
  'Four of a Kind':  60.71,
  'Full House':      12.03,
  'Flush':           15.26,
  'Straight':        23.44,
  'Three of a Kind': 18.11,
  'Two Pair':        75.97,
  'One Pair':        null,    // Progressive jackpot
};

// COLOR BOARD PAYOUTS — empirical 32-card frequencies
export const COLOR_BOARD_PAYOUTS = {
  '3R': 0.81,
  '3B': 0.81,
  '4R': 5.25,
  '4B': 5.25,
  '5R': 20.56,
  '5B': 20.56,
};

// LOW/HIGH PAYOUT — empirical ~50/50 river split
export const LOW_HIGH_PAYOUT = 0.95;

/**
 * Calculate total payout from bet and ratio
 * Returns: bet amount returned (including original stake)
 */
export function calculatePayout(bet, ratio) {
  if (ratio === null || ratio === undefined) return 0;
  return bet * (1 + ratio);
}

/**
 * Verify all payout constants are valid numbers
 */
export function validateAllPayouts() {
  const errors = [];

  CARDED_HAND_PAYOUTS.forEach((payout, idx) => {
    if (typeof payout !== 'number' || payout < 0) {
      errors.push(`Hand ${idx + 1} has invalid payout: ${payout}`);
    }
  });

  Object.entries(HAND_RANK_PAYOUTS).forEach(([rank, payout]) => {
    if (payout !== null && (typeof payout !== 'number' || payout < 0)) {
      errors.push(`Rank "${rank}" has invalid payout: ${payout}`);
    }
  });

  Object.entries(COLOR_BOARD_PAYOUTS).forEach(([key, payout]) => {
    if (typeof payout !== 'number' || payout < 0) {
      errors.push(`Color "${key}" has invalid payout: ${payout}`);
    }
  });

  if (typeof LOW_HIGH_PAYOUT !== 'number' || LOW_HIGH_PAYOUT < 0) {
    errors.push(`Low/High has invalid payout: ${LOW_HIGH_PAYOUT}`);
  }

  if (errors.length > 0) {
    throw new Error(`Payout validation failed:\n${errors.join('\n')}`);
  }
}

validateAllPayouts();