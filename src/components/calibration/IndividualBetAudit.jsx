import { useState, useRef } from 'react';
import { runBetAuditWithAbort, runMicroscopeWithAbort, runExportWithAbort, resetPersistentWorker } from '@/lib/workerBridge';
import { motion } from 'framer-motion';
import { Play, RefreshCw, Trash2, FileDown, FileText, SkipForward, Microscope, ChevronDown, ChevronRight, Download, X, BarChart2 } from 'lucide-react';
import { CARDED_HAND_PAYOUTS, HAND_RANK_PAYOUTS, COLOR_BOARD_PAYOUTS, LOW_HIGH_PAYOUT } from '@/lib/payoutConstants';
import { PER_HAND_RANK_PAYOUTS } from '@/lib/perHandRankPayouts';
import { jsPDF } from 'jspdf';
import VerificationLog from './VerificationLog';
import RankBreakdown from './RankBreakdown';

const STORAGE_KEY = 'individualBetAudit_results';
const PROGRESS_KEY = 'individualBetAudit_progress';

const SAMPLE_SIZES = [
  { label: '2M (Full)', gamesPerBet: 2_000_000, batches: 40 },
  { label: '1M',        gamesPerBet: 1_000_000, batches: 20 },
  { label: '500K',      gamesPerBet:   500_000, batches: 10 },
  { label: '100K',      gamesPerBet:   100_000, batches:  2 },
];

const EXPORT_ROW_OPTIONS = [
  { label: '1M rows', rows: 1_000_000 },
  { label: '500K',    rows:   500_000 },
  { label: '100K',    rows:   100_000 },
];

function getLivePayouts() {
  return {
    handPayouts: [...CARDED_HAND_PAYOUTS],
    rankPayouts: { ...HAND_RANK_PAYOUTS },
    colorPayouts: { ...COLOR_BOARD_PAYOUTS },
    lhPayout: LOW_HIGH_PAYOUT,
    perHandRankPayouts: PER_HAND_RANK_PAYOUTS,
  };
}

const HAND_LABELS_IBA = {
  1:'Hand 1 — A♦/10♥', 2:'Hand 2 — K♣/K♠', 3:'Hand 3 — Q♣/J♠', 4:'Hand 4 — Q♠/10♠',
  5:'Hand 5 — J♣/9♣', 6:'Hand 6 — 8♦/6♦', 7:'Hand 7 — 7♦/7♠', 8:'Hand 8 — 4♥/2♥',
  9:'Hand 9 — 3♣/3♥', 10:'Hand 10 — A♥/5♦',
};

// Build per-hand rank entries from PER_HAND_RANK_PAYOUTS
const PER_HAND_RANK_DEFS = [];
for (let handId = 1; handId <= 10; handId++) {
  const ranks = PER_HAND_RANK_PAYOUTS[handId] || {};
  for (const [rankName, payout] of Object.entries(ranks)) {
    PER_HAND_RANK_DEFS.push({
      betType: 'perHandRank',
      betKey: `${handId}:${rankName}`,
      label: `${HAND_LABELS_IBA[handId]} / ${rankName}`,
      group: 'Hand Ranks',
      currentPayout: payout,
      handId,
      rankName,
    });
  }
}

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
  ...PER_HAND_RANK_DEFS,
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

const PLAIN_LABELS = {
  'hand:1':  'Hand 1 - A(Dia)/10(Hrt)',
  'hand:2':  'Hand 2 - K(Clu)/K(Spa)',
  'hand:3':  'Hand 3 - Q(Clu)/J(Spa)',
  'hand:4':  'Hand 4 - Q(Spa)/10(Spa)',
  'hand:5':  'Hand 5 - J(Clu)/9(Clu)',
  'hand:6':  'Hand 6 - 8(Dia)/6(Dia)',
  'hand:7':  'Hand 7 - 7(Dia)/7(Spa)',
  'hand:8':  'Hand 8 - 4(Hrt)/2(Hrt)',
  'hand:9':  'Hand 9 - 3(Clu)/3(Hrt)',
  'hand:10': 'Hand 10 - A(Hrt)/5(Dia)',
};
function plainLabel(def) {
  return PLAIN_LABELS[`${def.betType}:${def.betKey}`] || def.label;
}

const GROUP_COLORS = {
  'Carded Hands': 'text-blue-400',
  'Hand Ranks':   'text-yellow-400',
  'Color Board':  'text-red-400',
  'Low / High':   'text-teal-400',
};

