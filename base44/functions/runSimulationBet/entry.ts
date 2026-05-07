import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ============================================================
// RAPID FIRE TEXAS HOLD'EM — Backend Simulation Engine
// Deno port of auditWorker.js
//
// Runs ONE bet position at a time. Called sequentially by the
// UI for each of the 70 bet positions.
//
// Supports:
//   - hand bets (10 carded hands)
//   - perHandRank bets (60 hand+rank combos, adaptive card-win mode)
//   - color bets (3R/3B/4R/4B/5R/5B)
//   - lh bets (LOW/HIGH river)
//
// Checkpoint: saves partial state to SimulationBetResult every
// CHECKPOINT_INTERVAL rounds so crashes never lose progress.
// Resume: reads existing checkpoint from DB on start.
// ============================================================

// ── Deck & hand definitions ───────────────────────────────────
const RANK_LABELS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUIT_LABELS = ['clubs','diamonds','hearts','spades'];
const SUIT_SYMBOLS: Record<string,string> = { clubs:'♣', diamonds:'♦', hearts:'♥', spades:'♠' };
const SUIT_COLORS:  Record<string,string> = { clubs:'black', diamonds:'red', hearts:'red', spades:'black' };

function enc(rankLabel: string, suitLabel: string): number {
  return RANK_LABELS.indexOf(rankLabel) * 4 + SUIT_LABELS.indexOf(suitLabel);
}

const HANDS: number[][] = [
  [enc('A','diamonds'), enc('10','hearts')],
  [enc('K','clubs'),    enc('K','spades')],
  [enc('Q','clubs'),    enc('J','spades')],
  [enc('Q','spades'),   enc('10','spades')],
  [enc('J','clubs'),    enc('9','clubs')],
  [enc('8','diamonds'), enc('6','diamonds')],
  [enc('7','diamonds'), enc('7','spades')],
  [enc('4','hearts'),   enc('2','hearts')],
  [enc('3','clubs'),    enc('3','hearts')],
  [enc('A','hearts'),   enc('5','diamonds')],
];

const PLAYER_SET = new Set(HANDS.flat());

// 32-card dealer deck — built once
const DECK32_MASTER: number[] = [];
for (let r = 0; r < 13; r++) {
  for (let s = 0; s < 4; s++) {
    const c = r * 4 + s;
    if (!PLAYER_SET.has(c)) DECK32_MASTER.push(c);
  }
}

// ── Shuffle & deal (burn protocol) ───────────────────────────
const workDeck = new Int16Array(32);

function shuffleAndDeal(): [number,number,number,number,number] {
  for (let i = 0; i < 32; i++) workDeck[i] = DECK32_MASTER[i];
  for (let i = 31; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = workDeck[i]; workDeck[i] = workDeck[j]; workDeck[j] = tmp;
  }
  // Burn[0], Flop[1,2,3], Burn[4], Turn[5], Burn[6], River[7]
  return [workDeck[1], workDeck[2], workDeck[3], workDeck[5], workDeck[7]];
}

// ── Hand evaluator (strength score) ──────────────────────────
const BASE = 14;
const B1 = BASE;
const B2 = BASE * BASE;
const B3 = BASE * BASE * BASE;
const B4 = BASE * BASE * BASE * BASE;
const B5 = BASE * BASE * BASE * BASE * BASE;

