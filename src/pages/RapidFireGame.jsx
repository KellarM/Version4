import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FIXED_HANDS, shuffleDeck, DEALER_DECK, getSecureRandomBoard, findLeadingHand,
  resolveRedBlack, resolveLowHigh, cardColor, isLowCard,
  SUITS, cardDisplay, evaluateBestHand,
  MAX_HAND_BETS, isKillSwitchActive,
  checkRankCap, checkColorCap, checkRiverCap,
  getTotalHandBets, getTotalRankBets, getTotalColorBets, hasRankBet,
  calculateTiePayout,
  isSideBetGateOpen } from
'@/lib/gameEngine';
import { COLOR_BOARD_PAYOUTS, LOW_HIGH_PAYOUT, calculatePayout } from '@/lib/payoutConstants';
import { getPerHandRankPayout } from '@/lib/perHandRankPayouts';
import FixedHandCard from '@/components/game/FixedHandCard';
import CommunityCards from '@/components/game/CommunityCards';
import SideBets from '@/components/game/SideBets';
import HistoryRail from '@/components/game/HistoryRail';
import DealerAnnouncement from '@/components/game/DealerAnnouncement';
import RankBets from '@/components/game/RankBets';
import PayoutTable from '@/components/game/PayoutTable';
import NewPlayerButton from '@/components/game/NewPlayerButton';
import Chip from '@/components/game/Chip';
import PlayerSeat from '@/components/game/PlayerSeat';
import PlayerStatsPanel from '@/components/game/PlayerStatsPanel';
import ToolsMenu from '@/components/game/ToolsMenu';
import GameRulesModal from '@/components/game/GameRulesModal';
import DetailedPayoutDisplay from '@/components/game/DetailedPayoutDisplay';
import HandBetLimitAlert from '@/components/game/HandBetLimitAlert';
import RankBetLimitAlert from '@/components/game/RankBetLimitAlert';
import InsufficientFundsAlert from '@/components/game/InsufficientFundsAlert';
import AutoTrimToast from '@/components/game/AutoTrimToast';
import { useGreedEngineState } from '@/components/game/GreedEngine';
import MollySimulator from '@/components/game/MollySimulator';
import ArchetypeBattle from '@/components/game/ArchetypeBattle';
import ExploitHunter from '@/components/game/IndividualStrategyTest';
import KillSwitchStrategyTest from '@/components/game/KillSwitchStrategyTest';
import Observer from '@/components/game/Observer';
import RegulatoryComplianceReport from '@/components/game/TwoHandRankTest';

import GameTimingModal from '@/components/game/GameTimingModal';
import { base44 } from '@/api/base44Client';
import CountdownClock from '@/components/game/CountdownClock';
import { useGameTiming } from '@/hooks/useGameTiming';


const STARTING_BALANCE = 10000;
const CHIP_VALUES = [5, 10, 25, 50, 100, 500];
const MAX_HAND_BET_AMOUNT = 500;
const DEFAULT_CHIP = 5;
const PLAYER_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const MIN_BET = 5;

// Must match PLAYER_CHIP_COLORS in child components
const PLAYER_TAB_STYLES = [
{ active: 'border-yellow-400 bg-yellow-500 text-black', inactive: 'border-yellow-700/40 bg-yellow-900/20 text-yellow-400' },
{ active: 'border-blue-400 bg-blue-500 text-white', inactive: 'border-blue-700/40 bg-blue-900/20 text-blue-400' },
{ active: 'border-pink-400 bg-pink-500 text-white', inactive: 'border-pink-700/40 bg-pink-900/20 text-pink-400' },
{ active: 'border-green-400 bg-green-500 text-black', inactive: 'border-green-700/40 bg-green-900/20 text-green-400' },
{ active: 'border-orange-400 bg-orange-500 text-black', inactive: 'border-orange-700/40 bg-orange-900/20 text-orange-400' },
{ active: 'border-cyan-400 bg-cyan-500 text-black', inactive: 'border-cyan-700/40 bg-cyan-900/20 text-cyan-400' },
{ active: 'border-red-400 bg-red-500 text-white', inactive: 'border-red-700/40 bg-red-900/20 text-red-400' },
{ active: 'border-lime-400 bg-lime-500 text-black', inactive: 'border-lime-700/40 bg-lime-900/20 text-lime-400' },
{ active: 'border-violet-400 bg-violet-500 text-white', inactive: 'border-violet-700/40 bg-violet-900/20 text-violet-400' },
{ active: 'border-amber-400 bg-amber-500 text-black', inactive: 'border-amber-700/40 bg-amber-900/20 text-amber-400' }];


// Phases: 'betting' | 'flop' | 'turn' | 'lowHighBetting' | 'river' | 'settlement' | 'winner'
const PHASE_LABELS = {
  betting: 'Place Your Bets',
  flop: 'Flop',
  turn: 'Turn',
  lowHighBetting: 'Low / High Betting Open',
  river: 'River',
  settlement: 'Settling...',
  winner: 'Round Complete'
};

