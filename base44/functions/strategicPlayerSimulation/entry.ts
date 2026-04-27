import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { handsToSimulate = 100000, strategy = 'optimal' } = await req.json();

    const FIXED_HANDS = [
      { id: 1,  payout: 2.4, pairCards: ['A♦', '10♥'], rank: 'high' },
      { id: 2,  payout: 1.2, pairCards: ['K♣', 'K♠'], rank: 'pair' },
      { id: 3,  payout: 2.4, pairCards: ['Q♣', 'J♠'], rank: 'high' },
      { id: 4,  payout: 1.9, pairCards: ['Q♠', '10♠'], rank: 'straight-potential' },
      { id: 5,  payout: 1.6, pairCards: ['J♣', '9♣'], rank: 'straight-potential' },
      { id: 6,  payout: 1.2, pairCards: ['8♦', '6♦'], rank: 'mid' },
      { id: 7,  payout: 1.6, pairCards: ['7♦', '7♠'], rank: 'pair' },
      { id: 8,  payout: 1.9, pairCards: ['4♥', '2♥'], rank: 'low' },
      { id: 9,  payout: 1.9, pairCards: ['3♣', '3♥'], rank: 'pair' },
      { id: 10, payout: 2.4, pairCards: ['A♥', '5♦'], rank: 'ace-low' },
    ];

    const rankPayoutMap = {
      'Royal Flush': 100,
      'Four of a Kind': 5.8,
      'Full House': 1.5,
      'Flush': 2.0,
      'Straight': 2.9,
      'Three of a Kind': 1.5,
      'Two Pair': 7.4,
    };

    const rankFrequencies = {
      'Royal Flush': 0.000154,
      'Four of a Kind': 0.00168,
      'Full House': 0.00261,
      'Flush': 0.00327,
      'Straight': 0.00462,
      'Three of a Kind': 0.02113,
      'Two Pair': 0.04754,
    };

    const rbPayoutMap = { '3R': 0.19, '3B': 0.19, '4R': 0.74, '4B': 0.74, '5R': 2.9, '5B': 2.9 };
    const lowHighPayout = 0.35;

    let stats = {
      totalRounds: handsToSimulate,
      totalBets: 0,
      totalPayouts: 0,
      strategies: {},
    };

    // STRATEGY 1: Bet everything (baseline - no strategy)
    if (strategy === 'all' || strategy === 'optimal') {
      const betEverything = runStrategy(handsToSimulate, FIXED_HANDS, rankPayoutMap, rankFrequencies, rbPayoutMap, lowHighPayout, (flop, winningHand) => {
        return {
          handBet: true,
          rankBets: Object.keys(rankPayoutMap),
          colorBets: true,
          lowHighBet: true,
        };
      });
      stats.strategies['Bet Everything'] = betEverything;
    }

    // STRATEGY 2: Hedge on strong hands (pair/high cards)
    if (strategy === 'all' || strategy === 'optimal') {
      const hedgeStrong = runStrategy(handsToSimulate, FIXED_HANDS, rankPayoutMap, rankFrequencies, rbPayoutMap, lowHighPayout, (flop, winningHand) => {
        const hand = FIXED_HANDS[winningHand];
        const isStrong = hand.rank === 'pair' || hand.rank === 'high' || hand.rank === 'straight-potential';
        
        if (isStrong) {
          return {
            handBet: true,
            rankBets: ['Two Pair', 'Three of a Kind', 'Full House', 'Four of a Kind'],
            colorBets: true,
            lowHighBet: true,
          };
        }
        return { handBet: false, rankBets: [], colorBets: false, lowHighBet: false };
      });
      stats.strategies['Hedge Strong Hands'] = hedgeStrong;
    }

    // STRATEGY 3: Bet correlated with flop color (red heavy → bet 5R, etc)
    if (strategy === 'all' || strategy === 'optimal') {
      const hedgeColor = runStrategy(handsToSimulate, FIXED_HANDS, rankPayoutMap, rankFrequencies, rbPayoutMap, lowHighPayout, (flop, winningHand) => {
        const reds = flop.filter(c => c.color === 'red').length;
        const isRedHeavy = reds >= 2;

        return {
          handBet: true,
          rankBets: ['Two Pair', 'Three of a Kind'],
          colorBets: true,
          lowHighBet: isRedHeavy ? 'HIGH' : 'LOW',
        };
      });
      stats.strategies['Hedge Color Trend'] = hedgeColor;
    }

    // STRATEGY 4: Only bet on high-EV rank hands
    if (strategy === 'all' || strategy === 'optimal') {
      const highEV = runStrategy(handsToSimulate, FIXED_HANDS, rankPayoutMap, rankFrequencies, rbPayoutMap, lowHighPayout, (flop, winningHand) => {
        return {
          handBet: true,
          rankBets: ['Two Pair', 'Three of a Kind', 'Four of a Kind'],
          colorBets: false,
          lowHighBet: false,
        };
      });
      stats.strategies['High-EV Ranks Only'] = highEV;
    }

    // STRATEGY 5: Full exploitation (bet everything + all hedges)
    if (strategy === 'all' || strategy === 'optimal') {
      const maxExploit = runStrategy(handsToSimulate, FIXED_HANDS, rankPayoutMap, rankFrequencies, rbPayoutMap, lowHighPayout, (flop, winningHand) => {
        const hand = FIXED_HANDS[winningHand];
        const reds = flop.filter(c => c.color === 'red').length;

        return {
          handBet: true,
          rankBets: Object.keys(rankPayoutMap),
          colorBets: true,
          lowHighBet: reds > 2 ? 'HIGH' : 'LOW',
          doubleDownOnMult: true, // Bet extra on multi-hand correlations
        };
      });
      stats.strategies['Maximum Exploitation'] = maxExploit;
    }

    return Response.json({
      success: true,
      summary: {
        totalRounds: handsToSimulate,
        simulationStrategy: strategy,
      },
      strategies: stats.strategies,
      recommendation: calculateRecommendation(stats.strategies),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function runStrategy(handsToSimulate, FIXED_HANDS, rankPayoutMap, rankFrequencies, rbPayoutMap, lowHighPayout, strategyFn) {
  let totalBets = 0;
  let totalPayouts = 0;
  let roundDetails = [];

  for (let round = 0; round < handsToSimulate; round++) {
    // Simulate flop (3 cards)
    const flop = generateFlop();
    const winningHand = Math.floor(Math.random() * 10);

    // Get strategy decision for this round
    const strategyBets = strategyFn(flop, winningHand);
    if (!strategyBets || (!strategyBets.handBet && !strategyBets.colorBets && strategyBets.rankBets.length === 0)) {
      continue; // Player doesn't bet this round
    }

    let roundBets = 0;
    let roundPayouts = 0;

    // HAND BETS
    if (strategyBets.handBet) {
      const handBetAmount = 10;
      roundBets += handBetAmount;
      const hand = FIXED_HANDS[winningHand];
      const handPayout = handBetAmount * (1 + hand.payout);
      roundPayouts += handPayout;
    }

    // RANK BETS (only bet on selected ranks)
    strategyBets.rankBets.forEach(rank => {
      const rankBetAmount = 10;
      roundBets += rankBetAmount;
      const roll = Math.random();
      const frequency = rankFrequencies[rank] || 0;
      if (roll < frequency) {
        const mult = rankPayoutMap[rank];
        roundPayouts += rankBetAmount * (1 + mult);
      }
    });

    // COLOR BETS
    if (strategyBets.colorBets) {
      const colorBetAmount = 10;
      roundBets += colorBetAmount;
      const reds = flop.filter(c => c.color === 'red').length;
      const blacks = 3 - reds;
      let colorPayouts = 0;
      if (reds >= 3) {
        for (let i = 3; i <= reds; i++) {
          const mult = rbPayoutMap[`${i}R`] || 1;
          colorPayouts += colorBetAmount * (1 + mult);
        }
      }
      if (blacks >= 3) {
        for (let i = 3; i <= blacks; i++) {
          const mult = rbPayoutMap[`${i}B`] || 1;
          colorPayouts += colorBetAmount * (1 + mult);
        }
      }
      roundPayouts += colorPayouts;
    }

    // LOW/HIGH BETS
    if (strategyBets.lowHighBet) {
      const lowHighAmount = 10;
      roundBets += lowHighAmount;
      roundPayouts += lowHighAmount * (1 + lowHighPayout);
    }

    totalBets += roundBets;
    totalPayouts += roundPayouts;

    if (round < 5) {
      roundDetails.push({ roundBets, roundPayouts, profit: roundPayouts - roundBets });
    }
  }

  const rtp = ((totalPayouts / (totalBets || 1)) * 100).toFixed(2);
  return {
    totalBets,
    totalPayouts,
    casinoProfit: (totalBets - totalPayouts).toFixed(2),
    rtp: rtp + '%',
    avgBetPerRound: (totalBets / handsToSimulate).toFixed(2),
    avgPayoutPerRound: (totalPayouts / handsToSimulate).toFixed(2),
    profitMargin: (((totalBets - totalPayouts) / totalBets) * 100).toFixed(2) + '%',
    sampleRounds: roundDetails,
  };
}

function generateFlop() {
  const suits = ['red', 'red', 'black', 'black'];
  const flop = [];
  for (let i = 0; i < 3; i++) {
    flop.push({ color: suits[Math.floor(Math.random() * 4)] });
  }
  return flop;
}

function calculateRecommendation(strategies) {
  let maxRTP = 0;
  let maxStrategy = '';

  Object.entries(strategies).forEach(([name, data]) => {
    const rtp = parseFloat(data.rtp);
    if (rtp > maxRTP) {
      maxRTP = rtp;
      maxStrategy = name;
    }
  });

  if (maxRTP > 120) {
    return `⚠️ EXPLOITABLE: "${maxStrategy}" achieves ${maxRTP}% RTP. Payouts need significant reduction. Focus on: rank bets, color board, and hand correlations.`;
  } else if (maxRTP > 100) {
    return `⚠️ SLIGHTLY FAVORABLE: "${maxStrategy}" at ${maxRTP}% RTP. Reduce rank payouts and color board multipliers by 15-20%.`;
  } else {
    return `✓ BALANCED: Game is fair across all strategies (best case: ${maxRTP}% RTP).`;
  }
}