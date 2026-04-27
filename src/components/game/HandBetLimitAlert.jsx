import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HandBetLimitAlert({ isOpen, onClose }) {
  const [countdown, setCountdown] = useState(2);
  const [dismissing, setDismissing] = useState(false);
  const consumedRef = useRef(false);

  const dismiss = () => {
    if (dismissing || !isOpen) return;
    setDismissing(true);
    setTimeout(() => {
      onClose();
      setDismissing(false);
      consumedRef.current = false;
    }, 100);
  };

  useEffect(() => {
    if (!isOpen) {
      setCountdown(2);
      setDismissing(false);
      consumedRef.current = false;
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          dismiss();
          return 2;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (!consumedRef.current) {
        consumedRef.current = true;
        e.stopPropagation();
        dismiss();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, { capture: true });
    return () => document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
  }, [isOpen, dismissing]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: dismissing ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dismissing ? 0.1 : 0.25 }}
            className="fixed inset-0 z-30 bg-black/60"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -50 }}
            animate={{ opacity: dismissing ? 0 : 1, scale: dismissing ? 0.9 : 1, y: dismissing ? -30 : 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            transition={{ duration: dismissing ? 0.1 : 0.3 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-b from-red-600 to-red-700 border-2 border-red-400 rounded-2xl px-8 py-6 shadow-2xl max-w-sm pointer-events-auto">
              <div className="text-center">
                <div className="text-white font-black text-2xl mb-2">⚠️</div>
                <h2 className="text-white font-bold text-xl mb-4">Hand Betting Limit</h2>
                <p className="text-red-100 text-lg font-semibold mb-6">
                  Hand betting is limited to 4 Hands
                </p>
                {!dismissing && (
                  <div className="text-red-100 text-sm">
                    Closing in <span className="font-black text-white text-lg">{countdown}</span> seconds
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}