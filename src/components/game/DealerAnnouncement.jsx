import { motion, AnimatePresence } from 'framer-motion';

export default function DealerAnnouncement({ message, phase }) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center flex items-center justify-center h-full"
        >
          <div className="flex flex-col items-center justify-center">
            <p
              className="text-sm font-bold leading-relaxed max-w-2xl italic"
              style={{
                fontFamily: 'Oswald, sans-serif',
                transform: 'skewX(-8deg)',
                background: phase === 'winner' 
                  ? 'linear-gradient(90deg, #fef08a 0%, #f97316 100%)'
                  : phase === 'lowHighBetting'
                  ? 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)'
                  : 'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}