import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Play, RefreshCw, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'individualBetAudit_results';
const PROGRESS_KEY = 'individualBetAudit_progress';

const BATCHES_PER_BET = 40; // 40 × 50K = 2M per bet

const BET_DEFINITIONS = [
  // Carded Hands
  { betType: 'hand', betKey: '1',  label: 'Hand 1 — A♦/10♥',  group: 'Carded Hands', currentPayout: 8.10 },
  { betType: 'hand', betKey: '2',  label: 'Hand 2 — K♣/K♠',   group: 'Carded Hands', currentPayout: 6.75 },
  { betType: 'hand', betKey: '3',  label: 'Hand 3 — Q♣/J♠',   group: 'Carded Hands', currentPayout: 8.52 },
  { betType: 'hand', betKey: '4',  label: 'Hand 4 — Q♠/10♠',  group: 'Carded Hands', currentPayout: 7.90 },
  { betType: 'hand', betKey: '5',  label: 'Hand 5 — J♣/9♣',   group: 'Carded Hands', currentPayout: 8.31 },
  { betType: 'hand', betKey: '6',  label: 'Hand 6 — 8♦/6♦',   group: 'Carded Hands', currentPayout: 10.18 },
  { betType: 'hand', betKey: '7',  label: 'Hand 7 — 7♦/7♠',   group: 'Carded Hands', currentPayout: 7.48 },
  { betType: 'hand', betKey: '8',  label: 'Hand 8 — 4♥/2♥',   group: 'Carded Hands', currentPayout: 11.95 },
  { betType: 'hand', betKey: '9',  label: 'Hand 9 — 3♣/3♥',   group: 'Carded Hands', currentPayout: 7.27 },
  { betType: 'hand', betKey: '10', label: 'Hand 10 — A♥/5♦',  group: 'Carded Hands', currentPayout: 9.77 },
  // Hand Ranks
  { betType: 'rank', betKey: 'One Pair',        label: 'One Pair',        group: 'Hand Ranks', currentPayout: null, progressive: true },
  { betType: 'rank', betKey: 'Two Pair',         label: 'Two Pair',        group: 'Hand Ranks', currentPayout: 15.98 },
  { betType: 'rank', betKey: 'Three of a Kind',  label: 'Three of a Kind', group: 'Hand Ranks', currentPayout: 3.81 },
  { betType: 'rank', betKey: 'Straight',         label: 'Straight',        group: 'Hand Ranks', currentPayout: 4.93 },
  { betType: 'rank', betKey: 'Flush',            label: 'Flush',           group: 'Hand Ranks', currentPayout: 3.21 },
  { betType: 'rank', betKey: 'Full House',       label: 'Full House',      group: 'Hand Ranks', currentPayout: 2.53 },
  { betType: 'rank', betKey: 'Four of a Kind',   label: 'Four of a Kind',  group: 'Hand Ranks', currentPayout: 12.77 },
  { betType: 'rank', betKey: 'Straight Flush',   label: 'Straight Flush',  group: 'Hand Ranks', currentPayout: null, progressive: true },
  { betType: 'rank', betKey: 'Royal Flush',      label: 'Royal Flush',     group: 'Hand Ranks', currentPayout: null, progressive: true },
  // Color Board
  { betType: 'color', betKey: '3R', label: '3 Red',   group: 'Color Board', currentPayout: 0.81 },
  { betType: 'color', betKey: '3B', label: '3 Black',  group: 'Color Board', currentPayout: 0.81 },
  { betType: 'color', betKey: '4R', label: '4 Red',   group: 'Color Board', currentPayout: 5.25 },
  { betType: 'color', betKey: '4B', label: '4 Black',  group: 'Color Board', currentPayout: 5.25 },
  { betType: 'color', betKey: '5R', label: '5 Red',   group: 'Color Board', currentPayout: 20.56 },
  { betType: 'color', betKey: '5B', label: '5 Black',  group: 'Color Board', currentPayout: 20.56 },
  // Low / High
  { betType: 'lh', betKey: 'LOW',  label: 'River — LOW',  group: 'Low / High', currentPayout: 0.95 },
  { betType: 'lh', betKey: 'HIGH', label: 'River — HIGH', group: 'Low / High', currentPayout: 0.95 },
];

const GROUPS = ['Carded Hands', 'Hand Ranks', 'Color Board', 'Low / High'];

const GROUP_COLORS = {
  'Carded Hands': 'text-blue-400',
  'Hand Ranks':   'text-purple-400',
  'Color Board':  'text-red-400',
  'Low / High':   'text-teal-400',
};

function RTPCell({ rtp }) {
  if (rtp === null || rtp === undefined) return <span className="text-gray-500">—</span>;
  const num = parseFloat(rtp);
  const ok = num >= 95 && num <= 98;
  return (
    <span className={`font-bold ${ok ? 'text-green-400' : num > 98 ? 'text-orange-400' : 'text-red-400'}`}>
      {rtp}%
    </span>
  );
}

