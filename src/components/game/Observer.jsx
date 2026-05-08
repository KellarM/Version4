// ============================================================
// OBSERVER — Live Game Intelligence System
// Phase 1: Silent Observer (accumulates round data to DB)
// Phase 2: Security Agent (drift analysis, exploit detection)
// Phase 3: Partner Assist (conversational tuning advisor)
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, ShieldCheck, X, Play, Send,
  ChevronDown, ChevronRight, RefreshCw,
  Download, Trash2, FileText, FileJson
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

// ── Pill toggle ───────────────────────────────────────────────
function Toggle({ on, onToggle, color = 'blue', disabled = false, label }) {
  const track = { blue: on ? 'bg-blue-600' : 'bg-slate-700', red: on ? 'bg-red-600' : 'bg-slate-700' }[color];
  return (
    <button onClick={onToggle} disabled={disabled}
      className={`flex items-center gap-2 group ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${track}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-5' : ''}`} />
      </div>
      <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">{label}</span>
    </button>
  );
}

function DriftBadge({ level }) {
  if (level === 'critical') return <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/50 border border-red-700/50 text-red-300 font-bold">CRITICAL</span>;
  if (level === 'warning')  return <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-900/50 border border-yellow-700/50 text-yellow-300 font-bold">WARNING</span>;
  return null;
}

