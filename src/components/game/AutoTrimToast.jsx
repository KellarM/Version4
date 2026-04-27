import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AutoTrimToast({ isVisible, onHide }) {
  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(onHide, 2200);
    return () => clearTimeout(t);
  }, [isVisible, onHide]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 pointer-events-none z-50">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2 bg-gray-900/95 border border-amber-600/50 rounded-xl px-4 py-2.5 shadow-xl backdrop-blur-sm"
          >
            <span className="text-amber-400 text-sm font-medium">Side bets adjusted to match foundation stake.</span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}