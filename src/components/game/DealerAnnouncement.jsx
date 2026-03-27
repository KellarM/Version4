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
          <div className="flex flex-col items-center gap-2">
            <span
              className="font-black italic text-2xl leading-none"
              style={{
                fontFamily: 'Oswald, sans-serif',
                transform: 'skewX(-12deg)',
                background: 'linear-gradient(180deg, #fef08a 0%, #f97316 50%, #dc2626 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 8px rgba(251,146,60,0.6))',
                letterSpacing: '-0.02em',
              }}
            >
              🎙️ DEALER
            </span>
            <p className={`text-sm font-semibold leading-relaxed max-w-2xl
              ${phase === 'winner' ? 'text-yellow-300' :
                phase === 'lowHighBetting' ? 'text-blue-300' :
                'text-green-300'}`}
            >
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}