// ============================================================
// GAME STATS ENGINE — Pure local enumeration of all 201,376
// possible 5-card community deals from the 32-card deck.
//
// Uses the same absolute-strength evaluator as auditWorker/betAuditEngine:
//   score = (rankCat+1)*BASE^5 + kicker encoding
// True co-winner only when scores are mathematically equal.
// ============================================================

const RANK_LABELS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUIT_LABELS = ['clubs','diamonds','hearts','spades'];
const SUIT_SYMBOLS = { clubs:'♣', diamonds:'♦', hearts:'♥', spades:'♠' };
const SUIT_COLORS  = { clubs:'black', diamonds:'red', hearts:'red', spades:'black' };

function enc(rankLabel, suitLabel) {
  return RANK_LABELS.indexOf(rankLabel) * 4 + SUIT_LABELS.indexOf(suitLabel);
}

export function decodeCard(c) {
  const rank = RANK_LABELS[c >> 2];
  const suit = SUIT_LABELS[c & 3];
  return { rank, suit, symbol: SUIT_SYMBOLS[suit], color: SUIT_COLORS[suit] };
}

export const HAND_RANK_NAMES = [
  'Royal Flush','Straight Flush (no bet)','4 Of A Kind','Full House',
  'Flush','Straight','3 Of A Kind','2 Pair','1 Pair',
];

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

const PLAYER_CARD_SET = new Set(HANDS.flat());

const DECK32 = [];
for (let r = 0; r < 13; r++) {
  for (let s = 0; s < 4; s++) {
    const c = r * 4 + s;
    if (!PLAYER_CARD_SET.has(c)) DECK32.push(c);
  }
}

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

// Map strength rankCat (-1..8) to the RANK_COLS label used in GameStats tables
// rankCat: -1=High Card (impossible as a winning hand; never maps)
// 0=One Pair, 1=Two Pair, 2=Three of a Kind, 3=Straight, 4=Flush,
// 5=Full House, 6=Four of a Kind, 7=Straight Flush, 8=Royal Flush
const RANK_CAT_TO_LABEL = [
  '1 Pair', '2 Pair', '3 Of A Kind', 'Straight', 'Flush',
  'Full House', '4 Of A Kind', 'Straight Flush', 'Royal Flush',
];

function best7strength(h0, h1, c0, c1, c2, c3, c4) {
  const all = [h0, h1, c0, c1, c2, c3, c4];
  let best = -1;
  for (let i=0;i<3;i++) for (let j=i+1;j<4;j++) for (let k=j+1;k<5;k++)
    for (let l=k+1;l<6;l++) for (let m=l+1;m<7;m++) {
      const s = eval5strength(all[i],all[j],all[k],all[l],all[m]);
      if (s > best) best = s;
    }
  return best;
}

// ── Enumerate one batch of combinations ────────────────────────────────────
// comboIndex: index into C(32,5) = 201,376 combinations
// Returns { tally, rows, batchEnd }
//
// The outer 5-nested-loops enumerate C(32,5) in lexicographic order.
// We skip the first `batchStart` combos and process up to `batchSize`.

export function computeBatch(batchStart, batchSize) {
  const N = DECK32.length; // 32
  const tally = {
    handRankMatrix:  Array.from({length:10}, ()=> Object.fromEntries(RANK_CAT_TO_LABEL.map(k=>[k,0]))),
    handColorMatrix: Array.from({length:10}, ()=> ({ '3R':0,'4R':0,'5R':0,'3B':0,'4B':0,'5B':0 })),
    handWinCount:    new Array(10).fill(0),
    rankTotals:      Object.fromEntries(RANK_CAT_TO_LABEL.map(k=>[k,0])),
    colorTotals:     { '3R':0,'4R':0,'5R':0,'3B':0,'4B':0,'5B':0 },
  };
  const rows = [];

  let dealIndex = 0;
  let processed = 0;
  const batchEnd = batchStart + batchSize;

  outer:
  for (let i=0;i<N-4;i++) {
    for (let j=i+1;j<N-3;j++) {
      for (let k=j+1;k<N-2;k++) {
        for (let l=k+1;l<N-1;l++) {
          for (let m=l+1;m<N;m++) {
            if (dealIndex < batchStart) { dealIndex++; continue; }
            if (dealIndex >= batchEnd) break outer;

            const c0=DECK32[i], c1=DECK32[j], c2=DECK32[k], c3=DECK32[l], c4=DECK32[m];

            // Evaluate all 10 hands
            const strengths = new Float64Array(10);
            let bestStr = -1;
            for (let h=0;h<10;h++) {
              const s = best7strength(HANDS[h][0], HANDS[h][1], c0, c1, c2, c3, c4);
              strengths[h] = s;
              if (s > bestStr) bestStr = s;
            }

            // True co-winners = all hands sharing the best strength score
            const bestRankCat = rankCatFromStrength(bestStr);
            const rankLabel = RANK_CAT_TO_LABEL[bestRankCat] ?? '1 Pair';

            // Color count
            let reds = 0;
            for (const card of [c0,c1,c2,c3,c4]) {
              const s = card & 3;
              if (s===1 || s===2) reds++;
            }
            const blacks = 5 - reds;
            const colorWins = [];
            if (reds>=3) colorWins.push('3R');
            if (reds>=4) colorWins.push('4R');
            if (reds>=5) colorWins.push('5R');
            if (blacks>=3) colorWins.push('3B');
            if (blacks>=4) colorWins.push('4B');
            if (blacks>=5) colorWins.push('5B');

            // Update tallies for each winner
            const winnerIds = [];
            for (let h=0;h<10;h++) {
              if (strengths[h] === bestStr) {
                tally.handWinCount[h]++;
                tally.handRankMatrix[h][rankLabel]++;
                colorWins.forEach(k => { tally.handColorMatrix[h][k]++; });
                winnerIds.push(h);
              }
            }
            tally.rankTotals[rankLabel]++;
            colorWins.forEach(k => { tally.colorTotals[k]++; });

            // Build row for Excel export
            const winningHandLabel = winnerIds.map(h => {
              const labels = ['A / 10','A / 5','K / K','Q / J','Q / 10','J / 9','8 / 6','7 / 7','4 / 2','3 / 3'];
              const ids = ['A','B','C','D','E','F','G','H','I','J'];
              return `${ids[h]}(${labels[h]})`;
            }).join(', ');

            const cd0=decodeCard(c0), cd1=decodeCard(c1), cd2=decodeCard(c2), cd3=decodeCard(c3), cd4=decodeCard(c4);
            const row = {
              c1r:cd0.rank, c1s:cd0.suit, c2r:cd1.rank, c2s:cd1.suit,
              c3r:cd2.rank, c3s:cd2.suit, c4r:cd3.rank, c4s:cd3.suit,
              c5r:cd4.rank, c5s:cd4.suit,
              winningHand: winningHandLabel,
              handRank: rankLabel,
              'ALL HANDS': winnerIds.length,
            };
            colorWins.forEach(k => { row[k] = 1; });
            const handIds   = ['A','B','C','D','E','F','G','H','I','J'];
            const handLabels = ['A / 10','A / 5','K / K','Q / J','Q / 10','J / 9','8 / 6','7 / 7','4 / 2','3 / 3'];
            winnerIds.forEach(h => { row[`${handIds[h]}(${handLabels[h]})`] = 1; });
            rows.push(row);

            dealIndex++;
            processed++;
          }
        }
      }
    }
  }

  return { tally, rows, batchEnd: batchStart + processed, processed };
}