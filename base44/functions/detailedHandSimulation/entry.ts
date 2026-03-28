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
    // Must exactly match lib/gameEngine.js FIXED_HANDS
    const FIXED_HANDS = [
      { id: 1,  payout: 11.18, cards: [{ rank: 'A',  suit: 'diamonds' }, { rank: '10', suit: 'hearts'   }] },
      { id: 2,  payout: 5.59,  cards: [{ rank: 'K',  suit: 'clubs'    }, { rank: 'K',  suit: 'spades'   }] },
      { id: 3,  payout: 11.18, cards: [{ rank: 'Q',  suit: 'clubs'    }, { rank: 'J',  suit: 'spades'   }] },
      { id: 4,  payout: 8.85,  cards: [{ rank: 'Q',  suit: 'spades'   }, { rank: '10', suit: 'spades'   }] },
      { id: 5,  payout: 7.45,  cards: [{ rank: 'J',  suit: 'clubs'    }, { rank: '9',  suit: 'clubs'    }] },
      { id: 6,  payout: 5.59,  cards: [{ rank: '8',  suit: 'diamonds' }, { rank: '6',  suit: 'diamonds' }] },
      { id: 7,  payout: 7.45,  cards: [{ rank: '7',  suit: 'diamonds' }, { rank: '7',  suit: 'spades'   }] },
      { id: 8,  payout: 8.85,  cards: [{ rank: '4',  suit: 'hearts'   }, { rank: '2',  suit: 'hearts'   }] },
      { id: 9,  payout: 8.85,  cards: [{ rank: '3',  suit: 'clubs'    }, { rank: '3',  suit: 'hearts'   }] },
      { id: 10, payout: 11.18, cards: [{ rank: 'A',  suit: 'hearts'   }, { rank: '5',  suit: 'diamonds' }] },
    ];

    const rankPayoutMap = {
      'Royal Flush': null,
      'Straight Flush': null,
      'Four of a Kind': 5.41,
      'Full House': 1.40,
      'Flush': 1.86,
      'Straight': 2.71,
      'Three of a Kind': 1.40,
      'Two Pair': 6.90,
      'One Pair': 8.39,
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

    const rbPayoutMap = { '3R': 1.26, '3B': 1.26, '4R': 4.9, '4B': 4.9, '5R': 19.2, '5B': 19.2 };

    // Player strategy profiles
    const strategyProfiles = [
      { name: 'Aggressive', handBetProb: 0.9, rankBetProb: 0.8, rbBetProb: 0.7, lhBetProb: 0.6 },
      { name: 'Conservative', handBetProb: 0.4, rankBetProb: 0.3, rbBetProb: 0.2, lhBetProb: 0.3 },
      { name: 'Cunning', handBetProb: 0.7, rankBetProb: 0.6, rbBetProb: 0.5, lhBetProb: 0.8 },
      { name: 'Random', handBetProb: 0.5, rankBetProb: 0.5, rbBetProb: 0.5, lhBetProb: 0.5 },
    ];

    // Color board probabilities: P(exactly k of 5 red) = C(5,k) * 0.5^5
    // Winners are cumulative: 4R also pays 3R, 5R also pays 4R and 3R
    // We simulate the actual red count (0-5), then derive all winning keys
    const COLOR_PROBS = [0.03125, 0.15625, 0.3125, 0.3125, 0.15625, 0.03125]; // 0R..5R
    function rollColorResult() {
      const r = Math.random();
      let cum = 0;
      for (let i = 0; i <= 5; i++) { cum += COLOR_PROBS[i]; if (r < cum) return i; }
      return 5;
    }
    function getWinningColorKeys(reds) {
      const blacks = 5 - reds;
      const winners = [];
      if (reds >= 3)  for (let i = 3; i <= reds;  i++) winners.push(`${i}R`);
      if (blacks >= 3) for (let i = 3; i <= blacks; i++) winners.push(`${i}B`);
      return winners;
    }

    // Rank roll using cumulative frequencies
    const RANK_KEYS = Object.keys(rankFrequencies);
    const RANK_CUM = [];
    let _cum = 0;
    for (const k of RANK_KEYS) { _cum += rankFrequencies[k]; RANK_CUM.push(_cum); }
    function rollRank() {
      const r = Math.random();
      for (let i = 0; i < RANK_CUM.length; i++) { if (r < RANK_CUM[i]) return RANK_KEYS[i]; }
      return 'One Pair';
    }

    const MAX_STORED_GAMES = 100;
    const games = [];
    let totalBets = 0;
    let totalPayouts = 0;

    for (let game = 0; game < gamesToSimulate; game++) {
      // ── One shared game outcome for ALL players ──
      const winningHandId = Math.floor(Math.random() * 10) + 1;  // 1-10
      const winningHand   = FIXED_HANDS.find(h => h.id === winningHandId);
      const gameRank      = rollRank();                           // e.g. 'One Pair'
      const gameRedCount  = rollColorResult();                    // 0-5 red cards
      const winningColors = getWinningColorKeys(gameRedCount);    // e.g. ['3R','4R']
      const gameLH        = Math.random() < 0.5 ? 'LOW' : 'HIGH';

      // Random player count (1-5)
      const playerCount = Math.floor(Math.random() * 5) + 1;
      const players = Array.from({ length: playerCount }, () => {
        const strategy = strategyProfiles[Math.floor(Math.random() * strategyProfiles.length)];
        return { strategy: strategy.name, ...strategy };
      });

      let gameBets = 0;
      let gamePayouts = 0;
      const playerDetails = [];

      for (let p = 0; p < playerCount; p++) {
        const player = players[p];
        const bets = {};
        let playerBet = 0;
        let playerWin = 0;

        // Hand bet — player picks one of the 10 hands; wins if it matches the game's winning hand
        if (Math.random() < player.handBetProb) {
          const handId = Math.floor(Math.random() * 10) + 1;
          const bet    = [5, 10, 25][Math.floor(Math.random() * 3)];
          const hand   = FIXED_HANDS.find(h => h.id === handId);
          const won    = handId === winningHandId;
          const winAmount = won ? bet * (1 + hand.payout) : 0;
          const cards  = hand.cards.map(c => `${c.rank}${SUITS_MAP[c.suit]}`).join(' / ');

          bets.hand = { id: handId, cards, amount: bet, winAmount, won };
          playerBet += bet;
          playerWin += winAmount;
        }

        // Rank bet — player picks a rank; wins if it matches the game's rank
        if (Math.random() < player.rankBetProb) {
          const rank       = RANK_KEYS[Math.floor(Math.random() * RANK_KEYS.length)];
          const bet        = [5, 10, 25][Math.floor(Math.random() * 3)];
          const won        = rank === gameRank;
          const multiplier = rankPayoutMap[rank];
          const winAmount  = won && multiplier !== null ? bet * (1 + multiplier) : 0;

          bets.rank = { name: rank, amount: bet, winAmount, won };
          playerBet += bet;
          playerWin += winAmount;
        }

        // Color board bet — player picks one color key; wins if it's in the game's winning keys
        if (Math.random() < player.rbBetProb) {
          const colorKeys  = Object.keys(rbPayoutMap);
          const colorKey   = colorKeys[Math.floor(Math.random() * colorKeys.length)];
          const bet        = [5, 10, 25][Math.floor(Math.random() * 3)];
          const won        = winningColors.includes(colorKey);
          const mult       = rbPayoutMap[colorKey];
          const winAmount  = won ? bet * (1 + mult) : 0;

          bets.color = { type: colorKey, amount: bet, winAmount, won };
          playerBet += bet;
          playerWin += winAmount;
        }

        // Low/High bet — player picks LOW or HIGH; wins if it matches the game's river result
        if (Math.random() < player.lhBetProb) {
          const type      = Math.random() < 0.5 ? 'LOW' : 'HIGH';
          const bet       = [5, 10, 25][Math.floor(Math.random() * 3)];
          const won       = type === gameLH;
          const winAmount = won ? bet * 1.83 : 0;

          bets.lowHigh = { type, amount: bet, winAmount, won };
          playerBet += bet;
          playerWin += winAmount;
        }

        playerDetails.push({
          playerId: p + 1,
          strategy: player.strategy,
          bets,
          totalBet: playerBet,
          totalWin: playerWin,
          profit: playerWin - playerBet,
        });

        gameBets    += playerBet;
        gamePayouts += playerWin;
      }

      const gameProfit = gameBets - gamePayouts;
      totalBets += gameBets;
      totalPayouts += gamePayouts;

      // Only store detail records for the first MAX_STORED_GAMES to avoid memory limits
      if (game < MAX_STORED_GAMES) {
        const winnerCards = winningHand.cards.map(c => `${c.rank}${SUITS_MAP[c.suit]}`).join(' / ');
        games.push({
          gameNumber: game + 1,
          playerCount,
          gameOutcome: {
            winningHand: `H${winningHandId} (${winnerCards})`,
            winningRank: gameRank,
            colorResult: `${gameRedCount}R / ${5 - gameRedCount}B`,
            winningColorKeys: winningColors.length > 0 ? winningColors.join(', ') : 'None',
            riverResult: gameLH,
          },
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