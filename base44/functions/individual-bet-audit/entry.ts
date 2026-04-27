import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ============================================================
// INDIVIDUAL BET AUDIT — 32-card deck, 10 fixed hands
// Batching: process up to MAX_ROUNDS_PER_CALL per invocation.
// UI calls this in a loop to accumulate large sample counts.
// Verification log captures first 50 rounds with full detail.
// ============================================================

// Per-call ceiling keeps execution well under Base44's 3-min limit.
// At ~10M rounds/sec throughput, 200K rounds ≈ 20ms of pure CPU.
// Network + auth overhead means safe ceiling is 500K per call.
const MAX_ROUNDS_PER_CALL = 500_000;
const LOG_SIZE = 50;

// ── Card encoding: rank 0–12 (2→A), suit 0–3 ─────────────────
const RV: Record<string, number> = {
  '2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,
  '9':7,'10':8,'J':9,'Q':10,'K':11,'A':12,
};
const SV: Record<string, number> = { clubs:0, diamonds:1, hearts:2, spades:3 };

function enc(rank: string, suit: string): number { return RV[rank]*4 + SV[suit]; }

const RANK_LABELS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUIT_LABELS = ['clubs','diamonds','hearts','spades'];
const SUIT_SYMBOLS: Record<string, string> = { clubs:'♣', diamonds:'♦', hearts:'♥', spades:'♠' };
const SUIT_COLORS: Record<string, string>  = { clubs:'black', diamonds:'red', hearts:'red', spades:'black' };

function decodeCard(c: number) {
  const rank = RANK_LABELS[c >> 2];
  const suit = SUIT_LABELS[c & 3];
  return { rank, suit, symbol: SUIT_SYMBOLS[suit], color: SUIT_COLORS[suit], label: rank + SUIT_SYMBOLS[suit] };
}

// ── 32-card dealer deck (52 minus 20 fixed player cards) ──────
const DECK32 = [
  enc('A','spades'), enc('9','spades'), enc('8','spades'), enc('6','spades'),
  enc('5','spades'), enc('4','spades'), enc('3','spades'), enc('2','spades'),
  enc('K','hearts'), enc('Q','hearts'), enc('J','hearts'), enc('9','hearts'),
  enc('8','hearts'), enc('7','hearts'), enc('6','hearts'), enc('5','hearts'),
  enc('K','diamonds'),enc('Q','diamonds'),enc('J','diamonds'),enc('10','diamonds'),
  enc('9','diamonds'),enc('4','diamonds'),enc('3','diamonds'),enc('2','diamonds'),
  enc('A','clubs'),  enc('10','clubs'), enc('8','clubs'),  enc('7','clubs'),
  enc('6','clubs'),  enc('5','clubs'),  enc('4','clubs'),  enc('2','clubs'),
];

// ── 10 fixed player hands ─────────────────────────────────────
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

const RANK_NAMES = [
  'High Card (no bet)','Two Pair','Three of a Kind','Straight','Flush',
  'Full House','Four of a Kind','Straight Flush (no bet)','Royal Flush',
];

// ── Fast 5-card evaluator ─────────────────────────────────────
// Returns: -1=High Card, 0=One Pair, 1=Two Pair, 2=Three of a Kind,
//           3=Straight, 4=Flush, 5=Full House, 6=Four of a Kind,
//           7=Straight Flush, 8=Royal Flush
const tmp5r = new Int8Array(5);

function eval5(c0: number, c1: number, c2: number, c3: number, c4: number): number {
  const r0=c0>>2, r1=c1>>2, r2=c2>>2, r3=c3>>2, r4=c4>>2;
  const s0=c0&3,  s1=c1&3,  s2=c2&3,  s3=c3&3,  s4=c4&3;
  const flush = (s0===s1 && s1===s2 && s2===s3 && s3===s4);

  tmp5r[0]=r0; tmp5r[1]=r1; tmp5r[2]=r2; tmp5r[3]=r3; tmp5r[4]=r4;
  for (let i=1;i<5;i++){
    const v=tmp5r[i]; let j=i-1;
    while(j>=0 && tmp5r[j]<v){ tmp5r[j+1]=tmp5r[j]; j--; }
    tmp5r[j+1]=v;
  }
  const a=tmp5r[0], b=tmp5r[1], c=tmp5r[2], d=tmp5r[3], e=tmp5r[4];
  const straight = (a-e===4 && a!==b && b!==c && c!==d && d!==e) ||
                   (a===12 && b===3 && c===2 && d===1 && e===0);

  if (flush && straight) return (a===12 && e===8) ? 8 : 7;

  let p=0, t=0, q=0, cur=a, run=1;
  for (let i=1;i<5;i++){
    if (tmp5r[i]===cur){ run++; }
    else {
      if(run===4)q++; else if(run===3)t++; else if(run===2)p++;
      cur=tmp5r[i]; run=1;
    }
  }
  if(run===4)q++; else if(run===3)t++; else if(run===2)p++;

  if (q) return 6;
  if (t && p) return 5;
  if (flush) return 4;
  if (straight) return 3;
  if (t) return 2;
  if (p===2) return 1;
  if (p===1) return 0;
  return -1;
}

