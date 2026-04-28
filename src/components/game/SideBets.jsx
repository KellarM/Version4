import { motion, AnimatePresence } from 'framer-motion';
import { cardColor } from '@/lib/gameEngine';
import { COLOR_BOARD_PAYOUTS, LOW_HIGH_PAYOUT } from '@/lib/payoutConstants';
import { TotalCollectDisplay, EnergyArcOverlay } from './GreedEngine';
import Chip from './Chip';

const RED_OPTIONS   = [
  { key: '3R', number: '3', payout: `${COLOR_BOARD_PAYOUTS['3R']}:1` },
  { key: '4R', number: '4', payout: `${COLOR_BOARD_PAYOUTS['4R']}:1` },
  { key: '5R', number: '5', payout: `${COLOR_BOARD_PAYOUTS['5R']}:1` },
];
const BLACK_OPTIONS = [
  { key: '3B', number: '3', payout: `${COLOR_BOARD_PAYOUTS['3B']}:1` },
  { key: '4B', number: '4', payout: `${COLOR_BOARD_PAYOUTS['4B']}:1` },
  { key: '5B', number: '5', payout: `${COLOR_BOARD_PAYOUTS['5B']}:1` },
];


const goldEmbossText = {
  color: 'transparent',
  background: 'linear-gradient(180deg, #ffe566 0%, #c9960a 45%, #ffe566 80%, #a07005 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: 'none',
  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.7))',
};

