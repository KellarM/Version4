import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { handsToSimulate = 100000 } = await req.json();

    // FIXED HANDS with payouts
    const FIXED_HANDS = [
      { id: 1,  payout: 2.4 }, { id: 2,  payout: 1.2 }, { id: 3,  payout: 2.4 },
      { id: 4,  payout: 1.9 }, { id: 5,  payout: 1.6 }, { id: 6,  payout: 1.2 },
      { id: 7,  payout: 1.6 }, { id: 8,  payout: 1.9 }, { id: 9,  payout: 1.9 },
      { id: 10, payout: 2.4 },
    ];

    // RANK PAYOUTS (excluding progressive)
    const rankPayoutMap = {
      'Royal Flush': 100,     // Placeholder (progressive)
      'Four of a Kind': 5.8,
      'Full House': 1.5,
      'Flush': 2.0,
      'Straight': 2.9,
      'Three of a Kind': 1.5,
      'Two Pair': 7.4,
    };

    // Approximate real hand frequencies in Texas Hold'em
    const rankFrequencies = {
      'Royal Flush': 0.000154,
      'Four of a Kind': 0.00168,
      'Full House': 0.00261,
      'Flush': 0.00327,
      'Straight': 0.00462,
      'Three of a Kind': 0.02113,
      'Two Pair': 0.04754,
    };

    // COLOR BOARD PAYOUTS
    const rbPayoutMap = { '3R': 0.19, '3B': 0.19, '4R': 0.74, '4B': 0.74, '5R': 2.9, '5B': 2.9 };

    // LOW/HIGH PAYOUT
    const lowHighPayout = 0.35;

    // Initialize tracking
    const stats = {
      totalRounds: handsToSimulate,
      totalBets: 0,
      totalPayouts: 0,
      categories: {
        handBets: { bets: 0, payouts: 0, wins: 0, losses: 0 },
        rankBets: { bets: 0, payouts: 0, wins: 0, losses: 0, byRank: {} },
        colorBets: { bets: 0, payouts: 0, wins: 0, losses: 0, byColor: {} },
        lowHighBets: { bets: 0, payouts: 0, wins: 0, losses: 0, breakdown: { low: { wins: 0, losses: 0 }, high: { wins: 0, losses: 0 } } },
      },
      roundDetails: [],
    };

    // Initialize rank tracking (6-rank model, Two Pair is minimum)
    Object.keys(rankPayoutMap).forEach(rank => {
      stats.categories.rankBets.byRank[rank] = { bets: 0, payouts: 0, wins: 0, losses: 0 };
    });

    // Initialize color tracking
    ['3R', '3B', '4R', '4B', '5R', '5B'].forEach(key => {
      stats.categories.colorBets.byColor[key] = { bets: 0, payouts: 0, wins: 0, losses: 0 };
    });

    // Simulate rounds
    for (let round = 0; round < handsToSimulate; round++) {
      let roundBets = 0;
      let roundPayouts = 0;
      const roundDetail = {};

      // === HAND BETS ===
      const handBetAmount = 10;
      stats.categories.handBets.bets += handBetAmount;
      roundBets += handBetAmount;

      const winningHandId = Math.floor(Math.random() * 10);
      const hand = FIXED_HANDS[winningHandId];
      const handPayout = handBetAmount * (1 + hand.payout);
      stats.categories.handBets.payouts += handPayout;
      stats.categories.handBets.wins += 1;
      roundPayouts += handPayout;
      roundDetail.hand = { bet: handBetAmount, payout: handPayout, profit: handPayout - handBetAmount };

      // === RANK BETS ===
      const rankBetAmount = 10;
      stats.categories.rankBets.bets += rankBetAmount;
      roundBets += rankBetAmount;

      const rankKeys = Object.keys(rankPayoutMap);
      const winningRank = rankKeys[Math.floor(Math.random() * rankKeys.length)];
      const roll = Math.random();
      const frequency = rankFrequencies[winningRank];
      let rankPayouts = 0;

      if (roll < frequency) {
        const mult = rankPayoutMap[winningRank];
        rankPayouts = rankBetAmount * (1 + mult);
        stats.categories.rankBets.wins += 1;
        stats.categories.rankBets.byRank[winningRank].wins += 1;
      } else {
        stats.categories.rankBets.losses += 1;
      }

      stats.categories.rankBets.payouts += rankPayouts;
      stats.categories.rankBets.byRank[winningRank].bets += rankBetAmount;
      stats.categories.rankBets.byRank[winningRank].payouts += rankPayouts;
      roundPayouts += rankPayouts;
      roundDetail.rank = { bet: rankBetAmount, payout: rankPayouts, profit: rankPayouts - rankBetAmount, winningRank };

      // === COLOR BOARD BETS ===
      const colorBetAmount = 10;
      stats.categories.colorBets.bets += colorBetAmount;
      roundBets += colorBetAmount;

      const reds = Math.floor(Math.random() * 6);
      const blacks = 5 - reds;
      let colorPayouts = 0;

      if (reds >= 3) {
        for (let i = 3; i <= reds; i++) {
          const key = `${i}R`;
          const mult = rbPayoutMap[key] || 1;
          colorPayouts += colorBetAmount * (1 + mult);
          stats.categories.colorBets.byColor[key].wins += 1;
          stats.categories.colorBets.byColor[key].payouts += colorBetAmount * (1 + mult);
        }
      }

      if (blacks >= 3) {
        for (let i = 3; i <= blacks; i++) {
          const key = `${i}B`;
          const mult = rbPayoutMap[key] || 1;
          colorPayouts += colorBetAmount * (1 + mult);
          stats.categories.colorBets.byColor[key].wins += 1;
          stats.categories.colorBets.byColor[key].payouts += colorBetAmount * (1 + mult);
        }
      }

      if (colorPayouts > 0) {
        stats.categories.colorBets.wins += 1;
      } else {
        stats.categories.colorBets.losses += 1;
      }

      // Track all color bets placed
      if (reds >= 3) {
        for (let i = 3; i <= reds; i++) stats.categories.colorBets.byColor[`${i}R`].bets += colorBetAmount;
      }
      if (blacks >= 3) {
        for (let i = 3; i <= blacks; i++) stats.categories.colorBets.byColor[`${i}B`].bets += colorBetAmount;
      }

      stats.categories.colorBets.payouts += colorPayouts;
      roundPayouts += colorPayouts;
      roundDetail.color = { bet: colorBetAmount, payout: colorPayouts, profit: colorPayouts - colorBetAmount, result: `${reds}R/${blacks}B` };

      // === LOW/HIGH BETS ===
      const lowHighAmount = 10;
      stats.categories.lowHighBets.bets += lowHighAmount;
      roundBets += lowHighAmount;

      const isLow = Math.random() < 0.5;
      const lowHighPayouts = isLow ? lowHighAmount * (1 + lowHighPayout) : lowHighAmount * (1 + lowHighPayout);

      if (isLow) {
        stats.categories.lowHighBets.breakdown.low.wins += 1;
      } else {
        stats.categories.lowHighBets.breakdown.high.wins += 1;
      }

      stats.categories.lowHighBets.wins += 1;
      stats.categories.lowHighBets.payouts += lowHighPayouts;
      roundPayouts += lowHighPayouts;
      roundDetail.lowHigh = { bet: lowHighAmount, payout: lowHighPayouts, profit: lowHighPayouts - lowHighAmount, type: isLow ? 'LOW' : 'HIGH' };

      stats.totalBets += roundBets;
      stats.totalPayouts += roundPayouts;

      if (round < 10) {
        stats.roundDetails.push(roundDetail);
      }
    }

    // Calculate RTPs
    const overallRTP = ((stats.totalPayouts / stats.totalBets) * 100).toFixed(2);
    const handRTP = ((stats.categories.handBets.payouts / stats.categories.handBets.bets) * 100).toFixed(2);
    const rankRTP = ((stats.categories.rankBets.payouts / stats.categories.rankBets.bets) * 100).toFixed(2);
    const colorRTP = ((stats.categories.colorBets.payouts / stats.categories.colorBets.bets) * 100).toFixed(2);
    const lowHighRTP = ((stats.categories.lowHighBets.payouts / stats.categories.lowHighBets.bets) * 100).toFixed(2);

    // RTP contribution percentages
    const handContrib = ((stats.categories.handBets.payouts / stats.totalPayouts) * 100).toFixed(1);
    const rankContrib = ((stats.categories.rankBets.payouts / stats.totalPayouts) * 100).toFixed(1);
    const colorContrib = ((stats.categories.colorBets.payouts / stats.totalPayouts) * 100).toFixed(1);
    const lowHighContrib = ((stats.categories.lowHighBets.payouts / stats.totalPayouts) * 100).toFixed(1);

    return Response.json({
      success: true,
      summary: {
        totalRounds: handsToSimulate,
        totalBets: stats.totalBets,
        totalPayouts: stats.totalPayouts,
        casinoProfit: (stats.totalBets - stats.totalPayouts).toFixed(2),
        overallRTP: overallRTP + '%',
        isCompliant: parseFloat(overallRTP) >= 90 && parseFloat(overallRTP) <= 95,
      },
      categoryBreakdown: {
        hand: {
          rtp: handRTP + '%',
          contribution: handContrib + '%',
          bets: stats.categories.handBets.bets,
          payouts: stats.categories.handBets.payouts.toFixed(2),
          winRate: ((stats.categories.handBets.wins / handsToSimulate) * 100).toFixed(1) + '%',
        },
        rank: {
          rtp: rankRTP + '%',
          contribution: rankContrib + '%',
          bets: stats.categories.rankBets.bets,
          payouts: stats.categories.rankBets.payouts.toFixed(2),
          winRate: ((stats.categories.rankBets.wins / handsToSimulate) * 100).toFixed(1) + '%',
          byRank: Object.entries(stats.categories.rankBets.byRank).map(([rank, data]) => ({
            rank,
            rtp: ((data.payouts / (data.bets || 1)) * 100).toFixed(1) + '%',
            bets: data.bets,
            payouts: data.payouts.toFixed(2),
            wins: data.wins,
          })),
        },
        color: {
          rtp: colorRTP + '%',
          contribution: colorContrib + '%',
          bets: stats.categories.colorBets.bets,
          payouts: stats.categories.colorBets.payouts.toFixed(2),
          winRate: ((stats.categories.colorBets.wins / handsToSimulate) * 100).toFixed(1) + '%',
          byColor: Object.entries(stats.categories.colorBets.byColor).map(([color, data]) => ({
            color,
            rtp: ((data.payouts / (data.bets || 1)) * 100).toFixed(1) + '%',
            bets: data.bets,
            payouts: data.payouts.toFixed(2),
            wins: data.wins,
          })),
        },
        lowHigh: {
          rtp: lowHighRTP + '%',
          contribution: lowHighContrib + '%',
          bets: stats.categories.lowHighBets.bets,
          payouts: stats.categories.lowHighBets.payouts.toFixed(2),
          winRate: ((stats.categories.lowHighBets.wins / handsToSimulate) * 100).toFixed(1) + '%',
          breakdown: {
            low: { wins: stats.categories.lowHighBets.breakdown.low.wins },
            high: { wins: stats.categories.lowHighBets.breakdown.high.wins },
          },
        },
      },
      sampleRounds: stats.roundDetails,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});