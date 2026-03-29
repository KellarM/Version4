import { motion, AnimatePresence } from 'framer-motion';

export default function InsufficientFundsAlert({ isVisible }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="border-2 border-red-400 rounded-2xl p-8 shadow-2xl min-w-[600px] backdrop-blur-sm text-center pointer-events-auto"
          >
            <div className="text-5xl mb-4">⚠️</div>
            <div className="text-3xl font-black text-gray-400 mb-2" style={{ textShadow: '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 0 1px 0 white, 1px 0 0 white, 0 -1px 0 white, -1px 0 0 white' }}>Insufficient Funds</div>
            <div className="text-2xl font-black text-gray-500" style={{ textShadow: '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 0 1px 0 white, 1px 0 0 white, 0 -1px 0 white, -1px 0 0 white' }}>Unable to wager</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}