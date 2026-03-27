import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FIXED_HANDS, shuffleDeck, DEALER_DECK, findLeadingHand,
  resolveRedBlack, resolveLowHigh, cardColor, isLowCard,
  SUITS, cardDisplay
} from '@/lib/gameEngine';
import FixedHandCard from '@/components/game/FixedHandCard';
import CommunityCards from '@/components/game/CommunityCards';
import SideBets from '@/components/game/SideBets';
import HistoryRail from '@/components/game/HistoryRail';
import DealerAnnouncement from '@/components/game/DealerAnnouncement';
import RankBets from '@/components/game/RankBets';

const STARTING_BALANCE = 1000;
const CHIP_VALUES = [5, 10, 25, 50, 100];
const DEFAULT_CHIP = 10;
const PLAYER_COUNT_OPTIONS = [1, 2, 3, 4, 5];

// Must match PLAYER_CHIP_COLORS in child components
const PLAYER_TAB_STYLES = [
  { active: 'border-yellow-400 bg-yellow-500 text-black',   inactive: 'border-yellow-700/40 bg-yellow-900/20 text-yellow-400' },
  { active: 'border-blue-400 bg-blue-500 text-white',       inactive: 'border-blue-700/40 bg-blue-900/20 text-blue-400'       },
  { active: 'border-pink-400 bg-pink-500 text-white',       inactive: 'border-pink-700/40 bg-pink-900/20 text-pink-400'       },
  { active: 'border-green-400 bg-green-500 text-black',     inactive: 'border-green-700/40 bg-green-900/20 text-green-400'    },
  { active: 'border-orange-400 bg-orange-500 text-black',   inactive: 'border-orange-700/40 bg-orange-900/20 text-orange-400' },
];

// Phases: 'betting' | 'flop' | 'turn' | 'lowHighBetting' | 'river' | 'settlement' | 'winner'
const PHASE_LABELS = {
  betting: 'Place Your Bets',
  flop: 'Flop',
  turn: 'Turn',
  lowHighBetting: 'Low / High Betting Open',
  river: 'River',
  settlement: 'Settling...',
  winner: 'Round Complete',
};

