import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HandBetLimitAlert({ isOpen, onClose }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onClose();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
          />

          {/* Alert Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-auto"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-b from-red-600 to-red-700 border-2 border-red-400 rounded-2xl px-8 py-6 shadow-2xl max-w-sm">
              <div className="text-center">
                <div className="text-white font-black text-2xl mb-2">⚠️</div>
                <h2 className="text-white font-bold text-xl mb-4">Hand Betting Limit</h2>
                <p className="text-red-100 text-lg font-semibold mb-6">
                  Hand betting is limited to 4 Hands
                </p>
                <div className="text-red-100 text-sm">
                  Closing in <span className="font-black text-white text-lg">{countdown}</span> seconds
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}