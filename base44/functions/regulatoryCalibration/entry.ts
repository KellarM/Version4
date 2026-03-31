import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const GAMES_PER_STRATEGY = Math.min(body.gamesPerStrategy || 500_000, 1_000_000);

    // Payout tables
    const HAND_PAYOUTS = [14.51, 4.21, 10.98, 6.75, 5.63, 4.48, 4.04, 4.69, 4.11, 9.30];
    const RANK_KEYS = ['One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush','Royal Flush'];
    const RANK_FREQS = [0.42257, 0.04754, 0.02113, 0.04619, 0.00327, 0.02596, 0.00168, 0.00139, 0.000154];
    const RANK_PAYOUTS_ARR = [null, 16.76, 3.95, 5.02, 3.10, 2.53, 12.43, null, null]; // null = progressive
    const RANK_CUM = [];
    let _rc = 0;
    for (const f of RANK_FREQS) { _rc += f; RANK_CUM.push(_rc); }
    const RED_CUM = [0.03125, 0.18750, 0.50000, 0.81250, 0.96875, 1.00000];
    const COLOR_PAYOUTS_MAP = { '3R': 0.93, '3B': 0.93, '4R': 4.81, '4B': 4.81, '5R': 43.36, '5B': 43.46 };
    const LH_PAYOUT = 0.93;

    function rollRank() {
      const r = Math.random();
      for (let i = 0; i < RANK_CUM.length; i++) if (r < RANK_CUM[i]) return i;
      return 0;
    }
    function rollRedCount() {
      const r = Math.random();
      for (let i = 0; i < 6; i++) if (r < RED_CUM[i]) return i;
      return 5;
    }

    // 391 strategies — river: 'none' | 'strict4' | 'when3' | 'random'
    const STRATEGIES = [
      { name: 'Kind Combo', hands:[1,6], ranks:[6], colors:[], river:'strict4' },
      { name: "High Odd's", hands:[0,2,3,1], ranks:[0], colors:[], river:'strict4' },
      { name: 'Pair Combo', hands:[0,1], ranks:[0,1], colors:[], river:'strict4' },
      { name: 'Kind Combo 2', hands:[1,6], ranks:[6,2], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: "High Odd's 2", hands:[0,2,3,1], ranks:[0], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Pair Combo 2', hands:[0,1], ranks:[0,1], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Kind Combo 3', hands:[1,6], ranks:[6,2], colors:['3R','4R'], river:'strict4' },
      { name: "High Odd's 3", hands:[0,2,3,1], ranks:[0], colors:['3R','4R'], river:'strict4' },
      { name: 'Pair Combo 3', hands:[0,1], ranks:[0,1], colors:['3R','4R'], river:'strict4' },
      { name: 'Kind Combo 4', hands:[1,6], ranks:[6,2], colors:['3B','4B'], river:'none' },
      { name: "High Odd's 4", hands:[0,2,3,1], ranks:[0], colors:['3B','4B'], river:'none' },
      { name: 'Pair Combo 4', hands:[0,1], ranks:[0,1], colors:['3B','4B'], river:'none' },
      { name: 'Kind Combo 5', hands:[1,6], ranks:[6,2], colors:['3B'], river:'none' },
      { name: "High Odd's 5", hands:[0,2,3,1], ranks:[0], colors:['3B'], river:'none' },
      { name: 'Pair Combo 5', hands:[0,1], ranks:[0,1], colors:['3B'], river:'none' },
      { name: 'Kind Combo 6', hands:[1,6], ranks:[6,2], colors:['3R'], river:'none' },
      { name: "High Odd's 6", hands:[0,2,3,1], ranks:[0], colors:['3R'], river:'none' },
      { name: 'Pair Combo 6', hands:[0,1], ranks:[0,1], colors:['3R'], river:'none' },
      { name: 'Black Flush 1', hands:[3,4], ranks:[4], colors:['3B','4B','5B'], river:'when3' },
      { name: 'Black Flush 2', hands:[3,4], ranks:[4], colors:['3B','4B'], river:'when3' },
      { name: 'Black Flush 3', hands:[3,4], ranks:[4], colors:['3B'], river:'when3' },
      { name: 'Black Flush 4', hands:[3,4], ranks:[4], colors:['3B','4B','5B'], river:'none' },
      { name: 'Black Flush 5', hands:[3,4], ranks:[4], colors:['3B','4B'], river:'none' },
      { name: 'Black Flush 6', hands:[3,4], ranks:[4], colors:['3B'], river:'none' },
      { name: 'Single Black Flush 1', hands:[3], ranks:[4], colors:['3B','4B','5B'], river:'when3' },
      { name: 'Single Black Flush 2', hands:[3], ranks:[4], colors:['3B','4B'], river:'when3' },
      { name: 'Single Black Flush 3', hands:[3], ranks:[4], colors:['3B'], river:'when3' },
      { name: 'Single Black Flush 4', hands:[3], ranks:[4], colors:['3B','4B','5B'], river:'none' },
      { name: 'Single Black Flush 5', hands:[3], ranks:[4], colors:['3B','4B'], river:'none' },
      { name: 'Single Black Flush 6', hands:[3], ranks:[4], colors:['3B'], river:'none' },
      { name: 'Single Black Flush 7', hands:[4], ranks:[4], colors:['3B','4B','5B'], river:'when3' },
      { name: 'Single Black Flush 8', hands:[4], ranks:[4], colors:['3B','4B'], river:'when3' },
      { name: 'Single Black Flush 9', hands:[4], ranks:[4], colors:['3B'], river:'when3' },
      { name: 'Single Black Flush 10', hands:[4], ranks:[4], colors:['3B','4B','5B'], river:'none' },
      { name: 'Single Black Flush 11', hands:[4], ranks:[4], colors:['3B','4B'], river:'none' },
      { name: 'Single Black Flush 12', hands:[4], ranks:[4], colors:['3B'], river:'none' },
      { name: 'Red Flush 1', hands:[5,7], ranks:[4], colors:['3R','4R','5R'], river:'when3' },
      { name: 'Red Flush 2', hands:[5,7], ranks:[4], colors:['3R','4R'], river:'when3' },
      { name: 'Red Flush 3', hands:[5,7], ranks:[4], colors:['3R'], river:'when3' },
      { name: 'Red Flush 4', hands:[5,7], ranks:[4], colors:['3R','4R','5R'], river:'none' },
      { name: 'Red Flush 5', hands:[5,7], ranks:[4], colors:['3R','4R'], river:'none' },
      { name: 'Red Flush 6', hands:[5,7], ranks:[4], colors:['3R'], river:'none' },
      { name: 'Single Red Flush 1', hands:[5], ranks:[4], colors:['3R','4R','5R'], river:'when3' },
      { name: 'Single Red Flush 2', hands:[5], ranks:[4], colors:['3R','4R'], river:'when3' },
      { name: 'Single Red Flush 3', hands:[5], ranks:[4], colors:['3R'], river:'when3' },
      { name: 'Single Red Flush 4', hands:[5], ranks:[4], colors:['3R','4R','5R'], river:'none' },
      { name: 'Single Red Flush 5', hands:[5], ranks:[4], colors:['3R','4R'], river:'none' },
      { name: 'Single Red Flush 6', hands:[5], ranks:[4], colors:['3R'], river:'none' },
      { name: 'Single Red Flush 7', hands:[7], ranks:[4], colors:['3R','4R','5R'], river:'when3' },
      { name: 'Single Red Flush 8', hands:[7], ranks:[4], colors:['3R','4R'], river:'when3' },
      { name: 'Single Red Flush 9', hands:[7], ranks:[4], colors:['3R'], river:'when3' },
      { name: 'Single Red Flush 10', hands:[7], ranks:[4], colors:['3R','4R','5R'], river:'none' },
      { name: 'Single Red Flush 11', hands:[7], ranks:[4], colors:['3R','4R'], river:'none' },
      { name: 'Single Red Flush 12', hands:[7], ranks:[4], colors:['3R'], river:'none' },
      // Straight mixes 1-75 (hands indexed 0-based)
      { name: 'Straight Mix 1', hands:[0,9], ranks:[3], colors:[], river:'strict4' },
      { name: 'Straight Mix 2', hands:[2,3], ranks:[3], colors:[], river:'strict4' },
      { name: 'Straight Mix 3', hands:[3,4], ranks:[3], colors:[], river:'strict4' },
      { name: 'Straight Mix 4', hands:[4,5], ranks:[3], colors:[], river:'strict4' },
      { name: 'Straight Mix 5', hands:[5,7], ranks:[3], colors:[], river:'strict4' },
      { name: 'Straight Mix 6', hands:[0,9], ranks:[3], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Straight Mix 7', hands:[2,3], ranks:[3], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Straight Mix 8', hands:[3,4], ranks:[3], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Straight Mix 9', hands:[4,5], ranks:[3], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Straight Mix 10', hands:[5,7], ranks:[3], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Straight Mix 11', hands:[0,9], ranks:[3], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Straight Mix 12', hands:[2,3], ranks:[3], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Straight Mix 13', hands:[3,4], ranks:[3], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Straight Mix 14', hands:[4,5], ranks:[3], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Straight Mix 15', hands:[5,7], ranks:[3], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Straight Mix 16', hands:[0,9], ranks:[3], colors:['3R','4R'], river:'strict4' },
      { name: 'Straight Mix 17', hands:[2,3], ranks:[3], colors:['3R','4R'], river:'strict4' },
      { name: 'Straight Mix 18', hands:[3,4], ranks:[3], colors:['3R','4R'], river:'strict4' },
      { name: 'Straight Mix 19', hands:[4,5], ranks:[3], colors:['3R','4R'], river:'strict4' },
      { name: 'Straight Mix 20', hands:[5,7], ranks:[3], colors:['3R','4R'], river:'strict4' },
      { name: 'Straight Mix 21', hands:[0,9], ranks:[3], colors:['3B','4B'], river:'strict4' },
      { name: 'Straight Mix 22', hands:[2,3], ranks:[3], colors:['3B','4B'], river:'strict4' },
      { name: 'Straight Mix 23', hands:[3,4], ranks:[3], colors:['3B','4B'], river:'strict4' },
      { name: 'Straight Mix 24', hands:[4,5], ranks:[3], colors:['3B','4B'], river:'strict4' },
      { name: 'Straight Mix 25', hands:[5,7], ranks:[3], colors:['3B','4B'], river:'strict4' },
      { name: 'Straight Mix 26', hands:[0,9], ranks:[3], colors:['3R'], river:'strict4' },
      { name: 'Straight Mix 27', hands:[2,3], ranks:[3], colors:['3R'], river:'strict4' },
      { name: 'Straight Mix 28', hands:[3,4], ranks:[3], colors:['3R'], river:'strict4' },
      { name: 'Straight Mix 29', hands:[4,5], ranks:[3], colors:['3R'], river:'strict4' },
      { name: 'Straight Mix 30', hands:[5,7], ranks:[3], colors:['3R'], river:'strict4' },
      { name: 'Straight Mix 31', hands:[0,9], ranks:[3], colors:['3B'], river:'strict4' },
      { name: 'Straight Mix 32', hands:[2,3], ranks:[3], colors:['3B'], river:'strict4' },
      { name: 'Straight Mix 33', hands:[3,4], ranks:[3], colors:['3B'], river:'strict4' },
      { name: 'Straight Mix 34', hands:[4,5], ranks:[3], colors:['3B'], river:'strict4' },
      { name: 'Straight Mix 35', hands:[5,7], ranks:[3], colors:['3B'], river:'strict4' },
      { name: 'Straight Mix 36', hands:[0,9], ranks:[3], colors:[], river:'none' },
      { name: 'Straight Mix 37', hands:[2,3], ranks:[3], colors:[], river:'none' },
      { name: 'Straight Mix 38', hands:[3,4], ranks:[3], colors:[], river:'none' },
      { name: 'Straight Mix 39', hands:[4,5], ranks:[3], colors:[], river:'none' },
      { name: 'Straight Mix 40', hands:[5,7], ranks:[3], colors:[], river:'none' },
      { name: 'Straight Mix 41', hands:[0,9], ranks:[3], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Straight Mix 42', hands:[2,3], ranks:[3], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Straight Mix 43', hands:[3,4], ranks:[3], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Straight Mix 44', hands:[4,5], ranks:[3], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Straight Mix 45', hands:[5,7], ranks:[3], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Straight Mix 46', hands:[0,9], ranks:[3], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Straight Mix 47', hands:[2,3], ranks:[3], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Straight Mix 48', hands:[3,4], ranks:[3], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Straight Mix 49', hands:[4,5], ranks:[3], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Straight Mix 50', hands:[5,7], ranks:[3], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Straight Mix 51', hands:[0,9], ranks:[3], colors:['3R','4R'], river:'none' },
      { name: 'Straight Mix 52', hands:[2,3], ranks:[3], colors:['3R','4R'], river:'none' },
      { name: 'Straight Mix 53', hands:[3,4], ranks:[3], colors:['3R','4R'], river:'none' },
      { name: 'Straight Mix 54', hands:[4,5], ranks:[3], colors:['3R','4R'], river:'none' },
      { name: 'Straight Mix 55', hands:[5,7], ranks:[3], colors:['3R','4R'], river:'none' },
      { name: 'Straight Mix 56', hands:[0,9], ranks:[3], colors:['3B','4B'], river:'none' },
      { name: 'Straight Mix 57', hands:[2,3], ranks:[3], colors:['3B','4B'], river:'none' },
      { name: 'Straight Mix 58', hands:[3,4], ranks:[3], colors:['3B','4B'], river:'none' },
      { name: 'Straight Mix 59', hands:[4,5], ranks:[3], colors:['3B','4B'], river:'none' },
      { name: 'Straight Mix 60', hands:[5,7], ranks:[3], colors:['3B','4B'], river:'none' },
      { name: 'Straight Mix 61', hands:[0,9], ranks:[3], colors:['3R'], river:'none' },
      { name: 'Straight Mix 62', hands:[2,3], ranks:[3], colors:['3R'], river:'none' },
      { name: 'Straight Mix 63', hands:[3,4], ranks:[3], colors:['3R'], river:'none' },
      { name: 'Straight Mix 64', hands:[4,5], ranks:[3], colors:['3R'], river:'none' },
      { name: 'Straight Mix 65', hands:[5,7], ranks:[3], colors:['3R'], river:'none' },
      { name: 'Straight Mix 66', hands:[0,9], ranks:[3], colors:['3B'], river:'none' },
      { name: 'Straight Mix 67', hands:[2,3], ranks:[3], colors:['3B'], river:'none' },
      { name: 'Straight Mix 68', hands:[3,4], ranks:[3], colors:['3B'], river:'none' },
      { name: 'Straight Mix 69', hands:[4,5], ranks:[3], colors:['3B'], river:'none' },
      { name: 'Straight Mix 70', hands:[5,7], ranks:[3], colors:['3B'], river:'none' },
      { name: 'Straight Mix 71', hands:[0,9], ranks:[3], colors:[], river:'none' },
      { name: 'Straight Mix 72', hands:[2,3], ranks:[3], colors:[], river:'none' },
      { name: 'Straight Mix 73', hands:[3,4], ranks:[3], colors:[], river:'none' },
      { name: 'Straight Mix 74', hands:[4,5], ranks:[3], colors:[], river:'none' },
      { name: 'Straight Mix 75', hands:[5,7], ranks:[3], colors:[], river:'none' },
      // Singles 1-10
      { name: 'Single 1', hands:[0], ranks:[], colors:[], river:'none' },
      { name: 'Single 2', hands:[1], ranks:[], colors:[], river:'none' },
      { name: 'Single 3', hands:[2], ranks:[], colors:[], river:'none' },
      { name: 'Single 4', hands:[3], ranks:[], colors:[], river:'none' },
      { name: 'Single 5', hands:[4], ranks:[], colors:[], river:'none' },
      { name: 'Single 6', hands:[5], ranks:[], colors:[], river:'none' },
      { name: 'Single 7', hands:[6], ranks:[], colors:[], river:'none' },
      { name: 'Single 8', hands:[7], ranks:[], colors:[], river:'none' },
      { name: 'Single 9', hands:[8], ranks:[], colors:[], river:'none' },
      { name: 'Single 10', hands:[9], ranks:[], colors:[], river:'none' },
      // Single Mix 1-30 (One Pair + Two Pair, then One Pair only x20)
      { name: 'Single Mix 1', hands:[0], ranks:[0,1], colors:[], river:'none' },
      { name: 'Single Mix 2', hands:[1], ranks:[0,1], colors:[], river:'none' },
      { name: 'Single Mix 3', hands:[2], ranks:[0,1], colors:[], river:'none' },
      { name: 'Single Mix 4', hands:[3], ranks:[0,1], colors:[], river:'none' },
      { name: 'Single Mix 5', hands:[4], ranks:[0,1], colors:[], river:'none' },
      { name: 'Single Mix 6', hands:[5], ranks:[0,1], colors:[], river:'none' },
      { name: 'Single Mix 7', hands:[6], ranks:[0,1], colors:[], river:'none' },
      { name: 'Single Mix 8', hands:[7], ranks:[0,1], colors:[], river:'none' },
      { name: 'Single Mix 9', hands:[8], ranks:[0,1], colors:[], river:'none' },
      { name: 'Single Mix 10', hands:[9], ranks:[0,1], colors:[], river:'none' },
      { name: 'Single Mix 11', hands:[0], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 12', hands:[1], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 13', hands:[2], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 14', hands:[3], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 15', hands:[4], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 16', hands:[5], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 17', hands:[6], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 18', hands:[7], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 19', hands:[8], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 20', hands:[9], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 21', hands:[0], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 22', hands:[1], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 23', hands:[2], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 24', hands:[3], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 25', hands:[4], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 26', hands:[5], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 27', hands:[6], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 28', hands:[7], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 29', hands:[8], ranks:[0], colors:[], river:'none' },
      { name: 'Single Mix 30', hands:[9], ranks:[0], colors:[], river:'none' },
      // Foursome groups (hands 0-indexed: 0=A♦/10♥,1=K♣/K♠,2=Q♣/J♠,9=A♥/5♦)
      { name: 'Foursome 1', hands:[0,1,2,9], ranks:[0], colors:[], river:'none' },
      { name: 'Foursome 2', hands:[0,1,2,9], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Foursome 3', hands:[0,1,2,9], ranks:[0], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Foursome 4', hands:[0,1,2,9], ranks:[0], colors:['3R','4R'], river:'none' },
      { name: 'Foursome 5', hands:[0,1,2,9], ranks:[0], colors:['3B','4B'], river:'none' },
      { name: 'Foursome 6', hands:[0,1,2,9], ranks:[0], colors:['3R'], river:'none' },
      { name: 'Foursome 7', hands:[0,1,2,9], ranks:[0], colors:['3B'], river:'none' },
      { name: 'Foursome 8', hands:[0,1,2,9], ranks:[0], colors:[], river:'strict4' },
      { name: 'Foursome 9', hands:[0,1,2,9], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Foursome 10', hands:[0,1,2,9], ranks:[0], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Foursome 11', hands:[0,1,2,9], ranks:[0], colors:['3R','4R'], river:'strict4' },
      { name: 'Foursome 12', hands:[0,1,2,9], ranks:[0], colors:['3B','4B'], river:'strict4' },
      { name: 'Foursome 13', hands:[0,1,2,9], ranks:[0], colors:['3R'], river:'strict4' },
      { name: 'Foursome 14', hands:[0,1,2,9], ranks:[0], colors:['3B'], river:'strict4' },
      { name: 'Foursome 15', hands:[0,1,2,9], ranks:[0], colors:[], river:'when3' },
      { name: 'Foursome 16', hands:[0,1,2,9], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Foursome 17', hands:[0,1,2,9], ranks:[0], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Foursome 18', hands:[0,1,2,9], ranks:[0], colors:['3R','4R'], river:'when3' },
      { name: 'Foursome 19', hands:[0,1,2,9], ranks:[0], colors:['3B','4B'], river:'when3' },
      { name: 'Foursome 20', hands:[0,1,2,9], ranks:[0], colors:['3R'], river:'when3' },
      { name: 'Foursome 21', hands:[0,1,2,9], ranks:[0], colors:['3B'], river:'when3' },
      { name: 'Foursome 22', hands:[0,1,2,9], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Foursome 23', hands:[0,1,2,9], ranks:[0], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Foursome 24', hands:[0,1,2,9], ranks:[0], colors:['3R','4R'], river:'random' },
      { name: 'Foursome 25', hands:[0,1,2,9], ranks:[0], colors:['3B','4B'], river:'random' },
      { name: 'Foursome 26', hands:[0,1,2,9], ranks:[0], colors:['3R'], river:'random' },
      { name: 'Foursome 27', hands:[0,1,2,9], ranks:[0], colors:['3B'], river:'random' },
      // Foursome 2/4 group 1 (hands 0,2,3,4)
      { name: 'Foursome 2/4 1', hands:[0,2,3,4], ranks:[0], colors:[], river:'none' },
      { name: 'Foursome 2/4 2', hands:[0,2,3,4], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Foursome 2/4 3', hands:[0,2,3,4], ranks:[0], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Foursome 2/4 4', hands:[0,2,3,4], ranks:[0], colors:['3R','3B'], river:'strict4' },
      { name: 'Foursome 2/4 5', hands:[0,2,3,4], ranks:[0], colors:['3R'], river:'strict4' },
      { name: 'Foursome 2/4 6', hands:[0,2,3,4], ranks:[0], colors:['3B'], river:'strict4' },
      { name: 'Foursome 2/4 7', hands:[0,2,3,4], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Foursome 2/4 8', hands:[0,2,3,4], ranks:[0], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Foursome 2/4 9', hands:[0,2,3,4], ranks:[0], colors:['3R','3B'], river:'when3' },
      { name: 'Foursome 2/4 10', hands:[0,2,3,4], ranks:[0], colors:['3R'], river:'when3' },
      { name: 'Foursome 2/4 11', hands:[0,2,3,4], ranks:[0], colors:['3B'], river:'when3' },
      { name: 'Foursome 2/4 12', hands:[0,2,3,4], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Foursome 2/4 13', hands:[0,2,3,4], ranks:[0], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Foursome 2/4 14', hands:[0,2,3,4], ranks:[0], colors:['3R','3B'], river:'random' },
      { name: 'Foursome 2/4 15', hands:[0,2,3,4], ranks:[0], colors:['3R'], river:'random' },
      { name: 'Foursome 2/4 16', hands:[0,2,3,4], ranks:[0], colors:['3B'], river:'random' },
      // Foursome 2/4 group 2 (hands 0,5,7,9)
      { name: 'Foursome 2/4 17', hands:[0,5,7,9], ranks:[0], colors:[], river:'none' },
      { name: 'Foursome 2/4 18', hands:[0,5,7,9], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Foursome 2/4 19', hands:[0,5,7,9], ranks:[0], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Foursome 2/4 20', hands:[0,5,7,9], ranks:[0], colors:['3R','3B'], river:'strict4' },
      { name: 'Foursome 2/4 21', hands:[0,5,7,9], ranks:[0], colors:['3R'], river:'strict4' },
      { name: 'Foursome 2/4 22', hands:[0,5,7,9], ranks:[0], colors:['3B'], river:'strict4' },
      { name: 'Foursome 2/4 23', hands:[0,5,7,9], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Foursome 2/4 24', hands:[0,5,7,9], ranks:[0], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Foursome 2/4 25', hands:[0,5,7,9], ranks:[0], colors:['3R','3B'], river:'when3' },
      { name: 'Foursome 2/4 26', hands:[0,5,7,9], ranks:[0], colors:['3R'], river:'when3' },
      { name: 'Foursome 2/4 27', hands:[0,5,7,9], ranks:[0], colors:['3B'], river:'when3' },
      { name: 'Foursome 2/4 28', hands:[0,5,7,9], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Foursome 2/4 29', hands:[0,5,7,9], ranks:[0], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Foursome 2/4 30', hands:[0,5,7,9], ranks:[0], colors:['3R','3B'], river:'random' },
      { name: 'Foursome 2/4 31', hands:[0,5,7,9], ranks:[0], colors:['3R'], river:'random' },
      { name: 'Foursome 2/4 32', hands:[0,5,7,9], ranks:[0], colors:['3B'], river:'random' },
      // No-rank Foursome 2/4 (hands 0,2,3,4)
      { name: 'Foursome NR 2/4 1', hands:[0,2,3,4], ranks:[], colors:[], river:'none' },
      { name: 'Foursome NR 2/4 2', hands:[0,2,3,4], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Foursome NR 2/4 3', hands:[0,2,3,4], ranks:[], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Foursome NR 2/4 4', hands:[0,2,3,4], ranks:[], colors:['3R','3B'], river:'strict4' },
      { name: 'Foursome NR 2/4 5', hands:[0,2,3,4], ranks:[], colors:['3R'], river:'strict4' },
      { name: 'Foursome NR 2/4 6', hands:[0,2,3,4], ranks:[], colors:['3B'], river:'strict4' },
      { name: 'Foursome NR 2/4 7', hands:[0,2,3,4], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Foursome NR 2/4 8', hands:[0,2,3,4], ranks:[], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Foursome NR 2/4 9', hands:[0,2,3,4], ranks:[], colors:['3R','3B'], river:'when3' },
      { name: 'Foursome NR 2/4 10', hands:[0,2,3,4], ranks:[], colors:['3R'], river:'when3' },
      { name: 'Foursome NR 2/4 11', hands:[0,2,3,4], ranks:[], colors:['3B'], river:'when3' },
      { name: 'Foursome NR 2/4 12', hands:[0,2,3,4], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Foursome NR 2/4 13', hands:[0,2,3,4], ranks:[], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Foursome NR 2/4 14', hands:[0,2,3,4], ranks:[], colors:['3R','3B'], river:'random' },
      { name: 'Foursome NR 2/4 15', hands:[0,2,3,4], ranks:[], colors:['3R'], river:'random' },
      { name: 'Foursome NR 2/4 16', hands:[0,2,3,4], ranks:[], colors:['3B'], river:'random' },
      // No-rank Foursome 2/4 (hands 0,5,7,9)
      { name: 'Foursome NR 2/4 17', hands:[0,5,7,9], ranks:[], colors:[], river:'none' },
      { name: 'Foursome NR 2/4 18', hands:[0,5,7,9], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Foursome NR 2/4 19', hands:[0,5,7,9], ranks:[], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Foursome NR 2/4 20', hands:[0,5,7,9], ranks:[], colors:['3R','3B'], river:'strict4' },
      { name: 'Foursome NR 2/4 21', hands:[0,5,7,9], ranks:[], colors:['3R'], river:'strict4' },
      { name: 'Foursome NR 2/4 22', hands:[0,5,7,9], ranks:[], colors:['3B'], river:'strict4' },
      { name: 'Foursome NR 2/4 23', hands:[0,5,7,9], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Foursome NR 2/4 24', hands:[0,5,7,9], ranks:[], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Foursome NR 2/4 25', hands:[0,5,7,9], ranks:[], colors:['3R','3B'], river:'when3' },
      { name: 'Foursome NR 2/4 26', hands:[0,5,7,9], ranks:[], colors:['3R'], river:'when3' },
      { name: 'Foursome NR 2/4 27', hands:[0,5,7,9], ranks:[], colors:['3B'], river:'when3' },
      { name: 'Foursome NR 2/4 28', hands:[0,5,7,9], ranks:[], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Foursome NR 2/4 29', hands:[0,5,7,9], ranks:[], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Foursome NR 2/4 30', hands:[0,5,7,9], ranks:[], colors:['3R','3B'], river:'random' },
      { name: 'Foursome NR 2/4 31', hands:[0,5,7,9], ranks:[], colors:['3R'], river:'random' },
      { name: 'Foursome NR 2/4 32', hands:[0,5,7,9], ranks:[], colors:['3B'], river:'random' },
      // Rank High Odds (Two Pair=1, Four of a Kind=6)
      { name: 'Rank High Odds 1', hands:[], ranks:[1,6], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Rank High Odds 2', hands:[], ranks:[1,6], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Rank High Odds 3', hands:[], ranks:[1,6], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Rank High Odds 4', hands:[], ranks:[1,6], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Rank High Odds 5', hands:[], ranks:[1,6], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Rank High Odds 6', hands:[], ranks:[1,6], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Rank High Odds 7', hands:[], ranks:[1,6], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Rank High Odds 8', hands:[], ranks:[1,6], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Rank High Odds 9', hands:[], ranks:[1,6], colors:['3R','3B'], river:'strict4' },
      { name: 'Rank High Odds 10', hands:[], ranks:[1,6], colors:['3R','3B'], river:'when3' },
      { name: 'Rank High Odds 11', hands:[], ranks:[1,6], colors:['3R','3B'], river:'random' },
      { name: 'Rank High Odds 12', hands:[], ranks:[1,6], colors:['3R','3B'], river:'none' },
      { name: 'Rank High Odds 13', hands:[], ranks:[1,6], colors:['3R'], river:'strict4' },
      { name: 'Rank High Odds 14', hands:[], ranks:[1,6], colors:['3R'], river:'when3' },
      { name: 'Rank High Odds 15', hands:[], ranks:[1,6], colors:['3R'], river:'random' },
      { name: 'Rank High Odds 16', hands:[], ranks:[1,6], colors:['3R'], river:'none' },
      { name: 'Rank High Odds 17', hands:[], ranks:[1,6], colors:['3B'], river:'strict4' },
      { name: 'Rank High Odds 18', hands:[], ranks:[1,6], colors:['3B'], river:'when3' },
      { name: 'Rank High Odds 19', hands:[], ranks:[1,6], colors:['3B'], river:'random' },
      { name: 'Rank High Odds 20', hands:[], ranks:[1,6], colors:['3B'], river:'none' },
      { name: 'Rank High Odds 21', hands:[], ranks:[1,6], colors:[], river:'strict4' },
      { name: 'Rank High Odds 22', hands:[], ranks:[1,6], colors:[], river:'when3' },
      { name: 'Rank High Odds 23', hands:[], ranks:[1,6], colors:[], river:'random' },
      { name: 'Rank High Odds 24', hands:[], ranks:[1,6], colors:[], river:'none' },
      // Color Board
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
      // Progressive 1-40
      { name: 'Progressive 1', hands:[], ranks:[0], colors:[], river:'none' },
      { name: 'Progressive 2', hands:[], ranks:[0], colors:[], river:'strict4' },
      { name: 'Progressive 3', hands:[], ranks:[0], colors:[], river:'when3' },
      { name: 'Progressive 4', hands:[], ranks:[0], colors:[], river:'random' },
      { name: 'Progressive 5', hands:[], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Progressive 6', hands:[], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Progressive 7', hands:[], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Progressive 8', hands:[], ranks:[0], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Progressive 9', hands:[], ranks:[0], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Progressive 10', hands:[], ranks:[0], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Progressive 11', hands:[], ranks:[0], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Progressive 12', hands:[], ranks:[0], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Progressive 13', hands:[], ranks:[0], colors:['3R'], river:'none' },
      { name: 'Progressive 14', hands:[], ranks:[0], colors:['3R'], river:'strict4' },
      { name: 'Progressive 15', hands:[], ranks:[0], colors:['3R'], river:'when3' },
      { name: 'Progressive 16', hands:[], ranks:[0], colors:['3R'], river:'random' },
      { name: 'Progressive 17', hands:[], ranks:[0], colors:['3B'], river:'none' },
      { name: 'Progressive 18', hands:[], ranks:[0], colors:['3B'], river:'strict4' },
      { name: 'Progressive 19', hands:[], ranks:[0], colors:['3B'], river:'when3' },
      { name: 'Progressive 20', hands:[], ranks:[0], colors:['3B'], river:'random' },
      { name: 'Progressive 21', hands:[], ranks:[0,7], colors:[], river:'none' },
      { name: 'Progressive 22', hands:[], ranks:[0,7], colors:[], river:'strict4' },
      { name: 'Progressive 23', hands:[], ranks:[0,7], colors:[], river:'when3' },
      { name: 'Progressive 24', hands:[], ranks:[0,7], colors:[], river:'random' },
      { name: 'Progressive 25', hands:[], ranks:[0,7], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Progressive 26', hands:[], ranks:[0,7], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Progressive 27', hands:[], ranks:[0,7], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Progressive 28', hands:[], ranks:[0,7], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Progressive 29', hands:[], ranks:[0,7], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Progressive 30', hands:[], ranks:[0,7], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Progressive 31', hands:[], ranks:[0,7], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Progressive 32', hands:[], ranks:[0,7], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Progressive 33', hands:[], ranks:[0,7], colors:['3R'], river:'none' },
      { name: 'Progressive 34', hands:[], ranks:[0,7], colors:['3R'], river:'strict4' },
      { name: 'Progressive 35', hands:[], ranks:[0,7], colors:['3R'], river:'when3' },
      { name: 'Progressive 36', hands:[], ranks:[0,7], colors:['3R'], river:'random' },
      { name: 'Progressive 37', hands:[], ranks:[0,7], colors:['3B'], river:'none' },
      { name: 'Progressive 38', hands:[], ranks:[0,7], colors:['3B'], river:'strict4' },
      { name: 'Progressive 39', hands:[], ranks:[0,7], colors:['3B'], river:'when3' },
      { name: 'Progressive 40', hands:[], ranks:[0,7], colors:['3B'], river:'random' },
      // Power Rank (4OAK=6, Full House=5, Trips=2, Two Pair=1)
      { name: 'Power Rank 1', hands:[], ranks:[6,5,2,1], colors:[], river:'none' },
      { name: 'Power Rank 2', hands:[], ranks:[6,5,2,1], colors:['3R','4R','5R','3B','4B','5B'], river:'none' },
      { name: 'Power Rank 3', hands:[], ranks:[6,5,2,1], colors:['3R','4R','3B','4B'], river:'none' },
      { name: 'Power Rank 4', hands:[], ranks:[6,5,2,1], colors:['3R'], river:'none' },
      { name: 'Power Rank 5', hands:[], ranks:[6,5,2,1], colors:['3B'], river:'none' },
      { name: 'Power Rank 6', hands:[], ranks:[6,5,2,1], colors:[], river:'strict4' },
      { name: 'Power Rank 7', hands:[], ranks:[6,5,2,1], colors:['3R','4R','5R','3B','4B','5B'], river:'strict4' },
      { name: 'Power Rank 8', hands:[], ranks:[6,5,2,1], colors:['3R','4R','3B','4B'], river:'strict4' },
      { name: 'Power Rank 9', hands:[], ranks:[6,5,2,1], colors:['3R'], river:'strict4' },
      { name: 'Power Rank 10', hands:[], ranks:[6,5,2,1], colors:['3B'], river:'strict4' },
      { name: 'Power Rank 11', hands:[], ranks:[6,5,2,1], colors:[], river:'when3' },
      { name: 'Power Rank 12', hands:[], ranks:[6,5,2,1], colors:['3R','4R','5R','3B','4B','5B'], river:'when3' },
      { name: 'Power Rank 13', hands:[], ranks:[6,5,2,1], colors:['3R','4R','3B','4B'], river:'when3' },
      { name: 'Power Rank 14', hands:[], ranks:[6,5,2,1], colors:['3R'], river:'when3' },
      { name: 'Power Rank 15', hands:[], ranks:[6,5,2,1], colors:['3B'], river:'when3' },
      { name: 'Power Rank 16', hands:[], ranks:[6,5,2,1], colors:[], river:'random' },
      { name: 'Power Rank 17', hands:[], ranks:[6,5,2,1], colors:['3R','4R','5R','3B','4B','5B'], river:'random' },
      { name: 'Power Rank 18', hands:[], ranks:[6,5,2,1], colors:['3R','4R','3B','4B'], river:'random' },
      { name: 'Power Rank 19', hands:[], ranks:[6,5,2,1], colors:['3R'], river:'random' },
      { name: 'Power Rank 20', hands:[], ranks:[6,5,2,1], colors:['3B'], river:'random' },
    ];

    const results = [];

    for (const strat of STRATEGIES) {
      const { hands, ranks, colors, river } = strat;
      const unit = 25; // fixed unit bet per position

      const totalBetPerGame =
        hands.length * unit +
        ranks.length * unit +
        colors.length * unit +
        (river !== 'none' ? unit : 0);

      if (totalBetPerGame === 0) continue;

      let totalBets = 0, totalPayouts = 0;
      let handBets = 0, handPays = 0;
      let rankBets = 0, rankPays = 0;
      let colorBets = 0, colorPays = 0;
      let riverBets = 0, riverPays = 0;

      const N = GAMES_PER_STRATEGY;

      for (let g = 0; g < N; g++) {
        const winHand = (Math.random() * 10) | 0; // 0-9
        const rankIdx = rollRank();
        const redCount = rollRedCount();
        const blackCount = 5 - redCount;
        const riverIsLow = Math.random() < 0.5;
        // For strict4/when3: simulate turn showing 4 cards
        const lowShowing = Math.floor(Math.random() * 5); // 0-4 low of 4 turn cards
        const highShowing = 4 - lowShowing;

        let gameWin = 0;

        // Hand payouts
        for (let i = 0; i < hands.length; i++) {
          handBets += unit;
          if (hands[i] === winHand) {
            const p = unit * (1 + HAND_PAYOUTS[winHand]);
            handPays += p;
            gameWin += p;
          }
        }

        // Rank payouts
        for (let i = 0; i < ranks.length; i++) {
          rankBets += unit;
          if (ranks[i] === rankIdx) {
            const mult = RANK_PAYOUTS_ARR[rankIdx];
            if (mult !== null) {
              const p = unit * (1 + mult);
              rankPays += p;
              gameWin += p;
            }
          }
        }

        // Color payouts
        for (let i = 0; i < colors.length; i++) {
          colorBets += unit;
          const cKey = colors[i];
          const cCount = parseInt(cKey[0]);
          const isRed = cKey[1] === 'R';
          if (isRed ? redCount >= cCount : blackCount >= cCount) {
            const p = unit * (1 + COLOR_PAYOUTS_MAP[cKey]);
            colorPays += p;
            gameWin += p;
          }
        }

        // River
        if (river !== 'none') {
          let shouldBet = false;
          let betLow = false;

          if (river === 'strict4') {
            if (lowShowing >= 4) { shouldBet = true; betLow = false; } // bet HIGH
            else if (highShowing >= 4) { shouldBet = true; betLow = true; } // bet LOW
          } else if (river === 'when3') {
            if (lowShowing >= 3 || highShowing >= 3) {
              shouldBet = true;
              betLow = lowShowing > highShowing; // contrarian
            }
          } else if (river === 'random') {
            shouldBet = true;
            betLow = Math.random() < 0.5;
          }

          if (shouldBet) {
            riverBets += unit;
            const won = betLow ? riverIsLow : !riverIsLow;
            if (won) {
              const p = unit * (1 + LH_PAYOUT);
              riverPays += p;
              gameWin += p;
            }
          }
        }

        totalBets += totalBetPerGame;
        totalPayouts += gameWin;
      }

      const rtp = totalBets > 0 ? totalPayouts / totalBets : 0;
      const TARGET = 0.965;

      results.push({
        strategy: strat.name,
        gamesSimulated: N,
        totalBetPerGame,
        totalBets: Math.round(totalBets),
        totalPayouts: Math.round(totalPayouts),
        rtp: (rtp * 100).toFixed(3) + '%',
        houseEdge: ((1 - rtp) * 100).toFixed(3) + '%',
        compliant: rtp >= 0.95 && rtp <= 0.98,
        status: rtp > 0.98 ? '🔴 TOO HIGH' : rtp < 0.95 ? '🔴 TOO LOW' : '🟢 COMPLIANT',
        categoryBreakdown: {
          hands:  handBets  > 0 ? { rtp: (handPays/handBets*100).toFixed(2)+'%',   betShare: (handBets/totalBets*100).toFixed(1)+'%' }   : null,
          ranks:  rankBets  > 0 ? { rtp: (rankPays/rankBets*100).toFixed(2)+'%',   betShare: (rankBets/totalBets*100).toFixed(1)+'%' }   : null,
          colors: colorBets > 0 ? { rtp: (colorPays/colorBets*100).toFixed(2)+'%', betShare: (colorBets/totalBets*100).toFixed(1)+'%' } : null,
          river:  riverBets > 0 ? { rtp: (riverPays/riverBets*100).toFixed(2)+'%', betShare: (riverBets/totalBets*100).toFixed(1)+'%' } : null,
        },
        calibration: {
          targetRTP: '96.5%',
          scaleFactor: rtp > 0 ? (TARGET / rtp).toFixed(5) : null,
          direction: rtp > TARGET
            ? 'REDUCE payouts by ' + (((rtp - TARGET) / rtp) * 100).toFixed(2) + '%'
            : rtp < TARGET
            ? 'INCREASE payouts by ' + (((TARGET - rtp) / TARGET) * 100).toFixed(2) + '%'
            : 'ON TARGET',
        },
      });

      // Reset per-strategy counters
      handBets = 0; handPays = 0;
      rankBets = 0; rankPays = 0;
      colorBets = 0; colorPays = 0;
      riverBets = 0; riverPays = 0;
    }

    const aggBets = results.reduce((s, r) => s + r.totalBets, 0);
    const aggPays = results.reduce((s, r) => s + r.totalPayouts, 0);
    const aggRtp = aggBets > 0 ? aggPays / aggBets : 0;
    const compliantCount = results.filter(r => r.compliant).length;

    return Response.json({
      success: true,
      auditDate: new Date().toISOString(),
      config: {
        gamesPerStrategy: GAMES_PER_STRATEGY,
        totalStrategies: results.length,
        totalGamesSimulated: GAMES_PER_STRATEGY * results.length,
        targetRTP: '95.0% – 98.0% (center: 96.5%)',
      },
      blendedResults: {
        aggregateRTP: (aggRtp * 100).toFixed(3) + '%',
        aggregateHouseEdge: ((1 - aggRtp) * 100).toFixed(3) + '%',
        compliantStrategies: compliantCount + '/' + results.length,
        overallStatus: aggRtp >= 0.95 && aggRtp <= 0.98
          ? '🟢 BLENDED RTP COMPLIANT'
          : aggRtp < 0.95
          ? '🔴 BLENDED RTP TOO LOW — Increase payouts'
          : '🔴 BLENDED RTP TOO HIGH — Reduce payouts',
      },
      strategyResults: results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});