// ============================================================
// BET AUDIT ENGINE — Strict 5-Card Absolute Strength
// 52-card deck minus 20 fixed player cards = 32-card dealer deck.
//
// HOUSE-BANKED GAME — STRICT WIN / TRUE TIE RULE:
// A "co-winner" is ONLY declared when two hands produce
// mathematically identical 5-card strength scores (rank + kickers).
// Two Full Houses of different values are NOT co-winners.
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

export const RANK_NAMES = [
  'One Pair (no bet)','Two Pair','Three of a Kind','Straight','Flush',
  'Full House','Four of a Kind','Straight Flush (no bet)','Royal Flush',
];

// rankCat: -1=High Card, 0..8 matching RANK_NAMES above

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

const PLAYER_CARD_SET = new Set(HANDS.flat());

const DECK32 = [];
for (let r = 0; r < 13; r++) {
  for (let s = 0; s < 4; s++) {
    const c = r * 4 + s;
    if (!PLAYER_CARD_SET.has(c)) DECK32.push(c);
  }
}

// ── Strength encoding constants ──────────────────────────────
// Score = (rankCat+1)*B5 + k0*B4 + k1*B3 + k2*B2 + k3*B1 + k4
// BASE=14 (rank values 0-12, fits in one digit each)
const BASE = 14;
const B1 = BASE;
const B2 = BASE * BASE;
const B3 = BASE * BASE * BASE;
const B4 = BASE * BASE * BASE * BASE;
const B5 = BASE * BASE * BASE * BASE * BASE;

// ── Full-strength 5-card evaluator ───────────────────────────
// Returns a single number: higher = absolutely stronger hand.
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

// ── Best strength from 7 cards (21 combos) ───────────────────
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

// ── Multi-winner with absolute strength ──────────────────────
function evalAllHands(c0, c1, c2, c3, c4) {
  const strengths = new Float64Array(10);
  let bestStr = -1;
  for (let h=0; h<10; h++) {
    const s = best7strength(HANDS[h][0], HANDS[h][1], c0, c1, c2, c3, c4);
    strengths[h] = s;
    if (s > bestStr) bestStr = s;
  }
  const winners = new Array(10).fill(0);
  let winnerCount = 0;
  for (let h=0; h<10; h++) {
    if (strengths[h] === bestStr) { winners[h] = 1; winnerCount++; }
  }
  const bestRankCat = rankCatFromStrength(bestStr);
  return { strengths, bestStr, bestRankCat, winners, winnerCount };
}

function buildWinnerLabel(winners) {
  const parts = [];
  for (let h=0; h<10; h++) {
    if (winners[h]) parts.push(HAND_LABELS[h]);
  }
  return parts.join(', ');
}

// ── Shuffle working copy of deck ──────────────────────────────
// Crypto-grade RNG
function _secureRandInt(max){if(max===0)return 0;let mask=1;while(mask<=max)mask=(mask<<1)|1;const arr=new Uint32Array(1);let val;do{if(typeof crypto!=='undefined'&&crypto.getRandomValues){crypto.getRandomValues(arr);val=arr[0]&mask;}else{return Math.floor(Math.random()*(max+1));}}while(val>max);return val;}

const deck = [...DECK32];
function shuffle() {
  for (let i = deck.length-1; i > 0; i--) {
    const j = _secureRandInt(i);
    [deck[i],deck[j]] = [deck[j],deck[i]];
  }
}

const MAX_ROUNDS_PER_CHUNK = 500_000;
const LOG_SIZE = 50;

const RANK_CAT_MAP = {
  'High Card': -1, 'One Pair': 0, 'Two Pair': 1, 'Three of a Kind': 2,
  'Straight': 3, 'Flush': 4, 'Full House': 5, 'Four of a Kind': 6,
  'Straight Flush': 7, 'Royal Flush': 8,
};

