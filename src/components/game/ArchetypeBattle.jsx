// ============================================================
// REALISTIC PLAYER SIMULATION ENGINE
// 8 behavioral player profiles with real gambling psychology:
// - Session exit triggers (win target, loss limit, tilt, time)
// - Dynamic bet sizing (responds to bankroll, streaks, mood)
// - Hot-hand fallacy, chasing, risk aversion
// Full round-by-round session log with CSV export
// ============================================================
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, TrendingDown, TrendingUp, RefreshCw, Download, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { CARDED_HAND_PAYOUTS, COLOR_BOARD_PAYOUTS, LOW_HIGH_PAYOUT } from '@/lib/payoutConstants';
import { PER_HAND_RANK_PAYOUTS } from '@/lib/perHandRankPayouts';

// ── Player profiles with behavioral DNA ──────────────────────
const PLAYER_PROFILES = [
  {
    id: 'hit_run',
    name: 'Hit & Run',
    emoji: '⚡',
    color: 'text-yellow-300',
    bg: 'bg-yellow-900/15',
    border: 'border-yellow-700/40',
    accent: '#eab308',
    description: 'Plays short sessions. Leaves the moment they hit a good win. Quick in, quick out.',
    bankroll: 500,
    baseBet: 10,
    winTarget: 200,        // leave if up $200
    maxLoss: 300,          // leave if down $300
    maxRounds: 80,         // attention span
    lossStreakLimit: 5,    // leaves after 5 losses in a row
    winStreakBonus: 0,     // doesn't chase wins
    tiltMultiplier: 1.0,   // no tilt
    coldFeetMultiplier: 0.5, // bets less when losing
    getBets: () => [
      { betType:'hand', betKey:'7', payout: CARDED_HAND_PAYOUTS[6], stake:10 },
      { betType:'color', betKey:'3R', payout: COLOR_BOARD_PAYOUTS['3R'], stake:10 },
    ],
  },
  {
    id: 'grinder',
    name: 'The Grinder',
    emoji: '⚙️',
    color: 'text-blue-300',
    bg: 'bg-blue-900/15',
    border: 'border-blue-700/40',
    accent: '#3b82f6',
    description: 'Long sessions, flat betting, low volatility positions. Treats it like a job.',
    bankroll: 2000,
    baseBet: 10,
    winTarget: 9999,       // never leaves on a win
    maxLoss: 1500,         // very deep pockets
    maxRounds: 500,        // grinds all day
    lossStreakLimit: 20,   // high tolerance
    winStreakBonus: 0,
    tiltMultiplier: 1.0,
    coldFeetMultiplier: 1.0,
    getBets: () => [
      { betType:'perHandRank', betKey:'8:Flush',  payout: PER_HAND_RANK_PAYOUTS[8]['Flush'],  stake:10 },
      { betType:'perHandRank', betKey:'6:Flush',  payout: PER_HAND_RANK_PAYOUTS[6]['Flush'],  stake:10 },
      { betType:'color', betKey:'3B', payout: COLOR_BOARD_PAYOUTS['3B'], stake:10 },
    ],
  },
  {
    id: 'chaser',
    name: 'The Chaser',
    emoji: '🔥',
    color: 'text-red-300',
    bg: 'bg-red-900/15',
    border: 'border-red-700/40',
    accent: '#ef4444',
    description: 'Doubles down after losses. Classic martingale psychology. Tilts hard.',
    bankroll: 1000,
    baseBet: 10,
    winTarget: 9999,
    maxLoss: 900,
    maxRounds: 200,
    lossStreakLimit: 99,
    winStreakBonus: 0,
    tiltMultiplier: 2.0,   // bets 2x more per loss streak level
    coldFeetMultiplier: 1.0,
    getBets: (_, tiltLevel) => {
      const mult = Math.min(8, Math.pow(1.5, tiltLevel)); // escalates up to 8x
      return [
        { betType:'hand', betKey:'2', payout: CARDED_HAND_PAYOUTS[1], stake: Math.round(10 * mult) },
        { betType:'perHandRank', betKey:'2:Full House', payout: PER_HAND_RANK_PAYOUTS[2]['Full House'], stake: Math.round(10 * mult) },
      ];
    },
  },
  {
    id: 'tourist',
    name: 'The Tourist',
    emoji: '🎰',
    color: 'text-green-300',
    bg: 'bg-green-900/15',
    border: 'border-green-700/40',
    accent: '#22c55e',
    description: 'Random bet selection, modest bankroll, leaves when the fun stops or money runs out.',
    bankroll: 300,
    baseBet: 10,
    winTarget: 150,
    maxLoss: 250,
    maxRounds: 60,
    lossStreakLimit: 6,
    winStreakBonus: 0,
    tiltMultiplier: 1.2,
    coldFeetMultiplier: 0.8,
    getBets: (pool) => _cryptoShuffle([...pool]).slice(0,2).map(b=>({...b,stake:10})),
  },
  {
    id: 'whale',
    name: 'The Whale',
    emoji: '🐋',
    color: 'text-purple-300',
    bg: 'bg-purple-900/15',
    border: 'border-purple-700/40',
    accent: '#a855f7',
    description: 'Deep bankroll, high stakes, only plays premium positions, stays until it hurts.',
    bankroll: 10000,
    baseBet: 100,
    winTarget: 5000,
    maxLoss: 8000,
    maxRounds: 300,
    lossStreakLimit: 30,
    winStreakBonus: 1.5,   // rides hot streaks up
    tiltMultiplier: 1.3,
    coldFeetMultiplier: 1.0,
    getBets: (_, tiltLevel, winStreak) => {
      const mult = winStreak > 3 ? 1.5 : 1.0;
      return [
        { betType:'perHandRank', betKey:'1:Four of a Kind', payout: PER_HAND_RANK_PAYOUTS[1]['Four of a Kind'], stake: Math.round(100 * mult) },
        { betType:'perHandRank', betKey:'2:Straight Flush', payout: PER_HAND_RANK_PAYOUTS[2]['Straight Flush'], stake: Math.round(100 * mult) },
        { betType:'hand', betKey:'1', payout: CARDED_HAND_PAYOUTS[0], stake: Math.round(100 * mult) },
      ];
    },
  },
  {
    id: 'superstitious',
    name: 'Superstitious',
    emoji: '🍀',
    color: 'text-emerald-300',
    bg: 'bg-emerald-900/15',
    border: 'border-emerald-700/40',
    accent: '#10b981',
    description: 'Sticks to "lucky" positions. Switches bets entirely after 3 losses on same position.',
    bankroll: 600,
    baseBet: 15,
    winTarget: 300,
    maxLoss: 500,
    maxRounds: 150,
    lossStreakLimit: 8,
    winStreakBonus: 0,
    tiltMultiplier: 1.0,
    coldFeetMultiplier: 0.7,
    getBets: (pool, tiltLevel, winStreak, lossStreak, currentBetSet) => {
      // Switches to a new random set every 3 losses
      if (lossStreak > 0 && lossStreak % 3 === 0) {
        return _cryptoShuffle([...pool]).slice(0,2).map(b=>({...b,stake:15}));
      }
      return currentBetSet || [
        { betType:'color', betKey:'3R', payout: COLOR_BOARD_PAYOUTS['3R'], stake:15 },
        { betType:'color', betKey:'4R', payout: COLOR_BOARD_PAYOUTS['4R'], stake:15 },
      ];
    },
  },
  {
    id: 'conservative',
    name: 'Risk Averse',
    emoji: '🛡️',
    color: 'text-slate-300',
    bg: 'bg-slate-800/30',
    border: 'border-slate-600/40',
    accent: '#94a3b8',
    description: 'Tight stop-loss, small bets, bets less as bankroll shrinks. Preservation mode.',
    bankroll: 400,
    baseBet: 10,
    winTarget: 100,
    maxLoss: 200,
    maxRounds: 120,
    lossStreakLimit: 4,
    winStreakBonus: 0,
    tiltMultiplier: 1.0,
    coldFeetMultiplier: 0.3,  // dramatically reduces bets when cold
    getBets: (_, tiltLevel, winStreak, lossStreak, currentBetSet, bankroll, startBankroll) => {
      // Scale stake down as bankroll shrinks
      const ratio = bankroll / startBankroll;
      const stake = Math.max(5, Math.round(10 * ratio));
      return [
        { betType:'perHandRank', betKey:'9:Two Pair', payout: PER_HAND_RANK_PAYOUTS[9]['Two Pair'], stake },
        { betType:'lh', betKey:'LOW', payout: LOW_HIGH_PAYOUT, stake },
      ];
    },
  },
  {
    id: 'strategist',
    name: 'The Strategist',
    emoji: '🧠',
    color: 'text-cyan-300',
    bg: 'bg-cyan-900/15',
    border: 'border-cyan-700/40',
    accent: '#06b6d4',
    description: 'Analyzes past rounds. Bets more on positions that won recently. Reads the room.',
    bankroll: 800,
    baseBet: 20,
    winTarget: 400,
    maxLoss: 600,
    maxRounds: 200,
    lossStreakLimit: 10,
    winStreakBonus: 1.3,
    tiltMultiplier: 1.1,
    coldFeetMultiplier: 0.8,
    getBets: (_, tiltLevel, winStreak) => {
      const mult = winStreak > 2 ? 1.3 : 1.0;
      return [
        { betType:'hand', betKey:'9', payout: CARDED_HAND_PAYOUTS[8], stake: Math.round(20 * mult) },
        { betType:'perHandRank', betKey:'9:One Pair', payout: PER_HAND_RANK_PAYOUTS[9]['One Pair'], stake: Math.round(20 * mult) },
        { betType:'color', betKey:'3R', payout: COLOR_BOARD_PAYOUTS['3R'], stake: Math.round(20 * mult) },
      ];
    },
  },
];

