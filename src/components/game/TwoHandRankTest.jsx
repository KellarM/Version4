import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, X, RefreshCw, SkipForward, FileDown, FileText, Settings2, TrendingUp, TrendingDown
} from 'lucide-react';
import { getSecureRandomBoard, FIXED_HANDS, runUnifiedRound } from '@/lib/gameEngine';
import { CARDED_HAND_PAYOUTS, HAND_RANK_PAYOUTS } from '@/lib/payoutConstants';
import { jsPDF } from 'jspdf';

const STORAGE_KEY = 'twoHandRankTest_state_v2';

const STARTING_BALANCE = 10_000;
const TOTAL_PLAYERS = 10;
const TOTAL_START = STARTING_BALANCE * TOTAL_PLAYERS;

const HAND_OPTIONS = [
  { id: 1,  label: 'Hand 1 — A♦/10♥',  payout: CARDED_HAND_PAYOUTS[0]  },
  { id: 2,  label: 'Hand 2 — K♣/K♠',   payout: CARDED_HAND_PAYOUTS[1]  },
  { id: 3,  label: 'Hand 3 — Q♣/J♠',   payout: CARDED_HAND_PAYOUTS[2]  },
  { id: 4,  label: 'Hand 4 — Q♠/10♠',  payout: CARDED_HAND_PAYOUTS[3]  },
  { id: 5,  label: 'Hand 5 — J♣/9♣',   payout: CARDED_HAND_PAYOUTS[4]  },
  { id: 6,  label: 'Hand 6 — 8♦/6♦',   payout: CARDED_HAND_PAYOUTS[5]  },
  { id: 7,  label: 'Hand 7 — 7♦/7♠',   payout: CARDED_HAND_PAYOUTS[6]  },
  { id: 8,  label: 'Hand 8 — 4♥/2♥',   payout: CARDED_HAND_PAYOUTS[7]  },
  { id: 9,  label: 'Hand 9 — 3♣/3♥',   payout: CARDED_HAND_PAYOUTS[8]  },
  { id: 10, label: 'Hand 10 — A♥/5♦',  payout: CARDED_HAND_PAYOUTS[9]  },
];

const RANK_OPTIONS = [
  { key: 'Two Pair',        label: 'Two Pair',        payout: HAND_RANK_PAYOUTS['Two Pair']        },
  { key: 'Three of a Kind', label: 'Three of a Kind', payout: HAND_RANK_PAYOUTS['Three of a Kind'] },
  { key: 'Straight',        label: 'Straight',        payout: HAND_RANK_PAYOUTS['Straight']        },
  { key: 'Flush',           label: 'Flush',           payout: HAND_RANK_PAYOUTS['Flush']           },
  { key: 'Full House',      label: 'Full House',      payout: HAND_RANK_PAYOUTS['Full House']      },
  { key: 'Four of a Kind',  label: 'Four of a Kind',  payout: HAND_RANK_PAYOUTS['Four of a Kind']  },
];

const ROUND_OPTIONS = [100, 500, 1000];
const CHIP_OPTIONS = [5, 10, 25, 50, 100];

const ENABLED_RANKS_BY_HAND = {
  1:  ['Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House'],
  2:  ['Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind'],
  3:  ['Two Pair', 'Three of a Kind', 'Straight', 'Full House'],
  4:  ['Two Pair', 'Straight', 'Flush', 'Full House'],
  5:  ['Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind'],
  6:  ['Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind'],
  7:  ['Three of a Kind', 'Straight', 'Full House', 'Four of a Kind'],
  8:  ['Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind'],
  9:  ['Three of a Kind', 'Straight', 'Full House', 'Four of a Kind'],
  10: ['Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind'],
};

function getUnionEnabledRanks(hand1Id, hand2Id) {
  const set1 = new Set(ENABLED_RANKS_BY_HAND[hand1Id] ?? RANK_OPTIONS.map(r => r.key));
  const set2 = new Set(ENABLED_RANKS_BY_HAND[hand2Id] ?? RANK_OPTIONS.map(r => r.key));
  return RANK_OPTIONS.map(r => r.key).filter(k => set1.has(k) || set2.has(k));
}

const PLAYER_COLORS = [
  'text-yellow-400', 'text-blue-400', 'text-pink-400', 'text-green-400',
  'text-orange-400', 'text-cyan-400', 'text-red-400', 'text-lime-400',
  'text-violet-400', 'text-amber-400',
];

