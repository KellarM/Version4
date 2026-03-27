import PlayingCard from './PlayingCard';
import { motion, AnimatePresence } from 'framer-motion';

export default function CommunityCards({ cards, phase }) {
  const slots = [0, 1, 2, 3, 4];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-yellow-400/70 text-xs font-semibold tracking-widest uppercase">Community Cards</div>
      <div className="flex gap-2 items-center">
        {slots.map((i) => {
          const card = cards[i];
          const label = i < 3 ? 'Flop' : i === 3 ? 'Turn' : 'River';
          const isActive = i === cards.length - 1 && cards.length > 0;

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <AnimatePresence mode="wait">
                {card ? (
                  <motion.div
                    key={`card-${i}`}
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.05 * i }}
                  >
                    <PlayingCard card={card} size="lg" glow={isActive} />
                  </motion.div>
                ) : (
                  <motion.div key={`empty-${i}`}>
                    <PlayingCard card={null} size="lg" />
                  </motion.div>
                )}
              </AnimatePresence>
              <span className="text-xs text-green-400/50">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}