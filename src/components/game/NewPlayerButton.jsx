import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NewPlayerButton({ playerCount, onAddPlayer, gamePhase }) {
  const [showSlots, setShowSlots] = useState(false);
  const availableSlots = 5 - playerCount;
  const canAddPlayer = availableSlots > 0 && gamePhase === 'betting';
  const isHidden = playerCount === 5;

  const handleSelectSlot = (playerNum) => {
    onAddPlayer(playerNum);
    setShowSlots(false);
  };

  if (isHidden) return null;

  return (
    <div className="flex items-center gap-1">
      <AnimatePresence mode="wait">
        {!showSlots ? (
          <motion.button
            key="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSlots(true)}
            disabled={!canAddPlayer}
            whileTap={canAddPlayer ? { scale: 0.97 } : {}}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all
              ${canAddPlayer
                ? 'border-2 border-green-500 bg-green-900/30 text-green-300 hover:bg-green-900/50 cursor-pointer'
                : 'border-2 border-gray-600 bg-gray-900/20 text-gray-500 cursor-not-allowed'
              }`}
          >
            + New Player
          </motion.button>
        ) : (
          <motion.div
            key="slots"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-1"
          >
            {Array.from({ length: availableSlots }, (_, i) => i + 1).map(num => (
              <motion.button
                key={num}
                onClick={() => handleSelectSlot(playerCount + num)}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 rounded-lg border-2 border-green-400 bg-green-900/50 text-green-300 text-xs font-bold hover:bg-green-800 transition-all"
              >
                {playerCount + num}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}