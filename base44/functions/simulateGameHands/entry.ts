import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { handsToSimulate = 2000000 } = await req.json();

    // Simulate realistic rounds where a player bets on:
    // 1. A carded hand (wins hand payout + hand rank payout)
    // 2. Color board (3R/3B/4R/4B/5R/5B — cumulative wins)
    // 3. Low/High (50/50 on river card)

    const FIXED_HANDS = [
      { id: 1,  payout: 0.08 }, { id: 2,  payout: 0.025 }, { id: 3,  payout: 0.07 },
      { id: 4,  payout: 0.045 }, { id: 5,  payout: 0.035 }, { id: 6,  payout: 0.03 },
      { id: 7,  payout: 0.035 }, { id: 8,  payout: 0.035 }, { id: 9,  payout: 0.045 },
      { id: 10, payout: 0.07 },
    ];

    const rankPayoutMap = {
      'Royal Flush': 0.005,
      'Straight Flush': 0.0025,
      'Four of a Kind': 0.00035,
      'Full House': 0.000075,
      'Flush': 0.0001,
      'Straight': 0.0002,
      'Three of a Kind': 0.0001,
      'Two Pair': 0.0004,
      'One Pair': 0.0005,
    };

    const rbPayoutMap = { '3R': 0.008, '3B': 0.008, '4R': 0.025, '4B': 0.025, '5R': 0.2, '5B': 0.2 };
    const lowHighPayout = 1; // 1:1 even money

    const stats = {
      totalHands: handsToSimulate,
      totalBets: 0,
      totalPayouts: 0,
      roundResults: [],
    };

    // Simulate 2M rounds where a typical player makes bets on ALL categories
    for (let round = 0; round < handsToSimulate; round++) {
      // Player bets: $10 on a hand, $10 on color, $10 on rank, $10 on low/high = $40 total
      const betPerCategory = 10;
      let roundBets = betPerCategory * 4; // $40 per round
      let roundPayouts = 0;

      // 1. Random winning hand (1-10)
      const winningHandId = Math.floor(Math.random() * 10) + 1;
      const hand = FIXED_HANDS.find(h => h.id === winningHandId);
      
      // Hand payout: $10 bet * payout multiplier
      roundPayouts += betPerCategory * (1 + hand.payout);

      // 2. Random hand rank (determines rank payout)
      const rankKeys = Object.keys(rankPayoutMap);
      const winningRank = rankKeys[Math.floor(Math.random() * rankKeys.length)];
      const rankMult = rankPayoutMap[winningRank];
      roundPayouts += betPerCategory * (1 + rankMult);

      // 3. Color board (reds vs blacks distribution)
      const reds = Math.floor(Math.random() * 6); // 0-5 reds
      const blacks = 5 - reds;
      let colorPayouts = 0;
      // Cumulative wins: if 4 reds, both 3R and 4R win
      if (reds >= 3) {
        for (let i = 3; i <= reds; i++) {
          colorPayouts += betPerCategory * (1 + (rbPayoutMap[`${i}R`] || 1));
        }
      }
      if (blacks >= 3) {
        for (let i = 3; i <= blacks; i++) {
          colorPayouts += betPerCategory * (1 + (rbPayoutMap[`${i}B`] || 1));
        }
      }
      // If no color win, player loses that bet (roundPayouts unchanged)
      roundPayouts += colorPayouts;

      // 4. Low/High (50/50 on river)
      const isLow = Math.random() > 0.5;
      roundPayouts += betPerCategory * 2; // 1:1 payout means double the bet

      stats.totalBets += roundBets;
      stats.totalPayouts += roundPayouts;
      
      stats.roundResults.push({
        round,
        bets: roundBets,
        payouts: roundPayouts,
        profit: roundPayouts - roundBets,
      });
    }

    const overallRTP = (stats.totalPayouts / stats.totalBets * 100).toFixed(2);
    const avgProfitPerRound = ((stats.totalPayouts - stats.totalBets) / handsToSimulate).toFixed(2);

    return Response.json({
      success: true,
      summary: {
        totalHandsSimulated: handsToSimulate,
        totalBets: stats.totalBets,
        totalPayouts: stats.totalPayouts,
        casinoProfit: (stats.totalBets - stats.totalPayouts).toFixed(2),
        overallRTP: overallRTP + '%',
        avgProfitPerRound,
        isCompliant: parseFloat(overallRTP) >= 85 && parseFloat(overallRTP) <= 98,
        recommendation: parseFloat(overallRTP) >= 85 && parseFloat(overallRTP) <= 98
          ? '✓ Game meets compliance (85-98% RTP)'
          : parseFloat(overallRTP) < 85
            ? '⚠️ Game favors casino (below 85%)'
            : '⚠️ Game favors players (above 98%)',
      },
      sampleRounds: stats.roundResults.slice(0, 10), // Show first 10 rounds as example
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});