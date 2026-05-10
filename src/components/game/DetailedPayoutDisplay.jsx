import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { FIXED_HANDS, SUITS } from '@/lib/gameEngine';

// ─── helpers ────────────────────────────────────────────────────────────────

const PLAYER_COLORS = [
  { accent: '#eab308' },  // P1 yellow
  { accent: '#3b82f6' },  // P2 blue
  { accent: '#ec4899' },  // P3 pink
  { accent: '#22c55e' },  // P4 green
  { accent: '#f97316' },  // P5 orange
  { accent: '#a855f7' },  // P6 purple
  { accent: '#06b6d4' },  // P7 cyan
  { accent: '#f43f5e' },  // P8 rose
  { accent: '#84cc16' },  // P9 lime
  { accent: '#14b8a6' },  // P10 teal
];

const gold = {
  color: 'transparent',
  background: 'linear-gradient(180deg,#ffe566 0%,#c9960a 45%,#ffe566 80%,#a07005 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.8))',
};

const blackOutline = {
  textShadow: '-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000',
};

function getCardLabel(label) {
  const m = label.match(/Hand (\d+)/);
  if (!m) return label;
  const hand = FIXED_HANDS.find(h => h.id === parseInt(m[1]));
  if (!hand) return label;
  return `${hand.cards[0].rank}${SUITS[hand.cards[0].suit]} / ${hand.cards[1].rank}${SUITS[hand.cards[1].suit]}`;
}

// ─── Quadrant ────────────────────────────────────────────────────────────────
// A fixed-height cell that shows wins for one board type, or a "no bet" state.

