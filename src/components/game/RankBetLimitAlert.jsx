import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RankBetLimitAlert({ isOpen, onClose, currentHandBets, alertType = 'limit' }) {
  // alertType: 'limit' | 'closed' | 'onepair'
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

  const isClosed = alertType === 'closed';
  const isOnePair = alertType === 'onepair';
  const bgGradient = isClosed ? 'from-red-600 to-red-700' : isOnePair ? 'from-purple-600 to-purple-700' : 'from-orange-600 to-orange-700';
  const borderColor = isClosed ? 'border-red-400' : isOnePair ? 'border-purple-400' : 'border-orange-400';
  const textColor = isClosed ? 'text-red-100' : isOnePair ? 'text-purple-100' : 'text-orange-100';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60"
          />

          {/* Alert Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 flex items-center justify-center z-50"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className={`bg-gradient-to-b ${bgGradient} border-2 ${borderColor} rounded-2xl px-8 py-6 shadow-2xl max-w-sm`}>
              <div className="text-center">
                <div className="text-white font-black text-2xl mb-2">⚠️</div>
                <h2 className="text-white font-bold text-xl mb-4">Rank Betting Limit</h2>
                {isClosed ? (
                  <>
                    <p className={`${textColor} text-lg font-semibold mb-6`}>
                      Rank Betting Is Closed
                    </p>
                    <p className={`${textColor} text-sm font-semibold mb-4`}>
                      Due To Exceeding More Than 2 Card Hand Bets
                    </p>
                  </>
                ) : isOnePair ? (
                  <>
                    <p className={`${textColor} text-lg font-semibold mb-6`}>
                      One Pair Must Be Bet Exclusively
                    </p>
                    <p className={`${textColor} text-sm font-semibold mb-4`}>
                      One Pair Cannot Be Combined With Any Other Rank Bet
                    </p>
                  </>
                ) : (
                  <>
                    <p className={`${textColor} text-lg font-semibold mb-6`}>
                      Rank Betting Is Limited To 2 Bets
                    </p>
                    <p className={`${textColor} text-sm font-semibold mb-4`}>
                      When Wagering On More Than 1 Or Less Than 3 Carded Hands
                    </p>
                  </>
                )}
                <div className={textColor + ' text-sm'}>
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