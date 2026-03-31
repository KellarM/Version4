import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── 32-card deck ──────────────────────────────────────────────────────────
const SUIT_COLOR = { D:'red', H:'red', S:'black', C:'black' };
const SUIT_LONG  = { D:'Diamonds', H:'Hearts', S:'Spades', C:'Clubs' };

const DECK32 = [
  {r:'A',s:'S'},{r:'9',s:'S'},{r:'8',s:'S'},{r:'6',s:'S'},{r:'5',s:'S'},{r:'4',s:'S'},{r:'3',s:'S'},{r:'2',s:'S'},
  {r:'K',s:'H'},{r:'Q',s:'H'},{r:'J',s:'H'},{r:'9',s:'H'},{r:'8',s:'H'},{r:'7',s:'H'},{r:'6',s:'H'},{r:'5',s:'H'},
  {r:'K',s:'D'},{r:'Q',s:'D'},{r:'J',s:'D'},{r:'10',s:'D'},{r:'9',s:'D'},{r:'4',s:'D'},{r:'3',s:'D'},{r:'2',s:'D'},
  {r:'A',s:'C'},{r:'10',s:'C'},{r:'8',s:'C'},{r:'7',s:'C'},{r:'6',s:'C'},{r:'5',s:'C'},{r:'4',s:'C'},{r:'2',s:'C'},
];

const FIXED_HANDS = [
  { id:'A', label:'A / 10', cards:[{r:'A',s:'D'},{r:'10',s:'H'}] },
  { id:'B', label:'A / 5',  cards:[{r:'A',s:'H'},{r:'5',s:'D'}] },
  { id:'C', label:'K / K',  cards:[{r:'K',s:'C'},{r:'K',s:'S'}] },
  { id:'D', label:'Q / J',  cards:[{r:'Q',s:'C'},{r:'J',s:'S'}] },
  { id:'E', label:'Q / 10', cards:[{r:'Q',s:'S'},{r:'10',s:'S'}] },
  { id:'F', label:'J / 9',  cards:[{r:'J',s:'C'},{r:'9',s:'C'}] },
  { id:'G', label:'8 / 6',  cards:[{r:'8',s:'D'},{r:'6',s:'D'}] },
  { id:'H', label:'7 / 7',  cards:[{r:'7',s:'D'},{r:'7',s:'S'}] },
  { id:'I', label:'4 / 2',  cards:[{r:'4',s:'H'},{r:'2',s:'H'}] },
  { id:'J', label:'3 / 3',  cards:[{r:'3',s:'C'},{r:'3',s:'H'}] },
];

const HAND_CARDS_SET = new Set(FIXED_HANDS.flatMap(h => h.cards.map(c=>`${c.r}${c.s}`)));
const COMMUNITY_DECK = DECK32.filter(c => !HAND_CARDS_SET.has(`${c.r}${c.s}`));

