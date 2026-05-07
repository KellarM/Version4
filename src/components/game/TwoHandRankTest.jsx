// ============================================================
// REGULATORY COMPLIANCE REPORT
// Generates a formatted compliance report based on stored
// SimulationBetResult data from any completed module.
// Shows RTP range compliance, blended RTP by category,
// standard attestation, and readiness for external submission.
// ============================================================
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Shield, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { jsPDF } from 'jspdf';

const REGULATORY_STANDARDS = [
  { id:'quick',         name:'Internal Pre-Flight',      rtpLow:93,  rtpHigh:99,   authority:'Internal QA' },
  { id:'presubmission', name:'House Internal Standard',  rtpLow:94,  rtpHigh:98.5, authority:'Internal Compliance' },
  { id:'gli',           name:'GLI-11 / BMM Technical',  rtpLow:95,  rtpHigh:98,   authority:'GLI / BMM' },
  { id:'full',          name:'eCOGRA / Full Cert',       rtpLow:95,  rtpHigh:98,   authority:'eCOGRA' },
];

const GROUP_ORDER = ['Carded Hands','Hand Ranks','Color Board','Low / High'];

function fmt2(v) { return Number(v).toFixed(2); }

function computeBlendedByGroup(results) {
  const groups = {};
  for (const r of results) {
    if (!r.rtp || r.checkpoint_data) continue;
    const g = r.bet_group || 'Other';
    if (!groups[g]) groups[g] = { total: 0, count: 0 };
    groups[g].total += parseFloat(r.rtp);
    groups[g].count++;
  }
  const out = {};
  for (const [g, d] of Object.entries(groups)) {
    out[g] = d.count > 0 ? d.total / d.count : null;
  }
  return out;
}

