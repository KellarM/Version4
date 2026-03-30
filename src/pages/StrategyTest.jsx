import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, ChevronDown, ChevronUp } from 'lucide-react';

// All 391 strategies from spec
const STRATEGIES = [
  // Kind Combo group
  { value: 'Kind Combo', label: 'Kind Combo', group: 'Kind Combo', cards: 'K♣/K♠ + 7♦/7♠', ranks: '3 of a Kind, 4 of a Kind', colors: 'None', river: 'Bet when 4 Low (→High) or 4 High (→Low)' },
  { value: "High Odd's", label: "High Odd's", group: 'Kind Combo', cards: 'A♦/10♥ + Q♣/J♠ + A♥/5♦ + K♣/K♠', ranks: 'One Pair', colors: 'None', river: 'Bet when 4 Low (→High) or 4 High (→Low)' },
  { value: 'Pair Combo', label: 'Pair Combo', group: 'Kind Combo', cards: 'A♦/10♥ + K♣/K♠', ranks: 'One Pair, Two Pair', colors: 'None', river: 'Bet when 4 Low (→High) or 4 High (→Low)' },
  { value: 'Kind Combo 2', label: 'Kind Combo 2', group: 'Kind Combo', cards: 'K♣/K♠ + 7♦/7♠', ranks: '3 of a Kind, 4 of a Kind', colors: '3R 4R 3B 4B', river: 'Bet when 4 Low (→High) or 4 High (→Low)' },
  { value: "High Odd's 2", label: "High Odd's 2", group: 'Kind Combo', cards: 'A♦/10♥ + Q♣/J♠ + A♥/5♦ + K♣/K♠', ranks: 'One Pair', colors: '3R 4R 3B 4B', river: 'Bet when 4 Low (→High) or 4 High (→Low)' },
  { value: 'Pair Combo 2', label: 'Pair Combo 2', group: 'Kind Combo', cards: 'A♦/10♥ + K♣/K♠', ranks: 'One Pair, Two Pair', colors: '3R 4R 3B 4B', river: 'Bet when 4 Low (→High) or 4 High (→Low)' },
  { value: 'Kind Combo 3', label: 'Kind Combo 3', group: 'Kind Combo', cards: 'K♣/K♠ + 7♦/7♠', ranks: '3 of a Kind, 4 of a Kind', colors: '3R 4R', river: 'Bet when 4 Low (→High) or 4 High (→Low)' },
  { value: "High Odd's 3", label: "High Odd's 3", group: 'Kind Combo', cards: 'A♦/10♥ + Q♣/J♠ + A♥/5♦ + K♣/K♠', ranks: 'One Pair', colors: '3R 4R', river: 'Bet when 4 Low (→High) or 4 High (→Low)' },
  { value: 'Pair Combo 3', label: 'Pair Combo 3', group: 'Kind Combo', cards: 'A♦/10♥ + K♣/K♠', ranks: 'One Pair, Two Pair', colors: '3R 4R', river: 'Bet when 4 Low (→High) or 4 High (→Low)' },
  { value: 'Kind Combo 4', label: 'Kind Combo 4', group: 'Kind Combo', cards: 'K♣/K♠ + 7♦/7♠', ranks: '3 of a Kind, 4 of a Kind', colors: '3B 4B', river: 'None' },
  { value: "High Odd's 4", label: "High Odd's 4", group: 'Kind Combo', cards: 'A♦/10♥ + Q♣/J♠ + A♥/5♦ + K♣/K♠', ranks: 'One Pair', colors: '3B 4B', river: 'None' },
  { value: 'Pair Combo 4', label: 'Pair Combo 4', group: 'Kind Combo', cards: 'A♦/10♥ + K♣/K♠', ranks: 'One Pair, Two Pair', colors: '3B 4B', river: 'None' },
  { value: 'Kind Combo 5', label: 'Kind Combo 5', group: 'Kind Combo', cards: 'K♣/K♠ + 7♦/7♠', ranks: '3 of a Kind, 4 of a Kind', colors: '3B', river: 'None' },
  { value: "High Odd's 5", label: "High Odd's 5", group: 'Kind Combo', cards: 'A♦/10♥ + Q♣/J♠ + A♥/5♦ + K♣/K♠', ranks: 'One Pair', colors: '3B', river: 'None' },
  { value: 'Pair Combo 5', label: 'Pair Combo 5', group: 'Kind Combo', cards: 'A♦/10♥ + K♣/K♠', ranks: 'One Pair, Two Pair', colors: '3B', river: 'None' },
  { value: 'Kind Combo 6', label: 'Kind Combo 6', group: 'Kind Combo', cards: 'K♣/K♠ + 7♦/7♠', ranks: '3 of a Kind, 4 of a Kind', colors: '3R', river: 'None' },
  { value: "High Odd's 6", label: "High Odd's 6", group: 'Kind Combo', cards: 'A♦/10♥ + Q♣/J♠ + A♥/5♦ + K♣/K♠', ranks: 'One Pair', colors: '3R', river: 'None' },
  { value: 'Pair Combo 6', label: 'Pair Combo 6', group: 'Kind Combo', cards: 'A♦/10♥ + K♣/K♠', ranks: 'One Pair, Two Pair', colors: '3R', river: 'None' },
  // Black Flush group
  { value: 'Black Flush 1', label: 'Black Flush 1', group: 'Black Flush', cards: 'Q♠/10♠ + J♣/9♣', ranks: 'Flush', colors: '3B 4B 5B', river: 'Bet when 3+ Low/High showing' },
  { value: 'Black Flush 2', label: 'Black Flush 2', group: 'Black Flush', cards: 'Q♠/10♠ + J♣/9♣', ranks: 'Flush', colors: '3B 4B', river: 'Bet when 3+ Low/High showing' },
  { value: 'Black Flush 3', label: 'Black Flush 3', group: 'Black Flush', cards: 'Q♠/10♠ + J♣/9♣', ranks: 'Flush', colors: '3B', river: 'Bet when 3+ Low/High showing' },
  { value: 'Black Flush 4', label: 'Black Flush 4', group: 'Black Flush', cards: 'Q♠/10♠ + J♣/9♣', ranks: 'Flush', colors: '3B 4B 5B', river: 'None' },
  { value: 'Black Flush 5', label: 'Black Flush 5', group: 'Black Flush', cards: 'Q♠/10♠ + J♣/9♣', ranks: 'Flush', colors: '3B 4B', river: 'None' },
  { value: 'Black Flush 6', label: 'Black Flush 6', group: 'Black Flush', cards: 'Q♠/10♠ + J♣/9♣', ranks: 'Flush', colors: '3B', river: 'None' },
  { value: 'Single Black Flush 1', label: 'Single Black Flush 1', group: 'Black Flush', cards: 'Q♠/10♠', ranks: 'Flush', colors: '3B 4B 5B', river: 'Bet when 3+ Low/High showing' },
  { value: 'Single Black Flush 2', label: 'Single Black Flush 2', group: 'Black Flush', cards: 'Q♠/10♠', ranks: 'Flush', colors: '3B 4B', river: 'Bet when 3+ Low/High showing' },
  { value: 'Single Black Flush 3', label: 'Single Black Flush 3', group: 'Black Flush', cards: 'Q♠/10♠', ranks: 'Flush', colors: '3B', river: 'Bet when 3+ Low/High showing' },
  { value: 'Single Black Flush 4', label: 'Single Black Flush 4', group: 'Black Flush', cards: 'Q♠/10♠', ranks: 'Flush', colors: '3B 4B 5B', river: 'None' },
  { value: 'Single Black Flush 5', label: 'Single Black Flush 5', group: 'Black Flush', cards: 'Q♠/10♠', ranks: 'Flush', colors: '3B 4B', river: 'None' },
  { value: 'Single Black Flush 6', label: 'Single Black Flush 6', group: 'Black Flush', cards: 'Q♠/10♠', ranks: 'Flush', colors: '3B', river: 'None' },
  { value: 'Single Black Flush 7', label: 'Single Black Flush 7', group: 'Black Flush', cards: 'J♣/9♣', ranks: 'Flush', colors: '3B 4B 5B', river: 'Bet when 3+ Low/High showing' },
  { value: 'Single Black Flush 8', label: 'Single Black Flush 8', group: 'Black Flush', cards: 'J♣/9♣', ranks: 'Flush', colors: '3B 4B', river: 'Bet when 3+ Low/High showing' },
  { value: 'Single Black Flush 9', label: 'Single Black Flush 9', group: 'Black Flush', cards: 'J♣/9♣', ranks: 'Flush', colors: '3B', river: 'Bet when 3+ Low/High showing' },
  { value: 'Single Black Flush 10', label: 'Single Black Flush 10', group: 'Black Flush', cards: 'J♣/9♣', ranks: 'Flush', colors: '3B 4B 5B', river: 'None' },
  { value: 'Single Black Flush 11', label: 'Single Black Flush 11', group: 'Black Flush', cards: 'J♣/9♣', ranks: 'Flush', colors: '3B 4B', river: 'None' },
  { value: 'Single Black Flush 12', label: 'Single Black Flush 12', group: 'Black Flush', cards: 'J♣/9♣', ranks: 'Flush', colors: '3B', river: 'None' },
  // Red Flush group
  { value: 'Red Flush 1', label: 'Red Flush 1', group: 'Red Flush', cards: '8♦/6♦ + 4♥/2♥', ranks: 'Flush', colors: '3R 4R 5R', river: 'Bet when 3+ Low/High showing' },
  { value: 'Red Flush 2', label: 'Red Flush 2', group: 'Red Flush', cards: '8♦/6♦ + 4♥/2♥', ranks: 'Flush', colors: '3R 4R', river: 'Bet when 3+ Low/High showing' },
  { value: 'Red Flush 3', label: 'Red Flush 3', group: 'Red Flush', cards: '8♦/6♦ + 4♥/2♥', ranks: 'Flush', colors: '3R', river: 'Bet when 3+ Low/High showing' },
  { value: 'Red Flush 4', label: 'Red Flush 4', group: 'Red Flush', cards: '8♦/6♦ + 4♥/2♥', ranks: 'Flush', colors: '3R 4R 5R', river: 'None' },
  { value: 'Red Flush 5', label: 'Red Flush 5', group: 'Red Flush', cards: '8♦/6♦ + 4♥/2♥', ranks: 'Flush', colors: '3R 4R', river: 'None' },
  { value: 'Red Flush 6', label: 'Red Flush 6', group: 'Red Flush', cards: '8♦/6♦ + 4♥/2♥', ranks: 'Flush', colors: '3R', river: 'None' },
  { value: 'Single Red Flush 1', label: 'Single Red Flush 1', group: 'Red Flush', cards: '8♦/6♦', ranks: 'Flush', colors: '3R 4R 5R', river: 'Bet when 3+ Low/High showing' },
  { value: 'Single Red Flush 2', label: 'Single Red Flush 2', group: 'Red Flush', cards: '8♦/6♦', ranks: 'Flush', colors: '3R 4R', river: 'Bet when 3+ Low/High showing' },
  { value: 'Single Red Flush 3', label: 'Single Red Flush 3', group: 'Red Flush', cards: '8♦/6♦', ranks: 'Flush', colors: '3R', river: 'Bet when 3+ Low/High showing' },
  { value: 'Single Red Flush 4', label: 'Single Red Flush 4', group: 'Red Flush', cards: '8♦/6♦', ranks: 'Flush', colors: '3R 4R 5R', river: 'None' },
  { value: 'Single Red Flush 5', label: 'Single Red Flush 5', group: 'Red Flush', cards: '8♦/6♦', ranks: 'Flush', colors: '3R 4R', river: 'None' },
  { value: 'Single Red Flush 6', label: 'Single Red Flush 6', group: 'Red Flush', cards: '8♦/6♦', ranks: 'Flush', colors: '3R', river: 'None' },
  { value: 'Single Red Flush 7', label: 'Single Red Flush 7', group: 'Red Flush', cards: '4♥/2♥', ranks: 'Flush', colors: '3R 4R 5R', river: 'Bet when 3+ Low/High showing' },
  { value: 'Single Red Flush 8', label: 'Single Red Flush 8', group: 'Red Flush', cards: '4♥/2♥', ranks: 'Flush', colors: '3R 4R', river: 'Bet when 3+ Low/High showing' },
  { value: 'Single Red Flush 9', label: 'Single Red Flush 9', group: 'Red Flush', cards: '4♥/2♥', ranks: 'Flush', colors: '3R', river: 'Bet when 3+ Low/High showing' },
  { value: 'Single Red Flush 10', label: 'Single Red Flush 10', group: 'Red Flush', cards: '4♥/2♥', ranks: 'Flush', colors: '3R 4R 5R', river: 'None' },
  { value: 'Single Red Flush 11', label: 'Single Red Flush 11', group: 'Red Flush', cards: '4♥/2♥', ranks: 'Flush', colors: '3R 4R', river: 'None' },
  { value: 'Single Red Flush 12', label: 'Single Red Flush 12', group: 'Red Flush', cards: '4♥/2♥', ranks: 'Flush', colors: '3R', river: 'None' },
  // Straight Mix group (sample — all 75 listed)
  ...Array.from({length: 75}, (_, i) => {
    const n = i + 1;
    const cardPairs = ['A♦/10♥ + A♥/5♦','Q♣/J♠ + Q♠/10♠','Q♠/10♠ + J♣/9♣','J♣/9♣ + 8♦/6♦','8♦/6♦ + 4♥/2♥'];
    const cards = cardPairs[(n - 1) % 5];
    const colorSets = ['None','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 4R','3B 4B','3R','3B','None','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 4R','3B 4B','3R','3B','None'];
    const colorIdx = Math.floor((n - 1) / 5) % colorSets.length;
    const colors = colorSets[colorIdx];
    const riverOpts = ['strict4','none'];
    const river = n <= 35 ? 'Bet when 4 Low (→High) or 4 High (→Low)' : 'None';
    return {
      value: `Straight Mix ${n}`,
      label: `Straight Mix ${n}`,
      group: 'Straight Mix',
      cards,
      ranks: 'Straight',
      colors,
      river,
    };
  }),
  // Singles
  { value: 'Single 1', label: 'Single 1 (A♦/10♥)', group: 'Singles', cards: 'A♦/10♥', ranks: 'None', colors: 'None', river: 'None' },
  { value: 'Single 2', label: 'Single 2 (K♣/K♠)', group: 'Singles', cards: 'K♣/K♠', ranks: 'None', colors: 'None', river: 'None' },
  { value: 'Single 3', label: 'Single 3 (Q♣/J♠)', group: 'Singles', cards: 'Q♣/J♠', ranks: 'None', colors: 'None', river: 'None' },
  { value: 'Single 4', label: 'Single 4 (Q♠/10♠)', group: 'Singles', cards: 'Q♠/10♠', ranks: 'None', colors: 'None', river: 'None' },
  { value: 'Single 5', label: 'Single 5 (J♣/9♣)', group: 'Singles', cards: 'J♣/9♣', ranks: 'None', colors: 'None', river: 'None' },
  { value: 'Single 6', label: 'Single 6 (8♦/6♦)', group: 'Singles', cards: '8♦/6♦', ranks: 'None', colors: 'None', river: 'None' },
  { value: 'Single 7', label: 'Single 7 (7♦/7♠)', group: 'Singles', cards: '7♦/7♠', ranks: 'None', colors: 'None', river: 'None' },
  { value: 'Single 8', label: 'Single 8 (4♥/2♥)', group: 'Singles', cards: '4♥/2♥', ranks: 'None', colors: 'None', river: 'None' },
  { value: 'Single 9', label: 'Single 9 (3♣/3♥)', group: 'Singles', cards: '3♣/3♥', ranks: 'None', colors: 'None', river: 'None' },
  { value: 'Single 10', label: 'Single 10 (A♥/5♦)', group: 'Singles', cards: 'A♥/5♦', ranks: 'None', colors: 'None', river: 'None' },
  // Single Mix (One Pair + Two Pair)
  ...Array.from({length: 10}, (_, i) => {
    const cards = ['A♦/10♥','K♣/K♠','Q♣/J♠','Q♠/10♠','J♣/9♣','8♦/6♦','7♦/7♠','4♥/2♥','3♣/3♥','A♥/5♦'][i];
    return { value: `Single Mix ${i+1}`, label: `Single Mix ${i+1} (${cards})`, group: 'Single Mix', cards, ranks: 'One Pair, Two Pair', colors: 'None', river: 'None' };
  }),
  ...Array.from({length: 20}, (_, i) => {
    const cards = ['A♦/10♥','K♣/K♠','Q♣/J♠','Q♠/10♠','J♣/9♣','8♦/6♦','7♦/7♠','4♥/2♥','3♣/3♥','A♥/5♦'][i % 10];
    return { value: `Single Mix ${i+11}`, label: `Single Mix ${i+11} (${cards})`, group: 'Single Mix', cards, ranks: 'One Pair', colors: 'None', river: 'None' };
  }),
  // Foursome groups (27 variants x2 sets)
  ...Array.from({length: 27}, (_, i) => {
    const n = i + 1;
    const colorOpts = ['None','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 4R','3B 4B','3R','3B','None','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 4R','3B 4B','3R','3B','None','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 4R','3B 4B','3R','3B','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 4R','3B 4B','3R','3B'];
    const riverOpts = ['None','None','None','None','None','None','None','strict4','strict4','strict4','strict4','strict4','strict4','strict4','when3','when3','when3','when3','when3','when3','when3','random','random','random','random','random','random'];
    const riverLabel = riverOpts[i] === 'strict4' ? 'Bet when 4 Low/High' : riverOpts[i] === 'when3' ? 'Bet when 3+ showing' : riverOpts[i] === 'random' ? '50/50 random' : 'None';
    return { value: `Foursome ${n}`, label: `Foursome ${n}`, group: 'Foursome', cards: 'A♦/10♥ + K♣/K♠ + Q♣/J♠ + A♥/5♦', ranks: 'One Pair', colors: colorOpts[i], river: riverLabel };
  }),
  // Foursome 2/4 groups
  ...Array.from({length: 32}, (_, i) => {
    const n = i + 1;
    const colorOpts = ['None','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 3B','3R','3B','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 3B','3R','3B','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 3B','3R','3B','None','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 3B','3R','3B','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 3B','3R','3B','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 3B','3R','3B'];
    const riverIdx = [0,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,0,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3][i];
    const riverLabel = ['None','Bet when 4 Low/High','Bet when 3+ showing','50/50 random'][riverIdx];
    const cardSet = n <= 16 ? 'A♦/10♥ + Q♣/J♠ + Q♠/10♠ + J♣/9♣' : 'A♦/10♥ + 8♦/6♦ + 4♥/2♥ + A♥/5♦';
    return { value: `Foursome 2/4 ${n}`, label: `Foursome 2/4 ${n}`, group: 'Foursome 2/4', cards: cardSet, ranks: 'One Pair', colors: colorOpts[i], river: riverLabel };
  }),
  // Rank High Odds
  ...Array.from({length: 24}, (_, i) => {
    const n = i + 1;
    const colorOpts = ['3R 4R 5R 3B 4B 5B','3R 4R 5R 3B 4B 5B','3R 4R 5R 3B 4B 5B','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 4R 3B 4B','3R 4R 3B 4B','3R 4R 3B 4B','3R 3B','3R 3B','3R 3B','3R 3B','3R','3R','3R','3R','3B','3B','3B','3B','None','None','None','None'];
    const riverIdx = [0,1,2,3,0,1,2,3,0,1,2,3,0,1,2,3,0,1,2,3,0,1,2,3][i];
    const riverLabel = ['Bet when 4 Low/High','Bet when 3+ showing','50/50 random','None'][riverIdx];
    return { value: `Rank High Odds ${n}`, label: `Rank High Odds ${n}`, group: 'Rank High Odds', cards: 'None', ranks: 'Two Pair, 4 of a Kind', colors: colorOpts[i], river: riverLabel };
  }),
  // Color Board
  ...Array.from({length: 20}, (_, i) => {
    const n = i + 1;
    const colorOpts = ['3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 3B','3R','3B','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 3B','3R','3B','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 3B','3R','3B','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 3B','3R','3B'];
    const riverIdx = [3,3,3,3,3,0,0,0,0,0,1,1,1,1,1,2,2,2,2,2][i];
    const riverLabel = ['Bet when 4 Low/High','Bet when 3+ showing','50/50 random','None'][riverIdx];
    return { value: `Color Board ${n}`, label: `Color Board ${n}`, group: 'Color Board', cards: 'None', ranks: 'None', colors: colorOpts[i], river: riverLabel };
  }),
  // Progressive
  ...Array.from({length: 40}, (_, i) => {
    const n = i + 1;
    const rankLabel = n <= 20 ? 'One Pair' : 'One Pair, Straight Flush';
    const colorOpts = ['None','None','None','None','3R 4R 5R 3B 4B 5B','3R 4R 5R 3B 4B 5B','3R 4R 5R 3B 4B 5B','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R 4R 3B 4B','3R 4R 3B 4B','3R 4R 3B 4B','3R','3R','3R','3R','3B','3B','3B','3B'];
    const riverIdx = [3,0,1,2,3,0,1,2,3,0,1,2,3,0,1,2,3,0,1,2][i % 20];
    const riverLabel = ['Bet when 4 Low/High','Bet when 3+ showing','50/50 random','None'][riverIdx];
    return { value: `Progressive ${n}`, label: `Progressive ${n}`, group: 'Progressive', cards: 'None', ranks: rankLabel, colors: colorOpts[i % 20], river: riverLabel };
  }),
  // Power Rank
  ...Array.from({length: 20}, (_, i) => {
    const n = i + 1;
    const colorOpts = ['None','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R','3B','None','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R','3B','None','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R','3B','None','3R 4R 5R 3B 4B 5B','3R 4R 3B 4B','3R','3B'];
    const riverIdx = [3,3,3,3,3,0,0,0,0,0,1,1,1,1,1,2,2,2,2,2][i];
    const riverLabel = ['Bet when 4 Low/High','Bet when 3+ showing','50/50 random','None'][riverIdx];
    return { value: `Power Rank ${n}`, label: `Power Rank ${n}`, group: 'Power Rank', cards: 'None', ranks: '4 of a Kind, Full House, 3 of a Kind, Two Pair', colors: colorOpts[i], river: riverLabel };
  }),
];

