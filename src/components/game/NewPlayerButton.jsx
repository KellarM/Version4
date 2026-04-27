import { motion } from 'framer-motion';

export default function NewPlayerButton({ playerCount, onShowPlayerSelector, gamePhase }) {
  const atMax = playerCount >= 10;
  const canAdd = !atMax && gamePhase === 'betting';

  if (atMax) return null;

  return (
    <motion.button
      onClick={canAdd ? onShowPlayerSelector : undefined}
      disabled={!canAdd}
      whileTap={canAdd ? { scale: 0.97 } : {}}
      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all
        ${canAdd
          ? 'border-2 border-green-500 bg-green-900/30 text-green-300 hover:bg-green-900/50 cursor-pointer'
          : 'border-2 border-gray-600 bg-gray-900/20 text-gray-500 cursor-not-allowed'
        }`}
    >
      + New Player
    </motion.button>
  );
}