function Quadrant({ title, wins, accentColor }) {
  const hasBet  = wins.length > 0;

  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.35)',
        border: `1.5px solid ${hasBet ? accentColor : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '10px',
        padding: '6px 8px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: '0.6rem',
          fontFamily: 'Oswald, sans-serif',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: hasBet ? accentColor : 'rgba(255,255,255,0.25)',
          marginBottom: '4px',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </div>

      {!hasBet ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>No bet</span>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
          {wins.map((win, idx) => {
            const profit = win.payout - win.bet;
            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  padding: '3px 6px',
                  flex: '1 1 0',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                }}
              >
                {/* Row 1: label + bet/odds */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    color: '#fff',
                    ...blackOutline,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '50%',
                  }}>
                    {win.boardType === 'card' ? getCardLabel(win.label) : win.label}
                  </span>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff', ...blackOutline, whiteSpace: 'nowrap' }}>
                      Bet: ${win.bet.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff', ...blackOutline, whiteSpace: 'nowrap' }}>
                      Odds: {win.odds}
                    </div>
                  </div>
                </div>
                {/* Row 2: payout calc */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#fde68a', whiteSpace: 'nowrap' }}>
                    ${profit.toFixed(2)} + ${win.bet.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 900, color: accentColor, whiteSpace: 'nowrap' }}>
                    = ${win.payout.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DetailedPayoutDisplay({ winInfo, playerCount = 1 }) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  useEffect(() => { setCurrentPlayerIndex(0); }, [winInfo]);

  if (!winInfo || !winInfo.playerPayouts) return null;

  const hasAnyWins = winInfo.playerPayouts.some(p => p.wins.length > 0);

  const getNextWinningPlayer = (startIdx) => {
    for (let i = startIdx; i < winInfo.playerPayouts.length; i++) {
      if (winInfo.playerPayouts[i]?.wins.length > 0) return i;
    }
    return -1;
  };

  const nextWinnerIdx = getNextWinningPlayer(currentPlayerIndex);

  const handleNext = () => {
    const nextIdx = getNextWinningPlayer(currentPlayerIndex + 1);
    setCurrentPlayerIndex(nextIdx !== -1 ? nextIdx : -1);
  };

  // ── No win modal ──
  if (!hasAnyWins) {
    return (
      <AnimatePresence>
        {currentPlayerIndex !== -1 && (
          // Full-screen dim backdrop
          <motion.div
            key="no-win-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(3px)' }}
            onClick={() => setCurrentPlayerIndex(-1)}
          >
            {/* Modal panel — same 500×420 footprint as the win modal */}
            <motion.div
              key="no-win"
              initial={{ opacity: 0, scale: 0.85, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '500px',
                maxWidth: '96vw',
                height: '420px',
                background: 'linear-gradient(135deg,rgba(10,4,4,0.99) 0%,rgba(40,8,8,0.99) 50%,rgba(10,4,4,0.99) 100%)',
                border: '2px solid #7f1d1d',
                borderRadius: '16px',
                boxShadow: '0 0 60px rgba(180,0,0,0.4), 0 0 120px rgba(0,0,0,0.9)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Red accent top bar */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:'linear-gradient(90deg,#7f1d1d,#ef4444,#7f1d1d)', flexShrink:0 }} />
              {/* Red accent bottom bar */}
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:4, background:'linear-gradient(90deg,#7f1d1d,#ef4444,#7f1d1d)', flexShrink:0 }} />

              {/* Animated close button */}
              <motion.button
                onClick={() => setCurrentPlayerIndex(-1)}
                animate={{ scale: [1, 1.15, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  background: '#eab308', border: '2px solid #fde68a',
                  borderRadius: '8px', padding: '6px', cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                <X className="w-5 h-5 text-black" strokeWidth={3} />
              </motion.button>

              {/* Corner flame accents */}
              <div style={{ position:'absolute', top:16, left:20, fontSize:'1.4rem', opacity:0.25, userSelect:'none' }}>🔥</div>
              <div style={{ position:'absolute', top:16, right:52, fontSize:'1.4rem', opacity:0.25, userSelect:'none' }}>🔥</div>
              <div style={{ position:'absolute', bottom:16, left:20, fontSize:'1.4rem', opacity:0.25, userSelect:'none' }}>🔥</div>
              <div style={{ position:'absolute', bottom:16, right:20, fontSize:'1.4rem', opacity:0.25, userSelect:'none' }}>🔥</div>

              {/* Logo */}
              <img
                src="https://media.base44.com/images/public/69f3a45ad82dff5b772d4de2/2667063a3_image.png"
                alt="Rapid Fire Texas Hold'em"
                style={{ width: 90, height: 'auto', marginBottom: 20, filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.5))' }}
              />

              {/* NO WIN headline */}
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontWeight: 900,
                  fontSize: '3rem',
                  letterSpacing: '0.06em',
                  color: '#ef4444',
                  textShadow: '0 0 30px rgba(239,68,68,0.8), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
                  lineHeight: 1,
                  marginBottom: 14,
                }}
              >
                NO WIN
              </motion.div>

              {/* Divider */}
              <div style={{ width: 200, height: 2, background: 'linear-gradient(90deg,transparent,#ef4444,transparent)', marginBottom: 14 }} />

              {/* Sub-message */}
              <div style={{
                fontFamily: 'Oswald, sans-serif',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.55)',
                textShadow: '-1px -1px 0 #000,1px 1px 0 #000',
              }}>
                Better Luck Next Round
              </div>

              {/* Total Wagered — so player knows what they lost */}
              {winInfo.playerPayouts?.[0]?.totalBet > 0 && (
                <div style={{ marginTop: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Amount Wagered
                  </div>
                  <div style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color: '#f87171',
                    textShadow: '-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000',
                  }}>
                    -${winInfo.playerPayouts[0].totalBet.toFixed(2)}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // ── Win modal ──
  return (
    <AnimatePresence>
      {hasAnyWins && nextWinnerIdx !== -1 && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
          {(() => {
            const pid     = nextWinnerIdx;
            const payout  = winInfo.playerPayouts[pid];
            const accent  = PLAYER_COLORS[pid % PLAYER_COLORS.length].accent;

            const cardWins  = payout.wins.filter(w => w.boardType === 'card');
            const colorWins = payout.wins.filter(w => w.boardType === 'color');
            const rankWins  = payout.wins.filter(w => w.boardType === 'rank');
            const riverWins = payout.wins.filter(w => w.boardType === 'river');

            const totalWin = payout.totalBet + payout.netWin;

            return (
              <motion.div
                key={`player-${pid}`}
                initial={{ opacity: 0, scale: 0.85, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="pointer-events-auto relative"
                style={{
                  width: '500px',
                  maxWidth: '96vw',
                  // Fixed height — never changes regardless of win count
                  height: '420px',
                  background: 'linear-gradient(135deg,rgba(60,20,5,0.98) 0%,rgba(25,8,2,0.99) 100%)',
                  border: `2px solid ${accent}`,
                  borderRadius: '16px',
                  boxShadow: `0 0 50px rgba(0,0,0,0.85), 0 0 20px ${accent}33`,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Accent top bar */}
                <div style={{ height: 3, background: accent, flexShrink: 0 }} />

                {/* Close button */}
                <motion.button
                  onClick={handleNext}
                  animate={{ scale: [1, 1.15, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  style={{
                    position: 'absolute', top: 10, right: 10, zIndex: 10,
                    background: '#eab308', border: '2px solid #fde68a',
                    borderRadius: '8px', padding: '5px', cursor: 'pointer',
                  }}
                  title="Next"
                >
                  <X className="w-5 h-5 text-black" strokeWidth={3} />
                </motion.button>

                {/* ── Row 1: Player header ── */}
                <div
                  style={{
                    flexShrink: 0,
                    textAlign: 'center',
                    padding: '8px 48px 6px',
                    borderBottom: `1px solid ${accent}44`,
                  }}
                >
                  {playerCount > 1 && (
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: accent, letterSpacing: '0.12em', fontFamily: 'Oswald,sans-serif' }}>
                      PLAYER {pid + 1}
                    </div>
                  )}
                  <div style={{ ...gold, fontSize: '1.3rem', fontWeight: 900, fontFamily: 'Oswald,sans-serif', lineHeight: 1 }}>
                    YOU WIN!
                  </div>
                  <div style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, ...blackOutline, letterSpacing: '0.08em' }}>
                    WINNER
                  </div>
                </div>

                {/* ── Row 2: 2×2 quadrant grid ── */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: '1fr 1fr',
                    gap: '6px',
                    padding: '6px',
                  }}
                >
                  <Quadrant title="Card Board Win"  wins={cardWins}  accentColor={accent} />
                  <Quadrant title="Color Board Win"  wins={colorWins} accentColor={accent} />
                  <Quadrant title="Rank Board Win"   wins={rankWins}  accentColor={accent} />
                  <Quadrant title="River Board Win"  wins={riverWins} accentColor={accent} />
                </div>

                {/* ── Row 3: Totals bar ── */}
                <div
                  style={{
                    flexShrink: 0,
                    borderTop: `1px solid ${accent}44`,
                    padding: '6px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(0,0,0,0.3)',
                  }}
                >
                  {[
                    { label: 'Total Wagered', value: `$${payout.totalBet.toFixed(2)}`, color: '#fff' },
                    { label: 'Net Win',       value: `$${payout.netWin.toFixed(2)}`,   color: payout.netWin >= 0 ? '#4ade80' : '#f87171' },
                    { label: 'Total Win',     value: `$${totalWin.toFixed(2)}`,         color: payout.netWin >= 0 ? '#4ade80' : '#f87171' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 900, color, fontFamily: 'Oswald,sans-serif', ...blackOutline, whiteSpace: 'nowrap' }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })()}
        </div>
      )}
    </AnimatePresence>
  );
}
