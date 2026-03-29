import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Link } from 'react-router-dom';

// ─── CINEMATIC PROMO — 25 seconds ───────────────────────────────────────────
// Beat 1:  0–3s   Dark cold open. Single card flips face-up. Gold logo burns in.
// Beat 2:  3–7s   10 hand cards slam down in sequence. Neon suit symbols pulse.
// Beat 3:  7–12s  Community cards deal one by one. Chips cascade. Tension builds.
// Beat 4: 12–16s  ROYAL FLUSH reveal. Explosion of light. Jackpot counter.
// Beat 5: 16–21s  Board stats fly in. Red/Black board. Low/High. Side bets.
// Beat 6: 21–25s  Full logo reveal + CTA. Screen burn-out.

const DURATION = 25000;

function usePromoTimer() {
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  const start = () => {
    setT(0);
    setRunning(true);
    startRef.current = performance.now();
    const tick = (now) => {
      const ms = now - startRef.current;
      const clamped = Math.min(ms / 1000, DURATION / 1000);
      setT(clamped);
      if (ms < DURATION) rafRef.current = requestAnimationFrame(tick);
      else setRunning(false);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const reset = () => { cancelAnimationFrame(rafRef.current); setT(0); setRunning(false); };
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  return { t, running, start, reset };
}

// ── Suit symbols with neon glow ──────────────────────────────────────────────
const SUIT_NEON = {
  '♠': { color: '#a78bfa', glow: 'rgba(167,139,250,0.8)' },
  '♥': { color: '#f87171', glow: 'rgba(248,113,113,0.8)' },
  '♦': { color: '#fb923c', glow: 'rgba(251,146,60,0.8)'  },
  '♣': { color: '#34d399', glow: 'rgba(52,211,153,0.8)'  },
};

// ── Single playing card ──────────────────────────────────────────────────────
function PromoCard({ rank, suit, delay = 0, style = {}, glow = false, size = 'md', faceDown = false }) {
  const s = SUIT_NEON[suit] || { color: '#fff', glow: 'rgba(255,255,255,0.5)' };
  const dims = { sm: [44, 64, 10, 12], md: [60, 88, 13, 16], lg: [80, 116, 17, 20] };
  const [w, h, fs, suitFs] = dims[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: -40, rotateY: faceDown ? 0 : 180, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
      transition={{ delay, duration: 0.55, type: 'spring', stiffness: 130, damping: 14 }}
      style={{
        position: 'absolute',
        width: w, height: h,
        borderRadius: 6,
        background: faceDown
          ? 'linear-gradient(135deg, #0a1628 0%, #1a0a2e 100%)'
          : 'linear-gradient(160deg, #ffffff 0%, #f0ede8 100%)',
        border: glow ? `1.5px solid ${s.color}` : '1px solid rgba(255,255,255,0.15)',
        boxShadow: glow
          ? `0 0 20px ${s.glow}, 0 0 40px ${s.glow}55, 0 8px 30px rgba(0,0,0,0.7)`
          : '0 6px 24px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '4px 5px',
        fontFamily: 'Oswald, sans-serif',
        fontWeight: 700,
        color: faceDown ? 'transparent' : s.color,
        ...style,
      }}
    >
      {!faceDown && (
        <>
          <div style={{ fontSize: fs, lineHeight: 1 }}>{rank}<br />{suit}</div>
          <div style={{ fontSize: suitFs, textAlign: 'center', textShadow: `0 0 12px ${s.glow}` }}>{suit}</div>
          <div style={{ fontSize: fs, lineHeight: 1, transform: 'rotate(180deg)', alignSelf: 'flex-end' }}>{rank}<br />{suit}</div>
        </>
      )}
      {faceDown && (
        <div style={{
          position: 'absolute', inset: 4, borderRadius: 4,
          background: 'repeating-linear-gradient(45deg, rgba(250,204,21,0.08), rgba(250,204,21,0.08) 3px, transparent 3px, transparent 8px)',
          border: '1px solid rgba(250,204,21,0.2)',
        }} />
      )}
    </motion.div>
  );
}

// ── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ color, label, x, y, delay, size = 42 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -60, scale: 0, rotate: -180 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      transition={{ delay, duration: 0.5, type: 'spring', stiffness: 200 }}
      style={{
        position: 'absolute', left: x, top: y,
        width: size, height: size, borderRadius: '50%',
        background: `radial-gradient(circle at 35% 30%, ${color}ff, ${color}99)`,
        border: `3px dashed ${color}cc`,
        boxShadow: `0 0 16px ${color}66, 0 4px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.9)',
        fontFamily: 'Oswald, sans-serif', letterSpacing: '0.05em',
      }}
    >{label}</motion.div>
  );
}

// ── Neon text line ────────────────────────────────────────────────────────────
function NeonText({ children, color = '#facc15', glow, delay = 0, fontSize = 14, style = {}, ...motionProps }) {
  const g = glow || color;
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        fontFamily: 'Oswald, sans-serif', fontWeight: 700,
        fontSize, color,
        textShadow: `0 0 10px ${g}, 0 0 20px ${g}88`,
        letterSpacing: '0.1em',
        ...style,
      }}
      {...motionProps}
    >{children}</motion.div>
  );
}

// ── Jackpot counter ───────────────────────────────────────────────────────────
function JackpotCounter({ target, duration = 2 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      setVal(Math.floor(p * p * target));
      if (p < 1) requestAnimationFrame(tick);
      else setVal(target);
    };
    requestAnimationFrame(tick);
  }, []);
  return (
    <span>${val.toLocaleString()}</span>
  );
}

// ── Particle burst ────────────────────────────────────────────────────────────
function ParticleBurst({ count = 24, colors }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = 120 + Math.random() * 180;
        const c = colors[i % colors.length];
        return (
          <motion.div key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, scale: 0 }}
            transition={{ duration: 1.2 + Math.random() * 0.8, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 6 + Math.random() * 8, height: 6 + Math.random() * 8,
              borderRadius: Math.random() > 0.5 ? '50%' : 2,
              background: c,
              boxShadow: `0 0 8px ${c}`,
              marginLeft: -4, marginTop: -4,
            }}
          />
        );
      })}
    </>
  );
}

// ── Scan line / film grain overlay ───────────────────────────────────────────
function FilmOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100,
      background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
      mixBlendMode: 'overlay',
    }} />
  );
}

// ── Main logo ─────────────────────────────────────────────────────────────────
function RapidFireLogo({ size = 'xl', showTexas = true, animated = false, delay = 0 }) {
  const fontSizes = { sm: [28, 10], md: [44, 14], lg: [60, 18], xl: [80, 24] };
  const [titleFs, subFs] = fontSizes[size];

  const Wrapper = animated ? motion.div : 'div';
  const wProps = animated ? {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    transition: { delay, duration: 0.8, type: 'spring', stiffness: 100 },
  } : {};

  return (
    <Wrapper {...wProps} style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
        <span style={{
          fontFamily: 'Oswald, sans-serif', fontWeight: 900, fontStyle: 'italic',
          fontSize: titleFs,
          background: 'linear-gradient(90deg, #e2e8f0 0%, #ffffff 50%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.04em',
          filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.4))',
        }}>RAPID</span>
        <span style={{
          fontFamily: 'Oswald, sans-serif', fontWeight: 900, fontStyle: 'italic',
          fontSize: titleFs,
          background: 'linear-gradient(180deg, #fef08a 0%, #f97316 50%, #dc2626 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 25px rgba(249,115,22,0.9)) drop-shadow(0 0 50px rgba(220,38,38,0.5))',
          letterSpacing: '-0.02em',
        }}>🔥FIRE</span>
      </div>
      {showTexas && (
        <div style={{
          fontFamily: 'Oswald, sans-serif', fontWeight: 900, fontStyle: 'italic',
          fontSize: subFs, letterSpacing: '0.35em',
          background: 'linear-gradient(90deg, #4ade80, #22c55e)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 10px rgba(74,222,128,0.7))',
          marginTop: 2,
        }}>TEXAS 10</div>
      )}
    </Wrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function PromoSequence() {
  const { t, running, start, reset } = usePromoTimer();
  const [started, setStarted] = useState(false);

  const handleStart = () => { setStarted(true); start(); };
  const handleReset = () => { setStarted(false); reset(); };

  const done = t >= DURATION / 1000;

  // Beat windows
  const b1 = t >= 0  && t < 3;
  const b2 = t >= 3  && t < 7;
  const b3 = t >= 7  && t < 12;
  const b4 = t >= 12 && t < 16;
  const b5 = t >= 16 && t < 21;
  const b6 = t >= 21;

  // Progress
  const progress = Math.min(t / (DURATION / 1000), 1);

  return (
    <div style={{
      minHeight: '100vh', background: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Back */}
      <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 200 }}>
        <Link to="/" style={{ color: 'rgba(250,204,21,0.5)', fontSize: 13, textDecoration: 'none', fontFamily: 'Oswald, sans-serif' }}>
          ← Back to Game
        </Link>
      </div>

      {/* ── SCREEN ── */}
      <div style={{
        position: 'relative',
        width: 860, height: 484,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(250,204,21,0.2)',
        boxShadow: '0 0 80px rgba(250,204,21,0.15), 0 0 200px rgba(249,115,22,0.08)',
        background: 'radial-gradient(ellipse at top, #0d0520 0%, #020106 100%)',
      }}>
        <FilmOverlay />

        {/* Ambient vignette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 90,
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)',
        }} />

        {/* ── IDLE / PRE-START ── */}
        {!started && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 32,
          }}>
            {/* Animated bg glow */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{
                position: 'absolute', width: 500, height: 300,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(249,115,22,0.15) 0%, transparent 70%)',
              }}
            />
            {/* Floating suit symbols */}
            {['♠','♥','♦','♣','♠','♥','♦','♣'].map((s, i) => (
              <motion.div key={i}
                animate={{ y: [0, -12, 0], opacity: [0.15, 0.35, 0.15] }}
                transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
                style={{
                  position: 'absolute',
                  left: `${8 + (i * 12) % 80}%`,
                  top: `${10 + (i * 15) % 70}%`,
                  fontSize: 24 + (i % 3) * 12,
                  color: SUIT_NEON[s].color,
                  textShadow: `0 0 20px ${SUIT_NEON[s].glow}`,
                  pointerEvents: 'none',
                }}
              >{s}</motion.div>
            ))}

            <RapidFireLogo size="xl" showTexas animated={false} />

            <motion.button
              whileHover={{ scale: 1.06, boxShadow: '0 0 40px rgba(250,204,21,0.6)' }}
              whileTap={{ scale: 0.96 }}
              onClick={handleStart}
              style={{
                padding: '14px 48px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                border: 'none',
                color: '#fff',
                fontSize: 20, fontWeight: 900,
                fontFamily: 'Oswald, sans-serif',
                letterSpacing: '0.15em',
                cursor: 'pointer',
                boxShadow: '0 0 24px rgba(249,115,22,0.5)',
                position: 'relative', zIndex: 10,
              }}
            >▶ PLAY PROMO</motion.button>

            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.2em', position: 'relative', zIndex: 10 }}>
              25-SECOND CINEMATIC REVEAL
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BEAT 1 — 0–3s  COLD OPEN  Dark. One card. Logo ignites.
        ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {started && b1 && (
            <motion.div key="b1"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.8 } }}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {/* Deep space bg */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at center, #08020f 0%, #000000 100%)',
              }} />

              {/* Single dramatic card flip — center */}
              {t > 0.3 && (
                <motion.div style={{ position: 'relative', zIndex: 10 }}>
                  <PromoCard rank="A" suit="♠" delay={0} size="lg" glow style={{ position: 'relative', left: 'auto', top: 'auto' }} />
                  {/* Glow halo behind card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 0.6, 0.3], scale: [0.5, 2, 1.5] }}
                    transition={{ delay: 0.4, duration: 1.2 }}
                    style={{
                      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                      width: 200, height: 200, borderRadius: '50%',
                      background: 'radial-gradient(ellipse, rgba(167,139,250,0.5) 0%, transparent 70%)',
                      zIndex: -1,
                    }}
                  />
                </motion.div>
              )}

              {/* Logo burns in from top */}
              {t > 1.2 && (
                <motion.div
                  initial={{ opacity: 0, y: -30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, type: 'spring' }}
                  style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', zIndex: 20 }}
                >
                  <RapidFireLogo size="lg" showTexas={false} />
                </motion.div>
              )}

              {/* Tagline */}
              {t > 2.0 && (
                <motion.div
                  initial={{ opacity: 0, letterSpacing: '0.5em' }}
                  animate={{ opacity: 1, letterSpacing: '0.25em' }}
                  transition={{ duration: 0.8 }}
                  style={{
                    position: 'absolute', bottom: 50,
                    fontFamily: 'Oswald, sans-serif', fontSize: 14,
                    color: 'rgba(250,204,21,0.7)',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                  }}
                >One Card Away From Everything.</motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════
            BEAT 2 — 3–7s  10 HANDS SLAM DOWN
        ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {started && b2 && (
            <motion.div key="b2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
              style={{ position: 'absolute', inset: 0 }}
            >
              {/* Felt table */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at center, #0f2d1a 0%, #040f08 100%)',
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.008) 6px, rgba(255,255,255,0.008) 12px)',
              }} />

              {/* Section header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                  fontFamily: 'Oswald, sans-serif', fontSize: 13, letterSpacing: '0.3em',
                  color: 'rgba(250,204,21,0.5)', whiteSpace: 'nowrap',
                }}
              >10 FIXED HANDS — EVERY DEAL</motion.div>

              {/* 10 hands — 2 rows of 5 */}
              {[
                { r:'A', s:'♦', label:'H1' }, { r:'K', s:'♠', label:'H2' }, { r:'Q', s:'♣', label:'H3' },
                { r:'Q', s:'♠', label:'H4' }, { r:'J', s:'♣', label:'H5' },
              ].map((c, i) => (
                <div key={i} style={{ position: 'absolute', left: 80 + i * 140, top: 65 }}>
                  <PromoCard rank={c.r} suit={c.s} delay={(t - 3) > 0 ? Math.max(0, i * 0.12) : 99} size="md" glow={i === 0} />
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}
                    transition={{ delay: 0.5 + i * 0.12 }}
                    style={{ textAlign: 'center', marginTop: 72, fontSize: 10, fontFamily: 'Oswald, sans-serif', color: 'rgba(250,204,21,0.5)', letterSpacing: '0.1em' }}
                  >{c.label}</motion.div>
                </div>
              ))}
              {[
                { r:'8', s:'♦', label:'H6' }, { r:'7', s:'♦', label:'H7' }, { r:'4', s:'♥', label:'H8' },
                { r:'3', s:'♣', label:'H9' }, { r:'A', s:'♥', label:'H10'},
              ].map((c, i) => (
                <div key={i} style={{ position: 'absolute', left: 80 + i * 140, top: 215 }}>
                  <PromoCard rank={c.r} suit={c.s} delay={(t - 3) > 0 ? Math.max(0, 0.6 + i * 0.12) : 99} size="md" glow={i === 2} />
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}
                    transition={{ delay: 1.1 + i * 0.12 }}
                    style={{ textAlign: 'center', marginTop: 72, fontSize: 10, fontFamily: 'Oswald, sans-serif', color: 'rgba(250,204,21,0.5)', letterSpacing: '0.1em' }}
                  >{c.label}</motion.div>
                </div>
              ))}

              {/* Payout callout */}
              {t > 5.5 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
                    fontFamily: 'Oswald, sans-serif', fontSize: 15, letterSpacing: '0.15em',
                    color: '#facc15',
                    textShadow: '0 0 20px rgba(250,204,21,0.6)',
                    whiteSpace: 'nowrap',
                  }}
                >PAYOUTS UP TO 20:1 — EVERY SINGLE ROUND</motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════
            BEAT 3 — 7–12s  COMMUNITY CARDS + CHIPS CASCADE
        ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {started && b3 && (
            <motion.div key="b3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 70%, #0d2218 0%, #030b05 100%)',
              }} />

              {/* Table rail */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 20,
                background: 'linear-gradient(180deg, #7c3404 0%, #431c02 100%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
              }} />

              {/* Dealer label */}
              <div style={{
                position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
                fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: '0.25em',
                color: 'rgba(250,204,21,0.4)',
              }}>— COMMUNITY CARDS —</div>

              {/* 5 community cards dealing in */}
              {[
                { r:'A', s:'♠' }, { r:'K', s:'♥' }, { r:'Q', s:'♦' }, { r:'J', s:'♣' }, { r:'10', s:'♦' },
              ].map((c, i) => (
                <PromoCard key={i} rank={c.r} suit={c.s}
                  delay={i * 0.4}
                  size="lg"
                  glow={i === 4}
                  style={{ left: 130 + i * 120, top: 55 }}
                />
              ))}

              {/* Card labels */}
              {['FLOP', 'FLOP', 'FLOP', 'TURN', 'RIVER'].map((lbl, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0 }} animate={{ opacity: 0.4 }}
                  transition={{ delay: 0.3 + i * 0.4 }}
                  style={{
                    position: 'absolute', top: 176, left: 130 + i * 120 + 30,
                    fontFamily: 'Oswald, sans-serif', fontSize: 9, letterSpacing: '0.2em',
                    color: '#facc15', transform: 'translateX(-50%)',
                  }}
                >{lbl}</motion.div>
              ))}

              {/* Chips cascade */}
              <Chip color="#facc15" label="$50" x={90}  y={240} delay={0.5} />
              <Chip color="#ef4444" label="$25" x={580} y={250} delay={0.8} />
              <Chip color="#3b82f6" label="$10" x={340} y={260} delay={1.1} />
              <Chip color="#22c55e" label="$50" x={200} y={270} delay={1.4} />
              <Chip color="#a855f7" label="$25" x={480} y={248} delay={1.7} />
              <Chip color="#facc15" label="$10" x={130} y={290} delay={2.0} size={34} />
              <Chip color="#ef4444" label="$50" x={630} y={270} delay={2.2} size={34} />

              {/* Royal Flush building label */}
              {t > 10.5 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.7, 1] }}
                  transition={{ duration: 0.6 }}
                  style={{
                    position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                    fontFamily: 'Oswald, sans-serif', fontSize: 18, letterSpacing: '0.15em',
                    color: '#a78bfa',
                    textShadow: '0 0 20px rgba(167,139,250,0.9), 0 0 40px rgba(167,139,250,0.5)',
                    whiteSpace: 'nowrap',
                  }}
                >ROYAL FLUSH BUILDING... 👑</motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════
            BEAT 4 — 12–16s  JACKPOT EXPLOSION
        ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {started && b4 && (
            <motion.div key="b4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.6 } }}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}
            >
              {/* Dark burst bg */}
              <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 3, 2], opacity: [0, 0.4, 0.15] }}
                transition={{ duration: 1.5 }}
                style={{
                  position: 'absolute', width: 400, height: 400, borderRadius: '50%',
                  background: 'radial-gradient(ellipse, #a78bfa 0%, transparent 70%)',
                }}
              />

              {/* Particle burst */}
              {t >= 12 && t <= 14 && (
                <ParticleBurst count={36} colors={['#facc15', '#f97316', '#a78bfa', '#ffffff', '#22c55e']} />
              )}

              {/* ROYAL FLUSH text */}
              <motion.div
                initial={{ scale: 0, rotate: -5 }}
                animate={{ scale: [0, 1.2, 1], rotate: [0, 3, -1, 0] }}
                transition={{ duration: 0.7, type: 'spring' }}
                style={{
                  fontFamily: 'Oswald, sans-serif', fontSize: 48, fontWeight: 900,
                  color: '#a78bfa',
                  textShadow: '0 0 30px rgba(167,139,250,1), 0 0 60px rgba(167,139,250,0.6), 0 0 100px rgba(167,139,250,0.3)',
                  letterSpacing: '0.1em',
                  position: 'relative', zIndex: 10,
                }}
              >👑 ROYAL FLUSH 👑</motion.div>

              {/* Cards in a fan */}
              <div style={{ position: 'relative', width: 360, height: 100, zIndex: 10 }}>
                {[
                  { r:'A', s:'♠', rot:-20, tx:-120 },
                  { r:'K', s:'♠', rot:-10, tx:-60  },
                  { r:'Q', s:'♠', rot:0,   tx:0    },
                  { r:'J', s:'♠', rot:10,  tx:60   },
                  { r:'10',s:'♠', rot:20,  tx:120  },
                ].map((c, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 40, rotate: 0 }}
                    animate={{ opacity: 1, y: 0, rotate: c.rot, x: c.tx }}
                    transition={{ delay: i * 0.1, duration: 0.5, type: 'spring' }}
                    style={{ position: 'absolute', top: 0, left: '50%', marginLeft: -30, transformOrigin: 'bottom center' }}
                  >
                    <PromoCard rank={c.r} suit={c.s} delay={0} size="md" glow style={{ position: 'relative', left: 'auto', top: 'auto' }} />
                  </motion.div>
                ))}
              </div>

              {/* Jackpot counter */}
              {t > 13 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    fontFamily: 'Oswald, sans-serif', fontSize: 36, fontWeight: 900,
                    color: '#facc15',
                    textShadow: '0 0 20px rgba(250,204,21,0.9)',
                    position: 'relative', zIndex: 10,
                  }}
                >
                  JACKPOT: <JackpotCounter target={10000} duration={2.5} />
                </motion.div>
              )}

              {/* Pulsing ring */}
              <motion.div
                animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  position: 'absolute', width: 200, height: 200, borderRadius: '50%',
                  border: '2px solid rgba(167,139,250,0.6)',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════
            BEAT 5 — 16–21s  FEATURE SHOWCASE
        ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {started && b5 && (
            <motion.div key="b5"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.6 } }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 30% 50%, #0d0820 0%, #000000 100%)',
              }} />

              {/* Left: feature list */}
              <div style={{ position: 'absolute', left: 50, top: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <NeonText color="rgba(250,204,21,0.5)" fontSize={11} style={{ letterSpacing: '0.3em' }} delay={0.1}>THE GAME</NeonText>
                {[
                  { icon: '🃏', text: '10 Fixed Hands', sub: 'Up to 20:1 payout', delay: 0.2 },
                  { icon: '♠', text: 'Hand Rank Board', sub: 'Royal Flush jackpot', delay: 0.35 },
                  { icon: '🔴', text: 'Color Board', sub: 'Bet Red or Black', delay: 0.5 },
                  { icon: '⚡', text: 'Low / High', sub: 'River card side bet', delay: 0.65 },
                ].map((item, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: item.delay, duration: 0.4 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(250,204,21,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18,
                    }}>{item.icon}</div>
                    <div>
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>{item.text}</div>
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 11, color: 'rgba(250,204,21,0.5)', letterSpacing: '0.1em' }}>{item.sub}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Right: sample board visual */}
              <motion.div
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                style={{
                  position: 'absolute', right: 40, top: 30,
                  width: 320,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(250,204,21,0.15)',
                  borderRadius: 12, padding: 20,
                }}
              >
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: '0.25em', color: 'rgba(250,204,21,0.4)', marginBottom: 14 }}>COLOR BOARD</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { k:'5R', label:'5 Red',   pay:'45:1', c:'#ef4444', delay:0.5 },
                    { k:'5B', label:'5 Black',  pay:'45:1', c:'#94a3b8', delay:0.55 },
                    { k:'4R', label:'4 Red',   pay:'4.75:1', c:'#ef4444', delay:0.65 },
                    { k:'4B', label:'4 Black',  pay:'4.75:1', c:'#94a3b8', delay:0.70 },
                    { k:'3R', label:'3 Red',   pay:'0.90:1', c:'#ef4444', delay:0.80 },
                    { k:'3B', label:'3 Black',  pay:'0.90:1', c:'#94a3b8', delay:0.85 },
                  ].map(opt => (
                    <motion.div key={opt.k}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: opt.delay }}
                      style={{
                        background: `${opt.c}18`,
                        border: `1px solid ${opt.c}44`,
                        borderRadius: 6, padding: '6px 10px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                    >
                      <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 12, color: opt.c }}>{opt.label}</span>
                      <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 11, color: 'rgba(250,204,21,0.7)' }}>{opt.pay}</span>
                    </motion.div>
                  ))}
                </div>

                <div style={{ marginTop: 14, fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: '0.25em', color: 'rgba(250,204,21,0.4)', marginBottom: 10 }}>LOW / HIGH (RIVER)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'LOW (2–7)', c: '#60a5fa' },
                    { label: 'HIGH (8–A)', c: '#f97316' },
                  ].map(opt => (
                    <motion.div key={opt.label}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: 1.0 }}
                      style={{
                        background: `${opt.c}15`, border: `1px solid ${opt.c}40`,
                        borderRadius: 6, padding: '6px 10px', textAlign: 'center',
                      }}
                    >
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 12, color: opt.c }}>{opt.label}</div>
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 11, color: 'rgba(250,204,21,0.6)' }}>0.93:1</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Bottom stat bar */}
              {t > 19 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    position: 'absolute', bottom: 16, left: 0, right: 0,
                    display: 'flex', justifyContent: 'center', gap: 40,
                  }}
                >
                  {[
                    { val: '10', label: 'FIXED HANDS' },
                    { val: '4', label: 'BET CATEGORIES' },
                    { val: '96.5%', label: 'RTP' },
                    { val: '$10K', label: 'JACKPOT SEED' },
                  ].map((s, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      style={{ textAlign: 'center' }}
                    >
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, fontWeight: 900, color: '#facc15', textShadow: '0 0 14px rgba(250,204,21,0.6)' }}>{s.val}</div>
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════
            BEAT 6 — 21–25s  LOGO FINALE + CTA
        ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {started && b6 && (
            <motion.div key="b6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}
            >
              {/* Background */}
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, #0d0520 0%, #000000 100%)' }} />

              {/* Pulsing ring */}
              <motion.div
                animate={{ scale: [0.8, 1.6], opacity: [0.3, 0] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{
                  position: 'absolute', width: 500, height: 280, borderRadius: '50%',
                  border: '1px solid rgba(250,204,21,0.3)',
                }}
              />

              {/* Confetti rain */}
              {Array.from({ length: 40 }, (_, i) => {
                const colors = ['#facc15','#f97316','#ef4444','#a78bfa','#22c55e','#60a5fa','#fff'];
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: -10, x: Math.random() * 860 }}
                    animate={{ opacity: [0, 1, 1, 0], y: 500, rotate: Math.random() * 720 }}
                    transition={{ delay: Math.random() * 2, duration: 2.5 + Math.random(), ease: 'linear', repeat: Infinity }}
                    style={{
                      position: 'absolute', top: 0,
                      width: 6 + Math.random() * 6, height: 8 + Math.random() * 8,
                      background: colors[i % colors.length],
                      borderRadius: Math.random() > 0.5 ? '50%' : 1,
                    }}
                  />
                );
              })}

              {/* BIG LOGO */}
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.9, type: 'spring', stiffness: 90, damping: 12 }}
                style={{ position: 'relative', zIndex: 10 }}
              >
                <RapidFireLogo size="xl" showTexas />
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                style={{
                  fontFamily: 'Oswald, sans-serif', fontSize: 18, fontWeight: 700,
                  color: 'rgba(250,204,21,0.8)',
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  position: 'relative', zIndex: 10,
                }}
              >Ask Your Dealer to Play Today</motion.div>

              {/* Divider dots */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 10 }}
              >
                {['♠','♥','♦','♣'].map((s, i) => (
                  <span key={i} style={{ fontSize: 18, color: SUIT_NEON[s].color, textShadow: `0 0 12px ${SUIT_NEON[s].glow}` }}>{s}</span>
                ))}
              </motion.div>

              {/* Bottom legal line */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 1.2 }}
                style={{
                  position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center',
                  fontFamily: 'Oswald, sans-serif', fontSize: 9, letterSpacing: '0.15em',
                  color: 'rgba(255,255,255,0.3)',
                }}
              >RAPID FIRE TEXAS 10 — GAME RULES APPLY — PLAY RESPONSIBLY</motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Progress bar ── */}
        {started && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.06)', zIndex: 50 }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #f97316, #facc15)', width: `${progress * 100}%`, transition: 'width 0.1s linear' }} />
          </div>
        )}

        {/* ── Beat label ── */}
        {started && (
          <div style={{
            position: 'absolute', top: 8, right: 10, zIndex: 50,
            fontFamily: 'Oswald, sans-serif', fontSize: 10, letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.2)',
          }}>
            {b1 && 'COLD OPEN'}
            {b2 && '10 HANDS'}
            {b3 && 'COMMUNITY CARDS'}
            {b4 && 'JACKPOT'}
            {b5 && 'FEATURES'}
            {b6 && 'FINALE'}
            {'  '}{t.toFixed(1)}s
          </div>
        )}
      </div>

      {/* Controls below screen */}
      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        {done && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleReset}
            style={{
              padding: '10px 32px',
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid rgba(250,204,21,0.4)',
              color: 'rgba(250,204,21,0.8)',
              fontSize: 14, fontWeight: 700,
              fontFamily: 'Oswald, sans-serif',
              letterSpacing: '0.15em',
              cursor: 'pointer',
            }}
          >↺ REPLAY</motion.button>
        )}
        {running && (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: '0.1em' }}>
            {t.toFixed(1)}s / 25s
          </div>
        )}
      </div>
    </div>
  );
}