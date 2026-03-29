import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

// Total duration: 20 seconds
// Scene 1: 0-4s   — Cartoon intro, title reveal
// Scene 2: 4-8s   — Cartoon cards dealing, chips flying
// Scene 3: 8-12s  — Transition: cartoon melts into realism
// Scene 4: 12-16s — Realistic casino table, players reacting
// Scene 5: 16-20s — Winner moment, logo finale

const TOTAL_DURATION = 20000;

function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  const start = () => {
    setElapsed(0);
    setRunning(true);
    startRef.current = performance.now();
    const tick = (now) => {
      const ms = now - startRef.current;
      setElapsed(Math.min(ms, TOTAL_DURATION));
      if (ms < TOTAL_DURATION) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setRunning(false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    setElapsed(0);
    setRunning(false);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const t = elapsed / 1000; // seconds
  return { t, running, start, reset, elapsed };
}

// Floating cartoon card
function CartoonCard({ rank, suit, delay, x, y, rotate, scale = 1 }) {
  const isRed = suit === '♥' || suit === '♦';
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotate: rotate - 20, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, rotate, scale }}
      transition={{ delay, duration: 0.6, type: 'spring', stiffness: 120 }}
      className="absolute"
      style={{ left: x, top: y }}
    >
      <div className="relative" style={{
        width: 56, height: 80,
        background: 'white',
        borderRadius: 8,
        border: '3px solid #1a1a2e',
        boxShadow: '4px 4px 0px #1a1a2e',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Oswald, sans-serif',
        fontWeight: 900,
        fontSize: 22,
        color: isRed ? '#e53e3e' : '#1a202c',
      }}>
        <div style={{ position: 'absolute', top: 3, left: 5, fontSize: 11, lineHeight: 1 }}>{rank}<br />{suit}</div>
        <div>{suit}</div>
        <div style={{ position: 'absolute', bottom: 3, right: 5, fontSize: 11, lineHeight: 1, transform: 'rotate(180deg)' }}>{rank}<br />{suit}</div>
      </div>
    </motion.div>
  );
}

// Cartoon chip
function CartoonChip({ color, x, y, delay, size = 36 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, y: -30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 200 }}
      className="absolute"
      style={{ left: x, top: y }}
    >
      <div style={{
        width: size, height: size,
        borderRadius: '50%',
        background: color,
        border: '3px solid #1a1a2e',
        boxShadow: `3px 3px 0px #1a1a2e, inset 0 0 0 4px rgba(255,255,255,0.3)`,
      }} />
    </motion.div>
  );
}

// Realistic-style player silhouette
function PlayerSilhouette({ x, style, delay, excited }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, y: excited ? [0, -8, 0, -5, 0] : 0 }}
      transition={{ delay, duration: excited ? 0.5 : 0.4, repeat: excited ? 2 : 0 }}
      className="absolute bottom-0"
      style={{ left: x, ...style }}
    >
      {/* Body */}
      <div style={{
        width: 70, height: 110,
        background: 'linear-gradient(180deg, #2d3748 0%, #1a202c 100%)',
        borderRadius: '35px 35px 10px 10px',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        {/* Head */}
        <div style={{
          width: 44, height: 44,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f6d860 0%, #e8c14a 100%)',
          position: 'absolute',
          top: -28, left: 13,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }} />
        {/* Suit lapels */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          width: 20, height: 40,
          background: 'linear-gradient(180deg, #4a5568 0%, #2d3748 100%)',
          borderRadius: '0 0 10px 10px',
          transform: 'rotate(-10deg)',
        }} />
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 20, height: 40,
          background: 'linear-gradient(180deg, #4a5568 0%, #2d3748 100%)',
          borderRadius: '0 0 10px 10px',
          transform: 'rotate(10deg)',
        }} />
      </div>
    </motion.div>
  );
}

// Confetti piece
function ConfettiPiece({ x, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 0, rotate: 0 }}
      animate={{ opacity: [0, 1, 1, 0], y: 300, x: (Math.random() - 0.5) * 100, rotate: 720 }}
      transition={{ delay, duration: 2, ease: 'easeIn' }}
      style={{
        position: 'absolute',
        top: 0, left: x,
        width: 8, height: 12,
        background: color,
        borderRadius: 2,
      }}
    />
  );
}

