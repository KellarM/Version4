import { motion } from 'framer-motion';

export default function CountdownClock({ timeRemaining, isActive, phase }) {
  if (!isActive || !timeRemaining) return null;

  const displayTime = Math.ceil(timeRemaining);
  const progress = Math.max(0, Math.min(100, (timeRemaining * 100) / (timeRemaining + 1)));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed bottom-32 right-8 z-40"
    >
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Outer circle */}
        <svg className="absolute inset-0 w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(100,100,100,0.2)" strokeWidth="2" />
          <motion.circle
            cx="48"
            cy="48"
            r="44"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
            style={{ filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.6))' }}
          />
        </svg>

        {/* Time display */}
        <div className="text-center relative z-10">
          <div className="text-4xl font-black text-yellow-300" style={{ textShadow: '0 0 12px rgba(251,191,36,0.8)' }}>
            {displayTime}
          </div>
          <div className="text-xs text-yellow-400/70 font-semibold tracking-wider uppercase">
            {phase === 'betting' ? 'Betting' : phase === 'lowHighBetting' ? 'River' : 'Deal'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}