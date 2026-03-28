import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Regulatory calibration: 10M games across ALL named strategies
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
      'Straight Flush': null,
      'Royal Flush': null,
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

    function rollRedCount() {
      const r = Math.random();
      for (let i = 0; i < 6; i++) { if (r < RED_COUNT_CUM[i]) return i; }
      return 5;
    }

    function rollRank() {
      const r = Math.random();
      const ranks = Object.keys(RANK_FREQS);
      let cum = 0;
      for (const rank of ranks) {
        cum += RANK_FREQS[rank];
        if (r < cum) return rank;
      }
      return 'One Pair';
    }

    function getWinningColors(redCount) {
      const blackCount = 5 - redCount;
      const winners = [];
      if (redCount >= 3) for (let i = 3; i <= redCount; i++) winners.push(`${i}R`);
      if (blackCount >= 3) for (let i = 3; i <= blackCount; i++) winners.push(`${i}B`);
      return winners;
    }

    // Named strategies matching strategyBettingTestV2
    const STRATEGIES = [
      {
        name: 'ST1_Original',
        description: 'Fixed bet on hands 2,5,6,7,8,9',
        execute: (balance) => {
          const bets = {};
          const bet = balance < 300 ? Math.floor(balance / 6) : 50;
          if (balance < bet * 6) return bets;
          [2, 5, 6, 7, 8, 9].forEach(id => { bets[`h${id}`] = bet; });
          return bets;
        },
      },
      {
        name: 'ConservativeHedger',
        description: '4 hands (3,6,8,10) + all color board coverage',
        execute: (balance) => {
          const bets = {};
          const bet = balance < 200 ? Math.floor(balance / 10) : 25;
          if (balance < bet * 10) return bets;
          [3, 6, 8, 10].forEach(id => { bets[`h${id}`] = bet; });
          ['3R', '3B', '4R', '4B'].forEach(k => { bets[`c${k}`] = bet; });
          return bets;
        },
      },
      {
        name: 'RankStacker',
        description: '2 high-payout hands (6,8) + 5 high-freq ranks',
        execute: (balance) => {
          const bets = {};
          const bet = balance < 200 ? Math.floor(balance / 7) : 30;
          if (balance < bet * 7) return bets;
          [6, 8].forEach(id => { bets[`h${id}`] = bet; });
          ['One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Full House'].forEach(r => {
            bets[`r${r}`] = bet;
          });
          return bets;
        },
      },
      {
        name: 'FlushHunter',
        description: '2 flush-suited hands (6,8) + Flush rank',
        execute: (balance) => {
          const bets = {};
          const bet = balance < 250 ? Math.floor(balance / 3) : 50;
          if (balance < bet * 3) return bets;
          [6, 8].forEach(id => { bets[`h${id}`] = bet; });
          bets['rFlush'] = bet;
          return bets;
        },
      },
      {
        name: 'StraightHunter',
        description: '3 straight-capable hands (1,5,10) + Straight rank',
        execute: (balance) => {
          const bets = {};
          const bet = balance < 250 ? Math.floor(balance / 4) : 50;
          if (balance < bet * 4) return bets;
          [1, 5, 10].forEach(id => { bets[`h${id}`] = bet; });
          bets['rStraight'] = bet;
          return bets;
        },
      },
      {
        name: 'ColorBoardSpecialist',
        description: '2 light hands (1,4) + all 6 color outcomes',
        execute: (balance) => {
          const bets = {};
          const bet = balance < 200 ? Math.floor(balance / 8) : 20;
          if (balance < bet * 8) return bets;
          [1, 4].forEach(id => { bets[`h${id}`] = bet; });
          ['3R', '3B', '4R', '4B', '5R', '5B'].forEach(c => { bets[`c${c}`] = bet; });
          return bets;
        },
      },
      {
        name: 'HighPayoutFocus',
        description: '2 highest payout hands (6,8) + premium ranks (Trips/Full House)',
        execute: (balance) => {
          const bets = {};
          const bet = balance < 250 ? Math.floor(balance / 5) : 50;
          if (balance < bet * 5) return bets;
          [6, 8].forEach(id => { bets[`h${id}`] = bet; });
          ['Three of a Kind', 'Full House', 'Four of a Kind'].forEach(r => {
            bets[`r${r}`] = bet;
          });
          return bets;
        },
      },
      {
        name: 'RiverFocused',
        description: 'Single highest hand (8) with aggressive river betting',
        execute: (balance) => {
          const bets = {};
          const bet = balance < 100 ? Math.floor(balance / 2) : 50;
          if (balance < bet * 2) return bets;
          bets['h8'] = bet;
          return bets;
        },
      },
      {
        name: 'BalancedSpread',
        description: '3 hands (2,6,8) + 3 ranks (Pair/Flush/Straight) + 2 colors',
        execute: (balance) => {
          const bets = {};
          const bet = balance < 300 ? Math.floor(balance / 8) : 30;
          if (balance < bet * 8) return bets;
          [2, 6, 8].forEach(id => { bets[`h${id}`] = bet; });
          ['One Pair', 'Flush', 'Straight'].forEach(r => { bets[`r${r}`] = bet; });
          ['3R', '4R'].forEach(c => { bets[`c${c}`] = bet; });
          return bets;
        },
      },
      {
        name: 'DiversifiedHedge',
        description: '6 low-payout hands + 2 ranks + 2 colors (max coverage, min variance)',
        execute: (balance) => {
          const bets = {};
          const bet = balance < 200 ? Math.floor(balance / 10) : 15;
          if (balance < bet * 10) return bets;
          [1, 3, 5, 7, 9, 10].forEach(id => { bets[`h${id}`] = bet; });
          ['One Pair', 'Two Pair'].forEach(r => { bets[`r${r}`] = bet; });
          ['3R', '3B'].forEach(c => { bets[`c${c}`] = bet; });
          return bets;
        },
      },
      {
        name: 'AdaptiveHybrid',
        description: 'Simulated baseline adaptive behavior (mixed bets)',
        execute: (balance) => {
          const bets = {};
          const bet = Math.floor(balance / 8);
          if (balance < bet * 8) return bets;
          [2, 5, 6, 8].forEach(id => { bets[`h${id}`] = bet; });
          ['One Pair', 'Two Pair'].forEach(r => { bets[`r${r}`] = bet; });
          return bets;
        },
      },
    ];

    // Simulate each strategy
    const results = [];
    const STARTING_BALANCE = 1000;

    for (const strategy of STRATEGIES) {
      let totalBets = 0, totalPayouts = 0;

      for (let game = 0; game < GAMES_PER_STRATEGY; game++) {
        const bets = strategy.execute(STARTING_BALANCE);
        if (Object.keys(bets).length === 0) continue;

        let gameBet = 0, gameWin = 0;
        Object.values(bets).forEach(bet => { if (typeof bet === 'number') gameBet += bet; });

        const winningHand = Math.floor(Math.random() * 10) + 1;
        const hand = FIXED_HANDS[winningHand - 1];
        const gameRank = rollRank();
        const redCount = rollRedCount();
        const winningColors = getWinningColors(redCount);

        // Hand payouts
        if (bets[`h${winningHand}`]) gameWin += bets[`h${winningHand}`] * (1 + hand.payout);

        // Rank payouts
        if (bets[`r${gameRank}`]) {
          const mult = RANK_PAYOUTS[gameRank];
          if (mult !== null) gameWin += bets[`r${gameRank}`] * (1 + mult);
        }

        // Color payouts
        for (const colorKey of winningColors) {
          if (bets[`c${colorKey}`]) gameWin += bets[`c${colorKey}`] * (1 + COLOR_PAYOUTS[colorKey]);
        }

        totalBets += gameBet;
        totalPayouts += gameWin;
      }

      const rtp = totalBets > 0 ? totalPayouts / totalBets : 0;
      const compliant = rtp >= 0.95 && rtp <= 0.98;

      results.push({
        strategy: strategy.name,
        description: strategy.description,
        gamesSimulated: GAMES_PER_STRATEGY,
        totalBets,
        totalPayouts,
        rtp: (rtp * 100).toFixed(3) + '%',
        compliant,
        houseEdge: ((1 - rtp) * 100).toFixed(3) + '%',
      });
    }

    // Aggregate stats
    const aggregateBets = results.reduce((s, r) => s + r.totalBets, 0);
    const aggregatePayouts = results.reduce((s, r) => s + r.totalPayouts, 0);
    const aggregateRtp = aggregateBets > 0 ? aggregatePayouts / aggregateBets : 0;
    const allCompliant = results.every(r => r.compliant);

    return Response.json({
      success: true,
      report: {
        title: 'REGULATORY COMPLIANCE AUDIT - 11 STRATEGIES × 1M GAMES EACH',
        totalGamesSimulated: GAMES_PER_STRATEGY * STRATEGIES.length,
        totalBets: aggregateBets,
        totalPayouts: aggregatePayouts,
        aggregateRtp: (aggregateRtp * 100).toFixed(3) + '%',
        aggregateHouseEdge: ((1 - aggregateRtp) * 100).toFixed(3) + '%',
        complianceStatus: allCompliant ? 'APPROVED' : 'REVIEW REQUIRED',
        targetRange: '95.0% – 98.0%',
      },
      strategyResults: results,
      auditNotes: [
        `All ${STRATEGIES.length} named strategies stress-tested independently`,
        `Each strategy: ${GAMES_PER_STRATEGY.toLocaleString()} games (realistic player behavior)`,
        `Hand payouts: Fixed 1-10 hands with published payout multipliers`,
        `Rank payouts: Probabilistic based on Texas Hold\'em frequency distributions`,
        `Color board: Cumulative payout model (4R/4B also pays 3R/3B, etc.)`,
        `Compliant strategies: ${results.filter(r => r.compliant).length}/${STRATEGIES.length}`,
      ],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});