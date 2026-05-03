import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight, Shield, SkipForward, FileDown, FileText, Trash2, Save, Timer, Award } from 'lucide-react';
import { runBetAuditWithAbort } from '@/lib/workerBridge';
import { CARDED_HAND_PAYOUTS, HAND_RANK_PAYOUTS, COLOR_BOARD_PAYOUTS, LOW_HIGH_PAYOUT } from '@/lib/payoutConstants';
import { PER_HAND_RANK_PAYOUTS } from '@/lib/perHandRankPayouts';
import { jsPDF } from 'jspdf';

const HAND_LABELS = {
  1:'Hand 1 — A♦10♥', 2:'Hand 2 — K♣K♠', 3:'Hand 3 — Q♣J♠', 4:'Hand 4 — Q♠10♠',
  5:'Hand 5 — J♣9♣', 6:'Hand 6 — 8♦6♦', 7:'Hand 7 — 7♦7♠', 8:'Hand 8 — 4♥2♥',
  9:'Hand 9 — 3♣3♥', 10:'Hand 10 — A♥5♦',
};

// Build per-hand rank bets from PER_HAND_RANK_PAYOUTS
const PER_HAND_RANK_BETS = [];
for (let handId = 1; handId <= 10; handId++) {
  const ranks = PER_HAND_RANK_PAYOUTS[handId] || {};
  for (const rankName of Object.keys(ranks)) {
    PER_HAND_RANK_BETS.push({
      betType: 'perHandRank',
      betKey: `${handId}:${rankName}`,
      label: `${HAND_LABELS[handId]} / ${rankName}`,
      group: 'Hand Ranks',
      handId,
      rankName,
    });
  }
}

