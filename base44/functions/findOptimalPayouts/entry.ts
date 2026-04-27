import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test configurations to find optimal balance (targeting 90-95% RTP)
    const configurations = [
      // Config 1: Fine-tuned for 92-93%
      {
        name: 'Final Target 92%',
        cardedPayouts: [4.2, 2.1, 4.2, 3.3, 2.8, 2.1, 2.8, 3.3, 3.3, 4.2],
        rankPayouts: { 'Four of a Kind': 10.2, 'Full House': 2.6, 'Flush': 3.5, 'Straight': 5.1, 'Three of a Kind': 2.6, 'Two Pair': 13, },
        colorPayouts: { '5R': 5.1, '5B': 5.1, '4R': 1.3, '4B': 1.3, '3R': 0.33, '3B': 0.33 },
        lowHighPayout: 0.88
      },
      // Config 2: Conservative calibration
      {
        name: 'Conservative 91%',
        cardedPayouts: [3.8, 1.9, 3.8, 3, 2.5, 1.9, 2.5, 3, 3, 3.8],
        rankPayouts: { 'Four of a Kind': 9.5, 'Full House': 2.4, 'Flush': 3.2, 'Straight': 4.7, 'Three of a Kind': 2.4, 'Two Pair': 12, },
        colorPayouts: { '5R': 4.7, '5B': 4.7, '4R': 1.2, '4B': 1.2, '3R': 0.3, '3B': 0.3 },
        lowHighPayout: 0.85
      },
      // Config 3: Premium carded (close to 101%)
      {
        name: 'Premium 100%',
        cardedPayouts: [4.3, 2.2, 4.3, 3.4, 2.9, 2.2, 2.9, 3.4, 3.4, 4.3],
        rankPayouts: { 'Four of a Kind': 10.5, 'Full House': 2.7, 'Flush': 3.6, 'Straight': 5.3, 'Three of a Kind': 2.7, 'Two Pair': 13.3, },
        colorPayouts: { '5R': 5.3, '5B': 5.3, '4R': 1.35, '4B': 1.35, '3R': 0.34, '3B': 0.34 },
        lowHighPayout: 0.92
      },
      // Config 4: Balanced high-end
      {
        name: 'Balanced 93%',
        cardedPayouts: [4.1, 2, 4.1, 3.2, 2.7, 2, 2.7, 3.2, 3.2, 4.1],
        rankPayouts: { 'Four of a Kind': 9.8, 'Full House': 2.5, 'Flush': 3.3, 'Straight': 4.9, 'Three of a Kind': 2.5, 'Two Pair': 12.5, },
        colorPayouts: { '5R': 4.9, '5B': 4.9, '4R': 1.25, '4B': 1.25, '3R': 0.32, '3B': 0.32 },
        lowHighPayout: 0.87
      },
    ];

    const results = [];

    for (const config of configurations) {
      // Simulate 500k hands per configuration for speed
      const stats = runSimulation(500000, config);
      results.push({
        configuration: config.name,
        totalBets: stats.totalBets,
        totalPayouts: stats.totalPayouts,
        casinoProfit: stats.totalBets - stats.totalPayouts,
        rtp: ((stats.totalPayouts / stats.totalBets) * 100).toFixed(2),
        isCompliant: parseFloat(((stats.totalPayouts / stats.totalBets) * 100).toFixed(2)) >= 90 && 
                     parseFloat(((stats.totalPayouts / stats.totalBets) * 100).toFixed(2)) <= 95,
        payouts: config
      });
    }

    // Find best match for 90-95% RTP
    const compliant = results.filter(r => r.isCompliant);
    const best = compliant.length > 0 
      ? compliant.reduce((a, b) => {
          const aDiff = Math.abs(parseFloat(a.rtp) - 92.5);
          const bDiff = Math.abs(parseFloat(b.rtp) - 92.5);
          return aDiff < bDiff ? a : b;
        })
      : results.reduce((a, b) => {
          const aDiff = Math.abs(parseFloat(a.rtp) - 92.5);
          const bDiff = Math.abs(parseFloat(b.rtp) - 92.5);
          return aDiff < bDiff ? a : b;
        });

    return Response.json({
      success: true,
      allResults: results,
      bestConfiguration: best,
      recommendation: best.isCompliant 
        ? `✓ OPTIMAL FOUND: ${best.configuration} achieves ${best.rtp}% RTP (compliant 90-95%)`
        : `⚠️ CLOSEST MATCH: ${best.configuration} achieves ${best.rtp}% RTP (target 90-95%)`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function runSimulation(handsToSimulate, config) {
  const stats = {
    totalBets: 0,
    totalPayouts: 0,
  };

  const FIXED_HANDS = [
    { id: 1,  payout: config.cardedPayouts[0] },
    { id: 2,  payout: config.cardedPayouts[1] },
    { id: 3,  payout: config.cardedPayouts[2] },
    { id: 4,  payout: config.cardedPayouts[3] },
    { id: 5,  payout: config.cardedPayouts[4] },
    { id: 6,  payout: config.cardedPayouts[5] },
    { id: 7,  payout: config.cardedPayouts[6] },
    { id: 8,  payout: config.cardedPayouts[7] },
    { id: 9,  payout: config.cardedPayouts[8] },
    { id: 10, payout: config.cardedPayouts[9] },
  ];

  const rankPayoutMap = config.rankPayouts;
  const rbPayoutMap = config.colorPayouts;
  const lowHighPayout = config.lowHighPayout;

  for (let round = 0; round < handsToSimulate; round++) {
    const betPerCategory = 10;
    let roundBets = betPerCategory * 4; // Hand + Rank + Color + LowHigh
    let roundPayouts = 0;

    // 1. Carded Hand win (50% chance to hit a hand)
    if (Math.random() < 0.1) { // Approximate 1 in 10 chance to win
      const winningHandId = Math.floor(Math.random() * 10);
      const hand = FIXED_HANDS[winningHandId];
      roundPayouts += betPerCategory * hand.payout; // Payout is profit, not total return
    }

    // 2. Hand Rank (approximate frequency)
    const rankKeys = Object.keys(rankPayoutMap);
    const rankFreqs = { 'Four of a Kind': 0.0005, 'Full House': 0.00075, 'Flush': 0.001, 'Straight': 0.0008, 'Three of a Kind': 0.0015, 'Two Pair': 0.003 };
    const winningRank = rankKeys[Math.floor(Math.random() * rankKeys.length)];
    if (Math.random() < rankFreqs[winningRank]) {
      const rankMult = rankPayoutMap[winningRank];
      roundPayouts += betPerCategory * rankMult;
    }

    // 3. Color Board (realistic distribution)
    const reds = Math.floor(Math.random() * 6);
    const blacks = 5 - reds;
    let colorPayouts = 0;
    if (reds >= 3) {
      for (let i = 3; i <= reds; i++) {
        const key = `${i}R`;
        if (rbPayoutMap[key]) colorPayouts += betPerCategory * rbPayoutMap[key];
      }
    }
    if (blacks >= 3) {
      for (let i = 3; i <= blacks; i++) {
        const key = `${i}B`;
        if (rbPayoutMap[key]) colorPayouts += betPerCategory * rbPayoutMap[key];
      }
    }
    roundPayouts += colorPayouts;

    // 4. Low/High (50% win rate)
    if (Math.random() < 0.5) {
      roundPayouts += betPerCategory * lowHighPayout;
    }

    stats.totalBets += roundBets;
    stats.totalPayouts += roundPayouts;
  }

  return stats;
}