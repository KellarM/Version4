/**
 * CENTRALIZED PAYOUT CONSTANTS — RAPID FIRE TEXAS HOLD'EM
 * =========================================================
 * MASTER ODDS UPDATE — RAPID_FIRE_CONFIG (image_826d4a.png)
 *
 * All payouts stored as RATIOS (e.g., 14.5 means 14.5:1)
 * Total return to player per unit bet = bet × (1 + ratio)
 *
 * These values are authoritative for:
 *   • Payout Engine (credit win calculation)
 *   • Table Layout (felt label text)
 *   • Game Rules / How to Play modal
 *   • Simulation Worker (2-million-hand AGLC audit)
 *
 * BETTING CONSTRAINTS (Updated 2026-05-06):
 * - 0 Card Hand bets: rank board fully locked
 * - 1 Card Hand bet: exactly 1 rank bet allowed
 * - 2 Card Hand bets: up to 2 rank bets allowed
 * - 3+ Card Hand bets: kill switch fires — all side markets locked
 * - Rank bet total cannot exceed hand bet total
 * - Color/River unlock: rank total must EXACTLY EQUAL hand total
 * - Color max = hand + rank total; River max = hand + rank + color total
 * - All Hand Rank bets are fixed-odds — no progressives
 * - One Pair isolation rule REMOVED (2026-05-06) — One Pair is a standard rank bet
 * - Minimum qualifying rank: One Pair
 * - Maximum qualifying rank: Four of a Kind (Straight Flush removed 2026-04-14)
 *
 * NOTE: Progressive jackpots removed as of 2026-04-01.
 */

// ── CARDED HANDS ──────────────────────────────────────────────
// Win condition: this hand must be the table winner (highest 7-card rank)
export const CARDED_HAND_PAYOUTS = [
  20.3,   // Hand 1:  A♦/10♥
  4.35,    // Hand 2:  K♣/K♠
  15.8,  // Hand 3:  Q♣/J♠
  9.0,   // Hand 4:  Q♠/10♠
  7.4,   // Hand 5:  J♣/9♣
  5.9,    // Hand 6:  8♦/6♦
  6.8,   // Hand 7:  7♦/7♠
  7.3,    // Hand 8:  4♥/2♥
  9.1,    // Hand 9:  3♣/3♥
  15.8,   // Hand 10: A♥/5♦
];

// ── HAND RANK PAYOUTS ─────────────────────────────────────────
// Win condition: best 7-card rank across all 10 hands equals this rank
// 6-rank model: Four of a Kind (max) → Two Pair (min). Straight Flush removed 2026-04-14.
export const HAND_RANK_PAYOUTS = {
  'Four of a Kind':  12.4,
  'Full House':      2.55,
  'Flush':           3.1,
  'Straight':        5.1,
  'Three of a Kind': 3.95,
  'Two Pair':        16.8,
  'One Pair':        35.0,
};

// ── COLOR BOARD PAYOUTS ───────────────────────────────────────
// Win condition: community cards contain >= N cards of that color
export const COLOR_BOARD_PAYOUTS = {
  '3R': 0.93,
  '3B': 0.93,
  '4R': 4.85,
  '4B': 4.85,
  '5R': 43.5,
  '5B': 43.5,
};

// ── LOW / HIGH PAYOUT ─────────────────────────────────────────
// Win condition: river card rank — LOW = 2–7, HIGH = 8–A
export const LOW_HIGH_PAYOUT = 0.93;

/**
 * Calculate total payout from bet and ratio
 * Returns: total amount returned to player (including original stake)
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