export default function RapidFireGame() {
  const [playerCount, setPlayerCount] = useState(1);
  // balances[i] = balance for player i+1
  const [balances, setBalances] = useState(() => Array(10).fill(STARTING_BALANCE));
  const [selectedChip, setSelectedChip] = useState(DEFAULT_CHIP);
  // handBets[playerId][handId], redBlackBets[playerId][key], rankBets[playerId][key]
  const [handBets, setHandBets] = useState({}); // { [pid]: { handId: amount } }
  const [redBlackBets, setRedBlackBets] = useState({}); // { [pid]: { key: amount } }
  const [rankBets, setRankBets] = useState({}); // { [pid]: { key: amount } }
  const [lowHighBets, setLowHighBets] = useState({}); // { [pid]: { type, amount } }
  const [activePlayer, setActivePlayer] = useState(0); // which player is placing bets
  const [communityCards, setCommunityCards] = useState([]);
  const [gamePhase, setGamePhase] = useState('betting');
  const [deck, setDeck] = useState(() => getSecureRandomBoard());
  const [deckIndex, setDeckIndex] = useState(0);
  const [dealerMessage, setDealerMessage] = useState("Phase 1 — Texas Hold'em is open for play. Phase 2 — Place Hand, Rank, and Color bets now.");
  const [leadingHandIds, setLeadingHandIds] = useState([]);
  const [winnerHandIds, setWinnerHandIds] = useState([]);
  const [winningRedBlack, setWinningRedBlack] = useState([]);
  const [winningLowHigh, setWinningLowHigh] = useState(null);
  const [history, setHistory] = useState([]);
  const [playerStats, setPlayerStats] = useState({});
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [showMollySimulator, setShowMollySimulator] = useState(false);
  const [showArchetypeBattle, setShowArchetypeBattle] = useState(false);
  const [showExploitHunter, setShowExploitHunter] = useState(false);
  const [showComplianceReport, setShowComplianceReport] = useState(false);
  const [showKsStrategyTest, setShowKsStrategyTest] = useState(false);
  const [showObserver, setShowObserver] = useState(false);
  const [observerRoundData, setObserverRoundData] = useState(null);
  const [observeOn, setObserveOn] = useState(false);
  const [observerRoundCount, setObserverRoundCount] = useState(0);
  const prevObserverRoundRef = useRef(null);
  const onRoundSettledRef = useRef(null);  // Observer registers its handler here

  // ── Observer: round data is dispatched via onRoundSettledRef to Observer component ──
  // (saving logic lives in Observer.jsx to avoid stale closure issues)
  // ─────────────────────────────────────────────────────────────────────────
  
  const [showGameTiming, setShowGameTiming] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [showPlayerSelector, setShowPlayerSelector] = useState(true);
  const [roundId, setRoundId] = useState(1);
  const [resetBankVisible, setResetBankVisible] = useState(false);

  const [lastWinInfo, setLastWinInfo] = useState(null);
  const [winningRank, setWinningRank] = useState(null);
  const [leadingRank, setLeadingRank] = useState(null);
  // Casino profit tracking
  const [casinoProfit, setCasinoProfit] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [showHandLimitAlert, setShowHandLimitAlert] = useState(false);
  const [showRankLimitAlert, setShowRankLimitAlert] = useState(false);
  const [rankAlertType, setRankAlertType] = useState('limit');
  // snowball cap alert: 'rank_cap' | 'color_cap' | 'river_cap'
  const [showCapAlert, setShowCapAlert] = useState(false);
  const [capAlertType, setCapAlertType] = useState('rank_cap');
  const [showInsufficientFunds, setShowInsufficientFunds] = useState(false);
  const [showAutoTrimToast, setShowAutoTrimToast] = useState(false);
  const [displayWindowVisible, setDisplayWindowVisible] = useState(false);
  const [previousBets, setPreviousBets] = useState(null); // { handBets, redBlackBets, rankBets, totalBet }
  const [repeatUsedThisRound, setRepeatUsedThisRound] = useState(false);

  const {
    hoveredHandId, setHoveredHandId,
    hoveredRiverType, setHoveredRiverType,
    riverWinFlash, triggerRiverWin
  } = useGreedEngineState();
  const [hoveredRankRow, setHoveredRankRow] = useState(null);

  // Game timing
  const { timing, startTimer, stopTimer, reloadTiming } = useGameTiming();

  // Listen for timing updates from GameTimingModal
  useEffect(() => {
    const handleTimingUpdate = () => {
      reloadTiming();
    };
    window.addEventListener('gameTiming:updated', handleTimingUpdate);
    return () => window.removeEventListener('gameTiming:updated', handleTimingUpdate);
  }, [reloadTiming]);
  const [countdownTime, setCountdownTime] = useState(0);
  const [countdownActive, setCountdownActive] = useState(false);
  const timerActiveRef = useRef(false);
  const handleDealRiverRef = useRef(null);
  const settleRef = useRef(null);

  // Game progress persistence
  useEffect(() => {
    const savedGame = localStorage.getItem('rapidFireGameState');
    if (savedGame) {
      try {
        const state = JSON.parse(savedGame);
        setBalances(state.balances);
        setRoundId(state.roundId);
        setCasinoProfit(state.casinoProfit);
        setRoundsPlayed(state.roundsPlayed);

      } catch (e) {
        console.log('Could not restore game state');
      }
    }
  }, []);

  // Ghost Toolbar: Ctrl+Alt+J+L hotkey
  // Reset Bank visibility: Ctrl+Alt+B+M hotkey
  useEffect(() => {
    const pressed = new Set();
    const onDown = (e) => {
      pressed.add(e.key.toLowerCase());
      if (pressed.has('control') && pressed.has('alt') && pressed.has('j') && pressed.has('l')) {
        e.preventDefault();
        setToolbarVisible((v) => !v);
      }
      if (pressed.has('control') && pressed.has('alt') && pressed.has('b') && pressed.has('m')) {
        e.preventDefault();
        setResetBankVisible((v) => !v);
      }
    };
    const onUp = (e) => { pressed.delete(e.key.toLowerCase()); };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Auto-save game state
  useEffect(() => {
    const gameState = {
      balances,
      roundId,
      casinoProfit,
      roundsPlayed
    };
    localStorage.setItem('rapidFireGameState', JSON.stringify(gameState));
  }, [balances, roundId, casinoProfit, roundsPlayed]);

  // Active player helpers
  const pid = activePlayer;
  const balance = balances[pid] ?? STARTING_BALANCE;
  const pHandBets = handBets[pid] || {};
  const pRedBlackBets = redBlackBets[pid] || {};
  const pRankBets = rankBets[pid] || {};
  const pLowHighBet = lowHighBets[pid] || null;

  // Count bets in each category (always scoped to active player)
  const handBetCount = Object.keys(pHandBets).length;
  const rankBetCount = Object.keys(pRankBets).length;

  // Kill switch: 4 hands locks all side markets
  const killSwitchActive = isKillSwitchActive(handBetCount);

  // Phase 4 gate: Color Board and River require total rank === total hand bets
  const sideBetGateOpen = !killSwitchActive && isSideBetGateOpen(pHandBets, pRankBets);

  // Greed Engine: live total investment for active player
  const totalInvestment =
  Object.values(pHandBets).reduce((s, v) => s + v, 0) +
  Object.values(pRankBets).reduce((s, v) => s + v, 0) +
  Object.values(pRedBlackBets).reduce((s, v) => s + v, 0) + (
  pLowHighBet?.amount || 0);

  // Luminous Path: derive glow state (0–3) for Color/River panel borders
  const isHandBetPlaced = handBetCount > 0 && !killSwitchActive;
  const isRankBetPlaced = rankBetCount > 0;
  const isRankHovered = hoveredRankRow !== null;

  const luminosityClass = riverWinFlash ?
  'lp-jackpot' :
  sideBetGateOpen ?
  'lp-rank-placed' :
  isRankHovered ?
  'lp-rank-hover' :
  isHandBetPlaced ?
  'lp-hand-placed' :
  'lp-dormant';

  // All 7 rank slots are available when kill-switch is off (any rank can win regardless of hand selection)
  const activeHandIds = Object.keys(pHandBets).map(Number);

  // Max rank slots: 1 hand = 1 slot, 2 hands = 2 slots (only when 1–2 hands selected)
  const maxRankSlots = handBetCount === 1 ? 1 : handBetCount === 2 ? 2 : 0;

  // Phase Lock: exactly 2 hand bets + at least 1 rank bet → finalize selection, lock remaining hands
  const phaseLockActive = handBetCount === 2 && isRankBetPlaced && !killSwitchActive;
  const handBetsLockedByRanks = phaseLockActive;
  const maxHandBetsAllowed = MAX_HAND_BETS;

  // Snowball cap values for active player
  const totalHandBetAmount = getTotalHandBets(pHandBets);
  const totalRankBetAmount = getTotalRankBets(pRankBets);
  const totalColorBetAmount = getTotalColorBets(pRedBlackBets);

  const totalBet = Object.values(pHandBets).reduce((s, v) => s + v, 0) +
  Object.values(pRedBlackBets).reduce((s, v) => s + v, 0) +
  Object.values(pRankBets).reduce((s, v) => s + v, 0) + (
  pLowHighBet ? pLowHighBet.amount : 0);

  // Total bets across ALL players this round (for casino profit calc)
  const totalAllBets = () => {
    let t = 0;
    for (let i = 0; i < playerCount; i++) {
      t += Object.values(handBets[i] || {}).reduce((s, v) => s + v, 0);
      t += Object.values(redBlackBets[i] || {}).reduce((s, v) => s + v, 0);
      t += Object.values(rankBets[i] || {}).reduce((s, v) => s + v, 0);
      t += lowHighBets[i]?.amount || 0;
    }
    return t;
  };

  // ---- BETTING ----
  const handleHandBet = useCallback((handId) => {
    if (gamePhase !== 'betting') return;
    const existing = (handBets[pid] || {})[handId] || 0;
    const currentCount = Object.keys(handBets[pid] || {}).length;

    // Enforce MAX_HAND_BETS (4)
    if (existing === 0 && currentCount >= MAX_HAND_BETS) {
      setShowHandLimitAlert(true);
      return;
    }

    // Enforce $500 max per card hand
    if (existing + selectedChip > MAX_HAND_BET_AMOUNT) return;

    // Enforce minimum bet
    if (selectedChip < MIN_BET) return;

    // Check insufficient funds
    if (existing === 0 && balance < selectedChip) {
      setShowInsufficientFunds(true);
      return;
    }

    // Right-click / if already bet: remove it
    if (existing > 0 && balance < selectedChip) {
      setHandBets((prev) => {const n = { ...(prev[pid] || {}) };delete n[handId];return { ...prev, [pid]: n };});
      setBalances((b) => {const n = [...b];n[pid] += existing;return n;});
      return;
    }
    if (balance <= 0 || balance < selectedChip) return;

    // Check if this new hand bet will close the side bet gate
    const simulatedHandBets = { ...(handBets[pid] || {}), [handId]: existing + selectedChip };
    const gateWasOpen = isSideBetGateOpen(pHandBets, pRankBets);
    const gateWillClose = gateWasOpen && !isSideBetGateOpen(simulatedHandBets, pRankBets);

    if (gateWillClose) {
      const colorRefund = Object.values(pRedBlackBets).reduce((s, v) => s + v, 0);
      const riverRefund = pLowHighBet?.amount || 0;
      if (colorRefund > 0 || riverRefund > 0) {
        setRedBlackBets((prev) => ({ ...prev, [pid]: {} }));
        setLowHighBets((prev) => ({ ...prev, [pid]: null }));
        setBalances((b) => {const n = [...b];n[pid] += colorRefund + riverRefund - selectedChip;return n;});
        setHandBets((prev) => ({ ...prev, [pid]: simulatedHandBets }));
        setShowAutoTrimToast(true);
        return;
      }
    }

    setHandBets((prev) => ({ ...prev, [pid]: { ...(prev[pid] || {}), [handId]: existing + selectedChip } }));
    setBalances((b) => {const n = [...b];n[pid] -= selectedChip;return n;});

    // Start countdown on first bet
    if (Object.keys(pHandBets).length === 0 && !timerActiveRef.current) {
      timerActiveRef.current = true;
      setCountdownActive(true);
      startTimer(
        timing.bettingClose,
        (remaining) => setCountdownTime(remaining),
        () => {
          timerActiveRef.current = false;
          setCountdownActive(false);
          setTimeout(() => handleDealFlop(), 100);
        }
      );
    }
  }, [gamePhase, balance, selectedChip, pid, handBets, pHandBets, pRankBets, pRedBlackBets, pLowHighBet, timing, startTimer]);

  const handleRemoveHandBet = useCallback((handId) => {
    if (gamePhase !== 'betting') return;
    const existing = (handBets[pid] || {})[handId] || 0;
    if (existing <= 0) return;

    // Remove the entire bet on right-click
    const removeAmount = existing;
    const newHandBetAmount = existing - removeAmount;

    // Build updated hand bets (remove slot entirely if zeroed out)
    const updatedHandBets = { ...(handBets[pid] || {}) };
    if (newHandBetAmount <= 0) {
      delete updatedHandBets[handId];
    } else {
      updatedHandBets[handId] = newHandBetAmount;
    }

    const isLastHandBet = Object.keys(updatedHandBets).length === 0;

    if (isLastHandBet) {
      // No hand bets left — refund everything
      const rankRefund = Object.values(rankBets[pid] || {}).reduce((s, v) => s + v, 0);
      const colorRefund = Object.values(redBlackBets[pid] || {}).reduce((s, v) => s + v, 0);
      const riverRefund = lowHighBets[pid]?.amount || 0;
      const newHandBets = { ...handBets, [pid]: updatedHandBets };
      const newRedBlackBets = { ...redBlackBets, [pid]: {} };
      const newRankBets = { ...rankBets, [pid]: {} };
      const newLowHighBets = { ...lowHighBets, [pid]: null };
      setHandBets(newHandBets);
      setRankBets(newRankBets);
      setRedBlackBets(newRedBlackBets);
      setLowHighBets(newLowHighBets);
      setBalances((b) => {const n = [...b];n[pid] += removeAmount + rankRefund + colorRefund + riverRefund;return n;});
      if (colorRefund > 0 || riverRefund > 0) setShowAutoTrimToast(true);
      checkAndResetIfNoBets(newHandBets, newRedBlackBets, newRankBets, newLowHighBets);
      return;
    }

    // --- Hand bets still remain. Cascade-trim rank/color/river to fit new totals. ---

    // Step 1: enforce rank slot limits and mathematical possibility
    const remainingHandCount = Object.keys(updatedHandBets).length;
    const slotsAllowed = remainingHandCount === 1 ? 1 : 2;
    let rankRefund = 0;
    let updatedRankBets = { ...(rankBets[pid] || {}) };

    // Remove excess rank slots
    while (Object.keys(updatedRankBets).length > slotsAllowed) {
      const keyToRemove = Object.keys(updatedRankBets)[Object.keys(updatedRankBets).length - 1];
      rankRefund += updatedRankBets[keyToRemove];
      delete updatedRankBets[keyToRemove];
    }

    // Step 2: trim rank bet amounts so total rank ≤ total hand
    const newHandTotal = Object.values(updatedHandBets).reduce((s, v) => s + v, 0);
    let newRankTotal = Object.values(updatedRankBets).reduce((s, v) => s + v, 0);
    if (newRankTotal > newHandTotal) {
      let excess = newRankTotal - newHandTotal;
      const rankKeys = Object.keys(updatedRankBets);
      for (let i = rankKeys.length - 1; i >= 0 && excess > 0; i--) {
        const k = rankKeys[i];
        const trim = Math.min(updatedRankBets[k], excess);
        updatedRankBets[k] -= trim;
        if (updatedRankBets[k] <= 0) delete updatedRankBets[k];
        rankRefund += trim;
        excess -= trim;
      }
      newRankTotal = newHandTotal;
    }

    // Step 3: if rank total no longer equals hand total, gate closes → refund all color/river
    const gateStillOpen = isSideBetGateOpen(updatedHandBets, updatedRankBets);
    let colorRefund = 0;
    let riverRefund = 0;
    let updatedColorBets = { ...(redBlackBets[pid] || {}) };
    let updatedRiver = lowHighBets[pid] ? { ...lowHighBets[pid] } : null;

    if (!gateStillOpen) {
      // Gate closed — refund all color and river bets
      colorRefund = Object.values(updatedColorBets).reduce((s, v) => s + v, 0);
      riverRefund = updatedRiver?.amount || 0;
      updatedColorBets = {};
      updatedRiver = null;
    } else {
      // Gate still open — trim color/river to snowball caps
      const newFoundation = newHandTotal + newRankTotal;

      const colorTotal = Object.values(updatedColorBets).reduce((s, v) => s + v, 0);
      if (colorTotal > newFoundation) {
        let excess = colorTotal - newFoundation;
        const colorKeys = Object.keys(updatedColorBets);
        for (let i = colorKeys.length - 1; i >= 0 && excess > 0; i--) {
          const k = colorKeys[i];
          const trim = Math.min(updatedColorBets[k], excess);
          updatedColorBets[k] -= trim;
          if (updatedColorBets[k] <= 0) delete updatedColorBets[k];
          colorRefund += trim;
          excess -= trim;
        }
      }

      const riverAmt = updatedRiver?.amount || 0;
      if (riverAmt > newFoundation) {
        riverRefund = riverAmt - newFoundation;
        if (newFoundation <= 0) {
          updatedRiver = null;
        } else {
          updatedRiver = { ...updatedRiver, amount: newFoundation };
        }
      }
    }

    setHandBets((prev) => ({ ...prev, [pid]: updatedHandBets }));
    setRankBets((prev) => ({ ...prev, [pid]: updatedRankBets }));
    setRedBlackBets((prev) => ({ ...prev, [pid]: updatedColorBets }));
    setLowHighBets((prev) => ({ ...prev, [pid]: updatedRiver }));
    setBalances((b) => {const n = [...b];n[pid] += removeAmount + rankRefund + colorRefund + riverRefund;return n;});
    if (rankRefund > 0 || colorRefund > 0 || riverRefund > 0) setShowAutoTrimToast(true);
  }, [gamePhase, pid, selectedChip, handBets, rankBets, redBlackBets, lowHighBets]);

  const handleRankBet = useCallback((key) => {
    if (gamePhase !== 'betting') return;
    const existing = (rankBets[pid] || {})[key] || 0;

    // If already bet and player cannot afford to add more, treat as removal — bypass all cap checks
    if (existing > 0 && balance < selectedChip) {
      const remainingRankBets = { ...(rankBets[pid] || {}) };
      delete remainingRankBets[key];
      const gateStillOpen = isSideBetGateOpen(handBets[pid] || {}, remainingRankBets);
      if (!gateStillOpen) {
        const colorRefund = Object.values(redBlackBets[pid] || {}).reduce((s, v) => s + v, 0);
        const riverRefund = lowHighBets[pid]?.amount || 0;
        setRankBets((prev) => ({ ...prev, [pid]: remainingRankBets }));
        setRedBlackBets((prev) => ({ ...prev, [pid]: {} }));
        setLowHighBets((prev) => ({ ...prev, [pid]: null }));
        setBalances((b) => {const n = [...b];n[pid] += existing + colorRefund + riverRefund;return n;});
        if (colorRefund > 0 || riverRefund > 0) setShowAutoTrimToast(true);
      } else {
        setRankBets((prev) => ({ ...prev, [pid]: remainingRankBets }));
        setBalances((b) => {const n = [...b];n[pid] += existing;return n;});
      }
      return;
    }

    // --- ADD intent from here down ---

    // Kill switch: 3–4 hands selected — rank market locked
    if (isKillSwitchActive(Object.keys(handBets[pid] || {}).length)) {
      setRankAlertType('closed');
      setShowRankLimitAlert(true);
      return;
    }

    // Must have at least 1 hand bet to place rank bets
    if (Object.keys(handBets[pid] || {}).length === 0) {
      setRankAlertType('no_hands');
      setShowRankLimitAlert(true);
      return;
    }

    // Rank slot limit: 1 hand = 1 slot, 2 hands = 2 slots
    const currentHandCount = Object.keys(handBets[pid] || {}).length;
    const currentRankSlots = Object.keys(pRankBets).length;
    const slotsAllowed = currentHandCount === 1 ? 1 : 2;
    if (!pRankBets[key] && currentRankSlots >= slotsAllowed) {
      setRankAlertType('limit');
      setShowRankLimitAlert(true);
      return;
    }

    // Snowball Rank Cap: total rank bets ≤ total hand bets (ADD only — moves/removals bypass this)
    if (!checkRankCap(handBets[pid] || {}, rankBets[pid] || {}, selectedChip, false)) {
      setCapAlertType('rank_cap');
      setShowCapAlert(true);
      return;
    }

    // Enforce minimum bet
    if (selectedChip < MIN_BET) return;

    // Insufficient funds to add
    if (balance < selectedChip) {
      setShowInsufficientFunds(true);
      return;
    }
    if (balance <= 0) return;

    setRankBets((prev) => ({ ...prev, [pid]: { ...(prev[pid] || {}), [key]: existing + selectedChip } }));
    setBalances((b) => {const n = [...b];n[pid] -= selectedChip;return n;});
  }, [gamePhase, balance, selectedChip, pid, rankBets, handBets, pRankBets]);

  const handleRemoveRankBet = useCallback((key) => {
    if (gamePhase !== 'betting') return;
    const existing = (rankBets[pid] || {})[key] || 0;
    if (existing <= 0) return;

    const remainingRankBets = { ...(rankBets[pid] || {}) };
    delete remainingRankBets[key];
    const isLastRankBet = !hasRankBet(remainingRankBets);

    // After removing this rank bet, check if the Phase 4 gate is still open
    const gateStillOpen = isSideBetGateOpen(handBets[pid] || {}, remainingRankBets);

    if (!gateStillOpen) {
      // Gate closed: cascade out all color and river bets
      const colorRefund = Object.values(redBlackBets[pid] || {}).reduce((s, v) => s + v, 0);
      const riverRefund = lowHighBets[pid]?.amount || 0;
      setRankBets((prev) => ({ ...prev, [pid]: remainingRankBets }));
      setRedBlackBets((prev) => ({ ...prev, [pid]: {} }));
      setLowHighBets((prev) => ({ ...prev, [pid]: null }));
      setBalances((b) => {const n = [...b];n[pid] += existing + colorRefund + riverRefund;return n;});
      if (colorRefund > 0 || riverRefund > 0) setShowAutoTrimToast(true);
    } else {
      // Gate still open: just remove this rank bet, color/river stay
      setRankBets((prev) => ({ ...prev, [pid]: remainingRankBets }));
      setBalances((b) => {const n = [...b];n[pid] += existing;return n;});
    }
  }, [gamePhase, pid, rankBets, handBets, redBlackBets, lowHighBets]);

  const handleMoveRankBet = useCallback((fromKey, toKey) => {
    if (gamePhase !== 'betting') return;
    if (fromKey === toKey) return;
    const currentRankBets = rankBets[pid] || {};
    const fromAmt = currentRankBets[fromKey] || 0;
    if (fromAmt <= 0) return;

    const currentHandCount = Object.keys(handBets[pid] || {}).length;
    const slotsAllowed = currentHandCount === 1 ? 1 : 2;
    const toAmt = currentRankBets[toKey] || 0;

    // Build the updated rank bets after the move
    const updated = { ...currentRankBets };
    delete updated[fromKey];
    updated[toKey] = toAmt + fromAmt;

    // Check slot count — moving to an empty slot must stay within limit
    const newSlotCount = Object.keys(updated).length;
    if (newSlotCount > slotsAllowed) return;

    // Enforce total rank bets <= total hand bets (amounts don't change on a move, so this always passes)
    const totalHandAmt = getTotalHandBets(handBets[pid] || {});
    const totalRankAmt = Object.values(updated).reduce((s, v) => s + v, 0);
    if (totalRankAmt > totalHandAmt) return;

    setRankBets((prev) => ({ ...prev, [pid]: updated }));
  }, [gamePhase, pid, rankBets, handBets]);

  const handleRedBlackBet = useCallback((key) => {
    if (gamePhase !== 'betting') return;
    const existing = (redBlackBets[pid] || {})[key] || 0;

    // Removal path: existing bet + insufficient funds to add more → refund and remove
    if (existing > 0 && balance < selectedChip) {
      setRedBlackBets((prev) => {const n = { ...(prev[pid] || {}) };delete n[key];return { ...prev, [pid]: n };});
      setBalances((b) => {const n = [...b];n[pid] += existing;return n;});
      return;
    }

    // --- ADD intent from here down ---

    // Kill switch: 3–4 hands selected — color market locked
    if (isKillSwitchActive(Object.keys(handBets[pid] || {}).length)) {
      setCapAlertType('color_locked');
      setShowCapAlert(true);
      return;
    }

    // Phase 4 Gate: Color Board requires rank total === hand total
    if (!isSideBetGateOpen(handBets[pid] || {}, rankBets[pid] || {})) {
      setCapAlertType('color_needs_rank');
      setShowCapAlert(true);
      return;
    }

    // Snowball Color Cap: total color bets ≤ total hand bets + total rank bets (ADD only)
    if (!checkColorCap(handBets[pid] || {}, rankBets[pid] || {}, redBlackBets[pid] || {}, selectedChip)) {
      setCapAlertType('color_cap');
      setShowCapAlert(true);
      return;
    }

    // Enforce minimum bet
    if (selectedChip < MIN_BET) return;

    // Insufficient funds to add
    if (balance < selectedChip) {
      setShowInsufficientFunds(true);
      return;
    }
    if (balance <= 0) return;

    setRedBlackBets((prev) => ({ ...prev, [pid]: { ...(prev[pid] || {}), [key]: existing + selectedChip } }));
    setBalances((b) => {const n = [...b];n[pid] -= selectedChip;return n;});
  }, [gamePhase, balance, selectedChip, pid, redBlackBets, handBets, rankBets]);

  const handleRemoveRedBlackBet = useCallback((key) => {
    if (gamePhase !== 'betting') return;
    const existing = (redBlackBets[pid] || {})[key] || 0;
    if (existing <= 0) return;
    setRedBlackBets((prev) => {const n = { ...(prev[pid] || {}) };delete n[key];return { ...prev, [pid]: n };});
    setBalances((b) => {const n = [...b];n[pid] += existing;return n;});
  }, [gamePhase, pid, redBlackBets]);

  const handleLowHighBet = useCallback((type) => {
    if (gamePhase !== 'lowHighBetting') return;
    const currentRiverAmt = pLowHighBet?.amount || 0;

    // Phase 4 Gate: River requires rank total === hand total
    if (!isSideBetGateOpen(handBets[pid] || {}, rankBets[pid] || {})) {
      setCapAlertType('river_needs_rank');
      setShowCapAlert(true);
      return;
    }

    // Snowball River Cap: river bet ≤ total hand + rank + color
    if (!checkRiverCap(handBets[pid] || {}, rankBets[pid] || {}, redBlackBets[pid] || {}, currentRiverAmt, selectedChip)) {
      setCapAlertType('river_cap');
      setShowCapAlert(true);
      return;
    }

    // Also enforce the legacy board-total cap (River ≤ board total)
    const boardBet = Object.values(handBets[pid] || {}).reduce((s, v) => s + v, 0) +
    Object.values(redBlackBets[pid] || {}).reduce((s, v) => s + v, 0) +
    Object.values(rankBets[pid] || {}).reduce((s, v) => s + v, 0);
    const current = pLowHighBet && pLowHighBet.type === type ? pLowHighBet.amount : 0;
    const remaining = boardBet - current;
    if (remaining <= 0) return;
    const addAmount = Math.min(selectedChip, remaining);

    if (balance <= 0 || balance < addAmount) return;
    setLowHighBets((prev) => ({ ...prev, [pid]: { type, amount: (prev[pid]?.type === type ? prev[pid].amount : 0) + addAmount } }));
    setBalances((b) => {const n = [...b];n[pid] -= addAmount;return n;});
  }, [gamePhase, balance, selectedChip, handBets, redBlackBets, rankBets, pLowHighBet, pid]);

  const handleRemoveLowHighBet = useCallback(() => {
    // Can only remove Low/High bet during lowHighBetting phase (after turn, before river)
    if (gamePhase !== 'lowHighBetting') return;
    if (!pLowHighBet || pLowHighBet.amount <= 0) return;
    setBalances((b) => {const n = [...b];n[pid] += pLowHighBet.amount;return n;});
    setLowHighBets((prev) => ({ ...prev, [pid]: null }));
  }, [gamePhase, pid, pLowHighBet]);

  // Drag-drop: move a chip from one hand to another, or back to bank
  const handleDropChip = useCallback((fromHandId, toHandId, dragPid) => {
    if (gamePhase !== 'betting') return;
    const fromAmt = (handBets[dragPid] || {})[fromHandId] || 0;
    if (fromAmt <= 0) return;

    if (toHandId === 'bank') {
      const remainingHandBets = { ...(handBets[dragPid] || {}) };
      delete remainingHandBets[fromHandId];
      const isLastHandBet = Object.keys(remainingHandBets).length === 0;

      if (isLastHandBet) {
        const rankRefund = Object.values(rankBets[dragPid] || {}).reduce((s, v) => s + v, 0);
        const colorRefund = Object.values(redBlackBets[dragPid] || {}).reduce((s, v) => s + v, 0);
        const riverRefund = lowHighBets[dragPid]?.amount || 0;
        setHandBets((prev) => ({ ...prev, [dragPid]: remainingHandBets }));
        setRankBets((prev) => ({ ...prev, [dragPid]: {} }));
        setRedBlackBets((prev) => ({ ...prev, [dragPid]: {} }));
        setLowHighBets((prev) => ({ ...prev, [dragPid]: null }));
        setBalances((b) => {const n = [...b];n[dragPid] += fromAmt + rankRefund + colorRefund + riverRefund;return n;});
      } else {
        const remainingHandCount = Object.keys(remainingHandBets).length;
        const slotsAllowed = remainingHandCount === 1 ? 1 : 2;
        let rankRefund = 0;
        let updatedRankBets = { ...(rankBets[dragPid] || {}) };

        while (Object.keys(updatedRankBets).length > slotsAllowed) {
          const keyToRemove = Object.keys(updatedRankBets)[Object.keys(updatedRankBets).length - 1];
          rankRefund += updatedRankBets[keyToRemove];
          delete updatedRankBets[keyToRemove];
        }

        const newHandTotal = Object.values(remainingHandBets).reduce((s, v) => s + v, 0);
        const newRankTotal = Object.values(updatedRankBets).reduce((s, v) => s + v, 0);
        const newFoundation = newHandTotal + newRankTotal;

        let colorRefund = 0;
        let updatedColorBets = { ...(redBlackBets[dragPid] || {}) };
        const colorTotal = Object.values(updatedColorBets).reduce((s, v) => s + v, 0);
        if (colorTotal > newFoundation) {
          let excess = colorTotal - newFoundation;
          const colorKeys = Object.keys(updatedColorBets);
          for (let i = colorKeys.length - 1; i >= 0 && excess > 0; i--) {
            const k = colorKeys[i];
            const trim = Math.min(updatedColorBets[k], excess);
            updatedColorBets[k] -= trim;
            if (updatedColorBets[k] <= 0) delete updatedColorBets[k];
            colorRefund += trim;
            excess -= trim;
          }
        }

        let riverRefund = 0;
        let updatedRiver = lowHighBets[dragPid] ? { ...lowHighBets[dragPid] } : null;
        const riverAmt = updatedRiver?.amount || 0;
        if (riverAmt > newFoundation) {
          riverRefund = riverAmt - newFoundation;
          if (newFoundation <= 0) {
            updatedRiver = null;
          } else {
            updatedRiver = { ...updatedRiver, amount: newFoundation };
          }
        }

        setHandBets((prev) => {const n = { ...(prev[dragPid] || {}) };delete n[fromHandId];return { ...prev, [dragPid]: n };});
        setRankBets((prev) => ({ ...prev, [dragPid]: updatedRankBets }));
        setRedBlackBets((prev) => ({ ...prev, [dragPid]: updatedColorBets }));
        setLowHighBets((prev) => ({ ...prev, [dragPid]: updatedRiver }));
        setBalances((b) => {const n = [...b];n[dragPid] += fromAmt + rankRefund + colorRefund + riverRefund;return n;});
        if (colorRefund > 0 || riverRefund > 0) setShowAutoTrimToast(true);
      }
    } else {
      // Move entire bet from fromHandId to toHandId — do NOT add to existing, just relocate
      const updatedHandBets = { ...(handBets[dragPid] || {}) };
      delete updatedHandBets[fromHandId];
      updatedHandBets[toHandId] = fromAmt;

      const remainingHandCount = Object.keys(updatedHandBets).length;
      const slotsAllowed = remainingHandCount === 1 ? 1 : remainingHandCount === 2 ? 2 : 0;

      let rankRefund = 0;
      let updatedRankBets = { ...(rankBets[dragPid] || {}) };

      // Trim excess rank slots (e.g. moved 2 hands onto 1, now only 1 slot allowed)
      while (Object.keys(updatedRankBets).length > slotsAllowed) {
        const keyToRemove = Object.keys(updatedRankBets)[Object.keys(updatedRankBets).length - 1];
        rankRefund += updatedRankBets[keyToRemove];
        delete updatedRankBets[keyToRemove];
      }

      // Trim rank amounts so total rank ≤ total hand
      const newHandTotal = Object.values(updatedHandBets).reduce((s, v) => s + v, 0);
      let newRankTotal = Object.values(updatedRankBets).reduce((s, v) => s + v, 0);
      if (newRankTotal > newHandTotal) {
        let excess = newRankTotal - newHandTotal;
        const rankKeys = Object.keys(updatedRankBets);
        for (let i = rankKeys.length - 1; i >= 0 && excess > 0; i--) {
          const k = rankKeys[i];
          const trim = Math.min(updatedRankBets[k], excess);
          updatedRankBets[k] -= trim;
          if (updatedRankBets[k] <= 0) delete updatedRankBets[k];
          rankRefund += trim;
          excess -= trim;
        }
        newRankTotal = newHandTotal;
      }

      // Check if gate still open after move; if not, refund color/river
      const gateStillOpen = isSideBetGateOpen(updatedHandBets, updatedRankBets);
      let colorRefund = 0;
      let riverRefund = 0;
      let updatedColorBets = { ...(redBlackBets[dragPid] || {}) };
      let updatedRiver = lowHighBets[dragPid] ? { ...lowHighBets[dragPid] } : null;

      if (!gateStillOpen) {
        colorRefund = Object.values(updatedColorBets).reduce((s, v) => s + v, 0);
        riverRefund = updatedRiver?.amount || 0;
        updatedColorBets = {};
        updatedRiver = null;
      }

      setHandBets((prev) => ({ ...prev, [dragPid]: updatedHandBets }));
      setRankBets((prev) => ({ ...prev, [dragPid]: updatedRankBets }));
      setRedBlackBets((prev) => ({ ...prev, [dragPid]: updatedColorBets }));
      setLowHighBets((prev) => ({ ...prev, [dragPid]: updatedRiver }));
      if (rankRefund > 0 || colorRefund > 0 || riverRefund > 0) {
        setBalances((b) => {const n = [...b];n[dragPid] += rankRefund + colorRefund + riverRefund;return n;});
        setShowAutoTrimToast(true);
      }
    }
  }, [gamePhase, handBets, rankBets, redBlackBets, lowHighBets]);

  // Helper: check if ALL players have zero bets and reset board if timer is active
  const checkAndResetIfNoBets = (updatedHandBets, updatedRedBlackBets, updatedRankBets, updatedLowHighBets) => {
    const anyBetsRemain = Array.from({ length: playerCount }, (_, i) => i).some((i) => {
      return (
        Object.keys(updatedHandBets[i] || {}).length > 0 ||
        Object.keys(updatedRedBlackBets[i] || {}).length > 0 ||
        Object.keys(updatedRankBets[i] || {}).length > 0 ||
        (updatedLowHighBets[i]?.amount || 0) > 0);

    });
    if (!anyBetsRemain && timerActiveRef.current) {
      stopTimer();
      timerActiveRef.current = false;
      setCountdownActive(false);
      setCountdownTime(0);
      setDeck(getSecureRandomBoard());
      setDeckIndex(0);
      setCommunityCards([]);
      setLeadingHandIds([]);
      setWinnerHandIds([]);
      setWinningRedBlack([]);
      setWinningLowHigh(null);
      setWinningRank(null);
      setLeadingRank(null);
      setDealerMessage("Phase 1 — Texas Hold'em is open for play. Phase 2 — Place Hand, Rank, and Color bets now.");
    }
  };

  const clearBets = () => {
    const riverRefund = pLowHighBet?.amount || 0;
    const refund = Object.values(pHandBets).reduce((s, v) => s + v, 0) +
    Object.values(pRedBlackBets).reduce((s, v) => s + v, 0) +
    Object.values(pRankBets).reduce((s, v) => s + v, 0) +
    riverRefund;
    setBalances((b) => {const n = [...b];n[pid] += refund;return n;});
    const newHandBets = { ...handBets, [pid]: {} };
    const newRedBlackBets = { ...redBlackBets, [pid]: {} };
    const newRankBets = { ...rankBets, [pid]: {} };
    const newLowHighBets = { ...lowHighBets, [pid]: null };
    setHandBets(newHandBets);
    setRedBlackBets(newRedBlackBets);
    setRankBets(newRankBets);
    setLowHighBets(newLowHighBets);
    checkAndResetIfNoBets(newHandBets, newRedBlackBets, newRankBets, newLowHighBets);
  };

  // ---- GAME FLOW ----
  const handleDealFlop = useCallback(() => {
    if (gamePhase !== 'betting') return;
    stopTimer();
    setCountdownActive(false);
    timerActiveRef.current = false;

    const board5 = getSecureRandomBoard();
    const flop = [board5[0], board5[1], board5[2]];
    setCommunityCards(flop);
    setDeck(board5);
    setDeckIndex(3);

    const leader = findLeadingHand(flop);
    setLeadingHandIds(leader ? leader.handIds : []);
    setLeadingRank(leader ? leader.handResult.name : null);

    const leaderHand = leader ? FIXED_HANDS.find((h) => h.id === leader.handIds[0]) : null;
    const leaderCards = leaderHand ? leaderHand.cards.map((c) => `${c.rank}${SUITS[c.suit]}`).join(' & ') : '';
    setDealerMessage(
      leader ?
      `Flop: ${flop.map(cardDisplay).join(' ')} — ${leaderCards} leads (${leader.handResult.name})` :
      `Flop: ${flop.map(cardDisplay).join(' ')}`
    );
    setGamePhase('flop');
  }, [gamePhase, stopTimer]);

  const handleDealTurn = useCallback(() => {
    if (gamePhase !== 'flop') return;
    const turnCard = deck[deckIndex];
    const newComm = [...communityCards, turnCard];
    setCommunityCards(newComm);
    setDeckIndex((i) => i + 1);

    const leader = findLeadingHand(newComm);
    setLeadingHandIds(leader ? leader.handIds : []);
    setLeadingRank(leader ? leader.handResult.name : null);

    const leaderHand = leader ? FIXED_HANDS.find((h) => h.id === leader.handIds[0]) : null;
    const leaderCards = leaderHand ? leaderHand.cards.map((c) => `${c.rank}${SUITS[c.suit]}`).join(' & ') : '';

    setDealerMessage(
      `Turn: ${cardDisplay(turnCard)}${leaderCards ? ` — ${leaderCards} leads (${leader.handResult.name})` : ''} — River bet now open!`
    );
    setGamePhase('lowHighBetting');

    // Start countdown display for river betting window
    timerActiveRef.current = true;
    setCountdownActive(true);
    startTimer(
      timing.riverBetting,
      (remaining) => setCountdownTime(remaining),
      () => {
        timerActiveRef.current = false;
        setCountdownActive(false);
        setTimeout(() => handleDealRiverRef.current?.(), 100);
      }
    );
  }, [gamePhase, deck, deckIndex, communityCards, timing, startTimer]);

  const handleDealRiver = useCallback(() => {
    if (gamePhase !== 'lowHighBetting') return;
    stopTimer();
    setCountdownActive(false);
    timerActiveRef.current = false;

    const riverCard = deck[deckIndex];
    const newComm = [...communityCards, riverCard];
    setCommunityCards(newComm);
    setDeckIndex((i) => i + 1);

    const leader = findLeadingHand(newComm);
    setLeadingHandIds([]);
    setLeadingRank(null);
    setWinnerHandIds(leader ? leader.handIds : []);
    setWinningRank(leader?.handResult?.name ?? null);

    const winRB = resolveRedBlack(newComm);
    const winLH = resolveLowHigh(riverCard);
    setWinningRedBlack(winRB);
    setWinningLowHigh(winLH);

    const reds = newComm.filter((c) => cardColor(c) === 'red').length;
    const blacks = newComm.length - reds;
    const leaderHand = leader && !leader.communityBoardWin ? FIXED_HANDS.find((h) => h.id === leader.handIds[0]) : null;
    const leaderCards = leaderHand ? leaderHand.cards.map((c) => `${c.rank}${SUITS[c.suit]}`).join(' & ') : '';

    setDealerMessage(
      leader?.communityBoardWin ?
      `Board Wins! All Hand bets lose. Board: ${reds}R / ${blacks}B — River: ${winLH}` :
      leader ?
      `Winner: ${leaderCards} — ${leader.handResult.name}! Board: ${reds}R / ${blacks}B — River: ${winLH}` :
      `River: ${cardDisplay(riverCard)}`
    );
    setGamePhase('river');

    const leaderResult = leader?.handResult;
    const snapHandBets = { ...handBets };
    const snapRedBlackBets = { ...redBlackBets };
    const snapRankBets = { ...rankBets };
    const snapLowHighBets = { ...lowHighBets };

    // Settlement with reveal delay
    timerActiveRef.current = true;
    setCountdownActive(false);
    setTimeout(() => {
      console.log('[Observer] setTimeout fired, settleRef.current:', !!settleRef.current);
      settleRef.current && settleRef.current(newComm, leader, winRB, winLH, leaderHand, leaderResult, snapHandBets, snapRedBlackBets, snapRankBets, snapLowHighBets);
    }, timing.riverReveal * 1000);
  }, [gamePhase, deck, deckIndex, communityCards, handBets, redBlackBets, rankBets, lowHighBets, timing, stopTimer]);

  // Keep ref in sync so handleDealTurn can call the latest version without circular dependency
  handleDealRiverRef.current = handleDealRiver;

  const settle = (finalComm, leader, winRB, winLH, leaderHand, handResult, snapHandBets, snapRedBlackBets, snapRankBets, snapLowHighBets) => {
    // Use centralized payouts (imported at top of file)

    let totalBetsAllPlayers = 0;
    let totalWinningsAllPlayers = 0;
    const playerWinnings = [];

    const playerPayouts = [];

    for (let i = 0; i < playerCount; i++) {
      const ph = snapHandBets[i] || {};
      const prb = snapRedBlackBets[i] || {};
      const prk = snapRankBets[i] || {};
      const plh = snapLowHighBets[i] || null;

      let w = 0;
      const wins = [];

      // Carded hand bets
      if (leader) {
        const numWinners = leader.handIds.length;
        leader.handIds.forEach((wid) => {
          const bet = ph[wid] || 0;
          if (bet > 0) {
            const hand = FIXED_HANDS.find((h) => h.id === wid);
            const effectiveRatio = calculateTiePayout(hand.payout, numWinners);
            const payout = calculatePayout(bet, effectiveRatio);
            w += payout;
            const oddsLabel = numWinners > 1 ?
            `${effectiveRatio.toFixed(2)}:1 (tie/${numWinners})` :
            `${hand.payout}:1`;
            wins.push({
              label: `Hand ${wid}`,
              bet,
              odds: oddsLabel,
              payout
            });
          }
        });
      }

      // Red/Black
      winRB.forEach((key) => {
        const bet = prb[key] || 0;
        if (bet > 0) {
          const ratio = COLOR_BOARD_PAYOUTS[key];
          const payout = calculatePayout(bet, ratio);
          w += payout;
          wins.push({
            label: key,
            bet,
            odds: `${ratio}:1`,
            payout
          });
        }
      });

      // Low/High
      if (plh && winLH === plh.type) {
        const payout = calculatePayout(plh.amount, LOW_HIGH_PAYOUT);
        w += payout;
        wins.push({
          label: plh.type,
          bet: plh.amount,
          odds: `${LOW_HIGH_PAYOUT}:1`,
          payout
        });
        if (i === activePlayer) triggerRiverWin();
      }

      // River hedge is not a real bet type — ignore any flag

      // Rank bets — Open Win Rule (v2, 2026-05-09):
      // A rank bet pays if ANY hand wins the round by the player's rank bet.
      // The player does NOT need to have bet on the winning hand.
      // Payout odds are tied to the ACTUAL winning hand's per-hand rank odds.
      if (leader && !leader.communityBoardWin && Object.keys(prk).length > 0) {
        // Find the actual winning hand and its rank
        let actualWinnerHandId = null;
        let actualWinnerRankName = null;
        for (const wid of leader.handIds) {
          const hand = FIXED_HANDS.find((h) => h.id === wid);
          if (!hand) continue;
          const result = evaluateBestHand(hand.cards, finalComm);
          if (result) { actualWinnerHandId = wid; actualWinnerRankName = result.name; break; }
        }

        if (actualWinnerRankName) {
          for (const [rankKey, rankBetAmt] of Object.entries(prk)) {
            if (rankBetAmt <= 0) continue;
            if (rankKey === actualWinnerRankName) {
              // Pay at the actual winning hand's per-hand rank odds
              const ratio = getPerHandRankPayout(actualWinnerHandId, rankKey);
              if (ratio !== null) {
                const payout = calculatePayout(rankBetAmt, ratio);
                w += payout;
                wins.push({
                  label: rankKey,
                  bet: rankBetAmt,
                  odds: `${ratio}:1`,
                  payout
                });
              }
            }
          }
        }
      }

      // Total bets for this player
      const playerTotalBet =
      Object.values(ph).reduce((s, v) => s + v, 0) +
      Object.values(prb).reduce((s, v) => s + v, 0) +
      Object.values(prk).reduce((s, v) => s + v, 0) + (
      plh?.amount || 0);

      totalBetsAllPlayers += playerTotalBet;
      totalWinningsAllPlayers += w;
      // Push total payout (balance update will add this to current balance)
      playerWinnings.push(w);

      // Build payout display data (net = payout - bet)
      playerPayouts.push({
        wins,
        totalBet: playerTotalBet,
        netWin: w - playerTotalBet
      });
    }

    // Store previous bets for repeat functionality (excluding low/high)
    setPreviousBets({
      handBets: snapHandBets,
      redBlackBets: snapRedBlackBets,
      rankBets: snapRankBets,
      totalBet: totalBetsAllPlayers
    });

    // Update all player balances (add payouts received)
    setBalances((prev) => {
      const n = [...prev];
      for (let i = 0; i < playerCount; i++) {
        // Current balance already had bets deducted, so just add payout back
        n[i] = Math.max(0, n[i] + playerWinnings[i]);
      }
      return n;
    });

    // Update player stats
    setPlayerStats((prev) => {
      const updated = { ...prev };
      for (let i = 0; i < playerCount; i++) {
        const playerBet = Object.values(snapHandBets[i] || {}).reduce((s, v) => s + v, 0) +
        Object.values(snapRedBlackBets[i] || {}).reduce((s, v) => s + v, 0) +
        Object.values(snapRankBets[i] || {}).reduce((s, v) => s + v, 0) + (
        snapLowHighBets[i]?.amount || 0);

        const playerWin = playerWinnings[i] || 0;
        const multiplier = playerBet > 0 ? playerWin / playerBet : 0;

        const prev_i = updated[i] || { totalBets: 0, totalWins: 0, roundsPlayed: 0, roundsWon: 0, highestMultiplier: 0, highestBalance: null, highestBalanceRound: null, lowestBalance: null, lowestBalanceRound: null };
        const postRoundBalance = Math.max(0, (balances[i] ?? 0) + playerWin);
        const currentRound = roundsPlayed + 1;
        const newHighest = prev_i.highestBalance === null || postRoundBalance > prev_i.highestBalance;
        const newLowest = prev_i.lowestBalance === null || postRoundBalance < prev_i.lowestBalance;
        updated[i] = {
          totalBets: prev_i.totalBets + playerBet,
          totalWins: prev_i.totalWins + playerWin,
          roundsPlayed: prev_i.roundsPlayed + (playerBet > 0 ? 1 : 0),
          roundsWon: prev_i.roundsWon + (playerWin > playerBet ? 1 : 0),
          highestMultiplier: Math.max(prev_i.highestMultiplier, multiplier),
          highestBalance: newHighest ? postRoundBalance : prev_i.highestBalance,
          highestBalanceRound: newHighest ? currentRound : prev_i.highestBalanceRound,
          lowestBalance: newLowest ? postRoundBalance : prev_i.lowestBalance,
          lowestBalanceRound: newLowest ? currentRound : prev_i.lowestBalanceRound
        };
      }
      return updated;
    });

    // Casino profit = total bets - total winnings paid out
    const roundProfit = totalBetsAllPlayers - totalWinningsAllPlayers;
    setCasinoProfit((p) => p + roundProfit);
    setRoundsPlayed((r) => r + 1);

    setGamePhase('winner');

    // Delay display window by 1 second
    setTimeout(() => {
      setLastWinInfo({
        playerPayouts,
        playerCount
      });
      setDisplayWindowVisible(true);
    }, 1000);

    // ── History entry — only real settled outcomes ──────────────────────────
    // colorResult: show the actual winning color result from winRB
    // e.g. "5R", "4B", "3R" — whichever key has the highest count from the resolved winners.
    // If no color bet wins, show the majority color count as informational display only.
    const reds = finalComm.filter((c) => cardColor(c) === 'red').length;
    const blacks = finalComm.length - reds;

    // Build a display string: show all winning color results if any, else show the board split
    let colorResult;
    if (winRB && winRB.length > 0) {
      // Show the highest-tier winning result (e.g. if 5R won, show "5R"; if 3B won show "3B")
      // winRB is already sorted by resolveRedBlack — last element is highest tier
      colorResult = winRB[winRB.length - 1];
    } else {
      // No color winner: display the board split as informational
      colorResult = reds >= blacks ? `${reds}R` : `${blacks}B`;
    }

    const isBoardWin = leader?.communityBoardWin === true;
    const winnerHandA = !isBoardWin && leader?.handIds?.length >= 1 ?
    FIXED_HANDS.find((h) => h.id === leader.handIds[0]) :
    null;
    const winnerHandB = !isBoardWin && leader?.handIds?.length >= 2 ?
    FIXED_HANDS.find((h) => h.id === leader.handIds[1]) :
    null;

    // ── Observer data capture ────────────────────────────────────────────────
    const redsCount = finalComm.filter(c => cardColor(c) === 'red').length;
    const activePlayerHandBets = snapHandBets[activePlayer] || {};
    const activePlayerColorBets = snapRedBlackBets[activePlayer] || {};
    const activePlayerRankBets = snapRankBets[activePlayer] || {};
    const activePlayerLowHighBet = snapLowHighBets[activePlayer] || null;
    const activePlayerTotalBet = Object.values(activePlayerHandBets).reduce((s, v) => s + v, 0) +
      Object.values(activePlayerColorBets).reduce((s, v) => s + v, 0) +
      Object.values(activePlayerRankBets).reduce((s, v) => s + v, 0) +
      (activePlayerLowHighBet?.amount || 0);
    const activePlayerPayout = playerWinnings[activePlayer] || 0;
    const activeBal = balances[activePlayer] ?? 0;
    const observerKey = Date.now() + '_' + Math.random();
    const roundData = {
      roundId,
      observerKey,
      sessionId: 'live_' + Date.now(),
      communityCards: finalComm.map(c => ({ rank: c.rank, suit: SUITS[c.suit] })),
      winnerHandIds: leader?.handIds || [],
      winningRank: handResult?.name || null,
      winningColors: winRB || [],
      winningLowHigh: winLH || null,
      isBoardWin: leader?.communityBoardWin || false,
      handBets: activePlayerHandBets,
      rankBets: activePlayerRankBets,
      colorBets: activePlayerColorBets,
      lowHighBet: activePlayerLowHighBet,
      killSwitchActive: isKillSwitchActive(Object.keys(activePlayerHandBets).length),
      handBetCount: Object.keys(activePlayerHandBets).filter(k => (activePlayerHandBets[k] || 0) > 0).length,
      totalBet: activePlayerTotalBet,
      totalPayout: activePlayerPayout,
      netResult: activePlayerPayout - activePlayerTotalBet,
      balanceBefore: activeBal,
      balanceAfter: Math.max(0, activeBal + activePlayerPayout),
      redsCount,
      blacksCount: finalComm.length - redsCount,
      riverCard: finalComm.length > 0 ? finalComm[finalComm.length-1]?.rank + SUITS[finalComm[finalComm.length-1]?.suit] : null,
    };
    console.log('[Observer] settle() dispatching round via ref, roundId:', roundId, 'handler present:', !!onRoundSettledRef.current);
    if (onRoundSettledRef.current) onRoundSettledRef.current(roundData);
    // ─────────────────────────────────────────────────────────────────────────

    setHistory((prev) => [{
      roundId,
      isBoardWin,
      handRank: handResult?.name || 'No Hand',
      cardsA: winnerHandA?.cards || [],
      cardsB: winnerHandB?.cards || [],
      colorResult,
      colorWinners: winRB,
      lowHighResult: winLH || '-'
    }, ...prev]);

    // Auto-progression to new round is handled by useEffect watching gamePhase
    timerActiveRef.current = true;
    setCountdownActive(false);
  };
  settleRef.current = settle;

  const handleResetGame = () => {
    setBalances(Array(10).fill(STARTING_BALANCE));
    setHandBets({});
    setRedBlackBets({});
    setRankBets({});
    setLowHighBets({});
    setCommunityCards([]);
    setLeadingHandIds([]);
    setWinnerHandIds([]);
    setWinningRedBlack([]);
    setWinningLowHigh(null);
    setWinningRank(null);
    setLeadingRank(null);
    setLastWinInfo(null);
    setDeck(getSecureRandomBoard());
    setDeckIndex(0);
    setRoundId(1);
    setRoundsPlayed(0);
    setCasinoProfit(0);
    setHistory([]);
    setPlayerStats({});
    setActivePlayer(0);
    setPlayerCount(1);
    setShowPlayerSelector(true);
    setDealerMessage("Bets open — Place Hand, Rank & Color bets now.");
    setGamePhase('betting');
  };

  const handleNewRound = useCallback(() => {
    stopTimer();
    setCountdownActive(false);
    timerActiveRef.current = false;

    setHandBets({});
    setRedBlackBets({});
    setRankBets({});
    setLowHighBets({});
    setCommunityCards([]);
    setLeadingHandIds([]);
    setWinnerHandIds([]);
    setWinningRedBlack([]);
    setWinningLowHigh(null);
    setWinningRank(null);
    setLeadingRank(null);
    setLastWinInfo(null);
    setDisplayWindowVisible(false);
    setRepeatUsedThisRound(false);
    setDeck(getSecureRandomBoard());
    setDeckIndex(0);
    setRoundId((r) => r + 1);
    setDealerMessage("Bets open — Place Hand, Rank & Color bets now.");
    setGamePhase('betting');
    setActivePlayer(0);
    // NOTE: history is intentionally NOT cleared here — it accumulates across rounds
  }, [stopTimer]);

  const handleRepeatBets = () => {
    if (!previousBets) return;

    // Check if all players have sufficient funds for previous bets
    for (let i = 0; i < playerCount; i++) {
      const playerBet =
      Object.values(previousBets.handBets[i] || {}).reduce((s, v) => s + v, 0) +
      Object.values(previousBets.redBlackBets[i] || {}).reduce((s, v) => s + v, 0) +
      Object.values(previousBets.rankBets[i] || {}).reduce((s, v) => s + v, 0);
      if ((balances[i] || STARTING_BALANCE) < playerBet) {
        setShowInsufficientFunds(true);
        return;
      }
    }

    setHandBets(previousBets.handBets);
    setRedBlackBets(previousBets.redBlackBets);
    setRankBets(previousBets.rankBets);
    setRepeatUsedThisRound(true);
    // Deduct from balances
    setBalances((b) => {
      const n = [...b];
      for (let i = 0; i < playerCount; i++) {
        const playerBet =
        Object.values(previousBets.handBets[i] || {}).reduce((s, v) => s + v, 0) +
        Object.values(previousBets.redBlackBets[i] || {}).reduce((s, v) => s + v, 0) +
        Object.values(previousBets.rankBets[i] || {}).reduce((s, v) => s + v, 0);
        n[i] = Math.max(0, n[i] - playerBet);
      }
      return n;
    });
  };

  // Auto-progression: Flop → Turn
  useEffect(() => {
    if (gamePhase !== 'flop') return;
    const timer = setTimeout(() => {
      handleDealTurn();
    }, timing.flopReveal * 1000);
    return () => clearTimeout(timer);
  }, [gamePhase, timing.flopReveal, handleDealTurn]);

  // Auto-progression: River → New Round
  useEffect(() => {
    if (gamePhase !== 'winner') return;
    const timer = setTimeout(() => {
      handleNewRound();
    }, timing.endOfRound * 1000);
    return () => clearTimeout(timer);
  }, [gamePhase, timing.endOfRound, handleNewRound]);

  return (
    <div className="velvet-board h-screen w-screen overflow-hidden text-white flex flex-col">

      {/* Countdown Clock */}
      <CountdownClock timeRemaining={countdownTime} isActive={countdownActive} phase={gamePhase} />

      {/* Alerts */}
      <HandBetLimitAlert
        isOpen={showHandLimitAlert}
        onClose={() => setShowHandLimitAlert(false)} />
      
      <RankBetLimitAlert
        isOpen={showRankLimitAlert}
        onClose={() => setShowRankLimitAlert(false)}
        currentHandBets={handBetCount}
        alertType={rankAlertType}
        maxRankSlots={maxRankSlots} />
      
      <RankBetLimitAlert
        isOpen={showCapAlert}
        onClose={() => setShowCapAlert(false)}
        alertType={capAlertType}
        currentHandBets={handBetCount} />
      
      <InsufficientFundsAlert
        isVisible={showInsufficientFunds}
        onClose={() => setShowInsufficientFunds(false)} />
      
      <AutoTrimToast
        isVisible={showAutoTrimToast}
        onHide={() => setShowAutoTrimToast(false)} />
      



      {/* Player Stats Panel */}
      <PlayerStatsPanel
        isOpen={showStatsPanel}
        onClose={() => setShowStatsPanel(false)}
        playerStats={playerStats}
        playerCount={playerCount} />
      

      {/* Molly Simulator */}
      <AnimatePresence>
        {showMollySimulator &&
        <MollySimulator onClose={() => setShowMollySimulator(false)} />
        }
      </AnimatePresence>

      {/* Archetype Battle */}
      <AnimatePresence>
        {showArchetypeBattle &&
        <ArchetypeBattle onClose={() => setShowArchetypeBattle(false)} />
        }
      </AnimatePresence>

      {/* Exploit Hunter */}
      <AnimatePresence>
        {showExploitHunter &&
        <ExploitHunter onClose={() => setShowExploitHunter(false)} />
        }
      </AnimatePresence>

      {/* Compliance Report */}
      <AnimatePresence>
        {showComplianceReport &&
        <RegulatoryComplianceReport onClose={() => setShowComplianceReport(false)} />
        }
      </AnimatePresence>

      {/* Kill-Switch Strategy Test */}
      <AnimatePresence>
        {showKsStrategyTest &&
        <KillSwitchStrategyTest onClose={() => setShowKsStrategyTest(false)} />
        }
      </AnimatePresence>

      {/* Observer — always mounted so observeOn state persists when panel is closed */}
      <Observer
        isOpen={showObserver}
        onClose={() => setShowObserver(false)}
        observeOn={observeOn}
        onObserveToggle={setObserveOn}
        onRoundSettledRef={onRoundSettledRef}
        roundCount={observerRoundCount}
        onRoundCountChange={setObserverRoundCount}
      />

      {/* Game Timing Modal */}
      <GameTimingModal isOpen={showGameTiming} onClose={() => setShowGameTiming(false)} />

      {/* Main Layout: 3 columns, fills remaining height */}
      <div className="flex gap-1.5 p-1.5 flex-1 min-h-0">

        {/* LEFT: History + Jackpots */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-1.5 overflow-hidden">
          <HistoryRail history={history} />
        </div>

        {/* CENTER: Main Game Board */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0 items-center">

          {/* Dealer Announcement — 32px hard lock, no padding, single line only */}
          <div
            style={{
              height: '32px',
              minHeight: '32px',
              maxHeight: '32px',
              width: '100%',
              flexShrink: 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
              borderRadius: '0.5rem',
              border: '1px solid rgba(202,138,4,0.4)',
              background: 'linear-gradient(90deg, rgba(78,47,0,0.5) 0%, rgba(83,37,0,0.5) 100%)',
              boxSizing: 'border-box'
            }}>
            
            <DealerAnnouncement message={dealerMessage} phase={gamePhase} />
          </div>

          {/* Community Cards — expanded canvas for labels, assets stay fixed size */}
          <div
            className="slot-border-dormant"
            style={{
              height: '152px',
              minHeight: '152px',
              maxHeight: '152px',
              width: '100%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              paddingLeft: '1rem',
              paddingRight: '1rem',
              paddingTop: '8px',
              paddingBottom: '8px',
              borderRadius: '0.75rem',
              border: '3px solid',
              background: 'rgba(0,0,0,0.35)',
              boxSizing: 'border-box',
              overflow: 'visible'
            }}>
            
            {/* Logo — left side */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>
              <img src="https://media.base44.com/images/public/69f3a45ad82dff5b772d4de2/2667063a3_image.png" alt="Rapid Fire Texas Hold'em" style={{ width: '72px', height: 'auto', display: 'block', borderRadius: '8px' }} />
            </div>

            <CommunityCards cards={communityCards} phase={gamePhase} />

            {/* Mirror logo — right side */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>
              <img src="https://media.base44.com/images/public/69f3a45ad82dff5b772d4de2/2667063a3_image.png" alt="Rapid Fire Texas Hold'em" style={{ width: '72px', height: 'auto', display: 'block', borderRadius: '8px' }} />
            </div>
          </div>

          {/* Detailed Payout Display */}
          <DetailedPayoutDisplay winInfo={lastWinInfo} playerCount={playerCount} />

          {/* 10 Fixed Hands Grid */}
          <div className="flex-1 min-h-0 w-full flex flex-col justify-center overflow-hidden">
            <div className="grid grid-cols-5 gap-1.5">
              {FIXED_HANDS.map((hand) =>
              <FixedHandCard
                key={hand.id}
                hand={hand}
                isLeading={leadingHandIds.includes(hand.id)}
                isWinner={winnerHandIds.includes(hand.id)}
                communityCards={communityCards}
                betAmount={pHandBets[hand.id] || 0}
                allHandBets={handBets}
                playerCount={playerCount}
                activePlayerId={pid}
                onBet={handleHandBet}
                onRemoveBet={handleRemoveHandBet}
                onDropChip={handleDropChip}
                gamePhase={gamePhase}
                disabled={balance < selectedChip && !pHandBets[hand.id]}
                disabledByConstraint={handBetsLockedByRanks && !pHandBets[hand.id] || handBetCount >= maxHandBetsAllowed && !pHandBets[hand.id]}
                onAttemptLockedBet={() => setShowHandLimitAlert(true)} />

              )}
            </div>
          </div>

          {/* Bottom controls */}
          <div className="flex items-center gap-2 border-t border-yellow-900/40 pt-1.5 flex-shrink-0 w-full">
            {/* Far left: bank drop zone + chip selector */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {gamePhase === 'betting' &&
              <div
                id="bank-drop-zone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const data = e.dataTransfer.getData('text/plain');
                  if (!data) return;
                  try {
                    const parsed = JSON.parse(data);
                    const { from, type, pid: dragPid } = parsed;
                    if (type === 'hand') {
                      handleDropChip(from, 'bank', dragPid);
                    } else if (type === 'rank') {
                      const amt = (rankBets[dragPid] || {})[from] || 0;
                      if (amt > 0) {
                        const remainingRankBets = { ...(rankBets[dragPid] || {}) };
                        delete remainingRankBets[from];
                        const isLastRankBet = !hasRankBet(remainingRankBets);
                        if (isLastRankBet) {
                          const colorRefund = Object.values(redBlackBets[dragPid] || {}).reduce((s, v) => s + v, 0);
                          const riverRefund = lowHighBets[dragPid]?.amount || 0;
                          setRankBets((prev) => ({ ...prev, [dragPid]: remainingRankBets }));
                          setRedBlackBets((prev) => ({ ...prev, [dragPid]: {} }));
                          setLowHighBets((prev) => ({ ...prev, [dragPid]: null }));
                          setBalances((b) => {const n = [...b];n[dragPid] += amt + colorRefund + riverRefund;return n;});
                        } else {
                          setRankBets((prev) => {const n = { ...(prev[dragPid] || {}) };delete n[from];return { ...prev, [dragPid]: n };});
                          setBalances((b) => {const n = [...b];n[dragPid] += amt;return n;});
                        }
                      }
                    } else if (type === 'rb') {
                      const amt = (redBlackBets[dragPid] || {})[from] || 0;
                      if (amt > 0) {
                        setRedBlackBets((prev) => {const n = { ...(prev[dragPid] || {}) };delete n[from];return { ...prev, [dragPid]: n };});
                        setBalances((b) => {const n = [...b];n[dragPid] += amt;return n;});
                      }
                    }
                  } catch (e) {}
                }}
                className="flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-yellow-600/50 bg-yellow-900/20 text-yellow-500/60 text-xs font-bold transition-all hover:border-yellow-400 hover:bg-yellow-900/40"
                title="Drag chip here to refund to bank">
                
                  💰
                </div>
              }
              <span className="text-yellow-400/60 text-xs flex-shrink-0">Chip:</span>
              {CHIP_VALUES.map((v) =>
              <button
                key={v}
                onClick={() => setSelectedChip(v)}
                className={`relative flex-shrink-0 transition-all duration-150 rounded-full border-0 bg-transparent p-0
                    ${selectedChip === v ? 'scale-125 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]' : 'opacity-75 hover:opacity-100 hover:scale-110'}`}
                style={{ lineHeight: 0 }}
              >
                <Chip amount={v} scale={0.72} />
              </button>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Player Bank display — centered */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-yellow-500 bg-black flex-shrink-0">
              <span className="text-yellow-400 text-xs font-black leading-none tracking-wider">P{activePlayer + 1}</span>
              <span className="text-yellow-400 font-black text-lg leading-none tracking-tight" style={{ textShadow: '0 0 8px rgba(251,191,36,0.7)' }}>${(balances[activePlayer] ?? STARTING_BALANCE).toLocaleString()}</span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Clear button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {gamePhase === 'betting' && totalBet > 0 &&
              <button
                onClick={clearBets}
                className="px-3 py-1.5 rounded-lg border border-red-700/50 bg-red-900/30 text-red-300 text-xs font-semibold hover:bg-red-900/50 transition-all">
                
                  Clear
                </button>
              }
            </div>

            {/* Reset Bank — hidden by default, toggled with Ctrl+Alt+B+M */}
            {resetBankVisible && (
              <button
                onClick={() => {
                  setBalances(Array(10).fill(STARTING_BALANCE));
                  setRoundId(1);
                  setCasinoProfit(0);
                  setRoundsPlayed(0);
                }}
                title="Reset all player banks to $10,000 and clear P/L"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-700/50 bg-emerald-900/20 text-emerald-300 text-xs font-bold hover:border-emerald-500 hover:bg-emerald-900/40 transition-all flex-shrink-0">
                ↺ Reset Bank
              </button>
            )}

            {/* Tools */}
            <ToolsMenu onOpenStats={() => setShowStatsPanel(true)} onOpenMollySimulator={() => setShowMollySimulator(true)} onOpenArchetypeBattle={() => setShowArchetypeBattle(true)} onOpenExploitHunter={() => setShowExploitHunter(true)} onOpenComplianceReport={() => setShowComplianceReport(true)} onOpenKsStrategyTest={() => setShowKsStrategyTest(true)} onOpenObserver={() => setShowObserver(true)} onOpenGameTiming={() => setShowGameTiming(true)} toolsVisible={toolbarVisible} />

            {/* Game Rules — far right */}
            <div className="border-l border-yellow-700/20 pl-2 flex-shrink-0">
              <GameRulesModal />
            </div>
          </div>
        </div>

        {/* RIGHT: Rank Bets | Side Bets | Payout Table */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-1.5" style={{ overflow: 'visible' }}>
          {/* Rank Bets panel */}
          <div className="border rounded-xl p-2 flex flex-col slot-border-dormant" style={{ flex: '7 1 0', background: 'rgba(0,0,0,0.45)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)', overflow: 'visible' }}>
            <RankBets
              rankBets={pRankBets}
              allRankBets={rankBets}
              playerCount={playerCount}
              onRankBet={handleRankBet}
              onRemoveRankBet={handleRemoveRankBet}
              onMoveRankBet={handleMoveRankBet}
              gamePhase={gamePhase}
              winningRank={winningRank}
              leadingRank={leadingRank}
              disabled={balance < selectedChip}
              killSwitchActive={killSwitchActive}
              handBetCount={handBetCount}
              maxRankSlots={maxRankSlots}
              rankBetCount={rankBetCount}
              unlockedRanks={new Set()}
              activePlayerId={pid}
              activeHandIds={activeHandIds}
              onAttemptLockedRank={(type) => {
                setRankAlertType(type);
                setShowRankLimitAlert(true);
              }}
              onHoverRankRow={setHoveredRankRow} />
            
          </div>
          {/* Side Bets panel */}
          <div className={`border rounded-xl p-2 flex flex-col slot-border-dormant ${luminosityClass}`} style={{ flex: '5 1 0', background: 'rgba(0,0,0,0.45)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)', overflow: 'visible' }}>
            <SideBets
              communityCards={communityCards}
              allRedBlackBets={redBlackBets}
              allLowHighBets={lowHighBets}
              redBlackBets={pRedBlackBets}
              lowHighBet={pLowHighBet}
              onRedBlackBet={handleRedBlackBet}
              onRemoveRedBlackBet={handleRemoveRedBlackBet}
              onLowHighBet={handleLowHighBet}
              onRemoveLowHighBet={handleRemoveLowHighBet}
              gamePhase={gamePhase}
              winningRedBlack={winningRedBlack}
              winningLowHigh={winningLowHigh}
              disabled={gamePhase === 'betting' ? balance < selectedChip : gamePhase === 'lowHighBetting' ? balance < selectedChip : true}
              killSwitchActive={killSwitchActive}
              rankBetActive={sideBetGateOpen}
              playerCount={playerCount}
              totalInvestment={totalInvestment}
              hoveredRiverType={hoveredRiverType}
              onHoverRiver={setHoveredRiverType}
              riverWinFlash={riverWinFlash}
              selectedChip={selectedChip}
              hoveredRankRow={hoveredRankRow}
              isRankBetPlaced={isRankBetPlaced} />
            
          </div>
        </div>
      </div>
    </div>);

}