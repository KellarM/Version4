import { motion } from 'framer-motion';
import { cardColor, isLowCard } from '@/lib/gameEngine';

// Left col = Red (3R top → 5R bottom), Right col = Black (3B top → 5B bottom)
const RED_OPTIONS   = [
  { key: '3R', label: '3 Red', payout: '1:1'  },
  { key: '4R', label: '4 Red', payout: '4:1'  },
  { key: '5R', label: '5 Red', payout: '40:1' },
];
const BLACK_OPTIONS = [
  { key: '3B', label: '3 Black', payout: '1:1'  },
  { key: '4B', label: '4 Black', payout: '4:1'  },
  { key: '5B', label: '5 Black', payout: '40:1' },
];

// Per-player chip colors
const PLAYER_CHIP_COLORS = [
  { bg: 'bg-yellow-500',  text: 'text-black',  border: 'border-yellow-400'  },
  { bg: 'bg-blue-500',    text: 'text-white',  border: 'border-blue-300'    },
  { bg: 'bg-pink-500',    text: 'text-white',  border: 'border-pink-300'    },
  { bg: 'bg-green-500',   text: 'text-black',  border: 'border-green-300'   },
  { bg: 'bg-orange-500',  text: 'text-black',  border: 'border-orange-300'  },
];

export default function SideBets({
  communityCards,
  allRedBlackBets,   // { [pid]: { key: amount } } — all players
  allLowHighBets,    // { [pid]: { type, amount } } — all players
  redBlackBets,      // active player's bets (for click handling)
  lowHighBet,
  onRedBlackBet,
  onRemoveRedBlackBet,
  onLowHighBet,
  onRemoveLowHighBet,
  gamePhase,
  winningRedBlack,
  winningLowHigh,
  disabled,
  playerCount,
}) {
  const canBetRB = (gamePhase === 'betting') && !disabled;
  const canBetLH = (gamePhase === 'lowHighBetting') && !disabled;

  const reds = communityCards.filter(c => cardColor(c) === 'red').length;
  const blacks = communityCards.filter(c => cardColor(c) === 'black').length;
  const lows = communityCards.filter(c => isLowCard(c)).length;
  const highs = communityCards.length - lows;

  const liveRedBlack = [];
  if (reds >= 3) for (let i = 3; i <= reds; i++) liveRedBlack.push(`${i}R`);
  if (blacks >= 3) for (let i = 3; i <= blacks; i++) liveRedBlack.push(`${i}B`);

  // Render a single RB cell (used for both red and black columns)
  const renderRBCell = (opt, isRed) => {
    const isWinner = winningRedBlack && winningRedBlack.includes(opt.key);
    const isLive = liveRedBlack.includes(opt.key) && !isWinner && communityCards.length > 0 && communityCards.length < 5;

    let cls;
    if (isWinner) cls = 'bg-yellow-900/50 text-yellow-200 winner-flash';
    else if (isLive) cls = isRed
      ? 'border-red-400 bg-red-900/50 text-red-100 shadow-red-400/40 shadow-md'
      : 'border-gray-300 bg-gray-700/60 text-gray-100 shadow-gray-300/40 shadow-md';
    else if (canBetRB) cls = isRed
      ? 'border-red-700/50 bg-red-950/40 text-red-300 hover:border-red-500 hover:bg-red-900/30 cursor-pointer'
      : 'border-gray-600/50 bg-gray-900/40 text-gray-300 hover:border-gray-400 hover:bg-gray-800/40 cursor-pointer';
    else cls = isRed ? 'border-red-900/30 bg-red-950/20 text-red-400/50' : 'border-gray-700/30 bg-gray-900/20 text-gray-500/50';

    // Collect all players' chips for this slot
    const chipsHere = [];
    for (let i = 0; i < playerCount; i++) {
      const amt = (allRedBlackBets[i] || {})[opt.key] || 0;
      if (amt > 0) chipsHere.push({ pid: i, amt });
    }

    return (
      <motion.button
        key={opt.key}
        onClick={() => canBetRB && onRedBlackBet(opt.key)}
        onContextMenu={(e) => { e.preventDefault(); if (gamePhase === 'betting') onRemoveRedBlackBet(opt.key); }}
        whileTap={canBetRB ? { scale: 0.95 } : {}}
        className={`relative rounded-lg px-1 py-0.5 text-xs font-bold border-2 transition-all duration-300 ${cls} ${canBetRB ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex flex-col items-center">
          <span className="text-xs leading-tight">{opt.label}</span>
          <span className="text-yellow-400/80 text-xs leading-tight">{opt.payout}</span>
        </div>
        {/* Multi-player chips — offset in a small cluster */}
        {chipsHere.length > 0 && (
          <div className="absolute -top-1.5 -right-1.5 flex flex-row-reverse gap-0.5">
            {chipsHere.map(({ pid, amt }, idx) => {
              const c = PLAYER_CHIP_COLORS[pid % PLAYER_CHIP_COLORS.length];
              return (
                <span
                  key={pid}
                  style={{ zIndex: 10 + idx }}
                  className={`${c.bg} ${c.text} text-xs font-black rounded-full w-5 h-5 flex items-center justify-center border ${c.border} shadow`}
                  title={`P${pid + 1}: $${amt}`}
                >
                  {amt >= 100 ? '99+' : amt}
                </span>
              );
            })}
          </div>
        )}
        {isLive && !isWinner && (
          <div className="absolute inset-0 rounded-lg bg-white/10 animate-pulse pointer-events-none" />
        )}
        {isWinner && (
          <div className="absolute inset-0 rounded-lg bg-yellow-400/10 animate-pulse pointer-events-none" />
        )}
      </motion.button>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Red/Black Bets — Red left col, Black right col, 3→5 top to bottom */}
      <div>
        <div className="text-yellow-400 text-xs font-bold tracking-wider uppercase mb-1 text-center">Color Board</div>
        <div className="grid grid-cols-2 gap-1">
          {/* Left column: Red (3R, 4R, 5R top to bottom) */}
          <div className="flex flex-col gap-1">
            {RED_OPTIONS.map(opt => renderRBCell(opt, true))}
          </div>
          {/* Right column: Black (3B, 4B, 5B top to bottom) */}
          <div className="flex flex-col gap-1">
            {BLACK_OPTIONS.map(opt => renderRBCell(opt, false))}
          </div>
        </div>
        {communityCards.length > 0 && (
          <div className="mt-0.5 text-center text-xs text-green-400/70">{reds}R / {blacks}B showing</div>
        )}
      </div>

      {/* Low/High Bets */}
      <div>
        <div className={`text-yellow-400 text-xs font-bold tracking-wider uppercase mb-1 text-center ${canBetLH ? 'animate-pulse' : ''}`}>
          River — Low / High
        </div>
        <div className="grid grid-cols-2 gap-1">
          {['LOW', 'HIGH'].map(type => {
            const isLow = type === 'LOW';
            const isWinner = winningLowHigh === type;

            let cls;
            if (isWinner) cls = 'bg-yellow-900/50 text-yellow-300 winner-flash';
            else if (canBetLH) cls = 'border-blue-700/50 bg-blue-950/30 text-blue-300 hover:border-blue-400 cursor-pointer';
            else cls = 'border-blue-900/20 bg-blue-950/10 text-blue-400/40';

            // Collect all players' chips for this slot
            const chipsHere = [];
            for (let i = 0; i < playerCount; i++) {
              const plh = allLowHighBets[i];
              if (plh && plh.type === type && plh.amount > 0) chipsHere.push({ pid: i, amt: plh.amount });
            }

            return (
              <motion.button
                key={type}
                onClick={() => canBetLH && onLowHighBet(type)}
                onContextMenu={(e) => { e.preventDefault(); if (gamePhase === 'lowHighBetting') onRemoveLowHighBet(); }}
                whileTap={canBetLH ? { scale: 0.95 } : {}}
                className={`relative rounded-lg px-1 py-0.5 text-xs font-bold border-2 transition-all duration-200 ${cls} ${canBetLH ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex flex-col items-center">
                  <span className="font-black text-sm leading-tight">{type}</span>
                  <span className="text-yellow-400/80 text-xs leading-tight">{isLow ? '2–7' : '8–A'} · 1:1</span>
                </div>
                {chipsHere.length > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 flex flex-row-reverse gap-0.5">
                    {chipsHere.map(({ pid, amt }, idx) => {
                      const c = PLAYER_CHIP_COLORS[pid % PLAYER_CHIP_COLORS.length];
                      return (
                        <span
                          key={pid}
                          style={{ zIndex: 10 + idx }}
                          className={`${c.bg} ${c.text} text-xs font-black rounded-full w-5 h-5 flex items-center justify-center border ${c.border} shadow`}
                          title={`P${pid + 1}: $${amt}`}
                        >
                          {amt >= 100 ? '99+' : amt}
                        </span>
                      );
                    })}
                  </div>
                )}
                {isWinner && (
                  <div className="absolute inset-0 rounded-lg bg-yellow-400/10 animate-pulse pointer-events-none" />
                )}
              </motion.button>
            );
          })}
        </div>
        {communityCards.length >= 4 && (
          <div className="mt-0.5 text-center text-xs text-green-400/70">{lows} Low / {highs} High (of 4)</div>
        )}
      </div>
    </div>
  );
}