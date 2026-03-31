import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Play, RefreshCw, FileDown, Presentation, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';

const RANK_COLS  = ['Royal Flush','Straight Flush','4 Of A Kind','Full House','Flush','Straight','3 Of A Kind','2 Pair','1 Pair'];
const COLOR_COLS = ['3R','4R','5R','3B','4B','5B'];
const HAND_LABELS = [
  {id:'A',label:'A / 10'},
  {id:'B',label:'A / 5'},
  {id:'C',label:'K / K'},
  {id:'D',label:'Q / J'},
  {id:'E',label:'Q / 10'},
  {id:'F',label:'J / 9'},
  {id:'G',label:'8 / 6'},
  {id:'H',label:'7 / 7'},
  {id:'I',label:'4 / 2'},
  {id:'J',label:'3 / 3'},
];
const TOTAL_DEALS = 201376;
const BATCH_SIZE  = 1000;

function emptyRankMatrix()  { return Object.fromEntries(RANK_COLS.map(k=>[k,0])); }
function emptyColorMatrix() { return Object.fromEntries(COLOR_COLS.map(k=>[k,0])); }

function initState() {
  return {
    handRankMatrix:  HAND_LABELS.map(()=>emptyRankMatrix()),
    handColorMatrix: HAND_LABELS.map(()=>emptyColorMatrix()),
    handWinCount:    new Array(HAND_LABELS.length).fill(0),
    rankTotals:      emptyRankMatrix(),
    colorTotals:     emptyColorMatrix(),
    allRows:         [],
  };
}

function mergeTally(state, tally) {
  const s = state;
  HAND_LABELS.forEach((_, i) => {
    RANK_COLS.forEach(k  => { s.handRankMatrix[i][k]  += tally.handRankMatrix[i][k]; });
    COLOR_COLS.forEach(k => { s.handColorMatrix[i][k] += tally.handColorMatrix[i][k]; });
    s.handWinCount[i] += tally.handWinCount[i];
  });
  RANK_COLS.forEach(k  => { s.rankTotals[k]  += tally.rankTotals[k]; });
  COLOR_COLS.forEach(k => { s.colorTotals[k] += tally.colorTotals[k]; });
}

// ── Excel export ─────────────────────────────────────────────────────────
function buildExcelCSV(rows) {
  const headers = [
    'Card 1 Rank','Card 1 Suit',
    'Card 2 Rank','Card 2 Suit',
    'Card 3 Rank','Card 3 Suit',
    'Card 4 Rank','Card 4 Suit',
    'Card 5 Rank','Card 5 Suit',
    'Winning Hand','Hand Rank',
    ...COLOR_COLS,
    ...HAND_LABELS.map(h=>`${h.id}(${h.label})`),
    'ALL HANDS',
  ];
  const esc = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const lines = [headers.map(esc).join(',')];
  for (const r of rows) {
    lines.push([
      r.c1r, r.c1s, r.c2r, r.c2s, r.c3r, r.c3s, r.c4r, r.c4s, r.c5r, r.c5s,
      r.winningHand, r.handRank,
      ...COLOR_COLS.map(k=>r[k]||0),
      ...HAND_LABELS.map(h=>r[`${h.id}(${h.label})`]||0),
      r['ALL HANDS']||1,
    ].map(esc).join(','));
  }
  return lines.join('\r\n');
}

