// ============================================================
// EXPLOIT HUNTER
// Scans all 70 bet positions for RTP ceiling violations.
// Plain-English explanation of every finding.
// Full CSV export of every position's stats.
// ============================================================
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, Download, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { CARDED_HAND_PAYOUTS, COLOR_BOARD_PAYOUTS, LOW_HIGH_PAYOUT } from '@/lib/payoutConstants';
import { PER_HAND_RANK_PAYOUTS } from '@/lib/perHandRankPayouts';

// ── Same deck/eval engine ─────────────────────────────────────
const RL=['2','3','4','5','6','7','8','9','10','J','Q','K','A'],SL=['clubs','diamonds','hearts','spades'];
function enc(r,s){return RL.indexOf(r)*4+SL.indexOf(s);}
const HE=[[enc('A','diamonds'),enc('10','hearts')],[enc('K','clubs'),enc('K','spades')],[enc('Q','clubs'),enc('J','spades')],[enc('Q','spades'),enc('10','spades')],[enc('J','clubs'),enc('9','clubs')],[enc('8','diamonds'),enc('6','diamonds')],[enc('7','diamonds'),enc('7','spades')],[enc('4','hearts'),enc('2','hearts')],[enc('3','clubs'),enc('3','hearts')],[enc('A','hearts'),enc('5','diamonds')]];
const PS=new Set(HE.flat()),D32=[];
for(let r=0;r<13;r++)for(let s=0;s<4;s++){const c=r*4+s;if(!PS.has(c))D32.push(c);}
const B=14,B2=B*B,B3=B*B*B,B4=B*B*B*B,B5=B*B*B*B*B;
function e5(c0,c1,c2,c3,c4){const r=[c0>>2,c1>>2,c2>>2,c3>>2,c4>>2].sort((a,b)=>b-a);const[a,b,c,d,e]=r;const fl=(c0&3)===(c1&3)&&(c1&3)===(c2&3)&&(c2&3)===(c3&3)&&(c3&3)===(c4&3);const cnt=new Int8Array(13);r.forEach(v=>cnt[v]++);const wh=a===12&&b===3&&c===2&&d===1&&e===0,st=wh||(new Set(r).size===5&&a-e===4),sh=wh?3:a;if(fl&&st)return a===12&&b===11?9*B5:8*B5+sh;const g=[];for(let v=12;v>=0;v--)if(cnt[v])g.push([v,cnt[v]]);g.sort((x,y)=>y[1]-x[1]||y[0]-x[0]);const mx=g[0][1],sc=g.length>1?g[1][1]:0;if(mx===4)return 7*B5+g[0][0]*B4+g[1][0];if(mx===3&&sc===2)return 6*B5+g[0][0]*B4+g[1][0];if(fl)return 5*B5+a*B4+b*B3+c*B2+d*B+e;if(st)return 4*B5+sh;if(mx===3)return 3*B5+g[0][0]*B4+g[1][0]*B3+g[2][0]*B2;if(mx===2&&sc===2)return 2*B5+g[0][0]*B4+g[1][0]*B3+g[2][0]*B2;if(mx===2)return 1*B5+g[0][0]*B4+g[1][0]*B3+g[2][0]*B2+g[3][0]*B;return a*B4+b*B3+c*B2+d*B+e;}
function b7(h0,h1,b0,b1,b2,b3,b4){const all=[h0,h1,b0,b1,b2,b3,b4];let best=-1;for(let i=0;i<3;i++)for(let j=i+1;j<4;j++)for(let k=j+1;k<5;k++)for(let l=k+1;l<6;l++)for(let m=l+1;m<7;m++){const s=e5(all[i],all[j],all[k],all[l],all[m]);if(s>best)best=s;}return best;}
function rc(s){return Math.floor(s/B5)-1;}
const RCM={'High Card':-1,'One Pair':0,'Two Pair':1,'Three of a Kind':2,'Straight':3,'Flush':4,'Full House':5,'Four of a Kind':6,'Straight Flush':7,'Royal Flush':8};
function _sri(max){if(max===0)return 0;let mask=1;while(mask<=max)mask=(mask<<1)|1;const a=new Uint32Array(1);let v;do{if(typeof crypto!=='undefined'&&crypto.getRandomValues){crypto.getRandomValues(a);v=a[0]&mask;}else{return(Math.random()*(max+1))|0;}}while(v>max);return v;}
function deal(){const d=[...D32];for(let i=31;i>0;i--){const j=_sri(i);[d[i],d[j]]=[d[j],d[i]];}return[d[1],d[2],d[3],d[5],d[7]];}
function evalWinners(b0,b1,b2,b3,b4){const str=HE.map(h=>b7(h[0],h[1],b0,b1,b2,b3,b4));const best=Math.max(...str);const winners=str.map(s=>s===best?1:0);return{str,winners,count:winners.reduce((a,b)=>a+b,0)};}

