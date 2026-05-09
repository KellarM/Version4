// ============================================================
// AUDIT WEB WORKER — v11 (Adaptive Card Wins for perHandRank)
//
// ENGINE RULES:
//  • 32-card deck = 52 standard cards MINUS the 20 fixed player cards.
//  • Deal: Burn 1 → Flop (3) → Burn 1 → Turn (1) → Burn 1 → River (1)
//    Board positions in shuffled deck: [1,2,3,5,7]
//
//  HOUSE-BANKED GAME — STRICT WIN / TRUE TIE RULE:
//  • ALL 10 hands are evaluated using best5(2 hole + 5 board).
//  • "Best hand" = highest ABSOLUTE 5-CARD STRENGTH.
//  • Two hands are co-winners ONLY when strength scores are identical.
//
//  ADAPTIVE MODE (perHandRank bets only):
//  • Instead of fixed rounds, the simulation runs until the target card hand
//    wins the round N times (e.g. 100K card wins).
//  • RTP and Win % are calculated against those N card wins, not total rounds.
//
//  UNITY DATA BUFFER (Single Source of Truth):
//  • globalAuditBuffer stores boards from each RUN (up to 1M).
//  • CRITICAL: storeBoard() is called IMMEDIATELY after shuffleAndDeal(),
//    BEFORE any evaluation. Deal order is preserved in the buffer exactly.
//  • Every board has a sequenceId = bufferIndex + 1 (1-based).
//  • Microscope reads buffer[0..49] → sequenceId 1..50.
//  • Export starts at buffer[0] → Row 2 = sequenceId 1.
//  • sequenceId 1 in the Microscope UI === Row 2 of the Excel file, guaranteed.
//  • Buffer is explicitly cleared (null + size=0) before every new RUN.
// ============================================================

const RANK_LABELS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUIT_LABELS = ['clubs','diamonds','hearts','spades'];
const SUIT_SYMBOLS = { clubs:'♣', diamonds:'♦', hearts:'♥', spades:'♠' };
const SUIT_COLORS  = { clubs:'black', diamonds:'red', hearts:'red', spades:'black' };

function enc(rankLabel, suitLabel) {
  return RANK_LABELS.indexOf(rankLabel) * 4 + SUIT_LABELS.indexOf(suitLabel);
}

function decodeCard(c) {
  const rank = RANK_LABELS[c >> 2];
  const suit = SUIT_LABELS[c & 3];
  return { rank, suit, symbol: SUIT_SYMBOLS[suit], color: SUIT_COLORS[suit], label: rank + SUIT_SYMBOLS[suit] };
}

const HAND_LABELS = ['A♦10♥','K♣K♠','Q♣J♠','Q♠10♠','J♣9♣','8♦6♦','7♦7♠','4♥2♥','3♣3♥','A♥5♦'];

