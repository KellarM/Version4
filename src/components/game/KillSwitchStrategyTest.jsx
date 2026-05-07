// ============================================================
// KILL-SWITCH STRATEGY TEST
// Runs any KS3/KS4 strategy against the strategyBettingTestV2
// backend function and displays results inline.
// ============================================================
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, RefreshCw, Download, ChevronDown, ChevronRight, Swords } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STRATEGIES = [
  // KS4
  { key: 'KS4_SteadyHolder',      label: 'Steady Holder',       group: 'KS4 — 4 Hands', desc: 'Rotates 4 combo sets each round: (H2 H6 H7 H8) → (H4 H5 H6 H8) → (H2 H7 H8 H9) → (H6 H7 H8 H9)' },
  { key: 'KS4_SteadySwapper',     label: 'Steady Swapper',      group: 'KS4 — 4 Hands', desc: 'Anchors H1+H10 (both aces). Slots 3 & 4 chase the last 2 distinct winning hands.' },
  { key: 'KS4_TopPayoutAdaptive', label: 'Top Payout Adaptive', group: 'KS4 — 4 Hands', desc: 'Starts at top-4 payout hands, shifts window down after consecutive losses.' },
  { key: 'KS4_RandomMixer',       label: 'Random Mixer',        group: 'KS4 — 4 Hands', desc: '4 randomly-selected hands every round. Pure chaos test.' },
  { key: 'KS4_FrequencyChaser',   label: 'Frequency Chaser',    group: 'KS4 — 4 Hands', desc: 'Targets the 4 pair-heavy hands for maximum win frequency (H2 H7 H9 H6).' },
  { key: 'KS4_ValueBalance',      label: 'Value Balance',       group: 'KS4 — 4 Hands', desc: '2 high-payout (H1 H3) + 2 high-frequency (H2 H7). Blended approach.' },
  // KS3
  { key: 'KS3_TopThreeSteady',    label: 'Top 3 Steady',        group: 'KS3 — 3 Hands', desc: 'H1 + H3 + H10 every round. Top 3 payouts, boards locked.' },
  { key: 'KS3_LastWinChaser',     label: 'Last Win Chaser',     group: 'KS3 — 3 Hands', desc: 'Anchors H1 + H3. 3rd slot always chases last winning hand.' },
  { key: 'KS3_RandomMixer',       label: 'Random Mixer',        group: 'KS3 — 3 Hands', desc: '3 randomly-selected hands every round.' },
  { key: 'KS3_Payout3Adaptive',   label: 'Payout Adaptive',     group: 'KS3 — 3 Hands', desc: 'Top-3 payout window shifts down after consecutive losses.' },
  { key: 'KS3_PairSpecialist',    label: 'Pair Specialist',     group: 'KS3 — 3 Hands', desc: 'KK + 77 + 33 (H2 H7 H9) — maximises hit rate via pairs.' },
];

const GROUPS = [...new Set(STRATEGIES.map(s => s.group))];
const GAME_COUNTS = [500, 1000, 5000, 10000, 25000];

const ROI_COLOR = (roi) => {
  const n = parseFloat(roi);
  if (n >= 0)   return 'text-green-400';
  if (n >= -5)  return 'text-yellow-300';
  if (n >= -10) return 'text-orange-400';
  return 'text-red-400';
};

