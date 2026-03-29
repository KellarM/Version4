/**
 * CENTRALIZED PAYOUT CONSTANTS
 * =============================
 * Single source of truth for all game payouts.
 * All payouts are stored as RATIOS (e.g., 0.70 means 0.70:1)
 * Formula: Total Payout = Bet + (Bet × Ratio) = Bet × (1 + Ratio)
 *
 * Calibrated via winFrequencyProfiler (500K game Monte Carlo on real 32-card engine).
 * Target RTP per bet category: ~96.5%
 *
 * Empirical win frequencies (from profiler):
 *   H1  A♦10♥    5.52%  → fair payout ~16.49x  → rounded 16.5x
 *   H2  K♣K♠    29.84%  → fair payout  2.23x  → rounded  2.25x
 *   H3  Q♣J♠     5.08%  → fair payout ~18.0x   → rounded 18.0x
 *   H4  Q♠10♠    5.04%  → fair payout ~18.2x   → rounded 18.0x
 *   H5  J♣9♣     7.89%  → fair payout ~11.2x   → rounded 11.25x
 *   H6  8♦6♦     8.30%  → fair payout ~10.6x   → rounded 10.5x
 *   H7  7♦7♠    17.91%  → fair payout  4.39x  → rounded  4.4x
 *   H8  4♥2♥     4.52%  → fair payout ~20.35x  → rounded 20.0x
 *   H9  3♣3♥    10.53%  → fair payout  8.16x  → rounded  8.2x
 *   H10 A♥5♦     5.37%  → fair payout ~17.0x   → rounded 17.0x
 */

// CARDED HANDS: 10 fixed hands with their payout ratios
export const CARDED_HAND_PAYOUTS = [
  16.5,  // Hand 1:  A♦10♥   (empirical 5.52% win rate)
  2.25,  // Hand 2:  K♣K♠    (empirical 29.84% win rate — dominant pair)
  18.0,  // Hand 3:  Q♣J♠    (empirical 5.08% win rate)
  18.0,  // Hand 4:  Q♠10♠   (empirical 5.04% win rate)
  11.25, // Hand 5:  J♣9♣    (empirical 7.89% win rate)
  10.5,  // Hand 6:  8♦6♦    (empirical 8.30% win rate)
  4.4,   // Hand 7:  7♦7♠    (empirical 17.91% win rate — second pair)
  20.0,  // Hand 8:  4♥2♥    (empirical 4.52% win rate — longest shot)
  8.2,   // Hand 9:  3♣3♥    (empirical 10.53% win rate)
  17.0,  // Hand 10: A♥5♦    (empirical 5.37% win rate)
];

// HAND RANK PAYOUTS: poker hand rankings
// Empirical frequencies from 32-card deck (NOT standard 52-card frequencies):
//   Full House: ~64%   → fair payout 0.51x → rounded 0.50x
//   Four of a Kind: ~34.5% → fair payout 1.80x → rounded 1.80x
//   Two Pair: ~0.62%   → fair payout 154x  → progressive (rare)
//   Straight: ~0.10%   → fair payout 964x  → progressive (very rare)
//   Flush: ~0.35%      → fair payout 278x  → progressive (rare)
// Note: One Pair and Three of a Kind appear to not register as winning rank
// because KK/77/33 always build to FH/Quads with 32-card board textures.
export const HAND_RANK_PAYOUTS = {
  'Royal Flush':     null,  // Progressive jackpot
  'Straight Flush':  null,  // Progressive jackpot
  'Four of a Kind':  1.80,  // empirical 34.5% freq → 1.80x ≈ 96.5% RTP
  'Full House':      0.50,  // empirical 64.1% freq → 0.50x ≈ 96.5% RTP
  'Flush':           null,  // empirical 0.35% → progressive (fair payout ~278x, not viable as fixed)
  'Straight':        null,  // empirical 0.10% → progressive (fair payout ~964x, not viable as fixed)
  'Three of a Kind': 30.0,  // empirical ~0.1% (rare on 32-card board)
  'Two Pair':        null,  // empirical 0.62% → progressive (fair payout ~154x)
  'One Pair':        null,  // empirical ~0% on this board texture → progressive
};

// COLOR BOARD PAYOUTS: Red/Black board outcomes (cumulative)
// Empirical frequencies (approx binomial from 32-card deck):
//   3R: ~50.1% → fair 0.93x → rounded 0.90x
//   4R: ~16.7% → fair 4.78x → rounded 4.75x
//   5R: ~2.1%  → fair 44.8x → rounded 45.0x
//   3B: ~49.9% → fair 0.94x → rounded 0.90x
//   4B: ~16.5% → fair 4.85x → rounded 4.75x
//   5B: ~2.2%  → fair 43.6x → rounded 45.0x
export const COLOR_BOARD_PAYOUTS = {
  '3R': 0.90,   // 3 Red
  '3B': 0.90,   // 3 Black
  '4R': 4.75,   // 4 Red
  '4B': 4.75,   // 4 Black
  '5R': 45.0,   // 5 Red
  '5B': 45.0,   // 5 Black
};

// LOW/HIGH PAYOUT: River card low (2-7) vs high (8-A)
// Empirical ~50/50 split → fair payout 0.93x → rounded 0.93x
export const LOW_HIGH_PAYOUT = 0.93;

/**
 * Calculate total payout from bet and ratio
 */
export function calculatePayout(bet, ratio) {
  if (ratio === null || ratio === undefined) return 0;
  return bet * (1 + ratio);
}

/**
 * Verify all payout constants are valid
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

// Run validation on import
validateAllPayouts();