export function runBetAudit({
  rounds,
  betType,
  betKey,
  handPayouts,
  rankPayouts,
  colorPayouts,
  lhPayout,
  captureLog = false,
}) {
  const BET = 100;
  const actualRounds = Math.min(rounds, MAX_ROUNDS_PER_CHUNK);

  const targetHandIdx  = betType === 'hand' ? parseInt(betKey) - 1 : -1;
  const targetRankCat  = betType === 'rank' ? (RANK_CAT_MAP[betKey] ?? -99) : -99;

  let colorCount = 0, colorIsRed = false;
  if (betType === 'color') {
    colorCount = parseInt(betKey[0]);
    colorIsRed = betKey[1] === 'R';
  }

  const lhLow = betType === 'lh' && betKey === 'LOW';

  let wins = 0, totalPaid = 0;
  const verificationLog = [];

  for (let g = 0; g < actualRounds; g++) {
    shuffle();
    const [c0,c1,c2,c3,c4] = deck;

    const { strengths, bestStr, bestRankCat, winners, winnerCount } = evalAllHands(c0, c1, c2, c3, c4);

    let won = false, profit = 0, winType = '', oddsUsed = null;
    let handRankAchieved = '';

    if (betType === 'hand') {
      const myRankCat = rankCatFromStrength(strengths[targetHandIdx]);
      handRankAchieved = myRankCat >= 0 ? (RANK_NAMES[myRankCat] || 'High Card') : 'High Card';
      if (winners[targetHandIdx] === 1) {
        won = true;
        oddsUsed = handPayouts[targetHandIdx];
        profit = BET * oddsUsed;
        winType = 'Hand Win';
      }

    } else if (betType === 'rank') {
      handRankAchieved = bestRankCat >= 0 ? (RANK_NAMES[bestRankCat] || 'Unknown') : 'No qualifying hand';
      oddsUsed = rankPayouts[betKey] ?? null;
      if (bestRankCat === targetRankCat) {
        won = true;
        profit = BET * (oddsUsed ?? 0);
        winType = 'Rank Match';
      }

    } else if (betType === 'color') {
      let reds = 0;
      for (const card of [c0,c1,c2,c3,c4]) {
        const s = card & 3;
        if (s===1 || s===2) reds++;
      }
      const colorCount5 = colorIsRed ? reds : (5-reds);
      oddsUsed = colorPayouts[betKey] ?? null;
      if (colorCount5 >= colorCount) {
        won = true;
        profit = BET * (oddsUsed ?? 0);
        winType = 'Color Board Win';
      }

    } else if (betType === 'lh') {
      const riverRank = c4 >> 2;
      const isLow = riverRank <= 5;
      oddsUsed = lhPayout;
      if (lhLow ? isLow : !isLow) {
        won = true;
        profit = BET * oddsUsed;
        winType = 'River Win';
      }
    }

    if (won) { wins++; totalPaid += BET + profit; }

    if (captureLog && g < LOG_SIZE) {
      const community = [c0,c1,c2,c3,c4].map((card, i) => ({
        position: ['Flop 1','Flop 2','Flop 3','Turn','River'][i],
        ...decodeCard(card),
      }));

      const handCards = (betType==='hand' && targetHandIdx>=0)
        ? HANDS[targetHandIdx].map(c => decodeCard(c))
        : null;

      const winnerLabel = buildWinnerLabel(winners);
      const returnAmt = won ? parseFloat((BET + profit).toFixed(2)) : 0;
      const mathExpression = won
        ? `$${BET} × (1 + ${oddsUsed}) = $${returnAmt} returned`
        : `$${BET} × 0 = $0.00 (no win)`;

      verificationLog.push({
        round: g+1,
        won,
        winType: won ? winType : 'No Win',
        community,
        handCards,
        handRankAchieved: handRankAchieved || null,
        winnerHandLabel: winnerLabel,
        winnerHandName: winnerLabel,
        winnerCount,
        bestRankIdx: bestRankCat,
        bestRankName: bestRankCat >= 0 ? (RANK_NAMES[bestRankCat] || 'High Card') : 'High Card',
        isInspectedHandWinner: targetHandIdx >= 0 && winners[targetHandIdx] === 1,
        oddsUsed,
        betAmount: BET,
        payoutAmount: returnAmt,
        netResult: won ? parseFloat(profit.toFixed(2)) : -BET,
        mathExpression,
      });
    }
  }

  const totalBet = actualRounds * BET;
  const winFrequency = wins / actualRounds;
  const rtp = totalBet > 0 ? totalPaid / totalBet : 0;
  const fairOdds = winFrequency > 0 ? Math.round(((1/winFrequency)-1)*100)/100 : null;
  const for965   = winFrequency > 0 ? Math.round(((0.965/winFrequency)-1)*100)/100 : null;
  const for95    = winFrequency > 0 ? Math.round(((0.95/winFrequency)-1)*100)/100 : null;
  const for98    = winFrequency > 0 ? Math.round(((0.98/winFrequency)-1)*100)/100 : null;

  return {
    success: true,
    betType, betKey,
    actualRounds,
    wins,
    winFrequency: (winFrequency*100).toFixed(4),
    rtp: (rtp*100).toFixed(4),
    fairOdds, for95, for965, for98,
    verificationLog,
  };
}

export async function runBetAuditAsync(params, onProgress) {
  const CHUNK = 50_000;
  const total = params.rounds;
  let wins = 0;
  let totalPaid = 0;
  let firstLog = null;
  let chunksRun = 0;
  const chunks = Math.ceil(total / CHUNK);

  for (let i = 0; i < chunks; i++) {
    const chunkRounds = Math.min(CHUNK, total - i * CHUNK);
    const isFirst = i === 0;

    const result = runBetAudit({
      ...params,
      rounds: chunkRounds,
      captureLog: isFirst && params.captureLog,
    });

    wins += result.wins;
    totalPaid += (parseFloat(result.rtp) / 100) * chunkRounds * 100;

    if (isFirst && params.captureLog) firstLog = result.verificationLog;

    chunksRun++;
    if (onProgress) onProgress(chunksRun / chunks);

    await new Promise(r => setTimeout(r, 0));
  }

  const totalBet = total * 100;
  const winFrequency = wins / total;
  const rtp = totalBet > 0 ? totalPaid / totalBet : 0;
  const fairOdds = winFrequency > 0 ? Math.round(((1/winFrequency)-1)*100)/100 : null;
  const for965   = winFrequency > 0 ? Math.round(((0.965/winFrequency)-1)*100)/100 : null;
  const for95    = winFrequency > 0 ? Math.round(((0.95/winFrequency)-1)*100)/100 : null;
  const for98    = winFrequency > 0 ? Math.round(((0.98/winFrequency)-1)*100)/100 : null;

  return {
    success: true,
    betType: params.betType,
    betKey: params.betKey,
    actualRounds: total,
    wins,
    winFrequency: (winFrequency*100).toFixed(4),
    rtp: (rtp*100).toFixed(4),
    fairOdds, for95, for965, for98,
    verificationLog: firstLog || [],
  };
}