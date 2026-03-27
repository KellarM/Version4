import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { handsToSimulate = 50000 } = await req.json();

    // Current payouts (the problem configuration)
    const current = {
      name: 'Current (152.89% exploitable)',
      rankPayouts: { 'Four of a Kind': 5.8, 'Full House': 1.5, 'Flush': 2.0, 'Straight': 2.9, 'Three of a Kind': 1.5, 'Two Pair': 7.4, 'One Pair': 9.0 },
      colorPayouts: { '3R': 0.19, '3B': 0.19, '4R': 0.74, '4B': 0.74, '5R': 2.9, '5B': 2.9 },
      lowHighPayout: 0.35,
    };

    // Test configurations targeting 90-95% RTP
    const testConfigs = [
      {
        name: 'Config E: Reduce Hand Payouts 0.5-1.0x',
        rankPayouts: { 'Four of a Kind': 5.8, 'Full House': 1.5, 'Flush': 2.0, 'Straight': 2.9, 'Three of a Kind': 1.5, 'Two Pair': 7.4, 'One Pair': 9.0 },
        colorPayouts: { '3R': 0.19, '3B': 0.19, '4R': 0.74, '4B': 0.74, '5R': 2.9, '5B': 2.9 },
        lowHighPayout: 0.35,
        handPayouts: { 1: 0.8, 2: 0.5, 3: 0.8, 4: 0.65, 5: 0.6, 6: 0.5, 7: 0.6, 8: 0.65, 9: 0.65, 10: 0.8 }, // Reduced from 1.2-2.4
        strategy: 'reduce-hand',
      },
      {
        name: 'Config F: Cap Multi-Category (hand+rank=no color)',
        rankPayouts: { 'Four of a Kind': 5.8, 'Full House': 1.5, 'Flush': 2.0, 'Straight': 2.9, 'Three of a Kind': 1.5, 'Two Pair': 7.4, 'One Pair': 9.0 },
        colorPayouts: { '3R': 0.19, '3B': 0.19, '4R': 0.74, '4B': 0.74, '5R': 2.9, '5B': 2.9 },
        lowHighPayout: 0.35,
        strategy: 'multi-category-cap',
      },
    ];

    const results = [];

    for (const config of testConfigs) {
      const result = testConfigAgainstStrategies(handsToSimulate, config);
      results.push(result);
    }

    // Find best config (max RTP at or below 100% on Hedge Color Trend)
    const bestConfig = results.reduce((best, current) => {
      const currentExploit = parseFloat(current.hedgeColorTrendRTP);
      const bestExploit = parseFloat(best.hedgeColorTrendRTP);
      
      if (currentExploit <= 100 && bestExploit > 100) return current; // Prefer non-exploitable
      if (currentExploit <= 100 && bestExploit <= 100) {
        // Both safe, prefer higher overall RTP (better for casino)
        return parseFloat(current.overallRTP) > parseFloat(best.overallRTP) ? current : best;
      }
      return current;
    });

    return Response.json({
      success: true,
      currentStatus: {
        ...current,
        maxExploitableRTP: '152.89%',
        maxDangerousStrategy: 'Hedge Color Trend',
      },
      testResults: results,
      bestConfiguration: bestConfig,
      recommendation: generateRecommendation(bestConfig),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function testConfigAgainstStrategies(handsToSimulate, config) {
  const FIXED_HANDS = [
    { id: 1,  payout: 2.4 }, { id: 2,  payout: 1.2 }, { id: 3,  payout: 2.4 },
    { id: 4,  payout: 1.9 }, { id: 5,  payout: 1.6 }, { id: 6,  payout: 1.2 },
    { id: 7,  payout: 1.6 }, { id: 8,  payout: 1.9 }, { id: 9,  payout: 1.9 },
    { id: 10, payout: 2.4 },
  ];

  // Apply reduced hand payouts if strategy requires
  let handPayouts = FIXED_HANDS;
  if (config.strategy === 'reduce-hand' && config.handPayouts) {
    handPayouts = FIXED_HANDS.map((h, idx) => ({ ...h, payout: config.handPayouts[h.id] }));
  }

  const rankFrequencies = {
    'Four of a Kind': 0.00168, 'Full House': 0.00261, 'Flush': 0.00327, 'Straight': 0.00462,
    'Three of a Kind': 0.02113, 'Two Pair': 0.04754, 'One Pair': 0.42256,
  };

  let naiveTotalBets = 0, naiveTotalPayouts = 0;
  let hedgeTotalBets = 0, hedgeTotalPayouts = 0;

  for (let round = 0; round < handsToSimulate; round++) {
    const winningHand = Math.floor(Math.random() * 10);
    const hand = handPayouts.find(h => h.id === winningHand + 1) || handPayouts[winningHand];
    const reds = Math.floor(Math.random() * 6);
    const blacks = 5 - reds;

    // NAIVE: Bet everything
    let naiveBets = 0, naivePayouts = 0;
    naiveBets += 10;
    naivePayouts += 10 * (1 + hand.payout);
    
    ['Four of a Kind', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'One Pair'].forEach(rank => {
      naiveBets += 10;
      if (Math.random() < rankFrequencies[rank]) {
        naivePayouts += 10 * (1 + config.rankPayouts[rank]);
      }
    });
    
    naiveBets += 10;
    if (reds >= 3) for (let i = 3; i <= reds; i++) naivePayouts += 10 * (1 + (config.colorPayouts[`${i}R`] || 0));
    if (blacks >= 3) for (let i = 3; i <= blacks; i++) naivePayouts += 10 * (1 + (config.colorPayouts[`${i}B`] || 0));
    
    naiveBets += 10;
    naivePayouts += 10 * (1 + config.lowHighPayout);

    naiveTotalBets += naiveBets;
    naiveTotalPayouts += naivePayouts;

    // HEDGE COLOR TREND: Depends on strategy
    if (config.strategy === 'multi-category-cap') {
      // With multi-category cap: if betting hand+rank, NO color bets allowed
      // Hedge strategy would bet hand + rank, then low/high (no color)
      if (reds >= 2) {
        let hedgeBets = 0, hedgePayouts = 0;
        hedgeBets += 10;
        hedgePayouts += 10 * (1 + hand.payout);
        
        ['One Pair', 'Two Pair', 'Three of a Kind'].forEach(rank => {
          hedgeBets += 10;
          if (Math.random() < rankFrequencies[rank]) {
            hedgePayouts += 10 * (1 + config.rankPayouts[rank]);
          }
        });
        
        // NO color bets when hand+rank are bet (multi-category cap)
        
        hedgeBets += 10;
        hedgePayouts += 10 * (1 + config.lowHighPayout);
        
        hedgeTotalBets += hedgeBets;
        hedgeTotalPayouts += hedgePayouts;
      }
    } else {
      // Original hedge: hand + rank + color + low/high
      if (reds >= 2) {
        let hedgeBets = 0, hedgePayouts = 0;
        hedgeBets += 10;
        hedgePayouts += 10 * (1 + hand.payout);
        
        ['One Pair', 'Two Pair', 'Three of a Kind'].forEach(rank => {
          hedgeBets += 10;
          if (Math.random() < rankFrequencies[rank]) {
            hedgePayouts += 10 * (1 + config.rankPayouts[rank]);
          }
        });
        
        hedgeBets += 10;
        if (reds >= 3) for (let i = 3; i <= reds; i++) hedgePayouts += 10 * (1 + (config.colorPayouts[`${i}R`] || 0));
        
        hedgeBets += 10;
        hedgePayouts += 10 * (1 + config.lowHighPayout);
        
        hedgeTotalBets += hedgeBets;
        hedgeTotalPayouts += hedgePayouts;
      }
    }
  }

  const naiveRTP = ((naiveTotalPayouts / naiveTotalBets) * 100).toFixed(2);
  const hedgeRTP = hedgeTotalBets > 0 ? ((hedgeTotalPayouts / hedgeTotalBets) * 100).toFixed(2) : '0.00';
  const overallRTP = ((naiveTotalPayouts / naiveTotalBets) * 100).toFixed(2);

  return {
    config: config.name,
    naiveRTP: naiveRTP + '%',
    hedgeColorTrendRTP: hedgeRTP + '%',
    overallRTP: overallRTP + '%',
    maxRiskRTP: Math.max(parseFloat(naiveRTP), parseFloat(hedgeRTP)).toFixed(2) + '%',
    isSafe: parseFloat(hedgeRTP) <= 100,
    payoutConfig: config,
  };
}

function generateRecommendation(bestConfig) {
  const isSafe = bestConfig.isSafe;
  const maxRisk = parseFloat(bestConfig.maxRiskRTP);

  if (isSafe && maxRisk >= 90 && maxRisk <= 95) {
    return `✓ OPTIMAL: ${bestConfig.config} achieves ${bestConfig.overallRTP}% RTP with NO exploitable strategies. All strategies cap at ${bestConfig.maxRiskRTP}—compliant and fair.`;
  } else if (isSafe && maxRisk > 95) {
    return `⚠️ SAFE BUT HIGH: ${bestConfig.config} prevents exploitation but RTP is high. Consider tightening further to get to 90-95% range.`;
  } else if (isSafe && maxRisk < 90) {
    return `⚠️ SAFE BUT LOW: ${bestConfig.config} prevents exploitation but RTP is below 90%. Consider loosening payouts slightly.`;
  } else {
    return `❌ STILL EXPLOITABLE: ${bestConfig.config} still allows ${bestConfig.maxRiskRTP}% RTP. Need more aggressive cuts.`;
  }
}