export default function SideBets({
  communityCards,
  allRedBlackBets,
  allLowHighBets,
  redBlackBets,
  lowHighBet,
  onRedBlackBet,
  onRemoveRedBlackBet,
  onLowHighBet,
  onRemoveLowHighBet,
  gamePhase,
  winningRedBlack,
  winningLowHigh,
  disabled,
  killSwitchActive,
  rankBetActive,
  playerCount,
  totalInvestment,
  hoveredRiverType,
  onHoverRiver,
  riverWinFlash,
  selectedChip,
  hoveredRankRow,
  isRankBetPlaced,
}) {
  const colorLocked = killSwitchActive || !rankBetActive;
  const riverLocked = !rankBetActive;
  const canBetRB = (gamePhase === 'betting') && !disabled && !colorLocked;
  const canBetLH = (gamePhase === 'lowHighBetting') && !disabled && !riverLocked;

  const reds = communityCards.filter(c => cardColor(c) === 'red').length;
  const blacks = communityCards.filter(c => cardColor(c) === 'black').length;

  const liveRedBlack = [];
  if (reds >= 3) for (let i = 3; i <= reds; i++) liveRedBlack.push(`${i}R`);
  if (blacks >= 3) for (let i = 3; i <= blacks; i++) liveRedBlack.push(`${i}B`);

  const hasColorBet = Object.keys(redBlackBets || {}).some(k => (redBlackBets[k] || 0) > 0);
  const hasRiverBet = lowHighBet && lowHighBet.amount > 0;

  const renderRBCell = (opt, isRed) => {
    const isWinner = winningRedBlack && winningRedBlack.includes(opt.key);
    const isLive = liveRedBlack.includes(opt.key) && !isWinner && communityCards.length > 0 && communityCards.length < 5;
    const hasBet = (redBlackBets[opt.key] || 0) > 0;

    const chipsHere = [];
    for (let i = 0; i < playerCount; i++) {
      const amt = (allRedBlackBets[i] || {})[opt.key] || 0;
      if (amt > 0) chipsHere.push({ pid: i, amt });
    }

    let blockStyle;
    if (isWinner) {
      blockStyle = {
        background: 'linear-gradient(135deg, #f6d860 0%, #e8c22a 30%, #fef08a 55%, #c9960a 80%, #e8c22a 100%)',
        boxShadow: '0 0 14px rgba(255,200,50,0.6), inset 0 1px 2px rgba(255,255,200,0.5)',
        border: '1px solid #a07005',
      };
    } else if (isLive) {
      blockStyle = isRed
        ? { background: 'linear-gradient(160deg, #d32020 0%, #9a0f0f 100%)', boxShadow: '0 0 10px rgba(220,30,30,0.6)', border: '1px solid #111' }
        : { background: 'linear-gradient(160deg, #1a1a1a 0%, #000000 100%)', boxShadow: '0 0 10px rgba(180,160,50,0.35)', border: '1px solid #333' };
    } else if (hasBet) {
      blockStyle = isRed
        ? { background: 'linear-gradient(160deg, #c01c1c 0%, #7a0909 100%)', border: '1px solid #111' }
        : { background: 'linear-gradient(160deg, #141414 0%, #000 100%)', border: '1px solid #333' };
    } else if (canBetRB) {
      blockStyle = isRed
        ? { background: 'linear-gradient(160deg, #e02020 0%, #8c0e0e 100%)', border: '1px solid #111', cursor: 'pointer' }
        : { background: 'linear-gradient(160deg, #222 0%, #000 100%)', border: '1px solid #2a2a2a', cursor: 'pointer' };
    } else {
      blockStyle = isRed
        ? { background: 'linear-gradient(160deg, #8a1414 0%, #4a0505 100%)', border: '1px solid #111', opacity: 0.6 }
        : { background: 'linear-gradient(160deg, #111 0%, #000 100%)', border: '1px solid #1a1a1a', opacity: 0.6 };
    }

    return (
      <motion.button
        key={opt.key}
        onMouseDown={() => gamePhase === 'betting' && onRedBlackBet(opt.key)}
        onContextMenu={(e) => { e.preventDefault(); if (gamePhase === 'betting') onRemoveRedBlackBet(opt.key); }}
        onDragOver={(e) => { if (gamePhase === 'betting') { e.preventDefault(); e.stopPropagation(); } }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (gamePhase !== 'betting') return;
          const data = e.dataTransfer.getData('text/plain');
          if (!data) return;
          try {
            const { from, type } = JSON.parse(data);
            if (type === 'rb' && from !== opt.key) {
              const amt = (redBlackBets[from] || 0);
              if (amt > 0) { onRemoveRedBlackBet(from); onRedBlackBet(opt.key); }
            }
          } catch (_) {}
        }}
        whileTap={canBetRB ? { scale: 0.95 } : {}}
        style={{ ...blockStyle, borderRadius: '8px', position: 'relative', overflow: 'visible' }}
        className={`relative flex-1 transition-all duration-300 ${canBetRB ? 'hover:brightness-110 lp-magnetic' : ''}`}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0 pointer-events-none z-0">
          <span style={{ ...goldEmbossText, fontSize: '1.25rem', fontWeight: 900, lineHeight: 1 }}>
            {opt.number}
          </span>
          <span style={{ ...goldEmbossText, fontSize: '0.72rem', fontWeight: 800, lineHeight: 1.1 }}>
            {opt.payout}
          </span>
        </div>

        {chipsHere.length > 0 && (
          <div
            className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-around"
            style={{ padding: '3px 4px', overflow: 'visible' }}
          >
            {/* Row 1: P1–P5 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 2, overflow: 'visible' }}>
              {Array.from({ length: 5 }, (_, i) => {
                const chip = chipsHere.find(c => c.pid === i);
                if (!chip) return <span key={i} style={{ width: Math.round(24 * 0.6), height: Math.round(24 * 0.6) + 4, display: 'inline-block', flexShrink: 0 }} />;
                return (
                  <Chip
                    key={i}
                    playerId={chip.pid}
                    amount={chip.amt}
                    scale={0.6}
                    draggable={gamePhase === 'betting'}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData('text/plain', JSON.stringify({ from: opt.key, type: 'rb', pid: chip.pid, amount: (redBlackBets[opt.key] || 0) }));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className="transition-transform hover:scale-110"
                    title={`P${chip.pid + 1}: $${chip.amt}`}
                    style={{ pointerEvents: 'auto', flexShrink: 0 }}
                  />
                );
              })}
            </div>
            {/* Row 2: P6–P10 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 2, overflow: 'visible' }}>
              {Array.from({ length: 5 }, (_, i) => {
                const pid = i + 5;
                const chip = chipsHere.find(c => c.pid === pid);
                if (!chip) return <span key={pid} style={{ width: Math.round(24 * 0.6), height: Math.round(24 * 0.6) + 4, display: 'inline-block', flexShrink: 0 }} />;
                return (
                  <Chip
                    key={pid}
                    playerId={chip.pid}
                    amount={chip.amt}
                    scale={0.6}
                    draggable={gamePhase === 'betting'}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData('text/plain', JSON.stringify({ from: opt.key, type: 'rb', pid: chip.pid, amount: (redBlackBets[opt.key] || 0) }));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className="transition-transform hover:scale-110"
                    title={`P${chip.pid + 1}: $${chip.amt}`}
                    style={{ pointerEvents: 'auto', flexShrink: 0 }}
                  />
                );
              })}
            </div>
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

  const goldBlockStyle = {
    background: 'linear-gradient(135deg, #f6d860 0%, #e8c22a 30%, #fef08a 55%, #c9960a 80%, #e8c22a 100%)',
    boxShadow: 'inset 0 1px 2px rgba(255,255,200,0.6), inset 0 -1px 2px rgba(100,60,0,0.5), 0 1px 4px rgba(0,0,0,0.5)',
    border: '1px solid #000',
    borderRadius: '8px',
  };
  const goldBlockDim = {
    background: 'linear-gradient(135deg, #c9a820 0%, #b08a14 30%, #d4b830 55%, #8a6504 80%, #b08a14 100%)',
    boxShadow: 'inset 0 1px 2px rgba(200,170,80,0.3)',
    border: '1px solid #000',
    borderRadius: '8px',
    opacity: 0.6,
  };
  const goldBlockWinner = {
    background: 'linear-gradient(135deg, #fff176 0%, #ffd600 40%, #ffe57a 70%, #ffab00 100%)',
    boxShadow: '0 0 16px rgba(255,200,50,0.7)',
    border: '1px solid #a07005',
    borderRadius: '8px',
  };

  return (
    <div className="flex flex-col h-full gap-1">
      {/* Color Board */}
      <div className="relative flex flex-col min-h-0" style={{ flex: '3 1 0' }}>
        {/* Header */}
        <div
          className="text-xs font-black tracking-wider uppercase mb-1 text-center flex-shrink-0"
          style={{ ...goldEmbossText, fontSize: '0.7rem', letterSpacing: '0.1em' }}
        >
          Color Board
        </div>

        {/* Kill Switch Overlay */}
        {killSwitchActive && gamePhase === 'betting' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-black/80 border-2 border-red-700/60 backdrop-blur-sm">
            <span className="text-red-400 font-black text-base mb-1">LOCKED</span>
            <span className="text-red-300 text-xs font-semibold text-center px-2">4 Hands: Side Bets Disabled</span>
          </div>
        )}

        {/* Smoked Glass Vault — Rank Bet Required */}
        {!killSwitchActive && !rankBetActive && gamePhase === 'betting' && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl"
            style={{
              backdropFilter: 'blur(6px)',
              background: 'linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(15,10,5,0.82) 100%)',
              border: '1.5px solid rgba(251,191,36,0.25)',
              boxShadow: 'inset 0 0 20px rgba(251,191,36,0.05)',
            }}
          >
            <div className="text-base mb-1" style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.5))' }}>
              🏆
            </div>
            <span className="text-yellow-400 font-black text-xs mb-1 text-center px-2 leading-tight">
              UPGRADE YOUR WIN
            </span>
            <span className="text-yellow-300/60 text-xs text-center px-3 leading-snug">
              Match your Rank bet total to your Hand bet total to unlock
            </span>
          </div>
        )}

        {/* Ghost chip preview on rank hover */}
        <AnimatePresence>
          {hoveredRankRow && gamePhase === 'betting' && rankBetActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-1 right-1 z-10 pointer-events-none"
            >
              <div
                className="w-5 h-5 rounded-full border-2 border-yellow-300 flex items-center justify-center text-xs font-black text-yellow-300"
                style={{
                  background: 'rgba(251,191,36,0.25)',
                  boxShadow: '0 0 8px rgba(251,191,36,0.5)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              >
                {selectedChip >= 100 ? '99+' : selectedChip}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-1 flex-1 min-h-0" style={{ gridTemplateRows: '1fr' }}>
          <div className="flex flex-col gap-1">
            {RED_OPTIONS.map(opt => renderRBCell(opt, true))}
          </div>
          <div className="flex flex-col gap-1">
            {BLACK_OPTIONS.map(opt => renderRBCell(opt, false))}
          </div>
        </div>
      </div>

      {/* River — Low / High */}
      <div className="relative flex flex-col min-h-0" style={{ flex: '2 1 0' }}>
        {/* Header */}
        <div
          className={`text-xs font-black tracking-wider uppercase mb-1 text-center flex-shrink-0 ${canBetLH && !hoveredRiverType ? 'animate-pulse' : ''}`}
          style={{ ...goldEmbossText, fontSize: '0.7rem', letterSpacing: '0.1em' }}
        >
          River — Low / High
        </div>

        {/* Smoked Glass Vault — Rank Bet Required (river phase) */}
        {!rankBetActive && gamePhase === 'lowHighBetting' && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl"
            style={{
              backdropFilter: 'blur(6px)',
              background: 'linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(5,10,20,0.82) 100%)',
              border: '1.5px solid rgba(251,191,36,0.25)',
              boxShadow: 'inset 0 0 20px rgba(251,191,36,0.05)',
            }}
          >
            <div className="text-base mb-1" style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.5))' }}>
              🏆
            </div>
            <span className="text-yellow-400 font-black text-xs mb-1 text-center px-2 leading-tight">
              UPGRADE YOUR WIN
            </span>
            <span className="text-yellow-300/60 text-xs text-center px-3 leading-snug">
              Match your Rank bet total to your Hand bet total to unlock
            </span>
          </div>
        )}

        {/* Total Collect preview */}
        <TotalCollectDisplay
          totalInvestment={totalInvestment}
          isHovering={!!hoveredRiverType}
          isWinner={riverWinFlash}
          lowHighPayout={LOW_HIGH_PAYOUT}
        />

        <div className="grid grid-cols-2 gap-1 flex-1 min-h-0">
          {['LOW', 'HIGH'].map(type => {
            const isLow = type === 'LOW';
            const isWinner = winningLowHigh === type;
            const isHovered = hoveredRiverType === type;
            const hasBet = lowHighBet && lowHighBet.type === type && lowHighBet.amount > 0;

            let riverBlockStyle;
            if (isWinner) {
              riverBlockStyle = goldBlockWinner;
            } else if (isHovered && canBetLH) {
              riverBlockStyle = {
                ...goldBlockStyle,
                boxShadow: 'inset 0 1px 2px rgba(255,255,200,0.8), 0 0 12px rgba(255,200,50,0.4)',
              };
            } else if (canBetLH || hasBet) {
              riverBlockStyle = goldBlockStyle;
            } else {
              riverBlockStyle = goldBlockDim;
            }

            const chipsHere = [];
            for (let i = 0; i < playerCount; i++) {
              const plh = allLowHighBets[i];
              if (plh && plh.type === type && plh.amount > 0) chipsHere.push({ pid: i, amt: plh.amount });
            }

            return (
              <motion.button
                key={type}
                onMouseEnter={() => onHoverRiver && onHoverRiver(type)}
                onMouseLeave={() => onHoverRiver && onHoverRiver(null)}
                onMouseDown={() => gamePhase === 'lowHighBetting' && onLowHighBet(type)}
                onContextMenu={(e) => { e.preventDefault(); if (gamePhase === 'lowHighBetting' && lowHighBet && lowHighBet.type === type && lowHighBet.amount > 0) onRemoveLowHighBet(); }}
                whileTap={canBetLH ? { scale: 0.95 } : {}}
                style={{ ...riverBlockStyle, position: 'relative', overflow: 'visible' }}
                className={`relative transition-all duration-200 ${canBetLH ? 'cursor-pointer hover:brightness-110 lp-magnetic' : 'cursor-default'}`}
              >
                <EnergyArcOverlay active={isHovered && canBetLH} />

                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0 z-0 pointer-events-none">
                  <span style={{ fontSize: '0.95rem', fontWeight: 900, lineHeight: 1, color: '#000' }}>
                    {type}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, lineHeight: 1.2, color: '#1a1a1a' }}>
                    {isLow ? '2–7' : '8–A'}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, lineHeight: 1, color: '#000' }}>
                    {LOW_HIGH_PAYOUT}:1
                  </span>
                </div>

                {chipsHere.length > 0 && (
                  <div
                    className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-around"
                    style={{ padding: '3px 4px', overflow: 'visible' }}
                  >
                    {/* Row 1: P1–P5 */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2, overflow: 'visible' }}>
                      {Array.from({ length: 5 }, (_, i) => {
                        const chip = chipsHere.find(c => c.pid === i);
                        if (!chip) return <span key={i} style={{ width: Math.round(24 * 0.6), height: Math.round(24 * 0.6) + 4, display: 'inline-block', flexShrink: 0 }} />;
                        return (
                          <Chip
                            key={i}
                            playerId={chip.pid}
                            amount={chip.amt}
                            scale={0.6}
                            title={`P${chip.pid + 1}: $${chip.amt}`}
                            style={{ flexShrink: 0 }}
                          />
                        );
                      })}
                    </div>
                    {/* Row 2: P6–P10 */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2, overflow: 'visible' }}>
                      {Array.from({ length: 5 }, (_, i) => {
                        const pid = i + 5;
                        const chip = chipsHere.find(c => c.pid === pid);
                        if (!chip) return <span key={pid} style={{ width: Math.round(24 * 0.6), height: Math.round(24 * 0.6) + 4, display: 'inline-block', flexShrink: 0 }} />;
                        return (
                          <Chip
                            key={pid}
                            playerId={chip.pid}
                            amount={chip.amt}
                            scale={0.6}
                            title={`P${chip.pid + 1}: $${chip.amt}`}
                            style={{ flexShrink: 0 }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                {isWinner && (
                  <div className="absolute inset-0 rounded-lg bg-yellow-400/10 animate-pulse pointer-events-none" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}