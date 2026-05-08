import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, BarChart2, Award, PieChart, Layers, Database, Timer, Users, ShieldAlert, FileText, Swords, Eye } from 'lucide-react';

const TOOLS = [
  { icon: BarChart2,  label: 'Player Stats',               type: 'stats'           },
  { icon: Database,   label: 'Molly Simulator',            type: 'mollySimulator', badge: 'NEW', badgeColor: 'bg-yellow-700/60 text-yellow-300 border-yellow-600/40' },
  { icon: Users,      label: 'Archetype Battle',           type: 'archetypeBattle', badge: 'NEW', badgeColor: 'bg-purple-700/60 text-purple-300 border-purple-600/40' },
  { icon: ShieldAlert,label: 'Exploit Hunter',             type: 'exploitHunter',  badge: 'NEW', badgeColor: 'bg-red-700/60 text-red-300 border-red-600/40' },
  { icon: FileText,   label: 'Compliance Report',          type: 'complianceReport', badge: 'NEW', badgeColor: 'bg-green-700/60 text-green-300 border-green-600/40' },
  { icon: Swords,     label: 'KS Strategy Test',            type: 'ksStrategyTest',   badge: 'NEW', badgeColor: 'bg-purple-700/60 text-purple-300 border-purple-600/40' },
  { icon: Eye,        label: 'Observer',                    type: 'observer',         badge: 'NEW', badgeColor: 'bg-cyan-700/60 text-cyan-300 border-cyan-600/40' },
  { icon: Award,      label: 'Gaming License Calibration', href: '/gaming-license' },
  { icon: PieChart,   label: 'Game Stats',                 href: '/game-stats'     },
  { icon: Layers,     label: 'Deck Inspector',             href: '/deck-inspector' },
  { icon: Timer,      label: 'Game Timing',                type: 'gameTiming'      },
];

export default function ToolsMenu({
  onOpenStats,
  onOpenMollySimulator,
  onOpenArchetypeBattle,
  onOpenExploitHunter,
  onOpenComplianceReport,
  onOpenKsStrategyTest,
  onOpenObserver,
  onOpenGameTiming,
  toolsVisible = true,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handle(fn) {
    fn?.();
    setOpen(false);
  }

  const typeHandlers = {
    stats:            onOpenStats,
    mollySimulator:   onOpenMollySimulator,
    archetypeBattle:  onOpenArchetypeBattle,
    exploitHunter:    onOpenExploitHunter,
    complianceReport:  onOpenComplianceReport,
    ksStrategyTest:   onOpenKsStrategyTest,
    observer:         onOpenObserver,
    gameTiming:        onOpenGameTiming,
  };

  return (
    <div className="relative" ref={ref} style={{ visibility: toolsVisible ? 'visible' : 'hidden' }}>
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
        <div className="absolute right-0 bottom-full mb-1.5 w-60 bg-slate-900 border border-yellow-700/40 rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-yellow-700/20">
            <p className="text-yellow-400/60 text-xs font-semibold tracking-wider uppercase">Game Tools</p>
          </div>

          {TOOLS.map(({ icon: Icon, label, href, type, badge, badgeColor }) => {
            if (type) {
              return (
                <button key={label} onClick={() => handle(typeHandlers[type])}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-yellow-900/20 hover:text-yellow-200 transition-colors text-left">
                  <Icon className="w-4 h-4 text-yellow-500/70 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${badgeColor}`}>{badge}</span>
                  )}
                </button>
              );
            }
            return (
              <Link key={label} to={href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-yellow-900/20 hover:text-yellow-200 transition-colors">
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
