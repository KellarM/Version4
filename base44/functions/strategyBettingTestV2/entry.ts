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

    // Poker hand rank frequencies (from Texas Hold'em)
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
      'Straight Flush': null,  // Progressive
      'Royal Flush': null,     // Progressive
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
          const totalBetsNeeded = (4 + 4) * handBet; // 4 hands + 4 colors
          if (balance < totalBetsNeeded) return null; // Signal bankrupt
          
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
          const totalBetsNeeded = (2 + 5) * handBet; // 2 hands + 5 ranks
          if (balance < totalBetsNeeded) return null;
          
          [6, 8].forEach(id => { bets[`h${id}`] = handBet; });
          ['One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Full House'].forEach(r => {
            bets[`r${r}`] = handBet;
          });
          return { bets, balance };
        },
      },
      FlushHunter: {
        name: 'Flush Hunter (Hands targeting flushes + Flush rank)',
        execute: (balance) => {
          const bets = {};
          const handBet = balance < 250 ? Math.floor(balance / 5) : 50;
          const totalBetsNeeded = (2 + 1) * handBet; // 2 hands + 1 rank
          if (balance < totalBetsNeeded) return null;
          
          [6, 8].forEach(id => { bets[`h${id}`] = handBet; });
          bets['rFlush'] = handBet;
          bets['riverHedge'] = true;
          return { bets, balance };
        },
      },
      StraightHunter: {
        name: 'Straight Hunter (Hands targeting straights + Straight rank)',
        execute: (balance) => {
          const bets = {};
          const handBet = balance < 250 ? Math.floor(balance / 5) : 50;
          const totalBetsNeeded = (3 + 1) * handBet; // 3 hands + 1 rank
          if (balance < totalBetsNeeded) return null;
          
          [1, 5, 10].forEach(id => { bets[`h${id}`] = handBet; });
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
          const totalBetsNeeded = (2 + 6) * handBet; // 2 hands + 6 colors
          if (balance < totalBetsNeeded) return null;
          
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
          const totalBetsNeeded = (2 + 3) * handBet; // 2 hands + 3 ranks
          if (balance < totalBetsNeeded) return null;
          
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
          const totalBetsNeeded = (3 + 3 + 2) * smallBet; // 3 hands + 3 ranks + 2 colors
          if (balance < totalBetsNeeded) return null;
          
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
          const totalBetsNeeded = (6 + 2 + 2) * microBet; // 6 hands + 2 ranks + 2 colors
          if (balance < totalBetsNeeded) return null;
          
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
            if (balance < bet * 4) return null;
            [2, 5, 6, 8].forEach(id => { bets[`h${id}`] = bet; });
            bets.strategy = 'Hot Streak';
          }
          // Cold streak: increase color/rank diversification
          else if (winRate < 0.45) {
            const bet = Math.floor(balance / 8);
            if (balance < bet * 8) return null;
            [1, 4, 6, 9].forEach(id => { bets[`h${id}`] = bet; });
            ['One Pair', 'Two Pair'].forEach(r => { bets[`r${r}`] = bet; });
            bets.strategy = 'Cold Streak - Diversify';
          }
          // Balanced: mix of hands and colors
          else {
            const bet = Math.floor(balance / 6);
            if (balance < bet * 6) return null;
            [2, 6, 8].forEach(id => { bets[`h${id}`] = bet; });
            ['3R', '3B'].forEach(c => { bets[`c${c}`] = bet; });
            bets.strategy = 'Balanced';
          }
          return { bets, balance };
        },
      },
      MetaAdaptive: {
        name: 'Meta Adaptive (AI-driven multi-strategy mixer targeting 95-98% RTP)',
        execute: (balance, game, previousWins, previousLosses, recentGameHistory = []) => {
          const bets = {};
          const totalGames = previousWins + previousLosses;
          const winRate = totalGames > 0 ? previousWins / totalGames : 0.5;
          
          // Calculate volatility: variance in recent results (last 20 games)
          let volatility = 0;
          if (recentGameHistory && recentGameHistory.length > 0) {
            const recent = recentGameHistory.slice(-20);
            const avgWin = recent.reduce((s, r) => s + (r ? 1 : 0), 0) / recent.length;
            volatility = recent.reduce((s, r) => s + Math.pow((r ? 1 : 0) - avgWin, 2), 0) / recent.length;
          }
          
          // Momentum: recent wins vs losses (last 10 games)
          let momentum = 0;
          if (recentGameHistory && recentGameHistory.length >= 10) {
            const recent10 = recentGameHistory.slice(-10);
            momentum = recent10.filter(r => r).length - recent10.filter(r => !r).length;
          }
          
          // Bankroll pressure: how depleted we are
          const bankrollHealth = balance / 1000; // Original starting balance
          const underPressure = bankrollHealth < 0.5;
          
          // Decision tree: select best base strategy + mixing coefficient
          let baseStrategy = 'ST1_Original';
          let mixCoeff = 0.5;
          let secondaryStrategy = 'BalancedSpread';
          
          // Hot hot hot: pure aggressive
          if (winRate > 0.58 && momentum > 5 && !underPressure) {
            baseStrategy = 'HighPayoutFocus';
            mixCoeff = 0.8;
            secondaryStrategy = 'RiverFocused';
          }
          // Hot: mostly aggressive, some hedging
          else if (winRate > 0.52 && momentum >= 0) {
            baseStrategy = 'FlushHunter';
            mixCoeff = 0.6;
            secondaryStrategy = 'ConservativeHedger';
          }
          // Neutral-hot: balanced
          else if (winRate > 0.48 && volatility < 0.3) {
            baseStrategy = 'BalancedSpread';
            mixCoeff = 0.5;
            secondaryStrategy = 'RankStacker';
          }
          // Cold but stable: diversify & hedge
          else if (winRate < 0.48 && volatility < 0.35) {
            baseStrategy = 'DiversifiedHedge';
            mixCoeff = 0.6;
            secondaryStrategy = 'ConservativeHedger';
          }
          // Highly volatile cold streak: aggressive rank focus
          else if (volatility > 0.35 && winRate < 0.45) {
            baseStrategy = 'RankStacker';
            mixCoeff = 0.7;
            secondaryStrategy = 'ColorBoardSpecialist';
          }
          // Bankroll under pressure: conservative everywhere
          else if (underPressure) {
            baseStrategy = 'ConservativeHedger';
            mixCoeff = 0.5;
            secondaryStrategy = 'DiversifiedHedge';
          }
          
          // Generate mixed bet structure: (baseStrategy * mixCoeff) + (secondaryStrategy * (1 - mixCoeff))
          const baseBet = Math.floor(balance / 10);
          if (balance < baseBet * 5) return null;
          
          // Primary strategy allocation
          if (baseStrategy === 'ST1_Original') {
            [2, 5, 6, 7, 8, 9].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff); });
          } else if (baseStrategy === 'HighPayoutFocus') {
            [6, 8].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff * 1.5); });
            ['Three of a Kind', 'Full House'].forEach(r => { bets[`r${r}`] = Math.floor(baseBet * mixCoeff); });
          } else if (baseStrategy === 'FlushHunter') {
            [3, 4, 5].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff); });
            bets['rFlush'] = Math.floor(baseBet * mixCoeff);
          } else if (baseStrategy === 'RankStacker') {
            [6, 8].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff); });
            ['One Pair', 'Two Pair', 'Flush'].forEach(r => { bets[`r${r}`] = Math.floor(baseBet * mixCoeff); });
          } else if (baseStrategy === 'BalancedSpread') {
            [2, 6, 8].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff); });
            ['One Pair', 'Flush'].forEach(r => { bets[`r${r}`] = Math.floor(baseBet * mixCoeff); });
          } else if (baseStrategy === 'DiversifiedHedge') {
            [1, 3, 5, 7, 9].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff * 0.6); });
            ['One Pair', 'Two Pair'].forEach(r => { bets[`r${r}`] = Math.floor(baseBet * mixCoeff * 0.6); });
          } else if (baseStrategy === 'ConservativeHedger') {
            [3, 6, 8, 10].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff); });
            ['3R', '3B'].forEach(c => { bets[`c${c}`] = Math.floor(baseBet * mixCoeff * 0.7); });
          } else if (baseStrategy === 'ColorBoardSpecialist') {
            [1, 4].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff); });
            ['3R', '3B', '4R', '4B'].forEach(c => { bets[`c${c}`] = Math.floor(baseBet * mixCoeff * 0.8); });
          } else if (baseStrategy === 'RiverFocused') {
            bets['h8'] = Math.floor(baseBet * mixCoeff * 2);
            bets['riverAggressive'] = true;
          }
          
          // Secondary strategy allocation (blended)
          const secondBet = Math.floor(baseBet * (1 - mixCoeff));
          if (secondaryStrategy === 'ConservativeHedger') {
            [3, 6].forEach(id => { bets[`h${id}`] = (bets[`h${id}`] || 0) + secondBet; });
            ['3R', '3B'].forEach(c => { bets[`c${c}`] = (bets[`c${c}`] || 0) + Math.floor(secondBet * 0.7); });
          } else if (secondaryStrategy === 'RankStacker') {
            ['One Pair', 'Two Pair'].forEach(r => { bets[`r${r}`] = (bets[`r${r}`] || 0) + secondBet; });
          } else if (secondaryStrategy === 'ColorBoardSpecialist') {
            ['3R', '3B'].forEach(c => { bets[`c${c}`] = (bets[`c${c}`] || 0) + Math.floor(secondBet * 0.6); });
          } else if (secondaryStrategy === 'RiverFocused') {
            bets['riverHedge'] = true;
          } else if (secondaryStrategy === 'DiversifiedHedge') {
            [1, 5, 9].forEach(id => { bets[`h${id}`] = (bets[`h${id}`] || 0) + Math.floor(secondBet * 0.5); });
          }
          
          bets.strategy = `${baseStrategy}(${(mixCoeff * 100).toFixed(0)}%) + ${secondaryStrategy}(${((1-mixCoeff)*100).toFixed(0)}%) [WR:${(winRate*100).toFixed(1)}% Vol:${volatility.toFixed(2)} Mom:${momentum}]`;
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
    let maxProfitEver = 0;
    let maxProfitGameNumber = 0;
    const doublingMilestones = {};
    let nextMilestone = STARTING_BALANCE * 2;
    let balance = STARTING_BALANCE;
    let winCount = 0, lossCount = 0;
    let maxLossStreak = 0, currentLossStreak = 0;
    let maxWinStreak = 0, currentWinStreak = 0;
    const recentGameHistory = [];

    for (let game = 0; game < gamesToSimulate; game++) {
      if (balance <= 0) break;
      gamesActuallyPlayed++;

      const gameResult = strategy.execute(balance, game, winCount, lossCount, recentGameHistory);
      if (!gameResult || Object.keys(gameResult.bets).length === 0) break; // Strategy can't afford bets
      const { bets } = gameResult;

      // Calculate total bet
      let totalBet = 0;
      Object.entries(bets).forEach(([key, val]) => {
        if (typeof val === 'number') totalBet += val;
      });

      if (balance < totalBet) break;
      balance -= totalBet;
      let gameWin = 0;

      // Proper probabilistic simulation
      const winningHand = Math.floor(Math.random() * 10) + 1;
      const winningHand_ = FIXED_HANDS.find(h => h.id === winningHand);
      const gameRank = rollRank();
      const redCount = rollRedCount();
      const winningColors = getWinningColors(redCount);
      const riverIsLow = Math.random() < 0.5;

      // Hand payouts (player wins if they bet on winning hand)
      if (bets[`h${winningHand}`]) {
        gameWin += bets[`h${winningHand}`] * (1 + winningHand_.payout);
      }

      // Rank payouts (player wins if they bet on the rank that hit)
      if (bets[`r${gameRank}`]) {
        const rankMult = RANK_PAYOUTS[gameRank];
        if (rankMult !== null) {
          gameWin += bets[`r${gameRank}`] * (1 + rankMult);
        }
      }

      // Color payouts (cumulative: 4R also wins 3R, 5R also wins 4R and 3R)
      for (const colorKey of winningColors) {
        if (bets[`c${colorKey}`]) {
          gameWin += bets[`c${colorKey}`] * (1 + COLOR_PAYOUTS[colorKey]);
        }
      }

      // River hedge/aggressive (optional payouts)
      if (bets.riverHedge && Math.random() < 0.5) {
        gameWin += Math.floor(totalBet * 0.15);
      }
      if (bets.riverAggressive && Math.random() < 0.35) {
        gameWin += Math.floor(totalBet * 0.5);
      }

      const netGame = gameWin - totalBet;
      const gameWon = netGame > 0;
      if (gameWon) {
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

      recentGameHistory.push(gameWon);
      if (recentGameHistory.length > 100) recentGameHistory.shift();

      balance += gameWin;
      totalProfit += netGame;

      // Track peaks and milestones
      if (balance > maxBankrollEver) {
        maxBankrollEver = balance;
        maxBankrollGameNumber = gamesActuallyPlayed;
      }

      if (totalProfit > maxProfitEver) {
        maxProfitEver = totalProfit;
        maxProfitGameNumber = gamesActuallyPlayed;
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
        maxProfit: maxProfitEver.toFixed(2),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});