const SELECTION_OPTIONS = [
  { value: 'all',                  label: `— All ${BET_DEFINITIONS.length} Bets —` },
  { value: 'group:Carded Hands',   label: 'Group: Carded Hands' },
  { value: 'group:Hand Ranks',     label: 'Group: Hand Ranks' },
  { value: 'group:Color Board',    label: 'Group: Color Board' },
  { value: 'group:Low / High',     label: 'Group: Low / High' },
  ...BET_DEFINITIONS.map(d => ({ value: `single:${d.betType}:${d.betKey}`, label: `  ${d.label}` })),
];

function getSelectedDefs(selectionValue) {
  if (selectionValue === 'all') return BET_DEFINITIONS;
  if (selectionValue.startsWith('group:')) {
    const grp = selectionValue.replace('group:', '');
    return BET_DEFINITIONS.filter(d => d.group === grp);
  }
  if (selectionValue.startsWith('single:')) {
    const [, betType, ...rest] = selectionValue.split(':');
    const betKey = rest.join(':');
    return BET_DEFINITIONS.filter(d => d.betType === betType && d.betKey === betKey);
  }
  return BET_DEFINITIONS;
}

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

function ResultRow({ def, r, onInspect, onExport, microscopeKey, microscopeRunning, microscopeLog, microscopeSource, exportKey, exportRunning, exportProgress }) {
  const [open, setOpen] = useState(false);
  const [showRankBreakdown, setShowRankBreakdown] = useState(false);
  const key = `${def.betType}:${def.betKey}`;
  const isMicActive = microscopeKey === key;
  const isExportActive = exportKey === key;
  const hasRankBreakdown = def.betType === 'hand' && r?.rankBreakdown && r.rankBreakdown.length > 0;

  if (!r) {
    return (
      <tr className="border-b border-slate-700/40">
        <td className="px-2 py-2.5 w-8"></td>
        <td className="px-3 py-2.5 text-gray-300">{def.label}</td>
        <td colSpan={9} className="px-4 py-2.5 text-gray-600 text-xs italic">pending...</td>
      </tr>
    );
  }

  const houseEdgeNum = r.houseEdge !== undefined ? parseFloat(r.houseEdge) : (100 - parseFloat(r.rtp));

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`border-b border-slate-700/40 hover:bg-slate-700/10 ${isMicActive ? 'bg-cyan-950/10' : ''}`}
      >
        <td className="px-2 py-2.5 w-8">
          {/* "ex" button — triggers export, does NOT expand row */}
          <button
            onClick={e => { e.stopPropagation(); onExport(def); }}
            disabled={exportRunning}
            title="Export 1M row CSV for this bet"
            className={`inline-flex items-center justify-center w-7 h-6 rounded text-xs font-bold border transition-all
              ${isExportActive && exportRunning
                ? 'border-amber-500 bg-amber-900/30 text-amber-300 animate-pulse'
                : 'border-slate-600 bg-slate-700/60 text-gray-400 hover:border-amber-500 hover:text-amber-300'
              } disabled:opacity-30`}
          >
            {isExportActive && exportRunning ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : 'ex'}
          </button>
        </td>
        {/* Clicking the data cells expands/collapses the row */}
        <td
          className="px-3 py-2.5 font-semibold text-white text-sm cursor-pointer select-none"
          onClick={() => setOpen(v => !v)}
        >
          <span className="flex items-center gap-1.5">
            {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
            {def.label}
          </span>
        </td>
        <td className="px-3 py-2.5 text-right text-white font-mono text-xs cursor-pointer" onClick={() => setOpen(v => !v)}>
          {r.wins.toLocaleString()}
          <span className="text-gray-600 ml-1">/ {(r.totalGames / 1000).toFixed(0)}K</span>
        </td>
        <td className="px-3 py-2.5 text-right text-gray-300 font-mono text-xs cursor-pointer" onClick={() => setOpen(v => !v)}>{r.winFrequency}%</td>
        <td className="px-3 py-2.5 text-right cursor-pointer" onClick={() => setOpen(v => !v)}>
          <span className={`font-bold text-xs font-mono ${houseEdgeNum > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {houseEdgeNum.toFixed(2)}%
          </span>
        </td>
        <td className="px-3 py-2.5 text-right cursor-pointer" onClick={() => setOpen(v => !v)}><RTPCell rtp={r.rtp} /></td>
        <td className="px-3 py-2.5 text-right text-gray-300 font-mono text-xs cursor-pointer" onClick={() => setOpen(v => !v)}>{r.currentPayout}:1</td>
        <td className="px-3 py-2.5 text-right text-gray-400 font-mono text-xs cursor-pointer" onClick={() => setOpen(v => !v)}>
          {r.fairOdds !== null ? `${r.fairOdds}:1` : '—'}
        </td>
        <td className="px-3 py-2.5 text-right text-green-400 font-mono text-xs cursor-pointer" onClick={() => setOpen(v => !v)}>
          {r.for95 !== null ? `${r.for95}:1` : '—'}
        </td>
        <td className="px-3 py-2.5 text-right text-yellow-400 font-mono text-xs cursor-pointer" onClick={() => setOpen(v => !v)}>
          {r.for965 !== null ? `${r.for965}:1` : '—'}
        </td>
        <td className="px-3 py-2.5 text-right text-blue-400 font-mono text-xs cursor-pointer" onClick={() => setOpen(v => !v)}>
          {r.for98 !== null ? `${r.for98}:1` : '—'}
        </td>
      </motion.tr>

      {open && (
        <tr className="border-b border-slate-700/30">
          <td colSpan={11} className="px-4 pb-4 pt-1 bg-slate-900/40">
            {/* Export progress bar */}
            {isExportActive && exportRunning && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-amber-400/70 mb-1">
                  <span className="flex items-center gap-1"><Download className="w-3 h-3" /> Generating CSV export...</span>
                  <span>{Math.round(exportProgress * 100)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1 overflow-hidden">
                  <motion.div
                    className="h-1 rounded-full bg-amber-500"
                    animate={{ width: `${Math.round(exportProgress * 100)}%` }}
                    transition={{ ease: 'linear', duration: 0.2 }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <button
                onClick={e => { e.stopPropagation(); onInspect(def); }}
                disabled={microscopeRunning}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                  ${isMicActive
                    ? 'border-cyan-500 bg-cyan-900/30 text-cyan-300'
                    : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-cyan-600 hover:text-cyan-300'
                  } disabled:opacity-40`}
              >
                {microscopeRunning && isMicActive
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  : <Microscope className="w-3.5 h-3.5" />
                }
                {microscopeRunning && isMicActive ? 'Reading buffer...' : 'Microscope (50 hands)'}
              </button>

              {hasRankBreakdown && (
                <button
                  onClick={e => { e.stopPropagation(); setShowRankBreakdown(v => !v); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                    ${showRankBreakdown
                      ? 'border-purple-500 bg-purple-900/30 text-purple-300'
                      : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-purple-600 hover:text-purple-300'
                    }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  Rank Breakdown
                  {showRankBreakdown
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronRight className="w-3 h-3" />
                  }
                </button>
              )}

              {isMicActive && !microscopeRunning && microscopeSource && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                  microscopeSource === 'buffer'
                    ? 'text-green-400 border-green-700/50 bg-green-900/20'
                    : 'text-amber-400 border-amber-700/50 bg-amber-900/20'
                }`}>
                  {microscopeSource === 'buffer' ? 'Rows 1–50 from audit buffer' : 'Fresh 50-hand sample'}
                </span>
              )}
            </div>

            {showRankBreakdown && hasRankBreakdown && (
              <div className="border border-purple-800/40 rounded-xl bg-slate-900/50 px-4 py-3 mb-3">
                <RankBreakdown
                  rankBreakdown={r.rankBreakdown}
                  totalHandWins={r.wins}
                  totalGames={r.totalGames}
                  handRankPayouts={PER_HAND_RANK_PAYOUTS[parseInt(def.betKey)] ?? {}}
                />
              </div>
            )}

            {isMicActive && !microscopeRunning && microscopeLog && (
              <VerificationLog log={microscopeLog} betLabel={def.label} />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function IndividualBetAudit() {
  const [running, setRunning] = useState(false);
  const [selectedSize, setSelectedSize] = useState(SAMPLE_SIZES[0]);
  const [selection, setSelection] = useState('all');
  const [results, setResults] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  });
  const [progress, setProgress] = useState(() => {
    try { return parseInt(localStorage.getItem(PROGRESS_KEY) || '0'); } catch { return 0; }
  });
  const [currentBet, setCurrentBet] = useState('');
  const [microscopeKey, setMicroscopeKey] = useState(null);
  const [microscopeLog, setMicroscopeLog] = useState(null);
  const [microscopeRunning, setMicroscopeRunning] = useState(false);
  const [betProgress, setBetProgress] = useState(0);

  // Export state
  const [exportKey, setExportKey] = useState(null);
  const [exportRunning, setExportRunning] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportRowCount, setExportRowCount] = useState(EXPORT_ROW_OPTIONS[0].rows);
  const exportWorkerRef = useRef(null);

  const abortRef = useRef(false);
  const workerRef = useRef(null);
  const microscopeWorkerRef = useRef(null);

  const activeDefs = getSelectedDefs(selection);
  const totalBets = activeDefs.length;
  const anyResults = Object.keys(results).length > 0;
  const pct = Math.round((progress / totalBets) * 100);
  const canContinue = !running && progress > 0 && progress < totalBets;

  const clearResults = () => {
    setResults({});
    setProgress(0);
    setMicroscopeLog(null);
    setMicroscopeKey(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROGRESS_KEY);
  };

  const runAuditFrom = async (startIndex, batchesPerBet, defs) => {
    setRunning(true);
    abortRef.current = false;
    const livePayouts = getLivePayouts();
    const totalGames = batchesPerBet * 50_000;

    for (let bi = startIndex; bi < defs.length; bi++) {
      if (abortRef.current) break;
      const def = defs[bi];
      setCurrentBet(def.label);
      setBetProgress(0);

      let livePayout = def.currentPayout;
      if (def.betType === 'hand') livePayout = livePayouts.handPayouts[parseInt(def.betKey) - 1];
      else if (def.betType === 'rank') livePayout = livePayouts.rankPayouts[def.betKey];
      else if (def.betType === 'perHandRank') livePayout = PER_HAND_RANK_PAYOUTS[def.handId]?.[def.rankName] ?? def.currentPayout;
      else if (def.betType === 'color') livePayout = livePayouts.colorPayouts[def.betKey];
      else if (def.betType === 'lh') livePayout = livePayouts.lhPayout;

      try {
        const { promise, abort } = runBetAuditWithAbort(
          {
            rounds: totalGames,
            betType: def.betType,
            betKey: def.betKey,
            handPayouts: livePayouts.handPayouts,
            rankPayouts: livePayouts.rankPayouts,
            colorPayouts: livePayouts.colorPayouts,
            lhPayout: livePayouts.lhPayout,
            perHandRankPayouts: livePayouts.perHandRankPayouts,
            captureLog: false,
          },
          (pct) => setBetProgress(pct)
        );
        workerRef.current = { abort };

        const res = await promise;
        workerRef.current = null;
        if (abortRef.current) break;

        const key = `${def.betType}:${def.betKey}`;
        const newResult = {
          wins: res.wins,
          totalGames,
          winFrequency: res.winFrequency,
          rtp: parseFloat(res.rtp).toFixed(2),
          houseEdge: res.houseEdge !== undefined ? parseFloat(res.houseEdge).toFixed(2) : (100 - parseFloat(res.rtp)).toFixed(2),
          fairOdds: res.fairOdds,
          for95: res.for95,
          for965: res.for965,
          for98: res.for98,
          currentPayout: livePayout,
          rankBreakdown: res.rankBreakdown || null,
        };

        setResults(prev => {
          const updated = { ...prev, [key]: newResult };
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
          return updated;
        });
        const newProgress = bi + 1;
        setProgress(newProgress);
        setBetProgress(0);
        try { localStorage.setItem(PROGRESS_KEY, String(newProgress)); } catch {}
      } catch {
        if (abortRef.current) break;
      }
    }
    setRunning(false);
    setCurrentBet('');
    setBetProgress(0);
    workerRef.current = null;
  };

  const runAudit = (size) => {
    const defs = getSelectedDefs(selection);
    resetPersistentWorker();
    setResults({});
    setProgress(0);
    setMicroscopeLog(null);
    setMicroscopeKey(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROGRESS_KEY);
    runAuditFrom(0, size.batches, defs);
  };

  const continueAudit = () => {
    runAuditFrom(progress, selectedSize.batches, activeDefs);
  };

  // Microscope — reads from globalAuditBuffer[0..49] if buffer matches this bet,
  // otherwise falls back to 50 fresh hands
  const [microscopeSource, setMicroscopeSource] = useState(null); // 'buffer' | 'fallback'

  const runMicroscope = async (def) => {
    if (microscopeWorkerRef.current) { microscopeWorkerRef.current.abort(); }
    const key = `${def.betType}:${def.betKey}`;
    setMicroscopeKey(key);
    setMicroscopeLog(null);
    setMicroscopeSource(null);
    setMicroscopeRunning(true);
    const livePayouts = getLivePayouts();
    try {
      const { promise, abort } = runMicroscopeWithAbort({
        betType: def.betType,
        betKey: def.betKey,
        handPayouts: livePayouts.handPayouts,
        rankPayouts: livePayouts.rankPayouts,
        colorPayouts: livePayouts.colorPayouts,
        lhPayout: livePayouts.lhPayout,
        perHandRankPayouts: livePayouts.perHandRankPayouts,
      });
      microscopeWorkerRef.current = { abort };
      const res = await promise;
      microscopeWorkerRef.current = null;
      if (res.success && Array.isArray(res.verificationLog)) {
        setMicroscopeLog(res.verificationLog);
        setMicroscopeSource(res.source || 'fallback');
      }
    } catch {}
    setMicroscopeRunning(false);
    microscopeWorkerRef.current = null;
  };

  // CSV Export — reads directly from the audit buffer (NO re-run).
  // Exports exactly the same boards that produced the UI win count.
  const runExport = async (def) => {
    if (exportRunning) return;
    if (exportWorkerRef.current) { exportWorkerRef.current.abort(); }
    const key = `${def.betType}:${def.betKey}`;
    const auditResult = results[key];
    // Use the exact round count from the audit — the buffer holds precisely this many boards.
    const batchRows = auditResult ? Math.min(auditResult.totalGames, 1_000_000) : 1_000_000;

    setExportKey(key);
    setExportRunning(true);
    setExportProgress(0);

    const livePayouts = getLivePayouts();
    const csvChunks = [];

    try {
      const { promise, abort } = runExportWithAbort(
        {
          rows: batchRows,
          betType: def.betType,
          betKey: def.betKey,
          handPayouts: livePayouts.handPayouts,
          rankPayouts: livePayouts.rankPayouts,
          colorPayouts: livePayouts.colorPayouts,
          lhPayout: livePayouts.lhPayout,
          perHandRankPayouts: livePayouts.perHandRankPayouts,
        },
        (chunk) => { csvChunks.push(chunk); },
        (pct) => setExportProgress(pct)
      );
      exportWorkerRef.current = { abort };
      const result = await promise;
      exportWorkerRef.current = null;

      // Assemble and trigger download
      const blob = new Blob(csvChunks, { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = def.label.replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `RapidFire_Export_${safeName}_${result.total}rows_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}

    setExportRunning(false);
    setExportProgress(0);
    exportWorkerRef.current = null;
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const now = new Date().toLocaleString();
    const ROW_H = 7;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 20, 'F');
    doc.setTextColor(250, 204, 21);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Rapid Fire Texas 10 — Data Lab Audit Report', 10, 13);
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text(`Generated: ${now}  |  ${progress} bets  |  ${selectedSize.gamesPerBet.toLocaleString()} rounds/bet  |  32-card engine`, pageW - 10, 13, { align: 'right' });

    let y = 28;
    const colX =    [10,  68,  92,  112,  133,  154,  175,  196,  216,  237,  258];
    const headers = ['Bet','Wins','Win %','House Edge','Actual RTP','Curr Odds','Fair (1)','For 95%','For 96.5%','For 98%','Status'];

    GROUPS.forEach(group => {
      const defs = BET_DEFINITIONS.filter(d => d.group === group);
      const hasAny = defs.some(d => results[`${d.betType}:${d.betKey}`]);
      if (!hasAny) return;
      if (y > 175) { doc.addPage(); y = 15; }
      doc.setFillColor(220, 230, 255);
      doc.rect(10, y - ROW_H + 1, pageW - 20, ROW_H, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(group, 12, y);
      y += ROW_H;
      doc.setFillColor(240, 240, 240);
      doc.rect(10, y - ROW_H + 1, pageW - 20, ROW_H, 'F');
      doc.setFontSize(7);
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += ROW_H;
      defs.forEach((def) => {
        const key = `${def.betType}:${def.betKey}`;
        const r = results[key];
        if (!r) return;
        if (y > 185) { doc.addPage(); y = 15; }
        const rtp = parseFloat(r.rtp);
        const rtpOk = rtp >= 95 && rtp <= 98;
        const he = r.houseEdge !== undefined ? parseFloat(r.houseEdge).toFixed(2) : (100 - rtp).toFixed(2);
        doc.setFillColor(255, 255, 255);
        doc.rect(10, y - ROW_H + 1, pageW - 20, ROW_H, 'F');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(plainLabel(def), colX[0], y);
        doc.text(r.wins.toLocaleString(), colX[1], y);
        doc.text(r.winFrequency + '%', colX[2], y);
        doc.setTextColor(180, 30, 30);
        doc.text(he + '%', colX[3], y);
        if (rtpOk) doc.setTextColor(0, 140, 60);
        else if (rtp > 98) doc.setTextColor(200, 100, 0);
        else doc.setTextColor(200, 0, 0);
        doc.text(r.rtp + '%', colX[4], y);
        doc.setTextColor(0, 0, 0);
        doc.text(r.currentPayout + ':1', colX[5], y);
        doc.text(r.fairOdds !== null ? r.fairOdds + ':1' : '—', colX[6], y);
        doc.setTextColor(0, 120, 0);
        doc.text(r.for95 + ':1', colX[7], y);
        doc.setTextColor(160, 100, 0);
        doc.text(r.for965 + ':1', colX[8], y);
        doc.setTextColor(0, 80, 180);
        doc.text(r.for98 + ':1', colX[9], y);
        doc.setTextColor(rtpOk ? 0 : 180, rtpOk ? 140 : 0, rtpOk ? 60 : 0);
        doc.text(rtpOk ? 'PASS' : rtp > 98 ? 'HIGH' : 'LOW', colX[10], y);
        y += ROW_H;
      });
      y += 4;
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Rapid Fire Texas 10 — Data Lab Report  |  Page ${i} of ${totalPages}`, pageW / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
    }
    doc.save(`RapidFire_DataLab_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const exportWord = () => {
    const now = new Date().toLocaleString();
    const headers = ['Bet','Wins','Win %','House Edge %','Actual RTP','Curr Odds','Fair (1)','For 95%','For 96.5%','For 98%','Status'];
    let tableRows = '';
    GROUPS.forEach(group => {
      const defs = BET_DEFINITIONS.filter(d => d.group === group);
      const hasAny = defs.some(d => results[`${d.betType}:${d.betKey}`]);
      if (!hasAny) return;
      tableRows += `<tr><td colspan="11" style="background:#dce6ff;font-weight:bold;font-size:10pt;padding:4px 6px;border:1px solid #6480c8;">${group}</td></tr>`;
      tableRows += `<tr>${headers.map(h => `<td style="background:#f0f0f0;font-weight:bold;border:1px solid #aaa;padding:3px 6px;">${h}</td>`).join('')}</tr>`;
      defs.forEach(def => {
        const key = `${def.betType}:${def.betKey}`;
        const r = results[key];
        if (!r) return;
        const rtp = parseFloat(r.rtp);
        const rtpOk = rtp >= 95 && rtp <= 98;
        const rtpColor = rtpOk ? '#008000' : rtp > 98 ? '#c86400' : '#cc0000';
        const statusColor = rtpOk ? '#008000' : '#cc0000';
        const status = rtpOk ? 'PASS' : rtp > 98 ? 'HIGH' : 'LOW';
        const td = (val, color = '#000') => `<td style="border:1px solid #ccc;padding:3px 6px;color:${color};font-weight:bold;">${val}</td>`;
        const he = r.houseEdge !== undefined ? parseFloat(r.houseEdge).toFixed(2) : (100 - rtp).toFixed(2);
        tableRows += `<tr>
          ${td(plainLabel(def))}${td(r.wins.toLocaleString())}${td(r.winFrequency + '%')}
          ${td(he + '%', '#b41e1e')}${td(r.rtp + '%', rtpColor)}${td(r.currentPayout + ':1')}
          ${td(r.fairOdds !== null ? r.fairOdds + ':1' : '-')}
          ${td(r.for95 + ':1', '#007800')}${td(r.for965 + ':1', '#a06400')}
          ${td(r.for98 + ':1', '#0050b4')}${td(status, statusColor)}
        </tr>`;
      });
    });
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head><meta charset="utf-8"><title>Data Lab Report</title></head>
      <body style="font-family:Arial,sans-serif;font-size:9pt;">
        <h2>Rapid Fire Texas 10 &mdash; Data Lab Report</h2>
        <p style="color:#444;">Generated: ${now} | ${progress} bets | ${selectedSize.gamesPerBet.toLocaleString()} rounds/bet | 32-card engine</p>
        <table style="border-collapse:collapse;width:100%;font-size:8.5pt;">${tableRows}</table>
      </body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RapidFire_DataLab_${new Date().toISOString().slice(0,10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="font-bold text-lg text-white">Data Lab — Frequency & Probability Audit</h3>
            <p className="text-gray-500 text-xs mt-0.5">32-card engine · Burn/Flop/Turn/River sequence · Live payouts from constants</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700/40 rounded px-2 py-1">
            <span className="font-semibold">Live Odds:</span>
            <span className="font-mono">{LOW_HIGH_PAYOUT}:1 L/H · {COLOR_BOARD_PAYOUTS['3R']}:1 3R · {CARDED_HAND_PAYOUTS[0]}:1 H1</span>
          </div>
        </div>

        {/* Export row-count selector */}
        <div className="flex items-center gap-2 mt-3 mb-1">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">CSV export size:</span>
          {EXPORT_ROW_OPTIONS.map(opt => (
            <button
              key={opt.rows}
              onClick={() => setExportRowCount(opt.rows)}
              disabled={exportRunning}
              className={`px-2.5 py-1 rounded text-xs font-bold border transition-all
                ${exportRowCount === opt.rows
                  ? 'border-amber-500 bg-amber-700/30 text-amber-300'
                  : 'border-slate-600 bg-slate-700/40 text-gray-400 hover:border-amber-600 hover:text-amber-300'}`}
            >
              {opt.label}
            </button>
          ))}
          {exportRunning && (
            <button
              onClick={() => { if (exportWorkerRef.current) exportWorkerRef.current.abort(); setExportRunning(false); setExportKey(null); }}
              className="flex items-center gap-1 text-xs text-red-400 border border-red-700/50 px-2 py-1 rounded hover:bg-red-900/20"
            >
              <X className="w-3 h-3" /> Cancel Export
            </button>
          )}
          {exportRunning && (
            <span className="text-xs text-amber-400/70 flex items-center gap-1">
              <Download className="w-3 h-3" /> {Math.round(exportProgress * 100)}% — generating CSV...
            </span>
          )}
        </div>
        <p className="text-gray-600 text-xs mb-4">Click <span className="text-amber-400 font-semibold">ex</span> on any result row to export the exact boards from that audit — win count in export will match the UI exactly.</p>

        <div className="flex items-center gap-2 mt-2 mb-3">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">Test scope:</span>
          <select
            value={selection}
            onChange={e => {
              setSelection(e.target.value);
              setProgress(0);
              setResults({});
              setMicroscopeLog(null);
              setMicroscopeKey(null);
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem(PROGRESS_KEY);
            }}
            disabled={running}
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 focus:border-yellow-500 outline-none min-w-[220px]"
          >
            {SELECTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {selection !== 'all' && (
            <span className="text-xs text-yellow-400 font-semibold">
              {activeDefs.length} bet{activeDefs.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Rounds per bet:</span>
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

        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={() => runAudit(selectedSize)}
            disabled={running}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-gray-500 font-bold text-sm transition-all"
          >
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? `Running... (${selectedSize.gamesPerBet.toLocaleString()}/bet)` : `Run Audit — ${selectedSize.label} per bet`}
          </button>

          {canContinue && (
            <button
              onClick={continueAudit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 font-bold text-sm transition-all"
            >
              <SkipForward className="w-4 h-4" />
              Continue ({progress}/{totalBets} done)
            </button>
          )}

          {running && (
            <button
              onClick={() => { abortRef.current = true; if (workerRef.current) { workerRef.current.abort(); workerRef.current = null; } }}
              className="text-red-400 border border-red-700 px-3 py-2 rounded-lg text-sm hover:bg-red-900/20"
            >
              Abort
            </button>
          )}

          {!running && anyResults && (
            <>
              <button
                onClick={exportPDF}
                className="flex items-center gap-1.5 text-blue-300 border border-blue-700 px-4 py-2 rounded-lg text-sm hover:bg-blue-900/30 transition-all font-semibold"
              >
                <FileDown className="w-3.5 h-3.5" /> Export PDF
              </button>
              <button
                onClick={exportWord}
                className="flex items-center gap-1.5 text-emerald-300 border border-emerald-700 px-4 py-2 rounded-lg text-sm hover:bg-emerald-900/30 transition-all font-semibold"
              >
                <FileText className="w-3.5 h-3.5" /> Export Word
              </button>
              <button
                onClick={clearResults}
                className="flex items-center gap-1.5 text-gray-500 border border-slate-600 px-3 py-2 rounded-lg text-sm hover:text-red-400 hover:border-red-700 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </>
          )}
        </div>

        {(running || anyResults) && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>
                {running
                  ? `Testing: ${currentBet}`
                  : progress === totalBets
                    ? `Complete — ${selectedSize.gamesPerBet.toLocaleString()} rounds/bet`
                    : `Paused — ${progress}/${totalBets} done`}
              </span>
              <span>{progress}/{totalBets} bets · {(progress * selectedSize.gamesPerBet).toLocaleString()} total rounds</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden mb-1">
              <motion.div
                className="h-2 rounded-full bg-green-500"
                animate={{ width: `${pct}%` }}
                transition={{ ease: 'linear', duration: 0.3 }}
              />
            </div>
            {running && betProgress > 0 && (
              <div className="w-full bg-slate-700/50 rounded-full h-1 overflow-hidden">
                <motion.div
                  className="h-1 rounded-full bg-yellow-500/60"
                  animate={{ width: `${Math.round(betProgress * 100)}%` }}
                  transition={{ ease: 'linear', duration: 0.2 }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {anyResults && (
        <div className="space-y-5">
          {GROUPS.map(group => {
            const defs = BET_DEFINITIONS.filter(d => d.group === group);
            const hasAny = defs.some(d => results[`${d.betType}:${d.betKey}`]);
            if (!hasAny) return null;
            return (
              <div key={group} className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
                <div className={`px-5 py-3 border-b border-slate-700 font-bold text-sm ${GROUP_COLORS[group]}`}>{group}</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-xs text-gray-500 uppercase bg-slate-900/40">
                        <th className="w-8 px-2 py-2.5" title="Click 'ex' to export CSV">
                          <span className="text-amber-600/70 text-xs font-bold">ex</span>
                        </th>
                        <th className="px-3 py-2.5 text-left">Bet</th>
                        <th className="px-3 py-2.5 text-right">Wins</th>
                        <th className="px-3 py-2.5 text-right">Win %</th>
                        <th className="px-3 py-2.5 text-right">House Edge %</th>
                        <th className="px-3 py-2.5 text-right">Actual RTP</th>
                        <th className="px-3 py-2.5 text-right">Curr Odds</th>
                        <th className="px-3 py-2.5 text-right">Fair (1)</th>
                        <th className="px-3 py-2.5 text-right">For 95%</th>
                        <th className="px-3 py-2.5 text-right">For 96.5%</th>
                        <th className="px-3 py-2.5 text-right">For 98%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defs.map(def => {
                        const key = `${def.betType}:${def.betKey}`;
                        return (
                          <ResultRow
                            key={key}
                            def={def}
                            r={results[key]}
                            onInspect={runMicroscope}
                            onExport={runExport}
                            microscopeKey={microscopeKey}
                            microscopeRunning={microscopeRunning}
                            microscopeLog={microscopeKey === key ? microscopeLog : null}
                            microscopeSource={microscopeKey === key ? microscopeSource : null}
                            exportKey={exportKey}
                            exportRunning={exportRunning}
                            exportProgress={exportProgress}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 text-xs text-gray-400 space-y-1">
            <p className="font-semibold text-gray-300 mb-1">Data Lab — Reading the table</p>
            <p>• <span className="text-amber-400 font-semibold">ex</span> button: exports the exact audit boards as .csv — win count guaranteed to match UI (no re-run)</p>
            <p>• Click the row label/data to expand it and run the <span className="text-cyan-400">Microscope</span> — isolated 50-hand batch, instant results</p>
            <p>• <span className="text-green-400">Green RTP</span> = within 95–98% target &nbsp;|&nbsp; <span className="text-orange-400">Orange</span> = too high &nbsp;|&nbsp; <span className="text-red-400">Red</span> = too low</p>
            <p>• <span className="text-red-400">House Edge %</span> = 100% − Actual RTP</p>
          </div>
        </div>
      )}

      {!anyResults && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h4 className="font-bold text-sm text-cyan-400 mb-2 flex items-center gap-2">
            <Microscope className="w-4 h-4" /> Quick Microscope — No Audit Required
          </h4>
          <p className="text-gray-400 text-xs mb-4">
            Run an isolated 50-hand sample on any single bet and inspect the raw board data instantly.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selection.startsWith('single:') ? selection : 'single:hand:1'}
              onChange={e => setSelection(e.target.value)}
              disabled={microscopeRunning}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 focus:border-cyan-500 outline-none min-w-[220px]"
            >
              {BET_DEFINITIONS.map(d => (
                <option key={`${d.betType}:${d.betKey}`} value={`single:${d.betType}:${d.betKey}`}>{d.label}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const val = selection.startsWith('single:') ? selection : 'single:hand:1';
                const [, betType, ...rest] = val.split(':');
                const betKey = rest.join(':');
                const def = BET_DEFINITIONS.find(d => d.betType === betType && d.betKey === betKey);
                if (def) runMicroscope(def);
              }}
              disabled={microscopeRunning}
              className="flex items-center gap-2 px-5 py-2 rounded-xl border border-cyan-600 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-300 font-bold text-sm transition-all disabled:opacity-40"
            >
              {microscopeRunning
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running 50 hands...</>
                : <><Microscope className="w-4 h-4" /> Inspect 50 Hands</>
              }
            </button>
          </div>
          {microscopeKey && !microscopeRunning && microscopeLog && (
            <div className="mt-5">
              <VerificationLog
                log={microscopeLog}
                betLabel={BET_DEFINITIONS.find(d => `${d.betType}:${d.betKey}` === microscopeKey)?.label}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}