function downloadCSV(content, filename) {
  const blob = new Blob(['\ufeff'+content], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── PowerPoint-style HTML → .doc export ──────────────────────────────────
function buildMatrixDoc(state) {
  const { handRankMatrix, handColorMatrix, handWinCount, rankTotals, colorTotals } = state;
  const td = (v, bold=true, color='#000', bg='#fff') =>
    `<td style="border:1px solid #aaa;padding:3px 7px;font-weight:${bold?'bold':'normal'};color:${color};background:${bg};font-size:8.5pt;">${v}</td>`;
  const th = (v, bg='#2c3e6b', color='#fff') =>
    `<th style="border:1px solid #888;padding:4px 7px;background:${bg};color:${color};font-size:8.5pt;">${v}</th>`;

  const buildRankTable = (data, title, isPct) => {
    const rows = HAND_LABELS.map((h,i) => {
      const m = data[i];
      const total = isPct ? (handWinCount[i]/TOTAL_DEALS*100).toFixed(4) : handWinCount[i];
      return `<tr>
        ${td(`${h.id}(${h.label})`)}
        ${RANK_COLS.map(k=>{
          const v = isPct ? (m[k]/TOTAL_DEALS*100).toFixed(4)+'%' : m[k];
          return td(v, false);
        }).join('')}
        ${td(isPct ? (handWinCount[i]/TOTAL_DEALS*100).toFixed(4)+'%' : handWinCount[i], true, '#004080')}
      </tr>`;
    }).join('');
    const allRow = `<tr style="background:#f0f4ff;">
      ${td('All Hands', true, '#000', '#f0f4ff')}
      ${RANK_COLS.map(k=>{
        const v = isPct ? (rankTotals[k]/TOTAL_DEALS*100).toFixed(4)+'%' : rankTotals[k];
        return td(v, false, '#333', '#f0f4ff');
      }).join('')}
      ${td(isPct ? '100.0000%' : TOTAL_DEALS, true, '#004080', '#f0f4ff')}
    </tr>`;
    const totRow = `<tr style="background:#e8edff;">
      ${td('Totals', true, '#000', '#e8edff')}
      ${RANK_COLS.map(k=>{
        const v = isPct ? (rankTotals[k]/TOTAL_DEALS*100).toFixed(4)+'%' : rankTotals[k];
        return td(v, true, '#004080', '#e8edff');
      }).join('')}
      ${td(isPct ? '100.0000%' : TOTAL_DEALS, true, '#004080', '#e8edff')}
    </tr>`;
    return `<h3 style="color:#1a3a7c;margin-top:20px;">${title}</h3>
    <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;">
      <thead><tr>${th('Hand')}${RANK_COLS.map(k=>th(k)).join('')}${th('Totals')}</tr></thead>
      <tbody>${rows}${allRow}${totRow}</tbody>
    </table>`;
  };

  const buildColorTable = (data, title, isPct) => {
    const rows = HAND_LABELS.map((h,i) => {
      const m = data[i];
      const rowTotal = COLOR_COLS.reduce((s,k)=>s+m[k],0);
      const rowTotalDisp = isPct ? (rowTotal/TOTAL_DEALS*100).toFixed(4)+'%' : rowTotal;
      return `<tr>
        ${td(`${h.id}(${h.label})`)}
        ${COLOR_COLS.map(k=>{
          const v = isPct ? (m[k]/TOTAL_DEALS*100).toFixed(4)+'%' : m[k];
          return td(v, false, k.includes('R')?'#990000':'#003399');
        }).join('')}
        ${td(rowTotalDisp, true, '#004080')}
      </tr>`;
    }).join('');
    const colorGrandTotal = COLOR_COLS.reduce((s,k)=>s+colorTotals[k],0);
    const allRow = `<tr style="background:#fff8e8;">
      ${td('All Hands', true, '#000', '#fff8e8')}
      ${COLOR_COLS.map(k=>{
        const v = isPct ? (colorTotals[k]/TOTAL_DEALS*100).toFixed(4)+'%' : colorTotals[k];
        return td(v, false, k.includes('R')?'#990000':'#003399', '#fff8e8');
      }).join('')}
      ${td(isPct ? (colorGrandTotal/TOTAL_DEALS*100).toFixed(4)+'%' : colorGrandTotal, true, '#004080', '#fff8e8')}
    </tr>`;
    const totRow = `<tr style="background:#ffe8cc;">
      ${td('Totals', true, '#000', '#ffe8cc')}
      ${COLOR_COLS.map(k=>{
        const v = isPct ? (colorTotals[k]/TOTAL_DEALS*100).toFixed(4)+'%' : colorTotals[k];
        return td(v, true, k.includes('R')?'#990000':'#003399', '#ffe8cc')}
      ).join('')}
      ${td(isPct ? (colorGrandTotal/TOTAL_DEALS*100).toFixed(4)+'%' : colorGrandTotal, true, '#004080', '#ffe8cc')}
    </tr>`;
    return `<h3 style="color:#1a3a7c;margin-top:20px;">${title}</h3>
    <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;">
      <thead><tr>${th('Hand')}${COLOR_COLS.map(k=>th(k, k.includes('R')?'#8b0000':'#003070')).join('')}${th('Totals')}</tr></thead>
      <tbody>${rows}${allRow}${totRow}</tbody>
    </table>`;
  };

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office">
  <head><meta charset="utf-8"><title>Hands Matrix</title></head>
  <body style="font-family:Arial,sans-serif;margin:20px;">
    <div style="background:#1a3a7c;color:white;padding:16px 20px;border-radius:6px;margin-bottom:20px;">
      <h1 style="margin:0;font-size:18pt;">Rapid Fire Texas 10 — Hands Matrix</h1>
      <p style="margin:6px 0 0;font-size:9pt;opacity:0.8;">Total Deals: ${TOTAL_DEALS.toLocaleString()} | Generated: ${new Date().toLocaleString()}</p>
    </div>
    <h2 style="color:#1a3a7c;border-bottom:2px solid #1a3a7c;padding-bottom:4px;">Hand Rank Matrix</h2>
    ${buildRankTable(handRankMatrix, 'Counts — Winning Hand vs Hand Rank', false)}
    ${buildRankTable(handRankMatrix, 'Percentages — Winning Hand vs Hand Rank', true)}
    <div style="page-break-before:always;"></div>
    <h2 style="color:#7c2200;border-bottom:2px solid #7c2200;padding-bottom:4px;margin-top:20px;">Color Board Matrix</h2>
    ${buildColorTable(handColorMatrix, 'Counts — Winning Hand vs Color Board', false)}
    ${buildColorTable(handColorMatrix, 'Percentages — Winning Hand vs Color Board', true)}
  </body></html>`;

  const blob = new Blob(['\ufeff', html], { type:'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'Hands Matrix.doc'; a.click();
  URL.revokeObjectURL(url);
}

// ── Summary table component ───────────────────────────────────────────────
function MatrixTable({ title, rowLabels, colLabels, data, totals, grandTotal, isPct, accent }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={()=>setOpen(o=>!o)}
        className="w-full flex items-center justify-between px-5 py-3 border-b border-slate-700"
      >
        <span className={`font-bold text-sm ${accent}`}>{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-900/60 text-gray-300 border-b border-slate-600">
                <th className="px-3 py-2 text-left font-bold">Hand</th>
                {colLabels.map(c=><th key={c} className="px-3 py-2 text-right font-bold">{c}</th>)}
                <th className="px-3 py-2 text-right font-bold text-blue-300">Total</th>
              </tr>
            </thead>
            <tbody>
              {rowLabels.map((hand, i) => {
                const m = data[i];
                const rowTotal = isPct
                  ? (Object.values(m).filter(v=>typeof v==='number').length > 0 ? null : 0)
                  : colLabels.reduce((s,k)=>s+(m[k]||0),0);
                const rowTotalDisp = isPct
                  ? colLabels.reduce((s,k)=>s+(m[k]||0),0).toFixed(2)+'%'
                  : colLabels.reduce((s,k)=>s+(m[k]||0),0);
                return (
                  <tr key={hand.id} className="border-b border-slate-700/40 hover:bg-slate-700/20">
                    <td className="px-3 py-1.5 font-semibold text-white whitespace-nowrap">{hand.id}({hand.label})</td>
                    {colLabels.map(k=>(
                      <td key={k} className="px-3 py-1.5 text-right text-gray-300">
                        {isPct ? (m[k]||0).toFixed(2)+'%' : (m[k]||0)}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right font-bold text-blue-300">{rowTotalDisp}</td>
                  </tr>
                );
              })}
              {/* All Hands */}
              <tr className="border-b border-slate-600 bg-slate-700/30">
                <td className="px-3 py-1.5 font-bold text-yellow-300">All Hands</td>
                {colLabels.map(k=>(
                  <td key={k} className="px-3 py-1.5 text-right text-gray-200">
                    {isPct ? (totals[k]||0).toFixed(2)+'%' : (totals[k]||0)}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-right font-bold text-yellow-300">
                  {isPct ? colLabels.reduce((s,k)=>s+(totals[k]||0),0).toFixed(2)+'%' : grandTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function GameStats() {
  const [running, setRunning]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [state, setState]         = useState(null);
  const [error, setError]         = useState(null);
  const abortRef                  = useRef(false);

  const pct = Math.round((progress / TOTAL_DEALS) * 100);
  const done = state && progress >= TOTAL_DEALS;

  const run = async () => {
    setRunning(true);
    setError(null);
    setProgress(0);
    abortRef.current = false;
    const s = initState();
    let batchStart = 0;

    while (batchStart < TOTAL_DEALS) {
      if (abortRef.current) break;
      try {
        const res = await base44.functions.invoke('gameStatsCompute', { batchStart, batchSize: BATCH_SIZE });
        const d = res.data;
        if (!d.success) { setError('Function error'); break; }
        mergeTally(s, d.tally);
        s.allRows.push(...d.rows);
        batchStart = d.batchEnd;
        setProgress(batchStart);
        // Update UI incrementally
        setState({ ...s, handRankMatrix: s.handRankMatrix.map(m=>({...m})), handColorMatrix: s.handColorMatrix.map(m=>({...m})), handWinCount: [...s.handWinCount], rankTotals: {...s.rankTotals}, colorTotals: {...s.colorTotals}, allRows: [...s.allRows] });
      } catch(e) {
        setError(e.message);
        break;
      }
    }
    setRunning(false);
  };

  const exportExcel = () => {
    if (!state?.allRows?.length) return;
    const csv = buildExcelCSV(state.allRows);
    downloadCSV(csv, 'Hands In Play Identification.csv');
  };

  const exportMatrix = () => {
    if (!state) return;
    buildMatrixDoc(state);
  };

  // Build display matrices with percentages
  const rankCountMatrix  = state ? state.handRankMatrix  : null;
  const colorCountMatrix = state ? state.handColorMatrix : null;
  const rankPctMatrix    = state ? state.handRankMatrix.map((m, i) =>
    Object.fromEntries(RANK_COLS.map(k=>[k, state.handWinCount[i]>0?(m[k]/TOTAL_DEALS*100):0]))
  ) : null;
  const colorPctMatrix   = state ? state.handColorMatrix.map((m, i) =>
    Object.fromEntries(COLOR_COLS.map(k=>[k, (m[k]/TOTAL_DEALS*100)]))
  ) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4 pb-16">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm mb-3 inline-block">← Back to Game</Link>
          <div className="flex items-center gap-3 mb-1">
            <BarChart2 className="w-8 h-8 text-yellow-400" />
            <h1 className="text-3xl font-bold">Game Stats</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Complete enumeration of all {TOTAL_DEALS.toLocaleString()} possible 5-card community deal combinations from the 32-card deck.
            Identifies winning hand, hand rank, and color board outcome for every deal.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={run}
              disabled={running}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-gray-500 font-bold text-sm transition-all"
            >
              {running ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4"/>}
              {running ? 'Computing...' : done ? 'Re-Run Computation' : 'Run Full Computation'}
            </button>

            {running && (
              <button
                onClick={()=>{ abortRef.current = true; }}
                className="text-red-400 border border-red-700 px-4 py-2 rounded-lg text-sm hover:bg-red-900/20"
              >
                Abort
              </button>
            )}

            {done && (
              <>
                <button
                  onClick={exportExcel}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-green-600 text-green-300 hover:bg-green-900/30 font-bold text-sm transition-all"
                >
                  <FileDown className="w-4 h-4"/> Export Excel — Hands In Play Identification
                </button>
                <button
                  onClick={exportMatrix}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-purple-600 text-purple-300 hover:bg-purple-900/30 font-bold text-sm transition-all"
                >
                  <Presentation className="w-4 h-4"/> Export Word — Hands Matrix
                </button>
              </>
            )}
          </div>

          {/* Progress */}
          {(running || done) && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{done ? `✓ Complete — ${TOTAL_DEALS.toLocaleString()} deals computed` : `Computing batch... ${progress.toLocaleString()} / ${TOTAL_DEALS.toLocaleString()} deals`}</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <motion.div
                  className={`h-2 rounded-full ${done ? 'bg-yellow-500' : 'bg-green-500'}`}
                  animate={{ width: `${pct}%` }}
                  transition={{ ease:'linear', duration:0.3 }}
                />
              </div>
            </div>
          )}

          {error && <p className="mt-3 text-red-400 text-sm">Error: {error}</p>}
        </div>

        {/* Summary stats */}
        {state && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {HAND_LABELS.map((h,i)=>(
              <div key={h.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
                <p className="text-yellow-400 font-bold text-sm">{h.id}({h.label})</p>
                <p className="text-2xl font-black text-white">{state.handWinCount[i].toLocaleString()}</p>
                <p className="text-gray-400 text-xs">{((state.handWinCount[i]/TOTAL_DEALS)*100).toFixed(2)}% wins</p>
              </div>
            ))}
          </div>
        )}

        {/* Rank Matrices */}
        {state && (
          <div className="space-y-4">
            <MatrixTable
              title="Hand Rank Matrix — Counts (Winning Hand vs Hand Rank)"
              rowLabels={HAND_LABELS}
              colLabels={RANK_COLS}
              data={rankCountMatrix}
              totals={state.rankTotals}
              grandTotal={TOTAL_DEALS}
              isPct={false}
              accent="text-purple-400"
            />
            <MatrixTable
              title="Hand Rank Matrix — Percentages (% of total deals)"
              rowLabels={HAND_LABELS}
              colLabels={RANK_COLS}
              data={rankPctMatrix}
              totals={Object.fromEntries(RANK_COLS.map(k=>[k,(state.rankTotals[k]/TOTAL_DEALS*100)]))}
              grandTotal="100%"
              isPct={true}
              accent="text-purple-300"
            />
            <MatrixTable
              title="Color Board Matrix — Counts (Winning Hand vs Color Result)"
              rowLabels={HAND_LABELS}
              colLabels={COLOR_COLS}
              data={colorCountMatrix}
              totals={state.colorTotals}
              grandTotal={COLOR_COLS.reduce((s,k)=>s+state.colorTotals[k],0)}
              isPct={false}
              accent="text-red-400"
            />
            <MatrixTable
              title="Color Board Matrix — Percentages (% of total deals)"
              rowLabels={HAND_LABELS}
              colLabels={COLOR_COLS}
              data={colorPctMatrix}
              totals={Object.fromEntries(COLOR_COLS.map(k=>[k,(state.colorTotals[k]/TOTAL_DEALS*100)]))}
              grandTotal={((COLOR_COLS.reduce((s,k)=>s+state.colorTotals[k],0))/TOTAL_DEALS*100).toFixed(2)+'%'}
              isPct={true}
              accent="text-red-300"
            />
          </div>
        )}
      </div>
    </div>
  );
}