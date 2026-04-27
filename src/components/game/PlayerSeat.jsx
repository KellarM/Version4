import { motion } from 'framer-motion';

const SEAT_COLORS = [
  { ring: 'ring-yellow-400',  activeBg: 'bg-yellow-500/30',  bg: 'bg-yellow-500/10',   nameBg: 'bg-yellow-500', nameText: 'text-black',  balText: 'text-yellow-300', dot: 'bg-yellow-400'  },
  { ring: 'ring-blue-400',    activeBg: 'bg-blue-500/30',    bg: 'bg-blue-500/10',     nameBg: 'bg-blue-500',   nameText: 'text-white',  balText: 'text-blue-300',   dot: 'bg-blue-400'    },
  { ring: 'ring-pink-400',    activeBg: 'bg-pink-500/30',    bg: 'bg-pink-500/10',     nameBg: 'bg-pink-500',   nameText: 'text-white',  balText: 'text-pink-300',   dot: 'bg-pink-400'    },
  { ring: 'ring-green-400',   activeBg: 'bg-green-500/30',   bg: 'bg-green-500/10',    nameBg: 'bg-green-500',  nameText: 'text-black',  balText: 'text-green-300',  dot: 'bg-green-400'   },
  { ring: 'ring-orange-400',  activeBg: 'bg-orange-500/30',  bg: 'bg-orange-500/10',   nameBg: 'bg-orange-500', nameText: 'text-black',  balText: 'text-orange-300', dot: 'bg-orange-400'  },
  { ring: 'ring-cyan-400',    activeBg: 'bg-cyan-500/30',    bg: 'bg-cyan-500/10',     nameBg: 'bg-cyan-500',   nameText: 'text-black',  balText: 'text-cyan-300',   dot: 'bg-cyan-400'    },
  { ring: 'ring-red-400',     activeBg: 'bg-red-500/30',     bg: 'bg-red-500/10',      nameBg: 'bg-red-500',    nameText: 'text-white',  balText: 'text-red-300',    dot: 'bg-red-400'     },
  { ring: 'ring-lime-400',    activeBg: 'bg-lime-500/30',    bg: 'bg-lime-500/10',     nameBg: 'bg-lime-500',   nameText: 'text-black',  balText: 'text-lime-300',   dot: 'bg-lime-400'    },
  { ring: 'ring-violet-400',  activeBg: 'bg-violet-500/30',  bg: 'bg-violet-500/10',   nameBg: 'bg-violet-500', nameText: 'text-white',  balText: 'text-violet-300', dot: 'bg-violet-400'  },
  { ring: 'ring-amber-400',   activeBg: 'bg-amber-500/30',   bg: 'bg-amber-500/10',    nameBg: 'bg-amber-500',  nameText: 'text-black',  balText: 'text-amber-300',  dot: 'bg-amber-400'   },
];

export default function PlayerSeat({ playerId, balance, isActive, onSelect, gamePhase, totalBet }) {
  const color = SEAT_COLORS[playerId % SEAT_COLORS.length];
  const canSelect = gamePhase === 'betting' || gamePhase === 'lowHighBetting';

  return (
    <motion.button
      onClick={canSelect ? onSelect : undefined}
      whileTap={canSelect ? { scale: 0.94 } : {}}
      className={`relative flex items-center gap-1 rounded-full border transition-all select-none px-1.5 py-0.5
        ${isActive
          ? `ring-2 ${color.ring} ${color.activeBg} border-transparent`
          : `${color.bg} border-white/10 hover:border-white/25`
        }
        ${canSelect ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {isActive && (
        <span className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${color.dot} ring-1 ring-black`} />
      )}
      <span className={`text-[10px] font-black px-1 py-0.5 rounded-full leading-none ${color.nameBg} ${color.nameText}`}>
        P{playerId + 1}
      </span>
      <span className={`text-[10px] font-bold ${color.balText} leading-none whitespace-nowrap`}>
        ${balance.toFixed(0)}
      </span>
      {totalBet > 0 && (
        <span className="text-[9px] text-white/45 leading-none whitespace-nowrap">
          ·{totalBet}
        </span>
      )}
    </motion.button>
  );
}