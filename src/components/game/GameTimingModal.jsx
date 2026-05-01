import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, X } from 'lucide-react';

const DEFAULT_TIMING = {
  bettingClose: 12,
  flopReveal: 8,
  turnReveal: 2,
  riverBetting: 12,
  riverReveal: 5,
  endOfRound: 10,
};

const TIMING_FIELDS = [
  {
    key: 'bettingClose',
    label: 'Betting Close (Open-Table)',
    description: 'Countdown from first hand bet. Clock visible to player.',
    hasCountdown: true,
  },
  {
    key: 'flopReveal',
    label: 'Flop Reveal + Announce',
    description: 'Background delay before moving to Turn.',
    hasCountdown: false,
  },
  {
    key: 'turnReveal',
    label: 'Turn Reveal + Announce',
    description: 'Background delay before River betting opens.',
    hasCountdown: false,
  },
  {
    key: 'riverBetting',
    label: 'Optional River Bets Window',
    description: 'Countdown for Low/High bet window. Clock visible to player.',
    hasCountdown: true,
  },
  {
    key: 'riverReveal',
    label: 'River Reveal + Results',
    description: 'Background delay to reveal river card and announce results.',
    hasCountdown: false,
  },
  {
    key: 'endOfRound',
    label: 'End of Round Display + Reset',
    description: 'Time before board clears and new round begins.',
    hasCountdown: false,
  },
];

const STORAGE_KEY = 'rapidFireGameTiming';

export function useGameTiming() {
  const [timing, setTiming] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_TIMING, ...JSON.parse(saved) } : DEFAULT_TIMING;
    } catch {
      return DEFAULT_TIMING;
    }
  });

  const saveTiming = (newTiming) => {
    setTiming(newTiming);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTiming));
  };

  return { timing, saveTiming };
}

export default function GameTimingModal({ isOpen, onClose }) {
  const [values, setValues] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_TIMING, ...JSON.parse(saved) } : DEFAULT_TIMING;
    } catch {
      return DEFAULT_TIMING;
    }
  });

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setValues({ ...DEFAULT_TIMING, ...JSON.parse(saved) });
      } catch {}
    }
  }, [isOpen]);

  const handleChange = (key, val) => {
    const num = Math.max(1, Math.min(120, Number(val) || 1));
    setValues(prev => ({ ...prev, [key]: num }));
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    // Force parent component to reload timing from localStorage
    window.dispatchEvent(new CustomEvent('gameTiming:updated', { detail: values }));
    onClose();
  };

  const handleReset = () => {
    setValues(DEFAULT_TIMING);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-md rounded-2xl border border-yellow-700/50 shadow-2xl shadow-black/80 overflow-hidden"
              style={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #1a1205 100%)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-yellow-700/30"
                style={{ background: 'rgba(0,0,0,0.4)' }}>
                <div className="flex items-center gap-2.5">
                  <Timer className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-300 font-black text-base tracking-wide"
                    style={{ fontFamily: 'Oswald, sans-serif' }}>
                    GAME TIMING
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-white transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Inputs */}
              <div className="px-5 py-4 space-y-3">
                {TIMING_FIELDS.map((field, idx) => (
                  <div key={field.key} className="flex items-start gap-3">
                    {/* Step number */}
                    <div className="flex-shrink-0 w-6 h-6 rounded-full border border-yellow-700/50 bg-yellow-900/20 flex items-center justify-center mt-0.5">
                      <span className="text-yellow-400 text-[10px] font-bold">{idx + 1}</span>
                    </div>

                    {/* Label + description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-semibold">{field.label}</span>
                        {field.hasCountdown && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-400 border border-yellow-700/40 font-bold flex-shrink-0">
                            ⏱ CLOCK
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-[11px] mt-0.5">{field.description}</p>
                    </div>

                    {/* Input */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={values[field.key]}
                        onChange={e => handleChange(field.key, e.target.value)}
                        className="w-14 text-center text-sm font-bold rounded-lg border border-yellow-700/50 bg-black/50 text-yellow-300 py-1.5 focus:outline-none focus:border-yellow-400 transition-colors"
                      />
                      <span className="text-gray-500 text-xs">sec</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-yellow-700/30"
                style={{ background: 'rgba(0,0,0,0.3)' }}>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg border border-gray-700/60 bg-gray-800/40 text-gray-400 text-xs font-semibold hover:bg-gray-700/40 hover:text-white transition-all"
                >
                  Reset Defaults
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-lg border border-gray-700/60 bg-gray-800/40 text-gray-400 text-xs font-semibold hover:bg-gray-700/40 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-1.5 rounded-lg border-2 border-yellow-500 bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-black transition-all"
                  >
                    Save Timing
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}