// ── Build all 70 positions ────────────────────────────────────
const HAND_NAMES=['A♦10♥','K♣K♠','Q♣J♠','Q♠10♠','J♣9♣','8♦6♦','7♦7♠','4♥2♥','3♣3♥','A♥5♦'];

function buildPositions() {
  const positions = [];
  for (let i=1;i<=10;i++) {
    positions.push({
      type:'hand', key:String(i),
      group:'Carded Hands',
      label:`Hand ${i} (${HAND_NAMES[i-1]})`,
      shortLabel:`H${i}`,
      payout: CARDED_HAND_PAYOUTS[i-1],
      handIdx:i-1,
    });
  }
  for (let hId=1;hId<=10;hId++) {
    for (const [rName,payout] of Object.entries(PER_HAND_RANK_PAYOUTS[hId]||{})) {
      const rCat=RCM[rName]??-99;
      positions.push({
        type:'perHandRank', key:`${hId}:${rName}`,
        group:'Hand Ranks',
        label:`Hand ${hId} (${HAND_NAMES[hId-1]}) — ${rName}`,
        shortLabel:`H${hId}:${rName}`,
        payout, handIdx:hId-1, rCat,
      });
    }
  }
  for (const [key,payout] of Object.entries(COLOR_BOARD_PAYOUTS)) {
    const isRed=key[1]==='R', n=parseInt(key[0]);
    positions.push({
      type:'color', key, group:'Color Board',
      label:`${n} or more ${isRed?'Red':'Black'} board cards`,
      shortLabel:key,
      payout, thr:n, isRed,
    });
  }
  positions.push(
    { type:'lh', key:'LOW',  group:'Low / High', label:'River card LOW (2–7)',  shortLabel:'LOW',  payout:LOW_HIGH_PAYOUT },
    { type:'lh', key:'HIGH', group:'Low / High', label:'River card HIGH (8–A)', shortLabel:'HIGH', payout:LOW_HIGH_PAYOUT },
  );
  return positions;
}

const ALL_POSITIONS = buildPositions();