function eval5strength(c0: number, c1: number, c2: number, c3: number, c4: number): number {
  const r0=c0>>2, r1=c1>>2, r2=c2>>2, r3=c3>>2, r4=c4>>2;
  const s0=c0&3,  s1=c1&3,  s2=c2&3,  s3=c3&3,  s4=c4&3;
  const flush = (s0===s1 && s1===s2 && s2===s3 && s3===s4);

  const rs = [r0,r1,r2,r3,r4].sort((a,b)=>b-a);
  const [a,b,c,d,e] = rs;

  const cnt = new Int8Array(13);
  cnt[r0]++; cnt[r1]++; cnt[r2]++; cnt[r3]++; cnt[r4]++;

  const isWheel = (a===12 && b===3 && c===2 && d===1 && e===0);
  const isStraight = isWheel || (new Set(rs).size===5 && a-e===4);
  const straightHigh = isWheel ? 3 : a;

  if (flush && isStraight) {
    if (a===12 && b===11 && c===10 && d===9 && e===8) return 9 * B5;
    return 8 * B5 + straightHigh;
  }

  const groups: [number,number][] = [];
  for (let v=12; v>=0; v--) if (cnt[v]) groups.push([v, cnt[v]]);
  groups.sort((x,y) => y[1]-x[1] || y[0]-x[0]);

  const maxCnt = groups[0][1];
  const secCnt = groups.length > 1 ? groups[1][1] : 0;

  if (maxCnt === 4) return 7*B5 + groups[0][0]*B4 + groups[1][0];
  if (maxCnt === 3 && secCnt === 2) return 6*B5 + groups[0][0]*B4 + groups[1][0];
  if (flush) return 5*B5 + a*B4 + b*B3 + c*B2 + d*B1 + e;
  if (isStraight) return 4*B5 + straightHigh;
  if (maxCnt === 3) return 3*B5 + groups[0][0]*B4 + groups[1][0]*B3 + groups[2][0]*B2;
  if (maxCnt === 2 && secCnt === 2) return 2*B5 + groups[0][0]*B4 + groups[1][0]*B3 + groups[2][0]*B2;
  if (maxCnt === 2) return 1*B5 + groups[0][0]*B4 + groups[1][0]*B3 + groups[2][0]*B2 + groups[3][0]*B1;
  return 0*B5 + a*B4 + b*B3 + c*B2 + d*B1 + e;
}

function rankCatFromStrength(s: number): number {
  return Math.floor(s / B5) - 1;
}

function best7strength(h0: number, h1: number, b0: number, b1: number, b2: number, b3: number, b4: number): number {
  const all = [h0, h1, b0, b1, b2, b3, b4];
  let best = -1;
  for (let i=0;i<3;i++) for (let j=i+1;j<4;j++) for (let k=j+1;k<5;k++)
    for (let l=k+1;l<6;l++) for (let m=l+1;m<7;m++) {
      const s = eval5strength(all[i],all[j],all[k],all[l],all[m]);
      if (s > best) best = s;
    }
  return best;
}

interface EvalResult {
  strengths: number[];
  bestStr: number;
  bestRankCat: number;
  winners: number[];
  winnerCount: number;
}

function evalAllHands(b0: number, b1: number, b2: number, b3: number, b4: number): EvalResult {
  const strengths: number[] = new Array(10);
  let bestStr = -1;
  for (let h=0; h<10; h++) {
    const s = best7strength(HANDS[h][0], HANDS[h][1], b0, b1, b2, b3, b4);
    strengths[h] = s;
    if (s > bestStr) bestStr = s;
  }
  const winners: number[] = new Array(10).fill(0);
  let winnerCount = 0;
  for (let h=0; h<10; h++) {
    if (strengths[h] === bestStr) { winners[h] = 1; winnerCount++; }
  }
  const bestRankCat = rankCatFromStrength(bestStr);
  return { strengths, bestStr, bestRankCat, winners, winnerCount };
}

// ── Rank category map ─────────────────────────────────────────
const RANK_CAT_MAP: Record<string,number> = {
  'High Card':-1,'One Pair':0,'Two Pair':1,'Three of a Kind':2,
  'Straight':3,'Flush':4,'Full House':5,'Four of a Kind':6,
  'Straight Flush':7,'Royal Flush':8,
};

const RANK_NAMES = [
  'One Pair (no bet)','Two Pair','Three of a Kind','Straight','Flush',
  'Full House','Four of a Kind','Straight Flush (no bet)','Royal Flush',
];