// ── Best hand from 7 cards — all C(7,5)=21 combinations ──────
const SKIP_PAIRS: [number,number][] = [];
for (let i=0;i<7;i++) for (let j=i+1;j<7;j++) SKIP_PAIRS.push([i,j]);
const allCards = new Int8Array(7);

function best7(h0: number, h1: number, c0: number, c1: number, c2: number, c3: number, c4: number): number {
  allCards[0]=h0; allCards[1]=h1;
  allCards[2]=c0; allCards[3]=c1; allCards[4]=c2; allCards[5]=c3; allCards[6]=c4;
  let best = -2;
  for (let p=0;p<21;p++){
    const [si,sj] = SKIP_PAIRS[p];
    const five: number[] = [];
    for(let i=0;i<7;i++) if(i!==si && i!==sj) five.push(allCards[i]);
    const r = eval5(five[0],five[1],five[2],five[3],five[4]);
    if(r>best) best=r;
  }
  return best;
}

// ── Fisher-Yates shuffle on the working deck copy ─────────────
const deck = new Int8Array(DECK32);
function shuffle(){
  for(let i=31;i>0;i--){
    const j = (Math.random()*(i+1))|0;
    const t = deck[i]; deck[i]=deck[j]; deck[j]=t;
  }
}

// ── Main simulation function ───────────────────────────────────
interface SimResult {
  wins: number;
  totalPaid: number;
  verificationLog: object[];
}

function runSimulation(
  rounds: number,
  betType: string,
  betKey: string,
  handPayouts: number[],
  rankPayoutsMap: Record<string,number>,
  colorPayouts: Record<string,number>,
  lhPayout: number,
  captureLog: boolean,
): SimResult {
  const BET = 100;
  const targetHandIdx = betType==='hand'  ? parseInt(betKey)-1 : -1;
  const targetRankIdx = betType==='rank'  ? RANK_NAMES.indexOf(betKey) : -1;
  const colorCount    = betType==='color' ? parseInt(betKey[0]) : 0;
  const colorIsRed    = betType==='color' ? betKey[1]==='R' : false;
  const lhLow         = betType==='lh' && betKey==='LOW';

  let wins = 0;
  let totalPaid = 0;
  const verificationLog: object[] = [];

  for (let g=0; g<rounds; g++){
    shuffle();
    const c0=deck[0], c1=deck[1], c2=deck[2], c3=deck[3], c4=deck[4];

    let won = false;
    let profit = 0;
    let winType = '';
    let handRankAchieved = '';
    let oddsUsed: number | null = null;

    if (betType === 'hand') {
      let bestRank = -2;
      for (let h=0;h<10;h++){
        const r = best7(HANDS[h][0],HANDS[h][1],c0,c1,c2,c3,c4);
        if(r>bestRank) bestRank=r;
      }
      if (bestRank >= 0){
        const myRank = best7(HANDS[targetHandIdx][0],HANDS[targetHandIdx][1],c0,c1,c2,c3,c4);
        if (myRank === bestRank){
          won = true;
          oddsUsed = handPayouts[targetHandIdx];
          profit = BET * oddsUsed;
          winType = 'Hand Win';
          handRankAchieved = RANK_NAMES[bestRank] || '';
        }
      }

    } else if (betType === 'rank') {
      let bestRank = -2;
      for (let h=0;h<10;h++){
        const r = best7(HANDS[h][0],HANDS[h][1],c0,c1,c2,c3,c4);
        if(r>bestRank) bestRank=r;
      }
      handRankAchieved = bestRank >= 0 ? (RANK_NAMES[bestRank] || 'Unknown') : 'No qualifying hand';
      oddsUsed = rankPayoutsMap[betKey] ?? null;
      if (bestRank === targetRankIdx){
        won = true;
        profit = BET * (oddsUsed ?? 0);
        winType = 'Hand Win — Rank Matched';
      }

    } else if (betType === 'color') {
      let reds = 0;
      for (const card of [c0,c1,c2,c3,c4]){
        const s = card & 3;
        if (s===1 || s===2) reds++;
      }
      const colorCount5 = colorIsRed ? reds : (5-reds);
      oddsUsed = colorPayouts[betKey] ?? null;
      if (colorCount5 >= colorCount){
        won = true;
        profit = BET * (oddsUsed ?? 0);
        winType = 'Independent Board Win — Color Result';
      }

    } else if (betType === 'lh') {
      const riverRank = c4 >> 2;
      const isLow = riverRank <= 5;
      oddsUsed = lhPayout;
      if (lhLow ? isLow : !isLow){
        won = true;
        profit = BET * oddsUsed;
        winType = 'Independent Board Win — River Result';
      }
    }

    if (won){
      wins++;
      totalPaid += BET + profit;
    }

    if (captureLog && g < LOG_SIZE){
      const community = [c0,c1,c2,c3,c4].map((c, i) => ({
        position: ['Flop 1','Flop 2','Flop 3','Turn','River'][i],
        ...decodeCard(c),
      }));

      const handCards = (betType==='hand' && targetHandIdx>=0)
        ? HANDS[targetHandIdx].map(c => decodeCard(c))
        : null;

      const mathExpression = won
        ? `$${BET} × (1 + ${oddsUsed}) = $${(BET * (1 + (oddsUsed ?? 0))).toFixed(2)} returned`
        : `$${BET} × 0 = $0.00 (no win)`;

      verificationLog.push({
        round: g+1,
        won,
        winType: won ? winType : 'No Win',
        community,
        handCards,
        handRankAchieved: handRankAchieved || null,
        oddsUsed,
        betAmount: BET,
        payoutAmount: won ? parseFloat((BET+profit).toFixed(2)) : 0,
        netResult: won ? parseFloat(profit.toFixed(2)) : -BET,
        mathExpression,
      });
    }
  }

  return { wins, totalPaid, verificationLog };
}

