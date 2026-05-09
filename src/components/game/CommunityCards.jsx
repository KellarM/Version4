import PlayingCard from './PlayingCard';
import { motion } from 'framer-motion';

const CARD_W = 56;
const CARD_H = 80;
const GAP = 6;
const GROUP_GAP = 14;
const LABEL_H = 16;
const LABEL_TOP_GAP = 4;

function CardSlot({ card, index, active }) {
  return (
    <div style={{ width: CARD_W, height: CARD_H, flexShrink: 0, position: 'relative' }}>
      {card ? (
        <motion.div
          key={`card-${index}-${card.rank}${card.suit}`}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.05 * index }}
          style={{ width: CARD_W, height: CARD_H }}
        >
          <PlayingCard card={card} size="md" glow={active} />
        </motion.div>
      ) : (
        <div style={{ width: CARD_W, height: CARD_H, opacity: 0.9 }}>
          <img
            src="https://media.base44.com/images/public/69f3a45ad82dff5b772d4de2/1b33b172d_image.png"
            alt="Card back"
            style={{ width: CARD_W, height: CARD_H, borderRadius: '6px', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}
    </div>
  );
}

function CardGroup({ cards, indices, label, hasCards }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: GAP }}>
        {indices.map((i) => (
          <CardSlot
            key={i}
            card={cards[i]}
            index={i}
            active={i === cards.length - 1 && cards.length > 0}
          />
        ))}
      </div>
      <div style={{
        height: LABEL_H,
        marginTop: LABEL_TOP_GAP,
        fontSize: '0.65rem',
        fontWeight: 700,
        fontFamily: 'Oswald, sans-serif',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#e8b84b',
        textShadow: '0 0 2px #000, 1px 1px 2px #000, -1px -1px 2px #000, 2px 2px 0 #000',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
    </div>
  );
}

export default function CommunityCards({ cards = [] }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: GROUP_GAP,
        flexShrink: 0,
      }}
    >
      <CardGroup
        cards={cards}
        indices={[0, 1, 2]}
        label="Flop"
        hasCards={cards.length >= 3}
      />
      <CardGroup
        cards={cards}
        indices={[3]}
        label="Turn"
        hasCards={cards.length >= 4}
      />
      <CardGroup
        cards={cards}
        indices={[4]}
        label="River"
        hasCards={cards.length >= 5}
      />
    </div>
  );
}