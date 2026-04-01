import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // Hard cap at 500K — beyond this Deno times out (502). Results are statistically stable at 200K+.
    const N = Math.min(body.games || 200_000, 500_000);

    // ── Card encoding: card = rank*4 + suit ──
    const RANK_NAMES_ARR = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const SUIT_NAMES = ['spades','hearts','diamonds','clubs'];
    const SUIT_COLORS_ARR = [0,1,1,0]; // 0=black,1=red

    function encodeCard(rank, suit) { return rank * 4 + suit; }
    function cardIsRed(c) { return SUIT_COLORS_ARR[c & 3] === 1; }
    function cardIsLow(c) { return (c >> 2) <= 5; } // ranks 0-5 = 2,3,4,5,6,7

    // ── Dealer deck (32 cards) ──
    const RAW_DECK = [
      {r:'A',s:0},{r:'9',s:0},{r:'8',s:0},{r:'6',s:0},{r:'5',s:0},{r:'4',s:0},{r:'3',s:0},{r:'2',s:0},
      {r:'K',s:1},{r:'Q',s:1},{r:'J',s:1},{r:'9',s:1},{r:'8',s:1},{r:'7',s:1},{r:'6',s:1},{r:'5',s:1},
      {r:'K',s:2},{r:'Q',s:2},{r:'J',s:2},{r:'10',s:2},{r:'9',s:2},{r:'4',s:2},{r:'3',s:2},{r:'2',s:2},
      {r:'A',s:3},{r:'10',s:3},{r:'8',s:3},{r:'7',s:3},{r:'6',s:3},{r:'5',s:3},{r:'4',s:3},{r:'2',s:3},
    ].map(c => encodeCard(RANK_NAMES_ARR.indexOf(c.r), c.s));

    // ── Fixed hands ──
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

    const CURRENT_HAND_PAYOUTS = [14.51,4.21,10.98,6.75,5.63,4.48,4.04,4.69,4.11,9.30];
    // Royal Flush removed as a betting position. One Pair and Straight Flush use jackpot multiplier odds.
    const CURRENT_RANK_PAYOUTS_MAP = {
      'One Pair':158.34,'Two Pair':16.76,'Three of a Kind':3.95,
      'Straight':5.02,'Flush':3.10,'Full House':2.53,
      'Four of a Kind':12.43,'Straight Flush':255.42
    };
    const COLOR_PAYOUTS_MAP = {'3R':0.93,'4R':4.81,'5R':43.36,'3B':0.93,'4B':4.81,'5B':43.46};

    const RANK_LABEL = ['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush','Royal Flush'];

    // ── Ultra-fast 5-card evaluator (integer ops only, no arrays) ──
    function eval5(c0,c1,c2,c3,c4) {
      const r0=c0>>2, r1=c1>>2, r2=c2>>2, r3=c3>>2, r4=c4>>2;
      const s0=c0&3, s1=c1&3, s2=c2&3, s3=c3&3, s4=c4&3;
      const flush = (s0===s1&&s1===s2&&s2===s3&&s3===s4);
      // sort ranks descending (5 elements, insertion sort - no array alloc)
      let a=r0,b=r1,c=r2,d=r3,e=r4,t;
      if(a<b){t=a;a=b;b=t;} if(a<c){t=a;a=c;c=t;} if(a<d){t=a;a=d;d=t;} if(a<e){t=a;a=e;e=t;}
      if(b<c){t=b;b=c;c=t;} if(b<d){t=b;b=d;d=t;} if(b<e){t=b;b=e;e=t;}
      if(c<d){t=c;c=d;d=t;} if(c<e){t=c;c=e;e=t;}
      if(d<e){t=d;d=e;e=t;}
      const distinct = (a!==b?1:0)+(b!==c?1:0)+(c!==d?1:0)+(d!==e?1:0);
      let straight=false, sHigh=a;
      if(distinct===4){
        if(a-e===4){straight=true;}
        else if(a===12&&b===3&&c===2&&d===1&&e===0){straight=true;sHigh=3;}
      }
      if(flush&&straight){ return a===12&&b===8?[9,sHigh]:[8,sHigh]; }
      if(distinct===1) return [7,a];
      if(distinct===2){ if(a===b&&b===c&&c===d){return[7,a];}else if(b===c&&c===d&&d===e){return[7,e];} return[6,a===b&&b===c?a:e]; }
      if(flush) return [5,a];
      if(straight) return [4,sHigh];
      if(distinct===3){
        if(a===b&&b===c||b===c&&c===d||c===d&&d===e) return[3,a===b&&b===c?a:b===c&&c===d?b:c];
        return[2,a];
      }
      if(distinct===4) return [1,a];
      return [0,a];
    }

    // Precompute C(7,5) index combos (21 combos, skip pairs i<j)
    const C75 = [];
    for(let i=0;i<7;i++) for(let j=i+1;j<7;j++){
      C75.push([0,1,2,3,4,5,6].filter(x=>x!==i&&x!==j));
    }

    function bestOf7(h0,h1,c0,c1,c2,c3,c4) {
      const cards=[h0,h1,c0,c1,c2,c3,c4];
      let bsc=-1,bti=-1;
      for(const[a,b,c,d,e] of C75){
        const[sc,ti]=eval5(cards[a],cards[b],cards[c],cards[d],cards[e]);
        if(sc>bsc||(sc===bsc&&ti>bti)){bsc=sc;bti=ti;}
      }
      return [bsc,bti];
    }

    // ── Shuffle (Fisher-Yates, typed array) ──
    const deck = new Int32Array(RAW_DECK);
    function shuffle() {
      for(let i=31;i>0;i--){
        const j=(Math.random()*(i+1))|0;
        const t=deck[i];deck[i]=deck[j];deck[j]=t;
      }
    }

    // ── Counters ──
    const handWins = new Float64Array(10);
    const rankHits = new Int32Array(10);
    const colorHits = new Int32Array(6);
    let riverLow=0, riverHigh=0;

    // ── Main loop ──
    for(let g=0;g<N;g++){
      shuffle();
      const c0=deck[0],c1=deck[1],c2=deck[2],c3=deck[3],c4=deck[4];

      let topScore=-1, topTie=-1;
      const scores=new Int32Array(20); // [sc,ti] pairs
      for(let h=0;h<10;h++){
        const[sc,ti]=bestOf7(HANDS_RAW[h][0],HANDS_RAW[h][1],c0,c1,c2,c3,c4);
        scores[h*2]=sc; scores[h*2+1]=ti;
        if(sc>topScore||(sc===topScore&&ti>topTie)){topScore=sc;topTie=ti;}
      }
      let winners=0;
      for(let h=0;h<10;h++) if(scores[h*2]===topScore&&scores[h*2+1]===topTie) winners++;
      const share=1/winners;
      for(let h=0;h<10;h++) if(scores[h*2]===topScore&&scores[h*2+1]===topTie) handWins[h]+=share;

      rankHits[topScore]++;

      let reds=0;
      if(cardIsRed(c0))reds++; if(cardIsRed(c1))reds++; if(cardIsRed(c2))reds++;
      if(cardIsRed(c3))reds++; if(cardIsRed(c4))reds++;
      const blacks=5-reds;
      if(reds>=3){colorHits[0]++;if(reds>=4){colorHits[1]++;if(reds>=5)colorHits[2]++;}}
      if(blacks>=3){colorHits[3]++;if(blacks>=4){colorHits[4]++;if(blacks>=5)colorHits[5]++;}}

      if(cardIsLow(c4))riverLow++;else riverHigh++;
    }

    const TARGET = 0.965;

    const handResults = HANDS_RAW.map((h,i) => {
      const freq = handWins[i]/N;
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

    const rankResults = RANK_LABEL.map((name,i) => {
      const hits=rankHits[i]; const freq=hits/N;
      const cur=CURRENT_RANK_PAYOUTS_MAP[name]; // undefined = Royal Flush (removed bet position)
      return {
        rank: name, hits,
        frequency: (freq*100).toFixed(4)+'%',
        frequencyRaw: +freq.toFixed(6),
        currentPayout: cur ?? 'N/A (removed)',
        impliedRTP: (cur!=null&&freq>0)?((freq*(1+cur))*100).toFixed(2)+'%':'N/A',
        fairPayoutAt965: (cur!=null&&freq>0)?((TARGET/freq)-1).toFixed(4):'N/A',
      };
    }).filter(r=>r.hits>0);

    const COLOR_KEYS=['3R','4R','5R','3B','4B','5B'];
    const colorResults = COLOR_KEYS.map((key,i)=>{
      const hits=colorHits[i]; const freq=hits/N;
      const cur=COLOR_PAYOUTS_MAP[key];
      return {
        color: key, hits,
        frequency: (freq*100).toFixed(4)+'%',
        frequencyRaw: +freq.toFixed(6),
        currentPayout: cur,
        impliedRTP: freq>0?((freq*(1+cur))*100).toFixed(2)+'%':'—',
        fairPayoutAt965: freq>0?((TARGET/freq)-1).toFixed(4):null,
      };
    });

    const rLow=riverLow/N, rHigh=riverHigh/N;
    const handRTPSum=handResults.reduce((s,h)=>s+h.winFrequencyRaw*(1+h.currentPayout),0);

    return Response.json({
      success: true,
      gamesSimulated: N,
      targetRTP: '96.5%',
      summary: {
        hand_combined_implied_RTP: (handRTPSum*100).toFixed(2)+'%',
        note: 'impliedRTP = freq × (1+currentPayout). fairPayoutAt965 = payout needed for 96.5% RTP per bet.',
      },
      handFrequencies: handResults,
      rankFrequencies: rankResults,
      colorFrequencies: colorResults,
      riverFrequencies: {
        LOW:  { frequency:(rLow*100).toFixed(4)+'%',  currentPayout:0.93, impliedRTP:((rLow*1.93)*100).toFixed(2)+'%',  fairPayoutAt965:((TARGET/rLow)-1).toFixed(4) },
        HIGH: { frequency:(rHigh*100).toFixed(4)+'%', currentPayout:0.93, impliedRTP:((rHigh*1.93)*100).toFixed(2)+'%', fairPayoutAt965:((TARGET/rHigh)-1).toFixed(4) },
      },
    });

  } catch(error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});