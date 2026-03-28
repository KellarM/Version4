import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const gamesToSimulate = body.gamesToSimulate || 100;

    // Constants
    const FIXED_HANDS = [
      { id: 1,  payout: 8.10 },
      { id: 2,  payout: 6.75 },
      { id: 3,  payout: 8.52 },
      { id: 4,  payout: 7.90 },
      { id: 5,  payout: 8.31 },
      { id: 6,  payout: 10.18 },
      { id: 7,  payout: 7.48 },
      { id: 8,  payout: 11.95 },
      { id: 9,  payout: 7.27 },
      { id: 10, payout: 9.77 },
    ];

    const HAND_RANK_PAYOUTS = {
      'Four of a Kind': 3.79,
      'Full House': 0.98,
      'Flush': 1.30,
      'Straight': 1.90,
      'Three of a Kind': 0.98,
      'Two Pair': 4.83,
      'One Pair': 5.87,
    };

    const COLOR_PAYOUTS = { '3R': 0.78, '3B': 0.78, '4R': 5.04, '4B': 5.04, '5R': 19.74, '5B': 19.74 };
    const LH_PAYOUT = 0.88;
    const RED_COUNT_PROBS = [0.03125, 0.15625, 0.3125, 0.3125, 0.15625, 0.03125];
    const RED_COUNT_CUM = [];
    let rcCum = 0;
    for (const p of RED_COUNT_PROBS) { rcCum += p; RED_COUNT_CUM.push(rcCum); }

    const RANK_FREQ = [0.000154, 0.00139, 0.00168, 0.02596, 0.00327, 0.04619, 0.02113, 0.04754, 0.42257];
    const RANK_CUM = [];
    let cum = 0;
    for (const f of RANK_FREQ) { cum += f; RANK_CUM.push(cum); }
    const RANKS = ['Royal Flush','Straight Flush','Four of a Kind','Full House','Flush','Straight','Three of a Kind','Two Pair','One Pair'];

    // Strategy constants
    const BETTING_HANDS = [2, 5, 6, 7, 8, 9]; // Hand IDs to always bet on
    const HAND_BET = 50;
    const STARTING_BALANCE = 1000;

    function rollRedCount() {
      const r = Math.random();
      for (let i = 0; i < 6; i++) { if (r < RED_COUNT_CUM[i]) return i; }
      return 5;
    }

    function rollRank() {
      const r = Math.random();
      for (let i = 0; i < RANK_CUM.length; i++) { if (r < RANK_CUM[i]) return i; }
      return 8;
    }

    function isLow(rank) {
      const LOW_RANKS = ['2', '3', '4', '5', '6', '7'];
      return LOW_RANKS.includes(rank);
    }

    let totalProfit = 0;
    const results = [];

    for (let game = 0; game < gamesToSimulate; game++) {
      let balance = STARTING_BALANCE;

      // Generate 5 community cards (simplified: just count low/high)
      const communityCards = Array.from({ length: 5 }, () => ({
        rank: Math.random() < 0.5 ? '2' : '10', // Simplified for counting
      }));

      // Count low and high
      const lowCount = communityCards.filter(c => isLow(c.rank)).length;
      const highCount = 5 - lowCount;

      let gameProfit = 0;

      // Phase 1: Bet on 6 fixed hands ($50 each)
      const handBetTotal = HAND_BET * BETTING_HANDS.length; // $300
      balance -= handBetTotal;
      gameProfit -= handBetTotal;

      // Winning hand (random 1-10)
      const winningHandId = Math.floor(Math.random() * 10) + 1;
      const winningHand = FIXED_HANDS.find(h => h.id === winningHandId);
      
      // Pay out winning hands if they match
      BETTING_HANDS.forEach(handId => {
        if (handId === winningHandId) {
          const payout = HAND_BET * (1 + winningHand.payout);
          balance += payout;
          gameProfit += payout;
        }
      });

      // Phase 2: LOW/HIGH betting (contrarian strategy)
      const maxAvailable = balance - 0; // Can bet all remaining if needed
      if (lowCount >= 4 && highCount < 4 && maxAvailable > 0) {
        // 4+ low showing, bet on HIGH (opposite)
        const lhBet = Math.min(300, maxAvailable); // Reasonable max bet
        balance -= lhBet;
        gameProfit -= lhBet;

        // River card (random)
        const riverIsLow = Math.random() < 0.5;
        if (!riverIsLow) { // We bet on HIGH, so HIGH wins
          const payout = lhBet * (1 + LH_PAYOUT);
          balance += payout;
          gameProfit += payout;
        }
      } else if (highCount >= 4 && lowCount < 4 && maxAvailable > 0) {
        // 4+ high showing, bet on LOW (opposite)
        const lhBet = Math.min(300, maxAvailable);
        balance -= lhBet;
        gameProfit -= lhBet;

        // River card (random)
        const riverIsLow = Math.random() < 0.5;
        if (riverIsLow) { // We bet on LOW, so LOW wins
          const payout = lhBet * (1 + LH_PAYOUT);
          balance += payout;
          gameProfit += payout;
        }
      }

      totalProfit += gameProfit;
    }

    const avgProfit = totalProfit / gamesToSimulate;
    const roi = ((avgProfit / STARTING_BALANCE) * 100).toFixed(2);

    return Response.json({
      success: true,
      gamesToSimulate,
      totalProfit: totalProfit.toFixed(2),
      avgProfitPerGame: avgProfit.toFixed(2),
      finalBalance: (STARTING_BALANCE + totalProfit).toFixed(2),
      roi: roi + '%',
      strategy: 'Bet $50 on hands 2,5,6,7,8,9 + contrarian LOW/HIGH when 4+ cards of one type',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});