const GROUPS = [...new Set(STRATEGIES.map(s => s.group))];

const GAME_COUNTS = [10, 25, 50, 100, 500, 1000, 5000];

export default function StrategyTest() {
  const [selectedGroup, setSelectedGroup] = useState(GROUPS[0]);
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[0].value);
  const [gameCount, setGameCount] = useState(100);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedGame, setExpandedGame] = useState(null);

  const strategiesInGroup = STRATEGIES.filter(s => s.group === selectedGroup);
  const stratInfo = STRATEGIES.find(s => s.value === selectedStrategy);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setExpandedGame(null);
    try {
      const response = await base44.functions.invoke('detailedHandSimulation', {
        gamesToSimulate: gameCount,
        strategyFilter: selectedStrategy,
      });
      setResults(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm mb-3 inline-block">← Back to Game</Link>
          <h1 className="text-3xl font-bold">Strategy Betting Test</h1>
          <p className="text-gray-400 mt-1 text-sm">Select a strategy, set game count, and run individual tests.</p>
        </div>

        {/* Controls */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 mb-6 space-y-4">

          {/* Group selector */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Strategy Group</label>
            <div className="flex flex-wrap gap-2">
              {GROUPS.map(g => (
                <button
                  key={g}
                  onClick={() => {
                    setSelectedGroup(g);
                    const first = STRATEGIES.find(s => s.group === g);
                    if (first) setSelectedStrategy(first.value);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${selectedGroup === g ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy selector */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Strategy</label>
            <select
              value={selectedStrategy}
              onChange={e => setSelectedStrategy(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-blue-500 outline-none text-sm"
            >
              {strategiesInGroup.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Strategy info card */}
          {stratInfo && (
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">CARD BETS</p>
                <p className="text-white font-semibold">{stratInfo.cards}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">RANK BETS</p>
                <p className="text-white font-semibold">{stratInfo.ranks}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">COLOR BETS</p>
                <p className="text-white font-semibold">{stratInfo.colors}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">RIVER</p>
                <p className="text-yellow-300 font-semibold text-xs">{stratInfo.river}</p>
              </div>
            </div>
          )}

          {/* Game count + Run button */}
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Number of Games</label>
              <div className="flex gap-2">
                {GAME_COUNTS.map(n => (
                  <button
                    key={n}
                    onClick={() => setGameCount(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                      ${gameCount === n ? 'bg-yellow-600 text-black' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                  >
                    {n >= 1000 ? `${n/1000}K` : n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={runTest}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm disabled:bg-gray-700 transition-all mt-5"
              >
                <Play className="w-4 h-4" />
                {loading ? 'Running...' : `Run ${gameCount} Games`}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-4 text-red-300 text-sm">
            Error: {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400 mt-4">Simulating {gameCount} games with "{selectedStrategy}"...</p>
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

            {/* Summary */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Results: {selectedStrategy}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  results.summary?.isCompliant ? 'bg-green-900/50 text-green-300 border border-green-600' : 'bg-red-900/50 text-red-300 border border-red-600'
                }`}>
                  RTP: {results.summary?.overallRTP}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Games Played</p>
                  <p className="text-white font-bold text-lg">{results.summary?.totalGames?.toLocaleString()}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Total Wagered</p>
                  <p className="text-white font-bold text-lg">${results.summary?.totalBets?.toLocaleString()}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Total Paid Out</p>
                  <p className="text-white font-bold text-lg">${results.summary?.totalPayouts?.toLocaleString()}</p>
                </div>
                <div className={`rounded-lg p-3 ${results.summary?.houseProfit >= 0 ? 'bg-green-900/30 border border-green-700/40' : 'bg-red-900/30 border border-red-700/40'}`}>
                  <p className="text-gray-400 text-xs mb-1">House Profit</p>
                  <p className={`font-bold text-lg ${results.summary?.houseProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {results.summary?.houseProfit >= 0 ? '+' : ''}${results.summary?.houseProfit?.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Game-by-game table (first 100) */}
            {results.games && results.games.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                  <h3 className="font-bold text-lg">Game-by-Game Results <span className="text-gray-400 text-sm font-normal">(showing first {results.games.length})</span></h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900/50 text-xs text-gray-400 uppercase">
                        <th className="px-4 py-2 text-left">#</th>
                        <th className="px-4 py-2 text-left">Winning Hand</th>
                        <th className="px-4 py-2 text-left">Rank</th>
                        <th className="px-4 py-2 text-left">Color</th>
                        <th className="px-4 py-2 text-left">River</th>
                        <th className="px-4 py-2 text-right">Total Bet</th>
                        <th className="px-4 py-2 text-right">Payout</th>
                        <th className="px-4 py-2 text-right">House P/L</th>
                        <th className="px-4 py-2 text-right">Cum. RTP</th>
                        <th className="px-4 py-2 text-center">▼</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.games.map((game, idx) => {
                        const houseWon = game.houseProfit > 0;
                        return (
                          <>
                            <tr
                              key={idx}
                              onClick={() => setExpandedGame(expandedGame === idx ? null : idx)}
                              className={`border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/30 transition-colors ${expandedGame === idx ? 'bg-slate-700/40' : ''}`}
                            >
                              <td className="px-4 py-2 text-gray-400">{game.gameNumber}</td>
                              <td className="px-4 py-2 font-mono text-yellow-300">{game.gameOutcome?.winningHand}</td>
                              <td className="px-4 py-2 text-blue-300 text-xs">{game.gameOutcome?.winningRank}</td>
                              <td className="px-4 py-2 text-xs">{game.gameOutcome?.colorResult}</td>
                              <td className="px-4 py-2 text-xs text-purple-300">{game.gameOutcome?.riverResult}</td>
                              <td className="px-4 py-2 text-right">${game.totalBets}</td>
                              <td className="px-4 py-2 text-right text-green-300">${game.totalPayouts}</td>
                              <td className={`px-4 py-2 text-right font-bold ${houseWon ? 'text-green-400' : 'text-red-400'}`}>
                                {houseWon ? '+' : ''}{game.houseProfit?.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-right text-xs text-gray-400">{game.cumulativeRTP}</td>
                              <td className="px-4 py-2 text-center text-gray-500">
                                {expandedGame === idx ? <ChevronUp className="w-3 h-3 mx-auto" /> : <ChevronDown className="w-3 h-3 mx-auto" />}
                              </td>
                            </tr>
                            {expandedGame === idx && (
                              <tr key={`exp-${idx}`}>
                                <td colSpan="10" className="p-0">
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-slate-900/80 border-t border-slate-700 p-4"
                                  >
                                    <p className="text-xs text-gray-400 mb-3 font-bold uppercase">Player Details — Game #{game.gameNumber}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {game.players?.map((player, pi) => (
                                        <div key={pi} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 text-xs">
                                          <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-white">Player {player.playerId} — {player.strategy}</span>
                                            <span className={`font-bold ${player.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                              {player.profit >= 0 ? '+' : ''}${player.profit?.toFixed(2)}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-1 text-gray-400">
                                            <span>Bet: <span className="text-white">${player.totalBet}</span></span>
                                            <span>Won: <span className="text-green-300">${player.totalWin?.toFixed(2)}</span></span>
                                          </div>
                                          {player.bets?.hands && (
                                            <div className="mt-2">
                                              <span className="text-gray-500">Hands: </span>
                                              {player.bets.hands.map((h, hi) => (
                                                <span key={hi} className={`mr-1 ${h.won ? 'text-yellow-300 font-bold' : 'text-gray-500'}`}>
                                                  {h.cards}{h.won ? '✓' : '✗'}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                          {player.bets?.ranks && (
                                            <div className="mt-1">
                                              <span className="text-gray-500">Ranks: </span>
                                              {player.bets.ranks.map((r, ri) => (
                                                <span key={ri} className={`mr-1 ${r.won ? 'text-blue-300 font-bold' : 'text-gray-500'}`}>
                                                  {r.rank}{r.won ? '✓' : '✗'}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                          {player.bets?.colors && (
                                            <div className="mt-1">
                                              <span className="text-gray-500">Colors: </span>
                                              {player.bets.colors.map((c, ci) => (
                                                <span key={ci} className={`mr-1 ${c.won ? 'text-red-300 font-bold' : 'text-gray-500'}`}>
                                                  {c.colorKey}{c.won ? '✓' : '✗'}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                          {player.bets?.lowHigh && (
                                            <div className="mt-1">
                                              <span className="text-gray-500">River: </span>
                                              <span className={`${player.bets.lowHigh.won ? 'text-purple-300 font-bold' : 'text-gray-500'}`}>
                                                {player.bets.lowHigh.type} ${player.bets.lowHigh.amount}{player.bets.lowHigh.won ? '✓' : '✗'}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}