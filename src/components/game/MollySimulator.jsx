// ============================================================
// MOLLY SIMULATOR — Backend-Powered Monte Carlo Audit
// Replaces browser worker with server-side simulation engine.
// All 70 bet positions, DB-persisted, crash-proof.
// ============================================================
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronRight, Shield, FileDown, Trash2, Clock,
  Database, Zap, Award, RotateCcw
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { CARDED_HAND_PAYOUTS, COLOR_BOARD_PAYOUTS, LOW_HIGH_PAYOUT } from '@/lib/payoutConstants';
import { PER_HAND_RANK_PAYOUTS } from '@/lib/perHandRankPayouts';
import { jsPDF } from 'jspdf';

// ── Bet definitions (matches auditWorker.js exactly) ─────────
const HAND_LABELS = {
  1:'Hand 1 — A♦10♥', 2:'Hand 2 — K♣K♠', 3:'Hand 3 — Q♣J♠', 4:'Hand 4 — Q♠10♠',
  5:'Hand 5 — J♣9♣', 6:'Hand 6 — 8♦6♦', 7:'Hand 7 — 7♦7♠', 8:'Hand 8 — 4♥2♥',
  9:'Hand 9 — 3♣3♥', 10:'Hand 10 — A♥5♦',
};

function buildAllBets() {
  const bets = [];
  // Carded hands
  for (let i = 1; i <= 10; i++) {
    bets.push({ betType:'hand', betKey:String(i), label:HAND_LABELS[i], group:'Carded Hands' });
  }
  // Per-hand rank bets
  for (let handId = 1; handId <= 10; handId++) {
    const ranks = PER_HAND_RANK_PAYOUTS[handId] || {};
    for (const rankName of Object.keys(ranks)) {
      bets.push({
        betType:'perHandRank',
        betKey:`${handId}:${rankName}`,
        label:`${HAND_LABELS[handId]} / ${rankName}`,
        group:'Hand Ranks',
      });
    }
  }
  // Color board
  for (const key of ['3R','3B','4R','4B','5R','5B']) {
    const label = key.endsWith('R') ? `${key[0]} Red` : `${key[0]} Black`;
    bets.push({ betType:'color', betKey:key, label, group:'Color Board' });
  }
  // Low / High
  bets.push({ betType:'lh', betKey:'LOW',  label:'River LOW',  group:'Low / High' });
  bets.push({ betType:'lh', betKey:'HIGH', label:'River HIGH', group:'Low / High' });
  return bets;
}

const ALL_BETS = buildAllBets();

const MODULES = [
  { id:'quick',         name:'Quick Check',       rounds:100_000,   standard:'Internal Pre-Flight',      rtpLow:93,  rtpHigh:99,   badge:'bg-slate-700 text-slate-300',   accent:'border-slate-500' },
  { id:'presubmission', name:'Pre-Submission',     rounds:500_000,   standard:'House Internal Standard',  rtpLow:94,  rtpHigh:98.5, badge:'bg-blue-900/40 text-blue-300',  accent:'border-blue-600'  },
  { id:'gli',           name:'GLI / BMM',          rounds:1_000_000, standard:'GLI-11 / BMM Technical',  rtpLow:95,  rtpHigh:98,   badge:'bg-amber-900/40 text-amber-300',accent:'border-amber-600' },
  { id:'full',          name:'Full Certification', rounds:2_000_000, standard:'eCOGRA / Full Cert',       rtpLow:95,  rtpHigh:98,   badge:'bg-green-900/40 text-green-300', accent:'border-green-600' },
];

function fmt2(v) { return Number(v).toFixed(2); }
function fmtPct(v) { return Number(v).toFixed(4) + '%'; }

function StatusIcon({ status, passed, rtp, low, high }) {
  if (status === 'running') return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
  if (status === 'complete') {
    if (passed === true)  return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    if (passed === false) return <XCircle className="w-4 h-4 text-red-400" />;
    return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  }
  if (status === 'partial') return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  return <div className="w-4 h-4 rounded-full border border-slate-600 bg-slate-800" />;
}

function RTPPill({ rtp, low, high }) {
  if (!rtp) return null;
  const v = parseFloat(rtp);
  const ok = v >= low && v <= high;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ok ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
      {fmtPct(rtp)}
    </span>
  );
}

