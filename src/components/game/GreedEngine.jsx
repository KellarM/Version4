import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import canvasConfetti from 'canvas-confetti';

export function useGreedEngineState() {
  const [hoveredHandId, setHoveredHandId] = useState(null);
  const [hoveredRiverType, setHoveredRiverType] = useState(null);
  const [riverWinFlash, setRiverWinFlash] = useState(false);

  const triggerRiverWin = () => {
    setRiverWinFlash(true);
    setTimeout(() => setRiverWinFlash(false), 3000);
  };

  return {
    hoveredHandId,
    setHoveredHandId,
    hoveredRiverType,
    setHoveredRiverType,
    riverWinFlash,
    triggerRiverWin,
  };
}

function GoldCoinFountain({ active, targetRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const myConfetti = canvasConfetti.create(canvas, { resize: true, useWorker: true });

    const duration = 2500;
    const end = Date.now() + duration;

    const frame = () => {
      myConfetti({
        particleCount: 6,
        angle: 90,
        spread: 60,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#fde68a', '#ffffff', '#fcd34d'],
        gravity: 1.4,
        scalar: 0.9,
        drift: 0,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    return () => {
      myConfetti.reset();
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

export function TotalCollectDisplay({ totalInvestment, isHovering, isWinner, lowHighPayout }) {
  const totalCollect = Math.round(totalInvestment * (lowHighPayout + 1));
  const show = isHovering || isWinner;

  return (
    <AnimatePresence>
      {show && totalInvestment > 0 && (
        <motion.div
          key="total-collect"
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{
            opacity: 1,
            scale: isWinner ? [1, 1.15, 1.08] : 1,
            y: 0,
          }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          transition={{ duration: 0.3 }}
          className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-none z-30"
        >
          <div
            className={`px-3 py-1.5 rounded-xl text-center ${
              isWinner
                ? 'bg-white/10 border-2 border-white shadow-white/50 shadow-lg'
                : 'bg-black/80 border border-yellow-500/50 shadow-yellow-500/30 shadow-md'
            }`}
          >
            <div className="text-yellow-300/60 text-xs font-bold tracking-widest uppercase leading-none mb-1">
              Total Collect
            </div>
            <div
              className={`font-black text-xl leading-none ${
                isWinner
                  ? 'text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.95)]'
                  : 'gold-shimmer-text'
              }`}
              style={isWinner ? {
                background: 'linear-gradient(90deg, #ffffff 0%, #fde68a 50%, #ffffff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 16px rgba(255,255,255,0.8))',
              } : undefined}
            >
              ${totalCollect.toLocaleString()}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function EnergyLines({ handBetActive, rankBetActive, colorBetActive, hoveredRiver }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="lineGradDormant" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="lineGradActive" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="lineGradRiver" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.9" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Hand → Rank connector */}
      <line
        x1="15%" y1="30%"
        x2="15%" y2="70%"
        stroke={rankBetActive ? 'url(#lineGradActive)' : 'url(#lineGradDormant)'}
        strokeWidth={rankBetActive ? 2 : 1}
        strokeDasharray={rankBetActive ? '0' : '4 4'}
        filter={rankBetActive ? 'url(#glow)' : undefined}
        style={{ transition: 'all 0.4s ease' }}
      />

      {/* Rank → Color/River connector */}
      <line
        x1="15%" y1="70%"
        x2="15%" y2="95%"
        stroke={colorBetActive || hoveredRiver ? 'url(#lineGradRiver)' : (rankBetActive ? 'url(#lineGradActive)' : 'url(#lineGradDormant)')}
        strokeWidth={colorBetActive || hoveredRiver ? 3 : rankBetActive ? 2 : 1}
        strokeDasharray={(colorBetActive || hoveredRiver) ? '0' : '4 4'}
        filter={(colorBetActive || hoveredRiver) ? 'url(#glow)' : undefined}
        style={{ transition: 'all 0.4s ease' }}
      />
    </svg>
  );
}

export function GhostChipPreview({ show, chipValue }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.5, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.2 }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-yellow-400 border-2 border-yellow-200 flex items-center justify-center pointer-events-none z-20"
          style={{
            boxShadow: '0 0 8px rgba(251,191,36,0.6)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        >
          <span className="text-black text-xs font-black leading-none">{chipValue >= 100 ? '99+' : chipValue}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function EnergyArcOverlay({ active }) {
  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0.3, 0.7, 0] }}
        transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity }}
        className="absolute inset-0 rounded-xl"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.15) 0%, transparent 70%)',
          border: '1px solid rgba(251,191,36,0.3)',
        }}
      />
      <motion.div
        initial={{ rotate: 0, opacity: 0 }}
        animate={{ rotate: 360, opacity: [0, 0.4, 0] }}
        transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
        className="absolute inset-2 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, transparent 70%, rgba(251,191,36,0.5) 85%, transparent 100%)',
        }}
      />
    </div>
  );
}

export function RiverWinCelebration({ active, totalCollect }) {
  return (
    <>
      <GoldCoinFountain active={active} />
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: [0.5, 1.2, 1] }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, times: [0, 0.6, 1] }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-40"
          >
            <div
              className="px-8 py-6 rounded-2xl text-center"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 100%)',
                border: '2px solid rgba(255,255,255,0.6)',
                boxShadow: '0 0 40px rgba(255,255,255,0.4), 0 0 80px rgba(251,191,36,0.3)',
              }}
            >
              <div className="text-yellow-300/80 text-sm font-bold tracking-widest uppercase mb-2">
                River Win
              </div>
              <div
                className="font-black text-4xl"
                style={{
                  background: 'linear-gradient(90deg, #fde68a 0%, #ffffff 40%, #fde68a 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.8))',
                }}
              >
                ${totalCollect?.toLocaleString()}
              </div>
              <div className="text-yellow-400/60 text-xs mt-1 tracking-wider">TOTAL COLLECT</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}