export default function RapidFireGame() {
  const [playerCount, setPlayerCount] = useState(1);
  // balances[i] = balance for player i+1
  const [balances, setBalances] = useState(() => Array(5).fill(STARTING_BALANCE));
  const [selectedChip, setSelectedChip] = useState(DEFAULT_CHIP);
  // handBets[playerId][handId], redBlackBets[playerId][key], rankBets[playerId][key]
  const [handBets, setHandBets] = useState({}); // { [pid]: { handId: amount } }
  const [redBlackBets, setRedBlackBets] = useState({}); // { [pid]: { key: amount } }
  const [rankBets, setRankBets] = useState({}); // { [pid]: { key: amount } }
  const [lowHighBets, setLowHighBets] = useState({}); // { [pid]: { type, amount } }
  const [activePlayer, setActivePlayer] = useState(0); // which player is placing bets
  const [communityCards, setCommunityCards] = useState([]);
  const [gamePhase, setGamePhase] = useState('betting');
  const [deck, setDeck] = useState(() => shuffleDeck(DEALER_DECK));
  const [deckIndex, setDeckIndex] = useState(0);
  const [dealerMessage, setDealerMessage] = useState("Texas Hold'em is open for play. Players, please place your bets.");
  const [leadingHandIds, setLeadingHandIds] = useState([]);
  const [winnerHandIds, setWinnerHandIds] = useState([]);
  const [winningRedBlack, setWinningRedBlack] = useState([]);
  const [winningLowHigh, setWinningLowHigh] = useState(null);
  const [history, setHistory] = useState([]);
  const [roundId, setRoundId] = useState(1);
  const [royalFlushJackpot, setRoyalFlushJackpot] = useState(10000);
  const [straightFlushJackpot, setStraightFlushJackpot] = useState(2000);
  const [lastWinInfo, setLastWinInfo] = useState(null);
  const [winningRank, setWinningRank] = useState(null);
  const [leadingRank, setLeadingRank] = useState(null);
  // Casino profit tracking
  const [casinoProfit, setCasinoProfit] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);

  // Active player helpers
  const pid = activePlayer;
  const balance = balances[pid] ?? STARTING_BALANCE;
  const pHandBets = handBets[pid] || {};
  const pRedBlackBets = redBlackBets[pid] || {};
  const pRankBets = rankBets[pid] || {};
  const pLowHighBet = lowHighBets[pid] || null;


  const totalBet = Object.values(pHandBets).reduce((s, v) => s + v, 0) +
    Object.values(pRedBlackBets).reduce((s, v) => s + v, 0) +
    Object.values(pRankBets).reduce((s, v) => s + v, 0) +
    (pLowHighBet ? pLowHighBet.amount : 0);

  // Total bets across ALL players this round (for casino profit calc)
  const totalAllBets = () => {
    let t = 0;
    for (let i = 0; i < playerCount; i++) {
      t += Object.values(handBets[i] || {}).reduce((s, v) => s + v, 0);
      t += Object.values(redBlackBets[i] || {}).reduce((s, v) => s + v, 0);
      t += Object.values(rankBets[i] || {}).reduce((s, v) => s + v, 0);
      t += (lowHighBets[i]?.amount || 0);
    }
    return t;
  };

  // ---- BETTING ----
  const handleHandBet = useCallback((handId) => {
    if (gamePhase !== 'betting') return;
    const existing = (handBets[pid] || {})[handId] || 0;
    // Right-click / if already bet: remove it
    if (existing > 0 && balance < selectedChip) {
      // remove bet on this hand
      setHandBets(prev => { const n = { ...(prev[pid] || {}) }; delete n[handId]; return { ...prev, [pid]: n }; });
      setBalances(b => { const n = [...b]; n[pid] += existing; return n; });
      return;
    }
    if (balance < selectedChip) return;
    setHandBets(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), [handId]: existing + selectedChip } }));
    setBalances(b => { const n = [...b]; n[pid] -= selectedChip; return n; });
  }, [gamePhase, balance, selectedChip, pid, handBets]);

  const handleRemoveHandBet = useCallback((handId) => {
    if (gamePhase !== 'betting') return;
    const existing = (handBets[pid] || {})[handId] || 0;
    if (existing <= 0) return;
    setHandBets(prev => { const n = { ...(prev[pid] || {}) }; delete n[handId]; return { ...prev, [pid]: n }; });
    setBalances(b => { const n = [...b]; n[pid] += existing; return n; });
  }, [gamePhase, pid, handBets]);

  const handleRankBet = useCallback((key) => {
    if (gamePhase !== 'betting') return;
    const existing = (rankBets[pid] || {})[key] || 0;
    if (existing > 0 && balance < selectedChip) {
      setRankBets(prev => { const n = { ...(prev[pid] || {}) }; delete n[key]; return { ...prev, [pid]: n }; });
      setBalances(b => { const n = [...b]; n[pid] += existing; return n; });
      return;
    }
    if (balance < selectedChip) return;
    setRankBets(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), [key]: existing + selectedChip } }));
    setBalances(b => { const n = [...b]; n[pid] -= selectedChip; return n; });
  }, [gamePhase, balance, selectedChip, pid, rankBets]);

  const handleRemoveRankBet = useCallback((key) => {
    if (gamePhase !== 'betting') return;
    const existing = (rankBets[pid] || {})[key] || 0;
    if (existing <= 0) return;
    setRankBets(prev => { const n = { ...(prev[pid] || {}) }; delete n[key]; return { ...prev, [pid]: n }; });
    setBalances(b => { const n = [...b]; n[pid] += existing; return n; });
  }, [gamePhase, pid, rankBets]);

  const handleRedBlackBet = useCallback((key) => {
    if (gamePhase !== 'betting') return;
    const existing = (redBlackBets[pid] || {})[key] || 0;
    if (existing > 0 && balance < selectedChip) {
      setRedBlackBets(prev => { const n = { ...(prev[pid] || {}) }; delete n[key]; return { ...prev, [pid]: n }; });
      setBalances(b => { const n = [...b]; n[pid] += existing; return n; });
      return;
    }
    if (balance < selectedChip) return;
    setRedBlackBets(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), [key]: existing + selectedChip } }));
    setBalances(b => { const n = [...b]; n[pid] -= selectedChip; return n; });
  }, [gamePhase, balance, selectedChip, pid, redBlackBets]);

  const handleRemoveRedBlackBet = useCallback((key) => {
    if (gamePhase !== 'betting') return;
    const existing = (redBlackBets[pid] || {})[key] || 0;
    if (existing <= 0) return;
    setRedBlackBets(prev => { const n = { ...(prev[pid] || {}) }; delete n[key]; return { ...prev, [pid]: n }; });
    setBalances(b => { const n = [...b]; n[pid] += existing; return n; });
  }, [gamePhase, pid, redBlackBets]);

  const handleLowHighBet = useCallback((type) => {
    if (gamePhase !== 'lowHighBetting') return;
    // Max bet = total already on board (hand + rank + rb bets), excluding low/high itself
    const boardBet = Object.values(handBets[pid] || {}).reduce((s, v) => s + v, 0) +
      Object.values(redBlackBets[pid] || {}).reduce((s, v) => s + v, 0) +
      Object.values(rankBets[pid] || {}).reduce((s, v) => s + v, 0);
    const current = pLowHighBet && pLowHighBet.type === type ? pLowHighBet.amount : 0;
    const remaining = boardBet - current;
    if (remaining <= 0) return;
    // Substitute: use min of chip and remaining (don't exceed table total)
    const addAmount = Math.min(selectedChip, remaining);
    if (balance < addAmount) return;
    setLowHighBets(prev => ({ ...prev, [pid]: { type, amount: (prev[pid]?.type === type ? prev[pid].amount : 0) + addAmount } }));
    setBalances(b => { const n = [...b]; n[pid] -= addAmount; return n; });
  }, [gamePhase, balance, selectedChip, handBets, redBlackBets, rankBets, pLowHighBet, pid]);

  const handleRemoveLowHighBet = useCallback(() => {
    if (gamePhase !== 'lowHighBetting') return;
    if (!pLowHighBet || pLowHighBet.amount <= 0) return;
    setBalances(b => { const n = [...b]; n[pid] += pLowHighBet.amount; return n; });
    setLowHighBets(prev => ({ ...prev, [pid]: null }));
  }, [gamePhase, pid, pLowHighBet]);

  // Drag-drop: move a chip from one hand to another, or back to bank
  const handleDropChip = useCallback((fromHandId, toHandId, dragPid) => {
    if (gamePhase !== 'betting') return;
    const fromAmt = (handBets[dragPid] || {})[fromHandId] || 0;
    if (fromAmt <= 0) return;

    if (toHandId === 'bank') {
      // Drag to bank — refund
      setHandBets(prev => { const n = { ...(prev[dragPid] || {}) }; delete n[fromHandId]; return { ...prev, [dragPid]: n }; });
      setBalances(b => { const n = [...b]; n[dragPid] += fromAmt; return n; });
    } else {
      // Move entire bet from fromHandId to toHandId
      setHandBets(prev => {
        const pb = { ...(prev[dragPid] || {}) };
        const toAmt = pb[toHandId] || 0;
        delete pb[fromHandId];
        pb[toHandId] = toAmt + fromAmt;
        return { ...prev, [dragPid]: pb };
      });
    }
  }, [gamePhase, handBets]);

  const clearBets = () => {
    const refund = Object.values(pHandBets).reduce((s, v) => s + v, 0) +
      Object.values(pRedBlackBets).reduce((s, v) => s + v, 0) +
      Object.values(pRankBets).reduce((s, v) => s + v, 0);
    setBalances(b => { const n = [...b]; n[pid] += refund; return n; });
    setHandBets(prev => ({ ...prev, [pid]: {} }));
    setRedBlackBets(prev => ({ ...prev, [pid]: {} }));
    setRankBets(prev => ({ ...prev, [pid]: {} }));
  };

  // ---- GAME FLOW ----
  const handleDealFlop = () => {
    if (gamePhase !== 'betting') return;
    const newDeck = shuffleDeck(DEALER_DECK);
    const flop = [newDeck[0], newDeck[1], newDeck[2]];
    setCommunityCards(flop);
    setDeck(newDeck);
    setDeckIndex(3);

    const leader = findLeadingHand(flop);
    setLeadingHandIds(leader ? leader.handIds : []);
    setLeadingRank(leader ? leader.handResult.name : null);

    const leaderHand = leader ? FIXED_HANDS.find(h => h.id === leader.handIds[0]) : null;
    const leaderCards = leaderHand ? leaderHand.cards.map(c => `${c.rank}${SUITS[c.suit]}`).join(' & ') : '';
    setDealerMessage(
      leader
        ? `Flop: ${flop.map(cardDisplay).join(', ')}. ${leaderCards} is leading with ${leader.handResult.name}.`
        : `Flop: ${flop.map(cardDisplay).join(', ')}.`
    );
    setGamePhase('flop');
  };

  const handleDealTurn = () => {
    if (gamePhase !== 'flop') return;
    const turnCard = deck[deckIndex];
    const newComm = [...communityCards, turnCard];
    setCommunityCards(newComm);
    setDeckIndex(i => i + 1);

    const leader = findLeadingHand(newComm);
    setLeadingHandIds(leader ? leader.handIds : []);
    setLeadingRank(leader ? leader.handResult.name : null);

    const leaderHand = leader ? FIXED_HANDS.find(h => h.id === leader.handIds[0]) : null;
    const leaderCards = leaderHand ? leaderHand.cards.map(c => `${c.rank}${SUITS[c.suit]}`).join(' & ') : '';
    const lows = newComm.filter(c => isLowCard(c)).length;
    const highs = newComm.length - lows;

    setDealerMessage(
      `Turn: ${cardDisplay(turnCard)}. ${leaderCards ? leaderCards + ' leads with ' + leader.handResult.name + '. ' : ''}${lows} Low / ${highs} High showing. Low/High betting is now open!`
    );
    setGamePhase('lowHighBetting');
  };

  const handleDealRiver = () => {
    if (gamePhase !== 'lowHighBetting') return;
    const riverCard = deck[deckIndex];
    const newComm = [...communityCards, riverCard];
    setCommunityCards(newComm);
    setDeckIndex(i => i + 1);

    const leader = findLeadingHand(newComm);
    setLeadingHandIds([]);
    setLeadingRank(null);
    setWinnerHandIds(leader ? leader.handIds : []);
    setWinningRank(leader ? leader.handResult.name : null);

    const winRB = resolveRedBlack(newComm);
    const winLH = resolveLowHigh(riverCard);
    setWinningRedBlack(winRB);
    setWinningLowHigh(winLH);

    const reds = newComm.filter(c => cardColor(c) === 'red').length;
    const blacks = newComm.length - reds;
    const leaderHand = leader ? FIXED_HANDS.find(h => h.id === leader.handIds[0]) : null;
    const leaderCards = leaderHand ? leaderHand.cards.map(c => `${c.rank}${SUITS[c.suit]}`).join(' & ') : '';

    setDealerMessage(
      leader
        ? `🏆 Winner! ${leaderCards} wins with ${leader.handResult.name}! Board: ${reds}R / ${blacks}B. River card is ${winLH}.`
        : `River: ${cardDisplay(riverCard)}.`
    );
    setGamePhase('river');

    const leaderResult = leader?.handResult;
    // Capture current bet snapshots for settlement
    const snapHandBets = { ...handBets };
    const snapRedBlackBets = { ...redBlackBets };
    const snapRankBets = { ...rankBets };
    const snapLowHighBets = { ...lowHighBets };
    setTimeout(() => settle(newComm, leader, winRB, winLH, leaderHand, leaderResult, snapHandBets, snapRedBlackBets, snapRankBets, snapLowHighBets), 900);
  };

  const settle = (finalComm, leader, winRB, winLH, leaderHand, handResult, snapHandBets, snapRedBlackBets, snapRankBets, snapLowHighBets) => {
    const rankPayoutMap = {
      'Royal Flush': null,
      'Straight Flush': null,
      'Four of a Kind': 10,
      'Full House': 2,
      'Flush': 3,
      'Straight': 5,
      'Three of a Kind': 3,
      'Two Pair': 12,
      'One Pair': 15,
    };
    const rbPayoutMap = { '3R': 1, '3B': 1, '4R': 4, '4B': 4, '5R': 40, '5B': 40 };

    let totalBetsAllPlayers = 0;
    let totalWinningsAllPlayers = 0;
    const playerWinnings = [];

    let newRF = royalFlushJackpot;
    let newSF = straightFlushJackpot;

    for (let i = 0; i < playerCount; i++) {
      const ph = snapHandBets[i] || {};
      const prb = snapRedBlackBets[i] || {};
      const prk = snapRankBets[i] || {};
      const plh = snapLowHighBets[i] || null;

      let w = 0;

      // Carded hand bets
      if (leader) {
        leader.handIds.forEach(wid => {
          const bet = ph[wid] || 0;
          if (bet > 0) {
            const hand = FIXED_HANDS.find(h => h.id === wid);
            w += bet + bet * hand.payout;
          }
        });
      }

      // Red/Black
      winRB.forEach(key => {
        const bet = prb[key] || 0;
        if (bet > 0) w += bet + bet * (rbPayoutMap[key] || 1);
      });

      // Low/High
      if (plh && winLH === plh.type) w += plh.amount * 2;

      // Rank bets
      if (handResult) {
        const rankBetAmt = prk[handResult.name] || 0;
        if (rankBetAmt > 0) {
          const multiplier = rankPayoutMap[handResult.name];
          if (multiplier !== null && multiplier !== undefined) w += rankBetAmt + rankBetAmt * multiplier;
        }
        // Jackpots — require minimum qualifying bet
        if (handResult.name === 'Royal Flush') {
          const rfBet = prk['Royal Flush'] || 0;
          if (rfBet >= 25) {
            w += royalFlushJackpot + rfBet + rfBet * 100;
          }
          newRF = 10000;
        }
        if (handResult.name === 'Straight Flush') {
          const sfBet = prk['Straight Flush'] || 0;
          if (sfBet >= 15) {
            w += straightFlushJackpot + sfBet + sfBet * 50;
          }
          newSF = 2000;
        }
      }

      // Total bets for this player
      const playerTotalBet =
        Object.values(ph).reduce((s, v) => s + v, 0) +
        Object.values(prb).reduce((s, v) => s + v, 0) +
        Object.values(prk).reduce((s, v) => s + v, 0) +
        (plh?.amount || 0);

      totalBetsAllPlayers += playerTotalBet;
      totalWinningsAllPlayers += w;
      playerWinnings.push(w);
    }

    setRoyalFlushJackpot(newRF);
    setStraightFlushJackpot(newSF);

    // Update all player balances
    setBalances(prev => {
      const n = [...prev];
      for (let i = 0; i < playerCount; i++) n[i] = (n[i] || STARTING_BALANCE) + playerWinnings[i];
      return n;
    });

    // Casino profit = total bets - total winnings paid out
    const roundProfit = totalBetsAllPlayers - totalWinningsAllPlayers;
    setCasinoProfit(p => p + roundProfit);
    setRoundsPlayed(r => r + 1);

    // Show win info for active player
    const activeWin = playerWinnings[pid] || 0;
    setLastWinInfo(activeWin > 0 ? { amount: activeWin, allWinnings: playerWinnings } : null);
    setGamePhase('winner');

    // History
    const reds = finalComm.filter(c => cardColor(c) === 'red').length;
    const blacks = finalComm.length - reds;
    const colorResult = reds >= blacks ? `${reds}R` : `${blacks}B`;
    if (leaderHand) {
      setHistory(prev => [{
        roundId,
        winningHandId: leaderHand.id,
        handRank: handResult?.name || 'Unknown',
        cards: leaderHand.cards,
        colorResult,
        lowHighResult: winLH || '-',
      }, ...prev].slice(0, 20));
    }
  };

  const handleResetGame = () => {
    setBalances(Array(5).fill(STARTING_BALANCE));
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
    setDeck(shuffleDeck(DEALER_DECK));
    setDeckIndex(0);
    setRoundId(1);
    setRoundsPlayed(0);
    setCasinoProfit(0);
    setHistory([]);
    setRoyalFlushJackpot(10000);
    setStraightFlushJackpot(2000);
    setActivePlayer(0);
    setDealerMessage("Texas Hold'em is open for play. Players, please place your bets.");
    setGamePhase('betting');
  };

  const handleNewRound = () => {
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
    setDeck(shuffleDeck(DEALER_DECK));
    setDeckIndex(0);
    setRoundId(r => r + 1);
    setDealerMessage("Texas Hold'em is open for play. Players, please place your bets.");
    setGamePhase('betting');
    setActivePlayer(0);
    setRoyalFlushJackpot(p => p + 12.5);
    setStraightFlushJackpot(p => p + 5);
  };

  const actionButton = () => {
    if (gamePhase === 'betting') return { label: '🃏 Deal Flop', action: handleDealFlop, disabled: false };
    if (gamePhase === 'flop') return { label: '🃏 Deal Turn', action: handleDealTurn, disabled: false };
    if (gamePhase === 'lowHighBetting') return { label: '🃏 Deal River', action: handleDealRiver, disabled: false };
    if (gamePhase === 'river' || gamePhase === 'settlement') return { label: '⏳ Settling...', action: null, disabled: true };
    if (gamePhase === 'winner') return { label: '🔄 New Round', action: handleNewRound, disabled: false };
    return null;
  };

  const btn = actionButton();

  return (
    <div className="h-screen w-screen overflow-hidden text-white flex flex-col"
      style={{ background: 'radial-gradient(ellipse at top, #0a1628 0%, #050d1a 100%)' }}>

      {/* Header */}
      <div className="w-full bg-black/60 border-b border-yellow-700/30 px-3 py-1.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-none select-none">
            <div className="flex items-baseline gap-0.5">
              {/* RAPID — italic, stretched, motion-blur feel with speed lines */}
              <span
                className="font-black italic text-lg tracking-tighter leading-none"
                style={{
                  fontFamily: 'Oswald, sans-serif',
                  transform: 'skewX(-12deg)',
                  background: 'linear-gradient(90deg, #e2e8f0 0%, #ffffff 40%, #94a3b8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: 'none',
                  letterSpacing: '-0.05em',
                  filter: 'drop-shadow(2px 0 4px rgba(148,163,184,0.5))',
                }}
              >
                RAPID
              </span>
              {/* FIRE — blazing orange-to-yellow gradient with glow */}
              <span
                className="font-black italic text-lg leading-none"
                style={{
                  fontFamily: 'Oswald, sans-serif',
                  transform: 'skewX(-12deg)',
                  background: 'linear-gradient(180deg, #fef08a 0%, #f97316 50%, #dc2626 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 6px rgba(251,146,60,0.8)) drop-shadow(0 0 12px rgba(239,68,68,0.5))',
                  letterSpacing: '-0.02em',
                }}
              >
                🔥FIRE
              </span>
            </div>
            
          </div>
          {/* Player count selector */}
          {gamePhase === 'betting' && roundId === 1 && Object.values(handBets).every(b => Object.keys(b || {}).length === 0) && (
            <div className="flex items-center gap-1 ml-2">
              <span className="text-yellow-400/60 text-xs">Players:</span>
              {PLAYER_COUNT_OPTIONS.map(n => (
                <button key={n} onClick={() => { setPlayerCount(n); setActivePlayer(0); }}
                  className={`w-6 h-6 rounded-full text-xs font-bold border transition-all
                    ${playerCount === n ? 'border-yellow-400 bg-yellow-600 text-black' : 'border-yellow-700/40 bg-yellow-900/20 text-yellow-400 hover:border-yellow-500'}`}>
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Player tabs — colored to match chip color */}
          {playerCount > 1 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: playerCount }, (_, i) => {
                const style = PLAYER_TAB_STYLES[i % PLAYER_TAB_STYLES.length];
                return (
                  <button key={i}
                    onClick={() => gamePhase === 'betting' || gamePhase === 'lowHighBetting' ? setActivePlayer(i) : null}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold border transition-all
                      ${activePlayer === i ? style.active : style.inactive}`}>
                    P{i + 1} <span className="opacity-70">${(balances[i] || STARTING_BALANCE).toFixed(0)}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="text-center">
            <div className="text-yellow-400/60 text-xs">ROUND</div>
            <div className="text-white font-bold text-sm">#{roundId}</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-400/60 text-xs">PHASE</div>
            <div className="text-green-300 font-bold text-xs">{PHASE_LABELS[gamePhase]}</div>
          </div>
          {playerCount === 1 && (
            <div className="text-center">
              <div className="text-yellow-400/60 text-xs">BALANCE</div>
              <div className="text-yellow-300 font-black text-base">${balance.toFixed(2)}</div>
            </div>
          )}
          {totalBet > 0 && (
            <div className="text-center">
              <div className="text-yellow-400/60 text-xs">BET</div>
              <div className="text-white font-bold text-sm">${totalBet}</div>
            </div>
          )}
          {/* Casino Profit */}
          {roundsPlayed > 0 && (
            <div className="text-center border-l border-yellow-700/30 pl-3">
              <div className="text-yellow-400/60 text-xs">CASINO P/L</div>
              <div className={`font-black text-sm ${casinoProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {casinoProfit >= 0 ? '+' : ''}${casinoProfit.toFixed(2)}
              </div>
              <div className="text-yellow-400/40 text-xs">{roundsPlayed} rounds</div>
            </div>
          )}
          <button
            onClick={handleResetGame}
            className="ml-2 px-2 py-1 rounded-lg border border-red-700/60 bg-red-900/30 text-red-300 text-xs font-bold hover:bg-red-800/50 transition-all"
            title="Reset entire game"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Main Layout: 3 columns, fills remaining height */}
      <div className="flex gap-1.5 p-1.5 flex-1 min-h-0">

        {/* LEFT: History + Jackpots */}
        <div className="w-40 flex-shrink-0 flex flex-col gap-1.5 overflow-hidden">
          <HistoryRail
            history={history}
            royalFlushJackpot={royalFlushJackpot}
            straightFlushJackpot={straightFlushJackpot}
          />
        </div>

        {/* CENTER: Main Game Board */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">

          {/* Dealer Announcement */}
          <DealerAnnouncement message={dealerMessage} phase={gamePhase} />

          {/* Community Cards */}
          <div className="border border-yellow-700/30 rounded-xl bg-green-900/20 py-1.5 px-8 flex items-center justify-between flex-shrink-0">
            {/* Logo — left side */}
            <div className="flex flex-col leading-none select-none flex-shrink-0">
              <div className="flex items-baseline gap-0.5">
                <span className="font-black italic leading-none" style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(1.1rem, 2.8vw, 2rem)', transform: 'skewX(-12deg)', background: 'linear-gradient(90deg, #e2e8f0 0%, #ffffff 40%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.05em', filter: 'drop-shadow(2px 0 4px rgba(148,163,184,0.5))' }}>RAPID</span>
                <span className="font-black italic leading-none" style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(1.1rem, 2.8vw, 2rem)', transform: 'skewX(-12deg)', background: 'linear-gradient(180deg, #fef08a 0%, #f97316 50%, #dc2626 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 6px rgba(251,146,60,0.8)) drop-shadow(0 0 12px rgba(239,68,68,0.5))', letterSpacing: '-0.02em' }}>🔥FIRE</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-yellow-500/60" style={{ fontSize: 'clamp(0.6rem, 1vw, 0.8rem)' }}>—</span>
                <span className="font-black italic tracking-widest" style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(0.7rem, 1.4vw, 1.1rem)', transform: 'skewX(-12deg)', background: 'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 4px rgba(74,222,128,0.4))' }}>TEXAS 10</span>
                <span className="text-yellow-500/60" style={{ fontSize: 'clamp(0.6rem, 1vw, 0.8rem)' }}>—</span>
              </div>
            </div>

            <CommunityCards cards={communityCards} phase={gamePhase} />

            {/* Mirror logo — right side */}
            <div className="flex flex-col leading-none select-none flex-shrink-0 items-end">
              <div className="flex items-baseline gap-0.5">
                <span className="font-black italic leading-none" style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(1.1rem, 2.8vw, 2rem)', transform: 'skewX(-12deg)', background: 'linear-gradient(90deg, #e2e8f0 0%, #ffffff 40%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.05em', filter: 'drop-shadow(2px 0 4px rgba(148,163,184,0.5))' }}>RAPID</span>
                <span className="font-black italic leading-none" style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(1.1rem, 2.8vw, 2rem)', transform: 'skewX(-12deg)', background: 'linear-gradient(180deg, #fef08a 0%, #f97316 50%, #dc2626 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 6px rgba(251,146,60,0.8)) drop-shadow(0 0 12px rgba(239,68,68,0.5))', letterSpacing: '-0.02em' }}>🔥FIRE</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-yellow-500/60" style={{ fontSize: 'clamp(0.6rem, 1vw, 0.8rem)' }}>—</span>
                <span className="font-black italic tracking-widest" style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(0.7rem, 1.4vw, 1.1rem)', transform: 'skewX(-12deg)', background: 'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 4px rgba(74,222,128,0.4))' }}>TEXAS 10</span>
                <span className="text-yellow-500/60" style={{ fontSize: 'clamp(0.6rem, 1vw, 0.8rem)' }}>—</span>
              </div>
            </div>
          </div>

          {/* Win Overlay */}
          <AnimatePresence>
            {lastWinInfo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 pointer-events-none flex items-center justify-center z-50"
              >
                <div className="bg-yellow-900/90 border-2 border-yellow-400 rounded-2xl px-8 py-4 shadow-yellow-400/50 shadow-2xl text-center">
                  <div className="text-yellow-300 text-2xl font-black">🏆 YOU WIN!</div>
                  <div className="text-yellow-400 text-3xl font-black">${lastWinInfo.amount.toFixed(2)}</div>
                  {playerCount > 1 && lastWinInfo.allWinnings && (
                    <div className="flex gap-3 mt-2 justify-center">
                      {lastWinInfo.allWinnings.slice(0, playerCount).map((w, i) => (
                        <div key={i} className="text-center">
                          <div className="text-yellow-400/60 text-xs">P{i+1}</div>
                          <div className={`text-sm font-bold ${w > 0 ? 'text-green-300' : 'text-gray-400'}`}>${w.toFixed(0)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 10 Fixed Hands Grid */}
          <div className="flex-1 min-h-0">
            <div className="grid grid-cols-5 gap-1.5 h-full">
              {FIXED_HANDS.map(hand => (
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
                />
              ))}
            </div>
          </div>

          {/* Bottom controls: chips + action button */}
          <div className="flex items-center justify-between gap-2 border-t border-yellow-700/20 pt-1.5 flex-shrink-0">
            <div className="flex items-center gap-1">
              {/* Bank drop zone — drag chips here to refund */}
              {gamePhase === 'betting' && (
                <div
                  id="bank-drop-zone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const data = e.dataTransfer.getData('text/plain');
                    if (!data) return;
                    const { from, pid: dragPid } = JSON.parse(data);
                    handleDropChip(from, 'bank', dragPid);
                  }}
                  className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-dashed border-yellow-600/50 bg-yellow-900/20 text-yellow-500/60 text-xs font-bold transition-all hover:border-yellow-400 hover:bg-yellow-900/40 mr-1"
                  title="Drag chip here to refund to bank"
                >
                  💰
                </div>
              )}
              <span className="text-yellow-400/60 text-xs mr-1">Chip:</span>
              {CHIP_VALUES.map(v => (
                <button
                  key={v}
                  onClick={() => setSelectedChip(v)}
                  className={`w-9 h-9 rounded-full font-bold text-xs border-2 transition-all
                    ${selectedChip === v
                      ? 'border-yellow-400 bg-yellow-600 text-black shadow-yellow-400/50 shadow-md scale-110'
                      : 'border-yellow-700/40 bg-yellow-900/30 text-yellow-300 hover:border-yellow-500'}`}
                >
                  ${v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {gamePhase === 'betting' && totalBet > 0 && (
                <button
                  onClick={clearBets}
                  className="px-3 py-1.5 rounded-lg border border-red-700/50 bg-red-900/30 text-red-300 text-xs font-semibold hover:bg-red-900/50 transition-all"
                >
                  Clear
                </button>
              )}
              {btn && (
                <motion.button
                  whileTap={btn.disabled ? {} : { scale: 0.97 }}
                  onClick={btn.disabled ? null : btn.action}
                  disabled={btn.disabled}
                  className={`px-5 py-2 rounded-xl font-black text-sm tracking-wider transition-all
                    ${btn.disabled
                      ? 'border border-gray-600 bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'border-2 border-yellow-500 bg-yellow-600 hover:bg-yellow-500 text-black shadow-yellow-500/40 shadow-lg'}`}
                >
                  {btn.label}
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Rank Bets | Side Bets */}
        <div className="w-48 flex-shrink-0 flex flex-col gap-1.5 overflow-hidden">
          {/* Rank Bets panel */}
          <div className="border border-yellow-700/40 rounded-xl p-2 bg-black/30 flex-shrink-0">
            <RankBets
              rankBets={pRankBets}
              allRankBets={rankBets}
              playerCount={playerCount}
              onRankBet={handleRankBet}
              onRemoveRankBet={handleRemoveRankBet}
              gamePhase={gamePhase}
              winningRank={winningRank}
              leadingRank={leadingRank}
              disabled={balance < selectedChip}
            />
          </div>
          {/* Side Bets panel */}
          <div className="border border-yellow-700/40 rounded-xl p-2 bg-black/30 flex-1 overflow-hidden">
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
              disabled={balance < selectedChip}
              playerCount={playerCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}