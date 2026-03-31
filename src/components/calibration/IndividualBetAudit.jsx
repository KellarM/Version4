import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Play, RefreshCw, Trash2, FileDown, SkipForward } from 'lucide-react';
import { CARDED_HAND_PAYOUTS, HAND_RANK_PAYOUTS, COLOR_BOARD_PAYOUTS, LOW_HIGH_PAYOUT } from '@/lib/payoutConstants';
import { jsPDF } from 'jspdf';

const STORAGE_KEY = 'individualBetAudit_results';
const PROGRESS_KEY = 'individualBetAudit_progress';
const BATCHES_PER_BET_DEFAULT = 40; // 40 × 50K = 2M per bet

// Sample size options: label, total games per bet, batches of 50K each
const SAMPLE_SIZES = [
  { label: '2M (Full)', gamesPerBet: 2_000_000, batches: 40 },
  { label: '1M',        gamesPerBet: 1_000_000, batches: 20 },
  { label: '500K',      gamesPerBet:   500_000, batches: 10 },
  { label: '100K',      gamesPerBet:   100_000, batches:  2 },
];

const BET_DEFINITIONS = [
  { betType: 'hand', betKey: '1',  label: 'Hand 1 — A♦/10♥',  group: 'Carded Hands', currentPayout: CARDED_HAND_PAYOUTS[0] },
  { betType: 'hand', betKey: '2',  label: 'Hand 2 — K♣/K♠',   group: 'Carded Hands', currentPayout: CARDED_HAND_PAYOUTS[1] },
  { betType: 'hand', betKey: '3',  label: 'Hand 3 — Q♣/J♠',   group: 'Carded Hands', currentPayout: CARDED_HAND_PAYOUTS[2] },
  { betType: 'hand', betKey: '4',  label: 'Hand 4 — Q♠/10♠',  group: 'Carded Hands', currentPayout: CARDED_HAND_PAYOUTS[3] },
  { betType: 'hand', betKey: '5',  label: 'Hand 5 — J♣/9♣',   group: 'Carded Hands', currentPayout: CARDED_HAND_PAYOUTS[4] },
  { betType: 'hand', betKey: '6',  label: 'Hand 6 — 8♦/6♦',   group: 'Carded Hands', currentPayout: CARDED_HAND_PAYOUTS[5] },
  { betType: 'hand', betKey: '7',  label: 'Hand 7 — 7♦/7♠',   group: 'Carded Hands', currentPayout: CARDED_HAND_PAYOUTS[6] },
  { betType: 'hand', betKey: '8',  label: 'Hand 8 — 4♥/2♥',   group: 'Carded Hands', currentPayout: CARDED_HAND_PAYOUTS[7] },
  { betType: 'hand', betKey: '9',  label: 'Hand 9 — 3♣/3♥',   group: 'Carded Hands', currentPayout: CARDED_HAND_PAYOUTS[8] },
  { betType: 'hand', betKey: '10', label: 'Hand 10 — A♥/5♦',  group: 'Carded Hands', currentPayout: CARDED_HAND_PAYOUTS[9] },
  { betType: 'rank', betKey: 'One Pair',        label: 'One Pair',        group: 'Hand Ranks', currentPayout: HAND_RANK_PAYOUTS['One Pair'],        progressive: true },
  { betType: 'rank', betKey: 'Two Pair',         label: 'Two Pair',        group: 'Hand Ranks', currentPayout: HAND_RANK_PAYOUTS['Two Pair'] },
  { betType: 'rank', betKey: 'Three of a Kind',  label: 'Three of a Kind', group: 'Hand Ranks', currentPayout: HAND_RANK_PAYOUTS['Three of a Kind'] },
  { betType: 'rank', betKey: 'Straight',         label: 'Straight',        group: 'Hand Ranks', currentPayout: HAND_RANK_PAYOUTS['Straight'] },
  { betType: 'rank', betKey: 'Flush',            label: 'Flush',           group: 'Hand Ranks', currentPayout: HAND_RANK_PAYOUTS['Flush'] },
  { betType: 'rank', betKey: 'Full House',       label: 'Full House',      group: 'Hand Ranks', currentPayout: HAND_RANK_PAYOUTS['Full House'] },
  { betType: 'rank', betKey: 'Four of a Kind',   label: 'Four of a Kind',  group: 'Hand Ranks', currentPayout: HAND_RANK_PAYOUTS['Four of a Kind'] },
  { betType: 'rank', betKey: 'Straight Flush',   label: 'Straight Flush',  group: 'Hand Ranks', currentPayout: HAND_RANK_PAYOUTS['Straight Flush'],  progressive: true },
  { betType: 'rank', betKey: 'Royal Flush',      label: 'Royal Flush',     group: 'Hand Ranks', currentPayout: HAND_RANK_PAYOUTS['Royal Flush'],      progressive: true },
  { betType: 'color', betKey: '3R', label: '3 Red',    group: 'Color Board', currentPayout: COLOR_BOARD_PAYOUTS['3R'] },
  { betType: 'color', betKey: '3B', label: '3 Black',  group: 'Color Board', currentPayout: COLOR_BOARD_PAYOUTS['3B'] },
  { betType: 'color', betKey: '4R', label: '4 Red',    group: 'Color Board', currentPayout: COLOR_BOARD_PAYOUTS['4R'] },
  { betType: 'color', betKey: '4B', label: '4 Black',  group: 'Color Board', currentPayout: COLOR_BOARD_PAYOUTS['4B'] },
  { betType: 'color', betKey: '5R', label: '5 Red',    group: 'Color Board', currentPayout: COLOR_BOARD_PAYOUTS['5R'] },
  { betType: 'color', betKey: '5B', label: '5 Black',  group: 'Color Board', currentPayout: COLOR_BOARD_PAYOUTS['5B'] },
  { betType: 'lh', betKey: 'LOW',  label: 'River — LOW',  group: 'Low / High', currentPayout: LOW_HIGH_PAYOUT },
  { betType: 'lh', betKey: 'HIGH', label: 'River — HIGH', group: 'Low / High', currentPayout: LOW_HIGH_PAYOUT },
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
  const [selectedSize, setSelectedSize] = useState(SAMPLE_SIZES[0]);
  const [results, setResults] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  });
  const [progress, setProgress] = useState(() => {
    try { return parseInt(localStorage.getItem(PROGRESS_KEY) || '0'); } catch { return 0; }
  });
  const [currentBet, setCurrentBet] = useState('');
  const abortRef = useRef(false);

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

  // Core loop — starts from startIndex, uses batchesPerBet batches of 50K each
  const runAuditFrom = async (startIndex, batchesPerBet, existingResults) => {
    setRunning(true);
    abortRef.current = false;

    let currentResults = { ...existingResults };

    outer: for (let bi = startIndex; bi < BET_DEFINITIONS.length; bi++) {
      if (abortRef.current) break;
      const def = BET_DEFINITIONS[bi];
      setCurrentBet(def.label);

      let totalWins = 0;
      let totalPaid = 0;
      const totalGames = batchesPerBet * 50_000;

      for (let b = 0; b < batchesPerBet; b++) {
        if (abortRef.current) break outer;
        try {
          const res = await base44.functions.invoke('individualBetAudit', {
            batchSize: 50_000,
            betType: def.betType,
            betKey: def.betKey,
          });
          if (res.data.success) {
            totalWins += res.data.wins;
            const batchBet = 50_000 * 100;
            totalPaid += (parseFloat(res.data.rtp) / 100) * batchBet;
          }
        } catch (e) {
          // skip batch on error
        }
      }

      if (abortRef.current) break;

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
      currentResults = { ...currentResults, [key]: newResult };
      setResults(prev => {
        const updated = { ...prev, [key]: newResult };
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

  // Full fresh run
  const runAudit = (size) => {
    setResults({});
    setProgress(0);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROGRESS_KEY);
    runAuditFrom(0, size.batches, {});
  };

  // Continue from where we left off (uses same batch count as selected size)
  const continueAudit = () => {
    runAuditFrom(progress, selectedSize.batches, results);
  };

  const canContinue = !running && progress > 0 && progress < totalBets;

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const now = new Date().toLocaleString();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 20, 'F');
    doc.setTextColor(250, 204, 21);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Rapid Fire Texas 10 — Individual Bet Audit Report', 10, 13);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${now}  |  ${progress} bets completed  |  ${selectedSize.gamesPerBet.toLocaleString()} games/bet`, pageW - 10, 13, { align: 'right' });

    let y = 28;
    const colX = [10, 72, 102, 122, 145, 165, 185, 210, 235];
    const headers = ['Bet', 'Win %', 'Actual RTP', 'Current Odds', 'Fair (1:1)', 'For 95%', 'For 96.5%', 'For 98%', 'Status'];

    GROUPS.forEach(group => {
      const defs = BET_DEFINITIONS.filter(d => d.group === group);
      const hasAny = defs.some(d => results[`${d.betType}:${d.betKey}`]);
      if (!hasAny) return;

      if (y > 175) { doc.addPage(); y = 15; }

      doc.setFillColor(30, 41, 59);
      doc.rect(10, y - 4, pageW - 20, 7, 'F');
      doc.setTextColor(150, 200, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(group, 12, y);
      y += 6;

      doc.setFillColor(51, 65, 85);
      doc.rect(10, y - 4, pageW - 20, 6, 'F');
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(7);
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += 5;

      defs.forEach((def, idx) => {
        const key = `${def.betType}:${def.betKey}`;
        const r = results[key];
        if (!r) return;

        if (y > 185) { doc.addPage(); y = 15; }

        if (idx % 2 === 0) {
          doc.setFillColor(20, 30, 48);
          doc.rect(10, y - 4, pageW - 20, 6, 'F');
        }

        const rtp = parseFloat(r.rtp);
        const rtpOk = rtp >= 95 && rtp <= 98;

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(220, 220, 220);
        doc.text(def.label, colX[0], y);
        doc.text(r.winFrequency + '%', colX[1], y);

        doc.setTextColor(rtpOk ? 74 : rtp > 98 ? 251 : 248, rtpOk ? 222 : rtp > 98 ? 146 : 113, rtpOk ? 128 : rtp > 98 ? 60 : 113);
        doc.text(r.rtp + '%', colX[2], y);

        doc.setTextColor(200, 200, 200);
        doc.text(r.progressive ? 'Progressive' : r.currentPayout + ':1', colX[3], y);
        doc.text(r.fairOdds !== null ? r.fairOdds + ':1' : '—', colX[4], y);

        doc.setTextColor(r.progressive ? 200 : 150, r.progressive ? 180 : 220, r.progressive ? 100 : 150);
        doc.text(r.progressive ? 'Jackpot' : (r.for95 + ':1'), colX[5], y);
        doc.setTextColor(250, 204, 21);
        doc.text(r.progressive ? 'Jackpot' : (r.for965 + ':1'), colX[6], y);
        doc.setTextColor(100, 180, 250);
        doc.text(r.progressive ? 'Jackpot' : (r.for98 + ':1'), colX[7], y);

        doc.setTextColor(rtpOk ? 74 : 248, rtpOk ? 222 : 113, rtpOk ? 128 : 113);
        doc.text(rtpOk ? 'PASS' : rtp > 98 ? 'HIGH' : 'LOW', colX[8], y);

        y += 6;
      });
      y += 4;
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Rapid Fire Texas 10 — Confidential Gaming Audit  |  Page ${i} of ${totalPages}`, pageW / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
    }

    doc.save(`RapidFire_BetAudit_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const pct = Math.round((progress / totalBets) * 100);
  const anyResults = Object.keys(results).length > 0;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
        <h3 className="font-bold text-lg mb-1">Individual Bet Audit</h3>
        <p className="text-gray-400 text-sm mb-4">
          Tests every betting option in isolation. Choose a sample size, then run a fresh audit or continue a paused one.
          Results show win frequency, actual RTP, and the correct odds needed to hit 95%, 96.5%, and 98% RTP.
        </p>

        {/* Sample size selector */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Games per bet:</span>
          {SAMPLE_SIZES.map(s => (
            <button
              key={s.label}
              onClick={() => setSelectedSize(s)}
              disabled={running}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                ${selectedSize.label === s.label
                  ? 'border-yellow-400 bg-yellow-600 text-black'
                  : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-yellow-600 hover:text-yellow-300'}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Run fresh */}
          <button
            onClick={() => runAudit(selectedSize)}
            disabled={running}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-gray-500 font-bold text-sm transition-all"
          >
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? `Running... (${selectedSize.gamesPerBet.toLocaleString()}/bet)` : `Run Full Audit — ${selectedSize.label} per bet`}
          </button>

          {/* Continue */}
          {canContinue && (
            <button
              onClick={continueAudit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 font-bold text-sm transition-all"
            >
              <SkipForward className="w-4 h-4" />
              Continue ({progress}/{totalBets} done)
            </button>
          )}

          {/* Abort */}
          {running && (
            <button
              onClick={() => { abortRef.current = true; }}
              className="text-red-400 border border-red-700 px-3 py-2 rounded-lg text-sm hover:bg-red-900/20"
            >
              Abort
            </button>
          )}

          {/* Export + Clear */}
          {!running && anyResults && (
            <>
              <button
                onClick={exportPDF}
                className="flex items-center gap-1.5 text-blue-300 border border-blue-700 px-4 py-2 rounded-lg text-sm hover:bg-blue-900/30 transition-all font-semibold"
              >
                <FileDown className="w-3.5 h-3.5" /> Export PDF
              </button>
              <button
                onClick={clearResults}
                className="flex items-center gap-1.5 text-gray-500 border border-slate-600 px-3 py-2 rounded-lg text-sm hover:text-red-400 hover:border-red-700 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Results
              </button>
            </>
          )}
        </div>

        {/* Progress bar */}
        {(running || anyResults) && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>
                {running
                  ? `Testing: ${currentBet}`
                  : progress === totalBets
                    ? `✓ Complete — ${selectedSize.gamesPerBet.toLocaleString()} games/bet`
                    : `⚡ Paused — ${progress}/${totalBets} bets done`}
              </span>
              <span>{progress}/{totalBets} bets — {(progress * selectedSize.gamesPerBet).toLocaleString()} total games</span>
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
                        <th className="px-4 py-2 text-right">Wins</th>
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
                              <span className="text-gray-500 text-xs ml-1">/ {(r.totalGames / 1_000).toFixed(0)}K</span>
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
                              {r.progressive ? <span className="text-yellow-400 text-xs">Jackpot</span> : <OddsCell odds={r.for95} current={r.currentPayout} />}
                            </td>
                            <td className="px-4 py-2 text-right bg-yellow-900/10">
                              {r.progressive ? <span className="text-yellow-400 text-xs">Jackpot</span> : <OddsCell odds={r.for965} current={r.currentPayout} />}
                            </td>
                            <td className="px-4 py-2 text-right bg-blue-900/10">
                              {r.progressive ? <span className="text-yellow-400 text-xs">Jackpot</span> : <OddsCell odds={r.for98} current={r.currentPayout} />}
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