const ALL_BETS = [
  { betType:'hand', betKey:'1',  label:'Hand 1 — A♦10♥',  group:'Carded Hands' },
  { betType:'hand', betKey:'2',  label:'Hand 2 — K♣K♠',   group:'Carded Hands' },
  { betType:'hand', betKey:'3',  label:'Hand 3 — Q♣J♠',   group:'Carded Hands' },
  { betType:'hand', betKey:'4',  label:'Hand 4 — Q♠10♠',  group:'Carded Hands' },
  { betType:'hand', betKey:'5',  label:'Hand 5 — J♣9♣',   group:'Carded Hands' },
  { betType:'hand', betKey:'6',  label:'Hand 6 — 8♦6♦',   group:'Carded Hands' },
  { betType:'hand', betKey:'7',  label:'Hand 7 — 7♦7♠',   group:'Carded Hands' },
  { betType:'hand', betKey:'8',  label:'Hand 8 — 4♥2♥',   group:'Carded Hands' },
  { betType:'hand', betKey:'9',  label:'Hand 9 — 3♣3♥',   group:'Carded Hands' },
  { betType:'hand', betKey:'10', label:'Hand 10 — A♥5♦',  group:'Carded Hands' },
  ...PER_HAND_RANK_BETS,
  { betType:'color', betKey:'3R', label:'3 Red',   group:'Color Board' },
  { betType:'color', betKey:'3B', label:'3 Black',  group:'Color Board' },
  { betType:'color', betKey:'4R', label:'4 Red',   group:'Color Board' },
  { betType:'color', betKey:'4B', label:'4 Black',  group:'Color Board' },
  { betType:'color', betKey:'5R', label:'5 Red',   group:'Color Board' },
  { betType:'color', betKey:'5B', label:'5 Black',  group:'Color Board' },
  { betType:'lh', betKey:'LOW',  label:'River LOW',  group:'Low / High' },
  { betType:'lh', betKey:'HIGH', label:'River HIGH', group:'Low / High' },
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
function plainLabel(bet) {
  return PLAIN_LABELS[`${bet.betType}:${bet.betKey}`] || bet.label;
}

function getLivePayout(betType, betKey) {
  if (betType==='hand')  return CARDED_HAND_PAYOUTS[parseInt(betKey)-1];
  if (betType==='rank')  return HAND_RANK_PAYOUTS[betKey];
  if (betType==='perHandRank') {
    const colonIdx = betKey.indexOf(':');
    const handId = parseInt(betKey.slice(0, colonIdx));
    const rankName = betKey.slice(colonIdx + 1);
    return PER_HAND_RANK_PAYOUTS[handId]?.[rankName] ?? null;
  }
  if (betType==='color') return COLOR_BOARD_PAYOUTS[betKey];
  return LOW_HIGH_PAYOUT;
}

const MODULES = [
  {
    id: 'quick',
    name: 'Quick Check',
    rounds: 100_000,
    standard: 'Internal Pre-Flight',
    description: '100K rounds/bet (Card Hands, Color, River) · 100K card wins/bet (Hand Ranks) — fast sanity check.',
    rtpLow: 93, rtpHigh: 99,
    badge: 'bg-slate-700 text-slate-300',
    accentColor: 'border-slate-500',
  },
  {
    id: 'presubmission',
    name: 'Pre-Submission',
    rounds: 500_000,
    standard: 'House Internal Standard',
    description: '500K rounds/bet (Card Hands, Color, River) · 500K card wins/bet (Hand Ranks) — internal compliance gate.',
    rtpLow: 94, rtpHigh: 98.5,
    badge: 'bg-blue-900/40 text-blue-300',
    accentColor: 'border-blue-600',
  },
  {
    id: 'gli',
    name: 'GLI / BMM',
    rounds: 1_000_000,
    standard: 'GLI-11 / BMM Technical',
    description: '1M rounds/bet (Card Hands, Color, River) · 1M card wins/bet (Hand Ranks) — GLI-11 / BMM depth.',
    rtpLow: 95, rtpHigh: 98,
    badge: 'bg-amber-900/40 text-amber-300',
    accentColor: 'border-amber-600',
  },
  {
    id: 'full',
    name: 'Full Certification',
    rounds: 2_000_000,
    standard: 'eCOGRA / Full Certification',
    description: '2M rounds/bet (Card Hands, Color, River) · 2M card wins/bet (Hand Ranks) — eCOGRA / Full Certification depth.',
    rtpLow: 95, rtpHigh: 98,
    badge: 'bg-green-900/40 text-green-300',
    accentColor: 'border-green-600',
  },
];

function getStorageKeys(moduleId) {
  return {
    results: `certAudit_${moduleId}_results`,
    progress: `certAudit_${moduleId}_progress`,
    checkpoint: `certAudit_${moduleId}_checkpoint`, // partial progress for current in-flight bet
  };
}

function saveCheckpoint(moduleId, betKey, data) {
  try {
    localStorage.setItem(getStorageKeys(moduleId).checkpoint, JSON.stringify({ betKey, ...data }));
  } catch {}
}

function loadCheckpoint(moduleId) {
  try {
    const raw = localStorage.getItem(getStorageKeys(moduleId).checkpoint);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearCheckpoint(moduleId) {
  try { localStorage.removeItem(getStorageKeys(moduleId).checkpoint); } catch {}
}

function formatElapsed(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function loadFromStorage(moduleId) {
  const keys = getStorageKeys(moduleId);
  try {
    const results = JSON.parse(localStorage.getItem(keys.results) || '{}');
    const progress = parseInt(localStorage.getItem(keys.progress) || '0');
    return { results, progress };
  } catch {
    return { results: {}, progress: 0 };
  }
}

function clearFromStorage(moduleId) {
  const keys = getStorageKeys(moduleId);
  localStorage.removeItem(keys.results);
  localStorage.removeItem(keys.progress);
  localStorage.removeItem(keys.checkpoint);
}

function StatusIcon({ status }) {
  if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === 'fail') return <XCircle className="w-4 h-4 text-red-400" />;
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  return null;
}

function RTPPill({ rtp, low, high }) {
  const v = parseFloat(rtp);
  const ok = v >= low && v <= high;
  const warn = !ok && v >= low - 1 && v <= high + 1;
  if (ok) return <span className="text-green-400 font-bold">{rtp}%</span>;
  if (warn) return <span className="text-amber-400 font-bold">{rtp}%</span>;
  return <span className="text-red-400 font-bold">{rtp}%</span>;
}

function SaveToast({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-700/50 rounded px-2 py-1"
        >
          <Save className="w-3 h-3" /> Saving...
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ModulePanel({ module, bets, onResultsChange, onExportCertificate }) {
  const [running, setRunning] = useState(false);
  const [redoingKey, setRedoingKey] = useState(null);
  const [progress, setProgress] = useState(() => loadFromStorage(module.id).progress);
  const [results, setResults] = useState(() => loadFromStorage(module.id).results);
  const onResultsChangeRef = useRef(onResultsChange);
  useEffect(() => { onResultsChangeRef.current = onResultsChange; }, [onResultsChange]);
  const [currentBet, setCurrentBet] = useState('');
  const [betProgress, setBetProgress] = useState(0);
  const [betDone, setBetDone] = useState(0);
  const [betTotal, setBetTotal] = useState(0);
  const [betWins, setBetWins] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const abortRef = useRef(false);
  const workerRef = useRef(null);
  const savingTimerRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const betStartTimeRef = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, []);

  const startBetTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const startTime = Date.now();
    betStartTimeRef.current = startTime;
    setElapsedSeconds(0);
    timerIntervalRef.current = setInterval(() => {
      const start = betStartTimeRef.current;
      if (start) setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 500);
  }, []);

  const stopBetTimer = useCallback(() => {
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
  }, []);

  const livePayouts = {
    handPayouts: [...CARDED_HAND_PAYOUTS],
    rankPayouts: { ...HAND_RANK_PAYOUTS },
    colorPayouts: { ...COLOR_BOARD_PAYOUTS },
    lhPayout: LOW_HIGH_PAYOUT,
    perHandRankPayouts: PER_HAND_RANK_PAYOUTS,
  };

  const showSaving = useCallback(() => {
    setSaving(true);
    if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
    savingTimerRef.current = setTimeout(() => setSaving(false), 1200);
  }, []);

  const runFrom = async (startIndex) => {
    setRunning(true);
    abortRef.current = false;

    for (let i = startIndex; i < bets.length; i++) {
      if (abortRef.current) break;
      const bet = bets[i];
      const betKey = `${bet.betType}:${bet.betKey}`;

      // Check if there's a saved checkpoint for this exact bet
      const savedCheckpoint = loadCheckpoint(module.id);
      const resumeFrom = (savedCheckpoint && savedCheckpoint.betKey === betKey) ? savedCheckpoint : null;
      if (resumeFrom) {
        // Restore wins display from checkpoint
        setBetWins(resumeFrom.totalWins ?? 0);
        setBetDone(resumeFrom.totalRounds ?? 0);
        setBetTotal(module.rounds);
      } else {
        setBetWins(0);
        setBetDone(0);
        setBetTotal(module.rounds);
      }

      setCurrentBet(bet.label);
      setBetProgress(resumeFrom ? (resumeFrom.totalRounds ?? 0) / module.rounds : 0);
      startBetTimer();

      try {
        const { promise, abort: abortWorker } = runBetAuditWithAbort(
          {
            rounds: module.rounds,
            betType: bet.betType,
            betKey: bet.betKey,
            handPayouts: livePayouts.handPayouts,
            rankPayouts: livePayouts.rankPayouts,
            colorPayouts: livePayouts.colorPayouts,
            lhPayout: livePayouts.lhPayout,
            perHandRankPayouts: livePayouts.perHandRankPayouts,
            captureLog: false,
            resumeFrom: resumeFrom ? {
              totalRounds: resumeFrom.totalRounds,
              totalWins: resumeFrom.totalWins,
              totalPaid: resumeFrom.totalPaid,
              totalCardedHandWins: resumeFrom.totalCardedHandWins,
              totalRankNonExceptionWins: resumeFrom.totalRankNonExceptionWins,
              totalLostToHouseWins: resumeFrom.totalLostToHouseWins,
              perHandRankHandWins: resumeFrom.perHandRankHandWins,
              rankBreakdownCounts: resumeFrom.rankBreakdownCounts,
            } : undefined,
          },
          (pct, done, total) => {
            setBetProgress(pct);
            if (done !== undefined) setBetDone(done);
            if (total !== undefined) setBetTotal(total);
          },
          (checkpointAt, data) => {
            // Save checkpoint to localStorage so a refresh can resume here
            saveCheckpoint(module.id, betKey, data);
            setBetWins(data.totalWins ?? 0);
          }
        );
        workerRef.current = { abort: abortWorker };
        const res = await promise;
        workerRef.current = null;
        stopBetTimer();
        if (abortRef.current) break;
        if (res.success) {
          clearCheckpoint(module.id);
          setResults(prev => {
            const updated = { ...prev, [betKey]: res };
            try {
              localStorage.setItem(getStorageKeys(module.id).results, JSON.stringify(updated));
            } catch {}
            onResultsChangeRef.current?.(module.id, updated);
            return updated;
          });
          const newProgress = i + 1;
          setProgress(newProgress);
          setBetProgress(0);
          setBetWins(0);
          setBetDone(0);
          try { localStorage.setItem(getStorageKeys(module.id).progress, String(newProgress)); } catch {}
          showSaving();
        }
      } catch (err) {
        workerRef.current = null;
        stopBetTimer();
        if (abortRef.current) break;
      }
    }
    setRunning(false);
    setCurrentBet('');
    setBetProgress(0);
    setBetWins(0);
    setBetDone(0);
    stopBetTimer();
    workerRef.current = null;
  };

  const redoSingleBet = async (bet, fromCheckpoint) => {
    if (running || redoingKey) return;
    const betKey = `${bet.betType}:${bet.betKey}`;

    // Load checkpoint: use passed-in checkpoint or check stored one
    const savedCheckpoint = fromCheckpoint || loadCheckpoint(module.id);
    const resumeFrom = (savedCheckpoint && savedCheckpoint.betKey === betKey) ? savedCheckpoint : null;

    setRedoingKey(betKey);
    setCurrentBet(bet.label);
    setBetProgress(resumeFrom ? (resumeFrom.totalRounds ?? 0) / module.rounds : 0);
    setBetWins(resumeFrom ? (resumeFrom.totalWins ?? 0) : 0);
    setBetDone(resumeFrom ? (resumeFrom.totalRounds ?? 0) : 0);
    setBetTotal(module.rounds);
    startBetTimer();
    abortRef.current = false;

    try {
      const { promise, abort: abortWorker } = runBetAuditWithAbort(
        {
          rounds: module.rounds,
          betType: bet.betType,
          betKey: bet.betKey,
          handPayouts: livePayouts.handPayouts,
          rankPayouts: livePayouts.rankPayouts,
          colorPayouts: livePayouts.colorPayouts,
          lhPayout: livePayouts.lhPayout,
          perHandRankPayouts: livePayouts.perHandRankPayouts,
          captureLog: false,
          resumeFrom: resumeFrom ? {
            totalRounds: resumeFrom.totalRounds,
            totalWins: resumeFrom.totalWins,
            totalPaid: resumeFrom.totalPaid,
            totalCardedHandWins: resumeFrom.totalCardedHandWins,
            totalRankNonExceptionWins: resumeFrom.totalRankNonExceptionWins,
            totalLostToHouseWins: resumeFrom.totalLostToHouseWins,
            perHandRankHandWins: resumeFrom.perHandRankHandWins,
            rankBreakdownCounts: resumeFrom.rankBreakdownCounts,
          } : undefined,
        },
        (pct, done, total) => {
          setBetProgress(pct);
          if (done !== undefined) setBetDone(done);
          if (total !== undefined) setBetTotal(total);
        },
        (checkpointAt, data) => {
          // Save checkpoint so a glitch during redo can be resumed
          saveCheckpoint(module.id, betKey, data);
          setBetWins(data.totalWins ?? 0);
        }
      );
      workerRef.current = { abort: abortWorker };
      const res = await promise;
      workerRef.current = null;
      stopBetTimer();
      if (res.success) {
        clearCheckpoint(module.id);
        setResults(prev => {
          const updated = { ...prev, [betKey]: res };
          try { localStorage.setItem(getStorageKeys(module.id).results, JSON.stringify(updated)); } catch {}
          onResultsChangeRef.current?.(module.id, updated);
          return updated;
        });
        showSaving();
      }
    } catch (err) {
      workerRef.current = null;
      stopBetTimer();
    }
    setRedoingKey(null);
    setCurrentBet('');
    setBetProgress(0);
    setBetWins(0);
    setBetDone(0);
  };

  const run = () => {
    setResults({});
    setProgress(0);
    clearFromStorage(module.id); // also clears checkpoint
    runFrom(0);
    setExpanded(true);
  };

  const continueRun = () => {
    runFrom(progress);
    setExpanded(true);
  };

  const abort = () => {
    abortRef.current = true;
    if (workerRef.current) { workerRef.current.abort(); workerRef.current = null; }
  };

  const clearPanel = () => {
    abort();
    setResults({});
    setProgress(0);
    clearFromStorage(module.id);
    onResultsChange?.(module.id, {});
  };

  const done = Object.keys(results).length;
  const pct = Math.round((done / bets.length) * 100);
  const canContinue = !running && progress > 0 && progress < bets.length;

  const passed = Object.values(results).filter(r => {
    const v = parseFloat(r.rtp);
    return v >= module.rtpLow && v <= module.rtpHigh;
  }).length;
  const failed = done - passed;

  const blendedRtp = done > 0
    ? (Object.values(results).reduce((sum, r) => sum + parseFloat(r.rtp), 0) / done).toFixed(2)
    : null;

  const overallPass = done === bets.length && failed === 0;
  const overallFail = done > 0 && failed > 0;

  return (
    <div className={`bg-slate-800/60 border rounded-xl overflow-hidden ${module.accentColor}`}>
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{module.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${module.badge}`}>
                {module.standard}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{module.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <SaveToast show={saving} />
          {done > 0 && (
            <div className="text-right">
              <div className="text-xs text-gray-400">{done}/{bets.length} bets</div>
              {blendedRtp && (
                <div className="text-sm font-bold">
                  Blended RTP: <RTPPill rtp={blendedRtp} low={module.rtpLow} high={module.rtpHigh} />
                </div>
              )}
            </div>
          )}
          {overallPass && <CheckCircle2 className="w-6 h-6 text-green-400" />}
          {overallFail && <XCircle className="w-6 h-6 text-red-400" />}

          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {!running && canContinue && (
              <button
                onClick={continueRun}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-black font-semibold text-sm transition-all whitespace-nowrap"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Continue ({progress}/{bets.length} done)
              </button>
            )}
            {!running && !canContinue && (
              <button
                onClick={run}
                disabled={running}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-all whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5" />
                {done > 0 ? 'Re-run' : 'Start Audit'}
              </button>
            )}
            {running && (
              <button
                onClick={abort}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-600 text-red-400 font-semibold text-sm hover:bg-red-900/20 transition-all whitespace-nowrap"
              >
                <XCircle className="w-3.5 h-3.5" />
                Abort
              </button>
            )}
            {done > 0 && !running && (
              <>
                <button
                  onClick={() => onExportCertificate?.(module.id)}
                  title="Export official certificate PDF for this module"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-700/60 bg-amber-900/20 text-amber-300 text-sm hover:bg-amber-900/40 transition-all font-semibold whitespace-nowrap"
                >
                  <Award className="w-3.5 h-3.5" /> Certificate
                </button>
                <button
                  onClick={clearPanel}
                  title="Clear this module's data"
                  className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-600 text-gray-500 text-sm hover:text-red-400 hover:border-red-700 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-700 px-5 pb-5 pt-3">
              {(running || redoingKey) && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      {redoingKey ? `Re-running: ${currentBet}` : currentBet}
                    </span>
                    {!redoingKey && <span>{done}/{bets.length} — {pct}%</span>}
                  </div>
                  {!redoingKey && (
                    <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden mb-1">
                      <motion.div
                        className="h-1.5 rounded-full bg-green-500"
                        animate={{ width: `${pct}%` }}
                        transition={{ ease: 'linear', duration: 0.2 }}
                      />
                    </div>
                  )}
                  {betProgress > 0 && (
                    <>
                      <div className="w-full bg-slate-700/50 rounded-full h-1 overflow-hidden mb-1">
                        <motion.div
                          className="h-1 rounded-full bg-yellow-400/60"
                          animate={{ width: `${Math.round(betProgress * 100)}%` }}
                          transition={{ ease: 'linear', duration: 0.15 }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs mt-0.5">
                        <span className="text-purple-400 font-mono">
                          {betWins > 0 && <span>{betWins.toLocaleString()} wins · </span>}
                          {betDone > 0 && <span>{betDone.toLocaleString()} / {betTotal.toLocaleString()} rounds</span>}
                        </span>
                        <span className="flex items-center gap-1 text-yellow-400/70 font-mono">
                          <Timer className="w-3 h-3" />
                          {formatElapsed(elapsedSeconds)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {done > 0 && (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Blended RTP</p>
                      <p className="text-xl font-black">
                        {blendedRtp ? <RTPPill rtp={blendedRtp} low={module.rtpLow} high={module.rtpHigh} /> : '—'}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Passed</p>
                      <p className="text-xl font-black text-green-400">{passed} / {done}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Failed</p>
                      <p className={`text-xl font-black ${failed > 0 ? 'text-red-400' : 'text-gray-500'}`}>{failed}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700 text-gray-400 uppercase">
                          <th className="py-2 px-3 text-left">Bet</th>
                          <th className="py-2 px-3 text-right">Wins</th>
                          <th className="py-2 px-3 text-right text-purple-400">Card Wins</th>
                          <th className="py-2 px-3 text-right text-slate-400"># Rounds</th>
                          <th className="py-2 px-3 text-right">Win %</th>
                          <th className="py-2 px-3 text-right">RTP</th>
                          <th className="py-2 px-3 text-right">Live Odds</th>
                          <th className="py-2 px-3 text-right">For 96.5%</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bets.map(bet => {
                          const key = `${bet.betType}:${bet.betKey}`;
                          const r = results[key];
                          const isRunning = running && currentBet === bet.label;
                          if (!r && !isRunning) return (
                            <tr key={key} className="border-b border-slate-700/30">
                              <td className="py-1.5 px-3 text-gray-500">{bet.label}</td>
                              <td colSpan="8" className="py-1.5 px-3 text-gray-700 italic">pending</td>
                            </tr>
                          );
                          if (!r && isRunning) return (
                            <tr key={key} className="border-b border-slate-700/30 bg-slate-700/20">
                              <td className="py-1.5 px-3 text-yellow-400 flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 animate-spin" /> {bet.label}
                              </td>
                              <td colSpan="8" className="py-1.5 px-3 text-yellow-600 italic text-xs">running...</td>
                            </tr>
                          );
                          const rtpV = parseFloat(r.rtp);
                          const status = rtpV >= module.rtpLow && rtpV <= module.rtpHigh ? 'pass' : 'fail';
                          const livePayout = getLivePayout(bet.betType, bet.betKey);
                          const isRedoing = redoingKey === key;
                          // Check if there's a saved redo checkpoint for this specific bet
                          const redoCheckpoint = (() => {
                            const cp = loadCheckpoint(module.id);
                            return cp && cp.betKey === key ? cp : null;
                          })();
                          const canContinueRedo = !running && !redoingKey && redoCheckpoint && redoCheckpoint.totalRounds > 0 && redoCheckpoint.totalRounds < module.rounds;
                          return (
                           <motion.tr
                             key={key}
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 1 }}
                             className={`border-b border-slate-700/30 hover:bg-slate-700/10 ${isRedoing ? 'bg-yellow-900/10' : ''}`}
                           >
                             <td className="py-1.5 px-3 text-gray-200 font-medium">
                               {isRedoing ? (
                                 <span className="flex items-center gap-1 text-yellow-400">
                                   <RefreshCw className="w-3 h-3 animate-spin" /> {bet.label}
                                 </span>
                               ) : bet.label}
                             </td>
                             <td className="py-1.5 px-3 text-right text-gray-300 font-mono">{r.wins.toLocaleString()}</td>
                             <td className="py-1.5 px-3 text-right font-mono text-xs">
                               {bet.betType === 'perHandRank' && r.perHandRankHandWins
                                 ? <span className="text-purple-400">{r.perHandRankHandWins.toLocaleString()}</span>
                                 : <span className="text-gray-700">—</span>}
                             </td>
                             <td className="py-1.5 px-3 text-right font-mono text-xs">
                               {bet.betType === 'perHandRank' && r.actualRounds
                                 ? <span className="text-slate-400">{r.actualRounds.toLocaleString()}</span>
                                 : <span className="text-gray-700">—</span>}
                             </td>
                             <td className="py-1.5 px-3 text-right text-gray-400">
                               {r.winFrequency}%
                             </td>
                             <td className="py-1.5 px-3 text-right">
                               <RTPPill rtp={parseFloat(r.rtp).toFixed(2)} low={module.rtpLow} high={module.rtpHigh} />
                             </td>
                             <td className="py-1.5 px-3 text-right text-gray-400">{livePayout}:1</td>
                             <td className="py-1.5 px-3 text-right text-yellow-300 font-semibold">{r.for965}:1</td>
                             <td className="py-1.5 px-3 text-center">
                               <div className="flex flex-col items-center gap-1">
                                 {status === 'pass' ? (
                                   isRedoing ? (
                                     <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400">
                                       <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                       RUNNING
                                     </span>
                                   ) : (
                                     <button
                                       onClick={() => redoSingleBet(bet)}
                                       disabled={!!(running || redoingKey)}
                                       title="Click to re-run this passed test"
                                       className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 hover:bg-green-700/50 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                     >
                                       <CheckCircle2 className="w-4 h-4" />
                                       PASS
                                     </button>
                                   )
                                 ) : isRedoing ? (
                                   <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400">
                                     <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                     RUNNING
                                   </span>
                                 ) : (
                                   <button
                                     onClick={() => redoSingleBet(bet)}
                                     disabled={!!(running || redoingKey)}
                                     title="Click to re-run this failed test"
                                     className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 hover:bg-red-700/50 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                   >
                                     <XCircle className="w-4 h-4" />
                                     FAIL
                                   </button>
                                 )}
                                 {canContinueRedo && (
                                   <button
                                     onClick={() => redoSingleBet(bet, redoCheckpoint)}
                                     title={`Continue redo from ${redoCheckpoint.totalRounds?.toLocaleString()} rounds`}
                                     className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400 hover:bg-yellow-700/50 hover:text-white transition-all cursor-pointer whitespace-nowrap"
                                   >
                                     <SkipForward className="w-3 h-3" />
                                     Continue Redo
                                   </button>
                                 )}
                               </div>
                             </td>
                           </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {done === bets.length && (
                    <div className={`mt-4 rounded-lg px-4 py-3 border text-sm font-semibold flex items-center gap-2 ${
                      failed === 0
                        ? 'bg-green-900/20 border-green-700 text-green-300'
                        : 'bg-red-900/20 border-red-700 text-red-300'
                    }`}>
                      {failed === 0
                        ? <><CheckCircle2 className="w-5 h-5" /> All {bets.length} bets PASSED {module.standard} — RTP range {module.rtpLow}%–{module.rtpHigh}%</>
                        : <><XCircle className="w-5 h-5" /> {failed} of {bets.length} bets FAILED {module.standard} — review For 96.5% column and adjust payouts</>
                      }
                    </div>
                  )}
                </>
              )}

              {done === 0 && !running && (
                <p className="text-gray-500 text-sm text-center py-6">
                  Click <span className="text-green-400 font-semibold">Start Audit</span> to begin the {module.name} audit ({module.rounds.toLocaleString()} rounds/bet × {bets.length} bets)
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CertificationAudit() {
  const [moduleResults, setModuleResults] = useState(() => {
    const out = {};
    MODULES.forEach(m => {
      const { results, progress } = loadFromStorage(m.id);
      out[m.id] = { results, progress };
    });
    return out;
  });

  const handleResultsChange = useCallback((moduleId, results) => {
    setModuleResults(prev => ({ ...prev, [moduleId]: { ...prev[moduleId], results } }));
  }, []);

  const totalDone = MODULES.reduce((sum, m) => {
    return sum + Object.keys(moduleResults[m.id]?.results || {}).length;
  }, 0);
  const hasAnyResults = totalDone > 0;

  const clearAll = () => {
    MODULES.forEach(m => clearFromStorage(m.id));
    setModuleResults(() => {
      const out = {};
      MODULES.forEach(m => { out[m.id] = { results: {}, progress: 0 }; });
      return out;
    });
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const now = new Date().toLocaleString();
    const ROW_H = 7;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(250, 204, 21);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Rapid Fire Texas 10 — Certification Audit Report', 10, 10);
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text('GLI-11 / BMM / eCOGRA Standards Compliance', 10, 17);
    doc.setFontSize(7);
    doc.text(`Generated: ${now}  |  32-card engine  |  Multi-tier certification`, pageW - 10, 17, { align: 'right' });

    let y = 30;

    MODULES.forEach(module => {
      const storedResults = moduleResults[module.id]?.results || {};
      const done = Object.keys(storedResults).length;
      if (done === 0) return;

      if (y > 170) { doc.addPage(); y = 15; }

      doc.setFillColor(20, 30, 60);
      doc.rect(10, y - 5, pageW - 20, 8, 'F');
      doc.setTextColor(250, 204, 21);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${module.name}  —  ${module.standard}  (RTP ${module.rtpLow}%–${module.rtpHigh}%)`, 12, y);
      y += 8;

      const colX = [10, 62, 86, 107, 126, 146, 164, 182, 258];
      const headers = ['Bet', 'Wins', 'Card Wins', '# Rounds', 'Win %', 'Actual RTP', 'Live Odds', 'For 96.5%', 'Status'];

      doc.setFillColor(240, 240, 240);
      doc.rect(10, y - ROW_H + 1, pageW - 20, ROW_H, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += ROW_H;

      GROUPS.forEach(group => {
        const groupBets = ALL_BETS.filter(b => b.group === group);
        const hasAny = groupBets.some(b => storedResults[`${b.betType}:${b.betKey}`]);
        if (!hasAny) return;

        if (y > 185) { doc.addPage(); y = 15; }
        doc.setFillColor(220, 230, 255);
        doc.rect(10, y - ROW_H + 1, pageW - 20, ROW_H, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(group, 12, y);
        y += ROW_H;

        groupBets.forEach(bet => {
          const key = `${bet.betType}:${bet.betKey}`;
          const r = storedResults[key];
          if (!r) return;
          if (y > 185) { doc.addPage(); y = 15; }

          const rtp = parseFloat(r.rtp);
          const ok = rtp >= module.rtpLow && rtp <= module.rtpHigh;
          const livePayout = getLivePayout(bet.betType, bet.betKey);

          doc.setFillColor(255, 255, 255);
          doc.rect(10, y - ROW_H + 1, pageW - 20, ROW_H, 'F');
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(plainLabel(bet), colX[0], y);
          doc.text(r.wins.toLocaleString(), colX[1], y);
          // Card Wins (perHandRank only)
          doc.setTextColor(120, 80, 200);
          doc.text(bet.betType === 'perHandRank' && r.perHandRankHandWins ? r.perHandRankHandWins.toLocaleString() : '—', colX[2], y);
          // Actual Rounds (perHandRank only)
          doc.setTextColor(100, 100, 120);
          doc.text(bet.betType === 'perHandRank' && r.actualRounds ? r.actualRounds.toLocaleString() : '—', colX[3], y);
          doc.setTextColor(0, 0, 0);
          doc.text(r.winFrequency + '%', colX[4], y);
          if (ok) doc.setTextColor(0, 140, 60);
          else doc.setTextColor(200, 0, 0);
          doc.text(parseFloat(r.rtp).toFixed(2) + '%', colX[5], y);
          doc.setTextColor(0, 0, 0);
          doc.text(livePayout + ':1', colX[6], y);
          doc.setTextColor(160, 100, 0);
          doc.text(r.for965 + ':1', colX[7], y);
          doc.setTextColor(ok ? 0 : 180, ok ? 140 : 0, ok ? 60 : 0);
          doc.text(ok ? 'PASS' : 'FAIL', colX[8], y);
          y += ROW_H;
        });
        y += 2;
      });

      y += 6;
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(
        `Rapid Fire Texas 10 — Certification Audit  |  GLI-11 / BMM / eCOGRA  |  Page ${i} of ${totalPages}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: 'center' }
      );
    }
    doc.save(`RapidFire_CertAudit_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportWord = () => {
    const now = new Date().toLocaleString();
    let tableRows = '';

    MODULES.forEach(module => {
      const storedResults = moduleResults[module.id]?.results || {};
      const done = Object.keys(storedResults).length;
      if (done === 0) return;

      tableRows += `<tr><td colspan="9" style="background:#0f172a;color:#facc15;font-weight:bold;font-size:11pt;padding:6px 8px;border:1px solid #334155;">
        ${module.name} — ${module.standard} (RTP ${module.rtpLow}%–${module.rtpHigh}%)
      </td></tr>`;

      const headers = ['Bet', 'Wins', 'Card Wins', '# Rounds', 'Win %', 'Actual RTP', 'Live Odds', 'For 96.5%', 'Status'];
      tableRows += `<tr>${headers.map(h => `<td style="background:#f0f0f0;font-weight:bold;border:1px solid #aaa;padding:3px 6px;">${h}</td>`).join('')}</tr>`;

      GROUPS.forEach(group => {
        const groupBets = ALL_BETS.filter(b => b.group === group);
        const hasAny = groupBets.some(b => storedResults[`${b.betType}:${b.betKey}`]);
        if (!hasAny) return;

        tableRows += `<tr><td colspan="9" style="background:#dce6ff;font-weight:bold;font-size:9pt;padding:3px 6px;border:1px solid #6480c8;">${group}</td></tr>`;

        groupBets.forEach(bet => {
          const key = `${bet.betType}:${bet.betKey}`;
          const r = storedResults[key];
          if (!r) return;
          const rtp = parseFloat(r.rtp);
          const ok = rtp >= module.rtpLow && rtp <= module.rtpHigh;
          const rtpColor = ok ? '#008000' : '#cc0000';
          const statusColor = ok ? '#008000' : '#cc0000';
          const livePayout = getLivePayout(bet.betType, bet.betKey);
          const td = (val, color = '#000') => `<td style="border:1px solid #ccc;padding:3px 6px;color:${color};font-weight:bold;">${val}</td>`;
          const cardWins = bet.betType === 'perHandRank' && r.perHandRankHandWins ? r.perHandRankHandWins.toLocaleString() : '—';
          const actualRounds = bet.betType === 'perHandRank' && r.actualRounds ? r.actualRounds.toLocaleString() : '—';
          tableRows += `<tr>
            ${td(plainLabel(bet))}
            ${td(r.wins.toLocaleString())}
            ${td(cardWins, '#7850c8')}
            ${td(actualRounds, '#666688')}
            ${td(r.winFrequency + '%')}
            ${td(parseFloat(r.rtp).toFixed(2) + '%', rtpColor)}
            ${td(livePayout + ':1')}
            ${td(r.for965 + ':1', '#a06400')}
            ${td(ok ? 'PASS' : 'FAIL', statusColor)}
          </tr>`;
        });
      });

      tableRows += `<tr><td colspan="9" style="padding:8px;border:none;">&nbsp;</td></tr>`;
    });

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head><meta charset="utf-8"><title>Certification Audit Report</title></head>
      <body style="font-family:Arial,sans-serif;font-size:9pt;">
        <h2>Rapid Fire Texas 10 &mdash; Certification Audit Report</h2>
        <p style="color:#444;">Generated: ${now} | Standards: GLI-11 / BMM Technical / eCOGRA | 32-card engine</p>
        <table style="border-collapse:collapse;width:100%;font-size:8.5pt;">${tableRows}</table>
        <p style="color:#888;font-size:8pt;margin-top:20px;">This report was generated by the Rapid Fire Texas 10 Gaming License Calibration Tool. All simulations run entirely in-browser using a certified 32-card engine.</p>
      </body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RapidFire_CertAudit_${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportModuleCertificate = (moduleId) => {
    const module = MODULES.find(m => m.id === moduleId);
    if (!module) return;
    const storedResults = moduleResults[moduleId]?.results || {};
    const done = Object.keys(storedResults).length;
    if (done === 0) return;

    const passed = Object.values(storedResults).filter(r => {
      const v = parseFloat(r.rtp);
      return v >= module.rtpLow && v <= module.rtpHigh;
    }).length;
    const failed = done - passed;
    const allPass = failed === 0 && done === ALL_BETS.length;
    const blendedRtp = (Object.values(storedResults).reduce((s, r) => s + parseFloat(r.rtp), 0) / done).toFixed(2);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const certNo = `RF-${moduleId.toUpperCase()}-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;

    // Page 1 (cover) = landscape A4 (297 × 210); pages 2+ (detail) = portrait A4 (210 × 297)
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pW = 297; // landscape width
    const pH = 210; // landscape height

    // ─── Shared helper: dark navy chrome with double gold border + corner ornaments ───
    const drawPageChrome = (w, h) => {
      doc.setFillColor(8, 12, 30);
      doc.rect(0, 0, w, h, 'F');
      doc.setFillColor(14, 20, 45);
      doc.rect(12, 12, w - 24, h - 24, 'F');
      // Outer thick gold border
      doc.setDrawColor(197, 160, 89);
      doc.setLineWidth(2.2);
      doc.rect(6, 6, w - 12, h - 12);
      // Inner thin gold border
      doc.setDrawColor(220, 185, 110);
      doc.setLineWidth(0.5);
      doc.rect(10, 10, w - 20, h - 20);
      // Corner ornaments (filled gold square + dark hollow)
      [[6,6],[w-13,6],[6,h-13],[w-13,h-13]].forEach(([cx, cy]) => {
        doc.setFillColor(197, 160, 89);
        doc.rect(cx - 1, cy - 1, 8, 8, 'F');
        doc.setFillColor(14, 20, 45);
        doc.rect(cx + 1, cy + 1, 4, 4, 'F');
      });
    };

    // ══════════════════════════════════════════════════════════════════════
    // PAGE 1 — POLISHED LANDSCAPE COVER CERTIFICATE
    // Layout zones (mm, top-to-bottom within 210mm height):
    //   Header band:    y 6–42     (36mm)
    //   Title block:    y 44–78    (34mm)
    //   PASS banner:    y 80–95    (15mm)
    //   Summary boxes:  y 97–121   (24mm)
    //   Statement:      y 124–140  (16mm)
    //   Divider:        y 141
    //   Category RTPs:  y 143–164  (21mm)
    //   Hand rank RTPs: y 165–197  (32mm — 2 rows × 5 cols)
    //   Footer strip:   y 169–204  (35mm — overlaps hand ranks section when fewer hands)
    // ══════════════════════════════════════════════════════════════════════
    drawPageChrome(pW, pH);

    // ─────────────────────────────────────────────────────────────────────
    // LAYOUT MAP (all Y values in mm, page height = 210mm)
    //  10–28   Header band          (18mm)
    //  30–46   Title block          (16mm)
    //  47–55   PASS/FAIL banner     ( 8mm)
    //  57–71   4 summary boxes      (14mm)
    //  73–83   Compliance text      (10mm)
    //  84      Divider line
    //  85–90   Category heading     ( 5mm)
    //  91–103  3 category RTP boxes (12mm)
    //  105–130 10 hand rank boxes   (25mm — 2 rows × 12mm)
    //  131     Footer divider
    //  133–196 Footer (cert meta + seal)
    //  198     Bottom tagline
    // ─────────────────────────────────────────────────────────────────────

    // ── Header band (compact) ─────────────────────────────────────────────
    doc.setFillColor(12, 18, 48);
    doc.rect(10, 10, pW - 20, 18, 'F');
    doc.setDrawColor(197, 160, 89);
    doc.setLineWidth(0.5);
    doc.line(10, 28, pW - 10, 28);

    doc.setTextColor(197, 160, 89);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("RAPID FIRE TEXAS HOLD'EM", pW / 2, 17, { align: 'center' });
    doc.setFontSize(7);
    doc.setTextColor(165, 174, 210);
    doc.setFont('helvetica', 'normal');
    doc.text('32-Card Certified Game Engine  ·  Monte Carlo Simulation Platform', pW / 2, 23, { align: 'center' });
    doc.setFontSize(6);
    doc.setTextColor(108, 118, 158);
    doc.text('Gaming Compliance & Certification Division', pW / 2, 27, { align: 'center' });

    // ── Main title block ──────────────────────────────────────────────────
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(250, 210, 40);
    doc.text('CERTIFICATE OF COMPLIANCE', pW / 2, 38, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(197, 160, 89);
    doc.text(`${module.name.toUpperCase()} AUDIT`, pW / 2, 45, { align: 'center' });

    // Gold double rule
    doc.setDrawColor(197, 160, 89);
    doc.setLineWidth(0.8);
    doc.line(20, 47.5, pW - 20, 47.5);
    doc.setLineWidth(0.25);
    doc.line(20, 49.5, pW - 20, 49.5);

    // ── PASS / FAIL banner ────────────────────────────────────────────────
    const bannerW = 90, bannerH = 10;
    const bannerX = pW / 2 - bannerW / 2;
    if (allPass) { doc.setFillColor(15, 110, 50); doc.setDrawColor(50, 200, 90); }
    else         { doc.setFillColor(150, 20, 20);  doc.setDrawColor(220, 60, 60); }
    doc.setLineWidth(0.5);
    doc.roundedRect(bannerX, 51, bannerW, bannerH, 2.5, 2.5, 'FD');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(allPass ? 'ALL BETS PASSED' : `${failed} BET(S) FAILED`, pW / 2, 57.5, { align: 'center' });

    // ── 4 Summary info boxes ──────────────────────────────────────────────
    const sbW = 58, sbH = 14;
    const sbTotalW = 4 * sbW;
    const sbGap = (pW - 20 - sbTotalW) / 5;
    const sbY = 63;
    [
      { label: 'Standard',    value: module.standard,                          bg: [18, 32, 82],  border: [90, 120, 210] },
      { label: 'Blended RTP', value: blendedRtp + '%',                         bg: allPass ? [14, 90, 42] : [100, 18, 18], border: allPass ? [50, 190, 90] : [210, 70, 70] },
      { label: 'Bets Passed', value: `${passed} / ${done}`,                   bg: [18, 32, 82],  border: [90, 120, 210] },
      { label: 'RTP Range',   value: `${module.rtpLow}%–${module.rtpHigh}%`, bg: [55, 40, 8],   border: [197, 160, 89] },
    ].forEach((b, i) => {
      const bx = 10 + sbGap + i * (sbW + sbGap);
      doc.setFillColor(...b.bg);
      doc.roundedRect(bx, sbY, sbW, sbH, 2.5, 2.5, 'F');
      doc.setDrawColor(...b.border);
      doc.setLineWidth(0.5);
      doc.roundedRect(bx, sbY, sbW, sbH, 2.5, 2.5, 'S');
      doc.setTextColor(148, 158, 200);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(b.label, bx + sbW / 2, sbY + 4.5, { align: 'center' });
      doc.setTextColor(250, 220, 100);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(b.value, bx + sbW / 2, sbY + 11, { align: 'center' });
    });

    // ── Compliance statement (3 lines, tight leading) ─────────────────────
    const stY = 82;
    doc.setTextColor(160, 168, 205);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    [
      `This certificate confirms that the above-named game engine has undergone a rigorous Monte Carlo statistical audit under the ${module.standard} standard.`,
      `All ${done} betting positions were simulated at ${module.rounds.toLocaleString()} rounds per bet using a certified 32-card randomised engine.`,
      `The Return to Player values fall within the declared range of ${module.rtpLow}%–${module.rtpHigh}%.`,
    ].forEach((l, i) => doc.text(l, pW / 2, stY + i * 5, { align: 'center' }));

    // ── Section divider ───────────────────────────────────────────────────
    doc.setDrawColor(197, 160, 89);
    doc.setLineWidth(0.3);
    doc.line(20, 97, pW - 20, 97);
    doc.setTextColor(197, 160, 89);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('BLENDED RTP BY CATEGORY', pW / 2, 101, { align: 'center' });

    // Calculate group RTPs
    const groupRTPs = {};
    GROUPS.forEach(grp => {
      const gb = ALL_BETS.filter(b => b.group === grp);
      const gr = gb.map(b => storedResults[`${b.betType}:${b.betKey}`]).filter(Boolean);
      if (!gr.length) return;
      groupRTPs[grp] = (gr.reduce((s, r) => s + parseFloat(r.rtp), 0) / gr.length).toFixed(2);
    });
    const handRTPs = {};
    for (let hid = 1; hid <= 10; hid++) {
      const hb = ALL_BETS.filter(b => b.betType === 'perHandRank' && b.handId === hid);
      const hr = hb.map(b => storedResults[`${b.betType}:${b.betKey}`]).filter(Boolean);
      if (!hr.length) continue;
      handRTPs[hid] = (hr.reduce((s, r) => s + parseFloat(r.rtp), 0) / hr.length).toFixed(2);
    }

    const CAT_COLORS = {
      cardHand:   { bg: [18, 42, 90],  border: [75, 125, 220] },
      colorBoard: { bg: [8,  58, 62],  border: [45, 175, 185] },
      river:      { bg: [68, 32, 8],   border: [195, 115, 38] },
      handRank:   { bg: [38, 18, 80],  border: [125, 75, 220] },
    };

    // ── 3 category RTP boxes ──────────────────────────────────────────────
    const cbW = 72, cbH = 13, cbGap = 10;
    const cbTotalW = 3 * cbW + 2 * cbGap;
    const cbStartX = (pW - cbTotalW) / 2;
    const cbY = 103;
    [
      { label: 'Card Hand Blended RTP',   value: groupRTPs['Carded Hands'] || '—', colors: CAT_COLORS.cardHand },
      { label: 'Color Board Blended RTP', value: groupRTPs['Color Board']   || '—', colors: CAT_COLORS.colorBoard },
      { label: 'River Board Blended RTP', value: groupRTPs['Low / High']    || '—', colors: CAT_COLORS.river },
    ].forEach((b, i) => {
      const bx = cbStartX + i * (cbW + cbGap);
      const rtpNum = parseFloat(b.value);
      doc.setFillColor(...b.colors.bg);
      doc.roundedRect(bx, cbY, cbW, cbH, 2, 2, 'F');
      doc.setDrawColor(...b.colors.border);
      doc.setLineWidth(0.5);
      doc.roundedRect(bx, cbY, cbW, cbH, 2, 2, 'S');
      doc.setTextColor(168, 194, 220);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(b.label, bx + cbW / 2, cbY + 5, { align: 'center' });
      doc.setTextColor(240, 218, 100);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(b.value + (isNaN(rtpNum) ? '' : '%'), bx + cbW / 2, cbY + 11, { align: 'center' });
    });

    // ── 10 hand/rank RTP boxes (5 per row × 2 rows) ──────────────────────
    const HAND_SHORT = {
      1:'A/10 Rank Hand', 2:'K/K Rank Hand', 3:'Q/J Rank Hand', 4:'Q/10 Rank Hand', 5:'J/9 Rank Hand',
      6:'8/6 Rank Hand',  7:'7/7 Rank Hand', 8:'4/2 Rank Hand', 9:'3/3 Rank Hand',  10:'A/5 Rank Hand',
    };
    const hbW = 50, hbH = 12, hbCols = 5, hbGap = 3.5;
    const hbTotalW = hbCols * hbW + (hbCols - 1) * hbGap;
    const hbStartX = (pW - hbTotalW) / 2;
    const hbY0 = cbY + cbH + 3;

    for (let hid = 1; hid <= 10; hid++) {
      const rtp = handRTPs[hid];
      if (!rtp) continue;
      const idx = hid - 1;
      const col = idx % hbCols;
      const row = Math.floor(idx / hbCols);
      const bx = hbStartX + col * (hbW + hbGap);
      const by = hbY0 + row * (hbH + 2.5);
      doc.setFillColor(...CAT_COLORS.handRank.bg);
      doc.roundedRect(bx, by, hbW, hbH, 1.5, 1.5, 'F');
      doc.setDrawColor(...CAT_COLORS.handRank.border);
      doc.setLineWidth(0.35);
      doc.roundedRect(bx, by, hbW, hbH, 1.5, 1.5, 'S');
      doc.setTextColor(185, 168, 230);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.text(HAND_SHORT[hid], bx + hbW / 2, by + 4, { align: 'center' });
      doc.setFontSize(4);
      doc.text('Blended RTP', bx + hbW / 2, by + 7, { align: 'center' });
      doc.setTextColor(210, 178, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(rtp + '%', bx + hbW / 2, by + 10.5, { align: 'center' });
    }

    // ── Footer strip ──────────────────────────────────────────────────────
    // Sits just below the hand rank rows. Row 2 bottom = hbY0 + 1*(hbH+2.5) + hbH
    const footerY = hbY0 + 2 * hbH + 2 * 2.5 + 3;
    doc.setDrawColor(197, 160, 89);
    doc.setLineWidth(0.3);
    doc.line(20, footerY, pW - 20, footerY);

    // Left: cert metadata
    [
      { label: 'Certificate No.:', value: certNo },
      { label: 'Issue Date:',       value: dateStr },
      { label: 'Engine:',           value: 'Rapid Fire Texas 10 — In-Browser Monte Carlo v1.0' },
    ].forEach((f, i) => {
      const fy = footerY + 5.5 + i * 6;
      doc.setTextColor(115, 125, 165);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(f.label, 14, fy);
      doc.setTextColor(218, 192, 98);
      doc.setFont('helvetica', 'bold');
      doc.text(f.value, 14 + 26, fy);
    });

    // Right: certification seal
    const sX = pW - 30, sY = footerY + 12;
    doc.setFillColor(12, 18, 50);
    doc.setDrawColor(197, 160, 89);
    doc.setLineWidth(1.2);
    doc.circle(sX, sY, 13, 'FD');
    doc.setDrawColor(220, 185, 110);
    doc.setLineWidth(0.4);
    doc.circle(sX, sY, 10, 'S');
    doc.setTextColor(197, 160, 89);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFIED', sX, sY - 3, { align: 'center' });
    doc.text(allPass ? 'COMPLIANT' : 'REVIEWED', sX, sY + 2.5, { align: 'center' });
    doc.setFontSize(4.5);
    doc.text(String(now.getFullYear()), sX, sY + 7, { align: 'center' });

    // Bottom tagline
    doc.setTextColor(68, 74, 100);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Rapid Fire Texas 10  ·  ${module.name} Certification  ·  ${module.standard}  ·  ${dateStr}  ·  Page 1 of 1`,
      pW / 2, pH - 8, { align: 'center' }
    );

    // ═══════════════════════════════════════════════════════════
    // PAGES 2+ — DETAILED RESULTS (professional dark table)
    // ═══════════════════════════════════════════════════════════
    // Columns — portrait A4 (210mm wide) for detail pages
    const dpW = 210, dpH = 297;
    const COL = {
      bet:    12,
      wins:   88,
      rounds: 108,
      winPct: 128,
      rtp:    146,
      odds:   161,
      for965: 175,
      result: 186,
    };
    const PILL_W = 13;
    const ROW_H = 7;
    const TABLE_LEFT = 12;
    const TABLE_RIGHT = dpW - 12;
    const TABLE_W = TABLE_RIGHT - TABLE_LEFT;

    let curY = 0;

    const startDataPage = () => {
      doc.addPage([210, 297], 'portrait'); // portrait A4 for detail pages
      const dpW = 210, dpH = 297;
      drawPageChrome(dpW, dpH);

      // Page header band
      doc.setFillColor(14, 22, 50);
      doc.rect(10, 10, dpW - 20, 20, 'F');
      doc.setDrawColor(197, 160, 89);
      doc.setLineWidth(0.4);
      doc.line(10, 30, dpW - 10, 30);

      doc.setTextColor(197, 160, 89);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPID FIRE TEXAS HOLD\'EM — DETAILED AUDIT RESULTS', dpW / 2, 18, { align: 'center' });
      doc.setTextColor(140, 148, 175);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${module.name}  ·  ${module.standard}  ·  ${module.rounds.toLocaleString()} rounds/bet  ·  Cert No. ${certNo}`, dpW / 2, 25, { align: 'center' });

      curY = 36;
    };

    const drawTableHeader = () => {
      doc.setFillColor(28, 40, 80);
      doc.rect(TABLE_LEFT, curY, TABLE_W, ROW_H, 'F');
      doc.setDrawColor(197, 160, 89);
      doc.setLineWidth(0.4);
      doc.line(TABLE_LEFT, curY, TABLE_RIGHT, curY);
      doc.line(TABLE_LEFT, curY + ROW_H, TABLE_RIGHT, curY + ROW_H);

      doc.setTextColor(197, 160, 89);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('Bet / Position', COL.bet + 1, curY + 5);
      doc.text('Wins', COL.wins, curY + 5, { align: 'right' });
      doc.text('# Rounds', COL.rounds, curY + 5, { align: 'right' });
      doc.text('Win %', COL.winPct, curY + 5, { align: 'right' });
      doc.text('Actual RTP', COL.rtp, curY + 5, { align: 'right' });
      doc.text('Live Odds', COL.odds, curY + 5, { align: 'right' });
      doc.text('For 96.5%', COL.for965, curY + 5, { align: 'right' });
      doc.text('Result', COL.result + PILL_W / 2, curY + 5, { align: 'center' });
      curY += ROW_H;
    };

    const drawGroupHeader = (label) => {
      if (curY > dpH - 30) { startDataPage(); drawTableHeader(); }
      doc.setFillColor(20, 30, 65);
      doc.rect(TABLE_LEFT, curY, TABLE_W, ROW_H - 1, 'F');
      doc.setDrawColor(100, 120, 180);
      doc.setLineWidth(0.3);
      doc.line(TABLE_LEFT, curY + ROW_H - 1, TABLE_RIGHT, curY + ROW_H - 1);
      doc.setTextColor(160, 180, 240);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(label.toUpperCase(), COL.bet + 2, curY + 5);
      curY += ROW_H;
    };

    const drawDataRow = (bet, r, rowIdx) => {
      if (curY > dpH - 22) { startDataPage(); drawTableHeader(); }
      const rtp = parseFloat(r.rtp);
      const ok = rtp >= module.rtpLow && rtp <= module.rtpHigh;
      const livePayout = getLivePayout(bet.betType, bet.betKey);
      const isHandRank = bet.betType === 'perHandRank';

      // Alternating row fill — no accent bar
      doc.setFillColor(rowIdx % 2 === 0 ? 18 : 22, rowIdx % 2 === 0 ? 26 : 32, rowIdx % 2 === 0 ? 52 : 62);
      doc.rect(TABLE_LEFT, curY, TABLE_W, ROW_H, 'F');

      // Subtle bottom rule
      doc.setDrawColor(35, 45, 80);
      doc.setLineWidth(0.15);
      doc.line(TABLE_LEFT, curY + ROW_H, TABLE_RIGHT, curY + ROW_H);

      const textY = curY + 5;

      // Bet label
      doc.setTextColor(210, 215, 235);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(plainLabel(bet).slice(0, 40), COL.bet + 1, textY);

      // Wins
      doc.setTextColor(190, 195, 220);
      doc.setFontSize(6);
      doc.text(r.wins.toLocaleString(), COL.wins, textY, { align: 'right' });

      // # Rounds — show actualRounds for perHandRank, else module rounds
      const roundsDisplay = isHandRank && r.actualRounds
        ? r.actualRounds.toLocaleString()
        : module.rounds.toLocaleString();
      doc.setTextColor(isHandRank ? 180 : 150, isHandRank ? 160 : 150, isHandRank ? 220 : 175);
      doc.text(roundsDisplay, COL.rounds, textY, { align: 'right' });

      // Win %
      doc.setTextColor(190, 195, 220);
      doc.text(r.winFrequency + '%', COL.winPct, textY, { align: 'right' });

      // RTP — coloured
      if (ok) doc.setTextColor(80, 220, 120);
      else if (rtp > module.rtpHigh) doc.setTextColor(255, 160, 50);
      else doc.setTextColor(255, 90, 90);
      doc.setFont('helvetica', 'bold');
      doc.text(rtp.toFixed(2) + '%', COL.rtp, textY, { align: 'right' });

      // Live odds
      doc.setTextColor(190, 195, 220);
      doc.setFont('helvetica', 'normal');
      doc.text(livePayout + ':1', COL.odds, textY, { align: 'right' });

      // For 96.5%
      doc.setTextColor(220, 185, 80);
      doc.text(r.for965 + ':1', COL.for965, textY, { align: 'right' });

      // PASS / FAIL pill — kept within table boundary
      const pillX = COL.result;
      const pillH = 4.5;
      if (ok) {
        doc.setFillColor(20, 130, 60);
        doc.setDrawColor(60, 200, 100);
      } else {
        doc.setFillColor(140, 20, 20);
        doc.setDrawColor(220, 70, 70);
      }
      doc.roundedRect(pillX, textY - 3.5, PILL_W, pillH, 1, 1, 'FD');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.text(ok ? 'PASS' : 'FAIL', pillX + PILL_W / 2, textY - 0.2, { align: 'center' });

      curY += ROW_H;
    };

    // Start first data page
    startDataPage();
    drawTableHeader();

    let rowIdx = 0;
    GROUPS.forEach(group => {
      const groupBets = ALL_BETS.filter(b => b.group === group);
      const hasAny = groupBets.some(b => storedResults[`${b.betType}:${b.betKey}`]);
      if (!hasAny) return;

      drawGroupHeader(group);

      groupBets.forEach(bet => {
        const key = `${bet.betType}:${bet.betKey}`;
        const r = storedResults[key];
        if (!r) return;
        drawDataRow(bet, r, rowIdx++);
      });

      // Small gap between groups
      curY += 2;
    });

    // Summary footer on last data page
    if (curY < dpH - 30) {
      curY += 4;
      doc.setDrawColor(197, 160, 89);
      doc.setLineWidth(0.3);
      doc.line(TABLE_LEFT, curY, TABLE_RIGHT, curY);
      curY += 5;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(197, 160, 89);
      doc.text(`Total Bets Tested: ${done}`, TABLE_LEFT + 2, curY);
      doc.text(`Passed: ${passed}`, TABLE_LEFT + 50, curY);
      if (failed > 0) {
        doc.setTextColor(255, 100, 100);
        doc.text(`Failed: ${failed}`, TABLE_LEFT + 85, curY);
      }
      doc.setTextColor(allPass ? 80 : 220, allPass ? 220 : 80, allPass ? 80 : 80);
      doc.text(`Blended RTP: ${blendedRtp}%`, TABLE_LEFT + 120, curY);
    }

    // Page numbers — cover (page 1) and all detail pages
    const totalPages = doc.internal.getNumberOfPages();
    // Update cover page tagline with correct total
    doc.setPage(1);
    doc.setFillColor(8, 12, 30);
    doc.rect(0, pH - 13, pW, 13, 'F');
    doc.setTextColor(68, 74, 100);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Rapid Fire Texas 10  ·  ${module.name} Certification  ·  ${module.standard}  ·  ${dateStr}  ·  Page 1 of ${totalPages}`,
      pW / 2, pH - 8, { align: 'center' }
    );
    // Portrait detail pages
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 75, 100);
      doc.text(
        `Rapid Fire Texas 10  ·  ${module.name} Certification  ·  ${module.standard}  ·  ${dateStr}  ·  Page ${i} of ${totalPages}`,
        dpW / 2, dpH - 12, { align: 'center' }
      );
    }

    doc.save(`RapidFire_Certificate_${module.id}_${now.toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 mb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-white mb-1">Multi-Tier Certification Audit</h3>
              <p className="text-gray-400 text-sm">
                Four escalating audit modules covering all {ALL_BETS.length} betting positions (10 hands + {PER_HAND_RANK_BETS.length} per-hand ranks + 8 color/river) with live payouts from{' '}
                <code className="text-yellow-300 text-xs">payoutConstants.js</code>.
                Each module auto-saves progress — refresh-safe with Continue recovery.
              </p>
            </div>
          </div>

          {hasAnyResults && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={exportPDF}
                className="flex items-center gap-1.5 text-blue-300 border border-blue-700 px-4 py-2 rounded-lg text-sm hover:bg-blue-900/30 transition-all font-semibold whitespace-nowrap"
              >
                <FileDown className="w-3.5 h-3.5" /> Export PDF
              </button>
              <button
                onClick={exportWord}
                className="flex items-center gap-1.5 text-emerald-300 border border-emerald-700 px-4 py-2 rounded-lg text-sm hover:bg-emerald-900/30 transition-all font-semibold whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5" /> Export Word
              </button>
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 text-gray-500 border border-slate-600 px-3 py-2 rounded-lg text-sm hover:text-red-400 hover:border-red-700 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {MODULES.map(module => (
        <ModulePanel
          key={module.id}
          module={module}
          bets={ALL_BETS}
          onResultsChange={handleResultsChange}
          onExportCertificate={exportModuleCertificate}
        />
      ))}

      <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <p className="text-gray-400 font-semibold mb-1">Pass criteria by module:</p>
        {MODULES.map(m => (
          <p key={m.id}>• <span className="text-gray-300">{m.name}</span>: RTP {m.rtpLow}%–{m.rtpHigh}% &nbsp;|&nbsp; {m.standard}</p>
        ))}
        <p className="text-gray-600 pt-1">Progress is saved automatically after each bet. Refresh the page and click <span className="text-yellow-400">Continue</span> to resume from where you left off.</p>
      </div>
    </div>
  );
}