function StatBox({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-lg p-3 border ${highlight ? 'bg-yellow-900/20 border-yellow-700/40' : 'bg-slate-800/60 border-slate-700/50'}`}>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-lg font-bold ${highlight ? 'text-yellow-300' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function KillSwitchStrategyTest({ onClose }) {
  const [selectedGroup, setSelectedGroup] = useState(GROUPS[0]);
  const [selectedKey, setSelectedKey]     = useState(STRATEGIES[0].key);
  const [gameCount, setGameCount]         = useState(5000);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [results, setResults]             = useState(null);
  const [expandedGame, setExpandedGame]   = useState(null);

  const stratInGroup = STRATEGIES.filter(s => s.group === selectedGroup);
  const stratInfo    = STRATEGIES.find(s => s.key === selectedKey);

  async function runTest() {
    setLoading(true);
    setError(null);
    setResults(null);
    setExpandedGame(null);
    try {
      const res = await base44.functions.invoke('strategyBettingTestV2', {
        strategyName: selectedKey,
        gamesToSimulate: gameCount,
      });
      setResults(res.data);
    } catch (err) {
      setError(err.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!results?.detailedGameLog?.length) return;
    const rows = [
      ['Game','Balance Before','Total Bet','Net Result','Balance After','Kill Switch','Hand Count','Winning Hand','Winning Rank','Community Flop','Turn','River'],
      ...results.detailedGameLog.map(g => [
        g.gameNumber, g.balanceBefore, g.totalBet, g.netResult.toFixed(2), g.balanceAfter.toFixed(2),
        g.killSwitchActive ? 'YES' : 'NO', g.handCount,
        g.winningPositions?.hand, g.winningPositions?.rank,
        g.communityCards?.flop?.join(' '), g.communityCards?.turn, g.communityCards?.river,
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `KS_${selectedKey}_${gameCount}games.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-slate-900 border border-purple-700/40 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-black/70"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-700/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-900/50 border border-purple-700/50 flex items-center justify-center">
              <Swords className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Kill-Switch Strategy Test</h2>
              <p className="text-purple-400/70 text-xs">3 & 4 hand player simulations — boards locked, hand-only payouts</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Group tabs */}
          <div className="flex gap-2 flex-wrap">
            {GROUPS.map(g => (
              <button key={g}
                onClick={() => { setSelectedGroup(g); const first = STRATEGIES.find(s => s.group === g); if (first) setSelectedKey(first.key); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedGroup === g ? 'bg-purple-700 text-white' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'}`}
              >{g}</button>
            ))}
          </div>

          {/* Strategy selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stratInGroup.map(s => (
              <button key={s.key}
                onClick={() => setSelectedKey(s.key)}
                className={`text-left px-3 py-2.5 rounded-xl border transition-all ${selectedKey === s.key ? 'bg-purple-900/30 border-purple-600/60 text-white' : 'bg-slate-800/60 border-slate-700/40 text-gray-400 hover:border-slate-600 hover:text-gray-200'}`}
              >
                <div className="text-xs font-bold mb-0.5">{s.label}</div>
                <div className="text-[10px] text-gray-500 leading-relaxed">{s.desc}</div>
              </button>
            ))}
          </div>

          {/* Game count + run */}
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Rounds</label>
              <select value={gameCount} onChange={e => setGameCount(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500">
                {GAME_COUNTS.map(n => <option key={n} value={n}>{n.toLocaleString()} games</option>)}
              </select>
            </div>
            <button onClick={runTest} disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all mt-4">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loading ? 'Simulating…' : 'Run Test'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-red-300 text-sm">{error}</div>
          )}

          {/* Results */}
          {results && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Strategy name banner */}
              <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl px-4 py-3">
                <div className="text-purple-300 font-bold text-sm">{results.strategyFriendlyName}</div>
                <div className="text-purple-400/60 text-xs mt-0.5">{results.gamesActuallyPlayed.toLocaleString()} rounds simulated · Kill-switch active every round</div>
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatBox label="ROI" value={<span className={ROI_COLOR(results.roi)}>{results.roi}</span>} sub="Return on $1,000 start" highlight />
                <StatBox label="Final Balance" value={`$${parseFloat(results.finalBalance).toFixed(0)}`} sub={`Started $1,000`} />
                <StatBox label="Win Rate" value={results.stats.winRate} sub={`${results.stats.winCount} wins / ${results.stats.lossCount} losses`} />
                <StatBox label="Avg P&L / Game" value={`$${results.avgProfitPerGame}`} sub="Net per round" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatBox label="Max Bankroll" value={`$${parseFloat(results.maxBankrollEver).toFixed(0)}`} sub={`Game #${results.maxBankrollGameNumber}`} />
                <StatBox label="Best Profit" value={`$${results.stats.maxProfit}`} sub="Peak net gain" />
                <StatBox label="Max Win Streak" value={results.stats.maxWinStreak} />
                <StatBox label="Max Loss Streak" value={results.stats.maxLossStreak} />
              </div>

              {/* Export */}
              {results.detailedGameLog?.length > 0 && (
                <button onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-gray-300 hover:text-white text-xs font-semibold transition-all">
                  <Download className="w-3.5 h-3.5" />
                  Export CSV ({results.detailedGameLog.length} rows)
                </button>
              )}

              {/* Game log (first 100) */}
              {results.detailedGameLog?.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Round Log (first {Math.min(results.detailedGameLog.length, 100)})</div>
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {results.detailedGameLog.slice(0, 100).map(g => (
                      <div key={g.gameNumber}
                        className={`rounded-lg border text-xs transition-all cursor-pointer ${g.gameWon ? 'border-green-800/40 bg-green-900/10' : 'border-slate-700/40 bg-slate-800/30'}`}
                        onClick={() => setExpandedGame(expandedGame === g.gameNumber ? null : g.gameNumber)}
                      >
                        <div className="flex items-center gap-3 px-3 py-2">
                          <span className="text-gray-500 w-10 flex-shrink-0">#{g.gameNumber}</span>
                          <span className={`w-14 font-bold flex-shrink-0 ${g.gameWon ? 'text-green-400' : 'text-red-400'}`}>
                            {g.gameWon ? `+$${g.netResult.toFixed(0)}` : `−$${Math.abs(g.netResult).toFixed(0)}`}
                          </span>
                          <span className="text-gray-500 flex-1 truncate">
                            W: {g.winningPositions?.hand} · {g.winningPositions?.rank}
                          </span>
                          <span className="text-gray-600 flex-shrink-0">
                            {expandedGame === g.gameNumber ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </span>
                        </div>
                        <AnimatePresence>
                          {expandedGame === g.gameNumber && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-slate-700/40">
                              <div className="px-3 py-2 space-y-1.5 text-[10px] text-gray-400">
                                <div className="flex gap-4">
                                  <span>Balance: <span className="text-white">${g.balanceBefore.toFixed(0)} → ${g.balanceAfter.toFixed(0)}</span></span>
                                  <span>Bet: <span className="text-white">${g.totalBet}</span></span>
                                  <span>Hands: <span className="text-white">{g.handCount}</span></span>
                                </div>
                                <div>Board: <span className="text-white">{g.communityCards?.flop?.join(' ')} | {g.communityCards?.turn} | {g.communityCards?.river}</span></div>
                                <div>Winners: <span className="text-purple-300">{g.winningPositions?.hand}</span> · <span className="text-yellow-300">{g.winningPositions?.rank}</span> · Colors: {g.winningPositions?.colors?.join(' ') || 'none'}</div>
                                {g.bets?.map((b, i) => (
                                  <div key={i} className={b.won ? 'text-green-400' : 'text-gray-600'}>
                                    {b.won ? '✓' : '✗'} {b.position}: ${b.bet} {b.won ? `→ $${b.payout.toFixed(2)}` : ''}
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
