import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const GAMES_PER_STRATEGY = body.gamesPerStrategy || 10_000_000;
    const STARTING_BALANCE = 1000;

    // ── Payout tables (source of truth — must match lib/payoutConstants.js) ──
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
      'One Pair':        0.42256,
      'Two Pair':        0.04754,
      'Three of a Kind': 0.02113,
      'Straight':        0.00462,
      'Flush':           0.00327,
      'Full House':      0.00261,
      'Four of a Kind':  0.00168,
      'Straight Flush':  0.00139,
      'Royal Flush':     0.000154,
    };

    // Current payout multipliers (ratio, NOT "to 1" — e.g. 5.87 means return 6.87× stake)
    const RANK_PAYOUTS = {
      'One Pair':        5.87,
      'Two Pair':        4.83,
      'Three of a Kind': 0.98,
      'Straight':        1.90,
      'Flush':           1.30,
      'Full House':      0.98,
      'Four of a Kind':  3.79,
      // Straight Flush & Royal Flush are progressive — excluded from base RTP calc
    };

    const COLOR_PAYOUTS = {
      '3R': 0.78, '3B': 0.78,
      '4R': 5.04, '4B': 5.04,
      '5R': 19.74, '5B': 19.74,
    };

    const LOW_HIGH_PAYOUT = 0.83; // river pays 0.83:1

    // ── Probability helpers ──
    // Texas Hold'em: equal probability 1-of-10 for winning hand
    // (Board-evaluated in the live game but statistically uniform across the 10 hands)
    const RANK_KEYS = Object.keys(RANK_FREQS);
    const RANK_CUM = [];
    let _rc = 0;
    for (const f of Object.values(RANK_FREQS)) { _rc += f; RANK_CUM.push(_rc); }

    // Binomial red count distribution for 5 cards
    const RED_COUNT_PROBS = [0.03125, 0.15625, 0.3125, 0.3125, 0.15625, 0.03125];
    const RED_COUNT_CUM = [];
    let _rcc = 0;
    for (const p of RED_COUNT_PROBS) { _rcc += p; RED_COUNT_CUM.push(_rcc); }

    function rollRank() {
      const r = Math.random();
      for (let i = 0; i < RANK_CUM.length; i++) { if (r < RANK_CUM[i]) return RANK_KEYS[i]; }
      return 'One Pair';
    }

    function rollRedCount() {
      const r = Math.random();
      for (let i = 0; i < 6; i++) { if (r < RED_COUNT_CUM[i]) return i; }
      return 5;
    }

    function getWinningColors(redCount) {
      const blackCount = 5 - redCount;
      const winners = [];
      if (redCount >= 3) for (let i = 3; i <= redCount; i++) winners.push(`${i}R`);
      if (blackCount >= 3) for (let i = 3; i <= blackCount; i++) winners.push(`${i}B`);
      return winners;
    }

    // ── All 12 strategies (matching strategyBettingTestV2 exactly) ──
    const STRATEGIES = [
      {
        name: 'ST1_Original',
        description: 'Fixed bet on hands 2,5,6,7,8,9 + river hedge',
        execute: () => {
          const bets = {};
          const bet = 50;
          [2, 5, 6, 7, 8, 9].forEach(id => { bets[`h${id}`] = bet; });
          bets.riverHedge = bet;
          return bets;
        },
      },
      {
        name: 'ConservativeHedger',
        description: '4 hands (3,6,8,10) + 4 color outcomes',
        execute: () => {
          const bets = {};
          const bet = 25;
          [3, 6, 8, 10].forEach(id => { bets[`h${id}`] = bet; });
          ['3R', '3B', '4R', '4B'].forEach(k => { bets[`c${k}`] = bet; });
          return bets;
        },
      },
      {
        name: 'RankStacker',
        description: '2 hands (6,8) + 5 high-freq ranks',
        execute: () => {
          const bets = {};
          const bet = 30;
          [6, 8].forEach(id => { bets[`h${id}`] = bet; });
          ['One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Full House'].forEach(r => {
            bets[`r${r}`] = bet;
          });
          return bets;
        },
      },
      {
        name: 'FlushHunter',
        description: '3 hands (3,4,5) + Flush rank + river hedge',
        execute: () => {
          const bets = {};
          const bet = 50;
          [3, 4, 5].forEach(id => { bets[`h${id}`] = bet; });
          bets['rFlush'] = bet;
          bets.riverHedge = bet;
          return bets;
        },
      },
      {
        name: 'StraightHunter',
        description: '3 hands (1,5,10) + Straight rank + river hedge',
        execute: () => {
          const bets = {};
          const bet = 50;
          [1, 5, 10].forEach(id => { bets[`h${id}`] = bet; });
          bets['rStraight'] = bet;
          bets.riverHedge = bet;
          return bets;
        },
      },
      {
        name: 'ColorBoardSpecialist',
        description: '2 hands (1,4) + all 6 color outcomes + river hedge',
        execute: () => {
          const bets = {};
          const bet = 20;
          [1, 4].forEach(id => { bets[`h${id}`] = bet; });
          ['3R', '3B', '4R', '4B', '5R', '5B'].forEach(c => { bets[`c${c}`] = bet; });
          bets.riverHedge = bet;
          return bets;
        },
      },
      {
        name: 'HighPayoutFocus',
        description: '2 hands (6,8) + Trips / Full House / Quads',
        execute: () => {
          const bets = {};
          const bet = 50;
          [6, 8].forEach(id => { bets[`h${id}`] = bet; });
          ['Three of a Kind', 'Full House', 'Four of a Kind'].forEach(r => {
            bets[`r${r}`] = bet;
          });
          return bets;
        },
      },
      {
        name: 'RiverFocused',
        description: 'Hand 8 only + aggressive river (HIGH)',
        execute: () => {
          const bets = {};
          bets['h8'] = 50;
          bets.riverAggressive = 50;
          return bets;
        },
      },
      {
        name: 'BalancedSpread',
        description: '3 hands + 3 ranks + 2 colors + river hedge',
        execute: () => {
          const bets = {};
          const bet = 30;
          [2, 6, 8].forEach(id => { bets[`h${id}`] = bet; });
          ['One Pair', 'Flush', 'Straight'].forEach(r => { bets[`r${r}`] = bet; });
          ['3R', '4R'].forEach(c => { bets[`c${c}`] = bet; });
          bets.riverHedge = bet;
          return bets;
        },
      },
      {
        name: 'DiversifiedHedge',
        description: '6 hands + 2 ranks + 2 colors',
        execute: () => {
          const bets = {};
          const bet = 15;
          [1, 3, 5, 7, 9, 10].forEach(id => { bets[`h${id}`] = bet; });
          ['One Pair', 'Two Pair'].forEach(r => { bets[`r${r}`] = bet; });
          ['3R', '3B'].forEach(c => { bets[`c${c}`] = bet; });
          return bets;
        },
      },
      {
        name: 'AdaptiveHybrid',
        description: '4 hands + 2 ranks (baseline adaptive)',
        execute: () => {
          const bets = {};
          const bet = 30;
          [2, 5, 6, 8].forEach(id => { bets[`h${id}`] = bet; });
          ['One Pair', 'Two Pair'].forEach(r => { bets[`r${r}`] = bet; });
          return bets;
        },
      },
      {
        name: 'MetaAdaptive',
        description: 'AI-driven blend (balanced mode baseline)',
        execute: () => {
          // Simulate the "balanced" mode of MetaAdaptive (most common state)
          const bets = {};
          const bet = 25;
          [2, 6, 8].forEach(id => { bets[`h${id}`] = bet; });
          ['One Pair', 'Flush'].forEach(r => { bets[`r${r}`] = bet; });
          ['3R', '3B'].forEach(c => { bets[`c${c}`] = bet; });
          bets.riverHedge = bet;
          return bets;
        },
      },
    ];

    // ── Simulate all strategies ──
    const results = [];

    for (const strategy of STRATEGIES) {
      const bets = strategy.execute();
      if (Object.keys(bets).length === 0) continue;

      // Pre-compute fixed bet amounts per category for this strategy
      const handBets = {};
      const rankBets = {};
      const colorBets = {};
      let riverHedgeAmt = 0;
      let riverAggressiveAmt = 0;

      for (const [key, val] of Object.entries(bets)) {
        if (key === 'riverHedge') { riverHedgeAmt = val; continue; }
        if (key === 'riverAggressive') { riverAggressiveAmt = val; continue; }
        if (key.startsWith('h')) handBets[parseInt(key.slice(1))] = val;
        else if (key.startsWith('r')) rankBets[key.slice(1)] = val;
        else if (key.startsWith('c')) colorBets[key.slice(1)] = val;
      }

      const totalBetPerGame =
        Object.values(handBets).reduce((s, v) => s + v, 0) +
        Object.values(rankBets).reduce((s, v) => s + v, 0) +
        Object.values(colorBets).reduce((s, v) => s + v, 0) +
        riverHedgeAmt + riverAggressiveAmt;

      // Category accumulators
      let totalBets = 0;
      let totalPayouts = 0;
      let handBetTotal = 0, handPayoutTotal = 0;
      let rankBetTotal = 0, rankPayoutTotal = 0;
      let colorBetTotal = 0, colorPayoutTotal = 0;
      let riverBetTotal = 0, riverPayoutTotal = 0;

      for (let game = 0; game < GAMES_PER_STRATEGY; game++) {
        const winningHand = Math.floor(Math.random() * 10) + 1;
        const gameRank = rollRank();
        const redCount = rollRedCount();
        const winningColors = getWinningColors(redCount);
        const riverIsLow = Math.random() < 0.5; // 50/50 on river card low vs high

        let gameWin = 0;

        // Hand payouts
        for (const [hId, bet] of Object.entries(handBets)) {
          handBetTotal += bet;
          if (parseInt(hId) === winningHand) {
            const hand = FIXED_HANDS[winningHand - 1];
            const payout = bet * (1 + hand.payout);
            handPayoutTotal += payout;
            gameWin += payout;
          }
        }

        // Rank payouts
        for (const [rankKey, bet] of Object.entries(rankBets)) {
          rankBetTotal += bet;
          if (rankKey === gameRank && RANK_PAYOUTS[rankKey] !== undefined) {
            const payout = bet * (1 + RANK_PAYOUTS[rankKey]);
            rankPayoutTotal += payout;
            gameWin += payout;
          }
        }

        // Color payouts (cumulative)
        for (const [colorKey, bet] of Object.entries(colorBets)) {
          colorBetTotal += bet;
          if (winningColors.includes(colorKey)) {
            const payout = bet * (1 + COLOR_PAYOUTS[colorKey]);
            colorPayoutTotal += payout;
            gameWin += payout;
          }
        }

        // River hedge (bets LOW)
        if (riverHedgeAmt > 0) {
          riverBetTotal += riverHedgeAmt;
          if (riverIsLow) {
            const payout = riverHedgeAmt * (1 + LOW_HIGH_PAYOUT);
            riverPayoutTotal += payout;
            gameWin += payout;
          }
        }

        // River aggressive (bets HIGH)
        if (riverAggressiveAmt > 0) {
          riverBetTotal += riverAggressiveAmt;
          if (!riverIsLow) {
            const payout = riverAggressiveAmt * (1 + LOW_HIGH_PAYOUT);
            riverPayoutTotal += payout;
            gameWin += payout;
          }
        }

        totalBets += totalBetPerGame;
        totalPayouts += gameWin;
      }

      const rtp = totalBets > 0 ? totalPayouts / totalBets : 0;
      const compliant = rtp >= 0.95 && rtp <= 0.98;

      // Per-category RTP
      const handRtp = handBetTotal > 0 ? handPayoutTotal / handBetTotal : null;
      const rankRtp = rankBetTotal > 0 ? rankPayoutTotal / rankBetTotal : null;
      const colorRtp = colorBetTotal > 0 ? colorPayoutTotal / colorBetTotal : null;
      const riverRtp = riverBetTotal > 0 ? riverPayoutTotal / riverBetTotal : null;

      // How much each category contributes to total RTP drag/boost
      const handContrib = handBetTotal / totalBets;
      const rankContrib = rankBetTotal / totalBets;
      const colorContrib = colorBetTotal / totalBets;
      const riverContrib = riverBetTotal / totalBets;

      // Suggested payout scale factor to bring this strategy's RTP to 96.5% target
      const TARGET_RTP = 0.965;
      const scaleFactor = totalPayouts > 0 ? (TARGET_RTP * totalBets) / totalPayouts : null;

      results.push({
        strategy: strategy.name,
        description: strategy.description,
        gamesSimulated: GAMES_PER_STRATEGY,
        totalBetPerGame,
        totalBets,
        totalPayouts: Math.round(totalPayouts),
        rtp: (rtp * 100).toFixed(4) + '%',
        houseEdge: ((1 - rtp) * 100).toFixed(4) + '%',
        compliant,
        status: rtp > 0.98 ? '🔴 TOO HIGH' : rtp < 0.95 ? '🔴 TOO LOW' : '🟢 COMPLIANT',
        categoryBreakdown: {
          hands:  handRtp  !== null ? { rtp: (handRtp * 100).toFixed(2) + '%',  betShare: (handContrib * 100).toFixed(1) + '%' }  : null,
          ranks:  rankRtp  !== null ? { rtp: (rankRtp * 100).toFixed(2) + '%',  betShare: (rankContrib * 100).toFixed(1) + '%' }  : null,
          colors: colorRtp !== null ? { rtp: (colorRtp * 100).toFixed(2) + '%', betShare: (colorContrib * 100).toFixed(1) + '%' } : null,
          river:  riverRtp !== null ? { rtp: (riverRtp * 100).toFixed(2) + '%', betShare: (riverContrib * 100).toFixed(1) + '%' } : null,
        },
        calibration: {
          targetRTP: '96.5%',
          currentRTP: (rtp * 100).toFixed(4) + '%',
          scaleFactor: scaleFactor !== null ? scaleFactor.toFixed(6) : null,
          direction: rtp > TARGET_RTP ? 'REDUCE payouts by ' + (((rtp - TARGET_RTP) / rtp) * 100).toFixed(2) + '%'
                   : rtp < TARGET_RTP ? 'INCREASE payouts by ' + (((TARGET_RTP - rtp) / TARGET_RTP) * 100).toFixed(2) + '%'
                   : 'ON TARGET',
        },
      });
    }

    // ── Aggregate blended RTP across all strategies ──
    const aggregateBets = results.reduce((s, r) => s + r.totalBets, 0);
    const aggregatePayouts = results.reduce((s, r) => s + r.totalPayouts, 0);
    const aggregateRtp = aggregateBets > 0 ? aggregatePayouts / aggregateBets : 0;
    const compliantCount = results.filter(r => r.compliant).length;

    // ── Per-category blended RTP across all strategies ──
    // (weighted by bet volume, not equal-weight)
    const categoryTotals = { handBets: 0, handPays: 0, rankBets: 0, rankPays: 0, colorBets: 0, colorPays: 0, riverBets: 0, riverPays: 0 };
    for (const strategy of STRATEGIES) {
      const bets = strategy.execute();
      for (const [key, val] of Object.entries(bets)) {
        const games = GAMES_PER_STRATEGY;
        if (key === 'riverHedge' || key === 'riverAggressive') {
          categoryTotals.riverBets += val * games;
          // River pays out at ~0.5 * (1 + 0.83) = 0.915 per unit staked
          categoryTotals.riverPays += val * games * 0.5 * (1 + 0.83);
        } else if (key.startsWith('h')) {
          const hId = parseInt(key.slice(1));
          const hand = FIXED_HANDS[hId - 1];
          categoryTotals.handBets += val * games;
          categoryTotals.handPays += val * games * (1 / 10) * (1 + hand.payout);
        } else if (key.startsWith('r')) {
          const rankKey = key.slice(1);
          const freq = RANK_FREQS[rankKey] || 0;
          const mult = RANK_PAYOUTS[rankKey];
          if (mult !== undefined) {
            categoryTotals.rankBets += val * games;
            categoryTotals.rankPays += val * games * freq * (1 + mult);
          }
        } else if (key.startsWith('c')) {
          const colorKey = key.slice(1);
          // Compute expected win rate for this color outcome from binomial
          let winProb = 0;
          const [countStr, color] = [colorKey.slice(0, 1), colorKey.slice(1)];
          const count = parseInt(countStr);
          // P(exactly N of one color) from binomial (5, 0.5), but color wins cumulative
          // P(at least N red) = sum P(k red) for k >= N, similarly for black
          const binomProbs = RED_COUNT_PROBS; // [P(0R), P(1R), P(2R), P(3R), P(4R), P(5R)]
          if (color === 'R') {
            for (let k = count; k <= 5; k++) winProb += binomProbs[k];
          } else {
            for (let k = count; k <= 5; k++) winProb += binomProbs[5 - k]; // P(k black) = P(5-k red)
          }
          categoryTotals.colorBets += val * games;
          categoryTotals.colorPays += val * games * winProb * (1 + COLOR_PAYOUTS[colorKey]);
        }
      }
    }

    const blendedHandRtp = categoryTotals.handBets > 0 ? categoryTotals.handPays / categoryTotals.handBets : 0;
    const blendedRankRtp = categoryTotals.rankBets > 0 ? categoryTotals.rankPays / categoryTotals.rankBets : 0;
    const blendedColorRtp = categoryTotals.colorBets > 0 ? categoryTotals.colorPays / categoryTotals.colorBets : 0;
    const blendedRiverRtp = categoryTotals.riverBets > 0 ? categoryTotals.riverPays / categoryTotals.riverBets : 0;

    // ── Calibration recommendations (what to change to hit 96.5% blended) ──
    const TARGET = 0.965;
    const gap = TARGET - aggregateRtp; // positive = need to increase payouts

    // Simple proportional suggestion: which categories are furthest from target
    const categoryRtps = {
      hands: blendedHandRtp,
      ranks: blendedRankRtp,
      colors: blendedColorRtp,
      river: blendedRiverRtp,
    };
    const recommendations = [];
    for (const [cat, catRtp] of Object.entries(categoryRtps)) {
      if (catRtp === 0) continue;
      const catGap = TARGET - catRtp;
      if (Math.abs(catGap) > 0.01) {
        recommendations.push({
          category: cat,
          currentRTP: (catRtp * 100).toFixed(2) + '%',
          targetRTP: '96.50%',
          action: catGap > 0
            ? `INCREASE ${cat} payouts by ~${(catGap / catRtp * 100).toFixed(1)}%`
            : `REDUCE ${cat} payouts by ~${(-catGap / catRtp * 100).toFixed(1)}%`,
          scaleFactor: (TARGET / catRtp).toFixed(4),
        });
      }
    }

    return Response.json({
      success: true,
      auditDate: new Date().toISOString(),
      config: {
        gamesPerStrategy: GAMES_PER_STRATEGY,
        totalStrategies: results.length,
        totalGamesSimulated: GAMES_PER_STRATEGY * results.length,
        targetRTP: '95.0% – 98.0% (center: 96.5%)',
      },
      blendedResults: {
        aggregateRTP: (aggregateRtp * 100).toFixed(4) + '%',
        aggregateHouseEdge: ((1 - aggregateRtp) * 100).toFixed(4) + '%',
        compliantStrategies: compliantCount + '/' + results.length,
        overallStatus: (aggregateRtp >= 0.95 && aggregateRtp <= 0.98)
          ? '🟢 BLENDED RTP COMPLIANT'
          : aggregateRtp < 0.95
          ? '🔴 BLENDED RTP TOO LOW — Increase payouts'
          : '🔴 BLENDED RTP TOO HIGH — Reduce payouts',
      },
      categoryBlendedRTP: {
        hands:  (blendedHandRtp * 100).toFixed(2) + '%',
        ranks:  (blendedRankRtp * 100).toFixed(2) + '%',
        colors: (blendedColorRtp * 100).toFixed(2) + '%',
        river:  (blendedRiverRtp * 100).toFixed(2) + '%',
      },
      calibrationRecommendations: recommendations.length > 0
        ? recommendations
        : [{ action: 'All categories within target range. No payout changes needed.' }],
      strategyResults: results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});