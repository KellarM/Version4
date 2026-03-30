import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { gamesToSimulate = 10 } = await req.json();

    const SUITS_MAP = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
    const FIXED_HANDS = [
      { id: 1,  payout: 8.10,  label: 'A♦/10♥', cards: [{ rank: 'A',  suit: 'diamonds' }, { rank: '10', suit: 'hearts'   }] },
      { id: 2,  payout: 6.75,  label: 'K♣/K♠',  cards: [{ rank: 'K',  suit: 'clubs'    }, { rank: 'K',  suit: 'spades'   }] },
      { id: 3,  payout: 8.52,  label: 'Q♣/J♠',  cards: [{ rank: 'Q',  suit: 'clubs'    }, { rank: 'J',  suit: 'spades'   }] },
      { id: 4,  payout: 7.90,  label: 'Q♠/10♠', cards: [{ rank: 'Q',  suit: 'spades'   }, { rank: '10', suit: 'spades'   }] },
      { id: 5,  payout: 8.31,  label: 'J♣/9♣',  cards: [{ rank: 'J',  suit: 'clubs'    }, { rank: '9',  suit: 'clubs'    }] },
      { id: 6,  payout: 10.18, label: '8♦/6♦',  cards: [{ rank: '8',  suit: 'diamonds' }, { rank: '6',  suit: 'diamonds' }] },
      { id: 7,  payout: 7.48,  label: '7♦/7♠',  cards: [{ rank: '7',  suit: 'diamonds' }, { rank: '7',  suit: 'spades'   }] },
      { id: 8,  payout: 11.95, label: '4♥/2♥',  cards: [{ rank: '4',  suit: 'hearts'   }, { rank: '2',  suit: 'hearts'   }] },
      { id: 9,  payout: 7.27,  label: '3♣/3♥',  cards: [{ rank: '3',  suit: 'clubs'    }, { rank: '3',  suit: 'hearts'   }] },
      { id: 10, payout: 9.77,  label: 'A♥/5♦',  cards: [{ rank: 'A',  suit: 'hearts'   }, { rank: '5',  suit: 'diamonds' }] },
    ];

    // Hand label -> id mapping
    const HAND_LABEL_TO_ID = {};
    for (const h of FIXED_HANDS) HAND_LABEL_TO_ID[h.label] = h.id;

    const RANK_PAYOUT_MAP = {
      'Royal Flush': null, 'Straight Flush': null,
      'Four of a Kind': 12.77, 'Full House': 2.53, 'Flush': 3.21,
      'Straight': 4.93, 'Three of a Kind': 3.81, 'Two Pair': 15.98, 'One Pair': null,
    };
    const RANK_FREQS = {
      'Royal Flush': 0.000154, 'Straight Flush': 0.00139, 'Four of a Kind': 0.00168,
      'Full House': 0.02596, 'Flush': 0.00327, 'Straight': 0.04619,
      'Three of a Kind': 0.02113, 'Two Pair': 0.04754, 'One Pair': 0.42257,
    };
    const COLOR_PAYOUTS = { '3R': 0.81, '3B': 0.81, '4R': 5.25, '4B': 5.25, '5R': 20.56, '5B': 20.56 };
    const LH_PAYOUT = 0.95;

    const RANK_KEYS = Object.keys(RANK_FREQS);
    const RANK_CUM = [];
    let _rc = 0;
    for (const k of RANK_KEYS) { _rc += RANK_FREQS[k]; RANK_CUM.push(_rc); }

    const RED_CUM = [0.03125, 0.18750, 0.50000, 0.81250, 0.96875, 1.00000];

    function rollRank() {
      const r = Math.random();
      for (let i = 0; i < RANK_CUM.length; i++) if (r < RANK_CUM[i]) return RANK_KEYS[i];
      return 'One Pair';
    }
    function rollRedCount() {
      const r = Math.random();
      for (let i = 0; i < 6; i++) if (r < RED_CUM[i]) return i;
      return 5;
    }
    function getWinningColorKeys(reds) {
      const blacks = 5 - reds, winners = [];
      if (reds >= 3)   for (let i = 3; i <= reds;   i++) winners.push(`${i}R`);
      if (blacks >= 3) for (let i = 3; i <= blacks;  i++) winners.push(`${i}B`);
      return winners;
    }

    // RIVER logic types:
    // 'none'    = no river bet
    // 'strict4' = bet only when 4 low (bet HIGH) or 4 high (bet LOW)
    // 'when3'   = bet when 3+ low or 3+ high showing (favour player)
    // 'random'  = 50/50 random pick

    // 391 strategies from user spec
    // Each: { name, hands: [handId,...], ranks: [rankName,...], colors: [colorKey,...], river: 'none'|'strict4'|'when3'|'random' }
    const STRATEGIES = [
      // 1 Kind Combo
      { name: 'Kind Combo', hands:[2,7], ranks:['Three of a Kind','Four of a Kind'], colors:[], river:'strict4' },
      // 2 High Odds
      { name: "High Odd's", hands:[1,3,4,2], ranks:['One Pair'], colors:[], river:'strict4' },
      // 3 Pair Combo
      { name: 'Pair Combo', hands:[1,2], ranks:['One Pair','Two Pair'], colors:[], river:'strict4' },
      // 4 Kind Combo 2
      { name: 'Kind Combo 2', hands:[2,7], ranks:['Three of a Kind','Four of a Kind'], colors:['3R','4R','3B','4B'], river:'strict4' },
      // 5 High Odds 2
      { name: "High Odd's 2", hands:[1,3,4,2], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'strict4' },
      // 6 Pair Combo 2
      { name: 'Pair Combo 2', hands:[1,2], ranks:['One Pair','Two Pair'], colors:['3R','4R','3B','4B'], river:'strict4' },
      // 7 Kind Combo 3
      { name: 'Kind Combo 3', hands:[2,7], ranks:['Three of a Kind','Four of a Kind'], colors:['3R','4R'], river:'strict4' },
      // 8 High Odds 3
      { name: "High Odd's 3", hands:[1,3,4,2], ranks:['One Pair'], colors:['3R','4R'], river:'strict4' },
      // 9 Pair Combo 3
      { name: 'Pair Combo 3', hands:[1,2], ranks:['One Pair','Two Pair'], colors:['3R','4R'], river:'strict4' },
      // 10 Kind Combo 4
      { name: 'Kind Combo 4', hands:[2,7], ranks:['Three of a Kind','Four of a Kind'], colors:['3B','4B'], river:'none' },
      // 11 High Odds 4
      { name: "High Odd's 4", hands:[1,3,4,2], ranks:['One Pair'], colors:['3B','4B'], river:'none' },
      // 12 Pair Combo 4
      { name: 'Pair Combo 4', hands:[1,2], ranks:['One Pair','Two Pair'], colors:['3B','4B'], river:'none' },
      // 13 Kind Combo 5
      { name: 'Kind Combo 5', hands:[2,7], ranks:['Three of a Kind','Four of a Kind'], colors:['3B'], river:'none' },
      // 14 High Odds 5
      { name: "High Odd's 5", hands:[1,3,4,2], ranks:['One Pair'], colors:['3B'], river:'none' },
      // 15 Pair Combo 5
      { name: 'Pair Combo 5', hands:[1,2], ranks:['One Pair','Two Pair'], colors:['3B'], river:'none' },
      // 16 Kind Combo 6
      { name: 'Kind Combo 6', hands:[2,7], ranks:['Three of a Kind','Four of a Kind'], colors:['3R'], river:'none' },
      // 17 High Odds 6
      { name: "High Odd's 6", hands:[1,3,4,2], ranks:['One Pair'], colors:['3R'], river:'none' },
      // 18 Pair Combo 6
      { name: 'Pair Combo 6', hands:[1,2], ranks:['One Pair','Two Pair'], colors:['3R'], river:'none' },
      // 19-24 Black Flush 1-6
      { name: 'Black Flush 1', hands:[4,5], ranks:['Flush'], colors:['3B','4B','5B'], river:'when3' },
      { name: 'Black Flush 2', hands:[4,5], ranks:['Flush'], colors:['3B','4B'], river:'when3' },
      { name: 'Black Flush 3', hands:[4,5], ranks:['Flush'], colors:['3B'], river:'when3' },
      { name: 'Black Flush 4', hands:[4,5], ranks:['Flush'], colors:['3B','4B','5B'], river:'none' },
      { name: 'Black Flush 5', hands:[4,5], ranks:['Flush'], colors:['3B','4B'], river:'none' },
      { name: 'Black Flush 6', hands:[4,5], ranks:['Flush'], colors:['3B'], river:'none' },
      // 25-30 Single Black Flush 1-6 (Q♠/10♠)
      { name: 'Single Black Flush 1', hands:[4], ranks:['Flush'], colors:['3B','4B','5B'], river:'when3' },
      { name: 'Single Black Flush 2', hands:[4], ranks:['Flush'], colors:['3B','4B'], river:'when3' },
      { name: 'Single Black Flush 3', hands:[4], ranks:['Flush'], colors:['3B'], river:'when3' },
      { name: 'Single Black Flush 4', hands:[4], ranks:['Flush'], colors:['3B','4B','5B'], river:'none' },
      { name: 'Single Black Flush 5', hands:[4], ranks:['Flush'], colors:['3B','4B'], river:'none' },
      { name: 'Single Black Flush 6', hands:[4], ranks:['Flush'], colors:['3B'], river:'none' },
      // 31-36 Single Black Flush 7-12 (J♣/9♣)
      { name: 'Single Black Flush 7', hands:[5], ranks:['Flush'], colors:['3B','4B','5B'], river:'when3' },
      { name: 'Single Black Flush 8', hands:[5], ranks:['Flush'], colors:['3B','4B'], river:'when3' },
      { name: 'Single Black Flush 9', hands:[5], ranks:['Flush'], colors:['3B'], river:'when3' },
      { name: 'Single Black Flush 10', hands:[5], ranks:['Flush'], colors:['3B','4B','5B'], river:'none' },
      { name: 'Single Black Flush 11', hands:[5], ranks:['Flush'], colors:['3B','4B'], river:'none' },
      { name: 'Single Black Flush 12', hands:[5], ranks:['Flush'], colors:['3B'], river:'none' },
      // 37-42 Red Flush 1-6 (8♦/6♦ + 4♥/2♥)
      { name: 'Red Flush 1', hands:[6,8], ranks:['Flush'], colors:['3R','4R','5R'], river:'when3' },
      { name: 'Red Flush 2', hands:[6,8], ranks:['Flush'], colors:['3R','4R'], river:'when3' },
      { name: 'Red Flush 3', hands:[6,8], ranks:['Flush'], colors:['3R'], river:'when3' },
      { name: 'Red Flush 4', hands:[6,8], ranks:['Flush'], colors:['3R','4R','5R'], river:'none' },
      { name: 'Red Flush 5', hands:[6,8], ranks:['Flush'], colors:['3R','4R'], river:'none' },
      { name: 'Red Flush 6', hands:[6,8], ranks:['Flush'], colors:['3R'], river:'none' },
      // 43-48 Single Red Flush 1-6 (8♦/6♦)
      { name: 'Single Red Flush 1', hands:[6], ranks:['Flush'], colors:['3R','4R','5R'], river:'when3' },
      { name: 'Single Red Flush 2', hands:[6], ranks:['Flush'], colors:['3R','4R'], river:'when3' },
      { name: 'Single Red Flush 3', hands:[6], ranks:['Flush'], colors:['3R'], river:'when3' },
      { name: 'Single Red Flush 4', hands:[6], ranks:['Flush'], colors:['3R','4R','5R'], river:'none' },
      { name: 'Single Red Flush 5', hands:[6], ranks:['Flush'], colors:['3R','4R'], river:'none' },
      { name: 'Single Red Flush 6', hands:[6], ranks:['Flush'], colors:['3R'], river:'none' },
      // 49-54 Single Red Flush 7-12 (4♥/2♥)
      { name: 'Single Red Flush 7', hands:[8], ranks:['Flush'], colors:['3R','4R','5R'], river:'when3' },
      { name: 'Single Red Flush 8', hands:[8], ranks:['Flush'], colors:['3R','4R'], river:'when3' },
      { name: 'Single Red Flush 9', hands:[8], ranks:['Flush'], colors:['3R'], river:'when3' },
      { name: 'Single Red Flush 10', hands:[8], ranks:['Flush'], colors:['3R','4R','5R'], river:'none' },
      { name: 'Single Red Flush 11', hands:[8], ranks:['Flush'], colors:['3R','4R'], river:'none' },
      { name: 'Single Red Flush 12', hands:[8], ranks:['Flush'], colors:['3R'], river:'none' },
      // 55-59 Straight Mix 1-5
      { name: 'Straight Mix 1', hands:[1,10], ranks:['Straight'], colors:[], river:'strict4' },
      { name: 'Straight Mix 2', hands:[3,4], ranks:['Straight'], colors:[], river:'strict4' },
      { name: 'Straight Mix 3', hands:[4,5], ranks:['Straight'], colors:[], river:'strict4' },
      { name: 'Straight Mix 4', hands:[5,6], ranks:['Straight'], colors:[], river:'strict4' },
      { name: 'Straight Mix 5', hands:[6,8], ranks:['Straight'], colors:[], river:'strict4' },
      // 60-64 Straight Mix 6-10 (all 6 colors)
      { name: 'Straight Mix 6', hands:[1,10], ranks:['Straight'], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Straight Mix 7', hands:[3,4], ranks:['Straight'], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Straight Mix 8', hands:[4,5], ranks:['Straight'], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Straight Mix 9', hands:[5,6], ranks:['Straight'], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Straight Mix 10', hands:[6,8], ranks:['Straight'], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      // 65-69 Straight Mix 11-15 (3R,4R,3B,4B)
      { name: 'Straight Mix 11', hands:[1,10], ranks:['Straight'], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Straight Mix 12', hands:[3,4], ranks:['Straight'], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Straight Mix 13', hands:[4,5], ranks:['Straight'], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Straight Mix 14', hands:[5,6], ranks:['Straight'], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Straight Mix 15', hands:[6,8], ranks:['Straight'], colors:['3R','4R','3B','4B'], river:'strict4' },
      // 70-74 Straight Mix 16-20 (3R,4R)
      { name: 'Straight Mix 16', hands:[1,10], ranks:['Straight'], colors:['3R','4R'], river:'strict4' },
      { name: 'Straight Mix 17', hands:[3,4], ranks:['Straight'], colors:['3R','4R'], river:'strict4' },
      { name: 'Straight Mix 18', hands:[4,5], ranks:['Straight'], colors:['3R','4R'], river:'strict4' },
      { name: 'Straight Mix 19', hands:[5,6], ranks:['Straight'], colors:['3R','4R'], river:'strict4' },
      { name: 'Straight Mix 20', hands:[6,8], ranks:['Straight'], colors:['3R','4R'], river:'strict4' },
      // 75-79 Straight Mix 21-25 (3B,4B)
      { name: 'Straight Mix 21', hands:[1,10], ranks:['Straight'], colors:['3B','4B'], river:'strict4' },
      { name: 'Straight Mix 22', hands:[3,4], ranks:['Straight'], colors:['3B','4B'], river:'strict4' },
      { name: 'Straight Mix 23', hands:[4,5], ranks:['Straight'], colors:['3B','4B'], river:'strict4' },
      { name: 'Straight Mix 24', hands:[5,6], ranks:['Straight'], colors:['3B','4B'], river:'strict4' },
      { name: 'Straight Mix 25', hands:[6,8], ranks:['Straight'], colors:['3B','4B'], river:'strict4' },
      // 80-84 Straight Mix 26-30 (3R)
      { name: 'Straight Mix 26', hands:[1,10], ranks:['Straight'], colors:['3R'], river:'strict4' },
      { name: 'Straight Mix 27', hands:[3,4], ranks:['Straight'], colors:['3R'], river:'strict4' },
      { name: 'Straight Mix 28', hands:[4,5], ranks:['Straight'], colors:['3R'], river:'strict4' },
      { name: 'Straight Mix 29', hands:[5,6], ranks:['Straight'], colors:['3R'], river:'strict4' },
      { name: 'Straight Mix 30', hands:[6,8], ranks:['Straight'], colors:['3R'], river:'strict4' },
      // 85-89 Straight Mix 31-35 (3B)
      { name: 'Straight Mix 31', hands:[1,10], ranks:['Straight'], colors:['3B'], river:'strict4' },
      { name: 'Straight Mix 32', hands:[3,4], ranks:['Straight'], colors:['3B'], river:'strict4' },
      { name: 'Straight Mix 33', hands:[4,5], ranks:['Straight'], colors:['3B'], river:'strict4' },
      { name: 'Straight Mix 34', hands:[5,6], ranks:['Straight'], colors:['3B'], river:'strict4' },
      { name: 'Straight Mix 35', hands:[6,8], ranks:['Straight'], colors:['3B'], river:'strict4' },
      // 90-94 Straight Mix 36-40 (no color, no river)
      { name: 'Straight Mix 36', hands:[1,10], ranks:['Straight'], colors:[], river:'none' },
      { name: 'Straight Mix 37', hands:[3,4], ranks:['Straight'], colors:[], river:'none' },
      { name: 'Straight Mix 38', hands:[4,5], ranks:['Straight'], colors:[], river:'none' },
      { name: 'Straight Mix 39', hands:[5,6], ranks:['Straight'], colors:[], river:'none' },
      { name: 'Straight Mix 40', hands:[6,8], ranks:['Straight'], colors:[], river:'none' },
      // 95-99 Straight Mix 41-45 (all 6 colors, no river)
      { name: 'Straight Mix 41', hands:[1,10], ranks:['Straight'], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Straight Mix 42', hands:[3,4], ranks:['Straight'], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Straight Mix 43', hands:[4,5], ranks:['Straight'], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Straight Mix 44', hands:[5,6], ranks:['Straight'], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Straight Mix 45', hands:[6,8], ranks:['Straight'], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      // 100-104 Straight Mix 46-50 (3R,4R,3B,4B, no river)
      { name: 'Straight Mix 46', hands:[1,10], ranks:['Straight'], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Straight Mix 47', hands:[3,4], ranks:['Straight'], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Straight Mix 48', hands:[4,5], ranks:['Straight'], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Straight Mix 49', hands:[5,6], ranks:['Straight'], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Straight Mix 50', hands:[6,8], ranks:['Straight'], colors:['3R','4R','3B','4B'], river:'none' },
      // 105-109 Straight Mix 51-55 (3R,4R no river)
      { name: 'Straight Mix 51', hands:[1,10], ranks:['Straight'], colors:['3R','4R'], river:'none' },
      { name: 'Straight Mix 52', hands:[3,4], ranks:['Straight'], colors:['3R','4R'], river:'none' },
      { name: 'Straight Mix 53', hands:[4,5], ranks:['Straight'], colors:['3R','4R'], river:'none' },
      { name: 'Straight Mix 54', hands:[5,6], ranks:['Straight'], colors:['3R','4R'], river:'none' },
      { name: 'Straight Mix 55', hands:[6,8], ranks:['Straight'], colors:['3R','4R'], river:'none' },
      // 110-114 Straight Mix 56-60 (3B,4B no river)
      { name: 'Straight Mix 56', hands:[1,10], ranks:['Straight'], colors:['3B','4B'], river:'none' },
      { name: 'Straight Mix 57', hands:[3,4], ranks:['Straight'], colors:['3B','4B'], river:'none' },
      { name: 'Straight Mix 58', hands:[4,5], ranks:['Straight'], colors:['3B','4B'], river:'none' },
      { name: 'Straight Mix 59', hands:[5,6], ranks:['Straight'], colors:['3B','4B'], river:'none' },
      { name: 'Straight Mix 60', hands:[6,8], ranks:['Straight'], colors:['3B','4B'], river:'none' },
      // 115-119 Straight Mix 61-65 (3R no river)
      { name: 'Straight Mix 61', hands:[1,10], ranks:['Straight'], colors:['3R'], river:'none' },
      { name: 'Straight Mix 62', hands:[3,4], ranks:['Straight'], colors:['3R'], river:'none' },
      { name: 'Straight Mix 63', hands:[4,5], ranks:['Straight'], colors:['3R'], river:'none' },
      { name: 'Straight Mix 64', hands:[5,6], ranks:['Straight'], colors:['3R'], river:'none' },
      { name: 'Straight Mix 65', hands:[6,8], ranks:['Straight'], colors:['3R'], river:'none' },
      // 120-124 Straight Mix 66-70 (3B no river)
      { name: 'Straight Mix 66', hands:[1,10], ranks:['Straight'], colors:['3B'], river:'none' },
      { name: 'Straight Mix 67', hands:[3,4], ranks:['Straight'], colors:['3B'], river:'none' },
      { name: 'Straight Mix 68', hands:[4,5], ranks:['Straight'], colors:['3B'], river:'none' },
      { name: 'Straight Mix 69', hands:[5,6], ranks:['Straight'], colors:['3B'], river:'none' },
      { name: 'Straight Mix 70', hands:[6,8], ranks:['Straight'], colors:['3B'], river:'none' },
      // 125-129 Straight Mix 71-75 (no color no river - duplicates 36-40, keep for completeness)
      { name: 'Straight Mix 71', hands:[1,10], ranks:['Straight'], colors:[], river:'none' },
      { name: 'Straight Mix 72', hands:[3,4], ranks:['Straight'], colors:[], river:'none' },
      { name: 'Straight Mix 73', hands:[4,5], ranks:['Straight'], colors:[], river:'none' },
      { name: 'Straight Mix 74', hands:[5,6], ranks:['Straight'], colors:[], river:'none' },
      { name: 'Straight Mix 75', hands:[6,8], ranks:['Straight'], colors:[], river:'none' },
      // 130-139 Single 1-10
      { name: 'Single 1', hands:[1], ranks:[], colors:[], river:'none' },
      { name: 'Single 2', hands:[2], ranks:[], colors:[], river:'none' },
      { name: 'Single 3', hands:[3], ranks:[], colors:[], river:'none' },
      { name: 'Single 4', hands:[4], ranks:[], colors:[], river:'none' },
      { name: 'Single 5', hands:[5], ranks:[], colors:[], river:'none' },
      { name: 'Single 6', hands:[6], ranks:[], colors:[], river:'none' },
      { name: 'Single 7', hands:[7], ranks:[], colors:[], river:'none' },
      { name: 'Single 8', hands:[8], ranks:[], colors:[], river:'none' },
      { name: 'Single 9', hands:[9], ranks:[], colors:[], river:'none' },
      { name: 'Single 10', hands:[10], ranks:[], colors:[], river:'none' },
      // 140-149 Single Mix 1-10 (One Pair + Two Pair)
      { name: 'Single Mix 1', hands:[1], ranks:['One Pair','Two Pair'], colors:[], river:'none' },
      { name: 'Single Mix 2', hands:[2], ranks:['One Pair','Two Pair'], colors:[], river:'none' },
      { name: 'Single Mix 3', hands:[3], ranks:['One Pair','Two Pair'], colors:[], river:'none' },
      { name: 'Single Mix 4', hands:[4], ranks:['One Pair','Two Pair'], colors:[], river:'none' },
      { name: 'Single Mix 5', hands:[5], ranks:['One Pair','Two Pair'], colors:[], river:'none' },
      { name: 'Single Mix 6', hands:[6], ranks:['One Pair','Two Pair'], colors:[], river:'none' },
      { name: 'Single Mix 7', hands:[7], ranks:['One Pair','Two Pair'], colors:[], river:'none' },
      { name: 'Single Mix 8', hands:[8], ranks:['One Pair','Two Pair'], colors:[], river:'none' },
      { name: 'Single Mix 9', hands:[9], ranks:['One Pair','Two Pair'], colors:[], river:'none' },
      { name: 'Single Mix 10', hands:[10], ranks:['One Pair','Two Pair'], colors:[], river:'none' },
      // 150-169 Single Mix 11-30 (One Pair only)
      { name: 'Single Mix 11', hands:[1], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 12', hands:[2], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 13', hands:[3], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 14', hands:[4], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 15', hands:[5], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 16', hands:[6], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 17', hands:[7], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 18', hands:[8], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 19', hands:[9], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 20', hands:[10], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 21', hands:[1], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 22', hands:[2], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 23', hands:[3], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 24', hands:[4], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 25', hands:[5], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 26', hands:[6], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 27', hands:[7], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 28', hands:[8], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 29', hands:[9], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Single Mix 30', hands:[10], ranks:['One Pair'], colors:[], river:'none' },
      // 170-196 Foursome 1-27 (hands 1,2,3,10)
      { name: 'Foursome 1', hands:[1,2,3,10], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Foursome 2', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Foursome 3', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Foursome 4', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R'], river:'none' },
      { name: 'Foursome 5', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B','4B'], river:'none' },
      { name: 'Foursome 6', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R'], river:'none' },
      { name: 'Foursome 7', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B'], river:'none' },
      { name: 'Foursome 8', hands:[1,2,3,10], ranks:['One Pair'], colors:[], river:'strict4' },
      { name: 'Foursome 9', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Foursome 10', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Foursome 11', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R'], river:'strict4' },
      { name: 'Foursome 12', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B','4B'], river:'strict4' },
      { name: 'Foursome 13', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R'], river:'strict4' },
      { name: 'Foursome 14', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B'], river:'strict4' },
      { name: 'Foursome 15', hands:[1,2,3,10], ranks:['One Pair'], colors:[], river:'when3' },
      { name: 'Foursome 16', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Foursome 17', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Foursome 18', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R'], river:'when3' },
      { name: 'Foursome 19', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B','4B'], river:'when3' },
      { name: 'Foursome 20', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R'], river:'when3' },
      { name: 'Foursome 21', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B'], river:'when3' },
      { name: 'Foursome 22', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Foursome 23', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Foursome 24', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R'], river:'random' },
      { name: 'Foursome 25', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B','4B'], river:'random' },
      { name: 'Foursome 26', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R'], river:'random' },
      { name: 'Foursome 27', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B'], river:'random' },
      // 197-228 Foursome 2/4 1-32 (hands 1,3,4,5)
      { name: 'Foursome 2/4 1', hands:[1,3,4,5], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Foursome 2/4 2', hands:[1,3,4,5], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Foursome 2/4 3', hands:[1,3,4,5], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Foursome 2/4 4', hands:[1,3,4,5], ranks:['One Pair'], colors:['3R','3B'], river:'strict4' },
      { name: 'Foursome 2/4 5', hands:[1,3,4,5], ranks:['One Pair'], colors:['3R'], river:'strict4' },
      { name: 'Foursome 2/4 6', hands:[1,3,4,5], ranks:['One Pair'], colors:['3B'], river:'strict4' },
      { name: 'Foursome 2/4 7', hands:[1,3,4,5], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Foursome 2/4 8', hands:[1,3,4,5], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Foursome 2/4 9', hands:[1,3,4,5], ranks:['One Pair'], colors:['3R','3B'], river:'when3' },
      { name: 'Foursome 2/4 10', hands:[1,3,4,5], ranks:['One Pair'], colors:['3R'], river:'when3' },
      { name: 'Foursome 2/4 11', hands:[1,3,4,5], ranks:['One Pair'], colors:['3B'], river:'when3' },
      { name: 'Foursome 2/4 12', hands:[1,3,4,5], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Foursome 2/4 13', hands:[1,3,4,5], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Foursome 2/4 14', hands:[1,3,4,5], ranks:['One Pair'], colors:['3R','3B'], river:'random' },
      { name: 'Foursome 2/4 15', hands:[1,3,4,5], ranks:['One Pair'], colors:['3R'], river:'random' },
      { name: 'Foursome 2/4 16', hands:[1,3,4,5], ranks:['One Pair'], colors:['3B'], river:'random' },
      // 213-228: hands 1,6,8,10
      { name: 'Foursome 2/4 17', hands:[1,6,8,10], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Foursome 2/4 18', hands:[1,6,8,10], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Foursome 2/4 19', hands:[1,6,8,10], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Foursome 2/4 20', hands:[1,6,8,10], ranks:['One Pair'], colors:['3R','3B'], river:'strict4' },
      { name: 'Foursome 2/4 21', hands:[1,6,8,10], ranks:['One Pair'], colors:['3R'], river:'strict4' },
      { name: 'Foursome 2/4 22', hands:[1,6,8,10], ranks:['One Pair'], colors:['3B'], river:'strict4' },
      { name: 'Foursome 2/4 23', hands:[1,6,8,10], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Foursome 2/4 24', hands:[1,6,8,10], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Foursome 2/4 25', hands:[1,6,8,10], ranks:['One Pair'], colors:['3R','3B'], river:'when3' },
      { name: 'Foursome 2/4 26', hands:[1,6,8,10], ranks:['One Pair'], colors:['3R'], river:'when3' },
      { name: 'Foursome 2/4 27', hands:[1,6,8,10], ranks:['One Pair'], colors:['3B'], river:'when3' },
      { name: 'Foursome 2/4 28', hands:[1,6,8,10], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Foursome 2/4 29', hands:[1,6,8,10], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Foursome 2/4 30', hands:[1,6,8,10], ranks:['One Pair'], colors:['3R','3B'], river:'random' },
      { name: 'Foursome 2/4 31', hands:[1,6,8,10], ranks:['One Pair'], colors:['3R'], river:'random' },
      { name: 'Foursome 2/4 32', hands:[1,6,8,10], ranks:['One Pair'], colors:['3B'], river:'random' },
      // 229-255: Foursome 1-27 again with hands 1,2,3,10 (second block — same structure, for completeness)
      { name: 'Foursome B1', hands:[1,2,3,10], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Foursome B2', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Foursome B3', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Foursome B4', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R'], river:'none' },
      { name: 'Foursome B5', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B','4B'], river:'none' },
      { name: 'Foursome B6', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R'], river:'none' },
      { name: 'Foursome B7', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B'], river:'none' },
      { name: 'Foursome B8', hands:[1,2,3,10], ranks:['One Pair'], colors:[], river:'strict4' },
      { name: 'Foursome B9', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Foursome B10', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Foursome B11', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R'], river:'strict4' },
      { name: 'Foursome B12', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B','4B'], river:'strict4' },
      { name: 'Foursome B13', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R'], river:'strict4' },
      { name: 'Foursome B14', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B'], river:'strict4' },
      { name: 'Foursome B15', hands:[1,2,3,10], ranks:['One Pair'], colors:[], river:'when3' },
      { name: 'Foursome B16', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Foursome B17', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Foursome B18', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R'], river:'when3' },
      { name: 'Foursome B19', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B','4B'], river:'when3' },
      { name: 'Foursome B20', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R'], river:'when3' },
      { name: 'Foursome B21', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B'], river:'when3' },
      { name: 'Foursome B22', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Foursome B23', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Foursome B24', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R','4R'], river:'random' },
      { name: 'Foursome B25', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B','4B'], river:'random' },
      { name: 'Foursome B26', hands:[1,2,3,10], ranks:['One Pair'], colors:['3R'], river:'random' },
      { name: 'Foursome B27', hands:[1,2,3,10], ranks:['One Pair'], colors:['3B'], river:'random' },
      // 256-271: Foursome 2/4 1-16 (hands 1,3,4,5 no rank)
      { name: 'Foursome 2/4 NR1', hands:[1,3,4,5], ranks:[], colors:[], river:'none' },
      { name: 'Foursome 2/4 NR2', hands:[1,3,4,5], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Foursome 2/4 NR3', hands:[1,3,4,5], ranks:[], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Foursome 2/4 NR4', hands:[1,3,4,5], ranks:[], colors:['3R','3B'], river:'strict4' },
      { name: 'Foursome 2/4 NR5', hands:[1,3,4,5], ranks:[], colors:['3R'], river:'strict4' },
      { name: 'Foursome 2/4 NR6', hands:[1,3,4,5], ranks:[], colors:['3B'], river:'strict4' },
      { name: 'Foursome 2/4 NR7', hands:[1,3,4,5], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Foursome 2/4 NR8', hands:[1,3,4,5], ranks:[], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Foursome 2/4 NR9', hands:[1,3,4,5], ranks:[], colors:['3R','3B'], river:'when3' },
      { name: 'Foursome 2/4 NR10', hands:[1,3,4,5], ranks:[], colors:['3R'], river:'when3' },
      { name: 'Foursome 2/4 NR11', hands:[1,3,4,5], ranks:[], colors:['3B'], river:'when3' },
      { name: 'Foursome 2/4 NR12', hands:[1,3,4,5], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Foursome 2/4 NR13', hands:[1,3,4,5], ranks:[], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Foursome 2/4 NR14', hands:[1,3,4,5], ranks:[], colors:['3R','3B'], river:'random' },
      { name: 'Foursome 2/4 NR15', hands:[1,3,4,5], ranks:[], colors:['3R'], river:'random' },
      { name: 'Foursome 2/4 NR16', hands:[1,3,4,5], ranks:[], colors:['3B'], river:'random' },
      // 272-287: hands 1,6,8,10 no rank
      { name: 'Foursome 2/4 NR17', hands:[1,6,8,10], ranks:[], colors:[], river:'none' },
      { name: 'Foursome 2/4 NR18', hands:[1,6,8,10], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Foursome 2/4 NR19', hands:[1,6,8,10], ranks:[], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Foursome 2/4 NR20', hands:[1,6,8,10], ranks:[], colors:['3R','3B'], river:'strict4' },
      { name: 'Foursome 2/4 NR21', hands:[1,6,8,10], ranks:[], colors:['3R'], river:'strict4' },
      { name: 'Foursome 2/4 NR22', hands:[1,6,8,10], ranks:[], colors:['3B'], river:'strict4' },
      { name: 'Foursome 2/4 NR23', hands:[1,6,8,10], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Foursome 2/4 NR24', hands:[1,6,8,10], ranks:[], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Foursome 2/4 NR25', hands:[1,6,8,10], ranks:[], colors:['3R','3B'], river:'when3' },
      { name: 'Foursome 2/4 NR26', hands:[1,6,8,10], ranks:[], colors:['3R'], river:'when3' },
      { name: 'Foursome 2/4 NR27', hands:[1,6,8,10], ranks:[], colors:['3B'], river:'when3' },
      { name: 'Foursome 2/4 NR28', hands:[1,6,8,10], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Foursome 2/4 NR29', hands:[1,6,8,10], ranks:[], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Foursome 2/4 NR30', hands:[1,6,8,10], ranks:[], colors:['3R','3B'], river:'random' },
      { name: 'Foursome 2/4 NR31', hands:[1,6,8,10], ranks:[], colors:['3R'], river:'random' },
      { name: 'Foursome 2/4 NR32', hands:[1,6,8,10], ranks:[], colors:['3B'], river:'random' },
      // 288-311 Rank High Odds 1-24 (no hands)
      { name: 'Rank High Odds 1', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Rank High Odds 2', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Rank High Odds 3', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Rank High Odds 4', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Rank High Odds 5', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Rank High Odds 6', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Rank High Odds 7', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Rank High Odds 8', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Rank High Odds 9', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R','3B'], river:'strict4' },
      { name: 'Rank High Odds 10', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R','3B'], river:'when3' },
      { name: 'Rank High Odds 11', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R','3B'], river:'random' },
      { name: 'Rank High Odds 12', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R','3B'], river:'none' },
      { name: 'Rank High Odds 13', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R'], river:'strict4' },
      { name: 'Rank High Odds 14', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R'], river:'when3' },
      { name: 'Rank High Odds 15', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R'], river:'random' },
      { name: 'Rank High Odds 16', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3R'], river:'none' },
      { name: 'Rank High Odds 17', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3B'], river:'strict4' },
      { name: 'Rank High Odds 18', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3B'], river:'when3' },
      { name: 'Rank High Odds 19', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3B'], river:'random' },
      { name: 'Rank High Odds 20', hands:[], ranks:['Two Pair','Four of a Kind'], colors:['3B'], river:'none' },
      { name: 'Rank High Odds 21', hands:[], ranks:['Two Pair','Four of a Kind'], colors:[], river:'strict4' },
      { name: 'Rank High Odds 22', hands:[], ranks:['Two Pair','Four of a Kind'], colors:[], river:'when3' },
      { name: 'Rank High Odds 23', hands:[], ranks:['Two Pair','Four of a Kind'], colors:[], river:'random' },
      { name: 'Rank High Odds 24', hands:[], ranks:['Two Pair','Four of a Kind'], colors:[], river:'none' },
      // 312-331 Color Board 1-20
      { name: 'Color Board 1', hands:[], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Color Board 2', hands:[], ranks:[], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Color Board 3', hands:[], ranks:[], colors:['3R','3B'], river:'none' },
      { name: 'Color Board 4', hands:[], ranks:[], colors:['3R'], river:'none' },
      { name: 'Color Board 5', hands:[], ranks:[], colors:['3B'], river:'none' },
      { name: 'Color Board 6', hands:[], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Color Board 7', hands:[], ranks:[], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Color Board 8', hands:[], ranks:[], colors:['3R','3B'], river:'strict4' },
      { name: 'Color Board 9', hands:[], ranks:[], colors:['3R'], river:'strict4' },
      { name: 'Color Board 10', hands:[], ranks:[], colors:['3B'], river:'strict4' },
      { name: 'Color Board 11', hands:[], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Color Board 12', hands:[], ranks:[], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Color Board 13', hands:[], ranks:[], colors:['3R','3B'], river:'when3' },
      { name: 'Color Board 14', hands:[], ranks:[], colors:['3R'], river:'when3' },
      { name: 'Color Board 15', hands:[], ranks:[], colors:['3B'], river:'when3' },
      { name: 'Color Board 16', hands:[], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Color Board 17', hands:[], ranks:[], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Color Board 18', hands:[], ranks:[], colors:['3R','3B'], river:'random' },
      { name: 'Color Board 19', hands:[], ranks:[], colors:['3R'], river:'random' },
      { name: 'Color Board 20', hands:[], ranks:[], colors:['3B'], river:'random' },
      // 332-351 Progressive 1-20 (One Pair only)
      { name: 'Progressive 1', hands:[], ranks:['One Pair'], colors:[], river:'none' },
      { name: 'Progressive 2', hands:[], ranks:['One Pair'], colors:[], river:'strict4' },
      { name: 'Progressive 3', hands:[], ranks:['One Pair'], colors:[], river:'when3' },
      { name: 'Progressive 4', hands:[], ranks:['One Pair'], colors:[], river:'random' },
      { name: 'Progressive 5', hands:[], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Progressive 6', hands:[], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Progressive 7', hands:[], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Progressive 8', hands:[], ranks:['One Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Progressive 9', hands:[], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Progressive 10', hands:[], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Progressive 11', hands:[], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Progressive 12', hands:[], ranks:['One Pair'], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Progressive 13', hands:[], ranks:['One Pair'], colors:['3R'], river:'none' },
      { name: 'Progressive 14', hands:[], ranks:['One Pair'], colors:['3R'], river:'strict4' },
      { name: 'Progressive 15', hands:[], ranks:['One Pair'], colors:['3R'], river:'when3' },
      { name: 'Progressive 16', hands:[], ranks:['One Pair'], colors:['3R'], river:'random' },
      { name: 'Progressive 17', hands:[], ranks:['One Pair'], colors:['3B'], river:'none' },
      { name: 'Progressive 18', hands:[], ranks:['One Pair'], colors:['3B'], river:'strict4' },
      { name: 'Progressive 19', hands:[], ranks:['One Pair'], colors:['3B'], river:'when3' },
      { name: 'Progressive 20', hands:[], ranks:['One Pair'], colors:['3B'], river:'random' },
      // 352-371 Progressive 21-40 (One Pair + Straight Flush)
      { name: 'Progressive 21', hands:[], ranks:['One Pair','Straight Flush'], colors:[], river:'none' },
      { name: 'Progressive 22', hands:[], ranks:['One Pair','Straight Flush'], colors:[], river:'strict4' },
      { name: 'Progressive 23', hands:[], ranks:['One Pair','Straight Flush'], colors:[], river:'when3' },
      { name: 'Progressive 24', hands:[], ranks:['One Pair','Straight Flush'], colors:[], river:'random' },
      { name: 'Progressive 25', hands:[], ranks:['One Pair','Straight Flush'], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Progressive 26', hands:[], ranks:['One Pair','Straight Flush'], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Progressive 27', hands:[], ranks:['One Pair','Straight Flush'], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Progressive 28', hands:[], ranks:['One Pair','Straight Flush'], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Progressive 29', hands:[], ranks:['One Pair','Straight Flush'], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Progressive 30', hands:[], ranks:['One Pair','Straight Flush'], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Progressive 31', hands:[], ranks:['One Pair','Straight Flush'], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Progressive 32', hands:[], ranks:['One Pair','Straight Flush'], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Progressive 33', hands:[], ranks:['One Pair','Straight Flush'], colors:['3R'], river:'none' },
      { name: 'Progressive 34', hands:[], ranks:['One Pair','Straight Flush'], colors:['3R'], river:'strict4' },
      { name: 'Progressive 35', hands:[], ranks:['One Pair','Straight Flush'], colors:['3R'], river:'when3' },
      { name: 'Progressive 36', hands:[], ranks:['One Pair','Straight Flush'], colors:['3R'], river:'random' },
      { name: 'Progressive 37', hands:[], ranks:['One Pair','Straight Flush'], colors:['3B'], river:'none' },
      { name: 'Progressive 38', hands:[], ranks:['One Pair','Straight Flush'], colors:['3B'], river:'strict4' },
      { name: 'Progressive 39', hands:[], ranks:['One Pair','Straight Flush'], colors:['3B'], river:'when3' },
      { name: 'Progressive 40', hands:[], ranks:['One Pair','Straight Flush'], colors:['3B'], river:'random' },
      // 372-391 Power Rank variants (4OAK, Full House, Trips, Two Pair)
      { name: 'Power Rank 1', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:[], river:'none' },
      { name: 'Power Rank 2', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Power Rank 3', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Power Rank 4', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3R'], river:'none' },
      { name: 'Power Rank 5', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3B'], river:'none' },
      { name: 'Power Rank 6', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:[], river:'strict4' },
      { name: 'Power Rank 7', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Power Rank 8', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Power Rank 9', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3R'], river:'strict4' },
      { name: 'Power Rank 10', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3B'], river:'strict4' },
      { name: 'Power Rank 11', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:[], river:'when3' },
      { name: 'Power Rank 12', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Power Rank 13', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Power Rank 14', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3R'], river:'when3' },
      { name: 'Power Rank 15', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3B'], river:'when3' },
      { name: 'Power Rank 16', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:[], river:'random' },
      { name: 'Power Rank 17', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Power Rank 18', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Power Rank 19', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3R'], river:'random' },
      { name: 'Power Rank 20', hands:[], ranks:['Four of a Kind','Full House','Three of a Kind','Two Pair'], colors:['3B'], river:'random' },
    ];

    // Pick a subset of strategies to use per simulation (rotate through them)
    const selectedStrategies = STRATEGIES.slice(0, Math.min(STRATEGIES.length, 30));

    const MAX_STORED_GAMES = 100;
    const games = [];
    let totalBets = 0, totalPayouts = 0;

    for (let game = 0; game < gamesToSimulate; game++) {
      const winningHandId = Math.floor(Math.random() * 10) + 1;
      const winningHand   = FIXED_HANDS.find(h => h.id === winningHandId);
      const gameRank      = rollRank();
      const gameRedCount  = rollRedCount();
      const winningColors = getWinningColorKeys(gameRedCount);
      const lowCount      = Math.floor(Math.random() * 6); // 0-5 low cards showing by turn
      const highCount     = 4 - lowCount; // turn has 4 community cards
      const gameLH        = Math.random() < 0.5 ? 'LOW' : 'HIGH';

      const playerCount = Math.floor(Math.random() * 5) + 1;
      let gameBets = 0, gamePayouts = 0;
      const playerDetails = [];

      for (let p = 0; p < playerCount; p++) {
        const strategy = selectedStrategies[(game * playerCount + p) % selectedStrategies.length];
        const bet = [5, 10, 25][Math.floor(Math.random() * 3)];
        let playerBet = 0, playerWin = 0;
        const bets = {};

        // Hand bets
        if (strategy.hands.length > 0) {
          const handResults = [];
          for (const handId of strategy.hands) {
            const hand = FIXED_HANDS.find(h => h.id === handId);
            if (!hand) continue;
            const won = handId === winningHandId;
            const winAmount = won ? bet * (1 + hand.payout) : 0;
            playerBet += bet; playerWin += winAmount;
            handResults.push({ handId, cards: hand.label, amount: bet, winAmount, won });
          }
          bets.hands = handResults;
        }

        // Rank bets
        if (strategy.ranks.length > 0) {
          const rankResults = [];
          for (const rankName of strategy.ranks) {
            const multiplier = RANK_PAYOUT_MAP[rankName];
            const won = rankName === gameRank;
            const winAmount = (won && multiplier !== null) ? bet * (1 + multiplier) : 0;
            playerBet += bet; playerWin += winAmount;
            rankResults.push({ rank: rankName, amount: bet, winAmount, won });
          }
          bets.ranks = rankResults;
        }

        // Color bets
        if (strategy.colors.length > 0) {
          const colorResults = [];
          for (const colorKey of strategy.colors) {
            const won = winningColors.includes(colorKey);
            const ratio = COLOR_PAYOUTS[colorKey];
            const winAmount = won ? bet * (1 + ratio) : 0;
            playerBet += bet; playerWin += winAmount;
            colorResults.push({ colorKey, amount: bet, winAmount, won });
          }
          bets.colors = colorResults;
        }

        // River (Low/High) bet
        if (strategy.river !== 'none') {
          let shouldBet = false;
          let betType = null;

          if (strategy.river === 'strict4') {
            if (lowCount >= 4) { shouldBet = true; betType = 'HIGH'; }
            else if (highCount >= 4) { shouldBet = true; betType = 'LOW'; }
          } else if (strategy.river === 'when3') {
            if (lowCount >= 3) { shouldBet = true; betType = lowCount > highCount ? 'HIGH' : 'LOW'; }
            else if (highCount >= 3) { shouldBet = true; betType = highCount > lowCount ? 'LOW' : 'HIGH'; }
          } else if (strategy.river === 'random') {
            shouldBet = true;
            betType = Math.random() < 0.5 ? 'LOW' : 'HIGH';
          }

          if (shouldBet && betType) {
            const won = betType === gameLH;
            const winAmount = won ? bet * (1 + LH_PAYOUT) : 0;
            playerBet += bet; playerWin += winAmount;
            bets.lowHigh = { type: betType, amount: bet, winAmount, won };
          }
        }

        playerDetails.push({ playerId: p + 1, strategy: strategy.name, bets, totalBet: playerBet, totalWin: playerWin, profit: playerWin - playerBet });
        gameBets += playerBet; gamePayouts += playerWin;
      }

      totalBets += gameBets; totalPayouts += gamePayouts;

      if (game < MAX_STORED_GAMES) {
        games.push({
          gameNumber: game + 1, playerCount,
          gameOutcome: {
            winningHand: `H${winningHandId} (${winningHand.label})`,
            winningRank: gameRank,
            colorResult: `${gameRedCount}R / ${5 - gameRedCount}B`,
            winningColorKeys: winningColors.join(', ') || 'None',
            riverResult: gameLH,
          },
          players: playerDetails,
          totalBets: gameBets, totalPayouts: gamePayouts,
          houseProfit: gameBets - gamePayouts,
          rtp: gameBets > 0 ? ((gamePayouts / gameBets) * 100).toFixed(2) + '%' : 'N/A',
          cumulativeRTP: totalBets > 0 ? ((totalPayouts / totalBets) * 100).toFixed(2) + '%' : 'N/A',
        });
      }
    }

    const overallRTP = totalBets > 0 ? (totalPayouts / totalBets * 100).toFixed(2) : '0.00';
    return Response.json({
      success: true, gamesToSimulate, games,
      summary: {
        totalGames: gamesToSimulate, totalBets, totalPayouts,
        houseProfit: totalBets - totalPayouts,
        overallRTP: overallRTP + '%',
        isCompliant: parseFloat(overallRTP) >= 95 && parseFloat(overallRTP) <= 98,
        strategiesUsed: selectedStrategies.length,
        totalStrategiesAvailable: STRATEGIES.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});