// ── Constants ─────────────────────────────────────────────────
const BET = 100;
const CHECKPOINT_INTERVAL = 20_000;
const ADAPTIVE_MAX_ROUNDS = 30_000_000;
// Max ms we'll run before saving checkpoint and returning partial
// Deno functions have a timeout — we stay well under it
const MAX_RUN_MS = 25_000;

// ── Main handler ──────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      job_id,
      bet_result_id,   // existing SimulationBetResult ID to update (for resume)
      rounds,          // target rounds (or target card wins for perHandRank)
      betType,
      betKey,
      betLabel,
      betGroup,
      betIndex,
      handPayouts,
      perHandRankPayouts,
      colorPayouts,
      lhPayout,
      rtpLow,
      rtpHigh,
      module_id,
    } = body;

    if (!job_id || !betType || !betKey || !rounds) {
      return Response.json({ error: 'Missing required fields: job_id, betType, betKey, rounds' }, { status: 400 });
    }

    // ── Load existing checkpoint if resuming ──────────────────
    let resumeFrom: Record<string,number> | null = null;
    let existingResultId: string | null = bet_result_id ?? null;

    if (existingResultId) {
      try {
        const existing = await base44.asServiceRole.entities.SimulationBetResult.get(existingResultId);
        if (existing?.checkpoint_data) {
          resumeFrom = JSON.parse(existing.checkpoint_data);
        }
      } catch { /* no checkpoint — start fresh */ }
    } else {
      // Create the result record so we can checkpoint into it
      const created = await base44.asServiceRole.entities.SimulationBetResult.create({
        job_id,
        module_id,
        bet_type: betType,
        bet_key: betKey,
        bet_label: betLabel ?? betKey,
        bet_group: betGroup ?? '',
        bet_index: betIndex ?? 0,
      });
      existingResultId = created.id;
    }

    // ── Decode bet params ─────────────────────────────────────
    const targetHandIdx   = betType === 'hand' ? parseInt(betKey) - 1 : -1;
    const targetRankCat   = betType === 'rank' ? (RANK_CAT_MAP[betKey] ?? -99) : -99;
    let colorThreshold = 0, colorIsRed = false;
    if (betType === 'color') {
      colorThreshold = parseInt(betKey[0]);
      colorIsRed = betKey[1] === 'R';
    }
    const lhLow = betType === 'lh' && betKey === 'LOW';

    let perHandRankHandIdx = -1, perHandRankCat = -99, perHandRankPayout = 0;
    if (betType === 'perHandRank') {
      const colonIdx = betKey.indexOf(':');
      const handId = parseInt(betKey.slice(0, colonIdx));
      const rankName = betKey.slice(colonIdx + 1);
      perHandRankHandIdx = handId - 1;
      perHandRankCat = RANK_CAT_MAP[rankName] ?? -99;
      const phr = perHandRankPayouts?.[handId] ?? perHandRankPayouts?.[String(handId)];
      perHandRankPayout = phr?.[rankName] ?? 0;
    }

    const isAdaptive = betType === 'perHandRank';
    const fixedRounds = isAdaptive ? ADAPTIVE_MAX_ROUNDS : rounds;
    const targetCardWins = isAdaptive ? rounds : 0;

    // ── Restore from checkpoint ───────────────────────────────
    let totalRounds           = resumeFrom?.totalRounds ?? 0;
    let totalWins             = resumeFrom?.totalWins ?? 0;
    let totalPaid             = resumeFrom?.totalPaid ?? 0;
    let totalCardedHandWins   = resumeFrom?.totalCardedHandWins ?? 0;
    let perHandRankHandWins   = resumeFrom?.perHandRankHandWins ?? 0;
    let totalLostToHouseWins  = resumeFrom?.totalLostToHouseWins ?? 0;
    const rankBreakdownCounts = new Int32Array(9);
    if (resumeFrom?.rankBreakdownCounts) {
      for (let i = 0; i < 9; i++) rankBreakdownCounts[i] = (resumeFrom.rankBreakdownCounts as unknown as number[])[i] ?? 0;
    }

    let lastCheckpointMilestone = isAdaptive ? perHandRankHandWins : totalRounds;
    const startMs = Date.now();
    let timedOut = false;
    let lastCheckpointAt = resumeFrom ? (isAdaptive ? perHandRankHandWins : totalRounds) : 0;

    // ── Simulation loop ───────────────────────────────────────
    while (totalRounds < fixedRounds) {
      // Time budget check — save checkpoint and return partial if running long
      if (totalRounds > 0 && totalRounds % 10_000 === 0) {
        if (Date.now() - startMs > MAX_RUN_MS) {
          timedOut = true;
          break;
        }
      }

      // Adaptive stop
      if (isAdaptive && perHandRankHandWins >= targetCardWins) break;

      const [b0, b1, b2, b3, b4] = shuffleAndDeal();
      const { strengths, bestRankCat, winners, winnerCount } = evalAllHands(b0, b1, b2, b3, b4);
      const isBoardWin = winnerCount === 10;

      let won = false;
      let profit = 0;

      if (betType === 'hand') {
        if (!isBoardWin && winners[targetHandIdx] === 1) {
          won = true;
          profit = BET * (handPayouts?.[targetHandIdx] ?? 0);
        }
      } else if (betType === 'perHandRank') {
        if (!isBoardWin && winners[perHandRankHandIdx] === 1) {
          perHandRankHandWins++;
          const myRankCat = rankCatFromStrength(strengths[perHandRankHandIdx]);
          if (myRankCat === perHandRankCat) {
            won = true;
            profit = BET * perHandRankPayout;
          }
        }
      } else if (betType === 'color') {
        let reds = 0;
        if ((b0&3)===1||(b0&3)===2) reds++;
        if ((b1&3)===1||(b1&3)===2) reds++;
        if ((b2&3)===1||(b2&3)===2) reds++;
        if ((b3&3)===1||(b3&3)===2) reds++;
        if ((b4&3)===1||(b4&3)===2) reds++;
        if ((colorIsRed ? reds : 5-reds) >= colorThreshold) {
          won = true;
          profit = BET * (colorPayouts?.[betKey] ?? 0);
        }
      } else if (betType === 'lh') {
        if (lhLow ? (b4>>2)<=5 : (b4>>2)>5) {
          won = true;
          profit = BET * (lhPayout ?? 0);
        }
      }

      if (won) {
        totalWins++;
        totalPaid += BET + profit;
        if (betType === 'hand') {
          const myRankCat = rankCatFromStrength(strengths[targetHandIdx]);
          if (myRankCat >= 0 && myRankCat <= 8) rankBreakdownCounts[myRankCat]++;
        }
      }
      if (betType === 'hand' && won) totalCardedHandWins++;
      if (isBoardWin && !won) totalLostToHouseWins++;

      totalRounds++;

      // ── Checkpoint every CHECKPOINT_INTERVAL ─────────────────
      const checkpointMetric = isAdaptive ? perHandRankHandWins : totalRounds;
      const checkpointMilestone = Math.floor(checkpointMetric / CHECKPOINT_INTERVAL) * CHECKPOINT_INTERVAL;
      if (checkpointMilestone > 0 && checkpointMilestone > lastCheckpointMilestone) {
        lastCheckpointMilestone = checkpointMilestone;
        lastCheckpointAt = checkpointMilestone;
        const checkpointData = {
          totalRounds, totalWins, totalPaid,
          totalCardedHandWins, perHandRankHandWins, totalLostToHouseWins,
          rankBreakdownCounts: Array.from(rankBreakdownCounts),
        };
        // Fire-and-forget checkpoint save
        base44.asServiceRole.entities.SimulationBetResult.update(existingResultId!, {
          checkpoint_data: JSON.stringify(checkpointData),
          checkpoint_at: lastCheckpointAt,
          actual_rounds: totalRounds,
          wins: totalWins,
        }).catch(() => {});
      }
    }

    // ── Compute final metrics ─────────────────────────────────
    const totalBet = totalRounds * BET;
    const condFreq = (isAdaptive && perHandRankHandWins > 0)
      ? totalWins / perHandRankHandWins : null;
    const winFreq = condFreq !== null ? condFreq
      : (totalRounds > 0 ? totalWins / totalRounds : 0);
    const effectiveRtp = condFreq !== null
      ? condFreq * (perHandRankPayout + 1)
      : (totalBet > 0 ? totalPaid / totalBet : 0);

    // Live odds for this bet type
    let liveOdds: number | null = null;
    if (betType === 'hand') liveOdds = handPayouts?.[targetHandIdx] ?? null;
    else if (betType === 'perHandRank') liveOdds = perHandRankPayout;
    else if (betType === 'color') liveOdds = colorPayouts?.[betKey] ?? null;
    else if (betType === 'lh') liveOdds = lhPayout ?? null;

    const fairOdds  = winFreq > 0 ? Math.round(((1/winFreq)-1)*100)/100 : null;
    const for95     = winFreq > 0 ? Math.round(((0.95/winFreq)-1)*100)/100 : null;
    const for965    = winFreq > 0 ? Math.round(((0.965/winFreq)-1)*100)/100 : null;
    const for98     = winFreq > 0 ? Math.round(((0.98/winFreq)-1)*100)/100 : null;

    const rtpPct = effectiveRtp * 100;
    const passed = rtpLow != null && rtpHigh != null
      ? (rtpPct >= rtpLow && rtpPct <= rtpHigh) : null;

    const isComplete = timedOut ? false
      : (isAdaptive ? perHandRankHandWins >= targetCardWins : totalRounds >= rounds);

    const rankBreakdown = betType === 'hand'
      ? RANK_NAMES.map((name, idx) => ({ rank: name, wins: rankBreakdownCounts[idx] }))
          .filter(r => r.wins > 0)
      : null;

    // ── Save final (or partial) result to DB ──────────────────
    const updatePayload: Record<string,unknown> = {
      actual_rounds: totalRounds,
      wins: totalWins,
      per_hand_rank_hand_wins: isAdaptive ? perHandRankHandWins : undefined,
      win_frequency: (winFreq * 100).toFixed(4),
      rtp: rtpPct.toFixed(4),
      house_edge: ((1 - effectiveRtp) * 100).toFixed(4),
      live_odds: liveOdds !== null ? String(liveOdds) : null,
      fair_odds: fairOdds !== null ? String(fairOdds) : null,
      for_965: for965 !== null ? String(for965) : null,
      for_95: for95 !== null ? String(for95) : null,
      for_98: for98 !== null ? String(for98) : null,
      passed: passed ?? false,
      rank_breakdown: rankBreakdown ? JSON.stringify(rankBreakdown) : null,
      // Clear checkpoint if complete, keep if partial/timed-out
      checkpoint_data: isComplete ? null : JSON.stringify({
        totalRounds, totalWins, totalPaid,
        totalCardedHandWins, perHandRankHandWins, totalLostToHouseWins,
        rankBreakdownCounts: Array.from(rankBreakdownCounts),
      }),
      checkpoint_at: isComplete ? null : lastCheckpointAt,
    };

    await base44.asServiceRole.entities.SimulationBetResult.update(existingResultId!, updatePayload);

    return Response.json({
      success: true,
      complete: isComplete,
      timed_out: timedOut,
      bet_result_id: existingResultId,
      betType, betKey,
      actualRounds: totalRounds,
      wins: totalWins,
      perHandRankHandWins: isAdaptive ? perHandRankHandWins : undefined,
      winFrequency: (winFreq * 100).toFixed(4),
      rtp: rtpPct.toFixed(4),
      houseEdge: ((1 - effectiveRtp) * 100).toFixed(4),
      liveOdds,
      fairOdds,
      for965,
      for95,
      for98,
      passed,
      rankBreakdown,
      // Progress info for UI
      progress: isAdaptive
        ? { done: perHandRankHandWins, total: targetCardWins }
        : { done: totalRounds, total: rounds },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});
