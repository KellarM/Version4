import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Gaming License Calibration — runs a single batch chunk
// Frontend calls this multiple times and accumulates results

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const BATCH_SIZE = Math.min(body.batchSize || 100_000, 100_000); // max 100K per call
    const runIndex = body.runIndex || 0; // which of 3 reproducibility runs

    // ── Payout Tables ────────────────────────────────────────────────
    const HAND_PAYOUTS = [14.51, 4.21, 10.98, 6.75, 5.63, 4.48, 4.04, 4.69, 4.11, 9.30];

    const RANK_KEYS = ['One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush','Royal Flush'];
    const RANK_FREQS = [0.42257, 0.04754, 0.02113, 0.04619, 0.00327, 0.02596, 0.00168, 0.00139, 0.000154];
    const RANK_PAYOUTS = [null, 16.76, 3.95, 4.58, 3.10, 2.53, 12.43, null, null]; // null = progressive
    const RANK_CUM = [];
    let rc = 0;
    for (const f of RANK_FREQS) { rc += f; RANK_CUM.push(rc); }

    const RED_CUM = [0.03125, 0.18750, 0.50000, 0.81250, 0.96875, 1.00000];
    const COLOR_KEYS = ['3R','3B','4R','4B','5R','5B'];
    const COLOR_PAYOUTS = { '3R': 0.93, '3B': 0.93, '4R': 4.81, '4B': 4.81, '5R': 43.36, '5B': 43.46 };
    const LH_PAYOUT = 0.93;

    // Win probabilities for color board (exact binomial)
    const COLOR_WIN_PROBS = { '3R': 0.5, '3B': 0.5, '4R': 0.1875, '4B': 0.1875, '5R': 0.03125, '5B': 0.03125 };

    // ── RNG helpers ──────────────────────────────────────────────────
    function rollRank() {
      const r = Math.random();
      for (let i = 0; i < RANK_CUM.length; i++) if (r < RANK_CUM[i]) return i;
      return 0;
    }
    function rollRedCount() {
      const r = Math.random();
      for (let i = 0; i < 6; i++) if (r < RED_CUM[i]) return i;
      return 5;
    }

    // ── Strategy pool (representative sample of all 391 strategies) ──
    // Each: { hands:int[], ranks:int[], colors:string[], river:'none'|'strict4'|'when3'|'random' }
    const STRAT_POOL = [
      // Kind Combo variants
      { hands:[1,6], ranks:[2,6], colors:[], river:'strict4' },
      { hands:[0,2,3,1], ranks:[0], colors:[], river:'strict4' },
      { hands:[0,1], ranks:[0,1], colors:[], river:'strict4' },
      { hands:[1,6], ranks:[2,6], colors:['3R','4R','3B','4B'], river:'strict4' },
      { hands:[0,2,3,1], ranks:[0], colors:['3R','4R','3B','4B'], river:'strict4' },
      { hands:[0,1], ranks:[0,1], colors:['3R','4R','3B','4B'], river:'strict4' },
      { hands:[1,6], ranks:[2,6], colors:['3R','4R'], river:'strict4' },
      { hands:[0,1], ranks:[0,1], colors:['3B','4B'], river:'none' },
      { hands:[1,6], ranks:[2,6], colors:['3B'], river:'none' },
      { hands:[0,1], ranks:[0,1], colors:['3R'], river:'none' },
      // Flush variants
      { hands:[3,4], ranks:[4], colors:['3B','4B','5B'], river:'when3' },
      { hands:[3,4], ranks:[4], colors:['3B','4B'], river:'when3' },
      { hands:[3,4], ranks:[4], colors:['3B'], river:'when3' },
      { hands:[3,4], ranks:[4], colors:['3B','4B','5B'], river:'none' },
      { hands:[3], ranks:[4], colors:['3B','4B','5B'], river:'when3' },
      { hands:[4], ranks:[4], colors:['3B','4B'], river:'when3' },
      { hands:[5,7], ranks:[4], colors:['3R','4R','5R'], river:'when3' },
      { hands:[5,7], ranks:[4], colors:['3R','4R'], river:'when3' },
      { hands:[5,7], ranks:[4], colors:['3R'], river:'when3' },
      { hands:[5,7], ranks:[4], colors:['3R','4R','5R'], river:'none' },
      { hands:[5], ranks:[4], colors:['3R','4R','5R'], river:'when3' },
      { hands:[7], ranks:[4], colors:['3R','4R'], river:'when3' },
      // Straight Mix
      { hands:[0,9], ranks:[3], colors:[], river:'strict4' },
      { hands:[2,3], ranks:[3], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { hands:[3,4], ranks:[3], colors:['3R','4R','3B','4B'], river:'strict4' },
      { hands:[4,5], ranks:[3], colors:['3R','4R'], river:'strict4' },
      { hands:[5,7], ranks:[3], colors:['3B','4B'], river:'strict4' },
      { hands:[0,9], ranks:[3], colors:['3R'], river:'strict4' },
      { hands:[2,3], ranks:[3], colors:['3B'], river:'strict4' },
      { hands:[3,4], ranks:[3], colors:[], river:'none' },
      { hands:[4,5], ranks:[3], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { hands:[5,7], ranks:[3], colors:['3R','4R','3B','4B'], river:'none' },
      { hands:[0,9], ranks:[3], colors:['3R','4R'], river:'none' },
      { hands:[2,3], ranks:[3], colors:['3B','4B'], river:'none' },
      { hands:[3,4], ranks:[3], colors:['3R'], river:'none' },
      { hands:[4,5], ranks:[3], colors:['3B'], river:'none' },
      // Singles
      { hands:[0], ranks:[], colors:[], river:'none' },
      { hands:[1], ranks:[], colors:[], river:'none' },
      { hands:[2], ranks:[], colors:[], river:'none' },
      { hands:[3], ranks:[], colors:[], river:'none' },
      { hands:[4], ranks:[], colors:[], river:'none' },
      { hands:[5], ranks:[], colors:[], river:'none' },
      { hands:[6], ranks:[], colors:[], river:'none' },
      { hands:[7], ranks:[], colors:[], river:'none' },
      { hands:[8], ranks:[], colors:[], river:'none' },
      { hands:[9], ranks:[], colors:[], river:'none' },
      // Single Mix
      { hands:[0], ranks:[0,1], colors:[], river:'none' },
      { hands:[1], ranks:[0,1], colors:[], river:'none' },
      { hands:[2], ranks:[0], colors:[], river:'none' },
      { hands:[3], ranks:[0], colors:[], river:'none' },
      { hands:[4], ranks:[0], colors:[], river:'none' },
      // Foursome variants
      { hands:[0,1,2,9], ranks:[0], colors:[], river:'none' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R','4R','3B','4B'], river:'none' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R','4R'], river:'none' },
      { hands:[0,1,2,9], ranks:[0], colors:['3B','4B'], river:'strict4' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R'], river:'strict4' },
      { hands:[0,1,2,9], ranks:[0], colors:['3B'], river:'strict4' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R','4R','3B','4B'], river:'when3' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R'], river:'when3' },
      { hands:[0,1,2,9], ranks:[0], colors:['3B'], river:'random' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R','4R'], river:'random' },
      // Foursome 2/4
      { hands:[0,2,3,4], ranks:[0], colors:[], river:'none' },
      { hands:[0,2,3,4], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { hands:[0,2,3,4], ranks:[0], colors:['3R','3B'], river:'when3' },
      { hands:[0,2,3,4], ranks:[0], colors:['3R'], river:'random' },
      { hands:[0,5,7,9], ranks:[0], colors:[], river:'none' },
      { hands:[0,5,7,9], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { hands:[0,5,7,9], ranks:[0], colors:['3R','3B'], river:'when3' },
      { hands:[0,5,7,9], ranks:[0], colors:['3B'], river:'random' },
      // No-rank Foursome
      { hands:[0,2,3,4], ranks:[], colors:[], river:'none' },
      { hands:[0,2,3,4], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { hands:[0,2,3,4], ranks:[], colors:['3R','3B'], river:'when3' },
      { hands:[0,5,7,9], ranks:[], colors:['3R','4R','3B','4B'], river:'random' },
      // Rank High Odds
      { hands:[], ranks:[1,6], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { hands:[], ranks:[1,6], colors:['3R','4R','3B','4B'], river:'when3' },
      { hands:[], ranks:[1,6], colors:['3R','3B'], river:'random' },
      { hands:[], ranks:[1,6], colors:['3R'], river:'none' },
      { hands:[], ranks:[1,6], colors:['3B'], river:'strict4' },
      { hands:[], ranks:[1,6], colors:[], river:'when3' },
      { hands:[], ranks:[1,6], colors:[], river:'none' },
      // Color Board only
      { hands:[], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { hands:[], ranks:[], colors:['3R','4R','3B','4B'], river:'none' },
      { hands:[], ranks:[], colors:['3R','3B'], river:'none' },
      { hands:[], ranks:[], colors:['3R'], river:'strict4' },
      { hands:[], ranks:[], colors:['3B'], river:'when3' },
      { hands:[], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      // Progressive (One Pair only)
      { hands:[], ranks:[0], colors:[], river:'none' },
      { hands:[], ranks:[0], colors:[], river:'strict4' },
      { hands:[], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { hands:[], ranks:[0], colors:['3R','4R','3B','4B'], river:'random' },
      { hands:[], ranks:[0], colors:['3R'], river:'none' },
      { hands:[], ranks:[0], colors:['3B'], river:'strict4' },
      // Progressive (One Pair + Straight Flush)
      { hands:[], ranks:[0,7], colors:[], river:'none' },
      { hands:[], ranks:[0,7], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { hands:[], ranks:[0,7], colors:['3R','4R','3B','4B'], river:'when3' },
      { hands:[], ranks:[0,7], colors:['3R'], river:'random' },
      // Power Rank
      { hands:[], ranks:[6,5,2,1], colors:[], river:'none' },
      { hands:[], ranks:[6,5,2,1], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { hands:[], ranks:[6,5,2,1], colors:['3R','4R','3B','4B'], river:'when3' },
      { hands:[], ranks:[6,5,2,1], colors:['3R'], river:'random' },
      { hands:[], ranks:[6,5,2,1], colors:['3B'], river:'none' },
    ];

    const N = BATCH_SIZE;
    const BET = 25;

    // ── Per-category accumulators ────────────────────────────────────
    let handBet = 0, handPay = 0;
    let rankBet = 0, rankPay = 0;
    let colorBet = 0, colorPay = 0;
    let lhBet = 0, lhPay = 0;

    // Per-bet-type accumulators for individual compliance checks
    const handTypeBet = new Float64Array(10);
    const handTypePay = new Float64Array(10);
    const rankTypeBet = new Float64Array(9);
    const rankTypePay = new Float64Array(9);
    const colorTypeBet = {}; COLOR_KEYS.forEach(k => { colorTypeBet[k] = 0; });
    const colorTypePay = {}; COLOR_KEYS.forEach(k => { colorTypePay[k] = 0; });
    let lhBetCount = 0;

    // ── Simulation loop ──────────────────────────────────────────────
    for (let g = 0; g < N; g++) {
      const winHand = (Math.random() * 10) | 0;
      const rankIdx = rollRank();
      const redCount = rollRedCount();
      const blackCount = 5 - redCount;
      const riverIsLow = Math.random() < 0.5;
      const lowShowing = (Math.random() * 5) | 0;
      const highShowing = 4 - lowShowing;

      const strat = STRAT_POOL[(g * 7 + runIndex * 3) % STRAT_POOL.length];

      // Hand bets
      for (let i = 0; i < strat.hands.length; i++) {
        const h = strat.hands[i];
        handBet += BET;
        handTypeBet[h] += BET;
        if (h === winHand) {
          const p = BET * (1 + HAND_PAYOUTS[h]);
          handPay += p;
          handTypePay[h] += p;
        }
      }

      // Rank bets
      for (let i = 0; i < strat.ranks.length; i++) {
        const ri = strat.ranks[i];
        const mult = RANK_PAYOUTS[ri];
        rankBet += BET;
        rankTypeBet[ri] += BET;
        if (ri === rankIdx && mult !== null) {
          const p = BET * (1 + mult);
          rankPay += p;
          rankTypePay[ri] += p;
        }
      }

      // Color bets
      for (let i = 0; i < strat.colors.length; i++) {
        const cKey = strat.colors[i];
        const cCount = parseInt(cKey[0]);
        const isRed = cKey[1] === 'R';
        colorBet += BET;
        colorTypeBet[cKey] += BET;
        if (isRed ? redCount >= cCount : blackCount >= cCount) {
          const p = BET * (1 + COLOR_PAYOUTS[cKey]);
          colorPay += p;
          colorTypePay[cKey] += p;
        }
      }

      // River/Low-High bet
      if (strat.river !== 'none') {
        let shouldBet = false, betLow = false;
        if (strat.river === 'strict4') {
          if (lowShowing >= 4) { shouldBet = true; betLow = false; }
          else if (highShowing >= 4) { shouldBet = true; betLow = true; }
        } else if (strat.river === 'when3') {
          if (lowShowing >= 3 || highShowing >= 3) {
            shouldBet = true;
            betLow = lowShowing > highShowing;
          }
        } else if (strat.river === 'random') {
          shouldBet = true;
          betLow = Math.random() < 0.5;
        }
        if (shouldBet) {
          lhBet += BET;
          lhBetCount++;
          const won = betLow ? riverIsLow : !riverIsLow;
          if (won) lhPay += BET * (1 + LH_PAYOUT);
        }
      }
    }

    const totalBet = handBet + rankBet + colorBet + lhBet;
    const totalPay = handPay + rankPay + colorPay + lhPay;
    const rtp = totalBet > 0 ? totalPay / totalBet : 0;

    // ── Per-bet-type RTP for individual compliance ───────────────────
    const handBreakdown = HAND_PAYOUTS.map((payout, i) => ({
      id: i + 1,
      payout,
      bet: Math.round(handTypeBet[i]),
      paid: Math.round(handTypePay[i]),
      rtp: handTypeBet[i] > 0 ? (handTypePay[i] / handTypeBet[i] * 100).toFixed(3) : 'N/A',
      theoreticalRTP: ((1 / 10) * (1 + payout) * 100).toFixed(3), // 1-in-10 win chance
    }));

    const rankBreakdown = RANK_KEYS.map((name, i) => ({
      name,
      payout: RANK_PAYOUTS[i],
      freq: (RANK_FREQS[i] * 100).toFixed(4),
      bet: Math.round(rankTypeBet[i]),
      paid: Math.round(rankTypePay[i]),
      rtp: rankTypeBet[i] > 0 ? (rankTypePay[i] / rankTypeBet[i] * 100).toFixed(3) : 'N/A',
      theoreticalRTP: RANK_PAYOUTS[i] !== null ? (RANK_FREQS[i] * (1 + RANK_PAYOUTS[i]) * 100).toFixed(3) : 'Progressive',
    }));

    const colorBreakdown = COLOR_KEYS.map(k => ({
      key: k,
      payout: COLOR_PAYOUTS[k],
      winProb: (COLOR_WIN_PROBS[k] * 100).toFixed(3),
      bet: Math.round(colorTypeBet[k]),
      paid: Math.round(colorTypePay[k]),
      rtp: colorTypeBet[k] > 0 ? (colorTypePay[k] / colorTypeBet[k] * 100).toFixed(3) : 'N/A',
      theoreticalRTP: (COLOR_WIN_PROBS[k] * (1 + COLOR_PAYOUTS[k]) * 100).toFixed(3),
    }));

    const lhTheoretical = (0.5 * (1 + LH_PAYOUT) * 100).toFixed(3);

    return Response.json({
      success: true,
      batchSize: N,
      runIndex,
      raw: {
        totalBet: Math.round(totalBet),
        totalPay: Math.round(totalPay),
        handBet: Math.round(handBet), handPay: Math.round(handPay),
        rankBet: Math.round(rankBet), rankPay: Math.round(rankPay),
        colorBet: Math.round(colorBet), colorPay: Math.round(colorPay),
        lhBet: Math.round(lhBet), lhPay: Math.round(lhPay),
      },
      rtp: (rtp * 100).toFixed(4),
      compliant: rtp >= 0.95 && rtp <= 0.98,
      breakdown: { hands: handBreakdown, ranks: rankBreakdown, colors: colorBreakdown, lhTheoretical, lhRTP: lhBet > 0 ? (lhPay / lhBet * 100).toFixed(3) : 'N/A' },
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});