// ── Run the scan ──────────────────────────────────────────────
function runScan(rounds, rtpCeiling) {
  const wins       = new Float64Array(ALL_POSITIONS.length);
  const handWins   = new Float64Array(ALL_POSITIONS.length);

  for (let round=0; round<rounds; round++) {
    const [b0,b1,b2,b3,b4] = deal();
    const {str,winners,count} = evalWinners(b0,b1,b2,b3,b4);
    const isBW = count===10;
    let reds=0;
    [b0,b1,b2,b3,b4].forEach(c=>{if((c&3)===1||(c&3)===2)reds++;});
    const isLow=(b4>>2)<=5;

    for (let pi=0; pi<ALL_POSITIONS.length; pi++) {
      const pos = ALL_POSITIONS[pi];
      if (pos.type==='hand') {
        if (!isBW && winners[pos.handIdx]===1) wins[pi]++;
      } else if (pos.type==='perHandRank') {
        if (!isBW && winners[pos.handIdx]===1) {
          handWins[pi]++;
          if (rc(str[pos.handIdx])===pos.rCat) wins[pi]++;
        }
      } else if (pos.type==='color') {
        if ((pos.isRed?reds:5-reds)>=pos.thr) wins[pi]++;
      } else if (pos.type==='lh') {
        if (pos.key==='LOW'?isLow:!isLow) wins[pi]++;
      }
    }
  }

  return ALL_POSITIONS.map((pos, pi) => {
    const isAdaptive = pos.type==='perHandRank';
    const denom = isAdaptive ? (handWins[pi]||1) : rounds;
    const winFreq = wins[pi] / denom;
    const rtp = isAdaptive
      ? winFreq * (pos.payout + 1) * 100
      : (wins[pi] * (pos.payout + 1) * 100) / rounds;

    const fairOdds  = winFreq > 0 ? ((1/winFreq)-1).toFixed(2) : '—';
    const for965    = winFreq > 0 ? ((0.965/winFreq)-1).toFixed(2) : '—';
    const for95     = winFreq > 0 ? ((0.95/winFreq)-1).toFixed(2) : '—';
    const overUnder = rtp - rtpCeiling;
    const flagged   = rtp > rtpCeiling;
    const severity  = overUnder > 2 ? 'HIGH' : overUnder > 0.5 ? 'MEDIUM' : overUnder > 0 ? 'LOW' : 'OK';

    // Plain-English explanation
    let explanation = '';
    if (flagged) {
      explanation = `This bet pays ${pos.payout}:1 but the actual win rate is ${(winFreq*100).toFixed(3)}%, giving an RTP of ${rtp.toFixed(2)}% — which is ${overUnder.toFixed(2)}% above your ${rtpCeiling}% ceiling. `;
      explanation += `To bring this within range, the payout should be reduced to approximately ${for965}:1 (for 96.5% RTP). `;
      if (severity==='HIGH') explanation += `⚠ HIGH severity: this is significantly overpaying and would likely be flagged in any regulatory audit.`;
      else if (severity==='MEDIUM') explanation += `This is a moderate overpay. Likely to cause issues under strict standards (GLI/BMM).`;
      else explanation += `Minor overpay. May pass under lenient standards but worth correcting.`;
    } else {
      explanation = `Clean. Win rate of ${(winFreq*100).toFixed(3)}% with ${pos.payout}:1 payout gives ${rtp.toFixed(2)}% RTP — within your ${rtpCeiling}% ceiling.`;
    }

    return {
      ...pos,
      wins: wins[pi],
      handWins: handWins[pi],
      rounds: isAdaptive ? handWins[pi] : rounds,
      winFreqRaw: winFreq,
      winFreq: (winFreq*100).toFixed(4),
      rtp: rtp.toFixed(4),
      rtpNum: rtp,
      overUnder: overUnder.toFixed(2),
      fairOdds, for965, for95,
      flagged, severity, explanation,
    };
  });
}