// ── Module Panel ──────────────────────────────────────────────
function ModulePanel({ module }) {
  const [job, setJob] = useState(null);          // SimulationJob record
  const [results, setResults] = useState({});    // betKey → result record
  const [running, setRunning] = useState(false);
  const [currentBet, setCurrentBet] = useState('');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(false);

  // ── Load existing job from DB on mount ───────────────────────
  useEffect(() => {
    loadJobFromDb();
  }, []);

  async function loadJobFromDb() {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('manageSimulationJob', { action: 'list' });
      const existing = (res.data?.jobs || []).find(j => j.module_id === module.id);
      if (existing) {
        setJob(statusRes.data?.job || existing);
        // Load bet results
        const statusRes = await base44.functions.invoke('manageSimulationJob', { action: 'status', job_id: existing.id });
        const resultMap = {};
        for (const r of (statusRes.data?.results || [])) {
          resultMap[r.bet_key] = r;
        }
        setResults(resultMap);
      }
    } catch (e) {
      console.error('loadJobFromDb error:', e);
    }
    setLoading(false);
  }

  // ── Payout snapshot ───────────────────────────────────────────
  function getPayoutsSnapshot() {
    return {
      handPayouts: [...CARDED_HAND_PAYOUTS],
      perHandRankPayouts: PER_HAND_RANK_PAYOUTS,
      colorPayouts: { ...COLOR_BOARD_PAYOUTS },
      lhPayout: LOW_HIGH_PAYOUT,
    };
  }

  // ── Start / Resume run ────────────────────────────────────────
  async function startRun() {
    abortRef.current = false;
    setRunning(true);

    let currentJob = job;
    const payouts = getPayoutsSnapshot();

    // Create job if doesn't exist
    if (!currentJob) {
      try {
        const res = await base44.functions.invoke('manageSimulationJob', {
          action: 'create',
          module_id: module.id,
          module_name: module.name,
          rounds_per_bet: module.rounds,
          bets_total: ALL_BETS.length,
          rtp_low: module.rtpLow,
          rtp_high: module.rtpHigh,
          standard: module.standard,
          payouts_snapshot: JSON.stringify(payouts),
        });
        currentJob = res.data.job;
        setJob(currentJob);
      } catch (e) {
        console.error('Failed to create job:', e);
        setRunning(false);
        return;
      }
    } else {
      // Mark as running
      await base44.functions.invoke('manageSimulationJob', {
        action: 'update', job_id: currentJob.id, status: 'running',
      });
    }

    let betsComplete = 0;
    let totalRtp = 0;
    let betsPassed = 0;
    let betsFailed = 0;

    // Count already-complete bets from loaded results
    for (const r of Object.values(results)) {
      if (r.rtp) {
        betsComplete++;
        totalRtp += parseFloat(r.rtp);
        if (r.passed) betsPassed++; else betsFailed++;
      }
    }

    for (let i = 0; i < ALL_BETS.length; i++) {
      if (abortRef.current) break;

      const bet = ALL_BETS[i];
      const existingResult = results[bet.betKey];

      // Skip if already complete
      if (existingResult?.rtp && !existingResult?.checkpoint_data) {
        continue;
      }

      setCurrentBet(bet.label);
      setCurrentProgress(0);

      // Determine if resuming
      const resumeId = existingResult?.id ?? null;

      // Run until complete (may need multiple calls if adaptive/slow)
      let betResultId = resumeId;
      let complete = false;
      let lastResult = null;

      while (!complete && !abortRef.current) {
        try {
          const res = await base44.functions.invoke('runSimulationBet', {
            job_id: currentJob.id,
            bet_result_id: betResultId,
            rounds: module.rounds,
            betType: bet.betType,
            betKey: bet.betKey,
            betLabel: bet.label,
            betGroup: bet.group,
            betIndex: i,
            handPayouts: payouts.handPayouts,
            perHandRankPayouts: payouts.perHandRankPayouts,
            colorPayouts: payouts.colorPayouts,
            lhPayout: payouts.lhPayout,
            rtpLow: module.rtpLow,
            rtpHigh: module.rtpHigh,
            module_id: module.id,
          });

          betResultId = res.data?.bet_result_id;
          complete = res.data?.complete;
          lastResult = res.data;

          // Update progress display
          if (res.data?.progress) {
            setCurrentProgress(res.data.progress.done / res.data.progress.total);
          }

          // Update local results with latest partial data
          setResults(prev => ({
            ...prev,
            [bet.betKey]: {
              ...prev[bet.betKey],
              id: betResultId,
              rtp: res.data?.rtp,
              wins: res.data?.wins,
              actual_rounds: res.data?.actualRounds,
              win_frequency: res.data?.winFrequency,
              passed: res.data?.passed,
              checkpoint_data: complete ? null : 'pending',
            },
          }));

        } catch (e) {
          console.error(`Error on bet ${bet.betKey}:`, e);
          break;
        }
      }

      if (lastResult?.rtp && complete) {
        betsComplete++;
        totalRtp += parseFloat(lastResult.rtp);
        if (lastResult.passed) betsPassed++; else betsFailed++;

        // Reload full result from DB
        await loadJobFromDb();

        // Update job progress
        const blendedRtp = betsComplete > 0 ? totalRtp / betsComplete : null;
        await base44.functions.invoke('manageSimulationJob', {
          action: 'update',
          job_id: currentJob.id,
          status: abortRef.current ? 'paused' : 'running',
          bets_complete: betsComplete,
          blended_rtp: blendedRtp,
          bets_passed: betsPassed,
          bets_failed: betsFailed,
        });

        setJob(prev => ({
          ...prev,
          bets_complete: betsComplete,
          blended_rtp: blendedRtp,
          bets_passed: betsPassed,
          bets_failed: betsFailed,
        }));
      }
    }

    // Finalize job
    if (!abortRef.current && betsComplete === ALL_BETS.length) {
      const blendedRtp = betsComplete > 0 ? totalRtp / betsComplete : null;
      await base44.functions.invoke('manageSimulationJob', {
        action: 'update',
        job_id: currentJob.id,
        status: 'complete',
        bets_complete: betsComplete,
        blended_rtp: blendedRtp,
        bets_passed: betsPassed,
        bets_failed: betsFailed,
        completed_at: new Date().toISOString(),
      });
      setJob(prev => ({ ...prev, status: 'complete', blended_rtp: blendedRtp }));
    } else if (abortRef.current) {
      await base44.functions.invoke('manageSimulationJob', {
        action: 'update', job_id: currentJob.id, status: 'paused',
      });
      setJob(prev => ({ ...prev, status: 'paused' }));
    }

    setRunning(false);
    setCurrentBet('');
    setCurrentProgress(0);
    loadJobFromDb();
  }

  function stopRun() {
    abortRef.current = true;
  }

  async function deleteJob() {
    if (!job) return;
    if (!confirm(`Delete all ${module.name} results? This cannot be undone.`)) return;
    await base44.functions.invoke('manageSimulationJob', { action: 'delete', job_id: job.id });
    setJob(null);
    setResults({});
  }

  // ── PDF Export ────────────────────────────────────────────────
  function exportPDF() {
    const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, W, 50, 'F');
    doc.setTextColor(255, 215, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica','bold');
    doc.text('RAPID FIRE TEXAS HOLD\'EM', W/2, 15, { align:'center' });
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 200);
    doc.text('32-Card Certified Game Engine · Monte Carlo Simulation Platform', W/2, 23, { align:'center' });
    doc.text('Gaming Compliance & Certification Division', W/2, 30, { align:'center' });

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica','bold');
    doc.text('BACKEND SIMULATION REPORT', W/2, 42, { align:'center' });

    let y = 60;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.setFont('helvetica','normal');

    const completedResults = Object.values(results).filter(r => r.rtp);
    const blended = job?.blended_rtp ?? (completedResults.length > 0
      ? completedResults.reduce((s, r) => s + parseFloat(r.rtp), 0) / completedResults.length : 0);

    doc.setFont('helvetica','bold');
    doc.setFontSize(11);
    doc.text(`Module: ${module.name}`, 15, y); y += 7;
    doc.text(`Standard: ${module.standard}`, 15, y); y += 7;
    doc.text(`Rounds/Bet: ${module.rounds.toLocaleString()}`, 15, y); y += 7;
    doc.text(`Bets Complete: ${completedResults.length} / ${ALL_BETS.length}`, 15, y); y += 7;
    doc.text(`Blended RTP: ${fmt2(blended)}%`, 15, y); y += 7;
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, y); y += 12;

    // Table header
    doc.setFillColor(240, 240, 250);
    doc.rect(10, y - 4, W - 20, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica','bold');
    doc.text('Bet / Position', 12, y);
    doc.text('Wins', 105, y, { align:'right' });
    doc.text('Win %', 125, y, { align:'right' });
    doc.text('RTP', 148, y, { align:'right' });
    doc.text('Live Odds', 168, y, { align:'right' });
    doc.text('Result', 195, y, { align:'right' });
    y += 8;

    doc.setFont('helvetica','normal');
    let currentGroup = '';

    for (const bet of ALL_BETS) {
      const r = results[bet.betKey];
      if (!r?.rtp) continue;

      if (bet.group !== currentGroup) {
        currentGroup = bet.group;
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFillColor(220, 220, 235);
        doc.rect(10, y - 3, W - 20, 7, 'F');
        doc.setFont('helvetica','bold');
        doc.setFontSize(8);
        doc.text(currentGroup.toUpperCase(), 12, y + 1);
        y += 9;
        doc.setFont('helvetica','normal');
      }

      if (y > 270) { doc.addPage(); y = 20; }

      const rtpVal = parseFloat(r.rtp);
      const ok = rtpVal >= module.rtpLow && rtpVal <= module.rtpHigh;
      doc.setTextColor(ok ? 0 : 180, ok ? 100 : 0, 0);
      doc.setFontSize(7.5);
      doc.text(bet.label, 12, y);
      doc.text(Number(r.wins).toLocaleString(), 105, y, { align:'right' });
      doc.text(fmtPct(r.win_frequency), 125, y, { align:'right' });
      doc.setFont('helvetica','bold');
      doc.text(fmtPct(r.rtp), 148, y, { align:'right' });
      doc.setFont('helvetica','normal');
      doc.text(r.live_odds ? `${r.live_odds}:1` : '—', 168, y, { align:'right' });
      doc.text(ok ? 'PASS' : 'FAIL', 195, y, { align:'right' });
      doc.setTextColor(50, 50, 50);
      y += 6;
    }

    doc.save(`RapidFire_${module.id}_BackendSim_${Date.now()}.pdf`);
  }

  // ── Compute summary stats ─────────────────────────────────────
  const completedBets = Object.values(results).filter(r => r.rtp && !r.checkpoint_data);
  const passedBets = completedBets.filter(r => r.passed);
  const blendedRtp = completedBets.length > 0
    ? completedBets.reduce((s, r) => s + parseFloat(r.rtp), 0) / completedBets.length : null;

  const allComplete = completedBets.length === ALL_BETS.length;
  const isRunning = running;
  const isPaused = !running && job?.status === 'paused' && completedBets.length > 0 && !allComplete;
  const hasAny = completedBets.length > 0;

  const groupedBets = {};
  for (const bet of ALL_BETS) {
    if (!groupedBets[bet.group]) groupedBets[bet.group] = [];
    groupedBets[bet.group].push(bet);
  }

  return (
    <div className={`border rounded-xl overflow-hidden ${module.accent} bg-slate-900/60 mb-4`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/60">
        <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 flex-1 text-left">
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <span className="font-bold text-white text-sm">{module.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${module.badge}`}>{module.standard}</span>
          <span className="text-xs text-slate-400 ml-1">{module.rounds.toLocaleString()} rounds/bet</span>
        </button>

        <div className="flex items-center gap-3">
          {blendedRtp && (
            <div className="text-center">
              <div className="text-xs text-slate-500">Blended RTP</div>
              <div className={`text-sm font-bold ${allComplete ? 'text-green-400' : 'text-yellow-400'}`}>
                {fmt2(blendedRtp)}%
              </div>
            </div>
          )}
          <div className="text-center">
            <div className="text-xs text-slate-500">Progress</div>
            <div className="text-sm font-bold text-white">{completedBets.length} / {ALL_BETS.length}</div>
          </div>

          {isRunning ? (
            <button onClick={stopRun}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-xs font-bold hover:bg-red-900/60 transition-colors">
              <Square className="w-3.5 h-3.5" /> Pause
            </button>
          ) : (
            <button onClick={startRun} disabled={loading || allComplete}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors
                ${allComplete
                  ? 'bg-green-900/20 border-green-700/40 text-green-500 cursor-default'
                  : isPaused
                  ? 'bg-yellow-900/40 border-yellow-600 text-yellow-300 hover:bg-yellow-900/60'
                  : 'bg-blue-900/40 border-blue-600 text-blue-300 hover:bg-blue-900/60'}`}>
              {allComplete ? <><Award className="w-3.5 h-3.5" /> Complete</> :
               isPaused    ? <><RotateCcw className="w-3.5 h-3.5" /> Resume</> :
                             <><Play className="w-3.5 h-3.5" /> {hasAny ? 'Resume' : 'Start'}</>}
            </button>
          )}

          {hasAny && !isRunning && (
            <button onClick={exportPDF}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-600 text-slate-400 text-xs hover:text-white hover:border-slate-400 transition-colors">
              <FileDown className="w-3.5 h-3.5" />
            </button>
          )}
          {hasAny && !isRunning && (
            <button onClick={deleteJob}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-red-800/40 text-red-500/60 text-xs hover:text-red-400 hover:border-red-600 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Running indicator */}
      {isRunning && currentBet && (
        <div className="px-4 py-2 bg-blue-950/40 border-t border-blue-900/40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-blue-300 font-medium">Running: {currentBet}</span>
            <span className="text-xs text-blue-400">{Math.round(currentProgress * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              animate={{ width: `${currentProgress * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Results table */}
      {expanded && (
        <div className="px-4 pb-4 pt-2">
          {loading ? (
            <div className="text-center py-8 text-slate-500 text-sm">Loading saved results...</div>
          ) : (
            Object.entries(groupedBets).map(([group, bets]) => (
              <div key={group} className="mb-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">{group}</div>
                <div className="rounded-lg overflow-hidden border border-slate-700/50">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-800/80 text-slate-400">
                        <th className="text-left px-3 py-2 font-semibold">Bet Position</th>
                        <th className="text-right px-3 py-2 font-semibold">Wins</th>
                        <th className="text-right px-3 py-2 font-semibold">Win %</th>
                        <th className="text-right px-3 py-2 font-semibold">Actual RTP</th>
                        <th className="text-right px-3 py-2 font-semibold">Live Odds</th>
                        <th className="text-right px-3 py-2 font-semibold">For 96.5%</th>
                        <th className="text-center px-3 py-2 font-semibold">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {bets.map(bet => {
                        const r = results[bet.betKey];
                        const isRunningThis = isRunning && currentBet === bet.label;
                        const hasResult = r?.rtp && !r?.checkpoint_data;
                        const isPartial = r?.checkpoint_data;

                        return (
                          <tr key={bet.betKey}
                            className={`transition-colors ${isRunningThis ? 'bg-blue-950/30' : 'hover:bg-slate-800/30'}`}>
                            <td className="px-3 py-2 text-slate-300">{bet.label}</td>
                            <td className="px-3 py-2 text-right text-slate-400">
                              {isRunningThis ? <RefreshCw className="w-3 h-3 animate-spin ml-auto" /> :
                               hasResult ? Number(r.wins).toLocaleString() : '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-400">
                              {hasResult ? fmtPct(r.win_frequency) : isPartial ? <span className="text-yellow-600">partial</span> : '—'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {hasResult
                                ? <RTPPill rtp={r.rtp} low={module.rtpLow} high={module.rtpHigh} />
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-400">
                              {hasResult && r.live_odds ? `${r.live_odds}:1` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-400">
                              {hasResult && r.for_965 ? `${r.for_965}:1` : '—'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <StatusIcon
                                status={isRunningThis ? 'running' : hasResult ? 'complete' : isPartial ? 'partial' : 'pending'}
                                passed={r?.passed}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export default function MollySimulator({ onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-5xl bg-slate-950 border border-yellow-700/30 rounded-2xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-yellow-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Molly Simulator</h2>
                <p className="text-xs text-slate-400">Backend-powered · Database-persisted · Crash-proof · All 70 bet positions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-900/20 border border-green-800/40 px-2 py-1 rounded-lg">
                <Zap className="w-3 h-3" /> Server-side engine
              </div>
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors text-lg font-bold">
                ×
              </button>
            </div>
          </div>

          {/* Info banner */}
          <div className="mx-6 mt-4 px-4 py-3 bg-blue-950/30 border border-blue-800/30 rounded-lg text-xs text-blue-300 flex items-start gap-2">
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
            <span>
              Results are saved to the database after every bet completes and checkpointed every 20,000 rounds.
              You can close this panel, close the browser, or lose connection — your progress is safe.
              Reopen anytime to resume exactly where you left off.
            </span>
          </div>

          {/* Module panels */}
          <div className="p-6 space-y-2">
            {MODULES.map(mod => (
              <ModulePanel key={mod.id} module={mod} />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
