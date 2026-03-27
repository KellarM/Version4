import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gamesToSimulate = 10 } = await req.json();

    // Fixed hands and payouts
    const FIXED_HANDS = [
      { id: 1, payout: 2.4 }, { id: 2, payout: 1.2 }, { id: 3, payout: 2.4 },
      { id: 4, payout: 1.9 }, { id: 5, payout: 1.6 }, { id: 6, payout: 1.2 },
      { id: 7, payout: 1.6 }, { id: 8, payout: 1.9 }, { id: 9, payout: 1.9 },
      { id: 10, payout: 2.4 },
    ];

    const rankPayoutMap = {
      'Royal Flush': null,
      'Straight Flush': null,
      'Four of a Kind': 5.8,
      'Full House': 1.5,
      'Flush': 2.0,
      'Straight': 2.9,
      'Three of a Kind': 1.5,
      'Two Pair': 7.4,
      'One Pair': 9.0,
    };

    const rankFrequencies = {
      'Royal Flush': 0.000154,
      'Straight Flush': 0.00139,
      'Four of a Kind': 0.00168,
      'Full House': 0.00261,
      'Flush': 0.00327,
      'Straight': 0.00462,
      'Three of a Kind': 0.02113,
      'Two Pair': 0.04754,
      'One Pair': 0.42256,
    };

    const rbPayoutMap = { '3R': 0.19, '3B': 0.19, '4R': 0.74, '4B': 0.74, '5R': 2.9, '5B': 2.9 };

    // Player strategy profiles
    const strategyProfiles = [
      { name: 'Aggressive', handBetProb: 0.9, rankBetProb: 0.8, rbBetProb: 0.7, lhBetProb: 0.6 },
      { name: 'Conservative', handBetProb: 0.4, rankBetProb: 0.3, rbBetProb: 0.2, lhBetProb: 0.3 },
      { name: 'Cunning', handBetProb: 0.7, rankBetProb: 0.6, rbBetProb: 0.5, lhBetProb: 0.8 },
      { name: 'Random', handBetProb: 0.5, rankBetProb: 0.5, rbBetProb: 0.5, lhBetProb: 0.5 },
    ];

    const games = [];
    let totalBets = 0;
    let totalPayouts = 0;

    for (let game = 0; game < gamesToSimulate; game++) {
      // Random player count (1-5)
      const playerCount = Math.floor(Math.random() * 5) + 1;
      
      // Assign random strategies to players
      const players = Array.from({ length: playerCount }, () => {
        const strategy = strategyProfiles[Math.floor(Math.random() * strategyProfiles.length)];
        return { strategy: strategy.name, ...strategy };
      });

      let gameBets = 0;
      let gamePayouts = 0;
      const playerDetails = [];

      // Simulate each player's bets
      for (let p = 0; p < playerCount; p++) {
        const player = players[p];
        const bets = {};
        let playerBet = 0;
        let playerWin = 0;

        // Hand bets
        if (Math.random() < player.handBetProb) {
          const handId = Math.floor(Math.random() * 10) + 1;
          const bet = [5, 10, 25][Math.floor(Math.random() * 3)];
          bets.hand = { id: handId, amount: bet };
          playerBet += bet;

          // Winner hand gets payout
          const winningHandId = Math.floor(Math.random() * 10) + 1;
          if (handId === winningHandId) {
            const hand = FIXED_HANDS.find(h => h.id === handId);
            playerWin += bet * (1 + hand.payout);
          }
        }

        // Rank bets
        if (Math.random() < player.rankBetProb) {
          const rankKeys = Object.keys(rankPayoutMap);
          const rank = rankKeys[Math.floor(Math.random() * rankKeys.length)];
          const bet = [5, 10, 25][Math.floor(Math.random() * 3)];
          bets.rank = { name: rank, amount: bet };
          playerBet += bet;

          // Check if rank wins
          const roll = Math.random();
          const frequency = rankFrequencies[rank];
          if (roll < frequency) {
            const multiplier = rankPayoutMap[rank];
            if (multiplier !== null && multiplier !== undefined) {
              playerWin += bet * (1 + multiplier);
            }
          }
        }

        // Color board bets
        if (Math.random() < player.rbBetProb) {
          const colorType = Math.random() < 0.5 ? 'R' : 'B';
          const count = 3 + Math.floor(Math.random() * 3); // 3-5
          const bet = [5, 10, 25][Math.floor(Math.random() * 3)];
          bets.color = { type: `${count}${colorType}`, amount: bet };
          playerBet += bet;

          // Assume 50% chance for color outcome
          if (Math.random() < 0.5) {
            const mult = rbPayoutMap[`${count}${colorType}`] || 1;
            playerWin += bet * (1 + mult);
          }
        }

        // Low/High bets
        if (Math.random() < player.lhBetProb) {
          const bet = [5, 10, 25][Math.floor(Math.random() * 3)];
          bets.lowHigh = { type: Math.random() < 0.5 ? 'LOW' : 'HIGH', amount: bet };
          playerBet += bet;

          // 50% win probability
          if (Math.random() < 0.5) {
            playerWin += bet * 1.35;
          }
        }

        playerDetails.push({
          playerId: p + 1,
          strategy: player.strategy,
          bets: bets,
          totalBet: playerBet,
          totalWin: playerWin,
          profit: playerWin - playerBet,
        });

        gameBets += playerBet;
        gamePayouts += playerWin;
      }

      const gameProfit = gameBets - gamePayouts;
      totalBets += gameBets;
      totalPayouts += gamePayouts;

      games.push({
        gameNumber: game + 1,
        playerCount,
        players: playerDetails,
        totalBets: gameBets,
        totalPayouts: gamePayouts,
        houseProfit: gameProfit,
        rtp: ((gamePayouts / gameBets) * 100).toFixed(2) + '%',
        cumulativeRTP: ((totalPayouts / totalBets) * 100).toFixed(2) + '%',
      });
    }

    const overallRTP = ((totalPayouts / totalBets) * 100).toFixed(2);
    const houseProfit = totalBets - totalPayouts;

    return Response.json({
      success: true,
      gamesToSimulate,
      games,
      summary: {
        totalGames: gamesToSimulate,
        totalBets,
        totalPayouts,
        houseProfit,
        overallRTP: overallRTP + '%',
        isCompliant: parseFloat(overallRTP) >= 95 && parseFloat(overallRTP) <= 98,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});