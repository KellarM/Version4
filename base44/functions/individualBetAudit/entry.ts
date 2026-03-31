import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ============================================================
// TRUE SIMULATION — 32-card deck, 10 fixed hands, real deal
// Optimised: fast integer hand evaluator, no GC pressure
// ============================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const BATCH = Math.min(body.batchSize || 50_000, 50_000);
    const betType = body.betType;
    const betKey  = body.betKey;

    // ── Encode cards as small integers for speed ──────────────────────
    // rank 0-12 (2→A), suit 0-3
    const RV = {
      '2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,
      '9':7,'10':8,'J':9,'Q':10,'K':11,'A':12
    };
    const SV = { clubs:0, diamonds:1, hearts:2, spades:3 };

    function enc(rank, suit) { return RV[rank]*4 + SV[suit]; }

    // 32-card dealer deck as integers
    const DECK32 = [
      enc('A','spades'),enc('9','spades'),enc('8','spades'),enc('6','spades'),
      enc('5','spades'),enc('4','spades'),enc('3','spades'),enc('2','spades'),
      enc('K','hearts'),enc('Q','hearts'),enc('J','hearts'),enc('9','hearts'),
      enc('8','hearts'),enc('7','hearts'),enc('6','hearts'),enc('5','hearts'),
      enc('K','diamonds'),enc('Q','diamonds'),enc('J','diamonds'),enc('10','diamonds'),
      enc('9','diamonds'),enc('4','diamonds'),enc('3','diamonds'),enc('2','diamonds'),
      enc('A','clubs'),enc('10','clubs'),enc('8','clubs'),enc('7','clubs'),
      enc('6','clubs'),enc('5','clubs'),enc('4','clubs'),enc('2','clubs'),
    ];

    // 10 fixed hands as integer pairs
    const HANDS = [
      [enc('A','diamonds'),enc('10','hearts')],
      [enc('K','clubs'),   enc('K','spades')],
      [enc('Q','clubs'),   enc('J','spades')],
      [enc('Q','spades'),  enc('10','spades')],
      [enc('J','clubs'),   enc('9','clubs')],
      [enc('8','diamonds'),enc('6','diamonds')],
      [enc('7','diamonds'),enc('7','spades')],
      [enc('4','hearts'),  enc('2','hearts')],
      [enc('3','clubs'),   enc('3','hearts')],
      [enc('A','hearts'),  enc('5','diamonds')],
    ];

    const HAND_PAYOUTS = [8.10, 6.75, 8.52, 7.90, 8.31, 10.18, 7.48, 11.95, 7.27, 9.77];
    const RANK_PAYOUTS_MAP = {
      'Royal Flush':null,'Straight Flush':null,'Four of a Kind':12.77,
      'Full House':2.53,'Flush':3.21,'Straight':4.93,
      'Three of a Kind':3.81,'Two Pair':15.98,'One Pair':null,
    };
    const COLOR_PAYOUTS = {'3R':0.81,'3B':0.81,'4R':5.25,'4B':5.25,'5R':20.56,'5B':20.56};
    const LH_PAYOUT = 0.95;

    // RANK_NAMES index matches hand evaluator output (0=OnePair … 8=RoyalFlush)
    const RANK_NAMES = [
      'One Pair','Two Pair','Three of a Kind','Straight','Flush',
      'Full House','Four of a Kind','Straight Flush','Royal Flush'
    ];

    // ── Fast 5-card evaluator (returns int: -1=HC,0=Pair,…,8=RF) ──────
    // Operates on array of 5 encoded card integers
    const tmp5r = new Int8Array(5);
    const tmp5s = new Int8Array(5);

    function eval5(c0,c1,c2,c3,c4) {
      const r0=c0>>2, r1=c1>>2, r2=c2>>2, r3=c3>>2, r4=c4>>2;
      const s0=c0&3,  s1=c1&3,  s2=c2&3,  s3=c3&3,  s4=c4&3;

      const flush = (s0===s1&&s1===s2&&s2===s3&&s3===s4);

      // sort ranks descending (insertion sort on 5 items)
      tmp5r[0]=r0;tmp5r[1]=r1;tmp5r[2]=r2;tmp5r[3]=r3;tmp5r[4]=r4;
      for (let i=1;i<5;i++){const v=tmp5r[i];let j=i-1;while(j>=0&&tmp5r[j]<v){tmp5r[j+1]=tmp5r[j];j--;}tmp5r[j+1]=v;}
      const a=tmp5r[0],b=tmp5r[1],c=tmp5r[2],d=tmp5r[3],e=tmp5r[4];

      const straight = (a-e===4 && a!==b&&b!==c&&c!==d&&d!==e) ||
                       (a===12&&b===3&&c===2&&d===1&&e===0); // wheel

      if (flush && straight) return (a===12&&e===8) ? 8 : 7;

      // count ranks
      let cnt=[0,0,0,0]; // count of pairs/trips/quads
      let p=0,t=0,q=0,cur=a,run=1;
      for (let i=1;i<=4;i++){
        const v = i<4 ? tmp5r[i] : -99;
        if (v===cur){run++;}
        else{
          if(run===4)q++;else if(run===3)t++;else if(run===2)p++;
          cur=v;run=1;
        }
      }
      if (q) return 6;
      if (t&&p) return 5;
      if (flush) return 4;
      if (straight) return 3;
      if (t) return 2;
      if (p===2) return 1;
      if (p===1) return 0;
      return -1;
    }

    // Best 5 from 7 — iterate all C(7,5)=21 combos via skip-2 pairs
    const SKIP_PAIRS = [];
    for (let i=0;i<7;i++) for (let j=i+1;j<7;j++) SKIP_PAIRS.push([i,j]);

    const allCards = new Int8Array(7);

    function best7(h0,h1,c0,c1,c2,c3,c4) {
      allCards[0]=h0;allCards[1]=h1;
      allCards[2]=c0;allCards[3]=c1;allCards[4]=c2;allCards[5]=c3;allCards[6]=c4;
      let best=-2;
      for (let p=0;p<21;p++){
        const [si,sj]=SKIP_PAIRS[p];
        // collect 5 cards skipping si and sj
        let k=0;
        const five=[];
        for(let i=0;i<7;i++) if(i!==si&&i!==sj) five.push(allCards[i]);
        const r=eval5(five[0],five[1],five[2],five[3],five[4]);
        if(r>best)best=r;
      }
      return best;
    }

    // shuffle deck in place (Fisher-Yates)
    const deck = new Int8Array(DECK32);
    function shuffle(){
      for(let i=31;i>0;i--){
        const j=(Math.random()*(i+1))|0;
        const t=deck[i];deck[i]=deck[j];deck[j]=t;
      }
    }

    // ── Simulation ────────────────────────────────────────────────────
    let wins = 0;
    let totalPaid = 0;
    const BET = 100;
    const totalBet = BATCH * BET;

    const targetHandIdx = betType==='hand' ? parseInt(betKey)-1 : -1;
    const targetRankIdx = betType==='rank' ? RANK_NAMES.indexOf(betKey) : -1;
    const colorCount    = betType==='color' ? parseInt(betKey[0]) : 0;
    const colorIsRed    = betType==='color' ? betKey[1]==='R' : false;
    const lhLow         = betType==='lh' && betKey==='LOW';

    for (let g = 0; g < BATCH; g++) {
      shuffle();
      const c0=deck[0],c1=deck[1],c2=deck[2],c3=deck[3],c4=deck[4];

      if (betType === 'hand') {
        // Find best rank across all 10 hands
        let bestRank = -2;
        for (let h=0;h<10;h++){
          const r = best7(HANDS[h][0],HANDS[h][1],c0,c1,c2,c3,c4);
          if(r>bestRank) bestRank=r;
        }
        // Our hand wins if it ties the best and best >= One Pair (0)
        if (bestRank >= 0) {
          const myRank = best7(HANDS[targetHandIdx][0],HANDS[targetHandIdx][1],c0,c1,c2,c3,c4);
          if (myRank === bestRank) {
            wins++;
            totalPaid += BET * (1 + HAND_PAYOUTS[targetHandIdx]);
          }
        }

      } else if (betType === 'rank') {
        // Winning rank = best rank achieved
        let bestRank = -2;
        for (let h=0;h<10;h++){
          const r = best7(HANDS[h][0],HANDS[h][1],c0,c1,c2,c3,c4);
          if(r>bestRank) bestRank=r;
        }
        if (bestRank === targetRankIdx) {
          wins++;
          const payout = RANK_PAYOUTS_MAP[betKey];
          if (payout !== null) totalPaid += BET * (1 + payout);
        }

      } else if (betType === 'color') {
        // Count red/black in 5 community cards
        let reds=0;
        for (const card of [c0,c1,c2,c3,c4]) {
          const s = card & 3; // 0=clubs,1=diamonds,2=hearts,3=spades
          if (s===1||s===2) reds++; // diamonds or hearts = red
        }
        const blacks = 5 - reds;
        const won = colorIsRed ? reds>=colorCount : blacks>=colorCount;
        if (won) {
          wins++;
          totalPaid += BET * (1 + COLOR_PAYOUTS[betKey]);
        }

      } else if (betType === 'lh') {
        // River = 5th community card (index 4)
        const riverRank = c4 >> 2; // rank 0-12; 0-5 = 2-7 = Low
        const isLow = riverRank <= 5; // 2,3,4,5,6,7
        const won = lhLow ? isLow : !isLow;
        if (won) {
          wins++;
          totalPaid += BET * (1 + LH_PAYOUT);
        }
      }
    }

    const winFrequency = wins / BATCH;
    const rtp = totalBet > 0 ? totalPaid / totalBet : 0;
    const fairOdds = winFrequency > 0 ? Math.round(((1/winFrequency)-1)*100)/100 : null;
    const for965   = winFrequency > 0 ? Math.round(((0.965/winFrequency)-1)*100)/100 : null;
    const for95    = winFrequency > 0 ? Math.round(((0.95/winFrequency)-1)*100)/100 : null;
    const for98    = winFrequency > 0 ? Math.round(((0.98/winFrequency)-1)*100)/100 : null;

    let currentPayout = null;
    if (betType==='hand')  currentPayout = HAND_PAYOUTS[parseInt(betKey)-1];
    else if (betType==='rank')  currentPayout = RANK_PAYOUTS_MAP[betKey];
    else if (betType==='color') currentPayout = COLOR_PAYOUTS[betKey];
    else if (betType==='lh')    currentPayout = LH_PAYOUT;

    return Response.json({
      success: true,
      betType, betKey, batchSize: BATCH,
      wins,
      winFrequency: (winFrequency*100).toFixed(4),
      rtp: (rtp*100).toFixed(4),
      fairOdds, for95, for965, for98,
      currentPayout,
      currentRTP: currentPayout!==null && winFrequency>0
        ? (winFrequency*(1+currentPayout)*100).toFixed(2) : null,
      progressive: betType==='rank' && RANK_PAYOUTS_MAP[betKey]===null,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});