function OddsCell({ odds, current }) {
  if (odds === null || odds === undefined) return <span className="text-gray-500">—</span>;
  const diff = current !== null ? odds - current : null;
  return (
    <span className="font-bold text-yellow-300">
      {odds}:1
      {diff !== null && (
        <span className={`ml-1 text-xs ${diff > 0.5 ? 'text-green-400' : diff < -0.5 ? 'text-red-400' : 'text-gray-400'}`}>
          ({diff > 0 ? '+' : ''}{diff.toFixed(2)})
        </span>
      )}
    </span>
  );
}

export default function IndividualBetAudit() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  });
  const [progress, setProgress] = useState(() => {
    try { return parseInt(localStorage.getItem(PROGRESS_KEY) || '0'); } catch { return 0; }
  });
  const [currentBet, setCurrentBet] = useState('');
  const abortRef = useRef(false);

  // Persist results & progress whenever they change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(results)); } catch {}
  }, [results]);
  useEffect(() => {
    try { localStorage.setItem(PROGRESS_KEY, String(progress)); } catch {}
  }, [progress]);

  const totalBets = BET_DEFINITIONS.length;

  const clearResults = () => {
    setResults({});
    setProgress(0);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROGRESS_KEY);
  };

  const runAudit = async () => {
    setRunning(true);
    setResults({});
    setProgress(0);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROGRESS_KEY);
    abortRef.current = false;

    for (let bi = 0; bi < BET_DEFINITIONS.length; bi++) {
      if (abortRef.current) { setAborted(true); break; }
      const def = BET_DEFINITIONS[bi];
      setCurrentBet(def.label);

      // Accumulate 20 batches of 100K = 2M total
      let totalWins = 0;
      let totalPaid = 0;
      const totalGames = BATCHES_PER_BET * 50_000;

      for (let b = 0; b < BATCHES_PER_BET; b++) {
        if (abortRef.current) break;
        try {
          const res = await base44.functions.invoke('individualBetAudit', {
            batchSize: 50_000,
            betType: def.betType,
            betKey: def.betKey,
          });
          if (res.data.success) {
            totalWins += res.data.wins;
            // reconstruct totalPaid from rtp
            const batchBet = 50_000 * 100;
            totalPaid += (parseFloat(res.data.rtp) / 100) * batchBet;
          }
        } catch (e) {
          // skip batch on error
        }
      }

      const winFreq = totalWins / totalGames;
      const totalBetAmt = totalGames * 100;
      const rtp = totalBetAmt > 0 ? (totalPaid / totalBetAmt) * 100 : 0;
      const fairOdds = winFreq > 0 ? Math.round(((1 / winFreq) - 1) * 100) / 100 : null;
      const for965   = winFreq > 0 ? Math.round(((0.965 / winFreq) - 1) * 100) / 100 : null;
      const for95    = winFreq > 0 ? Math.round(((0.95  / winFreq) - 1) * 100) / 100 : null;
      const for98    = winFreq > 0 ? Math.round(((0.98  / winFreq) - 1) * 100) / 100 : null;

      const key = `${def.betType}:${def.betKey}`;
      const newResult = {
        wins: totalWins,
        totalGames,
        winFrequency: (winFreq * 100).toFixed(4),
        rtp: rtp.toFixed(2),
        fairOdds,
        for95, for965, for98,
        currentPayout: def.currentPayout,
        progressive: def.progressive,
      };
      setResults(prev => {
        const updated = { ...prev, [key]: newResult };
        // Also persist immediately in case of crash
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
        return updated;
      });
      const newProgress = bi + 1;
      setProgress(newProgress);
      try { localStorage.setItem(PROGRESS_KEY, String(newProgress)); } catch {}
    }
    setRunning(false);
    setCurrentBet('');
  };

  const pct = Math.round((progress / totalBets) * 100);
  const anyResults = Object.keys(results).length > 0;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
        <h3 className="font-bold text-lg mb-1">Individual Bet Audit — 2M Games Per Bet</h3>
        <p className="text-gray-400 text-sm mb-4">
          Tests every betting option in complete isolation. Each bet runs 2,000,000 simulated games to measure true win frequency, 
          then shows the mathematically correct odds needed to hit 95%, 96.5%, and 98% RTP.
        </p>
        <div className="flex gap-3 items-center">
          <button
            onClick={runAudit}
            disabled={running}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-gray-500 font-bold text-sm transition-all"
          >
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'Running...' : 'Run Full Audit (2M × 27 bets)'}
          </button>
          {running && (
            <button
              onClick={() => { abortRef.current = true; }}
              className="text-red-400 border border-red-700 px-3 py-2 rounded-lg text-sm hover:bg-red-900/20"
            >
              Abort
            </button>
          )}
          {!running && Object.keys(results).length > 0 && (
            <button
              onClick={clearResults}
              className="flex items-center gap-1.5 text-gray-500 border border-slate-600 px-3 py-2 rounded-lg text-sm hover:text-red-400 hover:border-red-700 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Results
            </button>
          )}
        </div>

        {/* Progress */}
        {(running || anyResults) && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{running ? `Testing: ${currentBet}` : progress === totalBets ? '✓ Complete' : `⚡ Restored — ${progress}/${totalBets} bets recovered`}</span>
              <span>{progress}/{totalBets} bets — {(progress * 2_000_000).toLocaleString()} total games</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-2 rounded-full bg-green-500"
                animate={{ width: `${pct}%` }}
                transition={{ ease: 'linear', duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Results by group */}
      {anyResults && (
        <div className="space-y-5">
          {GROUPS.map(group => {
            const defs = BET_DEFINITIONS.filter(d => d.group === group);
            const hasAny = defs.some(d => results[`${d.betType}:${d.betKey}`]);
            if (!hasAny) return null;
            return (
              <div key={group} className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
                <div className={`px-5 py-3 border-b border-slate-700 font-bold ${GROUP_COLORS[group]}`}>{group}</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-xs text-gray-400 uppercase bg-slate-900/40">
                        <th className="px-4 py-2 text-left">Bet</th>
                        <th className="px-4 py-2 text-right">Wins (of 2M)</th>
                        <th className="px-4 py-2 text-right">Win %</th>
                        <th className="px-4 py-2 text-right">Actual RTP</th>
                        <th className="px-4 py-2 text-right">Current Odds</th>
                        <th className="px-4 py-2 text-right">Fair (1:1 RTP)</th>
                        <th className="px-4 py-2 text-right bg-green-900/20">For 95% RTP</th>
                        <th className="px-4 py-2 text-right bg-yellow-900/20">For 96.5% RTP</th>
                        <th className="px-4 py-2 text-right bg-blue-900/20">For 98% RTP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defs.map(def => {
                        const key = `${def.betType}:${def.betKey}`;
                        const r = results[key];
                        if (!r) return (
                          <tr key={key} className="border-b border-slate-700/40">
                            <td className="px-4 py-2 text-gray-300">{def.label}</td>
                            <td colSpan="8" className="px-4 py-2 text-gray-600 text-xs italic">pending...</td>
                          </tr>
                        );
                        return (
                          <motion.tr
                            key={key}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="border-b border-slate-700/40 hover:bg-slate-700/20"
                          >
                            <td className="px-4 py-2 font-semibold text-white">{def.label}</td>
                            <td className="px-4 py-2 text-right text-white font-mono">
                              {r.wins.toLocaleString()}
                              <span className="text-gray-500 text-xs ml-1">/ {(r.totalGames / 1_000_000).toFixed(0)}M</span>
                            </td>
                            <td className="px-4 py-2 text-right text-gray-300">{r.winFrequency}%</td>
                            <td className="px-4 py-2 text-right"><RTPCell rtp={r.rtp} /></td>
                            <td className="px-4 py-2 text-right">
                              {r.progressive
                                ? <span className="text-yellow-400 text-xs font-bold">Progressive</span>
                                : <span className="text-gray-300">{r.currentPayout}:1</span>}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-400">
                              {r.fairOdds !== null ? `${r.fairOdds}:1` : '—'}
                            </td>
                            <td className="px-4 py-2 text-right bg-green-900/10">
                              {r.progressive ? <span className="text-yellow-400 text-xs">Jackpot</span> : <OddsCell odds={r.for95}  current={r.currentPayout} />}
                            </td>
                            <td className="px-4 py-2 text-right bg-yellow-900/10">
                              {r.progressive ? <span className="text-yellow-400 text-xs">Jackpot</span> : <OddsCell odds={r.for965} current={r.currentPayout} />}
                            </td>
                            <td className="px-4 py-2 text-right bg-blue-900/10">
                              {r.progressive ? <span className="text-yellow-400 text-xs">Jackpot</span> : <OddsCell odds={r.for98}  current={r.currentPayout} />}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 text-xs text-gray-400 space-y-1">
            <p className="font-semibold text-gray-300 mb-2">Reading the table:</p>
            <p>• <span className="text-green-400">Green RTP</span> = within 95–98% target &nbsp;|&nbsp; <span className="text-orange-400">Orange</span> = too high &nbsp;|&nbsp; <span className="text-red-400">Red</span> = too low</p>
            <p>• <span className="text-yellow-300">For 96.5% column</span> = the exact payout multiplier needed to hit the 96.5% midpoint target</p>
            <p>• <span className="text-green-400">(+x.xx)</span> = suggested odds are higher than current &nbsp;|&nbsp; <span className="text-red-400">(-x.xx)</span> = lower than current</p>
            <p>• Progressive bets (One Pair, Straight Flush, Royal Flush) are jackpot-funded — odds not applicable here</p>
          </div>
        </div>
      )}
    </div>
  );
}