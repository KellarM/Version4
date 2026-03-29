import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Fast 5-card evaluator — no getCombinations, uses lookup tables
// Encodes each card as a number 0-51, evaluates all C(7,5)=21 combos inline

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const N = Math.min(body.games || 200_000, 500_000);

    // ── Card encoding ──
    // rank 0-12 (2..A), suit 0-3 (spades=0,hearts=1,diamonds=2,clubs=3)
    // card = rank*4 + suit
    const RANK_NAMES_ARR = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const SUIT_NAMES = ['spades','hearts','diamonds','clubs'];
    const SUIT_COLORS_ARR = [0,1,1,0]; // 0=black,1=red (spades,hearts,diamonds,clubs)

    function encodeCard(rank, suit) { return rank * 4 + suit; }
    function cardRank(c) { return c >> 2; }
    function cardSuit(c) { return c & 3; }
    function cardIsRed(c) { return SUIT_COLORS_ARR[cardSuit(c)] === 1; }
    function cardIsLow(c) { return cardRank(c) <= 5; } // ranks 0-5 = 2,3,4,5,6,7

    // ── Build dealer deck (32 cards) ──
    const RAW_DECK = [
      // spades (suit=0)
      {r:'A',s:0},{r:'9',s:0},{r:'8',s:0},{r:'6',s:0},{r:'5',s:0},{r:'4',s:0},{r:'3',s:0},{r:'2',s:0},
      // hearts (suit=1)
      {r:'K',s:1},{r:'Q',s:1},{r:'J',s:1},{r:'9',s:1},{r:'8',s:1},{r:'7',s:1},{r:'6',s:1},{r:'5',s:1},
      // diamonds (suit=2)
      {r:'K',s:2},{r:'Q',s:2},{r:'J',s:2},{r:'10',s:2},{r:'9',s:2},{r:'4',s:2},{r:'3',s:2},{r:'2',s:2},
      // clubs (suit=3)
      {r:'A',s:3},{r:'10',s:3},{r:'8',s:3},{r:'7',s:3},{r:'6',s:3},{r:'5',s:3},{r:'4',s:3},{r:'2',s:3},
    ].map(c => encodeCard(RANK_NAMES_ARR.indexOf(c.r), c.s));

    // ── Fixed hands (encoded) ──
    const HANDS_RAW = [
      [{r:'A',s:'diamonds'},{r:'10',s:'hearts'}],
      [{r:'K',s:'clubs'},   {r:'K', s:'spades'}],
      [{r:'Q',s:'clubs'},   {r:'J', s:'spades'}],
      [{r:'Q',s:'spades'},  {r:'10',s:'spades'}],
      [{r:'J',s:'clubs'},   {r:'9', s:'clubs'}],
      [{r:'8',s:'diamonds'},{r:'6', s:'diamonds'}],
      [{r:'7',s:'diamonds'},{r:'7', s:'spades'}],
      [{r:'4',s:'hearts'},  {r:'2', s:'hearts'}],
      [{r:'3',s:'clubs'},   {r:'3', s:'hearts'}],
      [{r:'A',s:'hearts'},  {r:'5', s:'diamonds'}],
    ].map(h => h.map(c => encodeCard(RANK_NAMES_ARR.indexOf(c.r), ['spades','hearts','diamonds','clubs'].indexOf(c.s))));

    const CURRENT_HAND_PAYOUTS = [8.10,6.75,8.52,7.90,8.31,10.18,7.48,11.95,7.27,9.77];
    const CURRENT_RANK_PAYOUTS_MAP = {'One Pair':5.87,'Two Pair':4.83,'Three of a Kind':0.98,'Straight':1.90,'Flush':1.30,'Full House':0.98,'Four of a Kind':3.79,'Straight Flush':null,'Royal Flush':null};
    const COLOR_PAYOUTS_MAP = {'3R':0.78,'4R':5.04,'5R':19.74,'3B':0.78,'4B':5.04,'5B':19.74};

    // ── Fast 5-card hand evaluator returns rank 0-8 ──
    // 0=HighCard,1=OnePair,2=TwoPair,3=Trips,4=Straight,5=Flush,6=FH,7=Quads,8=SF,9=RF
    const RANK_LABEL = ['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush','Royal Flush'];

    function eval5(c0,c1,c2,c3,c4) {
      const r = [c0>>2,c1>>2,c2>>2,c3>>2,c4>>2].sort((a,b)=>b-a);
      const s = [c0&3,c1&3,c2&3,c3&3,c4&3];
      const flush = s[0]===s[1]&&s[1]===s[2]&&s[2]===s[3]&&s[3]===s[4];
      let straight = (r[0]-r[4]===4 && new Set(r).size===5);
      let sHigh = r[0];
      if (!straight && r[0]===12&&r[1]===3&&r[2]===2&&r[3]===1&&r[4]===0){straight=true;sHigh=3;}
      const cnt={}; r.forEach(x=>{cnt[x]=(cnt[x]||0)+1;});
      const vals=Object.values(cnt).sort((a,b)=>b-a);
      if(flush&&straight){
        if(r[0]===12&&r[4]===8) return [9, sHigh]; // Royal Flush
        return [8, sHigh]; // Straight Flush
      }
      if(vals[0]===4) return [7, r[0]];
      if(vals[0]===3&&vals[1]===2) return [6, r[0]];
      if(flush) return [5, r[0]];
      if(straight) return [4, sHigh];
      if(vals[0]===3) return [3, r[0]];
      if(vals[0]===2&&vals[1]===2) return [2, r[0]];
      if(vals[0]===2) return [1, r[0]];
      return [0, r[0]];
    }

    // Evaluate best 5-card hand from 7 cards (C(7,5)=21 combos, inline)
    const COMBOS_7_5 = [];
    for(let i=0;i<7;i++) for(let j=i+1;j<7;j++) {
      const skip = new Set([i,j]);
      COMBOS_7_5.push([0,1,2,3,4,5,6].filter(x=>!skip.has(x)));
    }

    function bestOf7(cards) {
      let best = null;
      for(const [a,b,c,d,e] of COMBOS_7_5) {
        const res = eval5(cards[a],cards[b],cards[c],cards[d],cards[e]);
        if(!best || res[0]>best[0] || (res[0]===best[0]&&res[1]>best[1])) best=res;
      }
      return best;
    }

    // ── Shuffle (Fisher-Yates on Int32Array for speed) ──
    const deck = new Int32Array(RAW_DECK);
    function shuffle() {
      for(let i=deck.length-1;i>0;i--){
        const j=(Math.random()*(i+1))|0;
        const tmp=deck[i]; deck[i]=deck[j]; deck[j]=tmp;
      }
    }

    // ── Counters ──
    const handWins = new Float64Array(10);
    const rankHits = new Int32Array(10); // indexed by rank 0-9
    const colorHits = new Int32Array(6); // 0=3R,1=4R,2=5R,3=3B,4=4B,5=5B
    let riverLow = 0, riverHigh = 0;

    // ── Main loop ──
    for(let g=0; g<N; g++) {
      shuffle();
      const comm = [deck[0],deck[1],deck[2],deck[3],deck[4]];

      // Best hand evaluation for each of the 10 fixed hands
      let topScore = -1, topTie = -1;
      const scores = new Array(10);
      for(let h=0; h<10; h++) {
        const seven = [HANDS_RAW[h][0], HANDS_RAW[h][1], ...comm];
        const [sc, ti] = bestOf7(seven);
        scores[h] = [sc, ti];
        if(sc>topScore || (sc===topScore&&ti>topTie)){ topScore=sc; topTie=ti; }
      }
      let winners=0;
      for(let h=0;h<10;h++) if(scores[h][0]===topScore&&scores[h][1]===topTie) winners++;
      for(let h=0;h<10;h++) if(scores[h][0]===topScore&&scores[h][1]===topTie) handWins[h]+=1/winners;

      // Rank of winning board
      rankHits[topScore]++;

      // Colors
      let reds=0;
      for(const c of comm) if(cardIsRed(c)) reds++;
      const blacks=5-reds;
      if(reds>=3) { colorHits[0]++; if(reds>=4) { colorHits[1]++; if(reds>=5) colorHits[2]++; } }
      if(blacks>=3) { colorHits[3]++; if(blacks>=4) { colorHits[4]++; if(blacks>=5) colorHits[5]++; } }

      // River low/high
      if(cardIsLow(comm[4])) riverLow++; else riverHigh++;
    }

    // ── Build output ──
    const TARGET = 0.965;

    const handResults = HANDS_RAW.map((h, i) => {
      const freq = handWins[i] / N;
      const curP = CURRENT_HAND_PAYOUTS[i];
      return {
        handId: i+1,
        cards: h.map(c=>`${RANK_NAMES_ARR[c>>2]} ${SUIT_NAMES[c&3]}`).join(' / '),
        winFrequency: (freq*100).toFixed(4)+'%',
        winFrequencyRaw: +freq.toFixed(6),
        currentPayout: curP,
        impliedRTP: freq>0?((freq*(1+curP))*100).toFixed(2)+'%':'—',
        fairPayoutAt965: freq>0?((TARGET/freq)-1).toFixed(4):null,
        deltaVsCurrent: freq>0?(((TARGET/freq)-1-curP)).toFixed(4):null,
      };
    });

    const rankResults = RANK_LABEL.map((name,i)=>{
      const hits = rankHits[i];
      const freq = hits/N;
      const cur = CURRENT_RANK_PAYOUTS_MAP[name];
      return {
        rank: name,
        hits,
        frequency: (freq*100).toFixed(4)+'%',
        frequencyRaw: +freq.toFixed(6),
        currentPayout: cur,
        impliedRTP: (cur!=null&&freq>0)?((freq*(1+cur))*100).toFixed(2)+'%':'—',
        fairPayoutAt965: (cur!=null&&freq>0)?((TARGET/freq)-1).toFixed(4):'Progressive/N/A',
      };
    }).filter(r=>r.hits>0);

    const COLOR_KEYS = ['3R','4R','5R','3B','4B','5B'];
    const colorResults = COLOR_KEYS.map((key,i)=>{
      const hits = colorHits[i];
      const freq = hits/N;
      const cur = COLOR_PAYOUTS_MAP[key];
      return {
        color: key,
        hits,
        frequency: (freq*100).toFixed(4)+'%',
        frequencyRaw: +freq.toFixed(6),
        currentPayout: cur,
        impliedRTP: freq>0?((freq*(1+cur))*100).toFixed(2)+'%':'—',
        fairPayoutAt965: freq>0?((TARGET/freq)-1).toFixed(4):null,
      };
    });

    const rLow = riverLow/N, rHigh = riverHigh/N;
    const handRTPSum = handResults.reduce((s,h)=>s+h.winFrequencyRaw*(1+h.currentPayout),0);

    return Response.json({
      success: true,
      gamesSimulated: N,
      targetRTP: '96.5%',
      summary: {
        hand_combined_implied_RTP: (handRTPSum*100).toFixed(2)+'%',
        note: 'impliedRTP = freq × (1 + currentPayout). fairPayoutAt965 = what payout is needed for 96.5% RTP per bet.',
      },
      handFrequencies: handResults,
      rankFrequencies: rankResults,
      colorFrequencies: colorResults,
      riverFrequencies: {
        LOW:  { frequency:(rLow*100).toFixed(4)+'%', currentPayout:0.83, impliedRTP:((rLow*1.83)*100).toFixed(2)+'%', fairPayoutAt965:((TARGET/rLow)-1).toFixed(4) },
        HIGH: { frequency:(rHigh*100).toFixed(4)+'%', currentPayout:0.83, impliedRTP:((rHigh*1.83)*100).toFixed(2)+'%', fairPayoutAt965:((TARGET/rHigh)-1).toFixed(4) },
      },
    });

  } catch(error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});