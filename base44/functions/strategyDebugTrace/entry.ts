import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const gamesToSimulate = body.gamesToSimulate || 100;
    const strategyName = body.strategyName || 'RankStacker';

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

    // RankStacker strategy
    const strategy = (balance) => {
      const bets = {};
      const bet = balance < 200 ? Math.floor(balance / 7) : 30;
      if (balance < bet * 7) return null; // Can't afford bets
      [6, 8].forEach(id => { bets[`h${id}`] = bet; });
      ['One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Full House'].forEach(r => {
        bets[`r${r}`] = bet;
      });
      return bets;
    };

    const STARTING_BALANCE = 1000;
    let balance = STARTING_BALANCE;
    const gameLog = [];
    let totalProfit = 0;

    for (let game = 0; game < gamesToSimulate; game++) {
      if (balance <= 0) {
        gameLog.push({
          gameNumber: game + 1,
          balanceBefore: balance,
          betTotal: 0,
          outcome: 'BANKRUPT - SIMULATION STOPPED',
          balanceAfter: balance,
        });
        break;
      }

      const bets = strategy(balance);
      if (!bets) {
        gameLog.push({
          gameNumber: game + 1,
          balanceBefore: balance,
          betTotal: 0,
          outcome: 'INSUFFICIENT FUNDS - SIMULATION STOPPED',
          balanceAfter: balance,
        });
        break;
      }

      let totalBet = 0;
      Object.entries(bets).forEach(([key, val]) => {
        if (typeof val === 'number') totalBet += val;
      });

      if (balance < totalBet) {
        gameLog.push({
          gameNumber: game + 1,
          balanceBefore: balance,
          betTotal: totalBet,
          outcome: 'BET EXCEEDS BALANCE - SIMULATION STOPPED',
          balanceAfter: balance,
        });
        break;
      }

      balance -= totalBet;
      let gameWin = 0;

      const winningHand = Math.floor(Math.random() * 10) + 1;
      const hand = FIXED_HANDS[winningHand - 1];
      const gameRank = rollRank();
      const redCount = rollRedCount();
      const winningColors = getWinningColors(redCount);

      if (bets[`h${winningHand}`]) {
        gameWin += bets[`h${winningHand}`] * (1 + hand.payout);
      }

      if (bets[`r${gameRank}`]) {
        const mult = RANK_PAYOUTS[gameRank];
        if (mult !== null) gameWin += bets[`r${gameRank}`] * (1 + mult);
      }

      for (const colorKey of winningColors) {
        if (bets[`c${colorKey}`]) gameWin += bets[`c${colorKey}`] * (1 + COLOR_PAYOUTS[colorKey]);
      }

      balance += gameWin;
      const netGame = gameWin - totalBet;
      totalProfit += netGame;

      gameLog.push({
        gameNumber: game + 1,
        balanceBefore: balance + totalBet,
        betTotal: totalBet,
        winningHand: `H${winningHand}`,
        winningRank: gameRank,
        payoutReceived: gameWin,
        netResult: netGame > 0 ? `+${netGame.toFixed(2)}` : `${netGame.toFixed(2)}`,
        balanceAfter: balance.toFixed(2),
      });
    }

    return Response.json({
      success: true,
      strategy: strategyName,
      summary: {
        gamesPlayed: gameLog.length,
        totalProfit: totalProfit.toFixed(2),
        finalBalance: balance.toFixed(2),
        startingBalance: STARTING_BALANCE,
      },
      gameLog: gameLog.slice(0, 100), // First 100 games detail
      note: gameLog.length > 100 ? `Showing first 100 of ${gameLog.length} games` : 'All games shown',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});