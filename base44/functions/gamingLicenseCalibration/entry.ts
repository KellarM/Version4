import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Gaming License Calibration — runs a single batch chunk using REAL deal simulation
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const BATCH_SIZE = Math.min(body.batchSize || 100_000, 100_000);
    const runIndex = body.runIndex || 0;

    // ── Payout Tables ────────────────────────────────────────────────
    const HAND_PAYOUTS = [14.50, 4.25, 11.00, 6.75, 5.75, 4.50, 4.50, 4.75, 4.25, 9.50];

    const RANK_KEYS = ['One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush'];
    const RANK_PAYOUTS = [158.0, 16.50, 4.00, 5.00, 3.25, 2.50, 12.25, 255.00];

    // Probability of each rank occurring in a 32-card deck (Used for Theo RTP calculation)
    const RANK_PROBS = [
      0.413,   // One Pair
      0.047,   // Two Pair
      0.022,   // Three of a Kind
      0.005,   // Straight
      0.004,   // Flush
      0.003,   // Full House
      0.0006,  // Four of a Kind
      0.0001   // Straight Flush
    ];

    const COLOR_KEYS = ['3R','3B','4R','4B','5R','5B'];
    const COLOR_PAYOUTS = { '3R': 0.90, '3B': 0.90, '4R': 4.50, '4B': 4.50, '5R': 42.0, '5B': 42.0 };
    const LH_PAYOUT = 0.92;
    const COLOR_WIN_PROBS = { '3R': 0.5, '3B': 0.5, '4R': 0.1875, '4B': 0.1875, '5R': 0.03125, '5B': 0.03125 };

    // ── Real 32-card deck simulation ─────────────────────────────────
    const RV = {'2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12};
    const SV = { clubs:0, diamonds:1, hearts:2, spades:3 };
    function enc(rank, suit) { return RV[rank]*4 + SV[suit]; }

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

    const HANDS = [
      [enc('A','diamonds'),enc('10','hearts')],
      [enc('K','clubs'),enc('K','spades')],
      [enc('Q','clubs'),enc('J','spades')],
      [enc('Q','spades'),enc('10','spades')],
      [enc('J','clubs'),enc('9','clubs')],
      [enc('8','diamonds'),enc('6','diamonds')],
      [enc('7','diamonds'),enc('7','spades')],
      [enc('4','hearts'),enc('2','hearts')],
      [enc('3','clubs'),enc('3','hearts')],
      [enc('A','hearts'),enc('5','diamonds')],
    ];

    function eval5(c0,c1,c2,c3,c4) {
      const r0=c0>>2,r1=c1>>2,r2=c2>>2,r3=c3>>2,r4=c4>>2;
      const s0=c0&3,s1=c1&3,s2=c2&3,s3=c3&3,s4=c4&3;
      const flush=(s0===s1&&s1===s2&&s2===s3&&s3===s4);
      let a=r0,b=r1,c=r2,d=r3,e=r4,t;
      if(a<b){t=a;a=b;b=t;} if(a<c){t=a;a=c;c=t;} if(a<d){t=a;a=d;d=t;} if(a<e){t=a;a=e;e=t;}
      if(b<c){t=b;b=c;c=t;} if(b<d){t=b;b=d;d=t;} if(b<e){t=b;b=e;e=t;}
      if(c<d){t=c;c=d;d=t;} if(c<e){t=c;c=e;e=t;} if(d<e){t=d;d=e;e=t;}
      const str=(a-e===4&&a!==b&&b!==c&&c!==d&&d!==e)||(a===12&&b===3&&c===2&&d===1&&e===0);
      if(flush&&str) return a===12&&b===8?8:7;
      let p=0,tr=0,q=0,cur=a,run=1;
      for(let i=1;i<5;i++){const v=[b,c,d,e][i-1];if(v===cur){run++;}else{if(run===4)q++;else if(run===3)tr++;else if(run===2)p++;cur=v;run=1;}}
      if(run===4)q++;else if(run===3)tr++;else if(run===2)p++;
      if(q)return 6; if(tr&&p)return 5; if(flush)return 4; if(str)return 3; if(tr)return 2; if(p===2)return 1; if(p===1)return 0;
      return -1;
    }

    const SKIP_PAIRS=[];
    for(let i=0;i<7;i++)for(let j=i+1;j<7;j++)SKIP_PAIRS.push([i,j]);
    const allCards=new Int8Array(7);
    function best7(h0,h1,c0,c1,c2,c3,c4){
      allCards[0]=h0;allCards[1]=h1;allCards[2]=c0;allCards[3]=c1;allCards[4]=c2;allCards[5]=c3;allCards[6]=c4;
      let best=-2;
      for(let p=0;p<21;p++){
        const[si,sj]=SKIP_PAIRS[p];
        const five=[];for(let i=0;i<7;i++)if(i!==si&&i!==sj)five.push(allCards[i]);
        const r=eval5(five[0],five[1],five[2],five[3],five[4]);
        if(r>best)best=r;
      }
      return best;
    }

    const deck=new Int8Array(DECK32);
    function shuffle(){
      for(let i=31;i>0;i--){const j=(Math.random()*(i+1))|0;const t=deck[i];deck[i]=deck[j];deck[j]=t;}
    }

    function countRed(c0,c1,c2,c3,c4){
      let r=0;
      const cards=[c0,c1,c2,c3,c4];
      for(const c of cards){const s=c&3;if(s===1||s===2)r++;}
      return r;
    }

    // Strategies Pool
    const STRAT_POOL = [
      { hands:[1,6], ranks:[2,6], colors:[], river:'strict4' },
      { hands:[0,2,3,1], ranks:[0], colors:[], river:'strict4' },
      { hands:[0,1], ranks:[0,1], colors:[], river:'strict4' },
      { hands:[1,6], ranks:[2,6], colors:['3R','4R','3B','4B'], river:'strict4' },
      { hands:[0,2,3,1], ranks:[0], colors:['3R','4R','3B','4B'], river:'strict4' },
      { hands:[0,1], ranks:[0,1], colors:['3R','4R','3B','4B'], river:'strict4' },
      { hands:[1,6], ranks:[2,6], colors:['3R','4R'], river:'strict4' },
      { hands:[0,1], ranks:[0,1], colors:['3B','4B'], river:'none' },
      { hands:[1,6], ranks:[2,6], colors:['3B'], river:'none' },
      { hands:[0,1], ranks:[0,1], colors:['3R'], river:'none' },
      { hands:[3,4], ranks:[4], colors:['3B','4B','5B'], river:'when3' },
      { hands:[3,4], ranks:[4], colors:['3B','4B'], river:'when3' },
      { hands:[3,4], ranks:[4], colors:['3B'], river:'when3' },
      { hands:[3,4], ranks:[4], colors:['3B','4B','5B'], river:'none' },
      { hands:[3], ranks:[4], colors:['3B','4B','5B'], river:'when3' },
      { hands:[4], ranks:[4], colors:['3B','4B'], river:'when3' },
      { hands:[5,7], ranks:[4], colors:['3R','4R','5R'], river:'when3' },
      { hands:[5,7], ranks:[4], colors:['3R','4R'], river:'when3' },
      { hands:[5,7], ranks:[4], colors:['3R'], river:'when3' },
      { hands:[5,7], ranks:[4], colors:['3R','4R','5R'], river:'none' },
      { hands:[5], ranks:[4], colors:['3R','4R','5R'], river:'when3' },
      { hands:[7], ranks:[4], colors:['3R','4R'], river:'when3' },
      { hands:[0,9], ranks:[3], colors:[], river:'strict4' },
      { hands:[2,3], ranks:[3], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { hands:[3,4], ranks:[3], colors:['3R','4R','3B','4B'], river:'strict4' },
      { hands:[4,5], ranks:[3], colors:['3R','4R'], river:'strict4' },
      { hands:[5,7], ranks:[3], colors:['3B','4B'], river:'strict4' },
      { hands:[0,9], ranks:[3], colors:['3R'], river:'strict4' },
      { hands:[2,3], ranks:[3], colors:['3B'], river:'strict4' },
      { hands:[3,4], ranks:[3], colors:[], river:'none' },
      { hands:[4,5], ranks:[3], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { hands:[5,7], ranks:[3], colors:['3R','4R','3B','4B'], river:'none' },
      { hands:[0,9], ranks:[3], colors:['3R','4R'], river:'none' },
      { hands:[2,3], ranks:[3], colors:['3B','4B'], river:'none' },
      { hands:[3,4], ranks:[3], colors:['3R'], river:'none' },
      { hands:[4,5], ranks:[3], colors:['3B'], river:'none' },
      { hands:[0], ranks:[], colors:[], river:'none' },
      { hands:[1], ranks:[], colors:[], river:'none' },
      { hands:[2], ranks:[], colors:[], river:'none' },
      { hands:[3], ranks:[], colors:[], river:'none' },
      { hands:[4], ranks:[], colors:[], river:'none' },
      { hands:[5], ranks:[], colors:[], river:'none' },
      { hands:[6], ranks:[], colors:[], river:'none' },
      { hands:[7], ranks:[], colors:[], river:'none' },
      { hands:[8], ranks:[], colors:[], river:'none' },
      { hands:[9], ranks:[], colors:[], river:'none' },
      { hands:[0], ranks:[0,1], colors:[], river:'none' },
      { hands:[1], ranks:[0,1], colors:[], river:'none' },
      { hands:[2], ranks:[0], colors:[], river:'none' },
      { hands:[3], ranks:[0], colors:[], river:'none' },
      { hands:[4], ranks:[0], colors:[], river:'none' },
      { hands:[0,1,2,9], ranks:[0], colors:[], river:'none' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R','4R','3B','4B'], river:'none' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R','4R'], river:'none' },
      { hands:[0,1,2,9], ranks:[0], colors:['3B','4B'], river:'strict4' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R'], river:'strict4' },
      { hands:[0,1,2,9], ranks:[0], colors:['3B'], river:'strict4' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R','4R','3B','4B'], river:'when3' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R'], river:'when3' },
      { hands:[0,1,2,9], ranks:[0], colors:['3B'], river:'random' },
      { hands:[0,1,2,9], ranks:[0], colors:['3R','4R'], river:'random' },
      { hands:[0,2,3,4], ranks:[0], colors:[], river:'none' },
      { hands:[0,2,3,4], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { hands:[0,2,3,4], ranks:[0], colors:['3R','3B'], river:'when3' },
      { hands:[0,2,3,4], ranks:[0], colors:['3R'], river:'random' },
      { hands:[0,5,7,9], ranks:[0], colors:[], river:'none' },
      { hands:[0,5,7,9], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { hands:[0,5,7,9], ranks:[0], colors:['3R','3B'], river:'when3' },
      { hands:[0,5,7,9], ranks:[0], colors:['3B'], river:'random' },
      { hands:[0,2,3,4], ranks:[], colors:[], river:'none' },
      { hands:[0,2,3,4], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { hands:[0,2,3,4], ranks:[], colors:['3R','3B'], river:'when3' },
      { hands:[0,5,7,9], ranks:[], colors:['3R','4R','3B','4B'], river:'random' },
      { hands:[], ranks:[1,6], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { hands:[], ranks:[1,6], colors:['3R','4R','3B','4B'], river:'when3' },
      { hands:[], ranks:[1,6], colors:['3R','3B'], river:'random' },
      { hands:[], ranks:[1,6], colors:['3R'], river:'none' },
      { hands:[], ranks:[1,6], colors:['3B'], river:'strict4' },
      { hands:[], ranks:[1,6], colors:[], river:'when3' },
      { hands:[], ranks:[1,6], colors:[], river:'none' },
      { hands:[], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { hands:[], ranks:[], colors:['3R','4R','3B','4B'], river:'none' },
      { hands:[], ranks:[], colors:['3R','3B'], river:'none' },
      { hands:[], ranks:[], colors:['3R'], river:'strict4' },
      { hands:[], ranks:[], colors:['3B'], river:'when3' },
      { hands:[], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { hands:[], ranks:[0], colors:[], river:'none' },
      { hands:[], ranks:[0], colors:[], river:'strict4' },
      { hands:[], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { hands:[], ranks:[0], colors:['3R','4R','3B','4B'], river:'random' },
      { hands:[], ranks:[0], colors:['3R'], river:'none' },
      { hands:[], ranks:[0], colors:['3B'], river:'strict4' },
      { hands:[], ranks:[0,7], colors:[], river:'none' },
      { hands:[], ranks:[0,7], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { hands:[], ranks:[0,7], colors:['3R','4R','3B','4B'], river:'when3' },
      { hands:[], ranks:[0,7], colors:['3R'], river:'random' },
      { hands:[], ranks:[6,5,2,1], colors:[], river:'none' },
      { hands:[], ranks:[6,5,2,1], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { hands:[], ranks:[6,5,2,1], colors:['3R','4R','3B','4B'], river:'when3' },
      { hands:[], ranks:[6,5,2,1], colors:['3R'], river:'random' },
      { hands:[], ranks:[6,5,2,1], colors:['3B'], river:'none' },
    ];

    const N = BATCH_SIZE;
    const BET = 25;

    let handBet=0,handPay=0,rankBet=0,rankPay=0,colorBet=0,colorPay=0,lhBet=0,lhPay=0;
    const handTypeBet=new Float64Array(10),handTypePay=new Float64Array(10);
    const rankTypeBet=new Float64Array(8),rankTypePay=new Float64Array(8);
    const colorTypeBet={};COLOR_KEYS.forEach(k=>{colorTypeBet[k]=0;});
    const colorTypePay={};COLOR_KEYS.forEach(k=>{colorTypePay[k]=0;});

    for(let g=0;g<N;g++){
      shuffle();
      const c0=deck[0],c1=deck[1],c2=deck[2],c3=deck[3],c4=deck[4];

      let topScore=-2;
      const scores=new Array(10);
      for(let h=0;h<10;h++){
        const s=best7(HANDS[h][0],HANDS[h][1],c0,c1,c2,c3,c4);
        scores[h]=s;
        if(s>topScore){topScore=s;}
      }
      const rankIdx = topScore; 

      const redCount=countRed(c0,c1,c2,c3,c4);
      const blackCount=5-redCount;
      const riverIsLow=(c4>>2)<=5;
      const lowShowing=(Math.random()*5)|0;
      const highShowing=4-lowShowing;

      const strat=STRAT_POOL[(g*7+runIndex*3)%STRAT_POOL.length];

      for(let i=0;i<strat.hands.length;i++){
        const h=strat.hands[i];
        handBet+=BET; handTypeBet[h]+=BET;
        if(scores[h]===topScore){
          const p=BET*(1+HAND_PAYOUTS[h]);
          handPay+=p; handTypePay[h]+=p;
        }
      }

      for(let i=0;i<strat.ranks.length;i++){
        const ri=strat.ranks[i];
        rankBet+=BET; rankTypeBet[ri]+=BET;
        if(ri===rankIdx){
          const p=BET*(1+RANK_PAYOUTS[ri]);
          rankPay+=p; rankTypePay[ri]+=p;
        }
      }

      for(let i=0;i<strat.colors.length;i++){
        const cKey=strat.colors[i];
        const cCount=parseInt(cKey[0]);
        const isRed=cKey[1]==='R';
        colorBet+=BET; colorTypeBet[cKey]+=BET;
        if(isRed?redCount>=cCount:blackCount>=cCount){
          const p=BET*(1+COLOR_PAYOUTS[cKey]);
          colorPay+=p; colorTypePay[cKey]+=p;
        }
      }

      if(strat.river!=='none'){
        let shouldBet=false,betLow=false;
        if(strat.river==='strict4'){if(lowShowing>=4){shouldBet=true;betLow=false;}else if(highShowing>=4){shouldBet=true;betLow=true;}}
        else if(strat.river==='when3'){if(lowShowing>=3||highShowing>=3){shouldBet=true;betLow=lowShowing>highShowing;}}
        else if(strat.river==='random'){shouldBet=true;betLow=Math.random()<0.5;}
        if(shouldBet){
          lhBet+=BET;
          const won=betLow?riverIsLow:!riverIsLow;
          if(won)lhPay+=BET*(1+LH_PAYOUT);
        }
      }
    }

    const totalBet=handBet+rankBet+colorBet+lhBet;
    const totalPay=handPay+rankPay+colorPay+lhPay;
    const rtp=totalBet>0?totalPay/totalBet:0;

    const handBreakdown=HAND_PAYOUTS.map((payout,i)=>({
      id:i+1,payout,
      bet:Math.round(handTypeBet[i]),paid:Math.round(handTypePay[i]),
      rtp:handTypeBet[i]>0?(handTypePay[i]/handTypeBet[i]*100).toFixed(3):'N/A',
      theoreticalRTP:((1/10)*(1+payout)*100).toFixed(3),
    }));

    // UPDATED RANK BREAKDOWN LOGIC
    const rankBreakdown = RANK_KEYS.map((name, i) => {
      const payout = RANK_PAYOUTS[i];
      const actualRTP = rankTypeBet[i] > 0 ? (rankTypePay[i] / rankTypeBet[i] * 100) : 0;
      
      const theoRTP = (RANK_PROBS[i] * (1 + payout) * 100).toFixed(3);
      const frequency = (RANK_PROBS[i] * 100).toFixed(2);

      return {
        name,
        payout,
        isProgressive: false,
        bet: Math.round(rankTypeBet[i]),
        paid: Math.round(rankTypePay[i]),
        rtp: actualRTP.toFixed(3),
        theoreticalRTP: theoRTP,
        freq: frequency
      };
    });

    const colorBreakdown=COLOR_KEYS.map(k=>({
      key:k,payout:COLOR_PAYOUTS[k],winProb:(COLOR_WIN_PROBS[k]*100).toFixed(3),
      bet:Math.round(colorTypeBet[k]),paid:Math.round(colorTypePay[k]),
      rtp:colorTypeBet[k]>0?(colorTypePay[k]/colorTypeBet[k]*100).toFixed(3):'N/A',
      theoreticalRTP:(COLOR_WIN_PROBS[k]*(1+COLOR_PAYOUTS[k])*100).toFixed(3),
    }));

    return Response.json({
      success:true,batchSize:N,runIndex,
      raw:{
        totalBet:Math.round(totalBet),totalPay:Math.round(totalPay),
        handBet:Math.round(handBet),handPay:Math.round(handPay),
        rankBet:Math.round(rankBet),rankPay:Math.round(rankPay),
        fixedRankBet:Math.round(rankBet),fixedRankPay:Math.round(rankPay),
        progRankBet:0,progRankPay:0,
        colorBet:Math.round(colorBet),colorPay:Math.round(colorPay),
        lhBet:Math.round(lhBet),lhPay:Math.round(lhPay),
      },
      rtp:(rtp*100).toFixed(4),
      compliant:rtp>=0.95&&rtp<=0.98,
      breakdown:{hands:handBreakdown,ranks:rankBreakdown,colors:colorBreakdown,lhTheoretical:(0.5*(1+LH_PAYOUT)*100).toFixed(3),lhRTP:lhBet>0?(lhPay/lhBet*100).toFixed(3):'N/A'},
    });

  } catch(error){
    return Response.json({error:error.message},{status:500});
  }
});