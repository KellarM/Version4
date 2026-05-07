// ============================================================
// ARCHETYPE BATTLE — Player Strategy Simulator
// 4 betting archetypes compete over N rounds to reveal
// which strategies drain bankroll fastest vs survive longest.
// ============================================================
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';
import { CARDED_HAND_PAYOUTS, COLOR_BOARD_PAYOUTS, LOW_HIGH_PAYOUT } from '@/lib/payoutConstants';
import { PER_HAND_RANK_PAYOUTS } from '@/lib/perHandRankPayouts';

const ARCHETYPES = [
  {
    id: 'conservative', name: 'Conservative',
    color: 'text-blue-300', bg: 'bg-blue-900/20', border: 'border-blue-700/40', accent: '#3b82f6',
    description: 'Bets high-frequency flush positions: 4♥2♥ Flush + 8♦6♦ Flush ($10 each)',
    getBets: () => [
      { betType:'perHandRank', betKey:'8:Flush', payout: PER_HAND_RANK_PAYOUTS[8]['Flush'], stake:10 },
      { betType:'perHandRank', betKey:'6:Flush', payout: PER_HAND_RANK_PAYOUTS[6]['Flush'], stake:10 },
    ],
  },
  {
    id: 'balanced', name: 'Balanced',
    color: 'text-green-300', bg: 'bg-green-900/20', border: 'border-green-700/40', accent: '#22c55e',
    description: 'One hand bet + one color board + one rank bet ($10 each)',
    getBets: () => [
      { betType:'hand',        betKey:'7',           payout: CARDED_HAND_PAYOUTS[6],                  stake:10 },
      { betType:'color',       betKey:'3R',          payout: COLOR_BOARD_PAYOUTS['3R'],               stake:10 },
      { betType:'perHandRank', betKey:'3:Straight',  payout: PER_HAND_RANK_PAYOUTS[3]['Straight'],    stake:10 },
    ],
  },
  {
    id: 'highroller', name: 'High Roller',
    color: 'text-amber-300', bg: 'bg-amber-900/20', border: 'border-amber-700/40', accent: '#f59e0b',
    description: 'Big bets on rare high-payout positions: K♣K♠ Straight + A♦10♥ One Pair ($25 each)',
    getBets: () => [
      { betType:'perHandRank', betKey:'2:Straight', payout: PER_HAND_RANK_PAYOUTS[2]['Straight'], stake:25 },
      { betType:'perHandRank', betKey:'1:One Pair', payout: PER_HAND_RANK_PAYOUTS[1]['One Pair'], stake:25 },
    ],
  },
  {
    id: 'random', name: 'Random',
    color: 'text-purple-300', bg: 'bg-purple-900/20', border: 'border-purple-700/40', accent: '#a855f7',
    description: 'Picks 3 random positions from the full 70-bet menu each round ($10 each)',
    getBets: (pool) => [...pool].sort(()=>Math.random()-0.5).slice(0,3).map(b=>({...b,stake:10})),
  },
];

// ── Minimal deck/eval engine ──────────────────────────────────
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
function deal(){const d=[...D32];for(let i=31;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}return[d[1],d[2],d[3],d[5],d[7]];}
function evalWinners(b0,b1,b2,b3,b4){const str=HE.map(h=>b7(h[0],h[1],b0,b1,b2,b3,b4));const best=Math.max(...str);const winners=str.map(s=>s===best?1:0);return{str,winners,count:winners.reduce((a,b)=>a+b,0)};}
function betWon(bet,b0,b1,b2,b3,b4,str,winners,count){
  const isBW=count===10;
  if(bet.betType==='hand'){const idx=parseInt(bet.betKey)-1;return!isBW&&winners[idx]===1;}
  if(bet.betType==='perHandRank'){const ci=bet.betKey.indexOf(':');const hi=parseInt(bet.betKey.slice(0,ci))-1;const rn=bet.betKey.slice(ci+1);if(!isBW&&winners[hi]===1)return rc(str[hi])===(RCM[rn]??-99);return false;}
  if(bet.betType==='color'){let reds=0;[b0,b1,b2,b3,b4].forEach(c=>{if((c&3)===1||(c&3)===2)reds++;});const thr=parseInt(bet.betKey[0]),isR=bet.betKey[1]==='R';return(isR?reds:5-reds)>=thr;}
  if(bet.betType==='lh')return bet.betKey==='LOW'?(b4>>2)<=5:(b4>>2)>5;
  return false;
}

function buildPool(){
  const pool=[];
  for(let i=1;i<=10;i++)pool.push({betType:'hand',betKey:String(i),payout:CARDED_HAND_PAYOUTS[i-1]});
  for(let hId=1;hId<=10;hId++)for(const[rn,p] of Object.entries(PER_HAND_RANK_PAYOUTS[hId]||{}))pool.push({betType:'perHandRank',betKey:`${hId}:${rn}`,payout:p});
  for(const[k,p] of Object.entries(COLOR_BOARD_PAYOUTS))pool.push({betType:'color',betKey:k,payout:p});
  pool.push({betType:'lh',betKey:'LOW',payout:LOW_HIGH_PAYOUT},{betType:'lh',betKey:'HIGH',payout:LOW_HIGH_PAYOUT});
  return pool;
}
const POOL=buildPool();

