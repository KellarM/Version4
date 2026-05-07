// ============================================================
// EXPLOIT HUNTER — Finds betting combinations that beat
// the house edge through correlated board outcomes.
// Tests all hand+rank pairings across 50K rounds and flags
// any position where observed RTP exceeds the target ceiling.
// ============================================================
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { CARDED_HAND_PAYOUTS, COLOR_BOARD_PAYOUTS, LOW_HIGH_PAYOUT } from '@/lib/payoutConstants';
import { PER_HAND_RANK_PAYOUTS } from '@/lib/perHandRankPayouts';

// ── Same deck/eval engine (minimal) ─────────────────────────
const RANK_LABELS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUIT_LABELS = ['clubs','diamonds','hearts','spades'];
function enc(r,s){return RANK_LABELS.indexOf(r)*4+SUIT_LABELS.indexOf(s);}
const HANDS_ENC=[
  [enc('A','diamonds'),enc('10','hearts')],[enc('K','clubs'),enc('K','spades')],
  [enc('Q','clubs'),enc('J','spades')],[enc('Q','spades'),enc('10','spades')],
  [enc('J','clubs'),enc('9','clubs')],[enc('8','diamonds'),enc('6','diamonds')],
  [enc('7','diamonds'),enc('7','spades')],[enc('4','hearts'),enc('2','hearts')],
  [enc('3','clubs'),enc('3','hearts')],[enc('A','hearts'),enc('5','diamonds')],
];
const PLAYER_SET=new Set(HANDS_ENC.flat());
const DECK32=[];
for(let r=0;r<13;r++) for(let s=0;s<4;s++){const c=r*4+s;if(!PLAYER_SET.has(c))DECK32.push(c);}
const B=14,B2=B*B,B3=B*B*B,B4=B*B*B*B,B5=B*B*B*B*B;
function eval5(c0,c1,c2,c3,c4){
  const r=[c0>>2,c1>>2,c2>>2,c3>>2,c4>>2].sort((a,b)=>b-a);
  const[a,b,c,d,e]=r;
  const fl=(c0&3)===(c1&3)&&(c1&3)===(c2&3)&&(c2&3)===(c3&3)&&(c3&3)===(c4&3);
  const cnt=new Int8Array(13);r.forEach(v=>cnt[v]++);
  const wh=a===12&&b===3&&c===2&&d===1&&e===0;
  const st=wh||(new Set(r).size===5&&a-e===4);const sh=wh?3:a;
  if(fl&&st)return a===12&&b===11?9*B5:8*B5+sh;
  const g=[];for(let v=12;v>=0;v--)if(cnt[v])g.push([v,cnt[v]]);
  g.sort((x,y)=>y[1]-x[1]||y[0]-x[0]);
  const mx=g[0][1],sc=g.length>1?g[1][1]:0;
  if(mx===4)return 7*B5+g[0][0]*B4+g[1][0];
  if(mx===3&&sc===2)return 6*B5+g[0][0]*B4+g[1][0];
  if(fl)return 5*B5+a*B4+b*B3+c*B2+d*B+e;
  if(st)return 4*B5+sh;
  if(mx===3)return 3*B5+g[0][0]*B4+g[1][0]*B3+g[2][0]*B2;
  if(mx===2&&sc===2)return 2*B5+g[0][0]*B4+g[1][0]*B3+g[2][0]*B2;
  if(mx===2)return 1*B5+g[0][0]*B4+g[1][0]*B3+g[2][0]*B2+g[3][0]*B;
  return a*B4+b*B3+c*B2+d*B+e;
}
function best7(h0,h1,b0,b1,b2,b3,b4){
  const all=[h0,h1,b0,b1,b2,b3,b4];let best=-1;
  for(let i=0;i<3;i++)for(let j=i+1;j<4;j++)for(let k=j+1;k<5;k++)
    for(let l=k+1;l<6;l++)for(let m=l+1;m<7;m++){const s=eval5(all[i],all[j],all[k],all[l],all[m]);if(s>best)best=s;}
  return best;
}
function rankCat(s){return Math.floor(s/B5)-1;}
const RANK_CAT_MAP={'High Card':-1,'One Pair':0,'Two Pair':1,'Three of a Kind':2,'Straight':3,'Flush':4,'Full House':5,'Four of a Kind':6,'Straight Flush':7,'Royal Flush':8};