const HANDS = [
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

// 32-card dealer deck — built once, never mutated
const DECK32_MASTER = [];
for (let r = 0; r < 13; r++) {
  for (let s = 0; s < 4; s++) {
    const c = r * 4 + s;
    if (!PLAYER_SET.has(c)) DECK32_MASTER.push(c);
  }
}
Object.freeze(DECK32_MASTER);

let _workDeck = new Int16Array(32);

function shuffleAndDeal() {
  for (let i = 0; i < 32; i++) _workDeck[i] = DECK32_MASTER[i];
  for (let i = 31; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = _workDeck[i]; _workDeck[i] = _workDeck[j]; _workDeck[j] = tmp;
  }
  // Burn[0], Flop[1,2,3], Burn[4], Turn[5], Burn[6], River[7]
  return [_workDeck[1], _workDeck[2], _workDeck[3], _workDeck[5], _workDeck[7]];
}

// ── Hand evaluation ───────────────────────────────────────────
const RANK_NAMES = [
  'One Pair (no bet)','Two Pair','Three of a Kind','Straight','Flush',
  'Full House','Four of a Kind','Straight Flush (no bet)','Royal Flush',
];

const BASE = 14;
const B1 = BASE;
const B2 = BASE * BASE;
const B3 = BASE * BASE * BASE;
const B4 = BASE * BASE * BASE * BASE;
const B5 = BASE * BASE * BASE * BASE * BASE;

function eval5strength(c0, c1, c2, c3, c4) {
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

  const groups = [];
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

function rankCatFromStrength(s) {
  return Math.floor(s / B5) - 1;
}

function best7strength(h0, h1, b0, b1, b2, b3, b4) {
  const all = [h0, h1, b0, b1, b2, b3, b4];
  let best = -1;
  for (let i=0;i<3;i++) for (let j=i+1;j<4;j++) for (let k=j+1;k<5;k++)
    for (let l=k+1;l<6;l++) for (let m=l+1;m<7;m++) {
      const s = eval5strength(all[i],all[j],all[k],all[l],all[m]);
      if (s > best) best = s;
    }
  return best;
}

function evalAllHands(b0, b1, b2, b3, b4) {
  const strengths = new Float64Array(10);
  let bestStr = -1;
  for (let h=0; h<10; h++) {
    const s = best7strength(HANDS[h][0], HANDS[h][1], b0, b1, b2, b3, b4);
    strengths[h] = s;
    if (s > bestStr) bestStr = s;
  }
  const winners = new Uint8Array(10);
  let winnerCount = 0;
  for (let h=0; h<10; h++) {
    if (strengths[h] === bestStr) { winners[h] = 1; winnerCount++; }
  }
  const bestRankCat = rankCatFromStrength(bestStr);
  return { strengths, bestStr, bestRankCat, winners, winnerCount };
}

function buildWinnerLabel(winners) {
  const parts = [];
  for (let h=0; h<10; h++) { if (winners[h]) parts.push(HAND_LABELS[h]); }
  return parts.join(', ');
}

// ══════════════════════════════════════════════════════════════
// UNITY DATA BUFFER
// ══════════════════════════════════════════════════════════════
const BUFFER_CAP = 1_000_000;
let globalAuditBuffer = null;
let globalAuditBufferSize = 0;
let globalAuditBufferBetKey = null;

function flushBuffer() {
  globalAuditBuffer = null;
  globalAuditBufferSize = 0;
  globalAuditBufferBetKey = null;
}

function initBuffer(count) {
  flushBuffer();
  const cap = Math.min(count, BUFFER_CAP);
  globalAuditBuffer = new Uint8Array(cap * 5);
}

function storeBoard(idx, b0, b1, b2, b3, b4) {
  const offset = idx * 5;
  globalAuditBuffer[offset]   = b0;
  globalAuditBuffer[offset+1] = b1;
  globalAuditBuffer[offset+2] = b2;
  globalAuditBuffer[offset+3] = b3;
  globalAuditBuffer[offset+4] = b4;
}

function readBoard(idx) {
  const offset = idx * 5;
  return [
    globalAuditBuffer[offset],
    globalAuditBuffer[offset+1],
    globalAuditBuffer[offset+2],
    globalAuditBuffer[offset+3],
    globalAuditBuffer[offset+4],
  ];
}

function buildHandResult(sequenceId, b0, b1, b2, b3, b4) {
  const flop  = [decodeCard(b0), decodeCard(b1), decodeCard(b2)];
  const turn  = decodeCard(b3);
  const river = decodeCard(b4);

  const sequence = [
    { position: 'Flop 1', ...flop[0] },
    { position: 'Flop 2', ...flop[1] },
    { position: 'Flop 3', ...flop[2] },
    { position: 'Turn',   ...turn    },
    { position: 'River',  ...river   },
  ];

  let reds = 0;
  if ((b0&3)===1||(b0&3)===2) reds++;
  if ((b1&3)===1||(b1&3)===2) reds++;
  if ((b2&3)===1||(b2&3)===2) reds++;
  if ((b3&3)===1||(b3&3)===2) reds++;
  if ((b4&3)===1||(b4&3)===2) reds++;
  const blacks = 5 - reds;

  const colorWins = [];
  if (reds>=3) colorWins.push('3R');
  if (reds>=4) colorWins.push('4R');
  if (reds>=5) colorWins.push('5R');
  if (blacks>=3) colorWins.push('3B');
  if (blacks>=4) colorWins.push('4B');
  if (blacks>=5) colorWins.push('5B');

  const riverRankIdx = b4 >> 2;
  const isLow = riverRankIdx <= 5;
  const riverResult = isLow
    ? `LOW (${RANK_LABELS[riverRankIdx]})`
    : `HIGH (${RANK_LABELS[riverRankIdx]})`;

  return { sequenceId, flop, turn, river, sequence, reds, blacks, colorWins, isLow, riverResult };
}

function buildLogEntry(handResult, won, oddsUsed, targetHandIdx, evalResult) {
  const { strengths, bestStr, bestRankCat, winners, winnerCount } = evalResult;
  const winnerLabel = buildWinnerLabel(winners);
  const thisHandRankCat = targetHandIdx >= 0 ? rankCatFromStrength(strengths[targetHandIdx]) : null;
  const isInspectedHandWinner = targetHandIdx >= 0 && winners[targetHandIdx] === 1;

  return {
    sequenceId: handResult.sequenceId,
    round: handResult.sequenceId,
    won,
    oddsUsed,
    flop:     handResult.flop,
    turn:     handResult.turn,
    river:    handResult.river,
    sequence: handResult.sequence,
    holeCards: targetHandIdx >= 0
      ? [decodeCard(HANDS[targetHandIdx][0]), decodeCard(HANDS[targetHandIdx][1])]
      : null,
    winnerHandLabel: winnerLabel,
    winnerHandName:  winnerLabel,
    winnerHandIdx:   -1,
    winnerCount,
    bestRankIdx:  bestRankCat,
    bestRankName: bestRankCat >= 0 ? RANK_NAMES[bestRankCat] : 'High Card',
    thisHandRankIdx: thisHandRankCat,
    thisHandRank: thisHandRankCat !== null
      ? (thisHandRankCat >= 0 ? RANK_NAMES[thisHandRankCat] : 'High Card')
      : null,
    isInspectedHandWinner,
    colorWins:   handResult.colorWins,
    reds:        handResult.reds,
    blacks:      handResult.blacks,
    riverResult: handResult.riverResult,
  };
}

const RANK_CAT_MAP = {
  'High Card':-1,'One Pair':0,'Two Pair':1,'Three of a Kind':2,
  'Straight':3,'Flush':4,'Full House':5,'Four of a Kind':6,
  'Straight Flush':7,'Royal Flush':8,
};

function decodeBetParams(betType, betKey) {
  const targetHandIdx = betType === 'hand' ? parseInt(betKey) - 1 : -1;
  const targetRankCat = betType === 'rank' ? (RANK_CAT_MAP[betKey] ?? -99) : -99;
  let colorThreshold = 0, colorIsRed = false;
  if (betType === 'color') { colorThreshold = parseInt(betKey[0]); colorIsRed = betKey[1] === 'R'; }
  const lhLow = betType === 'lh' && betKey === 'LOW';

  let perHandRankHandIdx = -1, perHandRankCat = -99;
  if (betType === 'perHandRank') {
    const colonIdx = betKey.indexOf(':');
    const handId = parseInt(betKey.slice(0, colonIdx));
    const rankName = betKey.slice(colonIdx + 1);
    perHandRankHandIdx = handId - 1;
    perHandRankCat = RANK_CAT_MAP[rankName] ?? -99;
  }

  return { targetHandIdx, targetRankCat, colorThreshold, colorIsRed, lhLow, perHandRankHandIdx, perHandRankCat };
}

function evalWinFromBoard(b0, b1, b2, b3, b4, betType, betKey, params, handPayouts, rankPayouts, colorPayouts, lhPayout, perHandRankPayouts) {
  const { targetHandIdx, targetRankCat, colorThreshold, colorIsRed, lhLow, perHandRankHandIdx, perHandRankCat } = params;
  const evalResult = evalAllHands(b0, b1, b2, b3, b4);
  const { strengths, winners, winnerCount } = evalResult;
  const isBoardWinMic = winnerCount === 10;

  let won = false, oddsUsed = null;

  if (betType === 'hand') {
    oddsUsed = handPayouts[targetHandIdx];
    if (!isBoardWinMic && winners[targetHandIdx] === 1) won = true;
  } else if (betType === 'perHandRank') {
    // v2 rule: rank pays if ANY hand wins by the bet rank; odds = actual winner's per-hand rank odds
    const colonIdx = betKey.indexOf(':');
    const rankName = betKey.slice(colonIdx + 1);
    if (!isBoardWinMic) {
      for (let h = 0; h < 10; h++) {
        if (winners[h] === 1) {
          const winnerRankCat = rankCatFromStrength(strengths[h]);
          if (winnerRankCat === perHandRankCat) {
            won = true;
            // Odds = actual winning hand's per-hand rank payout
            oddsUsed = (perHandRankPayouts && perHandRankPayouts[h + 1]) ? perHandRankPayouts[h + 1][rankName] ?? null : null;
            break;
          }
        }
      }
    }
    if (!won) oddsUsed = (perHandRankPayouts && perHandRankPayouts[perHandRankHandIdx + 1]) ? perHandRankPayouts[perHandRankHandIdx + 1][rankName] ?? null : null;
  } else if (betType === 'rank') {
    oddsUsed = rankPayouts[betKey] ?? null;
    for (let h = 0; h < 10; h++) {
      if (winners[h] === 1) {
        const winnerRankCat = rankCatFromStrength(strengths[h]);
        if (winnerRankCat === targetRankCat) { won = true; break; }
      }
    }
  } else if (betType === 'color') {
    let reds = 0;
    if ((b0&3)===1||(b0&3)===2) reds++;
    if ((b1&3)===1||(b1&3)===2) reds++;
    if ((b2&3)===1||(b2&3)===2) reds++;
    if ((b3&3)===1||(b3&3)===2) reds++;
    if ((b4&3)===1||(b4&3)===2) reds++;
    oddsUsed = colorPayouts[betKey] ?? null;
    if ((colorIsRed ? reds : 5-reds) >= colorThreshold) won = true;
  } else if (betType === 'lh') {
    oddsUsed = lhPayout;
    if (lhLow ? (b4>>2)<=5 : (b4>>2)>5) won = true;
  }

  return { won, oddsUsed, evalResult };
}

function evalHandRankCat(handIdx, b0, b1, b2, b3, b4) {
  const s = best7strength(HANDS[handIdx][0], HANDS[handIdx][1], b0, b1, b2, b3, b4);
  return rankCatFromStrength(s);
}

// ── Main RUN handler ──────────────────────────────────────────
const PROGRESS_UPDATE_INTERVAL = 50_000;
const CHECKPOINT_INTERVAL = 20_000; // Save partial state every 20K rounds (or card wins in adaptive)
// Safety cap: never run more than 30M total rounds even in adaptive mode
const ADAPTIVE_MAX_ROUNDS = 30_000_000;

function handleRun(payload) {
  const {
    callId,
    rounds, betType, betKey,
    handPayouts, rankPayouts, colorPayouts, lhPayout, perHandRankPayouts,
    resumeFrom, // optional: { totalRounds, totalWins, totalPaid, totalCardedHandWins, totalRankNonExceptionWins, totalLostToHouseWins, perHandRankHandWins, rankBreakdownCounts }
  } = payload;

  // For perHandRank bets: `rounds` is the TARGET number of card-hand wins (adaptive mode).
  // For all other bet types: `rounds` is the fixed number of total rounds (unchanged).
  const isAdaptive = betType === 'perHandRank';

  const params = decodeBetParams(betType, betKey);
  const { targetHandIdx, targetRankCat, colorThreshold, colorIsRed, lhLow, perHandRankHandIdx, perHandRankCat } = params;
  const BET = 100;

  let perHandRankPayout = 0;
  if (isAdaptive) {
    const colonIdx = betKey.indexOf(':');
    const rankName = betKey.slice(colonIdx + 1);
    const phr = (perHandRankPayouts != null) ? perHandRankPayouts[perHandRankHandIdx + 1] : null;
    perHandRankPayout = (phr != null) ? (phr[rankName] ?? 0) : 0;
  }

  // Buffer: for adaptive mode we don't know final round count, so cap at BUFFER_CAP
  initBuffer(isAdaptive ? BUFFER_CAP : rounds);
  let bufferedCount = 0;

  // Resume from checkpoint if provided
  let totalRounds = resumeFrom?.totalRounds ?? 0;
  let totalWins = resumeFrom?.totalWins ?? 0;
  let totalPaid = resumeFrom?.totalPaid ?? 0;
  let totalCardedHandWins = resumeFrom?.totalCardedHandWins ?? 0;
  let totalRankNonExceptionWins = resumeFrom?.totalRankNonExceptionWins ?? 0;
  let totalLostToHouseWins = resumeFrom?.totalLostToHouseWins ?? 0;
  let perHandRankHandWins = resumeFrom?.perHandRankHandWins ?? 0;

  const rankBreakdownCounts = new Int32Array(9);
  if (resumeFrom?.rankBreakdownCounts) {
    for (let i = 0; i < 9; i++) rankBreakdownCounts[i] = resumeFrom.rankBreakdownCounts[i] ?? 0;
  }

  // Track last checkpoint milestone so we don't double-fire
  let lastCheckpointMilestone = isAdaptive ? perHandRankHandWins : totalRounds;

  // Determine loop termination:
  // - adaptive: stop when perHandRankHandWins reaches `rounds` (the target card wins)
  // - fixed: stop when totalRounds reaches `rounds`
  const targetCardWins = isAdaptive ? rounds : 0;
  const fixedRounds = isAdaptive ? ADAPTIVE_MAX_ROUNDS : rounds;

  while (totalRounds < fixedRounds) {
    // Progress reporting
    if (totalRounds > 0 && totalRounds % PROGRESS_UPDATE_INTERVAL === 0) {
      const done  = isAdaptive ? perHandRankHandWins : totalRounds;
      const total = isAdaptive ? targetCardWins : rounds;
      self.postMessage({ type: 'PROGRESS', callId, done, total });
    }

    // Checkpoint: save partial state every CHECKPOINT_INTERVAL rounds (or card wins)
    {
      const checkpointMetric = isAdaptive ? perHandRankHandWins : totalRounds;
      const checkpointMilestone = Math.floor(checkpointMetric / CHECKPOINT_INTERVAL) * CHECKPOINT_INTERVAL;
      if (checkpointMilestone > 0 && checkpointMilestone > lastCheckpointMilestone) {
        lastCheckpointMilestone = checkpointMilestone;
        self.postMessage({
          type: 'CHECKPOINT',
          callId,
          checkpointAt: checkpointMilestone,
          data: {
            totalRounds,
            totalWins,
            totalPaid,
            totalCardedHandWins,
            totalRankNonExceptionWins,
            totalLostToHouseWins,
            perHandRankHandWins,
            rankBreakdownCounts: Array.from(rankBreakdownCounts),
          },
        });
      }
    }

    const board = shuffleAndDeal();
    const [b0, b1, b2, b3, b4] = board;

    // Store to buffer (only up to BUFFER_CAP)
    if (bufferedCount < BUFFER_CAP) {
      storeBoard(bufferedCount, b0, b1, b2, b3, b4);
      bufferedCount++;
    }

    const { strengths, bestStr, bestRankCat, winners, winnerCount } = evalAllHands(b0, b1, b2, b3, b4);
    const isBoardWin = winnerCount === 10;

    let won = false, profit = 0;

    if (betType === 'hand') {
      if (!isBoardWin && winners[targetHandIdx] === 1) {
        won = true;
        profit = BET * handPayouts[targetHandIdx];
      }
    } else if (betType === 'perHandRank') {
      // v2 rule: rank pays if ANY hand wins by the bet rank; odds = actual winner's per-hand rank odds
      if (!isBoardWin) {
        for (let h = 0; h < 10; h++) {
          if (winners[h] === 1) {
            perHandRankHandWins++; // any hand won — track for denominator
            const winnerRankCat = rankCatFromStrength(strengths[h]);
            if (winnerRankCat === perHandRankCat) {
              won = true;
              // Use actual winning hand's payout
              const actualPhr = perHandRankPayouts ? perHandRankPayouts[h + 1] : null;
              profit = BET * (actualPhr ? (actualPhr[betKey.slice(betKey.indexOf(':')+1)] ?? perHandRankPayout) : perHandRankPayout);
            }
            break; // only one winner per round
          }
        }
      }
    } else if (betType === 'rank') {
      let rankWon = false;
      for (let h = 0; h < 10; h++) {
        if (winners[h] === 1) {
          const winnerRankCat = rankCatFromStrength(strengths[h]);
          if (winnerRankCat === targetRankCat) { rankWon = true; break; }
        }
      }
      if (rankWon) {
        won = true;
        profit = BET * (rankPayouts[betKey] ?? 0);
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
        profit = BET * (colorPayouts[betKey] ?? 0);
      }
    } else if (betType === 'lh') {
      const isLow = (b4 >> 2) <= 5;
      if (lhLow ? isLow : !isLow) {
        won = true;
        profit = BET * lhPayout;
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
    if (betType === 'rank' && won) {
      const isRankException = (bestRankCat === 0 || bestRankCat === 7 || bestRankCat === 8);
      if (!isRankException) totalRankNonExceptionWins++;
    }
    if (isBoardWin && !won) totalLostToHouseWins++;

    totalRounds++;

    // Adaptive stop: reached target card wins
    if (isAdaptive && perHandRankHandWins >= targetCardWins) break;
  }

  globalAuditBufferSize = bufferedCount;
  globalAuditBufferBetKey = `${betType}:${betKey}`;

  // ── Metrics ──
  // For perHandRank (adaptive): denominator for Win% and RTP is perHandRankHandWins (card wins),
  // not totalRounds. This is the statistically correct base.
  const totalBet = totalRounds * BET;

  const condFreq = (isAdaptive && perHandRankHandWins > 0)
    ? totalWins / perHandRankHandWins
    : null;

  const winFreq = condFreq !== null ? condFreq : (totalRounds > 0 ? totalWins / totalRounds : 0);
  const oddsFreq = winFreq;

  // RTP for perHandRank: P(rank win | card win) × (payout + 1)
  const effectiveRtp = condFreq !== null
    ? condFreq * (perHandRankPayout + 1)
    : (totalBet > 0 ? totalPaid / totalBet : 0);
  const effectiveHouseEdge = 1 - effectiveRtp;

  self.postMessage({
    type: 'RESULT',
    callId,
    data: {
      success: true,
      betType, betKey,
      actualRounds: totalRounds,
      wins: totalWins,
      perHandRankHandWins: isAdaptive ? perHandRankHandWins : undefined,
      winFrequency: (winFreq * 100).toFixed(4),
      rtp: (effectiveRtp * 100).toFixed(4),
      houseEdge: (effectiveHouseEdge * 100).toFixed(4),
      fairOdds: oddsFreq > 0 ? Math.round(((1/oddsFreq)-1)*100)/100 : null,
      for95:    oddsFreq > 0 ? Math.round(((0.95/oddsFreq)-1)*100)/100 : null,
      for965:   oddsFreq > 0 ? Math.round(((0.965/oddsFreq)-1)*100)/100 : null,
      for98:    oddsFreq > 0 ? Math.round(((0.98/oddsFreq)-1)*100)/100 : null,
      totalCardedHandWins,
      totalRankNonExceptionWins,
      totalLostToHouseWins,
      bufferSize: globalAuditBufferSize,
      bufferBetKey: globalAuditBufferBetKey,
      rankBreakdown: betType === 'hand'
        ? RANK_NAMES.map((name, idx) => ({ rank: name, wins: rankBreakdownCounts[idx] })).filter(r => r.wins > 0)
        : null,
    },
  });
}

// ── Microscope ────────────────────────────────────────────────
function handleMicroscope(payload) {
  const { callId, betType, betKey, handPayouts, rankPayouts, colorPayouts, lhPayout, perHandRankPayouts } = payload;
  const params = decodeBetParams(betType, betKey);

  const bufferMatchesBet = globalAuditBufferBetKey === `${betType}:${betKey}`;
  const count = (bufferMatchesBet && globalAuditBufferSize > 0) ? Math.min(50, globalAuditBufferSize) : 0;
  const log = [];

  if (count > 0) {
    for (let g = 0; g < count; g++) {
      const [b0, b1, b2, b3, b4] = readBoard(g);
      const handResult = buildHandResult(g + 1, b0, b1, b2, b3, b4);
      const { won, oddsUsed, evalResult } = evalWinFromBoard(
        b0, b1, b2, b3, b4, betType, betKey, params,
        handPayouts, rankPayouts, colorPayouts, lhPayout, perHandRankPayouts
      );
      const logHandIdx = betType === 'perHandRank' ? params.perHandRankHandIdx : params.targetHandIdx;
      log.push(buildLogEntry(handResult, won, oddsUsed, logHandIdx, evalResult));
    }
  } else {
    for (let g = 0; g < 50; g++) {
      const [b0, b1, b2, b3, b4] = shuffleAndDeal();
      const handResult = buildHandResult(g + 1, b0, b1, b2, b3, b4);
      const { won, oddsUsed, evalResult } = evalWinFromBoard(
        b0, b1, b2, b3, b4, betType, betKey, params,
        handPayouts, rankPayouts, colorPayouts, lhPayout, perHandRankPayouts
      );
      const logHandIdx = betType === 'perHandRank' ? params.perHandRankHandIdx : params.targetHandIdx;
      log.push(buildLogEntry(handResult, won, oddsUsed, logHandIdx, evalResult));
    }
  }

  const source = count > 0 ? 'buffer' : 'fallback';
  self.postMessage({
    type: 'MICROSCOPE_RESULT',
    callId,
    data: { success: true, verificationLog: log, source },
  });
}

// ── Export ────────────────────────────────────────────────────
const CSV_HEADER = 'Seq,Flop_C1_Rank,Flop_C1_Suit,Flop_C2_Rank,Flop_C2_Suit,Flop_C3_Rank,Flop_C3_Suit,Turn_C4_Rank,Turn_C4_Suit,River_C5_Rank,River_C5_Suit,Winning_Hand,Winning_Hand_2,Winning_Rank,Shared_Win,House_Win,Rank_Exception,3_Red,4_Red,5_Red,3_Black,4_Black,5_Black,Low,High,Audited_Bet_Won,Audited_Bet_Carded_Hand_Win,Audited_Bet_Rank_Non_Exception_Win,Audited_Bet_Lost_To_House_Win';
const EXPORT_CHUNK_SIZE = 10_000;
const EXPORT_PROGRESS_INTERVAL = 50_000;

function handleExport(payload) {
  const {
    callId,
    rows = 1_000_000,
    betType, betKey,
    handPayouts, rankPayouts, colorPayouts, lhPayout, perHandRankPayouts,
  } = payload;

  const bufferMatchesBet = globalAuditBufferBetKey === `${betType}:${betKey}`;
  const available = (bufferMatchesBet && globalAuditBufferSize > 0) ? globalAuditBufferSize : 0;
  const clamped = Math.min(Math.max(rows, 1), available > 0 ? available : rows, 1_000_000);
  const useBuffer = available > 0;

  self.postMessage({ type: 'EXPORT_CHUNK', callId, chunk: CSV_HEADER + '\n', done: 0, total: clamped });

  let rowsDone = 0;

  while (rowsDone < clamped) {
    const batch = Math.min(EXPORT_CHUNK_SIZE, clamped - rowsDone);
    let lines = '';

    for (let i = 0; i < batch; i++) {
      const bufIdx = rowsDone + i;
      let b0, b1, b2, b3, b4;

      if (useBuffer) {
        [b0, b1, b2, b3, b4] = readBoard(bufIdx);
      } else {
        [b0, b1, b2, b3, b4] = shuffleAndDeal();
      }

      const seqId = bufIdx + 1;

      const c0 = decodeCard(b0);
      const c1 = decodeCard(b1);
      const c2 = decodeCard(b2);
      const c3 = decodeCard(b3);
      const c4 = decodeCard(b4);

      const { bestRankCat, winners, winnerCount, strengths } = evalAllHands(b0, b1, b2, b3, b4);
      const isBoardWinExport = winnerCount === 10;

      const houseWin = isBoardWinExport ? 1 : 0;
      const sharedWin = (!isBoardWinExport && winnerCount > 1) ? 1 : 0;

      const winnerIndices = [];
      for (let h = 0; h < 10; h++) { if (winners[h] === 1) winnerIndices.push(h); }
      const winnerLabelRaw = isBoardWinExport ? 'House Win' : (winnerIndices.length > 0 ? HAND_LABELS[winnerIndices[0]] : 'None');
      const winnerLabel = `"${winnerLabelRaw}"`;
      const winnerLabel2Raw = (!isBoardWinExport && winnerIndices.length > 1) ? HAND_LABELS[winnerIndices[1]] : '';
      const winnerLabel2 = `"${winnerLabel2Raw}"`;

      const rankException = (bestRankCat === 0 || bestRankCat === 7 || bestRankCat === 8) ? 1 : 0;
      const rankName = bestRankCat >= 0 ? RANK_NAMES[bestRankCat] : 'High Card';

      let reds = 0;
      if ((b0&3)===1||(b0&3)===2) reds++;
      if ((b1&3)===1||(b1&3)===2) reds++;
      if ((b2&3)===1||(b2&3)===2) reds++;
      if ((b3&3)===1||(b3&3)===2) reds++;
      if ((b4&3)===1||(b4&3)===2) reds++;
      const blacks = 5 - reds;
      const isLow = (b4 >> 2) <= 5;

      const exportParams = decodeBetParams(betType, betKey);
      const { won: auditedBetWon } = evalWinFromBoard(
        b0, b1, b2, b3, b4, betType, betKey, exportParams,
        handPayouts, rankPayouts, colorPayouts, lhPayout, perHandRankPayouts
      );

      const auditedBetCardedHandWin = (betType === 'hand' && auditedBetWon) ? 1 : 0;
      const auditedBetRankNonExceptionWin = (betType === 'rank' && auditedBetWon && rankException === 0) ? 1 : 0;
      const auditedBetLostToHouseWin = (houseWin === 1 && !auditedBetWon) ? 1 : 0;

      lines += `${seqId},${c0.rank},${c0.suit},${c1.rank},${c1.suit},${c2.rank},${c2.suit},${c3.rank},${c3.suit},${c4.rank},${c4.suit},${winnerLabel},${winnerLabel2},${rankName},${sharedWin},${houseWin},${rankException},${reds>=3?1:0},${reds>=4?1:0},${reds>=5?1:0},${blacks>=3?1:0},${blacks>=4?1:0},${blacks>=5?1:0},${isLow?1:0},${isLow?0:1},${auditedBetWon?1:0},${auditedBetCardedHandWin},${auditedBetRankNonExceptionWin},${auditedBetLostToHouseWin}\n`;
    }

    rowsDone += batch;
    self.postMessage({ type: 'EXPORT_CHUNK', callId, chunk: lines, done: rowsDone, total: clamped });

    if (rowsDone % EXPORT_PROGRESS_INTERVAL === 0 || rowsDone === clamped) {
      self.postMessage({ type: 'PROGRESS', callId, done: rowsDone, total: clamped });
    }
  }

  self.postMessage({ type: 'EXPORT_DONE', callId, total: clamped });
}

// ── Message router ────────────────────────────────────────────
self.onmessage = function(e) {
  const { type, payload } = e.data;

  if (type === 'RUN_MICROSCOPE') {
    try { handleMicroscope(payload); }
    catch (err) { self.postMessage({ type: 'ERROR', callId: payload?.callId, message: err.message }); }
    return;
  }

  if (type === 'RUN_EXPORT') {
    try { handleExport(payload); }
    catch (err) { self.postMessage({ type: 'ERROR', callId: payload?.callId, message: err.message }); }
    return;
  }

  if (type === 'RUN') {
    try { handleRun(payload); }
    catch (err) {
      const msg = err?.message ?? String(err);
      console.error('[auditWorker] RUN error:', msg, 'betType:', payload?.betType, 'betKey:', payload?.betKey);
      self.postMessage({ type: 'ERROR', callId: payload?.callId, message: msg });
    }
    return;
  }
};