// ── Entry point ───────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44Client = createClientFromRequest(req);
    const user = await base44Client.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // Clamp rounds to safe per-call ceiling
    const requestedRounds: number = Math.max(1, body.batchSize || 50_000);
    const rounds = Math.min(requestedRounds, MAX_ROUNDS_PER_CALL);

    const betType: string = body.betType || 'hand';
    const betKey: string  = body.betKey  || '1';

    // Live payouts — injected by the UI from payoutConstants.js
    // Falls back to calibrated 96.5% defaults if not supplied
    const handPayouts: number[] = body.handPayouts || [14.0,3.95,10.0,6.25,5.75,4.25,4.25,4.25,4.25,10.0];
    const rankPayoutsMap: Record<string,number> = body.rankPayouts || {
      'Four of a Kind':12.0,'Full House':2.5,'Flush':3.0,
      'Straight':4.5,'Three of a Kind':3.25,'Two Pair':16.0,
    };
    const colorPayouts: Record<string,number> = body.colorPayouts || {
      '3R':0.83,'3B':0.83,'4R':4.25,'4B':4.25,'5R':42.0,'5B':42.0,
    };
    const lhPayout: number = body.lhPayout ?? 0.90;

    // Only capture the verification log on the first call of a sequence.
    // The UI signals this with captureLog: true (default true).
    const captureLog: boolean = body.captureLog !== false;

    const { wins, totalPaid, verificationLog } = runSimulation(
      rounds, betType, betKey,
      handPayouts, rankPayoutsMap, colorPayouts, lhPayout,
      captureLog,
    );

    const totalBet = rounds * 100;
    const winFrequency = wins / rounds;
    const rtp = totalBet > 0 ? totalPaid / totalBet : 0;
    const fairOdds = winFrequency > 0 ? Math.round(((1/winFrequency)-1)*100)/100 : null;
    const for965   = winFrequency > 0 ? Math.round(((0.965/winFrequency)-1)*100)/100 : null;
    const for95    = winFrequency > 0 ? Math.round(((0.95/winFrequency)-1)*100)/100 : null;
    const for98    = winFrequency > 0 ? Math.round(((0.98/winFrequency)-1)*100)/100 : null;

    let currentPayout: number | null = null;
    if (betType==='hand')  currentPayout = handPayouts[parseInt(betKey)-1] ?? null;
    else if (betType==='rank')  currentPayout = rankPayoutsMap[betKey] ?? null;
    else if (betType==='color') currentPayout = colorPayouts[betKey] ?? null;
    else if (betType==='lh')    currentPayout = lhPayout;

    return Response.json({
      success: true,
      betType, betKey,
      requestedRounds,
      actualRounds: rounds,
      cappedAt: rounds < requestedRounds ? MAX_ROUNDS_PER_CALL : null,
      wins,
      winFrequency: (winFrequency*100).toFixed(4),
      rtp: (rtp*100).toFixed(4),
      fairOdds, for95, for965, for98,
      currentPayout,
      verificationLog: captureLog ? verificationLog : [],
    });

  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});