import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // Cap at 2M per strategy to stay within Deno CPU limits (12 strategies × 2M = 24M total)
    const GAMES_PER_STRATEGY = Math.min(body.gamesPerStrategy || 1_000_000, 2_000_000);

    // ── Payout tables (flat arrays for fast access) ──
    const HAND_PAYOUTS = [8.10, 6.75, 8.52, 7.90, 8.31, 10.18, 7.48, 11.95, 7.27, 9.77]; // index 0 = hand 1

    const RANK_KEYS = ['One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush','Royal Flush'];
    const RANK_FREQS = [0.42256, 0.04754, 0.02113, 0.00462, 0.00327, 0.00261, 0.00168, 0.00139, 0.000154];
    const RANK_PAYOUTS_ARR = [5.87, 4.83, 0.98, 1.90, 1.30, 0.98, 3.79, -1, -1]; // -1 = progressive (no base payout)

    // Build cumulative rank freq array
    const RANK_CUM = [];
    let _rc = 0;
    for (const f of RANK_FREQS) { _rc += f; RANK_CUM.push(_rc); }

    // Binomial red-count distribution for 5 cards from a balanced deck (approx 0.5)
    const RED_CUM = [0.03125, 0.18750, 0.50000, 0.81250, 0.96875, 1.00000];

    // Color payouts indexed by [redCount][colorBet]
    // colorBet: 0=3R, 1=3B, 2=4R, 3=4B, 4=5R, 5=5B
    // A color bet wins cumulatively: 4R wins if redCount>=4, 5R wins if redCount>=5, etc.
    const COLOR_PAYOUTS_MAP = { '3R': 0.78, '3B': 0.78, '4R': 5.04, '4B': 5.04, '5R': 19.74, '5B': 19.74 };
    const LOW_HIGH_PAYOUT = 0.83;

    function rollRank() {
      const r = Math.random();
      for (let i = 0; i < RANK_CUM.length; i++) { if (r < RANK_CUM[i]) return i; }
      return 0;
    }

    function rollRedCount() {
      const r = Math.random();
      for (let i = 0; i < 6; i++) { if (r < RED_CUM[i]) return i; }
      return 5;
    }

    // ── Strategy definitions — stored as pre-parsed numeric arrays for speed ──
    // Each strategy: { name, description, hands[], rankIdxs[], colors[], riverHedge, riverAggressive, betPerUnit }
    const STRATEGIES = [
      {
        name: 'ST1_Original',
        desc: 'Hands 2,5,6,7,8,9 + river hedge',
        hands: [1,4,5,6,7,8], rankIdxs: [], colors: [], riverHedge: true, riverAgg: false, unit: 50,
      },
      {
        name: 'ConservativeHedger',
        desc: '4 hands (3,6,8,10) + 4 colors',
        hands: [2,5,7,9], rankIdxs: [], colors: ['3R','3B','4R','4B'], riverHedge: false, riverAgg: false, unit: 25,
      },
      {
        name: 'RankStacker',
        desc: '2 hands (6,8) + 5 ranks',
        hands: [5,7], rankIdxs: [0,1,2,3,5], colors: [], riverHedge: false, riverAgg: false, unit: 30,
      },
      {
        name: 'FlushHunter',
        desc: '3 hands (3,4,5) + Flush + river hedge',
        hands: [2,3,4], rankIdxs: [4], colors: [], riverHedge: true, riverAgg: false, unit: 50,
      },
      {
        name: 'StraightHunter',
        desc: '3 hands (1,5,10) + Straight + river hedge',
        hands: [0,4,9], rankIdxs: [3], colors: [], riverHedge: true, riverAgg: false, unit: 50,
      },
      {
        name: 'ColorBoardSpecialist',
        desc: '2 hands (1,4) + all 6 colors + river hedge',
        hands: [0,3], rankIdxs: [], colors: ['3R','3B','4R','4B','5R','5B'], riverHedge: true, riverAgg: false, unit: 20,
      },
      {
        name: 'HighPayoutFocus',
        desc: '2 hands (6,8) + Trips/FullHouse/Quads',
        hands: [5,7], rankIdxs: [2,5,6], colors: [], riverHedge: false, riverAgg: false, unit: 50,
      },
      {
        name: 'RiverFocused',
        desc: 'Hand 8 + aggressive river (HIGH)',
        hands: [7], rankIdxs: [], colors: [], riverHedge: false, riverAgg: true, unit: 50,
      },
      {
        name: 'BalancedSpread',
        desc: '3 hands + 3 ranks + 2 colors + river hedge',
        hands: [1,5,7], rankIdxs: [0,4,3], colors: ['3R','4R'], riverHedge: true, riverAgg: false, unit: 30,
      },
      {
        name: 'DiversifiedHedge',
        desc: '6 hands + 2 ranks + 2 colors',
        hands: [0,2,4,6,8,9], rankIdxs: [0,1], colors: ['3R','3B'], riverHedge: false, riverAgg: false, unit: 15,
      },
      {
        name: 'AdaptiveHybrid',
        desc: '4 hands + 2 ranks (baseline adaptive)',
        hands: [1,4,5,7], rankIdxs: [0,1], colors: [], riverHedge: false, riverAgg: false, unit: 30,
      },
      {
        name: 'MetaAdaptive',
        desc: 'AI blend baseline (balanced mode)',
        hands: [1,5,7], rankIdxs: [0,4], colors: ['3R','3B'], riverHedge: true, riverAgg: false, unit: 25,
      },
    ];

    const results = [];

    for (const strat of STRATEGIES) {
      const { hands, rankIdxs, colors, riverHedge, riverAgg, unit } = strat;

      // Pre-compute color win probabilities (analytical, not simulated — much faster)
      // P(redCount >= N) from binomial(5, 0.5)
      const RED_PROBS = [1/32, 5/32, 10/32, 10/32, 5/32, 1/32]; // P(exactly k red)
      function pRedAtLeast(n) { let p = 0; for (let k = n; k <= 5; k++) p += RED_PROBS[k]; return p; }
      function pBlackAtLeast(n) { let p = 0; for (let k = n; k <= 5; k++) p += RED_PROBS[5 - k]; return p; }

      // Total bet per game
      const totalBetPerGame =
        hands.length * unit +
        rankIdxs.length * unit +
        colors.length * unit +
        (riverHedge ? unit : 0) +
        (riverAgg ? unit : 0);

      // ── Simulate ──
      let totalBets = 0;
      let totalPayouts = 0;
      let handBets = 0, handPays = 0;
      let rankBets = 0, rankPays = 0;
      let colorBets = 0, colorPays = 0;
      let riverBets = 0, riverPays = 0;

      const N = GAMES_PER_STRATEGY;

      for (let g = 0; g < N; g++) {
        const winHand = (Math.random() * 10) | 0; // 0-9
        const rankIdx = rollRank();
        const redCount = rollRedCount();
        const blackCount = 5 - redCount;
        const riverIsLow = Math.random() < 0.5;

        let gameWin = 0;

        // Hand payouts
        for (let i = 0; i < hands.length; i++) {
          handBets += unit;
          if (hands[i] === winHand) {
            const p = unit * (1 + HAND_PAYOUTS[winHand]);
            handPays += p;
            gameWin += p;
          }
        }

        // Rank payouts
        for (let i = 0; i < rankIdxs.length; i++) {
          rankBets += unit;
          if (rankIdxs[i] === rankIdx) {
            const mult = RANK_PAYOUTS_ARR[rankIdx];
            if (mult >= 0) {
              const p = unit * (1 + mult);
              rankPays += p;
              gameWin += p;
            }
          }
        }

        // Color payouts (cumulative)
        if (colors.length > 0) {
          for (let i = 0; i < colors.length; i++) {
            colorBets += unit;
            const cKey = colors[i];
            const cCount = parseInt(cKey[0]);
            const isRed = cKey[1] === 'R';
            const wins = isRed ? redCount >= cCount : blackCount >= cCount;
            if (wins) {
              const p = unit * (1 + COLOR_PAYOUTS_MAP[cKey]);
              colorPays += p;
              gameWin += p;
            }
          }
        }

        // River hedge (bets LOW)
        if (riverHedge) {
          riverBets += unit;
          if (riverIsLow) {
            const p = unit * (1 + LOW_HIGH_PAYOUT);
            riverPays += p;
            gameWin += p;
          }
        }

        // River aggressive (bets HIGH)
        if (riverAgg) {
          riverBets += unit;
          if (!riverIsLow) {
            const p = unit * (1 + LOW_HIGH_PAYOUT);
            riverPays += p;
            gameWin += p;
          }
        }

        totalBets += totalBetPerGame;
        totalPayouts += gameWin;
      }

      const rtp = totalBets > 0 ? totalPayouts / totalBets : 0;
      const hRtp = handBets > 0 ? handPays / handBets : null;
      const rkRtp = rankBets > 0 ? rankPays / rankBets : null;
      const cRtp = colorBets > 0 ? colorPays / colorBets : null;
      const rvRtp = riverBets > 0 ? riverPays / riverBets : null;

      const TARGET = 0.965;
      const scaleFactor = totalPayouts > 0 ? (TARGET * totalBets) / totalPayouts : null;

      results.push({
        strategy: strat.name,
        description: strat.desc,
        gamesSimulated: N,
        totalBetPerGame,
        totalBets: Math.round(totalBets),
        totalPayouts: Math.round(totalPayouts),
        rtp: (rtp * 100).toFixed(3) + '%',
        houseEdge: ((1 - rtp) * 100).toFixed(3) + '%',
        compliant: rtp >= 0.95 && rtp <= 0.98,
        status: rtp > 0.98 ? '🔴 TOO HIGH' : rtp < 0.95 ? '🔴 TOO LOW' : '🟢 COMPLIANT',
        categoryBreakdown: {
          hands:  hRtp  != null ? { rtp: (hRtp * 100).toFixed(2) + '%',  betShare: ((handBets / totalBets) * 100).toFixed(1) + '%' }  : null,
          ranks:  rkRtp != null ? { rtp: (rkRtp * 100).toFixed(2) + '%', betShare: ((rankBets / totalBets) * 100).toFixed(1) + '%' }  : null,
          colors: cRtp  != null ? { rtp: (cRtp * 100).toFixed(2) + '%',  betShare: ((colorBets / totalBets) * 100).toFixed(1) + '%' } : null,
          river:  rvRtp != null ? { rtp: (rvRtp * 100).toFixed(2) + '%', betShare: ((riverBets / totalBets) * 100).toFixed(1) + '%' } : null,
        },
        calibration: {
          targetRTP: '96.5%',
          currentRTP: (rtp * 100).toFixed(3) + '%',
          scaleFactor: scaleFactor != null ? scaleFactor.toFixed(5) : null,
          direction: rtp > TARGET
            ? 'REDUCE payouts by ' + (((rtp - TARGET) / rtp) * 100).toFixed(2) + '%'
            : rtp < TARGET
            ? 'INCREASE payouts by ' + (((TARGET - rtp) / TARGET) * 100).toFixed(2) + '%'
            : 'ON TARGET',
        },
      });
    }

    // ── Blended aggregate ──
    const aggBets = results.reduce((s, r) => s + r.totalBets, 0);
    const aggPays = results.reduce((s, r) => s + r.totalPayouts, 0);
    const aggRtp = aggBets > 0 ? aggPays / aggBets : 0;
    const compliantCount = results.filter(r => r.compliant).length;

    // ── Blended per-category (weighted by bet volume) ──
    let catHandBets = 0, catHandPays = 0;
    let catRankBets = 0, catRankPays = 0;
    let catColorBets = 0, catColorPays = 0;
    let catRiverBets = 0, catRiverPays = 0;

    for (const r of results) {
      const N = r.gamesSimulated;
      const tb = r.totalBets;
      if (r.categoryBreakdown.hands) {
        const share = parseFloat(r.categoryBreakdown.hands.betShare) / 100;
        const bets = tb * share;
        catHandBets += bets;
        catHandPays += bets * parseFloat(r.categoryBreakdown.hands.rtp) / 100;
      }
      if (r.categoryBreakdown.ranks) {
        const share = parseFloat(r.categoryBreakdown.ranks.betShare) / 100;
        const bets = tb * share;
        catRankBets += bets;
        catRankPays += bets * parseFloat(r.categoryBreakdown.ranks.rtp) / 100;
      }
      if (r.categoryBreakdown.colors) {
        const share = parseFloat(r.categoryBreakdown.colors.betShare) / 100;
        const bets = tb * share;
        catColorBets += bets;
        catColorPays += bets * parseFloat(r.categoryBreakdown.colors.rtp) / 100;
      }
      if (r.categoryBreakdown.river) {
        const share = parseFloat(r.categoryBreakdown.river.betShare) / 100;
        const bets = tb * share;
        catRiverBets += bets;
        catRiverPays += bets * parseFloat(r.categoryBreakdown.river.rtp) / 100;
      }
    }

    const blendedHandRtp = catHandBets > 0 ? catHandPays / catHandBets : 0;
    const blendedRankRtp = catRankBets > 0 ? catRankPays / catRankBets : 0;
    const blendedColorRtp = catColorBets > 0 ? catColorPays / catColorBets : 0;
    const blendedRiverRtp = catRiverBets > 0 ? catRiverPays / catRiverBets : 0;

    // ── Calibration recommendations ──
    const TARGET = 0.965;
    const catRtps = [
      { category: 'hands',  rtp: blendedHandRtp },
      { category: 'ranks',  rtp: blendedRankRtp },
      { category: 'colors', rtp: blendedColorRtp },
      { category: 'river',  rtp: blendedRiverRtp },
    ];
    const recommendations = catRtps
      .filter(c => c.rtp > 0 && Math.abs(c.rtp - TARGET) > 0.005)
      .map(c => ({
        category: c.category,
        currentRTP: (c.rtp * 100).toFixed(2) + '%',
        targetRTP: '96.50%',
        action: c.rtp > TARGET
          ? `REDUCE ${c.category} payouts by ~${(((c.rtp - TARGET) / c.rtp) * 100).toFixed(1)}%`
          : `INCREASE ${c.category} payouts by ~${(((TARGET - c.rtp) / TARGET) * 100).toFixed(1)}%`,
        scaleFactor: (TARGET / c.rtp).toFixed(4),
      }));

    return Response.json({
      success: true,
      auditDate: new Date().toISOString(),
      config: {
        gamesPerStrategy: GAMES_PER_STRATEGY,
        totalStrategies: results.length,
        totalGamesSimulated: GAMES_PER_STRATEGY * results.length,
        targetRTP: '95.0% – 98.0% (center: 96.5%)',
        note: GAMES_PER_STRATEGY < 10_000_000 ? `Capped at ${GAMES_PER_STRATEGY.toLocaleString()}/strategy to stay within server CPU limits. Results are statistically stable at 2M+.` : undefined,
      },
      blendedResults: {
        aggregateRTP: (aggRtp * 100).toFixed(3) + '%',
        aggregateHouseEdge: ((1 - aggRtp) * 100).toFixed(3) + '%',
        compliantStrategies: compliantCount + '/' + results.length,
        overallStatus: aggRtp >= 0.95 && aggRtp <= 0.98
          ? '🟢 BLENDED RTP COMPLIANT'
          : aggRtp < 0.95
          ? '🔴 BLENDED RTP TOO LOW — Increase payouts'
          : '🔴 BLENDED RTP TOO HIGH — Reduce payouts',
      },
      categoryBlendedRTP: {
        hands:  (blendedHandRtp * 100).toFixed(2) + '%',
        ranks:  (blendedRankRtp * 100).toFixed(2) + '%',
        colors: (blendedColorRtp * 100).toFixed(2) + '%',
        river:  (blendedRiverRtp * 100).toFixed(2) + '%',
      },
      calibrationRecommendations: recommendations.length > 0
        ? recommendations
        : [{ action: 'All categories within 0.5% of target. No changes needed.' }],
      strategyResults: results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});