function deal(){
  const d=[...DECK32];for(let i=31;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
  return [d[1],d[2],d[3],d[5],d[7]];
}

function evalAllHandStrengths(b0,b1,b2,b3,b4){
  const str=HANDS_ENC.map(h=>best7(h[0],h[1],b0,b1,b2,b3,b4));
  const best=Math.max(...str);
  const winners=str.map(s=>s===best?1:0);
  const count=winners.reduce((a,b)=>a+b,0);
  return{str,best,winners,count};
}

// ── Build all 70 test positions ───────────────────────────────
function buildTestPositions() {
  const positions = [];
  for (let i=1;i<=10;i++) {
    positions.push({ type:'hand', key:String(i), label:`Hand ${i}`, payout: CARDED_HAND_PAYOUTS[i-1], handIdx:i-1 });
  }
  for (let hId=1;hId<=10;hId++) {
    for (const [rName,payout] of Object.entries(PER_HAND_RANK_PAYOUTS[hId]||{})) {
      const rCat=RANK_CAT_MAP[rName]??-99;
      positions.push({ type:'perHandRank', key:`${hId}:${rName}`, label:`H${hId} ${rName}`, payout, handIdx:hId-1, rCat });
    }
  }
  for (const [key,payout] of Object.entries(COLOR_BOARD_PAYOUTS)) {
    positions.push({ type:'color', key, label:key.endsWith('R')?`${key[0]} Red`:`${key[0]} Black`, payout, thr:parseInt(key[0]), isRed:key[1]==='R' });
  }
  positions.push({ type:'lh', key:'LOW',  label:'River LOW',  payout:LOW_HIGH_PAYOUT });
  positions.push({ type:'lh', key:'HIGH', label:'River HIGH', payout:LOW_HIGH_PAYOUT });
  return positions;
}

const TEST_POSITIONS = buildTestPositions();

function runExploitScan(rounds, rtpCeiling) {
  // Accumulate wins/wagered per position
  const wins   = new Float64Array(TEST_POSITIONS.length);
  const wagered = new Float64Array(TEST_POSITIONS.length);
  const handWins = new Float64Array(TEST_POSITIONS.length); // for adaptive denom

  for (let round=0; round<rounds; round++) {
    const [b0,b1,b2,b3,b4]=deal();
    const {str,winners,count}=evalAllHandStrengths(b0,b1,b2,b3,b4);
    const isBoardWin=count===10;
    let reds=0;
    [b0,b1,b2,b3,b4].forEach(c=>{if((c&3)===1||(c&3)===2)reds++;});
    const isLow=(b4>>2)<=5;

    for (let pi=0; pi<TEST_POSITIONS.length; pi++) {
      const pos=TEST_POSITIONS[pi];
      wagered[pi]+=100;
      let won=false;

      if (pos.type==='hand') {
        if (!isBoardWin && winners[pos.handIdx]===1) won=true;
      } else if (pos.type==='perHandRank') {
        if (!isBoardWin && winners[pos.handIdx]===1) {
          handWins[pi]++;
          if (rankCat(str[pos.handIdx])===pos.rCat) won=true;
        }
      } else if (pos.type==='color') {
        if ((pos.isRed?reds:5-reds)>=pos.thr) won=true;
      } else if (pos.type==='lh') {
        if (pos.key==='LOW'?isLow:!isLow) won=true;
      }

      if (won) wins[pi]++;
    }
  }

  return TEST_POSITIONS.map((pos, pi) => {
    const denom = pos.type==='perHandRank' ? (handWins[pi]||1) : rounds;
    const winFreq = wins[pi]/denom;
    const rtp = pos.type==='perHandRank'
      ? winFreq*(pos.payout+1)*100
      : (wagered[pi]>0?(wins[pi]*(pos.payout+1)*100)/rounds:0);
    const flagged = rtp > rtpCeiling;
    return {
      ...pos,
      wins: wins[pi],
      winFreq: (winFreq*100).toFixed(4),
      rtp: rtp.toFixed(2),
      flagged,
      severity: rtp > rtpCeiling+2 ? 'high' : rtp > rtpCeiling+0.5 ? 'medium' : 'low',
    };
  });
}

export default function ExploitHunter({ onClose }) {
  const [rounds, setRounds]       = useState(50000);
  const [rtpCeiling, setRtpCeiling] = useState(98.5);
  const [results, setResults]     = useState(null);
  const [running, setRunning]     = useState(false);

  function run() {
    setRunning(true); setResults(null);
    setTimeout(() => {
      const res = runExploitScan(rounds, rtpCeiling);
      setResults(res);
      setRunning(false);
    }, 50);
  }

  const flagged   = results?.filter(r=>r.flagged) ?? [];
  const clean     = results?.filter(r=>!r.flagged) ?? [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-4"
      >
        <motion.div
          initial={{scale:0.95,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}}
          className="w-full max-w-4xl bg-slate-950 border border-red-700/30 rounded-2xl shadow-2xl"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Exploit Hunter</h2>
                <p className="text-xs text-slate-400">Scans all 70 bet positions for RTP ceiling violations</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors text-lg font-bold">×</button>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap gap-4 items-end mb-6">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Rounds</label>
                <select value={rounds} onChange={e=>setRounds(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2">
                  <option value={10000}>10,000 (fast)</option>
                  <option value={50000}>50,000</option>
                  <option value={100000}>100,000</option>
                  <option value={250000}>250,000</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">RTP Ceiling (%)</label>
                <select value={rtpCeiling} onChange={e=>setRtpCeiling(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2">
                  <option value={98}>98.0%</option>
                  <option value={98.5}>98.5%</option>
                  <option value={99}>99.0%</option>
                  <option value={100}>100% (must-win only)</option>
                </select>
              </div>
              <button onClick={run} disabled={running}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-900/40 border border-red-700 text-white font-bold text-sm hover:bg-red-900/60 transition-colors disabled:opacity-50">
                {running?<><RefreshCw className="w-4 h-4 animate-spin"/>Scanning...</>:<><Search className="w-4 h-4"/>Run Scan</>}
              </button>
            </div>

            {results && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700">
                    <div className="text-xs text-slate-400">Positions Scanned</div>
                    <div className="text-xl font-bold text-white">{results.length}</div>
                  </div>
                  <div className={`rounded-lg p-3 border ${flagged.length>0?'bg-red-900/20 border-red-700/40':'bg-green-900/20 border-green-700/40'}`}>
                    <div className="text-xs text-slate-400">Violations Found</div>
                    <div className={`text-xl font-bold ${flagged.length>0?'text-red-400':'text-green-400'}`}>{flagged.length}</div>
                  </div>
                  <div className="bg-green-900/20 rounded-lg p-3 border border-green-700/40">
                    <div className="text-xs text-slate-400">Clean Positions</div>
                    <div className="text-xl font-bold text-green-400">{clean.length}</div>
                  </div>
                </div>

                {flagged.length > 0 && (
                  <div className="mb-5">
                    <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">⚠ Violations — RTP above {rtpCeiling}% ceiling</div>
                    <div className="space-y-2">
                      {flagged.sort((a,b)=>parseFloat(b.rtp)-parseFloat(a.rtp)).map(r=>(
                        <div key={r.key} className="flex items-center justify-between bg-red-950/30 border border-red-800/40 rounded-lg px-4 py-2">
                          <div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded mr-2 ${r.severity==='high'?'bg-red-700 text-white':r.severity==='medium'?'bg-orange-700 text-white':'bg-yellow-700 text-white'}`}>
                              {r.severity.toUpperCase()}
                            </span>
                            <span className="text-sm text-white">{r.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-red-300">{r.rtp}% RTP</span>
                            <span className="text-xs text-slate-500 ml-2">({r.winFreq}% win)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {flagged.length === 0 && (
                  <div className="flex items-center gap-3 bg-green-900/20 border border-green-700/40 rounded-xl px-5 py-4 mb-5">
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-green-300">No violations detected</div>
                      <div className="text-xs text-slate-400">All {results.length} positions are within the {rtpCeiling}% RTP ceiling</div>
                    </div>
                  </div>
                )}

                {/* Full table */}
                <div className="rounded-lg overflow-hidden border border-slate-700/50">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-800/80 text-slate-400">
                        <th className="text-left px-3 py-2">Position</th>
                        <th className="text-right px-3 py-2">Win %</th>
                        <th className="text-right px-3 py-2">RTP</th>
                        <th className="text-right px-3 py-2">Live Odds</th>
                        <th className="text-center px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {results.sort((a,b)=>parseFloat(b.rtp)-parseFloat(a.rtp)).map(r=>(
                        <tr key={r.key} className={r.flagged?'bg-red-950/20':''}>
                          <td className="px-3 py-1.5 text-slate-300">{r.label}</td>
                          <td className="px-3 py-1.5 text-right text-slate-400">{r.winFreq}%</td>
                          <td className={`px-3 py-1.5 text-right font-bold ${r.flagged?'text-red-400':'text-green-400'}`}>{r.rtp}%</td>
                          <td className="px-3 py-1.5 text-right text-slate-400">{r.payout}:1</td>
                          <td className="px-3 py-1.5 text-center">
                            {r.flagged
                              ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 mx-auto"/>
                              : <CheckCircle2 className="w-3.5 h-3.5 text-green-500/60 mx-auto"/>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
