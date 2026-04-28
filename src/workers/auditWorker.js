// ============================================================
// AUDIT WEB WORKER — v10 (Unity Buffer + Sequence IDs)
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
//
// Layout: Uint8Array, 5 bytes per board.
//   offset+0 = b0 (Flop card 1, index 0)
//   offset+1 = b1 (Flop card 2, index 1)
//   offset+2 = b2 (Flop card 3, index 2)
//   offset+3 = b3 (Turn card,   index 3)
//   offset+4 = b4 (River card,  index 4)
//
// sequenceId = bufferIndex + 1 (1-based, never reordered).
// Microscope: reads indices 0..49 → sequenceId 1..50.
// Export: reads indices 0..N-1 → Row 2..N+1 in Excel.
// Both sources use identical index → card mapping.
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
  // Explicit flush before allocating — guarantees no stale data
  flushBuffer();
  const cap = Math.min(count, BUFFER_CAP);
  globalAuditBuffer = new Uint8Array(cap * 5);
}

function storeBoard(idx, b0, b1, b2, b3, b4) {
  // Called IMMEDIATELY after shuffleAndDeal(), BEFORE any evaluation.
  // Index order matches deal order — sequenceId = idx + 1.
  const offset = idx * 5;
  globalAuditBuffer[offset]   = b0;  // flop[0]
  globalAuditBuffer[offset+1] = b1;  // flop[1]
  globalAuditBuffer[offset+2] = b2;  // flop[2]
  globalAuditBuffer[offset+3] = b3;  // turn
  globalAuditBuffer[offset+4] = b4;  // river
}

function readBoard(idx) {
  const offset = idx * 5;
  return [
    globalAuditBuffer[offset],   // flop[0]
    globalAuditBuffer[offset+1], // flop[1]
    globalAuditBuffer[offset+2], // flop[2]
    globalAuditBuffer[offset+3], // turn
    globalAuditBuffer[offset+4], // river
  ];
}