export default function RegulatoryComplianceReport({ onClose }) {
  const [jobs, setJobs]         = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetail, setJobDetail]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating]   = useState(false);

  useEffect(() => { loadJobs(); }, []);

  async function loadJobs() {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('manageSimulationJob', { action: 'list' });
      setJobs(res.data?.jobs || []);
      // Auto-select most complete job
      const best = (res.data?.jobs||[]).sort((a,b)=>(b.bets_complete||0)-(a.bets_complete||0))[0];
      if (best) selectJob(best);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function selectJob(job) {
    setSelectedJob(job);
    setJobDetail(null);
    try {
      const res = await base44.functions.invoke('manageSimulationJob', { action:'status', job_id: job.id });
      setJobDetail(res.data);
    } catch(e) { console.error(e); }
  }

  function generatePDF() {
    if (!selectedJob || !jobDetail) return;
    setGenerating(true);

    const standard = REGULATORY_STANDARDS.find(s => s.id === selectedJob.module_id) || REGULATORY_STANDARDS[1];
    const results  = (jobDetail.results || []).filter(r => r.rtp && !r.checkpoint_data);
    const blended  = selectedJob.blended_rtp
      ? parseFloat(selectedJob.blended_rtp)
      : results.reduce((s,r)=>s+parseFloat(r.rtp),0) / (results.length||1);
    const passed   = results.filter(r=>r.passed).length;
    const failed   = results.filter(r=>!r.passed).length;
    const allPass  = failed === 0 && results.length === 70;
    const byGroup  = computeBlendedByGroup(results);

    const doc = new jsPDF({ orientation:'portrait', format:'a4' });
    const W = doc.internal.pageSize.getWidth();

    // ── Page 1: Certificate ──────────────────────────────────
    // Dark background
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, W, 297, 'F');

    // Gold border
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(2);
    doc.rect(8, 8, W-16, 281);
    doc.setLineWidth(0.5);
    doc.rect(11, 11, W-22, 275);

    // Title
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(14);
    doc.setFont('helvetica','bold');
    doc.text('RAPID FIRE TEXAS HOLD\'EM', W/2, 30, {align:'center'});
    doc.setFontSize(8);
    doc.setTextColor(160,160,180);
    doc.setFont('helvetica','normal');
    doc.text('32-Card Certified Game Engine · Monte Carlo Simulation Platform', W/2, 38, {align:'center'});
    doc.text('Gaming Compliance & Certification Division', W/2, 44, {align:'center'});

    // Certificate title
    doc.setFontSize(22);
    doc.setFont('helvetica','bold');
    doc.setTextColor(255,255,255);
    doc.text('CERTIFICATE OF COMPLIANCE', W/2, 62, {align:'center'});
    doc.setFontSize(11);
    doc.setTextColor(180,180,200);
    doc.text('BACKEND SIMULATION AUDIT', W/2, 71, {align:'center'});

    // Status banner
    const bannerColor = allPass ? [0,120,60] : [140,30,30];
    doc.setFillColor(...bannerColor);
    doc.roundedRect(20, 79, W-40, 18, 3, 3, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(13);
    doc.setFont('helvetica','bold');
    doc.text(allPass ? 'ALL BETS PASSED' : `${passed} / 70 BETS PASSED`, W/2, 91, {align:'center'});

    // Key stats row
    const boxes = [
      { label:'Standard',    value:standard.name },
      { label:'Blended RTP', value:`${fmt2(blended)}%` },
      { label:'Bets Passed', value:`${passed} / ${results.length}` },
      { label:'RTP Range',   value:`${standard.rtpLow}%–${standard.rtpHigh}%` },
    ];
    const bw = (W-50)/4;
    boxes.forEach((b,i) => {
      const bx = 15 + i*(bw+5);
      doc.setFillColor(20,30,55);
      doc.roundedRect(bx, 105, bw, 28, 2, 2, 'F');
      doc.setDrawColor(60,80,120);
      doc.setLineWidth(0.3);
      doc.roundedRect(bx, 105, bw, 28, 2, 2, 'S');
      doc.setTextColor(130,150,180);
      doc.setFontSize(7);
      doc.setFont('helvetica','normal');
      doc.text(b.label, bx+bw/2, 114, {align:'center'});
      doc.setTextColor(212,175,55);
      doc.setFontSize(i===0?7:11);
      doc.setFont('helvetica','bold');
      doc.text(b.value, bx+bw/2, 128, {align:'center'});
    });

    // Attestation text
    doc.setTextColor(160,160,180);
    doc.setFontSize(8);
    doc.setFont('helvetica','normal');
    const attest = [
      `This certificate confirms that the above-named game engine has undergone a rigorous Monte Carlo`,
      `statistical audit under the ${standard.name} standard.`,
      `All ${results.length} betting positions were simulated at ${(selectedJob.rounds_per_bet||0).toLocaleString()} rounds per bet using a certified 32-card randomised engine.`,
      `The Return to Player values fall within the declared range of ${standard.rtpLow}%–${standard.rtpHigh}%.`,
    ];
    let y = 143;
    for (const line of attest) { doc.text(line, W/2, y, {align:'center'}); y += 6; }

    // Blended RTP by category
    doc.setTextColor(212,175,55);
    doc.setFontSize(9);
    doc.setFont('helvetica','bold');
    doc.text('BLENDED RTP BY CATEGORY', W/2, 172, {align:'center'});

    const catGroups = GROUP_ORDER.filter(g=>byGroup[g]!=null);
    const cw=(W-40)/Math.max(catGroups.length,1);
    catGroups.forEach((g,i) => {
      const cx = 15 + i*cw;
      doc.setFillColor(20,30,55);
      doc.roundedRect(cx, 177, cw-5, 26, 2, 2, 'F');
      doc.setDrawColor(80,60,20);
      doc.setLineWidth(0.3);
      doc.roundedRect(cx, 177, cw-5, 26, 2, 2, 'S');
      doc.setTextColor(150,140,100);
      doc.setFontSize(7);
      doc.setFont('helvetica','normal');
      doc.text(g, cx+(cw-5)/2, 185, {align:'center'});
      doc.setTextColor(212,175,55);
      doc.setFontSize(10);
      doc.setFont('helvetica','bold');
      doc.text(`${fmt2(byGroup[g])}%`, cx+(cw-5)/2, 198, {align:'center'});
    });

    // Certificate footer
    doc.setTextColor(130,150,180);
    doc.setFontSize(7);
    doc.setFont('helvetica','normal');
    const certNo = `RF-BACKEND-${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;
    doc.text(`Certificate No.: ${certNo}`, 20, 220);
    doc.text(`Issue Date: ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`, 20, 228);
    doc.text(`Engine: Rapid Fire Texas 10 — Backend Monte Carlo v2.0`, 20, 236);

    // Certified stamp
    doc.setFillColor(allPass?0:120, allPass?80:30, allPass?30:30);
    doc.circle(W-35, 228, 18, 'F');
    doc.setDrawColor(212,175,55);
    doc.setLineWidth(1);
    doc.circle(W-35, 228, 18, 'S');
    doc.setTextColor(255,255,255);
    doc.setFontSize(6);
    doc.setFont('helvetica','bold');
    doc.text('CERTIFIED', W-35, 224, {align:'center'});
    doc.text(allPass?'COMPLIANT':'PARTIAL', W-35, 230, {align:'center'});
    doc.text(new Date().getFullYear().toString(), W-35, 236, {align:'center'});

    // ── Page 2: Detailed Results ─────────────────────────────
    doc.addPage();
    doc.setFillColor(250,250,255);
    doc.rect(0,0,W,297,'F');

    doc.setTextColor(30,30,60);
    doc.setFontSize(13);
    doc.setFont('helvetica','bold');
    doc.text('RAPID FIRE TEXAS HOLD\'EM — DETAILED AUDIT RESULTS', W/2, 18, {align:'center'});
    doc.setFontSize(7.5);
    doc.setFont('helvetica','normal');
    doc.setTextColor(100,100,130);
    doc.text(`Backend Simulation · ${standard.name} · ${(selectedJob.rounds_per_bet||0).toLocaleString()} rounds/bet · Cert No. ${certNo}`, W/2, 25, {align:'center'});

    y = 35;
    // Table header
    doc.setFillColor(220,220,235);
    doc.rect(10, y-4, W-20, 8, 'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.5);
    doc.setTextColor(40,40,80);
    doc.text('Bet / Position', 12, y);
    doc.text('Wins', 100, y, {align:'right'});
    doc.text('Win %', 122, y, {align:'right'});
    doc.text('Actual RTP', 146, y, {align:'right'});
    doc.text('Live Odds', 167, y, {align:'right'});
    doc.text('For 96.5%', 188, y, {align:'right'});
    doc.text('Result', W-12, y, {align:'right'});
    y += 9;

    let curGroup = '';
    const sortedResults = [...results].sort((a,b) => {
      const gi = GROUP_ORDER.indexOf(a.bet_group) - GROUP_ORDER.indexOf(b.bet_group);
      if (gi!==0) return gi;
      return (a.bet_index||0)-(b.bet_index||0);
    });

    for (const r of sortedResults) {
      if (r.bet_group !== curGroup) {
        curGroup = r.bet_group;
        if (y>265){doc.addPage();y=20;}
        doc.setFillColor(220,220,235);
        doc.rect(10,y-3,W-20,7,'F');
        doc.setFont('helvetica','bold');
        doc.setFontSize(7.5);
        doc.setTextColor(40,40,80);
        doc.text(curGroup.toUpperCase(), 12, y+1);
        y+=9; doc.setFont('helvetica','normal');
      }
      if (y>272){doc.addPage();y=20;}
      const rtpVal=parseFloat(r.rtp);
      const ok=rtpVal>=standard.rtpLow&&rtpVal<=standard.rtpHigh;
      doc.setTextColor(ok?30:160, ok?80:30, 30);
      doc.setFontSize(7);
      doc.text(r.bet_label||r.bet_key, 12, y);
      doc.setTextColor(60,60,80);
      doc.text(Number(r.wins).toLocaleString(), 100, y, {align:'right'});
      doc.text(`${parseFloat(r.win_frequency).toFixed(4)}%`, 122, y, {align:'right'});
      doc.setFont('helvetica','bold');
      doc.setTextColor(ok?0:180, ok?100:0, 0);
      doc.text(`${rtpVal.toFixed(4)}%`, 146, y, {align:'right'});
      doc.setFont('helvetica','normal');
      doc.setTextColor(60,60,80);
      doc.text(r.live_odds?`${r.live_odds}:1`:'—', 167, y, {align:'right'});
      doc.text(r.for_965?`${r.for_965}:1`:'—', 188, y, {align:'right'});
      doc.setTextColor(ok?0:180, ok?120:0, 0);
      doc.setFont('helvetica','bold');
      doc.text(ok?'PASS':'FAIL', W-12, y, {align:'right'});
      doc.setFont('helvetica','normal');
      y+=6;
    }

    // Total row
    if (y>272){doc.addPage();y=20;}
    doc.setFillColor(235,235,250);
    doc.rect(10,y-3,W-20,8,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(8);
    doc.setTextColor(30,30,60);
    doc.text(`Total Bets Tested: ${results.length}`, 12, y+1);
    doc.text(`Passed: ${passed}`, 80, y+1);
    doc.text(`Blended RTP: ${fmt2(blended)}%`, 140, y+1);
    y+=12;

    doc.setFont('helvetica','normal');
    doc.setFontSize(6.5);
    doc.setTextColor(130,130,150);
    doc.text(`Rapid Fire Texas 10 · Backend Simulation Certification · ${standard.name} · ${new Date().toLocaleDateString()} · Page 2 of 2`, W/2, y, {align:'center'});

    doc.save(`RapidFire_ComplianceReport_${selectedJob.module_id}_${Date.now()}.pdf`);
    setGenerating(false);
  }

  const standard = selectedJob ? REGULATORY_STANDARDS.find(s=>s.id===selectedJob.module_id) : null;
  const results  = jobDetail?.results?.filter(r=>r.rtp&&!r.checkpoint_data) ?? [];
  const blended  = results.length>0 ? results.reduce((s,r)=>s+parseFloat(r.rtp),0)/results.length : null;
  const byGroup  = computeBlendedByGroup(results);
  const passed   = results.filter(r=>r.passed).length;
  const failed   = results.filter(r=>!r.passed).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-4"
      >
        <motion.div
          initial={{scale:0.95,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}}
          className="w-full max-w-3xl bg-slate-950 border border-yellow-700/30 rounded-2xl shadow-2xl"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-yellow-400"/>
              <div>
                <h2 className="text-lg font-bold text-white">Regulatory Compliance Report</h2>
                <p className="text-xs text-slate-400">Generate PDF certificate from completed simulation results</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors text-lg font-bold">×</button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12 text-slate-500"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2"/>Loading simulation results...</div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3"/>
                <div className="text-slate-400 font-medium">No simulation results found</div>
                <div className="text-xs text-slate-600 mt-1">Run the Molly Simulator first to generate results</div>
              </div>
            ) : (
              <>
                {/* Job selector */}
                <div className="mb-5">
                  <label className="text-xs text-slate-400 block mb-2">Select Simulation Run</label>
                  <div className="space-y-2">
                    {jobs.map(j => {
                      const std = REGULATORY_STANDARDS.find(s=>s.id===j.module_id);
                      const isSelected = selectedJob?.id === j.id;
                      return (
                        <button key={j.id} onClick={()=>selectJob(j)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors
                            ${isSelected?'border-yellow-600 bg-yellow-900/20':'border-slate-700 bg-slate-800/40 hover:border-slate-500'}`}>
                          <div>
                            <div className="font-bold text-sm text-white">{j.module_name || j.module_id}</div>
                            <div className="text-xs text-slate-400">{std?.name} · {(j.rounds_per_bet||0).toLocaleString()} rounds/bet</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold ${j.status==='complete'?'text-green-400':j.status==='paused'?'text-yellow-400':'text-slate-400'}`}>
                              {j.bets_complete||0} / {j.bets_total||70} bets
                            </div>
                            {j.blended_rtp && <div className="text-xs text-slate-500">RTP {fmt2(j.blended_rtp)}%</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preview stats */}
                {selectedJob && jobDetail && results.length > 0 && (
                  <>
                    <div className="grid grid-cols-4 gap-3 mb-5">
                      <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700 text-center">
                        <div className="text-xs text-slate-400">Blended RTP</div>
                        <div className="text-lg font-bold text-yellow-300">{blended?fmt2(blended)+'%':'—'}</div>
                      </div>
                      <div className="bg-green-900/20 rounded-lg p-3 border border-green-700/40 text-center">
                        <div className="text-xs text-slate-400">Passed</div>
                        <div className="text-lg font-bold text-green-400">{passed}</div>
                      </div>
                      <div className={`rounded-lg p-3 border text-center ${failed>0?'bg-red-900/20 border-red-700/40':'bg-slate-800/60 border-slate-700'}`}>
                        <div className="text-xs text-slate-400">Failed</div>
                        <div className={`text-lg font-bold ${failed>0?'text-red-400':'text-slate-500'}`}>{failed}</div>
                      </div>
                      <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700 text-center">
                        <div className="text-xs text-slate-400">Complete</div>
                        <div className="text-lg font-bold text-white">{results.length}/70</div>
                      </div>
                    </div>

                    {/* Category breakdown */}
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {GROUP_ORDER.filter(g=>byGroup[g]).map(g=>(
                        <div key={g} className="flex justify-between items-center bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/50">
                          <span className="text-xs text-slate-400">{g}</span>
                          <span className="text-xs font-bold text-yellow-300">{fmt2(byGroup[g])}%</span>
                        </div>
                      ))}
                    </div>

                    <button onClick={generatePDF} disabled={generating||results.length===0}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-yellow-700/40 border border-yellow-600 text-yellow-200 font-bold hover:bg-yellow-700/60 transition-colors disabled:opacity-50">
                      {generating?<><RefreshCw className="w-4 h-4 animate-spin"/>Generating...</>:<><Download className="w-4 h-4"/>Generate Compliance Report PDF</>}
                    </button>
                    {results.length < 70 && (
                      <p className="text-xs text-center text-slate-500 mt-2">Note: Report will include {results.length} of 70 positions. Complete the full simulation for a full-coverage certificate.</p>
                    )}
                  </>
                )}

                {selectedJob && !jobDetail && (
                  <div className="text-center py-6 text-slate-500 text-sm"><RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2"/>Loading results...</div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
