import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const GAMES_PER_STRATEGY = 1_000_000;

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
      'One Pair': 0.42256,
      'Two Pair': 0.04754,
      'Three of a Kind': 0.02113,
      'Straight': 0.00462,
      'Flush': 0.00327,
      'Full House': 0.00261,
      'Four of a Kind': 0.00168,
      'Straight Flush': 0.00139,
      'Royal Flush': 0.000154,
    };

    const RANK_PAYOUTS = {
      'One Pair': 5.87,
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
      return 'One Pair';
    }

    function getWinningColors(redCount) {
      const blackCount = 5 - redCount;
      const winners = [];
      if (redCount >= 3) for (let i = 3; i <= redCount; i++) winners.push(`${i}R`);
      if (blackCount >= 3) for (let i = 3; i <= blackCount; i++) winners.push(`${i}B`);
      return winners;
    }

    // All 11 strategies
    const STRATEGIES = {
      ST1_Original: () => ({ hands: [2, 5, 6, 7, 8, 9], ranks: [], colors: [], description: 'Fixed hands 2,5,6,7,8,9' }),
      ConservativeHedger: () => ({ hands: [3, 6, 8, 10], ranks: [], colors: ['3R', '3B', '4R', '4B'], description: '4 hands + color board' }),
      RankStacker: () => ({ hands: [6, 8], ranks: ['One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Full House'], colors: [], description: '2 hands + 5 ranks' }),
      FlushHunter: () => ({ hands: [3, 4, 5], ranks: ['Flush'], colors: [], description: '3 hands + Flush rank' }),
      StraightHunter: () => ({ hands: [1, 5, 10], ranks: ['Straight'], colors: [], description: '3 hands + Straight rank' }),
      ColorBoardSpecialist: () => ({ hands: [1, 4], ranks: [], colors: ['3R', '3B', '4R', '4B', '5R', '5B'], description: '2 hands + all colors' }),
      HighPayoutFocus: () => ({ hands: [6, 8], ranks: ['Three of a Kind', 'Full House', 'Four of a Kind'], colors: [], description: '2 high-payout hands + premium ranks' }),
      RiverFocused: () => ({ hands: [8], ranks: [], colors: [], description: '1 hand (8 only)' }),
      BalancedSpread: () => ({ hands: [2, 6, 8], ranks: ['One Pair', 'Flush', 'Straight'], colors: ['3R', '4R'], description: 'Mixed balanced approach' }),
      DiversifiedHedge: () => ({ hands: [1, 3, 5, 7, 9, 10], ranks: ['One Pair', 'Two Pair'], colors: ['3R', '3B'], description: '6 hands + 2 ranks + 2 colors' }),
      AdaptiveHybrid: () => ({ hands: [2, 5, 6, 8], ranks: ['One Pair', 'Two Pair'], colors: ['3R', '3B'], description: 'Adaptive mixed strategy' }),
    };

    const results = [];

    for (const [stratName, stratFn] of Object.entries(STRATEGIES)) {
      const strat = stratFn();
      let totalBets = 0, totalPayouts = 0;
      let gamesPlayed = 0;

      for (let game = 0; game < GAMES_PER_STRATEGY; game++) {
        const bet = 30; // Fixed bet per category

        // Hand bets
        for (const handId of strat.hands) {
          const hand = FIXED_HANDS.find(h => h.id === handId);
          totalBets += bet;
          if (Math.floor(Math.random() * 10) + 1 === handId) {
            totalPayouts += bet * (1 + hand.payout);
          }
        }

        // Rank bets
        for (const rankKey of strat.ranks) {
          const mult = RANK_PAYOUTS[rankKey];
          totalBets += bet;
          if (rollRank() === rankKey && mult !== null) {
            totalPayouts += bet * (1 + mult);
          }
        }

        // Color bets
        const redCount = rollRedCount();
        const blackCount = 5 - redCount;
        const winningColors = getWinningColors(redCount);
        for (const colorKey of strat.colors) {
          totalBets += bet;
          if (winningColors.includes(colorKey)) {
            totalPayouts += bet * (1 + COLOR_PAYOUTS[colorKey]);
          }
        }

        gamesPlayed++;
      }

      const rtp = totalBets > 0 ? totalPayouts / totalBets : 0;
      const houseEdge = 1 - rtp;
      const compliant = rtp >= 0.95 && rtp <= 0.98;

      results.push({
        strategy: stratName,
        description: strat.description,
        gamesSimulated: gamesPlayed,
        totalBets,
        totalPayouts: Math.round(totalPayouts),
        rtp: (rtp * 100).toFixed(3),
        houseEdge: (houseEdge * 100).toFixed(3),
        compliant,
        status: rtp > 0.98 ? '🔴 TOO HIGH (>98%)' : rtp < 0.95 ? '🔴 TOO LOW (<95%)' : '🟢 COMPLIANT',
      });
    }

    const aggregateRTP = results.reduce((s, r) => s + parseFloat(r.rtp), 0) / results.length;
    const allCompliant = results.every(r => r.compliant);

    return Response.json({
      success: true,
      auditDate: new Date().toISOString(),
      targetRTPRange: '95.0% – 98.0%',
      totalStrategiesAudited: results.length,
      compliantCount: results.filter(r => r.compliant).length,
      aggregateRTP: aggregateRTP.toFixed(3),
      overallStatus: allCompliant ? '✅ ALL STRATEGIES COMPLIANT' : '⚠️ ADJUSTMENTS NEEDED',
      strategies: results,
      recommendation: allCompliant 
        ? 'Game is ready for regulatory submission.'
        : 'Run payout calibration to adjust multipliers and achieve compliance.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});