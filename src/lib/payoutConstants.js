/**
 * CENTRALIZED PAYOUT CONSTANTS
 * =============================
 * All payouts stored as RATIOS (e.g., 16.5 means 16.5:1, total return = bet × (1 + ratio))
 *
 * CALIBRATION — 594M game audit (22M per bet × 27 betting positions)
 * Target RTP: 96.5% — using "For 96.5%" column from individual bet audit
 *
 * Empirical win frequencies (22M games per bet):
 *   H1  A♦10♥  1,368,978 wins   H2  K♣K♠   4,071,891 wins
 *   H3  Q♣J♠   1,772,338 wins   H4  Q♠10♠  2,737,359 wins
 *   H5  J♣9♣   3,200,758 wins   H6  8♦6♦   3,874,653 wins
 *   H7  7♦7♠   4,212,085 wins   H8  4♥2♥   3,733,547 wins
 *   H9  3♣3♥   4,156,093 wins  H10  A♥5♦   2,061,754 wins
 *
 * BETTING CONSTRAINTS (Updated 2026-04-01):
 * - Max 4 simultaneous Card Hand bets (no restriction)
 * - Max 2 Card Hand bets allowed IF betting on Hand Rank board
 * - Only 1 Hand Rank bet allowed at a time
 * - All Hand Rank bets (including One Pair and Straight Flush) are fixed-odds — no progressives
 * - All Hand Rank bets require ≤2 Hand bets to be active
 *
 * NOTE: Progressive jackpots removed as of 2026-04-01.
 * One Pair and Straight Flush are now fixed-odds bets calibrated to 96.5% RTP,
 * identical in structure to all other Hand Rank positions.
 */

// CARDED HANDS — "For 96.5%" column from 22M game audit
export const CARDED_HAND_PAYOUTS = [
  14.51,  // Hand 1:  A♦10♥
  4.21,   // Hand 2:  K♣K♠
  10.98,  // Hand 3:  Q♣J♠
  6.75,   // Hand 4:  Q♠10♠
  5.63,   // Hand 5:  J♣9♣
  4.48,   // Hand 6:  8♦6♦
  4.04,   // Hand 7:  7♦7♠
  4.69,   // Hand 8:  4♥2♥
  4.11,   // Hand 9:  3♣3♥
  9.30,   // Hand 10: A♥5♦
];

// HAND RANK PAYOUTS — "For 96.5%" column from 22M game audit
// All positions are fixed-odds — no progressives. One Pair and Straight Flush
// calibrated from real 22M-game simulation of the 32-card deck with 10 fixed hands.
export const HAND_RANK_PAYOUTS = {
  'Straight Flush':  255.42,  // Fixed odds — 0.382% win frequency
  'Four of a Kind':  12.43,
  'Full House':      2.53,
  'Flush':           3.10,
  'Straight':        5.02,
  'Three of a Kind': 3.95,
  'Two Pair':        16.76,
  'One Pair':        158.34,  // Fixed odds — 0.605% win frequency
};

// COLOR BOARD PAYOUTS — "For 96.5%" column from 22M game audit
export const COLOR_BOARD_PAYOUTS = {
  '3R': 0.93,
  '3B': 0.93,
  '4R': 4.81,
  '4B': 4.81,
  '5R': 43.36,
  '5B': 43.46,
};

// LOW/HIGH PAYOUT — "For 96.5%" column from 22M game audit
export const LOW_HIGH_PAYOUT = 0.93;

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
    if (typeof payout !== 'number' || payout < 0) {
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