// ── Standard HandResult object ────────────────────────────────
// Both Microscope and Export derive data from this same structure.
// flop[0] = Flop_C1, flop[1] = Flop_C2, flop[2] = Flop_C3
// turn    = Turn_C4
// river   = River_C5
function buildHandResult(sequenceId, b0, b1, b2, b3, b4) {
  const flop  = [decodeCard(b0), decodeCard(b1), decodeCard(b2)];
  const turn  = decodeCard(b3);
  const river = decodeCard(b4);

  // sequence is derived from flop/turn/river — not an independent source
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

// ── Build a log entry for the Microscope ─────────────────────
function buildLogEntry(handResult, won, oddsUsed, targetHandIdx, evalResult) {
  const { strengths, bestStr, bestRankCat, winners, winnerCount } = evalResult;
  const winnerLabel = buildWinnerLabel(winners);
  const thisHandRankCat = targetHandIdx >= 0 ? rankCatFromStrength(strengths[targetHandIdx]) : null;
  const isInspectedHandWinner = targetHandIdx >= 0 && winners[targetHandIdx] === 1;

  return {
    // Primary key — strict ascending, 1-based
    sequenceId: handResult.sequenceId,
    round: handResult.sequenceId, // alias kept for backward compatibility

    won,
    oddsUsed,

    // Canonical card structure — Microscope and Export reference identical indices
    flop:     handResult.flop,    // flop[0]=C1, flop[1]=C2, flop[2]=C3
    turn:     handResult.turn,    // C4
    river:    handResult.river,   // C5
    sequence: handResult.sequence, // derived view: [flop[0], flop[1], flop[2], turn, river]

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

// ── Decode bet parameters ─────────────────────────────────────
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
  return { targetHandIdx, targetRankCat, colorThreshold, colorIsRed, lhLow };
}

function evalWinFromBoard(b0, b1, b2, b3, b4, betType, betKey, params, handPayouts, rankPayouts, colorPayouts, lhPayout) {
  const { targetHandIdx, targetRankCat, colorThreshold, colorIsRed, lhLow } = params;
  const evalResult = evalAllHands(b0, b1, b2, b3, b4);
  const { strengths, winners, winnerCount } = evalResult;
  const isBoardWinMic = winnerCount === 10;

  let won = false, oddsUsed = null;

  if (betType === 'hand') {
    oddsUsed = handPayouts[targetHandIdx];
    if (!isBoardWinMic && winners[targetHandIdx] === 1) won = true;
  } else if (betType === 'rank') {
    // CORRECT RULE: rank bet wins only when the winning hand's rank matches.
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

// ── Evaluate the rank of a specific hand (by index) against the board ──
function evalHandRankCat(handIdx, b0, b1, b2, b3, b4) {
  const s = best7strength(HANDS[handIdx][0], HANDS[handIdx][1], b0, b1, b2, b3, b4);
  return rankCatFromStrength(s);
}

// ── Main RUN handler ──────────────────────────────────────────
const PROGRESS_UPDATE_INTERVAL = 50_000;

function handleRun(payload) {
  const {
    callId,
    rounds, betType, betKey,
    handPayouts, rankPayouts, colorPayouts, lhPayout,
  } = payload;

  const params = decodeBetParams(betType, betKey);
  const { targetHandIdx, targetRankCat, colorThreshold, colorIsRed, lhLow } = params;
  const BET = 100;

  // EXPLICIT BUFFER FLUSH — clear before allocating new buffer
  initBuffer(rounds);
  const bufCap = Math.min(rounds, BUFFER_CAP);

  let totalWins = 0, totalPaid = 0;

  for (let g = 0; g < rounds; g++) {
    if (g > 0 && g % PROGRESS_UPDATE_INTERVAL === 0) {
      self.postMessage({ type: 'PROGRESS', callId, done: g, total: rounds });
    }

    // Step 1: Deal (shuffle + extract board)
    const board = shuffleAndDeal();
    const [b0, b1, b2, b3, b4] = board;

    // Step 2: Store to buffer IMMEDIATELY after deal, BEFORE evaluation.
    // This preserves the deal order as the canonical sequence.
    if (g < bufCap) {
      storeBoard(g, b0, b1, b2, b3, b4);
    }

    // Step 3: Evaluate
    const { strengths, bestStr, bestRankCat, winners, winnerCount } = evalAllHands(b0, b1, b2, b3, b4);

    // Community Board Win: all 10 hands show as winners → house collects all hand bets.
    // Rank, Color, and River side bets still resolve normally.
    const isBoardWin = winnerCount === 10;

    let won = false, profit = 0;

    if (betType === 'hand') {
      // Hand bet only wins if this specific hand won AND it is NOT a board win
      if (!isBoardWin && winners[targetHandIdx] === 1) {
        won = true;
        profit = BET * handPayouts[targetHandIdx];
      }
    } else if (betType === 'rank') {
      // CORRECT RULE: Rank bet wins ONLY when the winning hand's rank matches.
      // A rank achieved by a NON-WINNING hand does not count.
      // Board wins are not excluded here — rank/color/river still pay on board wins.
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

    if (won) { totalWins++; totalPaid += BET + profit; }
  }

  globalAuditBufferSize = bufCap;
  globalAuditBufferBetKey = `${betType}:${betKey}`;

  const totalBet = rounds * BET;
  const winFreq = totalWins / rounds;
  const rtp = totalBet > 0 ? totalPaid / totalBet : 0;
  const houseEdge = 1 - rtp;

  self.postMessage({
    type: 'RESULT',
    callId,
    data: {
      success: true,
      betType, betKey,
      actualRounds: rounds,
      wins: totalWins,
      winFrequency: (winFreq * 100).toFixed(4),
      rtp: (rtp * 100).toFixed(4),
      houseEdge: (houseEdge * 100).toFixed(4),
      fairOdds: winFreq > 0 ? Math.round(((1/winFreq)-1)*100)/100 : null,
      for95:    winFreq > 0 ? Math.round(((0.95/winFreq)-1)*100)/100 : null,
      for965:   winFreq > 0 ? Math.round(((0.965/winFreq)-1)*100)/100 : null,
      for98:    winFreq > 0 ? Math.round(((0.98/winFreq)-1)*100)/100 : null,
      bufferSize: globalAuditBufferSize,
      bufferBetKey: globalAuditBufferBetKey,
    },
  });
}

// ── Microscope ────────────────────────────────────────────────
// Reads buffer[0..49] (sequenceId 1..50) when buffer matches this bet.
// Falls back to 50 fresh hands only if no matching buffer exists.
// NEVER re-sorts — data is emitted in strict ascending sequenceId order.
function handleMicroscope(payload) {
  const { callId, betType, betKey, handPayouts, rankPayouts, colorPayouts, lhPayout } = payload;
  const params = decodeBetParams(betType, betKey);

  const bufferMatchesBet = globalAuditBufferBetKey === `${betType}:${betKey}`;
  const count = (bufferMatchesBet && globalAuditBufferSize > 0) ? Math.min(50, globalAuditBufferSize) : 0;
  const log = [];

  if (count > 0) {
    // Read from buffer — sequenceId = bufferIndex + 1, ascending order guaranteed
    for (let g = 0; g < count; g++) {
      const [b0, b1, b2, b3, b4] = readBoard(g);
      const handResult = buildHandResult(g + 1, b0, b1, b2, b3, b4);
      const { won, oddsUsed, evalResult } = evalWinFromBoard(
        b0, b1, b2, b3, b4, betType, betKey, params,
        handPayouts, rankPayouts, colorPayouts, lhPayout
      );
      log.push(buildLogEntry(handResult, won, oddsUsed, params.targetHandIdx, evalResult));
    }
  } else {
    // Fallback — generate 50 fresh hands, sequenceId 1..50
    for (let g = 0; g < 50; g++) {
      const [b0, b1, b2, b3, b4] = shuffleAndDeal();
      const handResult = buildHandResult(g + 1, b0, b1, b2, b3, b4);
      const { won, oddsUsed, evalResult } = evalWinFromBoard(
        b0, b1, b2, b3, b4, betType, betKey, params,
        handPayouts, rankPayouts, colorPayouts, lhPayout
      );
      log.push(buildLogEntry(handResult, won, oddsUsed, params.targetHandIdx, evalResult));
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
// Streams CSV from buffer starting at index 0 (sequenceId 1).
// Column 1 = Seq (sequenceId), then the 19 board/outcome columns.
// Guaranteed: Row 2 in Excel = sequenceId 1 = Microscope row 1.
// NEVER re-sorts. Data order is deal order, no exceptions.
const CSV_HEADER = 'Seq,Flop_C1_Rank,Flop_C1_Suit,Flop_C2_Rank,Flop_C2_Suit,Flop_C3_Rank,Flop_C3_Suit,Turn_C4_Rank,Turn_C4_Suit,River_C5_Rank,River_C5_Suit,Winning_Hand,Winning_Hand_2,Winning_Rank,Shared_Win,House_Win,Rank_Exception,3_Red,4_Red,5_Red,3_Black,4_Black,5_Black,Low,High';
const EXPORT_CHUNK_SIZE = 10_000;
const EXPORT_PROGRESS_INTERVAL = 50_000;

function handleExport(payload) {
  const {
    callId,
    rows = 1_000_000,
    betType, betKey,
    handPayouts, rankPayouts, colorPayouts, lhPayout,
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
      // bufferIndex = rowsDone + i, sequenceId = bufferIndex + 1
      // Export starts at bufferIndex 0 → sequenceId 1 → Excel Row 2
      const bufIdx = rowsDone + i;
      let b0, b1, b2, b3, b4;

      if (useBuffer) {
        [b0, b1, b2, b3, b4] = readBoard(bufIdx);
      } else {
        [b0, b1, b2, b3, b4] = shuffleAndDeal();
      }

      const seqId = bufIdx + 1;

      // Card values — read from same indices as Microscope's flop/turn/river
      // flop[0]=b0, flop[1]=b1, flop[2]=b2, turn=b3, river=b4
      const c0 = decodeCard(b0); // Flop_C1 (matches handResult.flop[0])
      const c1 = decodeCard(b1); // Flop_C2 (matches handResult.flop[1])
      const c2 = decodeCard(b2); // Flop_C3 (matches handResult.flop[2])
      const c3 = decodeCard(b3); // Turn_C4 (matches handResult.turn)
      const c4 = decodeCard(b4); // River_C5 (matches handResult.river)

      const { bestRankCat, winners, winnerCount, strengths } = evalAllHands(b0, b1, b2, b3, b4);
      const isBoardWinExport = winnerCount === 10;

      // House_Win: community board beats all player hands (winnerCount === 10)
      const houseWin = isBoardWinExport ? 1 : 0;

      // Shared_Win: more than one hand tied for the win (but not a board win)
      const sharedWin = (!isBoardWinExport && winnerCount > 1) ? 1 : 0;

      // Winning_Hand (first winner label) and Winning_Hand_2 (second winner if shared)
      const winnerIndices = [];
      for (let h = 0; h < 10; h++) { if (winners[h] === 1) winnerIndices.push(h); }
      const winnerLabelRaw = isBoardWinExport ? 'House Win' : (winnerIndices.length > 0 ? HAND_LABELS[winnerIndices[0]] : 'None');
      const winnerLabel = `"${winnerLabelRaw}"`;
      const winnerLabel2Raw = (!isBoardWinExport && winnerIndices.length > 1) ? HAND_LABELS[winnerIndices[1]] : '';
      const winnerLabel2 = `"${winnerLabel2Raw}"`;

      // Rank_Exception: winning rank is One Pair (rank cat 0), Straight Flush (rank cat 7), or Royal Flush (rank cat 8)
      // When true, no rank bets pay out
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

      lines += `${seqId},${c0.rank},${c0.suit},${c1.rank},${c1.suit},${c2.rank},${c2.suit},${c3.rank},${c3.suit},${c4.rank},${c4.suit},${winnerLabel},${winnerLabel2},${rankName},${sharedWin},${houseWin},${rankException},${reds>=3?1:0},${reds>=4?1:0},${reds>=5?1:0},${blacks>=3?1:0},${blacks>=4?1:0},${blacks>=5?1:0},${isLow?1:0},${isLow?0:1}\n`;
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
    catch (err) { self.postMessage({ type: 'ERROR', callId: payload?.callId, message: err.message }); }
    return;
  }
};