export default function PromoSequence() {
  const { t, running, start, reset } = useTimer();
  const [started, setStarted] = useState(false);

  const handleStart = () => {
    setStarted(true);
    start();
  };

  const handleReset = () => {
    setStarted(false);
    reset();
  };

  // Scene detection
  const scene1 = t >= 0 && t < 4;
  const scene2 = t >= 4 && t < 8;
  const scene3 = t >= 8 && t < 12;
  const scene4 = t >= 12 && t < 16;
  const scene5 = t >= 16 && t <= 20;

  // Style blending: 0=cartoon, 1=realistic
  const realism = t < 8 ? 0 : t < 12 ? (t - 8) / 4 : 1;

  const bgStyle = {
    background: realism < 0.5
      ? `linear-gradient(180deg, #1a0a2e ${100 - realism * 80}%, #0a1628 100%)`
      : `radial-gradient(ellipse at top, #0d1f12 0%, #051008 60%, #020a04 100%)`,
    filter: `saturate(${1 + realism * 0.5})`,
  };

  const confettiColors = ['#facc15', '#f97316', '#ef4444', '#22c55e', '#3b82f6', '#a855f7'];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      {/* Back link */}
      <div className="absolute top-4 left-4 z-50">
        <Link to="/" className="text-yellow-400/60 hover:text-yellow-400 text-sm transition-colors">← Back to Game</Link>
      </div>

      {/* Screen */}
      <div
        className="relative overflow-hidden"
        style={{
          width: 800, height: 450,
          borderRadius: 16,
          border: '3px solid #facc15',
          boxShadow: '0 0 60px rgba(250,204,21,0.3)',
          ...bgStyle,
          transition: 'background 1s ease',
        }}
      >
        {/* ── PROGRESS BAR ── */}
        {started && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-50">
            <motion.div
              className="h-full bg-yellow-400"
              style={{ width: `${(t / 20) * 100}%` }}
            />
          </div>
        )}

        {/* ══════════════ NOT STARTED ══════════════ */}
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
            <div className="text-center">
              <div className="flex items-baseline gap-1 justify-center">
                <span className="font-black italic text-5xl" style={{
                  fontFamily: 'Oswald, sans-serif',
                  background: 'linear-gradient(90deg, #e2e8f0, #ffffff, #94a3b8)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>RAPID</span>
                <span className="font-black italic text-5xl" style={{
                  fontFamily: 'Oswald, sans-serif',
                  background: 'linear-gradient(180deg, #fef08a, #f97316, #dc2626)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>🔥FIRE</span>
              </div>
              <div className="text-green-400 font-black italic text-xl tracking-widest mt-1" style={{ fontFamily: 'Oswald, sans-serif' }}>TEXAS 10</div>
              <div className="text-white/50 text-sm mt-2">20-Second Animated Promo</div>
            </div>
            <button
              onClick={handleStart}
              className="px-8 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-black text-lg tracking-wider transition-all shadow-yellow-400/40 shadow-lg"
              style={{ fontFamily: 'Oswald, sans-serif' }}
            >
              ▶ PLAY PROMO
            </button>
          </div>
        )}

        {/* ══════════════ SCENE 1: 0–4s — Cartoon Title ══════════════ */}
        <AnimatePresence>
          {scene1 && (
            <motion.div
              key="scene1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ fontFamily: 'Oswald, sans-serif' }}
            >
              {/* Cartoon stars background */}
              {[...Array(12)].map((_, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0.5, 1], scale: [0, 1.2, 0.8, 1], rotate: 360 }}
                  transition={{ delay: i * 0.15, duration: 1, repeat: Infinity, repeatDelay: 1 }}
                  style={{
                    position: 'absolute',
                    left: `${8 + (i * 8) % 84}%`,
                    top: `${10 + (i * 13) % 80}%`,
                    fontSize: 16 + (i % 3) * 8,
                    color: ['#facc15', '#f97316', '#22c55e', '#60a5fa'][i % 4],
                    textShadow: '2px 2px 0 #000',
                  }}
                >★</motion.div>
              ))}

              {/* Cartoon outline title */}
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: [-3, 3, -2, 0] }}
                transition={{ delay: 0.2, duration: 0.6, type: 'spring', stiffness: 150 }}
                className="text-center mb-2"
              >
                <div className="flex items-baseline gap-2 justify-center">
                  <span className="font-black italic" style={{
                    fontSize: 72,
                    WebkitTextStroke: '4px #1a1a2e',
                    color: '#e2e8f0',
                    textShadow: '6px 6px 0 #1a1a2e',
                    letterSpacing: '-0.04em',
                  }}>RAPID</span>
                  <span className="font-black italic" style={{
                    fontSize: 72,
                    WebkitTextStroke: '4px #1a1a2e',
                    background: 'linear-gradient(180deg, #fef08a, #f97316)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: 'none',
                    filter: 'drop-shadow(6px 6px 0px #1a1a2e)',
                  }}>🔥FIRE</span>
                </div>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  style={{
                    fontSize: 28,
                    color: '#4ade80',
                    WebkitTextStroke: '2px #1a1a2e',
                    textShadow: '3px 3px 0 #1a1a2e',
                    letterSpacing: '0.3em',
                  }}
                >TEXAS 10</motion.div>
              </motion.div>

              {/* Cartoon subtitle bounce */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: [0, -4, 0] }}
                transition={{ delay: 1.2, duration: 0.5, repeat: Infinity, repeatDelay: 0.8 }}
                style={{
                  fontSize: 18,
                  color: '#fef08a',
                  WebkitTextStroke: '1px #1a1a2e',
                  textShadow: '2px 2px 0 #1a1a2e',
                  letterSpacing: '0.15em',
                }}
              >THE FASTEST GAME IN THE CASINO!</motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════ SCENE 2: 4–8s — Cartoon Gameplay ══════════════ */}
        <AnimatePresence>
          {scene2 && (
            <motion.div
              key="scene2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.8 } }}
              className="absolute inset-0"
            >
              {/* Cartoon table */}
              <div style={{
                position: 'absolute', bottom: 60, left: 80, right: 80, height: 160,
                background: 'linear-gradient(180deg, #2d6a4f 0%, #1b4332 100%)',
                borderRadius: '50% 50% 20px 20px / 30% 30% 10px 10px',
                border: '5px solid #1a1a2e',
                boxShadow: '6px 6px 0 #1a1a2e',
              }} />

              {/* Table felt lines */}
              <div style={{
                position: 'absolute', bottom: 90, left: 120, right: 120, height: 2,
                background: 'rgba(255,255,255,0.15)', borderRadius: 1,
              }} />

              {/* Cartoon cards on table */}
              <CartoonCard rank="A" suit="♦" delay={0.1} x={200} y={220} rotate={-8} scale={1.1} />
              <CartoonCard rank="K" suit="♠" delay={0.3} x={270} y={215} rotate={2} scale={1.1} />
              <CartoonCard rank="Q" suit="♥" delay={0.5} x={340} y={218} rotate={-3} scale={1.1} />
              <CartoonCard rank="J" suit="♣" delay={0.7} x={410} y={220} rotate={6} scale={1.1} />
              <CartoonCard rank="10" suit="♦" delay={0.9} x={480} y={216} rotate={-5} scale={1.1} />

              {/* Chips flying */}
              <CartoonChip color="#facc15" x={160} y={160} delay={0.4} size={40} />
              <CartoonChip color="#ef4444" x={540} y={170} delay={0.6} size={36} />
              <CartoonChip color="#3b82f6" x={350} y={140} delay={0.8} size={44} />
              <CartoonChip color="#22c55e" x={240} y={175} delay={1.0} size={32} />
              <CartoonChip color="#a855f7" x={460} y={155} delay={1.2} size={38} />

              {/* Cartoon player hands reaching in */}
              {[150, 310, 470].map((x, i) => (
                <motion.div key={i}
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.2, type: 'spring' }}
                  style={{
                    position: 'absolute', bottom: 0, left: x,
                    width: 60, height: 80,
                    background: `linear-gradient(180deg, ${['#fbbf24','#f87171','#34d399'][i]} 0%, ${['#d97706','#dc2626','#059669'][i]} 100%)`,
                    borderRadius: '30px 30px 5px 5px',
                    border: '3px solid #1a1a2e',
                    boxShadow: '4px 4px 0 #1a1a2e',
                  }}
                />
              ))}

              {/* "DEAL!" speech bubble */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.4 }}
                style={{
                  position: 'absolute', top: 30, right: 80,
                  background: 'white',
                  border: '3px solid #1a1a2e',
                  borderRadius: 12,
                  padding: '6px 14px',
                  fontFamily: 'Oswald, sans-serif',
                  fontWeight: 900,
                  fontSize: 22,
                  color: '#1a1a2e',
                  boxShadow: '3px 3px 0 #1a1a2e',
                }}
              >DEAL! 🎉</motion.div>

              {/* WIN! pop */}
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: [0, 1.4, 1.1], rotate: [0, 5, -3, 0] }}
                transition={{ delay: 2.2, duration: 0.5 }}
                style={{
                  position: 'absolute', top: 40, left: 60,
                  background: 'linear-gradient(135deg, #facc15, #f97316)',
                  border: '4px solid #1a1a2e',
                  borderRadius: '50%',
                  width: 90, height: 90,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Oswald, sans-serif',
                  fontWeight: 900, fontSize: 24,
                  color: '#1a1a2e',
                  boxShadow: '5px 5px 0 #1a1a2e',
                }}
              >WIN!<br />💰</motion.div>

              {/* Payout label */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 2.8, duration: 0.4 }}
                style={{
                  position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                  background: '#1a1a2e',
                  borderRadius: 8, padding: '4px 16px',
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: 18, fontWeight: 700,
                  color: '#facc15',
                  border: '2px solid #facc15',
                  whiteSpace: 'nowrap',
                }}
              >10 HANDS • 3 SIDE BETS • INSTANT PAYOUTS</motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════ SCENE 3: 8–12s — Cartoon → Realistic Morph ══════════════ */}
        <AnimatePresence>
          {scene3 && (
            <motion.div
              key="scene3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {/* Morphing table */}
              <motion.div style={{
                position: 'absolute',
                bottom: 40, left: 60, right: 60, height: 200,
                background: t < 10
                  ? 'linear-gradient(180deg, #2d6a4f, #1b4332)'
                  : 'radial-gradient(ellipse at top, #1a4731 0%, #0d2318 100%)',
                borderRadius: '50% 50% 20px 20px / 30% 30% 10px 10px',
                border: t < 10 ? '5px solid #1a1a2e' : '2px solid rgba(255,255,255,0.1)',
                boxShadow: t < 10
                  ? '6px 6px 0 #1a1a2e'
                  : '0 20px 60px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.4)',
                transition: 'all 0.5s ease',
              }} />

              {/* Morphing title */}
              <motion.div
                animate={{
                  filter: `blur(${t < 9 ? 0 : t < 11 ? (t - 9) * 3 : 0}px)`,
                  scale: t < 10 ? 1 : t < 11 ? 1 + (t - 10) * 0.3 : 1.3,
                }}
                style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}
              >
                <div className="flex items-baseline gap-2 justify-center">
                  <span className="font-black italic" style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: 60,
                    ...(t < 10 ? {
                      WebkitTextStroke: '4px #1a1a2e',
                      color: '#e2e8f0',
                    } : {
                      background: 'linear-gradient(90deg, #e2e8f0, #ffffff, #94a3b8)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 20px rgba(148,163,184,0.8))',
                    }),
                  }}>RAPID</span>
                  <span className="font-black italic" style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: 60,
                    background: 'linear-gradient(180deg, #fef08a, #f97316, #dc2626)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: t < 10
                      ? 'drop-shadow(4px 4px 0px #1a1a2e)'
                      : 'drop-shadow(0 0 20px rgba(249,115,22,0.9)) drop-shadow(0 0 40px rgba(220,38,38,0.6))',
                  }}>🔥FIRE</span>
                </div>
              </motion.div>

              {/* Particle burst at transition midpoint */}
              {t >= 9.5 && t <= 11 && [...Array(16)].map((_, i) => (
                <motion.div key={i}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos((i / 16) * Math.PI * 2) * 200,
                    y: Math.sin((i / 16) * Math.PI * 2) * 150,
                    opacity: 0, scale: 0,
                  }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    width: 12, height: 12,
                    borderRadius: '50%',
                    background: ['#facc15', '#f97316', '#ef4444', '#22c55e'][i % 4],
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════ SCENE 4: 12–16s — Realistic Casino ══════════════ */}
        <AnimatePresence>
          {scene4 && (
            <motion.div
              key="scene4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
              className="absolute inset-0"
            >
              {/* Realistic felt table */}
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0, height: 220,
                background: 'radial-gradient(ellipse at top center, #1a5c3a 0%, #0d3321 50%, #071a11 100%)',
                borderTop: '2px solid rgba(255,255,255,0.08)',
              }}>
                {/* Felt texture */}
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.01) 4px, rgba(255,255,255,0.01) 8px)',
                }} />
                {/* Table rail */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 18,
                  background: 'linear-gradient(180deg, #8B4513 0%, #6B3410 100%)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                }} />
              </div>

              {/* Ambient casino glow */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 230,
                background: 'radial-gradient(ellipse at top, rgba(20,10,40,0.9) 0%, transparent 70%)',
              }} />

              {/* Spotlight */}
              <div style={{
                position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
                width: 400, height: 300,
                background: 'radial-gradient(ellipse, rgba(250,204,21,0.08) 0%, transparent 70%)',
              }} />

              {/* Realistic cards — glowing */}
              {[{r:'A♦',x:180},{r:'K♠',x:240},{r:'Q♥',x:300},{r:'J♣',x:360},{r:'10♦',x:420}].map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -80, opacity: 0, rotateX: 90 }}
                  animate={{ y: 0, opacity: 1, rotateX: 0 }}
                  transition={{ delay: i * 0.15, duration: 0.5, type: 'spring' }}
                  style={{
                    position: 'absolute',
                    top: 160, left: c.x,
                    width: 52, height: 76,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
                    borderRadius: 6,
                    border: '1px solid rgba(0,0,0,0.2)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Oswald, sans-serif',
                    fontWeight: 700, fontSize: 14,
                    color: c.r.includes('♥') || c.r.includes('♦') ? '#c53030' : '#1a202c',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, lineHeight: 1.1 }}>{c.r}</div>
                  </div>
                </motion.div>
              ))}

              {/* Realistic chips */}
              {[{x:155,c:'#facc15'},{x:510,c:'#ef4444'},{x:340,c:'#3b82f6'},{x:240,c:'#22c55e'},{x:440,c:'#a855f7'}].map((chip, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}
                  style={{
                    position: 'absolute',
                    bottom: 100 + (i % 3) * 12, left: chip.x,
                    width: 38, height: 38,
                    borderRadius: '50%',
                    background: `radial-gradient(circle at 35% 35%, ${chip.c}dd, ${chip.c}66)`,
                    border: `3px dashed ${chip.c}88`,
                    boxShadow: `0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 12px ${chip.c}44`,
                  }}
                />
              ))}

              {/* Players */}
              <PlayerSilhouette x={80} delay={0.2} excited={false} />
              <PlayerSilhouette x={640} delay={0.3} excited={false} />
              <PlayerSilhouette x={360} delay={0.1} excited={t > 14} style={{ transform: 'scale(1.05)' }} />

              {/* Dealer label */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                style={{
                  position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: 13, letterSpacing: '0.2em',
                  color: 'rgba(250,204,21,0.6)',
                  textTransform: 'uppercase',
                }}
              >— Dealer —</motion.div>

              {/* Tension text */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0, 1] }}
                transition={{ delay: 1.5, duration: 0.8 }}
                style={{
                  position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: 22, fontWeight: 700,
                  color: '#fef08a',
                  textShadow: '0 0 20px rgba(254,240,138,0.8)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.1em',
                }}
              >ROYAL FLUSH — JACKPOT! 👑</motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════ SCENE 5: 16–20s — Winner + Finale ══════════════ */}
        <AnimatePresence>
          {scene5 && (
            <motion.div
              key="scene5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              {/* Dark casino bg */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #050308 100%)',
              }} />

              {/* Gold spotlight */}
              <div style={{
                position: 'absolute',
                top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                width: 600, height: 400,
                background: 'radial-gradient(ellipse, rgba(250,204,21,0.12) 0%, transparent 70%)',
              }} />

              {/* Confetti */}
              {[...Array(30)].map((_, i) => (
                <ConfettiPiece key={i}
                  x={20 + (i * 26) % 760}
                  color={confettiColors[i % confettiColors.length]}
                  delay={i * 0.05}
                />
              ))}

              {/* Winner exclamation */}
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: [0, 1.3, 1], rotate: [0, 5, -2, 0] }}
                transition={{ delay: 0.3, duration: 0.6, type: 'spring' }}
                style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: 36, fontWeight: 900,
                  color: '#facc15',
                  textShadow: '0 0 30px rgba(250,204,21,0.8), 0 0 60px rgba(250,204,21,0.4)',
                  letterSpacing: '0.15em',
                  position: 'relative', zIndex: 10,
                  marginBottom: 8,
                }}
              >🏆 WINNER! 🏆</motion.div>

              {/* Main logo finale */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}
              >
                <div className="flex items-baseline gap-2 justify-center">
                  <span className="font-black italic" style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: 80,
                    background: 'linear-gradient(90deg, #e2e8f0 0%, #ffffff 40%, #94a3b8 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.04em',
                    filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.5))',
                  }}>RAPID</span>
                  <span className="font-black italic" style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: 80,
                    background: 'linear-gradient(180deg, #fef08a 0%, #f97316 50%, #dc2626 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 30px rgba(249,115,22,0.9)) drop-shadow(0 0 60px rgba(220,38,38,0.6))',
                  }}>🔥FIRE</span>
                </div>

                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1.1, duration: 0.6 }}
                  style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: 28, fontWeight: 900,
                    background: 'linear-gradient(90deg, #4ade80, #22c55e)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    letterSpacing: '0.35em',
                    filter: 'drop-shadow(0 0 12px rgba(74,222,128,0.6))',
                    marginTop: 4,
                  }}
                >TEXAS 10</motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5, duration: 0.5 }}
                  style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: 16, letterSpacing: '0.2em',
                    color: 'rgba(250,204,21,0.6)',
                    marginTop: 12,
                  }}
                >ASK YOUR DEALER TO PLAY TODAY</motion.div>
              </motion.div>

              {/* Pulsing ring */}
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  position: 'absolute',
                  width: 300, height: 300,
                  borderRadius: '50%',
                  border: '2px solid rgba(250,204,21,0.4)',
                  zIndex: 0,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scene label overlay */}
        {started && (
          <div style={{
            position: 'absolute', top: 10, right: 12,
            fontFamily: 'Oswald, sans-serif',
            fontSize: 11, color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.1em',
          }}>
            {scene1 && 'SCENE 1 — INTRO'}
            {scene2 && 'SCENE 2 — GAMEPLAY'}
            {scene3 && 'SCENE 3 — TRANSITION'}
            {scene4 && 'SCENE 4 — CASINO'}
            {scene5 && 'SCENE 5 — FINALE'}
            {' '}{t.toFixed(1)}s
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-4 mt-6">
        {started && !running && t >= TOTAL_DURATION / 1000 && (
          <button
            onClick={handleReset}
            className="px-6 py-2 rounded-xl border border-yellow-500/50 bg-yellow-900/20 text-yellow-300 font-bold hover:bg-yellow-900/40 transition-all"
          >
            ↺ Replay
          </button>
        )}
        {started && running && (
          <div className="text-yellow-400/50 text-sm font-mono pt-2">{t.toFixed(1)}s / 20.0s</div>
        )}
      </div>
    </div>
  );
}