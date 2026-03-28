import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const gamesToSimulate = body.gamesToSimulate || 100;
    const strategyName = body.strategyName || 'BalancedSpread';

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

    const STARTING_BALANCE = 1000;

    const RED_COUNT_PROBS = [0.03125, 0.15625, 0.3125, 0.3125, 0.15625, 0.03125];
    const RED_COUNT_CUM = [];
    let rcCum = 0;
    for (const p of RED_COUNT_PROBS) { rcCum += p; RED_COUNT_CUM.push(rcCum); }

    function rollRedCount() {
      const r = Math.random();
      for (let i = 0; i < 6; i++) { if (r < RED_COUNT_CUM[i]) return i; }
      return 5;
    }

    function isLow(rank) {
      const LOW_RANKS = ['2', '3', '4', '5', '6', '7'];
      return LOW_RANKS.includes(rank);
    }

    // Strategy implementations
    const strategies = {
      ST1_Original: {
        name: 'ST1: Original (Hands 2,5,6,7,8,9)',
        execute: (balance, game) => {
          const bets = {};
          const handBet = balance < 300 ? Math.floor(balance / 6) : 50;
          if (balance < handBet * 6) return { bets, balance };
          
          [2, 5, 6, 7, 8, 9].forEach(id => { bets[`h${id}`] = handBet; });
          bets.riverHedge = true;
          return { bets, balance };
        },
      },
      ConservativeHedger: {
        name: 'Conservative Hedger (4 hands + all colors)',
        execute: (balance) => {
          const bets = {};
          const handBet = balance < 200 ? Math.floor(balance / 8) : 25;
          if (balance < handBet * 8) return { bets, balance };
          
          [3, 6, 8, 10].forEach(id => { bets[`h${id}`] = handBet; });
          ['3R', '3B', '4R', '4B'].forEach(k => { bets[`c${k}`] = handBet; });
          return { bets, balance };
        },
      },
      RankStacker: {
        name: 'Rank Stacker (High-freq ranks + 2 hands)',
        execute: (balance) => {
          const bets = {};
          const handBet = balance < 200 ? Math.floor(balance / 7) : 30;
          if (balance < handBet * 7) return { bets, balance };
          
          [6, 8].forEach(id => { bets[`h${id}`] = handBet; });
          ['One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Full House'].forEach(r => {
            bets[`r${r}`] = handBet;
          });
          return { bets, balance };
        },
      },
      FlushHunter: {
        name: 'Flush Hunter (Hands 3,4,5 + Flush rank)',
        execute: (balance) => {
          const bets = {};
          const handBet = balance < 250 ? Math.floor(balance / 5) : 50;
          if (balance < handBet * 5) return { bets, balance };
          
          [3, 4, 5].forEach(id => { bets[`h${id}`] = handBet; });
          bets['rFlush'] = handBet;
          bets['riverHedge'] = true;
          return { bets, balance };
        },
      },
      StraightHunter: {
        name: 'Straight Hunter (Hands 4,5,7 + Straight rank)',
        execute: (balance) => {
          const bets = {};
          const handBet = balance < 250 ? Math.floor(balance / 5) : 50;
          if (balance < handBet * 5) return { bets, balance };
          
          [4, 5, 7].forEach(id => { bets[`h${id}`] = handBet; });
          bets['rStraight'] = handBet;
          bets['riverHedge'] = true;
          return { bets, balance };
        },
      },
      ColorBoardSpecialist: {
        name: 'Color Specialist (Light hands + all colors)',
        execute: (balance) => {
          const bets = {};
          const handBet = balance < 200 ? Math.floor(balance / 9) : 20;
          if (balance < handBet * 9) return { bets, balance };
          
          [1, 4].forEach(id => { bets[`h${id}`] = handBet; });
          ['3R', '3B', '4R', '4B', '5R', '5B'].forEach(c => { bets[`c${c}`] = handBet; });
          bets['riverHedge'] = true;
          return { bets, balance };
        },
      },
      HighPayoutFocus: {
        name: 'High Payout Focus (Hands 6,8 + Trips/Full House)',
        execute: (balance) => {
          const bets = {};
          const handBet = balance < 250 ? Math.floor(balance / 5) : 50;
          if (balance < handBet * 5) return { bets, balance };
          
          [6, 8].forEach(id => { bets[`h${id}`] = handBet; });
          ['Three of a Kind', 'Full House', 'Four of a Kind'].forEach(r => {
            bets[`r${r}`] = handBet;
          });
          return { bets, balance };
        },
      },
      RiverFocused: {
        name: 'River Focused (1 hand + aggressive river betting)',
        execute: (balance) => {
          const bets = {};
          const handBet = balance < 100 ? Math.floor(balance / 2) : 50;
          if (balance < handBet * 2) return { bets, balance };
          
          bets['h8'] = handBet;
          bets['riverAggressive'] = true;
          return { bets, balance };
        },
      },
      BalancedSpread: {
        name: 'Balanced Spread (Equal mix of all bets)',
        execute: (balance) => {
          const bets = {};
          const smallBet = balance < 300 ? Math.floor(balance / 10) : 30;
          if (balance < smallBet * 10) return { bets, balance };
          
          [2, 6, 8].forEach(id => { bets[`h${id}`] = smallBet; });
          ['One Pair', 'Flush', 'Straight'].forEach(r => { bets[`r${r}`] = smallBet; });
          ['3R', '4R'].forEach(c => { bets[`c${c}`] = smallBet; });
          bets['riverHedge'] = true;
          return { bets, balance };
        },
      },
      DiversifiedHedge: {
        name: 'Diversified Hedge (Many small bets, low variance)',
        execute: (balance) => {
          const bets = {};
          const microBet = balance < 200 ? Math.floor(balance / 12) : 15;
          if (balance < microBet * 12) return { bets, balance };
          
          [1, 3, 5, 7, 9, 10].forEach(id => { bets[`h${id}`] = microBet; });
          ['One Pair', 'Two Pair'].forEach(r => { bets[`r${r}`] = microBet; });
          ['3R', '3B'].forEach(c => { bets[`c${c}`] = microBet; });
          return { bets, balance };
        },
      },
      AdaptiveHybrid: {
        name: 'Adaptive Hybrid (Switches strategies based on results)',
        execute: (balance, game, previousWins, previousLosses) => {
          const bets = {};
          const winRate = previousWins + previousLosses > 0 ? previousWins / (previousWins + previousLosses) : 0;
          
          // Hot streak: increase hand bets, reduce hedges
          if (winRate > 0.55) {
            const bet = Math.floor(balance / 4);
            if (balance < bet * 4) return { bets, balance };
            [2, 5, 6, 8].forEach(id => { bets[`h${id}`] = bet; });
            bets.strategy = 'Hot Streak';
          }
          // Cold streak: increase color/rank diversification
          else if (winRate < 0.45) {
            const bet = Math.floor(balance / 8);
            if (balance < bet * 8) return { bets, balance };
            [1, 4, 6, 9].forEach(id => { bets[`h${id}`] = bet; });
            ['One Pair', 'Two Pair'].forEach(r => { bets[`r${r}`] = bet; });
            bets.strategy = 'Cold Streak - Diversify';
          }
          // Balanced: mix of hands and colors
          else {
            const bet = Math.floor(balance / 6);
            if (balance < bet * 6) return { bets, balance };
            [2, 6, 8].forEach(id => { bets[`h${id}`] = bet; });
            ['3R', '3B'].forEach(c => { bets[`c${c}`] = bet; });
            bets.strategy = 'Balanced';
          }
          return { bets, balance };
        },
      },
    };

    const strategy = strategies[strategyName];
    if (!strategy) {
      return Response.json({ error: `Unknown strategy: ${strategyName}` }, { status: 400 });
    }

    let totalProfit = 0;
    let gamesActuallyPlayed = 0;
    let maxBankrollEver = STARTING_BALANCE;
    let maxBankrollGameNumber = 0;
    const doublingMilestones = {};
    let nextMilestone = STARTING_BALANCE * 2;
    let balance = STARTING_BALANCE;
    let winCount = 0, lossCount = 0;
    let maxLossStreak = 0, currentLossStreak = 0;
    let maxWinStreak = 0, currentWinStreak = 0;

    for (let game = 0; game < gamesToSimulate; game++) {
      if (balance <= 0) break;
      gamesActuallyPlayed++;

      const gameResult = strategy.execute(balance, game, winCount, lossCount);
      const { bets } = gameResult;

      // Calculate total bet
      let totalBet = 0;
      Object.entries(bets).forEach(([key, val]) => {
        if (typeof val === 'number') totalBet += val;
      });

      if (balance < totalBet) break;
      balance -= totalBet;
      let gameWin = 0;

      // Simple payout simulation (each hand has 1/10 chance, ranks have frequency-based chance)
      const winningHand = Math.floor(Math.random() * 10) + 1;
      const winningHand_ = FIXED_HANDS.find(h => h.id === winningHand);

      // Hand payouts
      if (bets[`h${winningHand}`]) {
        gameWin += bets[`h${winningHand}`] * (1 + winningHand_.payout);
      }

      // Color payouts (simplified: 50% chance any color wins)
      if (Math.random() < 0.5) {
        if (bets['c3R']) gameWin += bets['c3R'] * 1.78;
        if (bets['c3B']) gameWin += bets['c3B'] * 1.78;
      } else {
        if (bets['c4R']) gameWin += bets['c4R'] * 6.04;
        if (bets['c4B']) gameWin += bets['c4B'] * 6.04;
      }

      // River payouts (50/50)
      if (bets.riverHedge && Math.random() < 0.5) {
        gameWin += Math.floor(totalBet * 0.15);
      }
      if (bets.riverAggressive && Math.random() < 0.35) {
        gameWin += Math.floor(totalBet * 0.5);
      }

      const netGame = gameWin - totalBet;
      if (netGame > 0) {
        winCount++;
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else {
        lossCount++;
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }

      balance += gameWin;
      totalProfit += netGame;

      // Track peaks and milestones
      if (balance > maxBankrollEver) {
        maxBankrollEver = balance;
        maxBankrollGameNumber = gamesActuallyPlayed;
      }

      while (balance >= nextMilestone && !doublingMilestones[nextMilestone]) {
        doublingMilestones[nextMilestone] = gamesActuallyPlayed;
        nextMilestone *= 2;
      }
    }

    const avgProfit = gamesActuallyPlayed > 0 ? totalProfit / gamesActuallyPlayed : 0;
    const roi = ((totalProfit / STARTING_BALANCE) * 100).toFixed(1);
    const winRate = gamesActuallyPlayed > 0 ? ((winCount / gamesActuallyPlayed) * 100).toFixed(1) : 0;
    const maxProfit = totalProfit;

    return Response.json({
      success: true,
      strategyName,
      gamesToSimulate,
      gamesActuallyPlayed,
      stoppedEarly: gamesActuallyPlayed < gamesToSimulate,
      totalProfit: totalProfit.toFixed(2),
      avgProfitPerGame: avgProfit.toFixed(2),
      finalBalance: balance.toFixed(2),
      maxBankrollEver: maxBankrollEver.toFixed(2),
      maxBankrollGameNumber,
      doublingMilestones,
      roi: roi + '%',
      stats: {
        winCount,
        lossCount,
        winRate: winRate + '%',
        maxWinStreak,
        maxLossStreak,
        maxProfit: maxProfit.toFixed(2),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});