// ── CSV export ────────────────────────────────────────────────
function exportCSV(results, rtpCeiling, rounds) {
  const rows = [
    `Exploit Hunter Scan — Rounds: ${rounds.toLocaleString()} | RTP Ceiling: ${rtpCeiling}% | Date: ${new Date().toLocaleString()}`,
    '',
    'Group,Position,Type,Payout,HandWins,Wins,WinFreq%,RTP%,OverUnder%,FairOdds,For96.5%,For95%,Flagged,Severity,Explanation',
  ];
  for (const r of results) {
    rows.push([
      `"${r.group}"`, `"${r.label}"`, r.type, r.payout,
      Math.round(r.handWins), Math.round(r.wins),
      r.winFreq, r.rtp, r.overUnder,
      r.fairOdds, r.for965, r.for95,
      r.flagged?'YES':'NO', r.severity,
      `"${r.explanation}"`,
    ].join(','));
  }
  const blob = new Blob([rows.join('\n')], { type:'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url;
  a.download = `RapidFire_ExploitScan_${Date.now()}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

const GROUP_ORDER = ['Carded Hands','Hand Ranks','Color Board','Low / High'];
const SEV_STYLES = {
  HIGH:   'bg-red-700 text-white',
  MEDIUM: 'bg-orange-600 text-white',
  LOW:    'bg-yellow-600 text-white',
  OK:     'bg-slate-700 text-slate-300',
};

export default function ExploitHunter({ onClose }) {
  const [rounds, setRounds]       = useState(50000);
  const [rtpCeiling, setRtpCeiling] = useState(98.5);
  const [results, setResults]     = useState(null);
  const [running, setRunning]     = useState(false);
  const [expandedPos, setExpandedPos] = useState(null);
  const [showAll, setShowAll]     = useState(false);

  function run() {
    setRunning(true); setResults(null); setExpandedPos(null);
    setTimeout(() => { setResults(runScan(rounds, rtpCeiling)); setRunning(false); }, 50);
  }

  const flagged = results?.filter(r=>r.flagged).sort((a,b)=>b.rtpNum-a.rtpNum) ?? [];
  const clean   = results?.filter(r=>!r.flagged) ?? [];

  const groupedAll = results
    ? GROUP_ORDER.map(g => ({ group:g, items: results.filter(r=>r.group===g).sort((a,b)=>b.rtpNum-a.rtpNum) }))
    : [];

  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-4">
        <motion.div initial={{scale:0.95,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}}
          className="w-full max-w-4xl bg-slate-950 border border-red-700/30 rounded-2xl shadow-2xl">

          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-400"/>
              <div>
                <h2 className="text-lg font-bold text-white">Exploit Hunter</h2>
                <p className="text-xs text-slate-400">Scans all 70 bet positions for RTP ceiling violations — with plain-English findings</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors text-lg font-bold">×</button>
          </div>

          <div className="p-6">
            {/* Controls */}
            <div className="flex flex-wrap gap-4 items-end mb-5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Rounds per position</label>
                <select value={rounds} onChange={e=>setRounds(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2">
                  <option value={10000}>10,000 (fast, rough)</option>
                  <option value={50000}>50,000 (balanced)</option>
                  <option value={100000}>100,000 (accurate)</option>
                  <option value={250000}>250,000 (high confidence)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">RTP Ceiling</label>
                <select value={rtpCeiling} onChange={e=>setRtpCeiling(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2">
                  <option value={98}>98.0% (GLI strict)</option>
                  <option value={98.5}>98.5% (house standard)</option>
                  <option value={99}>99.0% (lenient)</option>
                </select>
              </div>
              <button onClick={run} disabled={running}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-900/40 border border-red-700 text-white font-bold text-sm hover:bg-red-900/60 transition-colors disabled:opacity-50">
                {running?<><RefreshCw className="w-4 h-4 animate-spin"/>Scanning...</>:<><Search className="w-4 h-4"/>Run Scan</>}
              </button>
              {results && (
                <button onClick={()=>exportCSV(results,rtpCeiling,rounds)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-slate-300 font-semibold text-sm hover:bg-slate-700 transition-colors">
                  <Download className="w-4 h-4"/>Export CSV
                </button>
              )}
            </div>

            {/* How to read this */}
            <div className="flex items-start gap-2 bg-slate-800/40 border border-slate-700/40 rounded-lg px-4 py-3 mb-5 text-xs text-slate-400">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-500"/>
              <span><strong className="text-slate-300">How to read this:</strong> A violation means the payout odds for that bet are too generous relative to how often it actually wins. The RTP exceeds your ceiling. Click any flagged position to see a plain-English explanation of what's wrong and what odds would fix it. Export to CSV for a full breakdown of all 70 positions.</span>
            </div>

            {results && (
              <>
                {/* Summary row */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700 text-center">
                    <div className="text-xs text-slate-400">Scanned</div>
                    <div className="text-xl font-bold text-white">{results.length}</div>
                  </div>
                  <div className={`rounded-lg p-3 border text-center ${flagged.length>0?'bg-red-900/20 border-red-700/40':'bg-green-900/20 border-green-700/40'}`}>
                    <div className="text-xs text-slate-400">Violations</div>
                    <div className={`text-xl font-bold ${flagged.length>0?'text-red-400':'text-green-400'}`}>{flagged.length}</div>
                  </div>
                  <div className="bg-green-900/20 rounded-lg p-3 border border-green-700/40 text-center">
                    <div className="text-xs text-slate-400">Clean</div>
                    <div className="text-xl font-bold text-green-400">{clean.length}</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700 text-center">
                    <div className="text-xs text-slate-400">Rounds/Position</div>
                    <div className="text-xl font-bold text-white">{rounds.toLocaleString()}</div>
                  </div>
                </div>

                {/* Violations */}
                {flagged.length > 0 && (
                  <div className="mb-5">
                    <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">⚠ Violations — above {rtpCeiling}% ceiling</div>
                    <div className="space-y-2">
                      {flagged.map(r=>(
                        <div key={r.key} className="rounded-lg border border-red-800/40 bg-red-950/20 overflow-hidden">
                          <button className="w-full flex items-center justify-between px-4 py-3 text-left"
                            onClick={()=>setExpandedPos(p=>p===r.key?null:r.key)}>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded font-bold ${SEV_STYLES[r.severity]}`}>{r.severity}</span>
                              <span className="text-sm text-white font-medium">{r.label}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-slate-400">Win rate: <strong className="text-white">{r.winFreq}%</strong></span>
                              <span className="text-slate-400">RTP: <strong className="text-red-300">{r.rtp}%</strong></span>
                              <span className="text-slate-400">Over by: <strong className="text-red-300">+{r.overUnder}%</strong></span>
                              <span className="text-slate-400">Fix → <strong className="text-yellow-300">{r.for965}:1</strong></span>
                              {expandedPos===r.key?<ChevronDown className="w-4 h-4 text-slate-400"/>:<ChevronRight className="w-4 h-4 text-slate-400"/>}
                            </div>
                          </button>
                          {expandedPos===r.key && (
                            <div className="px-4 pb-4 border-t border-red-900/30">
                              <div className="mt-3 bg-slate-900/60 rounded-lg p-3 text-xs text-slate-300 leading-relaxed">{r.explanation}</div>
                              <div className="grid grid-cols-4 gap-3 mt-3 text-xs">
                                <div className="bg-slate-800/60 rounded p-2"><div className="text-slate-500">Current Payout</div><div className="font-bold text-white">{r.payout}:1</div></div>
                                <div className="bg-slate-800/60 rounded p-2"><div className="text-slate-500">Fair Odds (100%)</div><div className="font-bold text-yellow-300">{r.fairOdds}:1</div></div>
                                <div className="bg-slate-800/60 rounded p-2"><div className="text-slate-500">For 95% RTP</div><div className="font-bold text-green-300">{r.for95}:1</div></div>
                                <div className="bg-slate-800/60 rounded p-2"><div className="text-slate-500">For 96.5% RTP</div><div className="font-bold text-green-300">{r.for965}:1</div></div>
                              </div>
                              {r.type==='perHandRank' && (
                                <div className="mt-2 text-xs text-slate-500">Note: RTP for hand+rank bets is calculated conditionally — only counting rounds where that hand won, then measuring how often it hit the specific rank.</div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {flagged.length===0 && (
                  <div className="flex items-center gap-3 bg-green-900/20 border border-green-700/40 rounded-xl px-5 py-4 mb-5">
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0"/>
                    <div>
                      <div className="font-bold text-green-300">No violations detected</div>
                      <div className="text-xs text-slate-400">All {results.length} positions are within the {rtpCeiling}% RTP ceiling across {rounds.toLocaleString()} simulated rounds.</div>
                    </div>
                  </div>
                )}

                {/* Full table toggle */}
                <button onClick={()=>setShowAll(s=>!s)}
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors mb-3">
                  {showAll?<ChevronDown className="w-4 h-4"/>:<ChevronRight className="w-4 h-4"/>}
                  {showAll?'Hide':'Show'} full table — all {results.length} positions
                </button>

                {showAll && (
                  <div className="space-y-4">
                    {groupedAll.map(({group,items})=>(
                      <div key={group}>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{group}</div>
                        <div className="rounded-lg overflow-hidden border border-slate-700/50">
                          <table className="w-full text-xs">
                            <thead><tr className="bg-slate-800/80 text-slate-400">
                              <th className="text-left px-3 py-2">Position</th>
                              <th className="text-right px-3 py-2">Win %</th>
                              <th className="text-right px-3 py-2">RTP</th>
                              <th className="text-right px-3 py-2">Payout</th>
                              <th className="text-right px-3 py-2">Fair Odds</th>
                              <th className="text-right px-3 py-2">For 96.5%</th>
                              <th className="text-center px-3 py-2">Status</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-800">
                              {items.map(r=>(
                                <tr key={r.key} className={r.flagged?'bg-red-950/15':''}>
                                  <td className="px-3 py-1.5 text-slate-300">{r.shortLabel}</td>
                                  <td className="px-3 py-1.5 text-right text-slate-400">{r.winFreq}%</td>
                                  <td className={`px-3 py-1.5 text-right font-bold ${r.flagged?'text-red-400':'text-green-400'}`}>{r.rtp}%</td>
                                  <td className="px-3 py-1.5 text-right text-slate-400">{r.payout}:1</td>
                                  <td className="px-3 py-1.5 text-right text-slate-400">{r.fairOdds}:1</td>
                                  <td className="px-3 py-1.5 text-right text-slate-400">{r.for965}:1</td>
                                  <td className="px-3 py-1.5 text-center">
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${SEV_STYLES[r.severity]}`}>{r.severity}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
