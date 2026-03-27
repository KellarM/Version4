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
        name: 'Config A: Rank -25%, Color -30%',
        rankPayouts: { 'Four of a Kind': 4.35, 'Full House': 1.125, 'Flush': 1.5, 'Straight': 2.175, 'Three of a Kind': 1.125, 'Two Pair': 5.55, 'One Pair': 6.75 },
        colorPayouts: { '3R': 0.133, '3B': 0.133, '4R': 0.518, '4B': 0.518, '5R': 2.03, '5B': 2.03 },
        lowHighPayout: 0.35,
      },
      {
        name: 'Config B: Rank -30%, Color -35%, LowHigh -20%',
        rankPayouts: { 'Four of a Kind': 4.06, 'Full House': 1.05, 'Flush': 1.4, 'Straight': 2.03, 'Three of a Kind': 1.05, 'Two Pair': 5.18, 'One Pair': 6.3 },
        colorPayouts: { '3R': 0.1235, '3B': 0.1235, '4R': 0.481, '4B': 0.481, '5R': 1.885, '5B': 1.885 },
        lowHighPayout: 0.28,
      },
      {
        name: 'Config C: Rank -35%, Color -40%, LowHigh -30%',
        rankPayouts: { 'Four of a Kind': 3.77, 'Full House': 0.975, 'Flush': 1.3, 'Straight': 1.885, 'Three of a Kind': 0.975, 'Two Pair': 4.81, 'One Pair': 5.85 },
        colorPayouts: { '3R': 0.114, '3B': 0.114, '4R': 0.444, '4B': 0.444, '5R': 1.74, '5B': 1.74 },
        lowHighPayout: 0.245,
      },
      {
        name: 'Config D: Rank -40%, Color -45%, LowHigh -35%',
        rankPayouts: { 'Four of a Kind': 3.48, 'Full House': 0.9, 'Flush': 1.2, 'Straight': 1.74, 'Three of a Kind': 0.9, 'Two Pair': 4.44, 'One Pair': 5.4 },
        colorPayouts: { '3R': 0.1045, '3B': 0.1045, '4R': 0.407, '4B': 0.407, '5R': 1.595, '5B': 1.595 },
        lowHighPayout: 0.2275,
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

  const rankFrequencies = {
    'Four of a Kind': 0.00168, 'Full House': 0.00261, 'Flush': 0.00327, 'Straight': 0.00462,
    'Three of a Kind': 0.02113, 'Two Pair': 0.04754, 'One Pair': 0.42256,
  };

  let naiveTotalBets = 0, naiveTotalPayouts = 0;
  let hedgeTotalBets = 0, hedgeTotalPayouts = 0;
  let strongTotalBets = 0, strongTotalPayouts = 0;

  for (let round = 0; round < handsToSimulate; round++) {
    const winningHand = Math.floor(Math.random() * 10);
    const hand = FIXED_HANDS[winningHand];
    const reds = Math.floor(Math.random() * 6);
    const blacks = 5 - reds;

    // NAIVE: Bet everything
    let naiveBets = 0, naivePayouts = 0;
    naiveBets += 10; // Hand
    naivePayouts += 10 * (1 + hand.payout);
    
    ['Four of a Kind', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'One Pair'].forEach(rank => {
      naiveBets += 10;
      if (Math.random() < rankFrequencies[rank]) {
        naivePayouts += 10 * (1 + config.rankPayouts[rank]);
      }
    });
    
    naiveBets += 10; // Color
    if (reds >= 3) for (let i = 3; i <= reds; i++) naivePayouts += 10 * (1 + (config.colorPayouts[`${i}R`] || 0));
    if (blacks >= 3) for (let i = 3; i <= blacks; i++) naivePayouts += 10 * (1 + (config.colorPayouts[`${i}B`] || 0));
    
    naiveBets += 10; // LowHigh
    naivePayouts += 10 * (1 + config.lowHighPayout);

    naiveTotalBets += naiveBets;
    naiveTotalPayouts += naivePayouts;

    // HEDGE COLOR TREND: Only bet if red-heavy, pick HIGH
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

    // HEDGE STRONG: Only on pair hands
    if (hand.payout >= 1.6) {
      let strongBets = 0, strongPayouts = 0;
      strongBets += 10;
      strongPayouts += 10 * (1 + hand.payout);
      
      ['One Pair', 'Two Pair', 'Three of a Kind', 'Full House', 'Four of a Kind'].forEach(rank => {
        strongBets += 10;
        if (Math.random() < rankFrequencies[rank]) {
          strongPayouts += 10 * (1 + config.rankPayouts[rank]);
        }
      });
      
      strongBets += 10;
      if (reds >= 3) for (let i = 3; i <= reds; i++) strongPayouts += 10 * (1 + (config.colorPayouts[`${i}R`] || 0));
      if (blacks >= 3) for (let i = 3; i <= blacks; i++) strongPayouts += 10 * (1 + (config.colorPayouts[`${i}B`] || 0));
      
      strongBets += 10;
      strongPayouts += 10 * (1 + config.lowHighPayout);
      
      strongTotalBets += strongBets;
      strongTotalPayouts += strongPayouts;
    }
  }

  const naiveRTP = ((naiveTotalPayouts / naiveTotalBets) * 100).toFixed(2);
  const hedgeRTP = hedgeTotalBets > 0 ? ((hedgeTotalPayouts / hedgeTotalBets) * 100).toFixed(2) : '0.00';
  const strongRTP = strongTotalBets > 0 ? ((strongTotalPayouts / strongTotalBets) * 100).toFixed(2) : '0.00';
  const overallRTP = ((naiveTotalPayouts / naiveTotalBets) * 100).toFixed(2); // Use naive as baseline

  return {
    config: config.name,
    naiveRTP: naiveRTP + '%',
    hedgeColorTrendRTP: hedgeRTP + '%',
    hedgeStrongRTP: strongRTP + '%',
    overallRTP: overallRTP + '%',
    maxRiskRTP: Math.max(parseFloat(naiveRTP), parseFloat(hedgeRTP), parseFloat(strongRTP)).toFixed(2) + '%',
    isSafe: parseFloat(hedgeRTP) <= 100 && parseFloat(strongRTP) <= 100,
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