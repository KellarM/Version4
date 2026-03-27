import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { handsToSimulate = 2000000 } = await req.json();

    // Game logic (inlined from gameEngine)
    const FIXED_HANDS = [
      { id: 1,  payout: 18 }, { id: 2,  payout: 4  }, { id: 3,  payout: 15 },
      { id: 4,  payout: 8  }, { id: 5,  payout: 6  }, { id: 6,  payout: 5  },
      { id: 7,  payout: 6  }, { id: 8,  payout: 7  }, { id: 9,  payout: 8  },
      { id: 10, payout: 15 },
    ];

    // Statistics tracking
    const stats = {
      totalHands: handsToSimulate,
      handWins: {},
      colorWins: { '3R': 0, '3B': 0, '4R': 0, '4B': 0, '5R': 0, '5B': 0 },
      rankWins: {},
      lowHighWins: { LOW: 0, HIGH: 0 },
      totalBetByType: { hand: 0, color: 0, rank: 0, lowHigh: 0 },
      totalPayoutByType: { hand: 0, color: 0, rank: 0, lowHigh: 0 },
      payoutPercentages: {},
    };

    // Initialize hand tracking
    for (let i = 1; i <= 10; i++) {
      stats.handWins[i] = 0;
    }

    const rankPayoutMap = {
      'Royal Flush': 100,
      'Straight Flush': 50,
      'Four of a Kind': 10,
      'Full House': 2,
      'Flush': 3,
      'Straight': 5,
      'Three of a Kind': 3,
      'Two Pair': 12,
      'One Pair': 15,
    };

    const rbPayoutMap = { '3R': 1, '3B': 1, '4R': 4, '4B': 4, '5R': 40, '5B': 40 };

    // Initialize rank tracking
    Object.keys(rankPayoutMap).forEach(rank => {
      stats.rankWins[rank] = 0;
    });

    // Simple random simulation (each hand has equal winning probability)
    for (let hand = 0; hand < handsToSimulate; hand++) {
      // Randomly pick a winning hand (1-10)
      const winningHandId = Math.floor(Math.random() * 10) + 1;
      stats.handWins[winningHandId]++;

      const winningHand = FIXED_HANDS.find(h => h.id === winningHandId);
      if (winningHand) {
        stats.totalBetByType.hand += 1;
        stats.totalPayoutByType.hand += 1 + winningHand.payout;
      }

      // Rank wins (random distribution based on payout weights)
      const rankKeys = Object.keys(rankPayoutMap);
      const randomRank = rankKeys[Math.floor(Math.random() * rankKeys.length)];
      stats.rankWins[randomRank]++;
      stats.totalBetByType.rank += 1;
      const mult = rankPayoutMap[randomRank];
      stats.totalPayoutByType.rank += 1 + mult;

      // Color board (roughly 50/50 red/black, with distribution)
      const reds = Math.floor(Math.random() * 6); // 0-5 reds
      const blacks = 5 - reds;
      if (reds >= 3) for (let i = 3; i <= reds; i++) {
        stats.colorWins[`${i}R`]++;
        stats.totalBetByType.color += 1;
        stats.totalPayoutByType.color += 1 + (rbPayoutMap[`${i}R`] || 1);
      }
      if (blacks >= 3) for (let i = 3; i <= blacks; i++) {
        stats.colorWins[`${i}B`]++;
        stats.totalBetByType.color += 1;
        stats.totalPayoutByType.color += 1 + (rbPayoutMap[`${i}B`] || 1);
      }

      // Low/High (roughly 50/50)
      const isLow = Math.random() > 0.5;
      const winLH = isLow ? 'LOW' : 'HIGH';
      stats.lowHighWins[winLH]++;
      stats.totalBetByType.lowHigh += 1;
      stats.totalPayoutByType.lowHigh += 2; // 1:1 payout
    }

    // Calculate payout percentages
    stats.payoutPercentages = {
      hand: stats.totalBetByType.hand > 0 ? (stats.totalPayoutByType.hand / stats.totalBetByType.hand * 100).toFixed(2) : 0,
      color: stats.totalBetByType.color > 0 ? (stats.totalPayoutByType.color / stats.totalBetByType.color * 100).toFixed(2) : 0,
      rank: stats.totalBetByType.rank > 0 ? (stats.totalPayoutByType.rank / stats.totalBetByType.rank * 100).toFixed(2) : 0,
      lowHigh: stats.totalBetByType.lowHigh > 0 ? (stats.totalPayoutByType.lowHigh / stats.totalBetByType.lowHigh * 100).toFixed(2) : 0,
    };

    // Hand frequency analysis
    const handFrequency = {};
    for (let i = 1; i <= 10; i++) {
      handFrequency[i] = (stats.handWins[i] / handsToSimulate * 100).toFixed(3);
    }

    // Color frequency analysis
    const colorFrequency = {};
    Object.keys(stats.colorWins).forEach(key => {
      colorFrequency[key] = (stats.colorWins[key] / handsToSimulate * 100).toFixed(3);
    });

    // Calculate compliance
    const h = parseFloat(stats.payoutPercentages.hand);
    const c = parseFloat(stats.payoutPercentages.color);
    const r = parseFloat(stats.payoutPercentages.rank);
    const l = parseFloat(stats.payoutPercentages.lowHigh);
    const avg = (h + c + r + l) / 4;

    return Response.json({
      success: true,
      stats,
      analysis: {
        handFrequency,
        colorFrequency,
        conclusion: {
          averagePayout: avg.toFixed(2),
          isCompliant: avg >= 85 && avg <= 98,
          recommendation: avg >= 85 && avg <= 98
            ? 'Game meets typical casino RTP standards (85-98%)'
            : avg < 85
              ? 'WARNING: Game heavily favors casino (below 85% RTP)'
              : 'WARNING: Game heavily favors players (above 98% RTP)',
        },
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});