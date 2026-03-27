import { motion, AnimatePresence } from 'framer-motion';

export default function DealerAnnouncement({ message, phase }) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={`text-center px-3 py-1.5 rounded-lg border text-xs font-semibold flex-shrink-0 truncate
            ${phase === 'winner' ? 'border-yellow-400 bg-yellow-900/30 text-yellow-300' :
              phase === 'lowHighBetting' ? 'border-blue-500 bg-blue-900/20 text-blue-300' :
              'border-green-600/50 bg-green-900/20 text-green-300'}`}
        >
          🎙️ {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}