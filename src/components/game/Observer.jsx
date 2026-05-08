// ============================================================
// OBSERVER — Live Game Intelligence System
// Phase 1: Silent Observer (accumulates round data to DB)
// Phase 2: Security Agent (drift analysis, exploit detection)
// Phase 3: Partner Assist (conversational tuning advisor)
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck, ShieldOff, X, Play, MessageSquare, Send, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, RefreshCw, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// ── Pill toggle switch ────────────────────────────────────────
function Toggle({ on, onToggle, color = 'blue', disabled = false, label }) {
  const colors = {
    blue:   { track: on ? 'bg-blue-600' : 'bg-slate-700', thumb: 'bg-white' },
    red:    { track: on ? 'bg-red-600'  : 'bg-slate-700', thumb: 'bg-white' },
  };
  const c = colors[color];
  return (
    <button onClick={onToggle} disabled={disabled}
      className={`flex items-center gap-2 group ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${c.track}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow transition-transform duration-200 ${c.thumb} ${on ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">{label}</span>
    </button>
  );
}

// ── Drift flag badge ──────────────────────────────────────────
function DriftBadge({ level }) {
  if (level === 'critical') return <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/50 border border-red-700/50 text-red-300 font-bold">CRITICAL</span>;
  if (level === 'warning')  return <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-900/50 border border-yellow-700/50 text-yellow-300 font-bold">WARNING</span>;
  return <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-900/30 border border-green-800/30 text-green-400 font-bold">OK</span>;
}

// ── Chat message ──────────────────────────────────────────────
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

export default function Observer({ onClose, roundData }) {
  // ── State ────────────────────────────────────────────────────
  const [observeOn, setObserveOn]       = useState(false);
  const [securityOn, setSecurityOn]     = useState(false);
  const [roundCount, setRoundCount]     = useState(0);
  const [analysis, setAnalysis]         = useState(null);
  const [analyzing, setAnalyzing]       = useState(false);
  const [chatHistory, setChatHistory]   = useState([
    { role: 'observer', text: 'I\'m watching. Turn on OBSERVE to start collecting live round data. I need 250 rounds before I can activate Security mode.' }
  ]);
  const [chatInput, setChatInput]       = useState('');
  const [chatLoading, setChatLoading]   = useState(false);
  const [expandDrift, setExpandDrift]   = useState(false);
  const [expandExploit, setExpandExploit] = useState(false);
  const [tab, setTab]                   = useState('security'); // security | chat
  const chatEndRef                      = useRef(null);
  const prevRoundRef                    = useRef(null);

  // ── Load current round count on mount ────────────────────────
  useEffect(() => {
    base44.functions.invoke('observerAnalysis', { action: 'status' })
      .then(res => setRoundCount(res?.data?.roundsLoaded || 0))
      .catch(() => {});
  }, []);

  // ── Watch for new round data and record it ────────────────────
  useEffect(() => {
    if (!observeOn || !roundData) return;
    // roundData changes every settled round — compare by roundId
    if (prevRoundRef.current?.roundId === roundData.roundId) return;
    prevRoundRef.current = roundData;

    // Save to DB
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
    }).then(() => {
      setRoundCount(prev => prev + 1);
    }).catch(console.error);
  }, [roundData, observeOn]);

  // ── Scroll chat to bottom ─────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // ── Run Security Analysis ─────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      const res = await base44.functions.invoke('observerAnalysis', { action: 'analyze' });
      setAnalysis(res?.data || null);
      if (res?.data?.recommendations?.length) {
        setChatHistory(prev => [...prev, {
          role: 'observer',
          text: '🔍 Security scan complete — ' + res.data.roundsAnalyzed + ' rounds analyzed.\n\n' + res.data.recommendations.join('\n')
        }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'observer', text: 'Analysis failed: ' + (err.message || 'Unknown error') }]);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  // Auto-run analysis when security turns on
  useEffect(() => {
    if (securityOn && roundCount >= 250) runAnalysis();
  }, [securityOn]);

  // ── Chat send ─────────────────────────────────────────────────
  const sendChat = useCallback(async () => {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: q }]);
    setChatLoading(true);
    try {
      const res = await base44.functions.invoke('observerAnalysis', { action: 'ask', question: q });
      const answer = res?.data?.partnerAnswer || res?.data?.error || 'No response.';
      setChatHistory(prev => [...prev, { role: 'observer', text: answer }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'observer', text: 'Error: ' + (err.message || 'Failed to get response') }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading]);

  // ── Clear all data ────────────────────────────────────────────
  const clearData = async () => {
    if (!confirm('Clear all ' + roundCount + ' observed rounds? This cannot be undone.')) return;
    // Delete all ObserverRound records — we'll use filter with a broad query
    try {
      // Can't bulk delete easily, so just notify
      setChatHistory(prev => [...prev, { role: 'observer', text: 'To clear data, use the game database management tools. Round count will reset on next load.' }]);
    } catch(e) {}
  };

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
        {/* ── Header ─────────────────────────────────────────── */}
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

        {/* ── Control strip ──────────────────────────────────── */}
        <div className="flex items-center gap-6 px-5 py-3 border-b border-slate-800 flex-shrink-0 flex-wrap gap-y-2">
          <Toggle on={observeOn} onToggle={() => setObserveOn(v => !v)} color="blue" label="OBSERVE" />
          <Toggle
            on={securityOn}
            onToggle={() => setSecurityOn(v => !v)}
            color="red"
            disabled={!isReady}
            label={isReady ? 'SECURITY' : `SECURITY (need ${250 - roundCount} more rounds)`}
          />
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-xs font-bold ${observeOn ? 'text-cyan-400' : 'text-gray-600'}`}>
              {observeOn ? '● LIVE' : '○ OFF'}
            </span>
          </div>
        </div>

        {/* ── Progress bar ───────────────────────────────────── */}
        <div className="px-5 py-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Rounds Observed</span>
            <span className={`text-xs font-bold ${isReady ? 'text-green-400' : 'text-cyan-400'}`}>
              {roundCount.toLocaleString()} {isReady ? '✓ Ready' : `/ 250 min`}
            </span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors ${isReady ? 'bg-green-500' : 'bg-cyan-500'}`}
              initial={{ width: 0 }}
              animate={{ width: progressPct + '%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {observeOn && (
            <p className="text-[10px] text-cyan-500/70 mt-1">
              ● Observing live rounds — play the game to accumulate data
            </p>
          )}
        </div>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div className="flex border-b border-slate-800 flex-shrink-0">
          {['security', 'chat'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${tab===t ? 'text-cyan-300 border-b-2 border-cyan-500' : 'text-gray-500 hover:text-gray-300'}`}>
              {t === 'security' ? '🛡 Security' : '💬 Partner Assist'}
            </button>
          ))}
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* SECURITY TAB */}
          {tab === 'security' && (
            <div className="p-5 space-y-4">
              {/* Run / status */}
              <div className="flex items-center gap-3">
                <button onClick={runAnalysis} disabled={analyzing || roundCount < 50}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all">
                  {analyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {analyzing ? 'Analyzing…' : 'Run Analysis'}
                </button>
                {roundCount < 50 && <span className="text-[10px] text-gray-500">Need at least 50 rounds to analyze</span>}
                {analysis && <span className="text-[10px] text-gray-500">{analysis.roundsAnalyzed} rounds · RTP: {analysis.observedRTP !== null ? analysis.observedRTP + '%' : 'pending'} · House edge: {analysis.houseEdge || 'pending'}</span>}
              </div>

              {!analysis && !analyzing && (
                <div className="text-center py-8 text-gray-600 text-sm">
                  {roundCount < 50 ? `Observe ${50 - roundCount} more rounds to unlock analysis.` : 'Click Run Analysis to scan ' + roundCount + ' observed rounds.'}
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
                        <div key={i} className={`rounded-lg px-3 py-2 text-xs border ${r.startsWith('🔴') ? 'bg-red-900/15 border-red-800/40 text-red-300' : r.startsWith('🟡') ? 'bg-yellow-900/15 border-yellow-800/40 text-yellow-300' : r.startsWith('⚠️') ? 'bg-orange-900/15 border-orange-800/40 text-orange-300' : 'bg-green-900/10 border-green-800/30 text-green-400'}`}>
                          {r}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Drift flags */}
                  {analysis.driftFlags?.length > 0 && (
                    <div>
                      <button onClick={() => setExpandDrift(v => !v)} className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider w-full mb-1.5">
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
                                <span className="text-gray-500">{f.obs}</span>
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
                      <button onClick={() => setExpandExploit(v => !v)} className="flex items-center gap-2 text-[10px] text-orange-500 uppercase tracking-wider w-full mb-1.5">
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
                                <div className="text-gray-400">Observed: <span className="text-white">{e.observedFreq}</span> · Expected: <span className="text-white">{e.theoreticalFreq}</span> · Over by: <span className="text-orange-400 font-bold">{e.overFrequency}</span></div>
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

          {/* CHAT TAB */}
          {tab === 'chat' && (
            <div className="flex flex-col h-full" style={{ minHeight: 300 }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
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
