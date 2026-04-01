import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, BarChart2, Search, Sliders, Target, Scale, Activity, Play, Award, PieChart } from 'lucide-react';

const TOOLS = [
  { icon: BarChart2, label: 'Player Stats',        type: 'stats' },
  { icon: Play,      label: 'Promo Video',          href: '/promo' },
  { icon: Search,    label: 'Hand-by-Hand',         href: '/analysis' },
  { icon: Sliders,   label: 'Payout Calibration',   href: '/calibration' },
  { icon: Target,    label: 'Strategy Test',        href: '/strategy-test' },
  { icon: Scale,     label: 'Regulatory Audit',     href: '/regulatory' },
  { icon: Activity,  label: 'Frequency Profiler',   href: '/frequency-profiler' },
  { icon: Award,     label: 'Gaming License Calibration', href: '/gaming-license' },
  { icon: PieChart,  label: 'Game Stats',                 href: '/game-stats' },
];

// Updated betting rules (as of 2026-04-01)
const BETTING_RULES = `
RAPID FIRE - TEXAS 10 BETTING RULES:

CARD HAND BETS:
• Max 2 Card Hand bets allowed when any Hand Rank bet is active
• Alert triggers when limit is exceeded (5-sec countdown)

HAND RANK BETS:
• 0 Card Hand bets: unlimited rank bets allowed
• 1–2 Card Hand bets: max 2 rank bets allowed
• 3+ Card Hand bets: all rank bets locked
• ONE PAIR ISOLATION: One Pair must be bet alone — cannot combine with any other rank bet
• All ranks are fixed-odds (no progressives)

COLOR BOARD (Red/Black):
• Available during betting phase
• Can bet multiple color combinations

LOW/HIGH BETS:
• Available after Turn card is dealt
• Max bet = total board bets (hand + rank + color bets combined)
`;

export default function ToolsMenu({ onOpenStats }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all
          ${open
            ? 'border-yellow-400 bg-yellow-700/40 text-yellow-200'
            : 'border-yellow-700/50 bg-yellow-900/20 text-yellow-300 hover:border-yellow-500 hover:bg-yellow-900/40'
          }`}
      >
        <Wrench className="w-3.5 h-3.5" />
        Tools
        <span className={`transition-transform duration-200 text-yellow-400/60 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-yellow-700/40 rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-yellow-700/20">
            <p className="text-yellow-400/60 text-xs font-semibold tracking-wider uppercase">Game Tools</p>
          </div>
          {TOOLS.map(({ icon: Icon, label, href, type }) => {
            if (type === 'stats') {
              return (
                <button
                  key={label}
                  onClick={() => { onOpenStats(); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-yellow-900/20 hover:text-yellow-200 transition-colors text-left"
                >
                  <Icon className="w-4 h-4 text-yellow-500/70 flex-shrink-0" />
                  {label}
                </button>
              );
            }
            return (
              <Link
                key={label}
                to={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-yellow-900/20 hover:text-yellow-200 transition-colors"
              >
                <Icon className="w-4 h-4 text-yellow-500/70 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}