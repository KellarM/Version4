import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Tests a single bet type in isolation over N games
// Returns win count, frequency, implied fair odds, and current payout comparison

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const BATCH = Math.min(body.batchSize || 100_000, 100_000);
    const betType = body.betType; // 'hand', 'rank', 'color', 'lh'
    const betKey  = body.betKey;  // e.g. 1-10 for hand, rank name, color key, 'LOW'/'HIGH'

    // ── Game constants ────────────────────────────────────────────────
    const HAND_PAYOUTS = [8.10, 6.75, 8.52, 7.90, 8.31, 10.18, 7.48, 11.95, 7.27, 9.77];

    const RANK_KEYS = ['One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush','Royal Flush'];
    const RANK_FREQS = [0.42257, 0.04754, 0.02113, 0.04619, 0.00327, 0.02596, 0.00168, 0.00139, 0.000154];
    const RANK_PAYOUTS = [null, 15.98, 3.81, 4.93, 3.21, 2.53, 12.77, null, null];
    const RANK_CUM = [];
    let rc = 0;
    for (const f of RANK_FREQS) { rc += f; RANK_CUM.push(rc); }

    const RED_CUM = [0.03125, 0.18750, 0.50000, 0.81250, 0.96875, 1.00000];
    const COLOR_PAYOUTS = { '3R': 0.81, '3B': 0.81, '4R': 5.25, '4B': 5.25, '5R': 20.56, '5B': 20.56 };
    const LH_PAYOUT = 0.95;

    function rollRank() {
      const r = Math.random();
      for (let i = 0; i < RANK_CUM.length; i++) if (r < RANK_CUM[i]) return i;
      return 0;
    }
    function rollRedCount() {
      const r = Math.random();
      for (let i = 0; i < 6; i++) if (r < RED_CUM[i]) return i;
      return 5;
    }

    const BET = 100; // $100 flat per game for clean math
    let wins = 0;
    let totalPaid = 0;
    const totalBet = BATCH * BET;

    for (let g = 0; g < BATCH; g++) {
      if (betType === 'hand') {
        // Winning hand is random 0-9
        const winHand = (Math.random() * 10) | 0;
        const handIdx = parseInt(betKey) - 1; // betKey = 1-10
        if (winHand === handIdx) {
          wins++;
          totalPaid += BET * (1 + HAND_PAYOUTS[handIdx]);
        }

      } else if (betType === 'rank') {
        const rankIdx = rollRank();
        const targetIdx = RANK_KEYS.indexOf(betKey);
        if (rankIdx === targetIdx) {
          wins++;
          const payout = RANK_PAYOUTS[targetIdx];
          if (payout !== null) totalPaid += BET * (1 + payout);
          // progressive: no payout in sim
        }

      } else if (betType === 'color') {
        const redCount = rollRedCount();
        const blackCount = 5 - redCount;
        const cCount = parseInt(betKey[0]);
        const isRed = betKey[1] === 'R';
        const won = isRed ? redCount >= cCount : blackCount >= cCount;
        if (won) {
          wins++;
          totalPaid += BET * (1 + COLOR_PAYOUTS[betKey]);
        }

      } else if (betType === 'lh') {
        // 50/50 river
        const riverIsLow = Math.random() < 0.5;
        const won = betKey === 'LOW' ? riverIsLow : !riverIsLow;
        if (won) {
          wins++;
          totalPaid += BET * (1 + LH_PAYOUT);
        }
      }
    }

    const winFrequency = wins / BATCH;
    const rtp = totalBet > 0 ? totalPaid / totalBet : 0;

    // Fair odds = (1 / winFrequency) - 1
    const fairOdds = winFrequency > 0 ? (1 / winFrequency) - 1 : null;

    // Odds needed for exactly 96.5% RTP
    const oddsFor965 = winFrequency > 0 ? (0.965 / winFrequency) - 1 : null;
    const oddsFor95  = winFrequency > 0 ? (0.95  / winFrequency) - 1 : null;
    const oddsFor98  = winFrequency > 0 ? (0.98  / winFrequency) - 1 : null;

    // Current payout
    let currentPayout = null;
    if (betType === 'hand') currentPayout = HAND_PAYOUTS[parseInt(betKey) - 1];
    else if (betType === 'rank') currentPayout = RANK_PAYOUTS[RANK_KEYS.indexOf(betKey)];
    else if (betType === 'color') currentPayout = COLOR_PAYOUTS[betKey];
    else if (betType === 'lh') currentPayout = LH_PAYOUT;

    const currentRTP = currentPayout !== null && winFrequency > 0
      ? winFrequency * (1 + currentPayout)
      : null;

    return Response.json({
      success: true,
      betType, betKey, batchSize: BATCH,
      wins, winFrequency: (winFrequency * 100).toFixed(4),
      rtp: (rtp * 100).toFixed(4),
      fairOdds: fairOdds !== null ? Math.round(fairOdds * 100) / 100 : null,
      oddsFor95:  oddsFor95  !== null ? Math.round(oddsFor95  * 100) / 100 : null,
      oddsFor965: oddsFor965 !== null ? Math.round(oddsFor965 * 100) / 100 : null,
      oddsFor98:  oddsFor98  !== null ? Math.round(oddsFor98  * 100) / 100 : null,
      currentPayout,
      currentRTP: currentRTP !== null ? (currentRTP * 100).toFixed(2) : null,
      progressive: betType === 'rank' && RANK_PAYOUTS[RANK_KEYS.indexOf(betKey)] === null,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});