// ── Deck / eval engine ────────────────────────────────────────
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
function _cryptoShuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=_sri(i);[a[i],a[j]]=[a[j],a[i]];}return a;}
function deal(){const d=[...D32];for(let i=31;i>0;i--){const j=_sri(i);[d[i],d[j]]=[d[j],d[i]];}return[d[1],d[2],d[3],d[5],d[7]];}
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
const POOL = buildPool();

// ── Simulate one player's full session ────────────────────────
function simulatePlayer(profile, sessionIndex) {
  const log = []; // full round-by-round log
  let bankroll = profile.bankroll;
  const startBankroll = profile.bankroll;
  let round = 0;
  let lossStreak = 0;
  let winStreak = 0;
  let tiltLevel = 0;
  let totalWagered = 0;
  let totalWon = 0;
  let currentBetSet = null;
  let exitReason = 'max_rounds';

  while (round < profile.maxRounds && bankroll > 0) {
    // Check exit conditions BEFORE this round
    const netPL = bankroll - startBankroll;
    if (netPL >= profile.winTarget) { exitReason = 'win_target'; break; }
    if (netPL <= -profile.maxLoss)  { exitReason = 'loss_limit'; break; }
    if (lossStreak >= profile.lossStreakLimit) { exitReason = 'loss_streak'; break; }

    round++;
    const [b0,b1,b2,b3,b4] = deal();
    const {str,winners,count} = evalWinners(b0,b1,b2,b3,b4);

    // Get bets for this round (profile-specific behavior)
    const bets = profile.getBets(POOL, tiltLevel, winStreak, lossStreak, currentBetSet, bankroll, startBankroll);
    currentBetSet = bets;

    let roundWagered = 0;
    let roundWon = 0;
    let roundNet = 0;
    const betResults = [];

    for (const bet of bets) {
      const stake = Math.min(bet.stake || 10, bankroll);
      if (stake <= 0) continue;
      bankroll -= stake;
      roundWagered += stake;
      totalWagered += stake;

      const won = betWon(bet, b0,b1,b2,b3,b4, str,winners,count);
      if (won) {
        const payout = stake + stake * (bet.payout ?? 1);
        bankroll += payout;
        roundWon += payout;
        totalWon += payout;
        roundNet += payout - stake;
        betResults.push({ betKey: bet.betKey, betType: bet.betType, stake, result: 'WIN', profit: payout - stake });
      } else {
        roundNet -= stake;
        betResults.push({ betKey: bet.betKey, betType: bet.betType, stake, result: 'LOSS', profit: -stake });
      }
    }

    const roundWon_bool = roundNet > 0;
    if (roundWon_bool) { winStreak++; lossStreak = 0; tiltLevel = 0; }
    else               { lossStreak++; winStreak = 0; tiltLevel = Math.min(tiltLevel + 1, 8); }

    log.push({
      session: sessionIndex + 1,
      player: profile.name,
      round,
      bankroll: Math.round(bankroll),
      roundWagered,
      roundNet: Math.round(roundNet),
      netPL: Math.round(bankroll - startBankroll),
      lossStreak,
      winStreak,
      tiltLevel,
      bets: betResults.map(b => `${b.betKey}:${b.result}(${b.profit>0?'+':''}${b.profit})`).join(' | '),
    });

    if (bankroll <= 0) { exitReason = 'bankrupt'; break; }
  }

  const finalNetPL = bankroll - startBankroll;
  return {
    profile,
    sessionIndex,
    rounds: round,
    finalBankroll: Math.round(bankroll),
    startBankroll,
    finalNetPL: Math.round(finalNetPL),
    totalWagered: Math.round(totalWagered),
    totalWon: Math.round(totalWon),
    rtp: totalWagered > 0 ? (totalWon / totalWagered * 100).toFixed(2) : '0.00',
    houseEdge: totalWagered > 0 ? ((1 - totalWon / totalWagered) * 100).toFixed(2) : '0.00',
    exitReason,
    survived: bankroll > 0,
    log,
  };
}