function fmt(v) {
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDelta(v) {
  if (v === 0) return '$0.00';
  return (v > 0 ? '+$' : '-$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function makeZeroStats() {
  return {
    totalWagered: 0,
    hand1BetWon: 0, hand1BetLost: 0,
    hand2BetWon: 0, hand2BetLost: 0,
    rankBetWon: 0, rankBetLost: 0,
    hand1Wins: 0, hand2Wins: 0, rankWins: 0,
    roundsPlayed: 0,
  };
}

/**
 * RANK WIN RULE (two-hand variant):
 *   A rank bet pays ONLY if:
 *     1. At least one of the player's two selected Card Hands wins the round, AND
 *     2. That winning hand's evaluated rank matches the player's rank bet.
 *
 * NOT a global board-rank check.
 */
function runOneRound(board, config, playerBankrupt, roundNumber) {
  const { hand1, hand2, selectedRank, baseBet } = config;
  const rankPayout = RANK_OPTIONS.find(r => r.key === selectedRank);

  // ── Unified engine: single board evaluation for all 10 hands ──
  const { winnerHandIds: winIds, isBoardWin, handRanks, colorWinners, riverResult: hiLo, boardStr } = runUnifiedRound(board);

  const hand1Won = !isBoardWin && winIds.includes(hand1.id);
  const hand2Won = !isBoardWin && winIds.includes(hand2.id);

  // Rank results pulled from the shared pre-computed handRanks map
  const rank1Result = hand1Won ? (handRanks[hand1.id] ?? null) : null;
  const rank2Result = hand2Won ? (handRanks[hand2.id] ?? null) : null;
  const rankWon = (rank1Result?.name === selectedRank) || (rank2Result?.name === selectedRank);

  const winHandLabel = isBoardWin ? 'Board wins' : (winIds.length > 0 ? `Hand(s) ${winIds.join(',')}` : 'None');
  const rankLabel = (rank1Result ?? rank2Result)?.name ?? '—';
  const colorLabel = colorWinners.length > 0 ? colorWinners.join('+') : 'None';

  const deltas = [];
  const roundStats = [];
  let roundTotalPL = 0;

  for (let p = 0; p < TOTAL_PLAYERS; p++) {
    if (playerBankrupt[p]) { deltas.push(0); roundStats.push(null); continue; }

    const isDoubler = p >= 6;
    const h1Bet = isDoubler ? baseBet * 2 : baseBet;
    const h2Bet = isDoubler ? baseBet * 2 : baseBet;
    const rBet = baseBet;
    const wagered = h1Bet + h2Bet + rBet;

    const h1Return = hand1Won ? h1Bet * (1 + hand1.payout) : 0;
    const h2Return = hand2Won ? h2Bet * (1 + hand2.payout) : 0;
    const rReturn = rankWon && rankPayout ? rBet * (1 + rankPayout.payout) : 0;
    const delta = -wagered + h1Return + h2Return + rReturn;
    roundTotalPL += delta;

    deltas.push(delta);
    roundStats.push({
      wagered,
      hand1BetWon: hand1Won ? h1Bet * hand1.payout : 0,
      hand1BetLost: hand1Won ? 0 : h1Bet,
      hand2BetWon: hand2Won ? h2Bet * hand2.payout : 0,
      hand2BetLost: hand2Won ? 0 : h2Bet,
      rankBetWon: rankWon && rankPayout ? rBet * rankPayout.payout : 0,
      rankBetLost: rankWon ? 0 : rBet,
      hand1Won, hand2Won, rankWon,
    });
  }

  const traceEntry = {
    round: roundNumber,
    board: boardStr,
    winner: winHandLabel,
    rank: rankLabel,
    color: colorLabel,
    hiLo: hiLo ?? '—',
    roundPL: roundTotalPL,
    hand1Won, hand2Won, rankWon,
  };

  return { deltas, roundStats, traceEntry };
}

function buildPlayerConfig(config) {
  const rows = [];
  for (let p = 0; p < TOTAL_PLAYERS; p++) {
    const isDoubler = p >= 6;
    const hand1Bet = isDoubler ? config.baseBet * 2 : config.baseBet;
    const hand2Bet = isDoubler ? config.baseBet * 2 : config.baseBet;
    const rankBet = config.baseBet;
    const totalBet = hand1Bet + hand2Bet + rankBet;
    rows.push({ player: p + 1, hand1Bet, hand2Bet, rankBet, totalBet });
  }
  return rows;
}

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}
function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}
function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function TwoHandRankTest({ onClose }) {
  const saved = loadState();

  const [config, setConfig] = useState({
    rounds: saved?.config?.rounds ?? 100,
    hand1: saved?.config?.hand1 ?? HAND_OPTIONS[0],
    hand2: saved?.config?.hand2 ?? HAND_OPTIONS[1],
    selectedRank: saved?.config?.selectedRank ?? 'Three of a Kind',
    baseBet: CHIP_OPTIONS.includes(saved?.config?.baseBet) ? saved.config.baseBet : 25,
  });

  const [showConfig, setShowConfig] = useState(!saved);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(saved?.progress ?? 0);
  const [balances, setBalances] = useState(saved?.balances ?? Array(TOTAL_PLAYERS).fill(STARTING_BALANCE));
  const [startBalances, setStartBalances] = useState(saved?.startBalances ?? Array(TOTAL_PLAYERS).fill(STARTING_BALANCE));
  const [roundsCompleted, setRoundsCompleted] = useState(saved?.roundsCompleted ?? 0);
  const [bankrupt, setBankrupt] = useState(saved?.bankrupt ?? Array(TOTAL_PLAYERS).fill(false));
  const [done, setDone] = useState(saved?.done ?? false);
  const [playerStats, setPlayerStats] = useState(
    saved?.playerStats ?? Array.from({ length: TOTAL_PLAYERS }, () => makeZeroStats())
  );
  const [auditLog, setAuditLog] = useState(saved?.auditLog ?? []);
  const [showAudit, setShowAudit] = useState(false);

  const abortRef = useRef(false);

  const totalStartCapital = startBalances.reduce((a, b) => a + b, 0);
  const totalRemaining = balances.reduce((a, b) => a + b, 0);
  const rake = totalStartCapital - totalRemaining;

  const totalWageredAll = playerStats.reduce((s, p) => s + p.totalWagered, 0);
  const totalH1Won = playerStats.reduce((s, p) => s + p.hand1BetWon, 0);
  const totalH1Lost = playerStats.reduce((s, p) => s + p.hand1BetLost, 0);
  const totalH2Won = playerStats.reduce((s, p) => s + p.hand2BetWon, 0);
  const totalH2Lost = playerStats.reduce((s, p) => s + p.hand2BetLost, 0);
  const totalRankWon = playerStats.reduce((s, p) => s + p.rankBetWon, 0);
  const totalRankLost = playerStats.reduce((s, p) => s + p.rankBetLost, 0);

  const enabledRanks = getUnionEnabledRanks(config.hand1.id, config.hand2.id);

  const persistState = useCallback((newBalances, newBankrupt, newProgress, newDone, newStartBalances, newRoundsCompleted, newPlayerStats, newAuditLog) => {
    saveState({
      config,
      balances: newBalances,
      startBalances: newStartBalances,
      bankrupt: newBankrupt,
      progress: newProgress,
      done: newDone,
      roundsCompleted: newRoundsCompleted,
      playerStats: newPlayerStats,
      auditLog: newAuditLog,
    });
  }, [config]);

  const runSimulation = async (fromRound, initBalances, initBankrupt, initStartBalances, initStats, initLog) => {
    const mode = '2 Hand/Rank';
    console.log(`[StrategyTest] ${mode} simulation START — ${config.rounds} rounds`);
    setRunning(true);
    abortRef.current = false;

    let bals = [...initBalances];
    let bnkr = [...initBankrupt];
    let stats = initStats.map(s => ({ ...s }));
    let log = [...initLog];
    let completed = fromRound;
    const BATCH = 50;

    for (let r = fromRound; r < config.rounds; r += BATCH) {
      if (abortRef.current) break;

      const end = Math.min(r + BATCH, config.rounds);
      for (let i = r; i < end; i++) {
        const board = getSecureRandomBoard();
        const { deltas, roundStats, traceEntry } = runOneRound(board, config, bnkr, i + 1);

        log.push(traceEntry);

        for (let p = 0; p < TOTAL_PLAYERS; p++) {
          if (!bnkr[p]) {
            bals[p] = Math.max(0, bals[p] + deltas[p]);
            if (bals[p] === 0) bnkr[p] = true;
            if (roundStats[p]) {
              const rs = roundStats[p];
              stats[p].totalWagered   += rs.wagered;
              stats[p].hand1BetWon    += rs.hand1BetWon;
              stats[p].hand1BetLost   += rs.hand1BetLost;
              stats[p].hand2BetWon    += rs.hand2BetWon;
              stats[p].hand2BetLost   += rs.hand2BetLost;
              stats[p].rankBetWon     += rs.rankBetWon;
              stats[p].rankBetLost    += rs.rankBetLost;
              if (rs.hand1Won) stats[p].hand1Wins++;
              if (rs.hand2Won) stats[p].hand2Wins++;
              if (rs.rankWon) stats[p].rankWins++;
              stats[p].roundsPlayed++;
            }
          }
        }
        completed = i + 1;
      }

      const snap = [...bals];
      const snapBnkr = [...bnkr];
      const snapStats = stats.map(s => ({ ...s }));
      const snapLog = [...log];
      setBalances(snap);
      setBankrupt(snapBnkr);
      setProgress(completed);
      setRoundsCompleted(completed);
      setPlayerStats(snapStats);
      setAuditLog(snapLog);
      persistState(snap, snapBnkr, completed, completed === config.rounds, initStartBalances, completed, snapStats, snapLog);
      await new Promise(res => setTimeout(res, 0));
    }

    console.log(`[StrategyTest] ${mode} simulation DONE — ${completed} rounds completed`);
    const finalDone = !abortRef.current && completed === config.rounds;
    const finalStats = stats.map(s => ({ ...s }));
    const finalLog = [...log];
    setBalances([...bals]);
    setBankrupt([...bnkr]);
    setProgress(completed);
    setRoundsCompleted(completed);
    setDone(finalDone);
    setPlayerStats(finalStats);
    setAuditLog(finalLog);
    persistState([...bals], [...bnkr], completed, finalDone, initStartBalances, completed, finalStats, finalLog);
    setRunning(false);
  };

  const startFresh = () => {
    const initBals = Array(TOTAL_PLAYERS).fill(STARTING_BALANCE);
    const initBnkr = Array(TOTAL_PLAYERS).fill(false);
    const initStats = Array.from({ length: TOTAL_PLAYERS }, () => makeZeroStats());
    setBalances(initBals);
    setStartBalances(initBals);
    setBankrupt(initBnkr);
    setProgress(0);
    setRoundsCompleted(0);
    setDone(false);
    setPlayerStats(initStats);
    setAuditLog([]);
    setShowConfig(false);
    runSimulation(0, initBals, initBnkr, initBals, initStats, []);
  };

  const continueFromPrevious = () => {
    setDone(false);
    const newStart = [...balances];
    const initBnkr = Array(TOTAL_PLAYERS).fill(false);
    const initStats = Array.from({ length: TOTAL_PLAYERS }, () => makeZeroStats());
    setStartBalances(newStart);
    setBankrupt(initBnkr);
    setProgress(0);
    setRoundsCompleted(0);
    setPlayerStats(initStats);
    setAuditLog([]);
    runSimulation(0, newStart, initBnkr, newStart, initStats, []);
  };

  const abort = () => { abortRef.current = true; };

  const reset = () => {
    abort();
    clearState();
    setBalances(Array(TOTAL_PLAYERS).fill(STARTING_BALANCE));
    setStartBalances(Array(TOTAL_PLAYERS).fill(STARTING_BALANCE));
    setBankrupt(Array(TOTAL_PLAYERS).fill(false));
    setProgress(0);
    setRoundsCompleted(0);
    setDone(false);
    setPlayerStats(Array.from({ length: TOTAL_PLAYERS }, () => makeZeroStats()));
    setAuditLog([]);
    setShowConfig(true);
  };

  const handleHand1Change = (newHand) => {
    const union = getUnionEnabledRanks(newHand.id, config.hand2.id);
    setConfig(c => ({
      ...c,
      hand1: newHand,
      selectedRank: union.includes(c.selectedRank) ? c.selectedRank : '',
    }));
  };

  const handleHand2Change = (newHand) => {
    const union = getUnionEnabledRanks(config.hand1.id, newHand.id);
    setConfig(c => ({
      ...c,
      hand2: newHand,
      selectedRank: union.includes(c.selectedRank) ? c.selectedRank : '',
    }));
  };

  const playerCfg = buildPlayerConfig(config);

  const exportCSV = () => {
    const headers = [
      'Player', 'Start Value', 'Remaining',
      'Card Hand 1', 'Hand 1 Bet',
      'Card Hand 2', 'Hand 2 Bet',
      'Rank Hand', 'Rank Bet',
      'Total Bet Per Round', 'Status'
    ];
    const rows = playerCfg.map((row, i) => [
      `Player ${row.player}`,
      fmt(startBalances[i]),
      fmt(balances[i]),
      config.hand1.label,
      fmt(row.hand1Bet),
      config.hand2.label,
      fmt(row.hand2Bet),
      config.selectedRank,
      fmt(row.rankBet),
      fmt(row.totalBet),
      bankrupt[i] ? 'Bankrupt' : 'Active',
    ]);
    const summaryRows = [
      [],
      ['Sum', fmt(totalStartCapital), fmt(totalRemaining), '', '', '', '', '', '', '', ''],
      ['Casino Rake', '', fmt(rake), '', '', '', '', '', '', '', ''],
    ];
    const allRows = [headers, ...rows, ...summaryRows];
    const csv = allRows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TwoHandTest_${config.rounds}rounds_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportWord = () => {
    const now = new Date().toLocaleString();
    const headers = ['Player', 'Start Value', 'Remaining', 'Card Hand 1', 'H1 Bet', 'Card Hand 2', 'H2 Bet', 'Rank Hand', 'Rank Bet', 'Total Bet', 'Status'];
    const tds = (vals) => vals.map(v => `<td style="border:1px solid #ccc;padding:4px 8px;white-space:nowrap;">${v}</td>`).join('');
    const hds = () => headers.map(h => `<td style="background:#f0f0f0;font-weight:bold;border:1px solid #aaa;padding:4px 8px;">${h}</td>`).join('');
    const playerRows = playerCfg.map((row, i) => `<tr>${tds([
      `Player ${row.player}`,
      fmt(startBalances[i]),
      `<span style="color:${bankrupt[i] ? '#cc0000' : '#008800'}">${fmt(balances[i])}</span>`,
      config.hand1.label,
      fmt(row.hand1Bet),
      config.hand2.label,
      fmt(row.hand2Bet),
      config.selectedRank,
      fmt(row.rankBet),
      fmt(row.totalBet),
      bankrupt[i] ? '<span style="color:#cc0000">Bankrupt</span>' : '<span style="color:#008800">Active</span>',
    ])}</tr>`).join('');

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head><meta charset="utf-8"><title>2 Hand/Rank Test Report</title></head>
      <body style="font-family:Arial,sans-serif;font-size:9pt;">
        <h2>Rapid Fire Texas 10 — 2 Hand/Rank Test Report</h2>
        <p style="color:#444;">Generated: ${now}</p>
        <p><b>Configuration:</b> ${config.rounds} rounds | Hand 1: ${config.hand1.label} | Hand 2: ${config.hand2.label} | Rank: ${config.selectedRank} | Base Bet: ${fmt(config.baseBet)}</p>
        <p><em>Players 7–10 double their Card Hand bets (${fmt(config.baseBet * 2)}) to cover 5-Color Streak strategy.</em></p>
        <br/>
        <table style="border-collapse:collapse;width:100%;font-size:8.5pt;"><tr>${hds()}</tr>${playerRows}
          <tr><td colspan="11" style="padding:6px;border:none;">&nbsp;</td></tr>
          <tr>
            <td style="font-weight:bold;border:1px solid #ccc;padding:4px 8px;">Sum</td>
            <td style="border:1px solid #ccc;padding:4px 8px;">${fmt(totalStartCapital)}</td>
            <td style="border:1px solid #ccc;padding:4px 8px;">${fmt(totalRemaining)}</td>
            <td colspan="8" style="border:1px solid #ccc;padding:4px 8px;"></td>
          </tr>
          <tr>
            <td style="font-weight:bold;background:#ffe4e4;border:1px solid #ccc;padding:4px 8px;" colspan="2">Casino Rake (+ casino / - casino)</td>
            <td style="font-weight:bold;color:${rake >= 0 ? '#cc0000' : '#008800'};border:1px solid #ccc;padding:4px 8px;">${rake >= 0 ? '+' : ''}${fmt(rake)}</td>
            <td colspan="8" style="border:1px solid #ccc;padding:4px 8px;"></td>
          </tr>
        </table>
        <p style="color:#888;font-size:8pt;margin-top:20px;">Rapid Fire Texas 10 2 Hand/Rank Test — 32-card engine | ${roundsCompleted} of ${config.rounds} rounds completed</p>
      </body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TwoHandTest_${new Date().toISOString().slice(0,10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const now = new Date().toLocaleString();
    const ROW_H = 8;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(250, 204, 21);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Rapid Fire Texas 10 — 2 Hand/Rank Test', 10, 10);
    doc.setFontSize(7.5);
    doc.setTextColor(200, 200, 200);
    doc.text(`Generated: ${now}  |  ${config.rounds} rounds  |  H1: ${config.hand1.label}  |  H2: ${config.hand2.label}  |  Rank: ${config.selectedRank}  |  Base Bet: ${fmt(config.baseBet)}`, 10, 17);
    doc.text(`${roundsCompleted} of ${config.rounds} rounds completed`, pageW - 10, 17, { align: 'right' });

    let y = 30;
    const colX = [10, 45, 78, 113, 145, 178, 210, 235, 255, 265];
    const hdrs = ['Player', 'Start Value', 'Remaining', 'Hand 1 (Bet)', 'Hand 2 (Bet)', 'Rank Hand', 'Rank Bet', 'Total Bet', 'Status'];

    doc.setFillColor(240, 240, 240);
    doc.rect(10, y - ROW_H + 2, pageW - 20, ROW_H, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    hdrs.forEach((h, i) => doc.text(h, colX[i], y));
    y += ROW_H;

    playerCfg.forEach((row, i) => {
      doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 252);
      doc.rect(10, y - ROW_H + 2, pageW - 20, ROW_H, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Player ${row.player}`, colX[0], y);
      doc.text(fmt(startBalances[i]), colX[1], y);
      if (bankrupt[i]) doc.setTextColor(180, 0, 0);
      else if (balances[i] > startBalances[i]) doc.setTextColor(0, 140, 60);
      else doc.setTextColor(0, 0, 0);
      doc.text(fmt(balances[i]), colX[2], y);
      doc.setTextColor(0, 0, 0);
      doc.text(`${config.hand1.label.replace(/[♦♥♣♠]/g,'').trim()} (${fmt(row.hand1Bet)})`, colX[3], y);
      doc.text(`${config.hand2.label.replace(/[♦♥♣♠]/g,'').trim()} (${fmt(row.hand2Bet)})`, colX[4], y);
      doc.text(config.selectedRank, colX[5], y);
      doc.text(fmt(row.rankBet), colX[6], y);
      doc.text(fmt(row.totalBet), colX[7], y);
      if (bankrupt[i]) doc.setTextColor(180, 0, 0);
      else doc.setTextColor(0, 140, 60);
      doc.text(bankrupt[i] ? 'BANKRUPT' : 'ACTIVE', colX[8], y);
      y += ROW_H;
    });

    y += 4;
    doc.setFillColor(255, 235, 235);
    doc.rect(10, y - ROW_H + 2, pageW - 20, ROW_H, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Sum', colX[0], y);
    doc.text(fmt(totalStartCapital), colX[1], y);
    doc.text(fmt(totalRemaining), colX[2], y);
    doc.text('Casino Rake:', colX[3], y);
    if (rake >= 0) doc.setTextColor(180, 0, 0);
    else doc.setTextColor(0, 140, 60);
    doc.text((rake >= 0 ? '+' : '') + fmt(rake), colX[4], y);

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Rapid Fire Texas 10 2 Hand/Rank Test  |  Page ${i} of ${totalPages}`, pageW / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
    }
    doc.save(`TwoHandTest_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const hasPriorResults = roundsCompleted > 0;
  const pct = config.rounds > 0 ? Math.round((progress / config.rounds) * 100) : 0;
  const activePlayers = bankrupt.filter(b => !b).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-slate-900 border border-yellow-700/40 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-700/30 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            <h2 className="font-bold text-lg text-white">2 Hand/Rank Test</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/40 font-semibold">Advanced Logic</span>
            {hasPriorResults && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-300 border border-yellow-700/40 font-semibold">
                {roundsCompleted}/{config.rounds} rounds
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!running && hasPriorResults && (
              <>
                <button onClick={exportPDF} className="flex items-center gap-1.5 text-blue-300 border border-blue-700 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-900/30 transition-all font-semibold">
                  <FileDown className="w-3.5 h-3.5" /> Export PDF
                </button>
                <button onClick={exportWord} className="flex items-center gap-1.5 text-emerald-300 border border-emerald-700 px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-900/30 transition-all font-semibold">
                  <FileText className="w-3.5 h-3.5" /> Export Word
                </button>
                <button onClick={exportCSV} className="flex items-center gap-1.5 text-cyan-300 border border-cyan-700 px-3 py-1.5 rounded-lg text-xs hover:bg-cyan-900/30 transition-all font-semibold">
                  <FileDown className="w-3.5 h-3.5" /> Export CSV
                </button>
              </>
            )}
            <button onClick={() => setShowConfig(v => !v)} className="flex items-center gap-1.5 text-yellow-300 border border-yellow-700/50 px-3 py-1.5 rounded-lg text-xs hover:bg-yellow-900/20 transition-all font-semibold">
              <Settings2 className="w-3.5 h-3.5" /> Config
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700/50 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <AnimatePresence>
            {showConfig && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-800/70 border border-yellow-700/30 rounded-xl p-5 space-y-5 mb-2">
                  <h3 className="font-bold text-yellow-300 text-sm flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> Test Configuration
                  </h3>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/40 space-y-4">
                      <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Hand 1</p>
                      <div>
                        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-2">Card Hand</label>
                        <select
                          value={config.hand1.id}
                          onChange={e => handleHand1Change(HAND_OPTIONS.find(h => h.id === parseInt(e.target.value)))}
                          className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-yellow-500 w-full"
                        >
                          {HAND_OPTIONS.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/40 space-y-4">
                      <p className="text-xs font-bold text-green-300 uppercase tracking-wider">Hand 2</p>
                      <div>
                        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-2">Card Hand</label>
                        <select
                          value={config.hand2.id}
                          onChange={e => handleHand2Change(HAND_OPTIONS.find(h => h.id === parseInt(e.target.value)))}
                          className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-yellow-500 w-full"
                        >
                          {HAND_OPTIONS.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <div>
                      <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-2">Rank Hand (Union Rule)</label>
                      <select
                        value={config.selectedRank}
                        onChange={e => setConfig(c => ({ ...c, selectedRank: e.target.value }))}
                        className={`bg-slate-700 border text-sm rounded-lg px-3 py-1.5 outline-none focus:border-yellow-500 w-full ${
                          !config.selectedRank ? 'border-red-500 text-red-300' : 'border-slate-600 text-white'
                        }`}
                      >
                        <option value="" disabled>— Select a Rank —</option>
                        {RANK_OPTIONS.map(r => {
                          const enabled = enabledRanks.includes(r.key);
                          return (
                            <option
                              key={r.key}
                              value={r.key}
                              disabled={!enabled}
                              style={!enabled ? { color: '#6b7280' } : {}}
                            >
                              {!enabled ? '[N/A] ' : ''}{r.label} ({r.payout}:1){!enabled ? ' — 0.00 odds' : ''}
                            </option>
                          );
                        })}
                      </select>
                      {!config.selectedRank && (
                        <p className="text-xs text-red-400 mt-1">Select a valid rank to run the test</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Enabled if achievable by either hand</p>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-2">Number of Rounds</label>
                      <div className="flex gap-2 flex-wrap">
                        {ROUND_OPTIONS.map(r => (
                          <button key={r} onClick={() => setConfig(c => ({ ...c, rounds: r }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              config.rounds === r
                                ? 'border-yellow-400 bg-yellow-600 text-black'
                                : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-yellow-600'
                            }`}>
                            {r.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-2">Base Bet</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {CHIP_OPTIONS.map(chip => (
                          <button
                            key={chip}
                            onClick={() => setConfig(c => ({ ...c, baseBet: chip }))}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              config.baseBet === chip
                                ? 'border-yellow-400 bg-yellow-600 text-black'
                                : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-yellow-600'
                            }`}
                          >
                            ${chip}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Players 7–10 bet {fmt(config.baseBet * 2)} on each hand</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={startFresh}
                      disabled={running || !config.selectedRank}
                      title={!config.selectedRank ? 'Select a valid Rank Hand first' : undefined}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Play className="w-4 h-4" /> Run Test ({config.rounds.toLocaleString()} rounds)
                    </button>
                    {done && (
                      <button
                        onClick={continueFromPrevious}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-sm transition-all"
                      >
                        <SkipForward className="w-4 h-4" /> Rerun from Final Balances
                      </button>
                    )}
                    {hasPriorResults && (
                      <button
                        onClick={reset}
                        className="flex items-center gap-1.5 text-gray-500 border border-slate-600 px-3 py-2 rounded-lg text-sm hover:text-red-400 hover:border-red-700 transition-all"
                      >
                        <X className="w-3.5 h-3.5" /> Reset
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {running && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-green-400" />
                  Running simulation... {progress.toLocaleString()} / {config.rounds.toLocaleString()} rounds
                </span>
                <span>{activePlayers}/10 players active</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-2 rounded-full bg-green-500"
                  animate={{ width: `${pct}%` }}
                  transition={{ ease: 'linear', duration: 0.1 }}
                />
              </div>
              <button
                onClick={abort}
                className="mt-3 text-xs text-red-400 border border-red-700/50 px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition-all"
              >
                Abort
              </button>
            </div>
          )}

          {!running && !hasPriorResults && !showConfig && (
            <div className="text-center py-10 text-gray-500">
              <p>Configure and run a test above to see results.</p>
            </div>
          )}

          {hasPriorResults && (
            <>
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      {config.hand1.label} + {config.hand2.label} + {config.selectedRank}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Players 7–10 double both Card Hand bets — 5-color streak strategy
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <span>{roundsCompleted.toLocaleString()} of {config.rounds.toLocaleString()} rounds</span>
                    {!running && done && <span className="ml-2 text-green-400 font-semibold">Complete</span>}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase bg-slate-900/40 border-b border-slate-700">
                        <th className="px-3 py-2.5 text-left">Player</th>
                        <th className="px-3 py-2.5 text-right">Start</th>
                        <th className="px-3 py-2.5 text-right">Remaining</th>
                        <th className="px-3 py-2.5 text-right">P / L</th>
                        <th className="px-3 py-2.5 text-right border-l border-slate-600/60">H1 Bet/Rd</th>
                        <th className="px-3 py-2.5 text-right">H1 Total</th>
                        <th className="px-3 py-2.5 text-right">H1 Net</th>
                        <th className="px-3 py-2.5 text-right border-l border-slate-600/60">H2 Bet/Rd</th>
                        <th className="px-3 py-2.5 text-right">H2 Total</th>
                        <th className="px-3 py-2.5 text-right">H2 Net</th>
                        <th className="px-3 py-2.5 text-right border-l border-slate-600/60">Rank/Rd</th>
                        <th className="px-3 py-2.5 text-right">Rank Total</th>
                        <th className="px-3 py-2.5 text-right">Rank Net</th>
                        <th className="px-3 py-2.5 text-right border-l border-slate-600/60">Total Wagered</th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerCfg.map((row, i) => {
                        const st = playerStats[i];
                        const pl = balances[i] - startBalances[i];
                        const h1Net = st.hand1BetWon - st.hand1BetLost;
                        const h2Net = st.hand2BetWon - st.hand2BetLost;
                        const rNet = st.rankBetWon - st.rankBetLost;
                        const isBankrupt = bankrupt[i];
                        return (
                          <motion.tr
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className={`border-b border-slate-700/40 ${isBankrupt ? 'opacity-50' : 'hover:bg-slate-700/10'}`}
                          >
                            <td className={`px-3 py-2 font-bold ${PLAYER_COLORS[i]}`}>Player {row.player}</td>
                            <td className="px-3 py-2 text-right text-gray-400 font-mono">{fmt(startBalances[i])}</td>
                            <td className="px-3 py-2 text-right font-mono">
                              <span className={isBankrupt ? 'text-red-500' : pl >= 0 ? 'text-green-400' : 'text-red-400'}>{fmt(balances[i])}</span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold">
                              <span className={pl >= 0 ? 'text-green-400' : 'text-red-400'}>{fmtDelta(pl)}</span>
                            </td>
                            <td className="px-3 py-2 text-right text-blue-300 font-mono border-l border-slate-600/40">{fmt(row.hand1Bet)}</td>
                            <td className="px-3 py-2 text-right text-gray-300 font-mono">{fmt(row.hand1Bet * st.roundsPlayed)}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold">
                              <span className={h1Net >= 0 ? 'text-green-400' : 'text-red-400'}>{fmtDelta(h1Net)}</span>
                            </td>
                            <td className="px-3 py-2 text-right text-green-300 font-mono border-l border-slate-600/40">{fmt(row.hand2Bet)}</td>
                            <td className="px-3 py-2 text-right text-gray-300 font-mono">{fmt(row.hand2Bet * st.roundsPlayed)}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold">
                              <span className={h2Net >= 0 ? 'text-green-400' : 'text-red-400'}>{fmtDelta(h2Net)}</span>
                            </td>
                            <td className="px-3 py-2 text-right text-yellow-300 font-mono border-l border-slate-600/40">{fmt(row.rankBet)}</td>
                            <td className="px-3 py-2 text-right text-gray-300 font-mono">{fmt(row.rankBet * st.roundsPlayed)}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold">
                              <span className={rNet >= 0 ? 'text-green-400' : 'text-red-400'}>{fmtDelta(rNet)}</span>
                            </td>
                            <td className="px-3 py-2 text-right text-white font-mono font-bold border-l border-slate-600/40">{fmt(st.totalWagered)}</td>
                            <td className="px-3 py-2 text-center">
                              {isBankrupt
                                ? <span className="text-xs font-bold text-red-500 bg-red-900/30 border border-red-700/40 px-2 py-0.5 rounded-full">Bankrupt</span>
                                : <span className="text-xs font-bold text-green-400 bg-green-900/20 border border-green-700/30 px-2 py-0.5 rounded-full">Active</span>
                              }
                            </td>
                          </motion.tr>
                        );
                      })}

                      <tr className="border-t-2 border-slate-600 bg-slate-900/80 font-bold text-sm">
                        <td className="px-3 py-3 text-gray-300">TOTALS <span className="text-xs font-normal text-gray-500">({activePlayers}/10 active)</span></td>
                        <td className="px-3 py-3 text-right font-mono text-gray-300">{fmt(totalStartCapital)}</td>
                        <td className="px-3 py-3 text-right font-mono">
                          <span className={totalRemaining >= totalStartCapital ? 'text-green-400' : 'text-red-400'}>{fmt(totalRemaining)}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-black">
                          <span className={rake <= 0 ? 'text-green-400' : 'text-red-400'}>{fmtDelta(totalRemaining - totalStartCapital)}</span>
                        </td>
                        <td className="px-3 py-3 border-l border-slate-600/40" colSpan={2}>
                          <span className="text-gray-400 text-xs">H1 total: {fmt(totalH1Won + totalH1Lost)}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold">
                          <span className={totalH1Won - totalH1Lost >= 0 ? 'text-green-400' : 'text-red-400'}>{fmtDelta(totalH1Won - totalH1Lost)}</span>
                        </td>
                        <td className="px-3 py-3 border-l border-slate-600/40" colSpan={2}>
                          <span className="text-gray-400 text-xs">H2 total: {fmt(totalH2Won + totalH2Lost)}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold">
                          <span className={totalH2Won - totalH2Lost >= 0 ? 'text-green-400' : 'text-red-400'}>{fmtDelta(totalH2Won - totalH2Lost)}</span>
                        </td>
                        <td className="px-3 py-3 border-l border-slate-600/40" colSpan={2}>
                          <span className="text-gray-400 text-xs">Rank total: {fmt(totalRankWon + totalRankLost)}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold">
                          <span className={totalRankWon - totalRankLost >= 0 ? 'text-green-400' : 'text-red-400'}>{fmtDelta(totalRankWon - totalRankLost)}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-white font-bold border-l border-slate-600/40">{fmt(totalWageredAll)}</td>
                        <td className="px-3 py-3"></td>
                      </tr>

                      <tr className={`${rake >= 0 ? 'bg-red-900/20' : 'bg-green-900/20'} border-t border-slate-600/40`}>
                        <td className="px-3 py-3 font-bold text-gray-200 flex items-center gap-2">
                          {rake >= 0
                            ? <TrendingUp className="w-4 h-4 text-red-400" />
                            : <TrendingDown className="w-4 h-4 text-green-400" />
                          }
                          Casino Rake
                        </td>
                        <td colSpan={12} className="px-3 py-3"></td>
                        <td className="px-3 py-3 text-right font-mono text-base font-black border-l border-slate-600/40">
                          <span className={rake >= 0 ? 'text-red-400' : 'text-green-400'}>
                            {rake >= 0 ? '+' : ''}{fmt(rake)}
                          </span>
                        </td>
                        <td className="px-3 py-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {done && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={continueFromPrevious}
                    disabled={!config.selectedRank}
                    title={!config.selectedRank ? 'Select a valid Rank Hand first' : undefined}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <SkipForward className="w-4 h-4" />
                    Rerun / Continue from Final Balances
                  </button>
                  <button
                    onClick={startFresh}
                    disabled={!config.selectedRank}
                    title={!config.selectedRank ? 'Select a valid Rank Hand first' : undefined}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" />
                    Run Fresh ({config.rounds.toLocaleString()} rounds)
                  </button>
                  <button onClick={exportCSV} className="flex items-center gap-1.5 text-cyan-300 border border-cyan-700 px-4 py-2 rounded-lg text-sm hover:bg-cyan-900/30 transition-all font-semibold">
                    <FileDown className="w-3.5 h-3.5" /> Export CSV
                  </button>
                </div>
              )}

              <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 text-xs text-gray-500 space-y-1">
                <p className="font-semibold text-gray-400 mb-1">Simulation Rules</p>
                <p>• Starting balance: {fmt(STARTING_BALANCE)} per player ({fmt(TOTAL_START)} total capital)</p>
                <p>• Players 1–6: {fmt(config.baseBet)} on Hand 1 + {fmt(config.baseBet)} on Hand 2 + {fmt(config.baseBet)} on Rank = {fmt(config.baseBet * 3)} per round</p>
                <p>• Players 7–10: <span className="text-yellow-300">Double {fmt(config.baseBet * 2)}</span> on Hand 1 + <span className="text-yellow-300">Double {fmt(config.baseBet * 2)}</span> on Hand 2 + {fmt(config.baseBet)} on Rank = {fmt(config.baseBet * 5)} per round (5-Color Streak strategy)</p>
                <p>• Rank win rule: rank bet pays ONLY if one of the player's selected hands wins the round AND achieves that specific rank</p>
                <p>• All columns show cumulative totals across all completed rounds — not single-round values</p>
                <p>• Union Lock Rule: a Rank is enabled if at least one of the two selected Card Hands can produce that rank</p>
                <p>• Bankruptcy: player is skipped for the remainder of the test when balance hits $0</p>
              </div>

              {auditLog.length > 0 && (
                <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowAudit(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-400 hover:text-white hover:bg-slate-700/20 transition-all"
                  >
                    <span>Round-by-Round Audit Log ({auditLog.length} rounds)</span>
                    <span className="text-gray-600">{showAudit ? '▲ hide' : '▼ show'}</span>
                  </button>
                  {showAudit && (
                    <div className="overflow-x-auto max-h-72 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-slate-900 z-10">
                          <tr className="text-gray-500 uppercase border-b border-slate-700">
                            <th className="px-3 py-2 text-right">#</th>
                            <th className="px-3 py-2 text-left">Board (Flop/Turn/River)</th>
                            <th className="px-3 py-2 text-left">Winner</th>
                            <th className="px-3 py-2 text-left">Rank</th>
                            <th className="px-3 py-2 text-left">Color</th>
                            <th className="px-3 py-2 text-left">Hi/Lo</th>
                            <th className="px-3 py-2 text-right">H1</th>
                            <th className="px-3 py-2 text-right">H2</th>
                            <th className="px-3 py-2 text-right">R.Won</th>
                            <th className="px-3 py-2 text-right">Round P/L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLog.map((entry, idx) => (
                            <tr key={idx} className={`border-b border-slate-800 ${idx % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
                              <td className="px-3 py-1.5 text-right text-gray-600 font-mono">{entry.round}</td>
                              <td className="px-3 py-1.5 text-gray-300 font-mono whitespace-nowrap">{entry.board}</td>
                              <td className={`px-3 py-1.5 font-semibold ${(entry.hand1Won || entry.hand2Won) ? 'text-green-400' : 'text-gray-500'}`}>{entry.winner}</td>
                              <td className={`px-3 py-1.5 ${entry.rankWon ? 'text-yellow-400 font-bold' : 'text-gray-500'}`}>{entry.rank}</td>
                              <td className="px-3 py-1.5 text-blue-300">{entry.color}</td>
                              <td className={`px-3 py-1.5 font-semibold ${entry.hiLo === 'HIGH' ? 'text-orange-400' : entry.hiLo === 'LOW' ? 'text-sky-400' : 'text-gray-500'}`}>{entry.hiLo}</td>
                              <td className="px-3 py-1.5 text-center">{entry.hand1Won ? <span className="text-blue-400 font-bold">Y</span> : <span className="text-gray-600">N</span>}</td>
                              <td className="px-3 py-1.5 text-center">{entry.hand2Won ? <span className="text-green-400 font-bold">Y</span> : <span className="text-gray-600">N</span>}</td>
                              <td className="px-3 py-1.5 text-center">{entry.rankWon ? <span className="text-yellow-400 font-bold">Y</span> : <span className="text-gray-600">N</span>}</td>
                              <td className={`px-3 py-1.5 text-right font-mono font-bold ${entry.roundPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtDelta(entry.roundPL)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}