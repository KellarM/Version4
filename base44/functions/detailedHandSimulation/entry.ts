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
      { id: 1,  payout: 8.10,  cards: [{ rank: 'A',  suit: 'diamonds' }, { rank: '10', suit: 'hearts'   }] },
      { id: 2,  payout: 6.75,  cards: [{ rank: 'K',  suit: 'clubs'    }, { rank: 'K',  suit: 'spades'   }] },
      { id: 3,  payout: 8.52,  cards: [{ rank: 'Q',  suit: 'clubs'    }, { rank: 'J',  suit: 'spades'   }] },
      { id: 4,  payout: 7.90,  cards: [{ rank: 'Q',  suit: 'spades'   }, { rank: '10', suit: 'spades'   }] },
      { id: 5,  payout: 8.31,  cards: [{ rank: 'J',  suit: 'clubs'    }, { rank: '9',  suit: 'clubs'    }] },
      { id: 6,  payout: 10.18, cards: [{ rank: '8',  suit: 'diamonds' }, { rank: '6',  suit: 'diamonds' }] },
      { id: 7,  payout: 7.48,  cards: [{ rank: '7',  suit: 'diamonds' }, { rank: '7',  suit: 'spades'   }] },
      { id: 8,  payout: 11.95, cards: [{ rank: '4',  suit: 'hearts'   }, { rank: '2',  suit: 'hearts'   }] },
      { id: 9,  payout: 7.27,  cards: [{ rank: '3',  suit: 'clubs'    }, { rank: '3',  suit: 'hearts'   }] },
      { id: 10, payout: 9.77,  cards: [{ rank: 'A',  suit: 'hearts'   }, { rank: '5',  suit: 'diamonds' }] },
    ];

    const rankPayoutMap = {
      'Royal Flush': null,
      'Straight Flush': null,
      'Four of a Kind': 3.79,
      'Full House': 0.98,
      'Flush': 1.30,
      'Straight': 1.90,
      'Three of a Kind': 0.98,
      'Two Pair': 4.83,
      'One Pair': 5.87,
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

    const rbPayoutMap = { '3R': 0.78, '3B': 0.78, '4R': 5.04, '4B': 5.04, '5R': 19.74, '5B': 19.74 };

    // Realistic player strategy profiles — capturing hedging/coverage behavior
    const strategyProfiles = [
      // Casual: bets 1-2 hands randomly, maybe a rank, rarely color
      { name: 'Casual',      handCount: () => 1, rankCount: () => Math.random() < 0.4 ? 1 : 0, colorCount: () => Math.random() < 0.2 ? 1 : 0, lhProb: 0.2 },
      // Coverage Hedger: bets 4-6 hands to guarantee a winner most rounds + color hedge
      { name: 'Hedger',      handCount: () => 4 + Math.floor(Math.random() * 3), rankCount: () => 0, colorCount: () => 2, lhProb: 0.9 },
      // Rank Stacker: covers top 4-6 high-frequency ranks (pairs, two pair, trips, full house, straight)
      { name: 'RankStacker', handCount: () => 1, rankCount: () => 4 + Math.floor(Math.random() * 3), colorCount: () => 1, lhProb: 0.5 },
      // Spread Bettor: covers multiple hands + multiple ranks + color board + river
      { name: 'SpreadBettor',handCount: () => 3 + Math.floor(Math.random() * 3), rankCount: () => 3 + Math.floor(Math.random() * 3), colorCount: () => 3 + Math.floor(Math.random() * 3), lhProb: 0.8 },
      // Color Pusher: bets all 6 color options to always collect something on color board
      { name: 'ColorPusher', handCount: () => 1, rankCount: () => 1, colorCount: () => 6, lhProb: 0.7 },
      // Conservative: small selective bets
      { name: 'Conservative',handCount: () => 1, rankCount: () => Math.random() < 0.5 ? 1 : 0, colorCount: () => 0, lhProb: 0.3 },
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
        return { ...strategy };
      });

      let gameBets = 0;
      let gamePayouts = 0;
      const playerDetails = [];

      for (let p = 0; p < playerCount; p++) {
        const player = players[p];
        const bets = {};
        let playerBet = 0;
        let playerWin = 0;

        const bet = [5, 10, 25][Math.floor(Math.random() * 3)];

        // ── HAND BETS: player covers N hands (strategy-driven count) ──
         const numHands = Math.min(player.handCount(), 10);
         if (numHands > 0) {
           const chosenIds = [];
           while (chosenIds.length < numHands) {
             const id = Math.floor(Math.random() * 10) + 1;
             if (!chosenIds.includes(id)) chosenIds.push(id);
           }
           const handResults = chosenIds.map(handId => {
             const hand = FIXED_HANDS.find(h => h.id === handId);
             const won = handId === winningHandId;
             const winAmount = won ? bet * (1 + hand.payout) : 0;
             const cards = hand.cards.map(c => `${c.rank}${SUITS_MAP[c.suit]}`).join('/');
             playerBet += bet;
             playerWin += winAmount;
             return { handId, cards, amount: bet, winAmount, won };
           });
           bets.hands = handResults;
         }

        // ── RANK BETS: player covers N ranks (strategy-driven count) ──
         // High-frequency ranks ordered by probability for smart stacking
         const HIGH_FREQ_RANKS = ['One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Full House', 'Flush', 'Four of a Kind'];
         const numRanks = player.rankCount();
         if (numRanks > 0) {
           // Smart players pick from high-frequency ranks; casual players pick randomly
           const rankPool = player.name === 'Casual' || player.name === 'Conservative'
             ? RANK_KEYS
             : HIGH_FREQ_RANKS;
           const chosenRanks = [];
           while (chosenRanks.length < Math.min(numRanks, rankPool.length)) {
             const r = rankPool[Math.floor(Math.random() * rankPool.length)];
             if (!chosenRanks.includes(r)) chosenRanks.push(r);
           }
           const rankResults = [];
           for (const rank of chosenRanks) {
             const multiplier = rankPayoutMap[rank];
             const won = rank === gameRank;
             const winAmount = won && multiplier !== null ? bet * (1 + multiplier) : 0;
             playerBet += bet;
             playerWin += winAmount;
             rankResults.push({ rank, amount: bet, winAmount, won });
           }
           bets.ranks = rankResults;
         }

        // ── COLOR BOARD BETS: player covers N color options ──
         const COLOR_KEYS_ALL = Object.keys(rbPayoutMap);
         const numColors = Math.min(player.colorCount(), COLOR_KEYS_ALL.length);
         if (numColors > 0) {
           // Smart hedgers prioritize 3R+3B (highest probability), then 4R+4B, then 5R+5B
           const colorPool = ['3R', '3B', '4R', '4B', '5R', '5B'];
           const chosenColors = colorPool.slice(0, numColors);
           const colorResults = [];
           for (const colorKey of chosenColors) {
             const won = winningColors.includes(colorKey);
             const mult = rbPayoutMap[colorKey];
             const winAmount = won ? bet * (1 + mult) : 0;
             playerBet += bet;
             playerWin += winAmount;
             colorResults.push({ colorKey, amount: bet, winAmount, won });
           }
           bets.colors = colorResults;
         }

        // ── LOW/HIGH BET: strategy-driven probability ──
        if (Math.random() < player.lhProb) {
          // Smart players (hedgers/spread bettors) may bet BOTH Low and High to guarantee a hit
          const betBoth = (player.name === 'SpreadBettor' || player.name === 'Hedger') && Math.random() < 0.3;
          if (betBoth) {
            // Bet both LOW and HIGH — one always wins (0.83:1), net is guaranteed small loss but covers risk
            const lowWon = gameLH === 'LOW';
            const highWon = gameLH === 'HIGH';
            playerBet += bet * 2;
            playerWin += (lowWon ? bet * 1.88 : 0) + (highWon ? bet * 1.88 : 0);
            bets.lowHigh = { type: 'LOW+HIGH', amount: bet * 2, winAmount: bet * 1.88, won: true };
          } else {
            const type = Math.random() < 0.5 ? 'LOW' : 'HIGH';
            const won = type === gameLH;
            const winAmount = won ? bet * 1.88 : 0;
            playerBet += bet;
            playerWin += winAmount;
            bets.lowHigh = { type, amount: bet, winAmount, won };
          }
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