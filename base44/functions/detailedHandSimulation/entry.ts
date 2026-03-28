import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gamesToSimulate = 10 } = await req.json();

    // Fixed hands and payouts (matching lib/gameEngine.js FIXED_HANDS)
    const SUITS_MAP = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
    const FIXED_HANDS = [
      { id: 1,  payout: 8.12, cards: [{ rank: 'A', suit: 'spades' },  { rank: 'A', suit: 'hearts'   }] },
      { id: 2,  payout: 4.06, cards: [{ rank: 'K', suit: 'spades' },  { rank: 'K', suit: 'hearts'   }] },
      { id: 3,  payout: 8.12, cards: [{ rank: 'A', suit: 'diamonds' },{ rank: 'A', suit: 'clubs'    }] },
      { id: 4,  payout: 6.43, cards: [{ rank: 'A', suit: 'spades' },  { rank: 'K', suit: 'spades'   }] },
      { id: 5,  payout: 5.41, cards: [{ rank: 'Q', suit: 'hearts' },  { rank: 'Q', suit: 'diamonds' }] },
      { id: 6,  payout: 4.06, cards: [{ rank: '8', suit: 'diamonds' },{ rank: '6', suit: 'diamonds' }] },
      { id: 7,  payout: 5.41, cards: [{ rank: 'J', suit: 'clubs' },   { rank: 'T', suit: 'clubs'    }] },
      { id: 8,  payout: 6.43, cards: [{ rank: 'A', suit: 'hearts' },  { rank: 'K', suit: 'diamonds' }] },
      { id: 9,  payout: 6.43, cards: [{ rank: '7', suit: 'spades' },  { rank: '7', suit: 'clubs'    }] },
      { id: 10, payout: 8.12, cards: [{ rank: '2', suit: 'hearts' },  { rank: '2', suit: 'spades'   }] },
    ];

    const rankPayoutMap = {
      'Royal Flush': null,
      'Straight Flush': null,
      'Four of a Kind': 5.45,
      'Full House': 1.41,
      'Flush': 1.88,
      'Straight': 2.73,
      'Three of a Kind': 1.41,
      'Two Pair': 6.95,
      'One Pair': 8.46,
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

    const rbPayoutMap = { '3R': 0.72, '3B': 0.72, '4R': 2.8, '4B': 2.8, '5R': 10.96, '5B': 10.96 };

    // Player strategy profiles
    const strategyProfiles = [
      { name: 'Aggressive', handBetProb: 0.9, rankBetProb: 0.8, rbBetProb: 0.7, lhBetProb: 0.6 },
      { name: 'Conservative', handBetProb: 0.4, rankBetProb: 0.3, rbBetProb: 0.2, lhBetProb: 0.3 },
      { name: 'Cunning', handBetProb: 0.7, rankBetProb: 0.6, rbBetProb: 0.5, lhBetProb: 0.8 },
      { name: 'Random', handBetProb: 0.5, rankBetProb: 0.5, rbBetProb: 0.5, lhBetProb: 0.5 },
    ];

    const MAX_STORED_GAMES = 100;
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
          const winningHandId = Math.floor(Math.random() * 10) + 1;
          const won = handId === winningHandId;
          
          const hand = FIXED_HANDS.find(h => h.id === handId);
          const cards = hand.cards.map(c => `${c.rank}${SUITS_MAP[c.suit]}`).join(' / ');
          const winAmount = won ? bet * (1 + hand.payout) : 0;
          
          bets.hand = { id: handId, cards, amount: bet, winAmount, won };
          playerBet += bet;
          playerWin += winAmount;
        }

        // Rank bets
        if (Math.random() < player.rankBetProb) {
          const rankKeys = Object.keys(rankPayoutMap);
          const rank = rankKeys[Math.floor(Math.random() * rankKeys.length)];
          const bet = [5, 10, 25][Math.floor(Math.random() * 3)];
          const frequency = rankFrequencies[rank];
          const won = Math.random() < frequency;
          const multiplier = rankPayoutMap[rank];
          const winAmount = won && multiplier !== null ? bet * (1 + multiplier) : 0;
          
          bets.rank = { name: rank, amount: bet, winAmount, won };
          playerBet += bet;
          playerWin += winAmount;
        }

        // Color board bets
        if (Math.random() < player.rbBetProb) {
          const colorType = Math.random() < 0.5 ? 'R' : 'B';
          const count = 3 + Math.floor(Math.random() * 3);
          const bet = [5, 10, 25][Math.floor(Math.random() * 3)];
          const won = Math.random() < 0.5;
          const mult = rbPayoutMap[`${count}${colorType}`] || 1;
          const winAmount = won ? bet * (1 + mult) : 0;
          
          bets.color = { type: `${count}${colorType}`, amount: bet, winAmount, won };
          playerBet += bet;
          playerWin += winAmount;
        }

        // Low/High bets
        if (Math.random() < player.lhBetProb) {
          const bet = [5, 10, 25][Math.floor(Math.random() * 3)];
          const won = Math.random() < 0.5;
          const winAmount = won ? bet * 1.50 : 0;
          
          bets.lowHigh = { type: Math.random() < 0.5 ? 'LOW' : 'HIGH', amount: bet, winAmount, won };
          playerBet += bet;
          playerWin += winAmount;
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

      // Only store detail records for the first MAX_STORED_GAMES to avoid memory limits
      if (game < MAX_STORED_GAMES) {
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