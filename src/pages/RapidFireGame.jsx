import { useState, useCallback } from 'react';
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
import PayoutTable from '@/components/game/PayoutTable';
import DealerAnnouncement from '@/components/game/DealerAnnouncement';

const STARTING_BALANCE = 500;
const CHIP_VALUES = [5, 10, 25, 50, 100];
const DEFAULT_CHIP = 10;

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
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [selectedChip, setSelectedChip] = useState(DEFAULT_CHIP);
  const [handBets, setHandBets] = useState({}); // { handId: amount }
  const [redBlackBets, setRedBlackBets] = useState({}); // { '3R': amount, ... }
  const [lowHighBet, setLowHighBet] = useState(null); // { type: 'LOW'|'HIGH', amount }
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
  const [royalFlushJackpot, setRoyalFlushJackpot] = useState(12595);
  const [straightFlushJackpot, setStraightFlushJackpot] = useState(2845);
  const [lastWinInfo, setLastWinInfo] = useState(null);


  const totalBet = Object.values(handBets).reduce((s, v) => s + v, 0) +
    Object.values(redBlackBets).reduce((s, v) => s + v, 0) +
    (lowHighBet ? lowHighBet.amount : 0);

  // ---- BETTING ----
  const handleHandBet = useCallback((handId) => {
    if (gamePhase !== 'betting' || balance < selectedChip) return;
    setHandBets(prev => ({ ...prev, [handId]: (prev[handId] || 0) + selectedChip }));
    setBalance(b => b - selectedChip);
  }, [gamePhase, balance, selectedChip]);

  const handleRedBlackBet = useCallback((key) => {
    if (gamePhase !== 'betting' || balance < selectedChip) return;
    setRedBlackBets(prev => ({ ...prev, [key]: (prev[key] || 0) + selectedChip }));
    setBalance(b => b - selectedChip);
  }, [gamePhase, balance, selectedChip]);

  const handleLowHighBet = useCallback((type) => {
    if (gamePhase !== 'lowHighBetting' || balance < selectedChip) return;
    const maxBet = totalBet;
    const current = lowHighBet && lowHighBet.type === type ? lowHighBet.amount : 0;
    if (current >= maxBet) return;
    const addAmount = Math.min(selectedChip, maxBet - current);
    if (balance < addAmount) return;
    setLowHighBet({ type, amount: (lowHighBet?.type === type ? lowHighBet.amount : 0) + addAmount });
    setBalance(b => b - addAmount);
  }, [gamePhase, balance, selectedChip, totalBet, lowHighBet]);

  const clearBets = () => {
    const refund = Object.values(handBets).reduce((s, v) => s + v, 0) +
      Object.values(redBlackBets).reduce((s, v) => s + v, 0);
    setBalance(b => b + refund);
    setHandBets({});
    setRedBlackBets({});
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
    setWinnerHandIds(leader ? leader.handIds : []);

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
    setTimeout(() => settle(newComm, leader, winRB, winLH, leaderHand, leaderResult), 900);
  };

  const settle = (finalComm, leader, winRB, winLH, leaderHand, handResult) => {
    let winnings = 0;

    // Carded hand bets
    if (leader) {
      leader.handIds.forEach(wid => {
        const bet = handBets[wid] || 0;
        if (bet > 0) {
          const hand = FIXED_HANDS.find(h => h.id === wid);
          winnings += bet + bet * hand.payout;
        }
      });
    }

    // Red/Black bets
    winRB.forEach(key => {
      const bet = redBlackBets[key] || 0;
      if (bet > 0) {
        const payoutMap = { '3R': 1.5, '3B': 1.5, '4R': 4, '4B': 4, '5R': 40, '5B': 40 };
        winnings += bet + bet * (payoutMap[key] || 1);
      }
    });

    // Low/High bet
    if (lowHighBet && winLH === lowHighBet.type) {
      winnings += lowHighBet.amount + lowHighBet.amount * 1;
    }

    // Progressive jackpot logic
    let newRF = royalFlushJackpot;
    let newSF = straightFlushJackpot;
    if (handResult?.name === 'Royal Flush' && leaderHand) {
      winnings += royalFlushJackpot;
      newRF = 500;
    }
    if (handResult?.name === 'Straight Flush' && leaderHand) {
      winnings += straightFlushJackpot;
      newSF = 200;
    }
    setRoyalFlushJackpot(newRF);
    setStraightFlushJackpot(newSF);

    setBalance(b => b + winnings);
    setLastWinInfo(winnings > 0 ? { amount: winnings } : null);
    setGamePhase('winner');

    // Add to history
    const reds = finalComm.filter(c => cardColor(c) === 'red').length;
    const blacks = finalComm.length - reds;
    const colorResult = reds >= blacks ? `${reds}R` : `${blacks}B`;
    if (leaderHand) {
      setHistory(prev => [{
        roundId: roundId,
        winningHandId: leaderHand.id,
        handRank: handResult?.name || 'Unknown',
        cards: leaderHand.cards,
        colorResult,
        lowHighResult: winLH || '-',
      }, ...prev].slice(0, 12));
    }
  };

  const handleNewRound = () => {
    setHandBets({});
    setRedBlackBets({});
    setLowHighBet(null);
    setCommunityCards([]);
    setLeadingHandIds([]);
    setWinnerHandIds([]);
    setWinningRedBlack([]);
    setWinningLowHigh(null);
    setLastWinInfo(null);

    setDeck(shuffleDeck(DEALER_DECK));
    setDeckIndex(0);
    setRoundId(r => r + 1);
    setDealerMessage("Texas Hold'em is open for play. Players, please place your bets.");
    setGamePhase('betting');
    // Accumulate jackpots a bit each round
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
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden"
      style={{ background: 'radial-gradient(ellipse at top, #0a1628 0%, #050d1a 100%)' }}>

      {/* Header */}
      <div className="w-full bg-black/60 border-b border-yellow-700/30 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-yellow-400 font-black text-lg tracking-wider leading-none">RAPID FIRE</div>
            <div className="text-green-400 font-bold text-xs tracking-widest">TEXAS 10</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-yellow-400/60 text-xs">ROUND</div>
            <div className="text-white font-bold">#{roundId}</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-400/60 text-xs">PHASE</div>
            <div className="text-green-300 font-bold text-sm">{PHASE_LABELS[gamePhase]}</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-400/60 text-xs">BALANCE</div>
            <div className="text-yellow-300 font-black text-lg">${balance.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Main Layout: 3 columns */}
      <div className="flex gap-2 p-2 h-[calc(100vh-56px)] overflow-hidden">

        {/* LEFT: History + Jackpots */}
        <div className="w-44 flex-shrink-0 overflow-y-auto">
          <HistoryRail
            history={history}
            royalFlushJackpot={royalFlushJackpot}
            straightFlushJackpot={straightFlushJackpot}
          />
        </div>

        {/* CENTER: Main Game Board */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">

          {/* Dealer Announcement */}
          <DealerAnnouncement message={dealerMessage} phase={gamePhase} />

          {/* Community Cards */}
          <div className="border border-yellow-700/30 rounded-xl bg-green-900/20 p-3 flex items-center justify-center">
            <CommunityCards cards={communityCards} phase={gamePhase} />
          </div>

          {/* Winner Win Overlay */}
          <AnimatePresence>
            {lastWinInfo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none flex items-center justify-center z-50"
              >
                <div className="bg-yellow-900/90 border-2 border-yellow-400 rounded-2xl px-8 py-4 shadow-yellow-400/50 shadow-2xl text-center">
                  <div className="text-yellow-300 text-2xl font-black">🏆 YOU WIN!</div>
                  <div className="text-yellow-400 text-3xl font-black">${lastWinInfo.amount.toFixed(2)}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 10 Fixed Hands Grid: 5 top, 5 bottom */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2">
              {FIXED_HANDS.map(hand => (
                <FixedHandCard
                  key={hand.id}
                  hand={hand}
                  isLeading={leadingHandIds.includes(hand.id)}
                  isWinner={winnerHandIds.includes(hand.id)}
                  communityCards={communityCards}
                  betAmount={handBets[hand.id] || 0}
                  onBet={handleHandBet}
                  gamePhase={gamePhase}
                  disabled={balance < selectedChip && !handBets[hand.id]}
                />
              ))}
            </div>
          </div>

          {/* Bottom controls: chips + action button */}
          <div className="flex items-center justify-between gap-3 border-t border-yellow-700/20 pt-2">
            {/* Chip selector */}
            <div className="flex items-center gap-1">
              <span className="text-yellow-400/60 text-xs mr-1">Chip:</span>
              {CHIP_VALUES.map(v => (
                <button
                  key={v}
                  onClick={() => setSelectedChip(v)}
                  className={`w-10 h-10 rounded-full font-bold text-xs border-2 transition-all
                    ${selectedChip === v
                      ? 'border-yellow-400 bg-yellow-600 text-black shadow-yellow-400/50 shadow-md scale-110'
                      : 'border-yellow-700/40 bg-yellow-900/30 text-yellow-300 hover:border-yellow-500'}`}
                >
                  ${v}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Bet total */}
              {totalBet > 0 && (
                <div className="text-yellow-300 text-sm font-semibold">
                  Bet: ${totalBet}
                </div>
              )}
              {/* Clear bets */}
              {gamePhase === 'betting' && totalBet > 0 && (
                <button
                  onClick={clearBets}
                  className="px-3 py-2 rounded-lg border border-red-700/50 bg-red-900/30 text-red-300 text-xs font-semibold hover:bg-red-900/50 transition-all"
                >
                  Clear Bets
                </button>
              )}
              {/* Action button */}
              {btn && (
                <motion.button
                  whileTap={btn.disabled ? {} : { scale: 0.97 }}
                  onClick={btn.disabled ? null : btn.action}
                  disabled={btn.disabled}
                  className={`px-6 py-2.5 rounded-xl font-black text-sm tracking-wider transition-all
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

        {/* RIGHT: Side Bets + Payout Table */}
        <div className="w-52 flex-shrink-0 flex flex-col gap-2 overflow-y-auto">
          <SideBets
            communityCards={communityCards}
            redBlackBets={redBlackBets}
            lowHighBet={lowHighBet}
            onRedBlackBet={handleRedBlackBet}
            onLowHighBet={handleLowHighBet}
            gamePhase={gamePhase}
            winningRedBlack={winningRedBlack}
            winningLowHigh={winningLowHigh}
            disabled={balance < selectedChip}
          />
          <PayoutTable />
        </div>
      </div>
    </div>
  );
}