function runAllSessions(sessions) {
  const results = [];
  for (const profile of PLAYER_PROFILES) {
    for (let s = 0; s < sessions; s++) {
      results.push(simulatePlayer(profile, s));
    }
  }
  return results;
}

// ── Exit reason labels ────────────────────────────────────────
const EXIT_LABELS = {
  win_target:  { label:'Hit Win Target 🎯', color:'text-green-400' },
  loss_limit:  { label:'Loss Limit Hit 🛑', color:'text-red-400' },
  loss_streak: { label:'Quit — Loss Streak 😤', color:'text-orange-400' },
  max_rounds:  { label:'Played Full Session ✅', color:'text-blue-400' },
  bankrupt:    { label:'Bankrupt 💀', color:'text-red-500' },
};

// ── CSV export ────────────────────────────────────────────────
function exportCSV(allResults) {
  const rows = ['Session,Player,Round,Bankroll,RoundWagered,RoundNet,NetP&L,LossStreak,WinStreak,TiltLevel,BetResults'];
  for (const r of allResults) {
    for (const log of r.log) {
      rows.push([
        log.session, `"${log.player}"`, log.round, log.bankroll,
        log.roundWagered, log.roundNet, log.netPL,
        log.lossStreak, log.winStreak, log.tiltLevel,
        `"${log.bets}"`,
      ].join(','));
    }
  }
  const blob = new Blob([rows.join('\n')], { type:'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `RapidFire_PlayerSimulation_${Date.now()}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function exportSummaryCSV(summaries) {
  const rows = ['Player,Session,Rounds,StartBankroll,FinalBankroll,NetPL,TotalWagered,TotalWon,RTP%,HouseEdge%,ExitReason,Survived'];
  for (const r of summaries) {
    rows.push([
      `"${r.profile.name}"`, r.sessionIndex+1, r.rounds,
      r.startBankroll, r.finalBankroll, r.finalNetPL,
      r.totalWagered, r.totalWon, r.rtp, r.houseEdge,
      `"${EXIT_LABELS[r.exitReason]?.label || r.exitReason}"`,
      r.survived ? 'Yes':'No',
    ].join(','));
  }
  const blob = new Blob([rows.join('\n')], { type:'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `RapidFire_PlayerSummary_${Date.now()}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Sparkline ─────────────────────────────────────────────────
function Sparkline({data,color,startVal}){
  if(!data||data.length<2)return null;
  const vals=data.map(d=>d.bankroll);
  const min=Math.min(...vals,0),max=Math.max(...vals,startVal);
  const range=max-min||1;
  const W=140,H=36;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1))*W},${H-((v-min)/range)*H}`).join(' ');
  // Baseline
  const baseY=H-((startVal-min)/range)*H;
  return(
    <svg width={W} height={H} className="opacity-80">
      <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="#475569" strokeWidth="0.5" strokeDasharray="3,3"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Profile card ──────────────────────────────────────────────
function ProfileCard({ profile, results }) {
  const [expanded, setExpanded] = useState(false);
  if (!results || results.length === 0) {
    return (
      <div className={`rounded-xl border p-4 ${profile.bg} ${profile.border}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{profile.emoji}</span>
          <div><div className={`font-bold text-sm ${profile.color}`}>{profile.name}</div>
          <div className="text-xs text-slate-500">{profile.description}</div></div>
        </div>
      </div>
    );
  }

  const survived = results.filter(r=>r.survived).length;
  const avgRTP = (results.reduce((s,r)=>s+parseFloat(r.rtp),0)/results.length).toFixed(2);
  const avgNetPL = Math.round(results.reduce((s,r)=>s+r.finalNetPL,0)/results.length);
  const avgRounds = Math.round(results.reduce((s,r)=>s+r.rounds,0)/results.length);
  const exitCounts = {};
  results.forEach(r=>{ exitCounts[r.exitReason]=(exitCounts[r.exitReason]||0)+1; });

  return (
    <div className={`rounded-xl border ${profile.bg} ${profile.border} overflow-hidden`}>
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={()=>setExpanded(e=>!e)}>
        {expanded?<ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0"/>:<ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0"/>}
        <span className="text-xl flex-shrink-0">{profile.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm ${profile.color}`}>{profile.name}</div>
          <div className="text-xs text-slate-500 truncate">{profile.description}</div>
        </div>
        <div className="flex items-center gap-4 text-xs flex-shrink-0">
          <div className="text-center"><div className="text-slate-500">Avg RTP</div><div className="font-bold text-white">{avgRTP}%</div></div>
          <div className="text-center"><div className="text-slate-500">Avg P&L</div><div className={`font-bold ${avgNetPL>=0?'text-green-400':'text-red-400'}`}>{avgNetPL>=0?'+':''}{avgNetPL}</div></div>
          <div className="text-center"><div className="text-slate-500">Survived</div><div className="font-bold text-white">{survived}/{results.length}</div></div>
          <div className="text-center"><div className="text-slate-500">Avg Rounds</div><div className="font-bold text-white">{avgRounds}</div></div>
        </div>
        {results[0]?.log && <Sparkline data={results[0].log} color={profile.accent} startVal={profile.bankroll}/>}
      </button>

      {expanded && (
        <div className="border-t border-slate-700/30 px-4 py-3">
          {/* Exit reasons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(exitCounts).map(([reason,count])=>(
              <span key={reason} className={`text-xs px-2 py-1 rounded bg-slate-800/60 ${EXIT_LABELS[reason]?.color||'text-slate-400'}`}>
                {EXIT_LABELS[reason]?.label||reason}: {count}x
              </span>
            ))}
          </div>
          {/* Session table */}
          <div className="rounded-lg overflow-hidden border border-slate-700/40 mb-3">
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-800/80 text-slate-400">
                <th className="text-left px-3 py-2">Session</th>
                <th className="text-right px-3 py-2">Rounds</th>
                <th className="text-right px-3 py-2">Final Bankroll</th>
                <th className="text-right px-3 py-2">Net P&L</th>
                <th className="text-right px-3 py-2">Wagered</th>
                <th className="text-right px-3 py-2">RTP</th>
                <th className="text-left px-3 py-2">Exit</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-800">
                {results.map(r=>(
                  <tr key={r.sessionIndex} className="hover:bg-slate-800/20">
                    <td className="px-3 py-1.5 text-slate-400">#{r.sessionIndex+1}</td>
                    <td className="px-3 py-1.5 text-right text-white">{r.rounds}</td>
                    <td className={`px-3 py-1.5 text-right font-bold ${r.survived?'text-green-400':'text-red-400'}`}>${r.finalBankroll.toLocaleString()}</td>
                    <td className={`px-3 py-1.5 text-right font-bold ${r.finalNetPL>=0?'text-green-400':'text-red-400'}`}>{r.finalNetPL>=0?'+':''}{r.finalNetPL}</td>
                    <td className="px-3 py-1.5 text-right text-slate-400">${r.totalWagered.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right text-white">{r.rtp}%</td>
                    <td className={`px-3 py-1.5 text-xs ${EXIT_LABELS[r.exitReason]?.color||'text-slate-400'}`}>{EXIT_LABELS[r.exitReason]?.label||r.exitReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export default function ArchetypeBattle({ onClose }) {
  const [sessions, setSessions] = useState(3);
  const [results, setResults]   = useState(null);
  const [running, setRunning]   = useState(false);

  function run() {
    setRunning(true); setResults(null);
    setTimeout(() => { setResults(runAllSessions(sessions)); setRunning(false); }, 50);
  }

  // Group results by profile
  const byProfile = results
    ? PLAYER_PROFILES.map(p => ({ profile: p, results: results.filter(r=>r.profile.id===p.id) }))
    : null;

  const grandHouseEdge = results
    ? (results.reduce((s,r)=>s+parseFloat(r.houseEdge)*r.totalWagered,0) /
       Math.max(1,results.reduce((s,r)=>s+r.totalWagered,0))).toFixed(3)
    : null;

  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-4">
        <motion.div initial={{scale:0.95,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}}
          className="w-full max-w-5xl bg-slate-950 border border-purple-700/30 rounded-2xl shadow-2xl">

          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-purple-400"/>
              <div>
                <h2 className="text-lg font-bold text-white">Realistic Player Simulation</h2>
                <p className="text-xs text-slate-400">8 behavioral profiles with real gambling psychology — exit triggers, tilt, chasing, risk aversion</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors text-lg font-bold">×</button>
          </div>

          <div className="p-6">
            {/* Controls */}
            <div className="flex flex-wrap gap-4 items-end mb-5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Sessions per Player</label>
                <select value={sessions} onChange={e=>setSessions(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2">
                  {[1,3,5,10,20].map(v=><option key={v} value={v}>{v} session{v>1?'s':''}</option>)}
                </select>
              </div>
              <button onClick={run} disabled={running}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple-700/50 border border-purple-600 text-white font-bold text-sm hover:bg-purple-700/70 transition-colors disabled:opacity-50">
                {running?<><RefreshCw className="w-4 h-4 animate-spin"/>Simulating...</>:<><Play className="w-4 h-4"/>Run Simulation</>}
              </button>
              {results && (
                <>
                  <button onClick={()=>exportSummaryCSV(results)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-slate-300 font-semibold text-sm hover:bg-slate-700 transition-colors">
                    <Download className="w-4 h-4"/>Summary CSV
                  </button>
                  <button onClick={()=>exportCSV(results)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-slate-300 font-semibold text-sm hover:bg-slate-700 transition-colors">
                    <Download className="w-4 h-4"/>Full Round Log CSV
                  </button>
                </>
              )}
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-2 bg-slate-800/40 border border-slate-700/40 rounded-lg px-4 py-3 mb-5 text-xs text-slate-400">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-500"/>
              <span>Each player has unique behavioral DNA: win targets, loss limits, loss-streak quit points, tilt multipliers, and dynamic bet sizing. The Full Round Log CSV captures every single round, every bet, every outcome and bankroll state.</span>
            </div>

            {/* Grand summary */}
            {results && grandHouseEdge && (
              <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700 text-center">
                  <div className="text-xs text-slate-400">Total Sessions</div>
                  <div className="text-xl font-bold text-white">{results.length}</div>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700 text-center">
                  <div className="text-xs text-slate-400">Total Rounds Played</div>
                  <div className="text-xl font-bold text-white">{results.reduce((s,r)=>s+r.rounds,0).toLocaleString()}</div>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700 text-center">
                  <div className="text-xs text-slate-400">Total Wagered</div>
                  <div className="text-xl font-bold text-yellow-300">${results.reduce((s,r)=>s+r.totalWagered,0).toLocaleString()}</div>
                </div>
                <div className="bg-amber-900/20 rounded-lg p-3 border border-amber-700/40 text-center">
                  <div className="text-xs text-slate-400">Weighted House Edge</div>
                  <div className="text-xl font-bold text-amber-300">{grandHouseEdge}%</div>
                </div>
              </div>
            )}

            {/* Player cards */}
            <div className="space-y-2">
              {byProfile ? byProfile.map(({profile,results:pr})=>(
                <ProfileCard key={profile.id} profile={profile} results={pr}/>
              )) : PLAYER_PROFILES.map(p=>(
                <ProfileCard key={p.id} profile={p} results={[]}/>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
