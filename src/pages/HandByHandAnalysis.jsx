import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Plus, Trash2, Play } from 'lucide-react';
import { CARDED_HAND_PAYOUTS, HAND_RANK_PAYOUTS, COLOR_BOARD_PAYOUTS, LOW_HIGH_PAYOUT } from '@/lib/payoutConstants';

const RANK_LABELS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUIT_LABELS = ['clubs','diamonds','hearts','spades'];
const SUIT_SYMBOLS = { clubs:'♣', diamonds:'♦', hearts:'♥', spades:'♠' };

function enc(r, s) { return RANK_LABELS.indexOf(r)*4 + SUIT_LABELS.indexOf(s); }
function cardLabel(c) { return RANK_LABELS[c>>2] + SUIT_SYMBOLS[SUIT_LABELS[c&3]]; }

const HANDS_DEF = [
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
const HAND_LABELS = [
  'A♦10♥','K♣K♠','Q♣J♠','Q♠10♠','J♣9♣','8♦6♦','7♦7♠','4♥2♥','3♣3♥','A♥5♦',
];
const PLAYER_SET = new Set(HANDS_DEF.flat());
const DECK32 = [];
for (let r=0;r<13;r++) for (let s=0;s<4;s++) { const c=r*4+s; if(!PLAYER_SET.has(c)) DECK32.push(c); }

const RANK_NAMES = ['One Pair (no bet)','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush (no bet)','Royal Flush'];
const SKIP_PAIRS = [];
for (let i=0;i<7;i++) for (let j=i+1;j<7;j++) SKIP_PAIRS.push([i,j]);
const COMBO5 = SKIP_PAIRS.map(([si,sj]) => { const idx=[]; for(let k=0;k<7;k++) if(k!==si&&k!==sj) idx.push(k); return idx; });

function eval5(all, idx) {
  const [i0,i1,i2,i3,i4]=idx;
  const c0=all[i0],c1=all[i1],c2=all[i2],c3=all[i3],c4=all[i4];
  const r0=c0>>2,r1=c1>>2,r2=c2>>2,r3=c3>>2,r4=c4>>2;
  const s0=c0&3, s1=c1&3, s2=c2&3, s3=c3&3, s4=c4&3;
  const flush=s0===s1&&s1===s2&&s2===s3&&s3===s4;
  const sorted=[r0,r1,r2,r3,r4].sort((a,b)=>b-a);
  const [a,b,c,d,e]=sorted;
  const uLen=(a!==b)+(b!==c)+(c!==d)+(d!==e)+1;
  const straight=uLen===5&&(a-e===4||(a===12&&b===3&&c===2&&d===1&&e===0));
  if(flush&&straight) return (a===12&&b===8)?8:7;
  const cnt=new Array(13).fill(0);
  for(const v of sorted) cnt[v]++;
  const f=cnt.filter(x=>x>0).sort((a,b)=>b-a);
  if(f[0]===4) return 6;
  if(f[0]===3&&f[1]===2) return 5;
  if(flush) return 4;
  if(straight) return 3;
  if(f[0]===3) return 2;
  if(f[0]===2&&f[1]===2) return 1;
  if(f[0]===2) return 0;
  return -1;
}

const deck = [...DECK32];
const scratch7 = new Array(7);

// Deal sequence: Burn1 | F1 F2 F3 | Burn1 | Turn | Burn1 | River
// board positions in deck: [1,2,3,5,7]
const BOARD_IDX = [1,2,3,5,7];

function shuffle() {
  for(let i=31;i>0;i--) { const j=(Math.random()*(i+1))|0; [deck[i],deck[j]]=[deck[j],deck[i]]; }
}

function best7(h0,h1,c0,c1,c2,c3,c4) {
  scratch7[0]=h0;scratch7[1]=h1;scratch7[2]=c0;scratch7[3]=c1;scratch7[4]=c2;scratch7[5]=c3;scratch7[6]=c4;
  let best=-2;
  for(const idx of COMBO5) { const r=eval5(scratch7,idx); if(r>best) best=r; }
  return best;
}

const STRATEGIES = [
  { name:'Conservative', hands:[0],     ranks:[],           colorKey:'3R', lh:'LOW' },
  { name:'Balanced',     hands:[0,1],   ranks:['Flush'],    colorKey:'4R', lh:'HIGH' },
  { name:'Aggressive',   hands:[0,1,2], ranks:['Straight','Flush'], colorKey:'5R', lh:'LOW' },
];

function simulateGame(gameNumber) {
  shuffle();
  const c0=deck[BOARD_IDX[0]], c1=deck[BOARD_IDX[1]], c2=deck[BOARD_IDX[2]],
        c3=deck[BOARD_IDX[3]], c4=deck[BOARD_IDX[4]];

  let bestRank = -2, winnerIdx = -1;
  for(let h=0;h<10;h++) {
    const r = best7(HANDS_DEF[h][0],HANDS_DEF[h][1],c0,c1,c2,c3,c4);
    if(r>bestRank) { bestRank=r; winnerIdx=h; }
  }

  let reds=0;
  for(const card of [c0,c1,c2,c3,c4]) { const s=card&3; if(s===1||s===2) reds++; }
  const colorResult = reds>=3 ? `${reds}R` : `${5-reds}B`;
  const riverRank = c4>>2;
  const riverResult = riverRank<=5 ? 'LOW' : 'HIGH';

  const BET = 10;
  const players = STRATEGIES.map((strat, si) => {
    let totalBet = 0, totalWin = 0;
    const bets = { hands: [], ranks: [], colors: [], lowHigh: null };

    strat.hands.forEach(hi => {
      const amt = BET;
      totalBet += amt;
      // Hand win = both hole cards appear on the board
      const h0=HANDS_DEF[hi][0], h1=HANDS_DEF[hi][1];
      const hit0=c0===h0||c1===h0||c2===h0||c3===h0||c4===h0;
      const hit1=c0===h1||c1===h1||c2===h1||c3===h1||c4===h1;
      const won = hit0 && hit1;
      const winAmt = won ? amt * CARDED_HAND_PAYOUTS[hi] : 0;
      if(won) totalWin += winAmt + amt;
      bets.hands.push({ handId: hi+1, cards: HAND_LABELS[hi], amount: amt, won, winAmount: winAmt });
    });

    strat.ranks.forEach(rank => {
      const idx = RANK_NAMES.indexOf(rank);
      const amt = BET;
      totalBet += amt;
      const won = bestRank === idx;
      const payout = HAND_RANK_PAYOUTS[rank] ?? 0;
      const winAmt = won ? amt * payout : 0;
      if(won) totalWin += winAmt + amt;
      bets.ranks.push({ rank, amount: amt, won, winAmount: winAmt });
    });

    const colorKey = strat.colorKey;
    const colorCount = parseInt(colorKey[0]);
    const colorIsRed = colorKey[1]==='R';
    const matchCount = colorIsRed ? reds : (5-reds);
    const colorWon = matchCount >= colorCount;
    const colorAmt = BET;
    totalBet += colorAmt;
    const colorPayout = COLOR_BOARD_PAYOUTS[colorKey] ?? 0;
    const colorWinAmt = colorWon ? colorAmt * colorPayout : 0;
    if(colorWon) totalWin += colorWinAmt + colorAmt;
    bets.colors.push({ colorKey, amount: colorAmt, won: colorWon, winAmount: colorWinAmt });

    const lhAmt = BET;
    totalBet += lhAmt;
    const lhWon = riverResult === strat.lh;
    const lhWinAmt = lhWon ? lhAmt * LOW_HIGH_PAYOUT : 0;
    if(lhWon) totalWin += lhWinAmt + lhAmt;
    bets.lowHigh = { type: strat.lh, amount: lhAmt, won: lhWon, winAmount: lhWinAmt };

    return {
      playerId: si+1,
      strategy: strat.name,
      totalBet, totalWin,
      profit: totalWin - totalBet,
      bets,
    };
  });

  const totalBets = players.reduce((s,p)=>s+p.totalBet, 0);
  const totalPayouts = players.reduce((s,p)=>s+p.totalWin, 0);
  const houseProfit = totalBets - totalPayouts;
  const rtp = totalBets > 0 ? ((totalPayouts/totalBets)*100).toFixed(2)+'%' : '0.00%';

  return {
    gameNumber,
    playerCount: players.length,
    totalBets,
    totalPayouts,
    houseProfit,
    rtp,
    cumulativeRTP: rtp,
    players,
    gameOutcome: {
      winningHand: winnerIdx >= 0 ? `Hand ${winnerIdx+1} (${HAND_LABELS[winnerIdx]})` : 'No Winner',
      winningRank: bestRank >= 0 ? RANK_NAMES[bestRank] : 'High Card',
      colorResult,
      riverResult,
      community: [c0,c1,c2,c3,c4].map(c => cardLabel(c)),
    },
  };
}

function runSimulation(count) {
  const games = [];
  let runningBets = 0, runningPayouts = 0;
  for(let i=0;i<count;i++) {
    const game = simulateGame(i+1);
    runningBets += game.totalBets;
    runningPayouts += game.totalPayouts;
    game.cumulativeRTP = runningBets>0 ? ((runningPayouts/runningBets)*100).toFixed(2)+'%' : '0.00%';
    games.push(game);
  }
  const totalBets = runningBets;
  const totalPayouts = runningPayouts;
  const overallRTP = totalBets>0 ? ((totalPayouts/totalBets)*100).toFixed(2)+'%' : '0.00%';
  return {
    games,
    summary: {
      totalGames: count,
      totalBets,
      totalPayouts,
      houseProfit: totalBets - totalPayouts,
      overallRTP,
      isCompliant: parseFloat(overallRTP)>=95 && parseFloat(overallRTP)<=98,
    },
  };
}

const COUNTS = [10, 25, 50, 100, 500, 1000, 5000, 10000];

function fmt(n) {
  if(n>=1_000_000) return (n/1_000_000).toFixed(1)+'M';
  if(n>=1000) return (n/1000).toFixed(1)+'K';
  return String(n);
}

export default function HandByHandAnalysis() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [expandedGame, setExpandedGame] = useState(null);
  const [showAddOptions, setShowAddOptions] = useState(false);

  const runNew = async (count) => {
    setLoading(true);
    setResults(null);
    setExpandedGame(null);
    await new Promise(r => setTimeout(r, 0));
    const data = runSimulation(count);
    setResults(data);
    setLoading(false);
  };

  const addGames = async (count) => {
    setLoading(true);
    setShowAddOptions(false);
    await new Promise(r => setTimeout(r, 0));
    const newData = runSimulation(count);
    setResults(prev => {
      if (!prev) return newData;
      const offset = prev.summary.totalGames;
      const numbered = newData.games.map((g,i) => ({ ...g, gameNumber: offset+i+1 }));
      const allGames = [...prev.games, ...numbered];
      let rb=0, rp=0;
      const recalc = allGames.map(g => {
        rb += g.totalBets; rp += g.totalPayouts;
        return { ...g, cumulativeRTP: rb>0?((rp/rb)*100).toFixed(2)+'%':'0.00%' };
      });
      const tb = prev.summary.totalBets + newData.summary.totalBets;
      const tp = prev.summary.totalPayouts + newData.summary.totalPayouts;
      const ov = tb>0?((tp/tb)*100).toFixed(2)+'%':'0.00%';
      return {
        games: recalc,
        summary: {
          totalGames: prev.summary.totalGames + count,
          totalBets: tb, totalPayouts: tp,
          houseProfit: tb-tp, overallRTP: ov,
          isCompliant: parseFloat(ov)>=95 && parseFloat(ov)<=98,
        },
      };
    });
    setLoading(false);
  };

  const clearData = () => { setResults(null); setExpandedGame(null); };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">← Back to Game</Link>
          <h1 className="text-4xl font-bold mb-2">Hand-by-Hand Analysis</h1>
          <p className="text-gray-400">Detailed breakdown per game — RTP and payout distribution across 3 player strategies</p>
        </div>

        <div className="mb-8 flex gap-3 flex-wrap items-center">
          {COUNTS.map(count => (
            <button
              key={count}
              onClick={() => runNew(count)}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg font-semibold transition-all bg-slate-700 hover:bg-slate-600 text-gray-300 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              {fmt(count)} Games
            </button>
          ))}

          {results && (
            <div className="flex gap-2 ml-auto">
              <div className="relative">
                <button
                  onClick={() => setShowAddOptions(v => !v)}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-lg font-semibold bg-green-700 hover:bg-green-600 text-white disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
                <AnimatePresence>
                  {showAddOptions && (
                    <motion.div
                      initial={{ opacity:0, y:-8 }}
                      animate={{ opacity:1, y:0 }}
                      exit={{ opacity:0, y:-8 }}
                      className="absolute top-full mt-2 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 min-w-[140px]"
                    >
                      {COUNTS.map(count => (
                        <button
                          key={count}
                          onClick={() => addGames(count)}
                          className="block w-full px-5 py-2 text-left text-gray-300 hover:bg-slate-700 text-sm first:rounded-t-lg last:rounded-b-lg"
                        >
                          +{fmt(count)} Games
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={clearData}
                disabled={loading}
                className="px-4 py-2.5 rounded-lg font-semibold bg-red-700 hover:bg-red-600 text-white disabled:opacity-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Clear
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-300">Simulating games...</p>
          </div>
        )}

        {results && !loading && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="space-y-6">
            <div className={`rounded-xl border-2 p-6 ${results.summary.isCompliant?'border-green-500 bg-green-900/20':'border-amber-500 bg-amber-900/20'}`}>
              <h2 className="text-2xl font-bold mb-4">
                {results.summary.isCompliant ? 'Blended RTP: COMPLIANT' : 'Blended RTP: OUTSIDE TARGET'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-gray-400 text-sm">Total Games</p><p className="text-3xl font-black">{results.summary.totalGames.toLocaleString()}</p></div>
                <div><p className="text-gray-400 text-sm">Total Bets</p><p className="text-2xl font-black">${fmt(results.summary.totalBets)}</p></div>
                <div>
                  <p className="text-gray-400 text-sm">House Profit</p>
                  <p className={`text-2xl font-black ${results.summary.houseProfit>=0?'text-green-400':'text-red-400'}`}>
                    {results.summary.houseProfit>=0?'+':''}${fmt(Math.abs(results.summary.houseProfit))}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Overall RTP</p>
                  <p className={`text-3xl font-black ${results.summary.isCompliant?'text-green-400':'text-amber-400'}`}>{results.summary.overallRTP}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-400">
                {results.summary.isCompliant ? '✓ Within 95–98% compliance range' : '⚠ Outside 95–98% target range'}
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-xl font-bold">Game Breakdown</h3>
                <p className="text-gray-400 text-sm mt-1">Click a row to expand player bet details</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/50 text-gray-400 text-xs uppercase">
                      <th className="px-3 py-3 text-left">Game</th>
                      <th className="px-3 py-3 text-right">Total Bets</th>
                      <th className="px-3 py-3 text-right">Payouts</th>
                      <th className="px-3 py-3 text-right">House P/L</th>
                      <th className="px-3 py-3 text-center">RTP</th>
                      <th className="px-3 py-3 text-center">Cumulative RTP</th>
                      <th className="px-3 py-3 text-center">Board</th>
                      <th className="px-3 py-3 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.games.map((game, idx) => (
                      <>
                        <tr
                          key={`g${idx}`}
                          className={`border-b border-slate-700/60 hover:bg-slate-700/30 cursor-pointer ${expandedGame===idx?'bg-slate-700/40':''}`}
                          onClick={() => setExpandedGame(expandedGame===idx ? null : idx)}
                        >
                          <td className="px-3 py-2.5 font-bold">#{game.gameNumber}</td>
                          <td className="px-3 py-2.5 text-right text-gray-300">${game.totalBets.toFixed(0)}</td>
                          <td className="px-3 py-2.5 text-right text-gray-300">${game.totalPayouts.toFixed(2)}</td>
                          <td className={`px-3 py-2.5 text-right font-bold ${game.houseProfit>=0?'text-green-400':'text-red-400'}`}>
                            {game.houseProfit>=0?'+':''}${game.houseProfit.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-center text-gray-300">{game.rtp}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-blue-400">{game.cumulativeRTP}</td>
                          <td className="px-3 py-2.5 text-center text-xs text-gray-500 font-mono">
                            {game.gameOutcome.community.join(' ')}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {expandedGame===idx
                              ? <ChevronUp className="w-4 h-4 mx-auto text-gray-400" />
                              : <ChevronDown className="w-4 h-4 mx-auto text-gray-400" />
                            }
                          </td>
                        </tr>

                        {expandedGame === idx && (
                          <tr key={`exp${idx}`}>
                            <td colSpan={8} className="p-0">
                              <motion.div
                                initial={{ opacity:0, height:0 }}
                                animate={{ opacity:1, height:'auto' }}
                                className="bg-slate-900/80 border-t border-slate-700 px-6 py-4"
                              >
                                <div className="mb-3">
                                  <h4 className="font-bold text-white mb-1">Game #{game.gameNumber} — Outcome</h4>
                                  <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="bg-yellow-900/40 border border-yellow-700/40 text-yellow-300 px-2 py-1 rounded">Winner: {game.gameOutcome.winningHand}</span>
                                    <span className="bg-blue-900/40 border border-blue-700/40 text-blue-300 px-2 py-1 rounded">Rank: {game.gameOutcome.winningRank}</span>
                                    <span className="bg-red-900/40 border border-red-700/40 text-red-300 px-2 py-1 rounded">Board: {game.gameOutcome.colorResult}</span>
                                    <span className="bg-teal-900/40 border border-teal-700/40 text-teal-300 px-2 py-1 rounded">River: {game.gameOutcome.riverResult}</span>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  {game.players.map((player, pi) => (
                                    <div key={pi} className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-700">
                                        <span className="font-bold text-white">Player {player.playerId} — {player.strategy}</span>
                                        <div className="flex gap-4 text-xs">
                                          <span>Bet: <span className="font-bold text-yellow-400">${player.totalBet.toFixed(0)}</span></span>
                                          <span>Win: <span className={`font-bold ${player.totalWin>=player.totalBet?'text-green-400':'text-red-400'}`}>${player.totalWin.toFixed(2)}</span></span>
                                          <span>P/L: <span className={`font-bold ${player.profit>=0?'text-green-400':'text-red-400'}`}>{player.profit>=0?'+':''}${player.profit.toFixed(2)}</span></span>
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        {player.bets.hands.map((h, hi) => (
                                          <div key={hi} className="flex items-center justify-between text-xs bg-blue-900/20 rounded px-3 py-1.5 border border-blue-800/30">
                                            <span className="text-blue-400 font-bold w-16">Hand {h.handId}</span>
                                            <span className="text-gray-300 flex-1">{h.cards}</span>
                                            <span className="text-yellow-400 w-16">Bet: ${h.amount}</span>
                                            <span className="text-gray-300 w-24">Won: ${h.winAmount.toFixed(2)}</span>
                                            <span className={`font-bold w-12 text-right ${h.won?'text-green-400':'text-red-400'}`}>{h.won?'WIN':'LOSS'}</span>
                                          </div>
                                        ))}
                                        {player.bets.ranks.map((rk, ri) => (
                                          <div key={ri} className="flex items-center justify-between text-xs bg-slate-700/30 rounded px-3 py-1.5 border border-slate-600/30">
                                            <span className="text-gray-400 font-bold w-16">Rank</span>
                                            <span className="text-gray-300 flex-1">{rk.rank}</span>
                                            <span className="text-yellow-400 w-16">Bet: ${rk.amount}</span>
                                            <span className="text-gray-300 w-24">Won: ${rk.winAmount.toFixed(2)}</span>
                                            <span className={`font-bold w-12 text-right ${rk.won?'text-green-400':'text-red-400'}`}>{rk.won?'WIN':'LOSS'}</span>
                                          </div>
                                        ))}
                                        {player.bets.colors.map((cl, ci) => (
                                          <div key={ci} className="flex items-center justify-between text-xs bg-red-900/20 rounded px-3 py-1.5 border border-red-800/30">
                                            <span className="text-red-400 font-bold w-16">Color</span>
                                            <span className="text-gray-300 flex-1">{cl.colorKey}</span>
                                            <span className="text-yellow-400 w-16">Bet: ${cl.amount}</span>
                                            <span className="text-gray-300 w-24">Won: ${cl.winAmount.toFixed(2)}</span>
                                            <span className={`font-bold w-12 text-right ${cl.won?'text-green-400':'text-red-400'}`}>{cl.won?'WIN':'LOSS'}</span>
                                          </div>
                                        ))}
                                        {player.bets.lowHigh && (
                                          <div className="flex items-center justify-between text-xs bg-teal-900/20 rounded px-3 py-1.5 border border-teal-800/30">
                                            <span className="text-teal-400 font-bold w-16">Low/High</span>
                                            <span className="text-gray-300 flex-1">{player.bets.lowHigh.type}</span>
                                            <span className="text-yellow-400 w-16">Bet: ${player.bets.lowHigh.amount}</span>
                                            <span className="text-gray-300 w-24">Won: ${player.bets.lowHigh.winAmount.toFixed(2)}</span>
                                            <span className={`font-bold w-12 text-right ${player.bets.lowHigh.won?'text-green-400':'text-red-400'}`}>{player.bets.lowHigh.won?'WIN':'LOSS'}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {!results && !loading && (
          <div className="text-center py-20 text-gray-500">
            <Play className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Select a game count above to start</p>
            <p className="text-sm mt-1">Each game deals 5 community cards and evaluates all 10 fixed hands</p>
          </div>
        )}

      </div>
    </div>
  );
}