// ── Hand evaluator ────────────────────────────────────────────────────────
const RV = {'2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12};
const SV = {C:0,D:1,H:2,S:3};
function enc(r,s){ return RV[r]*4+SV[s]; }

// Returns [rankCategory (0-8), ...tiebreak ranks] as an array for full comparison
function eval5full(cards) {
  const rs = cards.map(c=>c>>2).sort((a,b)=>b-a);
  const ss = cards.map(c=>c&3);
  const flush = ss.every(s=>s===ss[0]);
  const uniq = new Set(rs);
  const isWheel = rs[0]===12&&rs[1]===3&&rs[2]===2&&rs[3]===1&&rs[4]===0;
  const straight = (rs[0]-rs[4]===4 && uniq.size===5) || isWheel;
  const straightTop = isWheel ? 3 : rs[0];
  if(flush&&straight) return [rs[0]===12&&rs[1]===11?8:7, straightTop];
  const cnt={};
  rs.forEach(r=>{cnt[r]=(cnt[r]||0)+1;});
  const g=Object.values(cnt).sort((a,b)=>b-a);
  // Sort ranks by group size desc, then rank desc for tiebreaking
  const sorted = Object.entries(cnt).map(([r,c])=>[parseInt(r),c]).sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
  const tb = sorted.map(x=>x[0]); // tiebreak sequence
  if(g[0]===4) return [6,...tb];
  if(g[0]===3&&g[1]===2) return [5,...tb];
  if(flush) return [4,...rs];
  if(straight) return [3, straightTop];
  if(g[0]===3) return [2,...tb];
  if(g[0]===2&&g[1]===2) return [1,...tb];
  if(g[0]===2) return [0,...tb];
  return [-1,...rs];
}

// Compare two hand value arrays lexicographically
function cmpHandVal(a,b){
  for(let i=0;i<Math.max(a.length,b.length);i++){
    const av=a[i]??-1, bv=b[i]??-1;
    if(av>bv) return 1;
    if(av<bv) return -1;
  }
  return 0;
}

const SKIP21=[];
for(let i=0;i<7;i++) for(let j=i+1;j<7;j++) SKIP21.push([i,j]);

function best7full(h0,h1,comm) {
  const all=[h0,h1,...comm];
  let best=null;
  for(const [si,sj] of SKIP21){
    const five=all.filter((_,i)=>i!==si&&i!==sj);
    const v=eval5full(five);
    if(best===null||cmpHandVal(v,best)>0) best=v;
  }
  return best;
}

const RANK_KEY_MAP={8:'Royal Flush',7:'Straight Flush',6:'4 Of A Kind',5:'Full House',4:'Flush',3:'Straight',2:'3 Of A Kind',1:'2 Pair',0:'1 Pair'};
const RANK_IDX_MAP={8:'A(ROYAL FLUSH)',7:'B(STRAIGHT FLUSH)',6:'C(4 OF A KIND)',5:'D(FULL HOUSE)',4:'E(FLUSH)',3:'F(straight)',2:'G(3 of a kind)',1:'H(2 Pair)',0:'I(1 Pair)'};

// Pre-encode hands
const ENC_HANDS = FIXED_HANDS.map(h=>[enc(h.cards[0].r,h.cards[0].s),enc(h.cards[1].r,h.cards[1].s)]);
const ENC_COMM  = COMMUNITY_DECK.map(c=>enc(c.r,c.s));
const N = ENC_COMM.length; // community deck size (should be 12)

// ── Combination index helpers ─────────────────────────────────────────────
// We enumerate C(N,5) combos by index using combinadic
function combFromIndex(idx, n, k) {
  // returns the k-combination at position idx in lex order
  const combo = [];
  let start = 0;
  for(let i=0;i<k;i++) {
    for(let c=start;c<n-(k-i-1);c++) {
      const ways = binom(n-c-1, k-i-1);
      if(idx < ways){ combo.push(c); start=c+1; break; }
      idx -= ways;
    }
  }
  return combo;
}

const BINOM_CACHE={};
function binom(n,k){
  if(k<0||k>n) return 0;
  if(k===0||k===n) return 1;
  const key=`${n}_${k}`;
  if(BINOM_CACHE[key]) return BINOM_CACHE[key];
  const v=binom(n-1,k-1)+binom(n-1,k);
  BINOM_CACHE[key]=v;
  return v;
}

const TOTAL_DEALS = binom(N, 5); // C(12,5) = 792

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(()=>({}));
    const batchStart = body.batchStart || 0;
    const batchSize  = Math.min(body.batchSize || TOTAL_DEALS, 1000);
    const batchEnd   = Math.min(batchStart + batchSize, TOTAL_DEALS);

    const RANK_COLS = ['Royal Flush','Straight Flush','4 Of A Kind','Full House','Flush','Straight','3 Of A Kind','2 Pair','1 Pair'];
    const COLOR_COLS = ['3R','4R','5R','3B','4B','5B'];

    const handRankMatrix = FIXED_HANDS.map(()=>Object.fromEntries(RANK_COLS.map(k=>[k,0])));
    const handColorMatrix = FIXED_HANDS.map(()=>Object.fromEntries(COLOR_COLS.map(k=>[k,0])));
    const handWinCount = new Array(FIXED_HANDS.length).fill(0);
    const rankTotals = Object.fromEntries(RANK_COLS.map(k=>[k,0]));
    const colorTotals = Object.fromEntries(COLOR_COLS.map(k=>[k,0]));

    const rows = [];

    for(let idx=batchStart; idx<batchEnd; idx++) {
      const ci = combFromIndex(idx, N, 5);
      const commEnc = ci.map(i=>ENC_COMM[i]);
      const commCards = ci.map(i=>COMMUNITY_DECK[i]);

      // Evaluate all 10 hands with full tiebreaker values
      const handVals = ENC_HANDS.map(([h0,h1])=>best7full(h0,h1,commEnc));
      // Find the best hand value across all hands
      let bestVal = handVals[0];
      for(let i=1;i<handVals.length;i++) if(cmpHandVal(handVals[i],bestVal)>0) bestVal=handVals[i];
      // ALL hands that exactly match the best value are co-winners
      const winnerIdxs = handVals.map((v,i)=>cmpHandVal(v,bestVal)===0?i:-1).filter(i=>i>=0);
      const rankCat = bestVal[0];
      const rankKey   = rankCat>=0 ? RANK_KEY_MAP[rankCat] : '1 Pair';
      const rankLabel = rankCat>=0 ? RANK_IDX_MAP[rankCat] : 'I(1 Pair)';
      const winnerLabels = winnerIdxs.map(i=>`${FIXED_HANDS[i].id}(${FIXED_HANDS[i].label})`).join(' / ');

      // Color board
      const reds = commCards.filter(c=>SUIT_COLOR[c.s]==='red').length;
      const blacks = 5-reds;
      const colorHits=[];
      if(reds>=3) for(let n=3;n<=reds;n++) colorHits.push(`${n}R`);
      if(blacks>=3) for(let n=3;n<=blacks;n++) colorHits.push(`${n}B`);

      // Tally — credit every tied winner
      for(const wi of winnerIdxs) {
        handWinCount[wi]++;
        if(rankKey) { handRankMatrix[wi][rankKey]++; }
        for(const ck of colorHits) { handColorMatrix[wi][ck]++; }
      }
      // Rank totals count once per deal (the rank occurred once)
      if(rankKey) rankTotals[rankKey]++;
      for(const ck of colorHits) colorTotals[ck]++;

      // Detail row — mark 1 for every tied winner
      const colorCols = Object.fromEntries(COLOR_COLS.map(k=>[k,colorHits.includes(k)?1:0]));
      const handCols  = Object.fromEntries(FIXED_HANDS.map((h,i)=>[`${h.id}(${h.label})`,winnerIdxs.includes(i)?1:0]));
      rows.push({
        c1r:commCards[0].r, c1s:SUIT_LONG[commCards[0].s],
        c2r:commCards[1].r, c2s:SUIT_LONG[commCards[1].s],
        c3r:commCards[2].r, c3s:SUIT_LONG[commCards[2].s],
        c4r:commCards[3].r, c4s:SUIT_LONG[commCards[3].s],
        c5r:commCards[4].r, c5s:SUIT_LONG[commCards[4].s],
        winningHand: winnerLabels,
        handRank: rankLabel,
        ...colorCols,
        ...handCols,
        'ALL HANDS': 1,
      });
    }

    return Response.json({
      success: true,
      totalDeals: TOTAL_DEALS,
      batchStart, batchEnd,
      done: batchEnd >= TOTAL_DEALS,
      rows,
      tally: { handRankMatrix, handColorMatrix, handWinCount, rankTotals, colorTotals },
      handLabels: FIXED_HANDS.map(h=>({ id:h.id, label:h.label })),
      rankCols: RANK_COLS,
      colorCols: COLOR_COLS,
    });

  } catch(error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});