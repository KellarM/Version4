import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InsufficientFundsAlert({ isVisible, onClose }) {
  const [dismissing, setDismissing] = useState(false);
  const consumedRef = useRef(false);

  const dismiss = () => {
    if (dismissing || !isVisible) return;
    setDismissing(true);
    setTimeout(() => {
      onClose?.();
      setDismissing(false);
      consumedRef.current = false;
    }, 100);
  };

  useEffect(() => {
    if (!isVisible) {
      setDismissing(false);
      consumedRef.current = false;
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const handlePointerDown = (e) => {
      if (!consumedRef.current) {
        consumedRef.current = true;
        e.stopPropagation();
        dismiss();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, { capture: true });
    return () => document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
  }, [isVisible, dismissing]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: dismissing ? 0 : 1, scale: dismissing ? 0.9 : 1, y: dismissing ? 10 : 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: dismissing ? 0.1 : 0.2 }}
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