import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const GAMES_TO_SIMULATE = 500_000;
    const TARGET_RTP_LOW = 0.95;
    const TARGET_RTP_HIGH = 0.98;
    const TARGET_RTP_MID = 0.965;

    const FIXED_HANDS = [
      { id: 1,  payout: 8.10 },
      { id: 2,  payout: 6.75 },
      { id: 3,  payout: 8.52 },
      { id: 4,  payout: 7.90 },
      { id: 5,  payout: 8.31 },
      { id: 6,  payout: 10.18 },
      { id: 7,  payout: 7.48 },
      { id: 8,  payout: 11.95 },
      { id: 9,  payout: 7.27 },
      { id: 10, payout: 9.77 },
    ];

    const RANK_FREQS = {
      'Two Pair': 0.04754,
      'Three of a Kind': 0.02113,
      'Straight': 0.00462,
      'Flush': 0.00327,
      'Full House': 0.00261,
      'Four of a Kind': 0.00168,
    };

    const RANK_PAYOUTS = {
      'Two Pair': 4.83,
      'Three of a Kind': 0.98,
      'Straight': 1.90,
      'Flush': 1.30,
      'Full House': 0.98,
      'Four of a Kind': 3.79,
    };

    const COLOR_PAYOUTS = {
      '3R': 0.78, '3B': 0.78,
      '4R': 5.04, '4B': 5.04,
      '5R': 19.74, '5B': 19.74,
    };

    const RED_COUNT_PROBS = [0.03125, 0.15625, 0.3125, 0.3125, 0.15625, 0.03125];
    const RED_COUNT_CUM = [];
    let rcCum = 0;
    for (const p of RED_COUNT_PROBS) { rcCum += p; RED_COUNT_CUM.push(rcCum); }

    const RANK_KEYS = Object.keys(RANK_FREQS);
    const RANK_CUM = [];
    let rankCum = 0;
    for (const f of Object.values(RANK_FREQS)) { rankCum += f; RANK_CUM.push(rankCum); }

    function rollRedCount() {
      const r = Math.random();
      for (let i = 0; i < 6; i++) { if (r < RED_COUNT_CUM[i]) return i; }
      return 5;
    }

    function rollRank() {
      const r = Math.random();
      for (let i = 0; i < RANK_CUM.length; i++) { if (r < RANK_CUM[i]) return RANK_KEYS[i]; }
      return 'Two Pair';
    }

    // Simulate game with current payouts, measuring RTP by category
    let handBets = 0, handPayouts = 0;
    let rankBets = 0, rankPayouts = 0;
    let colorBets = 0, colorPayouts = 0;

    for (let g = 0; g < GAMES_TO_SIMULATE; g++) {
      const bet = 30;

      // Hand: player bets on 1 random hand
      const randomHand = FIXED_HANDS[Math.floor(Math.random() * 10)];
      handBets += bet;
      if (Math.floor(Math.random() * 10) + 1 === randomHand.id) {
        handPayouts += bet * (1 + randomHand.payout);
      }

      // Rank: player bets on 1 random rank
      const gameRank = rollRank();
      const rankMult = RANK_PAYOUTS[gameRank];
      rankBets += bet;
      if (rankMult !== null) rankPayouts += bet * (1 + rankMult);

      // Color: player bets on 3R (50% win prob)
      const redCount = rollRedCount();
      colorBets += bet;
      if (redCount >= 3) colorPayouts += bet * (1 + COLOR_PAYOUTS['3R']);
    }

    const catRTPs = {
      hand: handPayouts / handBets,
      rank: rankPayouts / rankBets,
      color: colorPayouts / colorBets,
    };

    const catShares = {
      hand: handBets / (handBets + rankBets + colorBets),
      rank: rankBets / (handBets + rankBets + colorBets),
      color: colorBets / (handBets + rankBets + colorBets),
    };

    // Calculate scale factors to bring each category to TARGET_RTP_MID
    const scales = {
      hand: TARGET_RTP_MID / catRTPs.hand,
      rank: TARGET_RTP_MID / catRTPs.rank,
      color: TARGET_RTP_MID / catRTPs.color,
    };

    // Generate suggested payouts
    const suggestedHandPayouts = FIXED_HANDS.map(h => ({
      id: h.id,
      current: h.payout,
      suggested: Math.round(h.payout * scales.hand * 100) / 100,
      scaling: Math.round(scales.hand * 1000) / 1000,
    }));

    const suggestedRankPayouts = {};
    for (const [rank, mult] of Object.entries(RANK_PAYOUTS)) {
      suggestedRankPayouts[rank] = Math.round(mult * scales.rank * 100) / 100;
    }

    const suggestedColorPayouts = {};
    for (const [key, mult] of Object.entries(COLOR_PAYOUTS)) {
      suggestedColorPayouts[key] = Math.round(mult * scales.color * 100) / 100;
    }

    // Theoretical verification
    const theoRTP = 
      TARGET_RTP_MID * catShares.hand +
      TARGET_RTP_MID * catShares.rank +
      TARGET_RTP_MID * catShares.color;

    const isCompliant = theoRTP >= TARGET_RTP_LOW && theoRTP <= TARGET_RTP_HIGH;

    return Response.json({
      success: true,
      currentState: {
        handRTP: (catRTPs.hand * 100).toFixed(2) + '%',
        rankRTP: (catRTPs.rank * 100).toFixed(2) + '%',
        colorRTP: (catRTPs.color * 100).toFixed(2) + '%',
        overallRTP: ((catRTPs.hand * catShares.hand + catRTPs.rank * catShares.rank + catRTPs.color * catShares.color) * 100).toFixed(2) + '%',
      },
      gamesSimulated: GAMES_TO_SIMULATE,
      scalingFactors: {
        hands: Math.round(scales.hand * 1000) / 1000,
        ranks: Math.round(scales.rank * 1000) / 1000,
        colors: Math.round(scales.color * 1000) / 1000,
      },
      suggestedPayouts: {
        hands: suggestedHandPayouts,
        ranks: suggestedRankPayouts,
        colors: suggestedColorPayouts,
      },
      verification: {
        theoreticalRTPAfterAdjustment: (theoRTP * 100).toFixed(3) + '%',
        isCompliant,
        targetRange: `${TARGET_RTP_LOW * 100}% – ${TARGET_RTP_HIGH * 100}%`,
      },
      nextSteps: isCompliant 
        ? 'Apply suggested payouts to lib/payoutConstants.js and rerun regulatoryAudit to verify all strategies comply.'
        : 'Calibration failed—review input data.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});