function ChatMsg({ role, text }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
        role === 'user'
          ? 'bg-cyan-800/40 border border-cyan-700/40 text-cyan-100'
          : 'bg-slate-800/80 border border-slate-700/40 text-gray-200'
      }`}>
        {role === 'observer' && <span className="text-cyan-400 font-bold text-[10px] block mb-0.5">Observer</span>}
        {text}
      </div>
    </div>
  );
}

// ── Export helpers ────────────────────────────────────────────
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildCSVSummary(analysis) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rows = [
    ['Observer Security Report', ts],
    ['Rounds Analyzed', analysis.roundsAnalyzed],
    ['Observed RTP (%)', analysis.observedRTP ?? 'N/A'],
    ['House Edge', analysis.houseEdge ?? 'N/A'],
    ['Kill-Switch Rate', analysis.killSwitchRate],
    [],
    ['--- DRIFT FLAGS ---'],
    ['Category', 'Position', 'Observed', 'Theoretical', 'Drift', 'Level'],
    ...(analysis.driftFlags || []).map(f => [f.category, f.position, f.obs, f.theo, f.drift, f.level.toUpperCase()]),
    [],
    ['--- EXPLOIT CANDIDATES ---'],
    ['Position', 'Observed Freq', 'Theoretical Freq', 'Over Frequency', 'Severity'],
    ...(analysis.exploitCandidates || []).map(e => [e.position, e.observedFreq, e.theoreticalFreq, e.overFrequency, e.severity]),
    [],
    ['--- RECOMMENDATIONS ---'],
    ...(analysis.recommendations || []).map(r => [r]),
    [],
    ['--- TOP BET POSITIONS (Player Patterns) ---'],
    ['Position', 'Usage Rate'],
    ...(analysis.topBetPositions || []).map(b => [b.position, b.usageRate]),
    [],
    ['--- HAND WIN FREQUENCIES ---'],
    ['Hand', 'Observed', 'Theoretical', 'Level'],
    ...(analysis.handDrift || []).map(h => [h.name, h.obs, h.theo, h.level]),
  ];
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function buildRoundCSV(rounds) {
  const rows = [
    ['Round #', 'Session ID', 'Winner Hand IDs', 'Winning Rank', 'Winning Colors', 'Low/High',
     'Board Win', 'Kill Switch', 'Hand Bet Count', 'Total Bet', 'Total Payout', 'Net Result',
     'Balance Before', 'Balance After', 'Reds', 'Blacks', 'River Card', 'Community Cards'],
    ...rounds.map(r => [
      r.round_number, r.session_id,
      (r.winner_hand_ids || []).join(' | '),
      r.winning_rank || '',
      (r.winning_colors || []).join(' | '),
      r.winning_low_high || '',
      r.is_board_win ? 'YES' : 'NO',
      r.kill_switch_active ? 'YES' : 'NO',
      r.hand_bet_count || 0,
      r.total_bet || 0,
      r.total_payout || 0,
      r.net_result || 0,
      r.balance_before || 0,
      r.balance_after || 0,
      r.reds_count || 0,
      r.blacks_count || 0,
      r.river_card || '',
      (r.community_cards || []).join(' '),
    ])
  ];
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
}

// ─────────────────────────────────────────────────────────────
export default function Observer({ onClose, roundData }) {
  const [observeOn, setObserveOn]         = useState(false);
  const [securityOn, setSecurityOn]       = useState(false);
  const [roundCount, setRoundCount]       = useState(0);
  const [analysis, setAnalysis]           = useState(null);
  const [analyzing, setAnalyzing]         = useState(false);
  const [clearing, setClearing]           = useState(false);
  const [exporting, setExporting]         = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [chatHistory, setChatHistory]     = useState([
    { role: 'observer', text: "I'm watching. Turn on OBSERVE to start collecting live round data. I need 250 rounds before Security mode unlocks." }
  ]);
  const [chatInput, setChatInput]         = useState('');
  const [chatLoading, setChatLoading]     = useState(false);
  const [expandDrift, setExpandDrift]     = useState(false);
  const [expandExploit, setExpandExploit] = useState(false);
  const [tab, setTab]                     = useState('security');
  const chatEndRef                        = useRef(null);
  const prevRoundRef                      = useRef(null);

  // Load round count on mount
  useEffect(() => {
    base44.functions.invoke('observerAnalysis', { action: 'status' })
      .then(res => setRoundCount(res?.data?.roundsLoaded || 0))
      .catch(() => {});
  }, []);

  // Record each new settled round
  useEffect(() => {
    if (!observeOn || !roundData) return;
    if (prevRoundRef.current?.roundId === roundData.roundId) return;
    prevRoundRef.current = roundData;

    base44.entities.ObserverRound.create({
      session_id: roundData.sessionId || 'live',
      round_number: roundData.roundId,
      community_cards: roundData.communityCards?.map(c => c?.rank + c?.suit) || [],
      winner_hand_ids: roundData.winnerHandIds || [],
      winning_rank: roundData.winningRank || null,
      winning_colors: roundData.winningColors || [],
      winning_low_high: roundData.winningLowHigh || null,
      is_board_win: roundData.isBoardWin || false,
      hand_bets: roundData.handBets || {},
      rank_bets: roundData.rankBets || {},
      color_bets: roundData.colorBets || {},
      low_high_bet: roundData.lowHighBet || null,
      kill_switch_active: roundData.killSwitchActive || false,
      hand_bet_count: roundData.handBetCount || 0,
      total_bet: roundData.totalBet || 0,
      total_payout: roundData.totalPayout || 0,
      net_result: roundData.netResult || 0,
      balance_before: roundData.balanceBefore || 0,
      balance_after: roundData.balanceAfter || 0,
      reds_count: roundData.redsCount || 0,
      blacks_count: roundData.blacksCount || 0,
      river_card: roundData.riverCard || null,
    }).then(() => setRoundCount(prev => prev + 1)).catch(console.error);
  }, [roundData, observeOn]);

  // Scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  // Run security analysis
  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      const res = await base44.functions.invoke('observerAnalysis', { action: 'analyze' });
      setAnalysis(res?.data || null);
      if (res?.data?.recommendations?.length) {
        setChatHistory(prev => [...prev, {
          role: 'observer',
          text: `🔍 Security scan complete — ${res.data.roundsAnalyzed} rounds analyzed.\n\n` + res.data.recommendations.join('\n')
        }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'observer', text: 'Analysis failed: ' + (err.message || 'Unknown error') }]);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => { if (securityOn && roundCount >= 250) runAnalysis(); }, [securityOn]);

  // Chat
  const sendChat = useCallback(async () => {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: q }]);
    setChatLoading(true);
    try {
      const res = await base44.functions.invoke('observerAnalysis', { action: 'ask', question: q });
      setChatHistory(prev => [...prev, { role: 'observer', text: res?.data?.partnerAnswer || res?.data?.error || 'No response.' }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'observer', text: 'Error: ' + (err.message || 'Failed') }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading]);

  // ── EXPORT REPORT (CSV summary + raw rounds) ─────────────────
  const exportReport = useCallback(async (format) => {
    setExporting(true);
    try {
      const ts = new Date().toISOString().slice(0,10);

      if (format === 'summary-csv') {
        if (!analysis) { alert('Run analysis first before exporting the report.'); setExporting(false); return; }
        const csv = buildCSVSummary(analysis);
        downloadBlob(new Blob([csv], { type: 'text/csv' }), `Observer_SecurityReport_${ts}.csv`);
      }

      if (format === 'rounds-csv') {
        // Fetch all rounds from backend
        const res = await base44.functions.invoke('observerAnalysis', { action: 'export' });
        const rounds = res?.data?.rawRounds || [];
        if (!rounds.length) { alert('No round data to export.'); setExporting(false); return; }
        const csv = buildRoundCSV(rounds);
        downloadBlob(new Blob([csv], { type: 'text/csv' }), `Observer_RawRounds_${ts}.csv`);
      }

      if (format === 'json') {
        const res = await base44.functions.invoke('observerAnalysis', { action: 'export' });
        const rounds = res?.data?.rawRounds || [];
        const payload = {
          exported_at: new Date().toISOString(),
          rounds_count: rounds.length,
          analysis: analysis || null,
          rounds,
        };
        downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `Observer_FullData_${ts}.json`);
      }
    } catch (err) {
      alert('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  }, [analysis]);

  // ── CLEAR DATA ────────────────────────────────────────────────
  const clearData = useCallback(async () => {
    setClearing(true);
    setShowConfirmClear(false);
    try {
      const res = await base44.functions.invoke('observerAnalysis', { action: 'clearRounds' });
      const deleted = res?.data?.deleted || 0;
      setRoundCount(0);
      setAnalysis(null);
      setChatHistory(prev => [...prev, {
        role: 'observer',
        text: `🗑 Cleared ${deleted} rounds from the database. Starting fresh.`
      }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'observer', text: 'Clear failed: ' + (err.message || 'Unknown error') }]);
    } finally {
      setClearing(false);
    }
  }, []);

  const progressPct = Math.min(100, (roundCount / 250) * 100);
  const isReady = roundCount >= 250;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-slate-900 border border-cyan-700/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/80"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-700/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${observeOn ? 'bg-cyan-900/60 border-cyan-600/60' : 'bg-slate-800 border-slate-700'}`}>
              {observeOn ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Observer</h2>
              <p className="text-cyan-400/60 text-xs">Live game intelligence — watch, learn, protect</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Control strip */}
        <div className="flex items-center gap-5 px-5 py-3 border-b border-slate-800 flex-shrink-0 flex-wrap gap-y-2">
          <Toggle on={observeOn} onToggle={() => setObserveOn(v => !v)} color="blue" label="OBSERVE" />
          <Toggle
            on={securityOn} onToggle={() => setSecurityOn(v => !v)} color="red" disabled={!isReady}
            label={isReady ? 'SECURITY' : `SECURITY (${250 - roundCount} more rounds)`}
          />
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-xs font-bold ${observeOn ? 'text-cyan-400' : 'text-gray-600'}`}>
              {observeOn ? '● LIVE' : '○ OFF'}
            </span>
          </div>
        </div>

        {/* Progress + actions bar */}
        <div className="px-5 py-3 border-b border-slate-800 flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Rounds Observed</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${isReady ? 'text-green-400' : 'text-cyan-400'}`}>
                {roundCount.toLocaleString()} {isReady ? '✓ Ready' : '/ 250 min'}
              </span>
              {/* Clear button */}
              <button
                onClick={() => setShowConfirmClear(true)}
                disabled={clearing || roundCount === 0}
                title="Clear all observed rounds"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-red-900/30 border border-slate-700 hover:border-red-700/50 text-gray-500 hover:text-red-400 transition-all text-[10px] font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {clearing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Clear
              </button>
            </div>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isReady ? 'bg-green-500' : 'bg-cyan-500'}`}
              initial={{ width: 0 }} animate={{ width: progressPct + '%' }} transition={{ duration: 0.5 }}
            />
          </div>
          {observeOn && <p className="text-[10px] text-cyan-500/70">● Observing — play rounds to accumulate data</p>}
        </div>

        {/* Confirm clear dialog */}
        <AnimatePresence>
          {showConfirmClear && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mx-5 mt-3 rounded-xl border border-red-700/50 bg-red-900/20 p-4 flex-shrink-0">
              <p className="text-red-300 text-xs font-semibold mb-3">
                ⚠️ Delete all {roundCount.toLocaleString()} observed rounds? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={clearData} className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold transition-all">
                  Yes, clear all data
                </button>
                <button onClick={() => setShowConfirmClear(false)} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-semibold transition-all">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 flex-shrink-0">
          {['security', 'chat'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${tab===t?'text-cyan-300 border-b-2 border-cyan-500':'text-gray-500 hover:text-gray-300'}`}>
              {t === 'security' ? '🛡 Security' : '💬 Partner Assist'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── SECURITY TAB ────────────────────────────────── */}
          {tab === 'security' && (
            <div className="p-5 space-y-4">
              {/* Run + Export row */}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={runAnalysis} disabled={analyzing || roundCount < 50}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all">
                  {analyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {analyzing ? 'Analyzing…' : 'Run Analysis'}
                </button>

                {/* Export dropdown */}
                {roundCount >= 50 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-600">Export:</span>
                    <button onClick={() => exportReport('summary-csv')} disabled={exporting || !analysis} title="Export security report as CSV"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-900/30 border border-slate-700 hover:border-emerald-700/50 text-gray-400 hover:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[10px] font-semibold">
                      <FileText className="w-3 h-3" /> Report CSV
                    </button>
                    <button onClick={() => exportReport('rounds-csv')} disabled={exporting} title="Export all raw rounds as CSV"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-900/30 border border-slate-700 hover:border-emerald-700/50 text-gray-400 hover:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[10px] font-semibold">
                      <Download className="w-3 h-3" /> Rounds CSV
                    </button>
                    <button onClick={() => exportReport('json')} disabled={exporting} title="Export full dataset as JSON"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-900/30 border border-slate-700 hover:border-blue-700/50 text-gray-400 hover:text-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[10px] font-semibold">
                      <FileJson className="w-3 h-3" /> Full JSON
                    </button>
                    {exporting && <RefreshCw className="w-3 h-3 text-gray-500 animate-spin" />}
                  </div>
                )}
              </div>

              {!analysis && !analyzing && (
                <div className="text-center py-8 text-gray-600 text-sm">
                  {roundCount < 50 ? `Observe ${50 - roundCount} more rounds to unlock analysis.` : `Click Run Analysis to scan ${roundCount} observed rounds.`}
                </div>
              )}

              {analysis && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">

                  {/* Summary stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Rounds', value: analysis.roundsAnalyzed?.toLocaleString() },
                      { label: 'Observed RTP', value: analysis.observedRTP !== null ? analysis.observedRTP + '%' : '—' },
                      { label: 'Kill-Switch Rate', value: analysis.killSwitchRate },
                      { label: 'Drift Flags', value: analysis.driftFlags?.length || 0, warn: analysis.driftFlags?.length > 0 },
                    ].map(s => (
                      <div key={s.label} className={`rounded-lg p-2.5 border ${s.warn ? 'bg-red-900/15 border-red-800/40' : 'bg-slate-800/60 border-slate-700/40'}`}>
                        <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">{s.label}</div>
                        <div className={`text-base font-bold ${s.warn ? 'text-red-400' : 'text-white'}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  {analysis.recommendations?.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Recommendations</div>
                      {analysis.recommendations.map((r, i) => (
                        <div key={i} className={`rounded-lg px-3 py-2 text-xs border ${
                          r.includes('CRITICAL') ? 'bg-red-900/15 border-red-800/40 text-red-300'
                          : r.includes('WARNING') ? 'bg-yellow-900/15 border-yellow-800/40 text-yellow-300'
                          : r.includes('exploit') || r.includes('candidate') ? 'bg-orange-900/15 border-orange-800/40 text-orange-300'
                          : 'bg-green-900/10 border-green-800/30 text-green-400'}`}>
                          {r}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Drift flags */}
                  {analysis.driftFlags?.length > 0 && (
                    <div>
                      <button onClick={() => setExpandDrift(v => !v)}
                        className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider w-full mb-1.5">
                        {expandDrift ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        Drift Flags ({analysis.driftFlags.length})
                      </button>
                      <AnimatePresence>
                        {expandDrift && (
                          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden space-y-1">
                            {analysis.driftFlags.map((f, i) => (
                              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/30 text-xs">
                                <DriftBadge level={f.level} />
                                <span className="text-gray-300 flex-1">{f.position}</span>
                                <span className="text-gray-400">{f.obs}</span>
                                <span className="text-gray-600 text-[10px]">vs {f.theo}</span>
                                <span className={`font-bold text-[10px] ${f.level==='critical'?'text-red-400':'text-yellow-400'}`}>{f.drift}</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Exploit candidates */}
                  {analysis.exploitCandidates?.length > 0 && (
                    <div>
                      <button onClick={() => setExpandExploit(v => !v)}
                        className="flex items-center gap-2 text-[10px] text-orange-500 uppercase tracking-wider w-full mb-1.5">
                        {expandExploit ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        ⚠️ Exploit Candidates ({analysis.exploitCandidates.length})
                      </button>
                      <AnimatePresence>
                        {expandExploit && (
                          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden space-y-1">
                            {analysis.exploitCandidates.map((e, i) => (
                              <div key={i} className="px-3 py-2 rounded-lg bg-orange-900/15 border border-orange-800/40 text-xs">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${e.severity==='HIGH'?'bg-red-900/60 text-red-300':'bg-orange-900/60 text-orange-300'}`}>{e.severity}</span>
                                  <span className="text-orange-200 font-semibold">{e.position}</span>
                                </div>
                                <div className="text-gray-400">
                                  Observed: <span className="text-white">{e.observedFreq}</span> · Expected: <span className="text-white">{e.theoreticalFreq}</span> · Over by: <span className="text-orange-400 font-bold">{e.overFrequency}</span>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Top bet positions */}
                  {analysis.topBetPositions?.length > 0 && (
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Most Bet Positions (Player Patterns)</div>
                      <div className="space-y-1">
                        {analysis.topBetPositions.map((b, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-slate-800/40">
                            <span className="text-gray-500 w-4 text-[10px]">#{i+1}</span>
                            <span className="text-gray-300 flex-1">{b.position}</span>
                            <span className="text-cyan-400 font-semibold">{b.usageRate}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* ── CHAT TAB ─────────────────────────────────────── */}
          {tab === 'chat' && (
            <div className="flex flex-col" style={{ minHeight: 300 }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ maxHeight: 400 }}>
                {chatHistory.map((m, i) => <ChatMsg key={i} role={m.role} text={m.text} />)}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 border border-slate-700/40 rounded-xl px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Thinking…
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="border-t border-slate-800 p-3 flex gap-2 flex-shrink-0">
                <input
                  value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                  placeholder={roundCount < 50 ? 'Need 50+ rounds to ask questions…' : 'Ask about RTP, exploits, payouts, kill-switch…'}
                  disabled={roundCount < 50 || chatLoading}
                  className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-cyan-600 disabled:opacity-40"
                />
                <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading || roundCount < 50}
                  className="px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
