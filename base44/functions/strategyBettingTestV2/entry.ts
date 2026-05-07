import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const gamesToSimulate = body.gamesToSimulate || 100;
    const strategyName = body.strategyName || 'BalancedSpread';

    const SUITS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
    const SUIT_COLORS = { spades: 'black', hearts: 'red', diamonds: 'red', clubs: 'black' };
    
    function shuffleDeck(deck) {
      const d = [...deck];
      for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
      }
      return d;
    }
    
    function cardColor(card) {
      return SUIT_COLORS[card.suit];
    }
    
    function rankValue(rank) {
      const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
      return RANK_ORDER.indexOf(rank);
    }
    
    function isLowCard(card) {
      return rankValue(card.rank) <= rankValue('7');
    }
    
    function getCombinations(arr, k) {
      if (k === 0) return [[]];
      if (arr.length < k) return [];
      const [first, ...rest] = arr;
      const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
      const withoutFirst = getCombinations(rest, k);
      return [...withFirst, ...withoutFirst];
    }

    function evaluateFiveCards(cards) {
    const ranks = cards.map(c => rankValue(c.rank)).sort((a, b) => b - a);
    const cardRanks = cards.map(c => c.rank);
    const suits = cards.map(c => c.suit);

    // Flush: all same suit
    const suitCounts = {};
    suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
    const isFlush = Object.values(suitCounts).some(count => count === 5);

    // Straight: consecutive ranks
    let isStraight = false;
    let straightHigh = ranks[0];
    if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
      isStraight = true;
    }
    // Wheel: A-2-3-4-5
    if (!isStraight && JSON.stringify(ranks) === JSON.stringify([12, 3, 2, 1, 0])) {
      isStraight = true;
      straightHigh = 3;
    }

    // Pairs/trips/quads
    const rankCounts = {};
    ranks.forEach(r => { rankCounts[r] = (rankCounts[r] || 0) + 1; });
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const countKeys = Object.entries(rankCounts).sort((a, b) => b[1] - a[1] || b[0] - a[0]);

    if (isFlush && isStraight) {
      if (ranks[0] === 12 && ranks[4] === 8) return { rank: 8, name: 'Royal Flush', tiebreak: [straightHigh] };
      return { rank: 7, name: 'Straight Flush', tiebreak: [straightHigh] };
    }
    if (counts[0] === 4) return { rank: 6, name: 'Four of a Kind', tiebreak: countKeys.map(([r]) => parseInt(r)) };
    if (counts[0] === 3 && counts[1] === 2) return { rank: 5, name: 'Full House', tiebreak: countKeys.map(([r]) => parseInt(r)) };
    if (isFlush) return { rank: 4, name: 'Flush', tiebreak: ranks };
    if (isStraight) return { rank: 3, name: 'Straight', tiebreak: [straightHigh] };
    if (counts[0] === 3) return { rank: 2, name: 'Three of a Kind', tiebreak: countKeys.map(([r]) => parseInt(r)) };
    if (counts[0] === 2 && counts[1] === 2) return { rank: 1, name: 'Two Pair', tiebreak: countKeys.map(([r]) => parseInt(r)) };
    if (counts[0] === 2) return { rank: 0, name: 'One Pair', tiebreak: countKeys.map(([r]) => parseInt(r)) };
    return { rank: -1, name: 'High Card', tiebreak: ranks };
    }

    function compareHands(a, b) {
      if (a.rank !== b.rank) return b.rank - a.rank;
      for (let i = 0; i < Math.min(a.tiebreak.length, b.tiebreak.length); i++) {
        if (a.tiebreak[i] !== b.tiebreak[i]) return b.tiebreak[i] - a.tiebreak[i];
      }
      return 0;
    }

    function evaluateBestHand(holeCards, communityCards) {
      const all = [...holeCards, ...communityCards];
      if (all.length < 2) return { rank: -1, name: 'No Hand', tiebreak: [] };
      
      const combos = all.length >= 5 ? getCombinations(all, 5) : [all];
      let best = null;
      for (const combo of combos) {
        const result = evaluateFiveCards(combo);
        if (!best || compareHands(result, best) < 0) {
          best = result;
        }
      }
      return best;
    }

    function findLeadingHand(communityCards) {
      if (communityCards.length === 0) return null;

      let best = null;
      let leaders = [];

      for (const hand of FIXED_HANDS) {
        const eval_ = evaluateBestHand(hand.cards, communityCards);
        if (!best || compareHands(eval_, best) < 0) {
          best = eval_;
          leaders = [hand.id];
        } else if (compareHands(eval_, best) === 0) {
          leaders.push(hand.id);
        }
      }

      return { handIds: leaders, handResult: best };
    }

    const FIXED_HANDS = [
      { id: 1,  cards: [{ rank: 'A', suit: 'diamonds' }, { rank: '10', suit: 'hearts' }],   payout: 14.51 },
      { id: 2,  cards: [{ rank: 'K', suit: 'clubs' },    { rank: 'K',  suit: 'spades' }],   payout: 4.21  },
      { id: 3,  cards: [{ rank: 'Q', suit: 'clubs' },    { rank: 'J',  suit: 'spades' }],   payout: 10.98 },
      { id: 4,  cards: [{ rank: 'Q', suit: 'spades' },   { rank: '10', suit: 'spades' }],   payout: 6.75  },
      { id: 5,  cards: [{ rank: 'J', suit: 'clubs' },    { rank: '9',  suit: 'clubs'  }],   payout: 5.63  },
      { id: 6,  cards: [{ rank: '8', suit: 'diamonds' }, { rank: '6',  suit: 'diamonds' }], payout: 4.48  },
      { id: 7,  cards: [{ rank: '7', suit: 'diamonds' }, { rank: '7',  suit: 'spades' }],   payout: 4.04  },
      { id: 8,  cards: [{ rank: '4', suit: 'hearts' },   { rank: '2',  suit: 'hearts' }],   payout: 4.69  },
      { id: 9,  cards: [{ rank: '3', suit: 'clubs' },    { rank: '3',  suit: 'hearts' }],   payout: 4.11  },
      { id: 10, cards: [{ rank: 'A', suit: 'hearts' },   { rank: '5',  suit: 'diamonds' }], payout: 9.30  },
    ];

    const DEALER_DECK = [
      // Spades
      { rank: 'A', suit: 'spades' }, { rank: '9', suit: 'spades' }, { rank: '8', suit: 'spades' },
      { rank: '6', suit: 'spades' }, { rank: '5', suit: 'spades' }, { rank: '4', suit: 'spades' },
      { rank: '3', suit: 'spades' }, { rank: '2', suit: 'spades' },
      // Hearts
      { rank: 'K', suit: 'hearts' }, { rank: 'Q', suit: 'hearts' }, { rank: 'J', suit: 'hearts' },
      { rank: '9', suit: 'hearts' }, { rank: '8', suit: 'hearts' }, { rank: '7', suit: 'hearts' },
      { rank: '6', suit: 'hearts' }, { rank: '5', suit: 'hearts' },
      // Diamonds
      { rank: 'K', suit: 'diamonds' }, { rank: 'Q', suit: 'diamonds' }, { rank: 'J', suit: 'diamonds' },
      { rank: '10', suit: 'diamonds' }, { rank: '9', suit: 'diamonds' }, { rank: '4', suit: 'diamonds' },
      { rank: '3', suit: 'diamonds' }, { rank: '2', suit: 'diamonds' },
      // Clubs
      { rank: 'A', suit: 'clubs' }, { rank: '10', suit: 'clubs' }, { rank: '8', suit: 'clubs' },
      { rank: '7', suit: 'clubs' }, { rank: '6', suit: 'clubs' }, { rank: '5', suit: 'clubs' },
      { rank: '4', suit: 'clubs' }, { rank: '2', suit: 'clubs' },
    ];

    const STARTING_BALANCE = 1000;

    // Rank frequencies from 32-card deck empirical simulation
    // One Pair is now a valid rank bet (isolation rule removed 2026-05-06)
    const RANK_FREQS = {
      'One Pair':        0.28,
      'Two Pair':        0.04754,
      'Three of a Kind': 0.02113,
      'Straight':        0.00462,
      'Flush':           0.00327,
      'Full House':      0.00261,
      'Four of a Kind':  0.00168,
    };

    // Rank payouts — per-hand rank model (global average approximations for strategy simulation)
    // One Pair is now a valid rank bet (isolation rule removed 2026-05-06)
    // Royal Flush / Straight Flush: not valid bet positions
    const RANK_PAYOUTS = {
      'One Pair':        28.0,
      'Two Pair':        16.76,
      'Three of a Kind': 3.95,
      'Straight':        5.02,
      'Flush':           3.10,
      'Full House':      2.53,
      'Four of a Kind':  12.43,
    };

    const COLOR_PAYOUTS = {
      '3R': 0.93, '3B': 0.93,
      '4R': 4.81, '4B': 4.81,
      '5R': 43.36, '5B': 43.46,
    };

    const RED_COUNT_PROBS = [0.03125, 0.15625, 0.3125, 0.3125, 0.15625, 0.03125];
    const RED_COUNT_CUM = [];
    let rcCum = 0;
    for (const p of RED_COUNT_PROBS) { rcCum += p; RED_COUNT_CUM.push(rcCum); }

    function rollRedCount() {
      const r = Math.random();
      for (let i = 0; i < 6; i++) { if (r < RED_COUNT_CUM[i]) return i; }
      return 5;
    }

    function rollRank() {
      const r = Math.random();
      const ranks = Object.keys(RANK_FREQS);
      let cum = 0;
      for (const rank of ranks) {
        cum += RANK_FREQS[rank];
        if (r < cum) return rank;
      }
      return 'Two Pair';
    }

    function getWinningColors(redCount) {
      const blackCount = 5 - redCount;
      const winners = [];
      if (redCount >= 3) for (let i = 3; i <= redCount; i++) winners.push(`${i}R`);
      if (blackCount >= 3) for (let i = 3; i <= blackCount; i++) winners.push(`${i}B`);
      return winners;
    }

    // Strategy implementations
    const strategies = {
      ST1_TwoHandRankRiver: {
        name: 'ST1: Two Hands + Matching Rank + River',
        execute: (balance, game) => {
          if (balance < 5) return null;
          const bets = {};
          // 2 hands + 2 ranks (equal amounts = gate open) + river
          const handBet = balance < 200 ? Math.floor(balance / 6) : 30;
          if (handBet < 1) return null;
          if (balance < handBet * 5) return null;
          bets['h6'] = handBet; bets['h8'] = handBet;
          bets['rFull House'] = handBet; bets['rFlush'] = handBet; // rank total === hand total → gate open
          bets.riverHedge = handBet;
          return { bets, balance };
        },
      },
      ConservativeHedger: {
        name: 'Conservative Hedger (2 hands + rank match + color)',
        execute: (balance) => {
          if (balance < 5) return null;
          const bets = {};
          // 2 hands + 2 ranks (equal amounts = gate open) + moderate color bets
          const handBet = balance < 200 ? Math.floor(balance / 8) : 25;
          if (handBet < 1) return null;
          const totalBetsNeeded = (2 + 2 + 4) * handBet; // 2 hands + 2 ranks + 4 colors
          if (balance < totalBetsNeeded) return null;
          bets['h3'] = handBet; bets['h10'] = handBet;
          bets['rFull House'] = handBet; bets['rStraight'] = handBet; // rank === hand → gate open
          ['3R', '3B', '4R', '4B'].forEach(k => { bets[`c${k}`] = handBet; });
          return { bets, balance };
        },
      },
      RankStacker: {
        name: 'Rank Stacker (2 hands + 2 high-freq ranks, gate open)',
        execute: (balance) => {
          if (balance < 5) return null;
          const bets = {};
          // 2 hands × handBet, 2 ranks × handBet → rank total = hand total → gate open
          const handBet = balance < 200 ? Math.floor(balance / 5) : 30;
          if (handBet < 1) return null;
          const totalBetsNeeded = 4 * handBet; // 2 hands + 2 ranks
          if (balance < totalBetsNeeded) return null;
          bets['h6'] = handBet; bets['h8'] = handBet;
          bets['rThree of a Kind'] = handBet; bets['rFull House'] = handBet;
          return { bets, balance };
        },
      },
      FlushHunter: {
        name: 'Flush Hunter (1 hand + Flush rank match + river)',
        execute: (balance) => {
          if (balance < 5) return null;
          const bets = {};
          // 1 hand + 1 rank (equal = gate open) + river
          const handBet = balance < 150 ? Math.floor(balance / 4) : 50;
          if (handBet < 1) return null;
          const totalBetsNeeded = 3 * handBet; // 1 hand + 1 rank + 1 river
          if (balance < totalBetsNeeded) return null;
          bets['h6'] = handBet;
          bets['rFlush'] = handBet; // rank === hand → gate open
          bets.riverHedge = handBet;
          return { bets, balance };
        },
      },
      StraightHunter: {
        name: 'Straight Hunter (2 hands + Straight rank split + river)',
        execute: (balance) => {
          if (balance < 5) return null;
          const bets = {};
          // 2 hands × half + 2 ranks × half = rank total === hand total → gate open
          const halfBet = balance < 150 ? Math.floor(balance / 8) : 25;
          if (halfBet < 1) return null;
          const totalBetsNeeded = 4 * halfBet + halfBet; // 2h + 2r + river
          if (balance < totalBetsNeeded) return null;
          bets['h1'] = halfBet; bets['h5'] = halfBet;
          bets['rStraight'] = halfBet; bets['rTwo Pair'] = halfBet; // rank total === hand total → gate open
          bets.riverHedge = halfBet;
          return { bets, balance };
        },
      },
      ColorBoardSpecialist: {
        name: 'Color Specialist (2 hands + rank match + all colors + river)',
        execute: (balance) => {
          if (balance < 5) return null;
          const bets = {};
          // 2 hands × handBet + 2 ranks × handBet (gate open) + all 6 colors + river
          const handBet = balance < 200 ? Math.floor(balance / 11) : 20;
          if (handBet < 1) return null;
          const totalBetsNeeded = (2 + 2 + 6 + 1) * handBet;
          if (balance < totalBetsNeeded) return null;
          bets['h1'] = handBet; bets['h4'] = handBet;
          bets['rFlush'] = handBet; bets['rStraight'] = handBet; // rank total === hand total → gate open
          ['3R', '3B', '4R', '4B', '5R', '5B'].forEach(c => { bets[`c${c}`] = handBet; });
          bets.riverHedge = handBet;
          return { bets, balance };
        },
      },
      HighPayoutFocus: {
        name: 'High Payout Focus (Hands 6,8 + Trips/Full House)',
        execute: (balance) => {
          if (balance < 5) return null; // Bankrupt threshold
          const bets = {};
          const handBet = balance < 250 ? Math.floor(balance / 5) : 50;
          if (handBet < 1) return null; // Can't place meaningful bets
          const totalBetsNeeded = (2 + 3) * handBet; // 2 hands + 3 ranks
          if (balance < totalBetsNeeded) return null;
          
          [6, 8].forEach(id => { bets[`h${id}`] = handBet; });
          ['Three of a Kind', 'Full House', 'Four of a Kind'].forEach(r => {
            bets[`r${r}`] = handBet;
          });
          return { bets, balance };
        },
      },
      RiverFocused: {
        name: 'River Focused (1 hand + rank match + aggressive river)',
        execute: (balance) => {
          if (balance < 5) return null;
          const bets = {};
          // 1 hand + 1 rank (equal = gate open) + river
          const handBet = balance < 100 ? Math.floor(balance / 3) : 50;
          if (handBet < 1) return null;
          if (balance < handBet * 3) return null;
          bets['h8'] = handBet;
          bets['rFull House'] = handBet; // rank total === hand total → gate open
          bets.riverAggressive = handBet;
          return { bets, balance };
        },
      },
      BalancedSpread: {
        name: 'Balanced Spread (2 hands + 2 ranks + 2 colors + river)',
        execute: (balance) => {
          if (balance < 5) return null;
          const bets = {};
          // 2 hands × smallBet + 2 ranks × smallBet (gate open) + 2 colors + river
          const smallBet = balance < 300 ? Math.floor(balance / 8) : 30;
          if (smallBet < 1) return null;
          const totalBetsNeeded = (2 + 2 + 2 + 1) * smallBet;
          if (balance < totalBetsNeeded) return null;
          bets['h6'] = smallBet; bets['h8'] = smallBet;
          bets['rFlush'] = smallBet; bets['rStraight'] = smallBet; // rank total === hand total → gate open
          ['3R', '4R'].forEach(c => { bets[`c${c}`] = smallBet; });
          bets.riverHedge = smallBet;
          return { bets, balance };
        },
      },
      DiversifiedHedge: {
        name: 'Diversified Hedge (2 hands + rank match + color, low variance)',
        execute: (balance) => {
          if (balance < 5) return null;
          const bets = {};
          // 2 hands × microBet + 2 ranks × microBet (gate open) + 2 colors
          const microBet = balance < 200 ? Math.floor(balance / 8) : 15;
          if (microBet < 1) return null;
          const totalBetsNeeded = (2 + 2 + 2) * microBet;
          if (balance < totalBetsNeeded) return null;
          bets['h1'] = microBet; bets['h10'] = microBet;
          bets['rTwo Pair'] = microBet; bets['rFull House'] = microBet; // rank total === hand total → gate open
          ['3R', '3B'].forEach(c => { bets[`c${c}`] = microBet; });
          return { bets, balance };
        },
      },
      AdaptiveHybrid: {
        name: 'Adaptive Hybrid (Switches strategies based on results)',
        execute: (balance, game, previousWins, previousLosses) => {
          if (balance < 5) return null; // Bankrupt threshold
          const bets = {};
          const winRate = previousWins + previousLosses > 0 ? previousWins / (previousWins + previousLosses) : 0;
          
          // Hot streak: 2 hands + matching rank (gate open) + river
          if (winRate > 0.55) {
            const bet = Math.floor(balance / 5);
            if (bet < 1 || balance < bet * 5) return null;
            bets['h2'] = bet; bets['h8'] = bet;
            bets['rFull House'] = bet; bets['rThree of a Kind'] = bet; // rank === hand → gate open
            bets.strategy = 'Hot Streak';
          }
          // Cold streak: 2 hands + rank match + color
          else if (winRate < 0.45) {
            const bet = Math.floor(balance / 6);
            if (bet < 1 || balance < bet * 6) return null;
            bets['h6'] = bet; bets['h9'] = bet;
            ['Two Pair', 'Full House'].forEach(r => { bets[`r${r}`] = bet; });
            bets.strategy = 'Cold Streak - Diversify';
          }
          // Balanced: 2 hands + rank match + color
          else {
            const bet = Math.floor(balance / 6);
            if (bet < 1 || balance < bet * 6) return null;
            bets['h6'] = bet; bets['h8'] = bet;
            bets['rFlush'] = bet; bets['rTwo Pair'] = bet; // rank total === hand total → gate open
            ['3R', '3B'].forEach(c => { bets[`c${c}`] = bet; });
            bets.strategy = 'Balanced';
          }
          return { bets, balance };
        },
      },
      The8Bet: {
        name: 'THE "2" BET (Max 2 hands — game rule enforced)',
        execute: (balance) => {
          // Game enforces max 2 simultaneous hand bets — so bet the 2 highest-payout hands
          // H8 (4.52% freq, 20x) + H3 (5.08% freq, 18x) — combined freq 9.6%
          if (balance < 10) return null;
          const unit = balance < 200 ? Math.floor(balance / 10) : 50;
          if (unit < 1) return null;
          if (balance < unit * 2 + unit) return null;
          const bets = {};
          bets['h8'] = unit;
          bets['h3'] = unit;
          bets.riverHedge = unit; // 33% hedge
          return { bets, balance };
        },
      },
      MetaAdaptive: {
        name: 'Meta Adaptive (AI-driven multi-strategy mixer targeting 95-98% RTP)',
        execute: (balance, game, previousWins, previousLosses, recentGameHistory = []) => {
          if (balance < 5) return null; // Bankrupt threshold
          const bets = {};
          const totalGames = previousWins + previousLosses;
          const winRate = totalGames > 0 ? previousWins / totalGames : 0.5;
          
          // Calculate volatility: variance in recent results (last 20 games)
          let volatility = 0;
          if (recentGameHistory && recentGameHistory.length > 0) {
            const recent = recentGameHistory.slice(-20);
            const avgWin = recent.reduce((s, r) => s + (r ? 1 : 0), 0) / recent.length;
            volatility = recent.reduce((s, r) => s + Math.pow((r ? 1 : 0) - avgWin, 2), 0) / recent.length;
          }
          
          // Momentum: recent wins vs losses (last 10 games)
          let momentum = 0;
          if (recentGameHistory && recentGameHistory.length >= 10) {
            const recent10 = recentGameHistory.slice(-10);
            momentum = recent10.filter(r => r).length - recent10.filter(r => !r).length;
          }
          
          // Bankroll pressure: how depleted we are
          const bankrollHealth = balance / 1000; // Original starting balance
          const underPressure = bankrollHealth < 0.5;
          
          // Decision tree: select best base strategy + mixing coefficient
          let baseStrategy = 'ST1_Original';
          let mixCoeff = 0.5;
          let secondaryStrategy = 'BalancedSpread';
          
          // Hot hot hot: pure aggressive
          if (winRate > 0.58 && momentum > 5 && !underPressure) {
            baseStrategy = 'HighPayoutFocus';
            mixCoeff = 0.8;
            secondaryStrategy = 'RiverFocused';
          }
          // Hot: mostly aggressive, some hedging
          else if (winRate > 0.52 && momentum >= 0) {
            baseStrategy = 'FlushHunter';
            mixCoeff = 0.6;
            secondaryStrategy = 'ConservativeHedger';
          }
          // Neutral-hot: balanced
          else if (winRate > 0.48 && volatility < 0.3) {
            baseStrategy = 'BalancedSpread';
            mixCoeff = 0.5;
            secondaryStrategy = 'RankStacker';
          }
          // Cold but stable: diversify & hedge
          else if (winRate < 0.48 && volatility < 0.35) {
            baseStrategy = 'DiversifiedHedge';
            mixCoeff = 0.6;
            secondaryStrategy = 'ConservativeHedger';
          }
          // Highly volatile cold streak: aggressive rank focus
          else if (volatility > 0.35 && winRate < 0.45) {
            baseStrategy = 'RankStacker';
            mixCoeff = 0.7;
            secondaryStrategy = 'ColorBoardSpecialist';
          }
          // Bankroll under pressure: conservative everywhere
          else if (underPressure) {
            baseStrategy = 'ConservativeHedger';
            mixCoeff = 0.5;
            secondaryStrategy = 'DiversifiedHedge';
          }
          
          // Generate mixed bet structure: (baseStrategy * mixCoeff) + (secondaryStrategy * (1 - mixCoeff))
          const baseBet = Math.floor(balance / 10);
          if (balance < baseBet * 5) return null;
          
          // Primary strategy allocation
          if (baseStrategy === 'ST1_Original') {
            [2, 5, 6, 7, 8, 9].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff); });
          } else if (baseStrategy === 'HighPayoutFocus') {
            [6, 8].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff * 1.5); });
            ['Three of a Kind', 'Full House'].forEach(r => { bets[`r${r}`] = Math.floor(baseBet * mixCoeff); });
          } else if (baseStrategy === 'FlushHunter') {
            [3, 4, 5].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff); });
            bets['rFlush'] = Math.floor(baseBet * mixCoeff);
          } else if (baseStrategy === 'RankStacker') {
            [6, 8].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff); });
            ['Two Pair', 'Flush'].forEach(r => { bets[`r${r}`] = Math.floor(baseBet * mixCoeff); });
          } else if (baseStrategy === 'BalancedSpread') {
            [2, 6, 8].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff); });
            ['Flush'].forEach(r => { bets[`r${r}`] = Math.floor(baseBet * mixCoeff); });
          } else if (baseStrategy === 'DiversifiedHedge') {
            [1, 3, 5, 7, 9].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff * 0.6); });
            ['Two Pair'].forEach(r => { bets[`r${r}`] = Math.floor(baseBet * mixCoeff * 0.6); });
          } else if (baseStrategy === 'ConservativeHedger') {
            [3, 6, 8, 10].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff); });
            ['3R', '3B'].forEach(c => { bets[`c${c}`] = Math.floor(baseBet * mixCoeff * 0.7); });
          } else if (baseStrategy === 'ColorBoardSpecialist') {
            [1, 4].forEach(id => { bets[`h${id}`] = Math.floor(baseBet * mixCoeff); });
            ['3R', '3B', '4R', '4B'].forEach(c => { bets[`c${c}`] = Math.floor(baseBet * mixCoeff * 0.8); });
          } else if (baseStrategy === 'RiverFocused') {
            bets['h8'] = Math.floor(baseBet * mixCoeff * 2);
            bets['riverAggressive'] = true;
          }
          
          // Secondary strategy allocation (blended)
          const secondBet = Math.floor(baseBet * (1 - mixCoeff));
          if (secondaryStrategy === 'ConservativeHedger') {
            [3, 6].forEach(id => { bets[`h${id}`] = (bets[`h${id}`] || 0) + secondBet; });
            ['3R', '3B'].forEach(c => { bets[`c${c}`] = (bets[`c${c}`] || 0) + Math.floor(secondBet * 0.7); });
          } else if (secondaryStrategy === 'RankStacker') {
            ['Two Pair'].forEach(r => { bets[`r${r}`] = (bets[`r${r}`] || 0) + secondBet; });
          } else if (secondaryStrategy === 'ColorBoardSpecialist') {
            ['3R', '3B'].forEach(c => { bets[`c${c}`] = (bets[`c${c}`] || 0) + Math.floor(secondBet * 0.6); });
          } else if (secondaryStrategy === 'RiverFocused') {
            bets['riverHedge'] = secondBet; // actual dollar amount
          } else if (secondaryStrategy === 'DiversifiedHedge') {
            [1, 5, 9].forEach(id => { bets[`h${id}`] = (bets[`h${id}`] || 0) + Math.floor(secondBet * 0.5); });
          }
          
          bets.strategy = `${baseStrategy}(${(mixCoeff * 100).toFixed(0)}%) + ${secondaryStrategy}(${((1-mixCoeff)*100).toFixed(0)}%) [WR:${(winRate*100).toFixed(1)}% Vol:${volatility.toFixed(2)} Mom:${momentum}]`;
          return { bets, balance };
        },
      },
    };

    const strategy = strategies[strategyName];
    if (!strategy) {
      return Response.json({ error: `Unknown strategy: ${strategyName}` }, { status: 400 });
    }

    let totalProfit = 0;
    let gamesActuallyPlayed = 0;
    let maxBankrollEver = STARTING_BALANCE;
    let maxBankrollGameNumber = 0;
    let maxProfitEver = 0;
    let maxProfitGameNumber = 0;
    const doublingMilestones = {};
    let nextMilestone = STARTING_BALANCE * 2;
    let balance = STARTING_BALANCE;
    let winCount = 0, lossCount = 0;
    let maxLossStreak = 0, currentLossStreak = 0;
    let maxWinStreak = 0, currentWinStreak = 0;
    const recentGameHistory = [];
    const detailedGameLog = [];

    for (let game = 0; game < gamesToSimulate; game++) {
      if (balance <= 0) break;
      gamesActuallyPlayed++;

      // Record balance at start of THIS game
      const balanceAtGameStart = balance;

      const gameResult = strategy.execute(balance, game, winCount, lossCount, recentGameHistory);
      if (!gameResult || Object.keys(gameResult.bets).length === 0) break; // Strategy can't afford bets
      const { bets } = gameResult;

      // Calculate total bet — all numeric values in bets (hands, ranks, colors, riverHedge, riverAggressive)
      let totalBet = 0;
      Object.entries(bets).forEach(([key, val]) => {
        if (key !== 'strategy' && typeof val === 'number') totalBet += val;
      });

      if (balance < totalBet) break;
      balance -= totalBet;
      let gameWin = 0;

      // Deal 5 community cards from shuffled dealer deck
      const shuffledDeck = shuffleDeck(DEALER_DECK);
      const communityCards = shuffledDeck.slice(0, 5);
      const flop = communityCards.slice(0, 3);
      const turn = communityCards[3];
      const river = communityCards[4];

      // Determine winning hand and rank from actual board evaluation
      const leader = findLeadingHand(communityCards);
      const winningHand = leader ? leader.handIds[0] : 1;
      const winningHand_ = FIXED_HANDS.find(h => h.id === winningHand);
      const gameRank = leader ? leader.handResult.name : 'Two Pair';
      
      // Count actual reds/blacks from community cards
      const redCount = communityCards.filter(c => cardColor(c) === 'red').length;
      const winningColors = getWinningColors(redCount);
      const riverIsLow = isLowCard(communityCards[4]);

      // Track individual bets for detailed log
      const betsLog = [];

      // Hand payouts (player wins if they bet on winning hand)
      if (bets[`h${winningHand}`]) {
        const payout = bets[`h${winningHand}`] * (1 + winningHand_.payout);
        gameWin += payout;
        const cardDisplay = `${winningHand_.cards[0].rank}${SUITS[winningHand_.cards[0].suit]} / ${winningHand_.cards[1].rank}${SUITS[winningHand_.cards[1].suit]}`;
        betsLog.push({
          position: `Hand ${winningHand} ${cardDisplay}`,
          type: 'hand',
          bet: bets[`h${winningHand}`],
          won: true,
          payout,
        });
      }
      // Log losing hand bets
      for (const [key, amount] of Object.entries(bets)) {
        if (key.startsWith('h') && key !== `h${winningHand}` && amount > 0) {
          const handId = parseInt(key.slice(1));
          const hand = FIXED_HANDS.find(h => h.id === handId);
          const cardDisplay = hand ? `${hand.cards[0].rank}${SUITS[hand.cards[0].suit]} / ${hand.cards[1].rank}${SUITS[hand.cards[1].suit]}` : '';
          betsLog.push({
            position: `Hand ${handId} ${cardDisplay}`,
            type: 'hand',
            bet: amount,
            won: false,
            payout: 0,
          });
        }
      }

      // Rank payouts (player wins if they bet on the rank that hit)
      if (bets[`r${gameRank}`]) {
        const rankMult = RANK_PAYOUTS[gameRank];
        if (rankMult !== null) {
          const payout = bets[`r${gameRank}`] * (1 + rankMult);
          gameWin += payout;
          betsLog.push({
            position: gameRank,
            type: 'rank',
            bet: bets[`r${gameRank}`],
            won: true,
            payout,
          });
        }
      }
      // Log losing rank bets (exclude riverHedge/riverAggressive keys)
      const RIVER_KEYS = ['riverHedge', 'riverAggressive'];
      for (const [key, amount] of Object.entries(bets)) {
        if (key.startsWith('r') && !RIVER_KEYS.includes(key) && key !== `r${gameRank}` && typeof amount === 'number' && amount > 0) {
          betsLog.push({
            position: key.slice(1),
            type: 'rank',
            bet: amount,
            won: false,
            payout: 0,
          });
        }
      }

      // Color payouts (cumulative: 4R also wins 3R, 5R also wins 4R and 3R)
      for (const colorKey of winningColors) {
        if (bets[`c${colorKey}`]) {
          const payout = bets[`c${colorKey}`] * (1 + COLOR_PAYOUTS[colorKey]);
          gameWin += payout;
          betsLog.push({
            position: colorKey,
            type: 'color',
            bet: bets[`c${colorKey}`],
            won: true,
            payout,
          });
        }
      }
      // Log losing color bets
      for (const [key, amount] of Object.entries(bets)) {
        if (key.startsWith('c') && !winningColors.includes(key.slice(1)) && amount > 0) {
          betsLog.push({
            position: key.slice(1),
            type: 'color',
            bet: amount,
            won: false,
            payout: 0,
          });
        }
      }



      // River Hedge bet — resolves as LOW/HIGH on river card
      const winningLowHigh = riverIsLow ? 'LOW' : 'HIGH';

      const LOW_HIGH_PAYOUT_RATE = 0.93;
      if (bets.riverHedge > 0) {
        const hedgeWon = riverIsLow; // hedge bets LOW by convention
        const hedgeAmount = bets.riverHedge;
        if (hedgeWon) {
          const payout = hedgeAmount * (1 + LOW_HIGH_PAYOUT_RATE);
          gameWin += payout;
          betsLog.push({ position: `River Hedge LOW ($${hedgeAmount})`, type: 'river', bet: hedgeAmount, won: true, payout });
        } else {
          betsLog.push({ position: `River Hedge LOW ($${hedgeAmount})`, type: 'river', bet: hedgeAmount, won: false, payout: 0 });
        }
      } else if (bets.riverAggressive > 0) {
        const aggressiveWon = !riverIsLow;
        const aggressiveAmount = bets.riverAggressive;
        if (aggressiveWon) {
          const payout = aggressiveAmount * (1 + LOW_HIGH_PAYOUT_RATE);
          gameWin += payout;
          betsLog.push({ position: `River Aggressive HIGH ($${aggressiveAmount})`, type: 'river', bet: aggressiveAmount, won: true, payout });
        } else {
          betsLog.push({ position: `River Aggressive HIGH ($${aggressiveAmount})`, type: 'river', bet: aggressiveAmount, won: false, payout: 0 });
        }
      } else {
        betsLog.push({ position: 'River', type: 'river', bet: 0, won: false, payout: 0 });
      }

      const netGame = gameWin - totalBet;
      const gameWon = netGame > 0;
      if (gameWon) {
        winCount++;
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else {
        lossCount++;
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }

      recentGameHistory.push(gameWon);
      if (recentGameHistory.length > 100) recentGameHistory.shift();

      balance += gameWin;
      totalProfit += netGame;

      // Track peaks and milestones
      if (balance > maxBankrollEver) {
        maxBankrollEver = balance;
        maxBankrollGameNumber = gamesActuallyPlayed;
      }

      if (totalProfit > maxProfitEver) {
        maxProfitEver = totalProfit;
        maxProfitGameNumber = gamesActuallyPlayed;
      }

      while (balance >= nextMilestone && !doublingMilestones[nextMilestone]) {
        doublingMilestones[nextMilestone] = gamesActuallyPlayed;
        nextMilestone *= 2;
      }

      // Capture detailed game record (keep first 500 games for UI)
       if (detailedGameLog.length < 500) {
         detailedGameLog.push({
           gameNumber: gamesActuallyPlayed,
           balanceBefore: balanceAtGameStart,
           bets: betsLog,
           totalBet,
           gameWon: netGame > 0,
           netResult: netGame,
           balanceAfter: balance,
           communityCards: {
             flop: flop.map(c => `${c.rank}${SUITS[c.suit]}`),
             turn: `${turn.rank}${SUITS[turn.suit]}`,
             river: `${river.rank}${SUITS[river.suit]}`,
           },
           winningPositions: {
             hand: `H${winningHand} ${winningHand_.cards[0].rank}${SUITS[winningHand_.cards[0].suit]} / ${winningHand_.cards[1].rank}${SUITS[winningHand_.cards[1].suit]}`,
             rank: gameRank,
             colors: winningColors,
             lowHigh: riverIsLow ? 'LOW' : 'HIGH',
           },
         });
       }
    }

    const avgProfit = gamesActuallyPlayed > 0 ? totalProfit / gamesActuallyPlayed : 0;
    const roi = ((totalProfit / STARTING_BALANCE) * 100).toFixed(1);
    const winRate = gamesActuallyPlayed > 0 ? ((winCount / gamesActuallyPlayed) * 100).toFixed(1) : 0;
    const maxProfit = totalProfit;

    return Response.json({
      success: true,
      strategyName,
      gamesToSimulate,
      gamesActuallyPlayed,
      stoppedEarly: gamesActuallyPlayed < gamesToSimulate,
      totalProfit: totalProfit.toFixed(2),
      avgProfitPerGame: avgProfit.toFixed(2),
      finalBalance: balance.toFixed(2),
      maxBankrollEver: maxBankrollEver.toFixed(2),
      maxBankrollGameNumber,
      doublingMilestones,
      roi: roi + '%',
      stats: {
        winCount,
        lossCount,
        winRate: winRate + '%',
        maxWinStreak,
        maxLossStreak,
        maxProfit: maxProfitEver.toFixed(2),
      },
      detailedGameLog,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});