function simulate(rounds,bankroll){
  const states=ARCHETYPES.map(a=>({id:a.id,bankroll,wagered:0,won:0,ruinedAt:null,history:[bankroll]}));
  for(let round=0;round<rounds;round++){
    const[b0,b1,b2,b3,b4]=deal();
    const{str,winners,count}=evalWinners(b0,b1,b2,b3,b4);
    for(let ai=0;ai<ARCHETYPES.length;ai++){
      const s=states[ai];if(s.ruinedAt!==null)continue;
      const bets=ARCHETYPES[ai].getBets(POOL);
      for(const bet of bets){
        const stake=bet.stake??10;if(s.bankroll<stake)continue;
        s.bankroll-=stake;s.wagered+=stake;
        if(betWon(bet,b0,b1,b2,b3,b4,str,winners,count)){const pay=stake+stake*(bet.payout??1);s.bankroll+=pay;s.won+=pay;}
      }
      if(round%Math.max(1,Math.floor(rounds/100))===0)s.history.push(Math.max(0,s.bankroll));
      if(s.bankroll<=0){s.ruinedAt=round+1;s.bankroll=0;}
    }
  }
  return states.map((s,i)=>({...s,archetype:ARCHETYPES[i],rtp:s.wagered>0?(s.won/s.wagered*100).toFixed(2):'0.00',houseEdge:s.wagered>0?((1-s.won/s.wagered)*100).toFixed(2):'0.00',survived:s.ruinedAt===null}));
}

function Sparkline({data,color}){
  if(!data||data.length<2)return null;
  const min=Math.min(...data),max=Math.max(...data),range=max-min||1;
  const W=160,H=40;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*W},${H-((v-min)/range)*H}`).join(' ');
  return<svg width={W} height={H} className="opacity-70"><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/></svg>;
}

export default function ArchetypeBattle({onClose}){
  const[rounds,setRounds]=useState(10000);
  const[bankroll,setBankroll]=useState(1000);
  const[results,setResults]=useState(null);
  const[running,setRunning]=useState(false);

  function run(){setRunning(true);setResults(null);setTimeout(()=>{setResults(simulate(rounds,bankroll));setRunning(false);},50);}

  const sorted=results?[...results].sort((a,b)=>b.bankroll-a.bankroll):[];

  return(
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-4">
        <motion.div initial={{scale:0.95,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}}
          className="w-full max-w-4xl bg-slate-950 border border-purple-700/30 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-purple-400"/>
              <div><h2 className="text-lg font-bold text-white">Player Archetype Battle</h2>
              <p className="text-xs text-slate-400">4 betting strategies vs the house — who survives longest?</p></div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors text-lg font-bold">×</button>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-4 items-end mb-6">
              <div><label className="text-xs text-slate-400 block mb-1">Rounds</label>
                <select value={rounds} onChange={e=>setRounds(Number(e.target.value))} className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2">
                  {[1000,5000,10000,25000,50000].map(v=><option key={v} value={v}>{v.toLocaleString()}</option>)}
                </select></div>
              <div><label className="text-xs text-slate-400 block mb-1">Starting Bankroll</label>
                <select value={bankroll} onChange={e=>setBankroll(Number(e.target.value))} className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2">
                  {[500,1000,2500,5000].map(v=><option key={v} value={v}>${v.toLocaleString()}</option>)}
                </select></div>
              <button onClick={run} disabled={running} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple-700/50 border border-purple-600 text-white font-bold text-sm hover:bg-purple-700/70 transition-colors disabled:opacity-50">
                {running?<><RefreshCw className="w-4 h-4 animate-spin"/>Running...</>:<><Play className="w-4 h-4"/>Run Battle</>}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {ARCHETYPES.map(a=>(
                <div key={a.id} className={`rounded-lg border p-3 ${a.bg} ${a.border}`}>
                  <div className={`font-bold text-sm ${a.color} mb-1`}>{a.name}</div>
                  <div className="text-xs text-slate-400">{a.description}</div>
                </div>
              ))}
            </div>
            {results&&(
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Results — {rounds.toLocaleString()} rounds · Starting ${bankroll.toLocaleString()}</div>
                {sorted.map((r,rank)=>(
                  <div key={r.id} className={`rounded-xl border p-4 ${r.archetype.bg} ${r.archetype.border}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-slate-600">#{rank+1}</span>
                        <div>
                          <div className={`font-bold ${r.archetype.color}`}>{r.archetype.name}</div>
                          <div className="text-xs text-slate-500">{r.archetype.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {r.survived
                          ?<div className="flex items-center gap-1 text-green-400 text-sm font-bold"><TrendingUp className="w-4 h-4"/>Survived</div>
                          :<div className="flex items-center gap-1 text-red-400 text-sm font-bold"><TrendingDown className="w-4 h-4"/>Ruined R{r.ruinedAt?.toLocaleString()}</div>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="grid grid-cols-4 gap-4 flex-1 text-xs">
                        <div><div className="text-slate-500">Final Bankroll</div><div className={`font-bold ${r.survived?'text-green-300':'text-red-400'}`}>${r.bankroll.toLocaleString()}</div></div>
                        <div><div className="text-slate-500">Total Wagered</div><div className="font-bold text-white">${r.wagered.toLocaleString()}</div></div>
                        <div><div className="text-slate-500">Actual RTP</div><div className="font-bold text-white">{r.rtp}%</div></div>
                        <div><div className="text-slate-500">House Edge</div><div className="font-bold text-amber-300">{r.houseEdge}%</div></div>
                      </div>
                      <Sparkline data={r.history} color={r.archetype.accent}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
