import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Play, Zap } from 'lucide-react';
import GameDetailBreakdown from '@/components/strategy/GameDetailBreakdown';

const STRATEGIES = [
  { value: 'ST1_Original', label: 'ST1: Original (Hands 2,5,6,7,8,9)' },
  { value: 'ConservativeHedger', label: 'Conservative Hedger' },
  { value: 'RankStacker', label: 'Rank Stacker' },
  { value: 'FlushHunter', label: 'Flush Hunter' },
  { value: 'StraightHunter', label: 'Straight Hunter' },
  { value: 'ColorBoardSpecialist', label: 'Color Specialist' },
  { value: 'HighPayoutFocus', label: 'High Payout Focus' },
  { value: 'RiverFocused', label: 'River Focused' },
  { value: 'BalancedSpread', label: 'Balanced Spread' },
  { value: 'DiversifiedHedge', label: 'Diversified Hedge' },
  { value: 'AdaptiveHybrid', label: 'Adaptive Hybrid' },
  { value: 'The8Bet', label: '🎯 THE "8" BET+ (Hands 1,3,4,5,6,8,9,10 + River Hedge)' },
  { value: 'MetaAdaptive', label: '🤖 MetaAdaptive (AI-Mixer)' },
];

const STRATEGY_DETAILS = {
  ST1_Original: {
    description: 'Static strategy betting on high-payout hands with river hedging',
    steps: [
      'Bet $50 on hands 2, 5, 6, 7, 8, 9 (fixed)',
      'These hands have solid base payouts (6.75 to 10.18)',
      'Add river hedge: when 4+ cards showing same color, bet $300 on opposite color',
      'Scales down bet denomination if balance drops (50→25→10→5)',
      'River hedging reduces variance and locks in small wins',
    ],
    adaptation: 'None—uses fixed bet amounts. Scales denomination when bankroll drops.',
  },
  ConservativeHedger: {
    description: 'Full color board coverage with 4-hand base coverage',
    steps: [
      'Select 4 hands (3, 6, 8, 10) based on payout potential',
      'Bet equally across all 6 color board options (3R, 3B, 4R, 4B, 5R, 5B)',
      'Guarantees a payout on color board almost every game',
      'High coverage reduces risk but caps upside per win',
      'Effective for steady, low-variance growth',
    ],
    adaptation: 'Adjusts bet size based on balance: $25 when tight, $50 when flush.',
  },
  RankStacker: {
    description: 'Targets high-frequency poker hand ranks with selective hand coverage',
    steps: [
      'Covers hands 6 & 8 (high payout hands)',
      'Bets on 5 high-frequency hand ranks: One Pair, Two Pair, Three of a Kind, Straight, Full House',
      'These ranks appear in ~60% of games',
      'Concentrates capital on likely outcomes',
      'Good for consistent, compounding wins',
    ],
    adaptation: 'Scales bets (30–5) based on available balance and frequency',
  },
  FlushHunter: {
    description: 'Specialist strategy targeting Flush outcomes',
    steps: [
      'Bets hands 3, 4, 5 (3 mid-tier hands)',
      'Adds Flush rank bet to catch flush outcomes',
      'Adds river hedge to reduce downside risk',
      'When Flush hits, payout is 1.30x + hand win + river hedge',
      'Combines specific rank targeting with hand diversification',
    ],
    adaptation: 'Increases hand bet size when balance grows; hedges every round.',
  },
  StraightHunter: {
    description: 'Targets Straight outcomes with complementary hand coverage',
    steps: [
      'Bets hands 4, 5, 7 (building complementary positions)',
      'Adds Straight rank bet (1.9x payout)',
      'River hedge enabled for downside protection',
      'Straight frequency is ~4.6%, so selective targeting pays off',
      'Balanced approach: specific rank + hand diversification',
    ],
    adaptation: 'Scales bet denomination (50→25→10) if balance drops.',
  },
  ColorBoardSpecialist: {
    description: 'Heavy color board focus with light hand betting',
    steps: [
      'Light hand coverage: bets hands 1 & 4 only',
      'Full color board coverage: all 6 color outcomes',
      'River hedging for extra downside protection',
      'Optimizes for color board high-probability (3R/3B at 50%)',
      'Best when color payouts are favorable',
    ],
    adaptation: 'Micro-bets (15–20) across many outcomes to spread risk.',
  },
  HighPayoutFocus: {
    description: 'Aggressive strategy targeting premium hand and rank outcomes',
    steps: [
      'Targets hands 6 & 8 (highest payouts: 10.18x, 11.95x)',
      'Ranks: Three of a Kind (0.98x), Full House (0.98x), Four of a Kind (3.79x)',
      'Concentrates bets on top payouts',
      'Higher variance but better upside when hot',
      'Ideal for aggressive players with adequate bankroll',
    ],
    adaptation: 'Scales aggressively with balance—increases bets when winning.',
  },
  RiverFocused: {
    description: 'Minimal hand betting with aggressive river outcomes',
    steps: [
      'Bets only hand 8 (11.95x payout hand)',
      'Focuses on river-based outcomes',
      'River aggressive mode: bets up to 35% of total as river hedge',
      'Extreme concentration; wins big or loses big',
      'Requires discipline and adequate bankroll',
    ],
    adaptation: 'Highly adaptive: bet size responds to balance (50→25→10→5).',
  },
  BalancedSpread: {
    description: 'Diversified betting across all categories with equal weighting',
    steps: [
      'Hands: 2, 6, 8 (mix of mid and high payouts)',
      'Ranks: One Pair, Flush, Straight (high-frequency + mid-payout)',
      'Color: 3R & 4R (cover low and mid probability)',
      'River hedge enabled',
      'Balanced approach minimizes variance while maintaining upside',
    ],
    adaptation: 'Scales to 10 equal bet units: (30 per unit when flush, down to 5).',
  },
  DiversifiedHedge: {
    description: 'Maximum diversification with micro-bets across 12 outcomes',
    steps: [
      'Hands: 1, 3, 5, 7, 9, 10 (all low/mid payout hands)',
      'Ranks: One Pair, Two Pair (ultra-frequent)',
      'Colors: 3R & 3B (50% probability, lowest payout)',
      '12 small bets = high coverage, low variance',
      'Optimal for survival and steady growth with minimal risk',
    ],
    adaptation: 'Micro-bets (15) spread across 12 outcomes; scales with balance.',
  },
  AdaptiveHybrid: {
    description: 'Dynamic strategy that switches modes based on win rate',
    steps: [
      'Win rate > 55%: Hot Streak mode → increase hand bets (2,5,6,8)',
      'Win rate < 45%: Cold Streak mode → diversify colors & ranks',
      'Win rate 45–55%: Balanced mode → mix hands + colors',
      'Recalculates after each game based on recent history',
      'Exploits momentum and adjusts to variance automatically',
    ],
    adaptation: 'Fundamental: strategy switches every game based on performance.',
  },
  The8Bet: {
    description: 'High-coverage hand strategy betting on 8 of 10 hands — skipping only KK (too frequent, low payout) and 77 (same reason) — with a 50% river hedge for downside protection.',
    steps: [
      'Bet equal units on hands 1, 3, 4, 5, 6, 8, 9, 10 (the 8 high-payout hands)',
      'These 8 hands cover ~60% of all winning outcomes at 10.5x–20x payouts',
      'Any one win returns 10.5x–20x on that bet unit — enough to cover all 8 hand bets',
      'River hedge = 50% of total hand bets (e.g. 8×$20 hands → $80 river hedge)',
      'River hedge bets LOW and pays 0.93:1 if LOW hits (~50% of the time)',
      'Hedge partially offsets losses on rounds where none of the 8 hands win',
    ],
    adaptation: 'Scales unit down from $20 when balance drops below $400 (target: 20 units = total hand stake).',
  },
  MetaAdaptive: {
    description: 'AI-driven multi-strategy mixer that dynamically selects & blends all 10 strategies targeting 95–98% RTP',
    steps: [
      'Monitors win rate, volatility, momentum, and bankroll health in real-time',
      'Win rate > 58% & momentum > 5: Aggressive mix (HighPayoutFocus 80% + RiverFocused 20%)',
      'Win rate 52–58%: Growth mode (FlushHunter 60% + ConservativeHedger 40%)',
      'Win rate 48–52% & volatility < 0.3: Balanced blend (BalancedSpread 50% + RankStacker 50%)',
      'Win rate < 48% & volatility high: Defense (RankStacker 70% + ColorBoardSpecialist 30%)',
      'Bankroll under pressure (< 50%): Conservative (ConservativeHedger 50% + DiversifiedHedge 50%)',
      'Blends two complementary strategies every round with adaptive mixing coefficient',
    ],
    adaptation: 'Transforms every 1-2 games. Exploits ALL 10 strategies simultaneously via weighted mixing & momentum sensing.',
  },
};

export default function StrategyTest() {
  const [activeTab, setActiveTab] = useState('ST1');
  const [selectedStrategy, setSelectedStrategy] = useState('BalancedSpread');
  const [results, setResults] = useState([]);
  const [resultsV2, setResultsV2] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [showDetailBreakdown, setShowDetailBreakdown] = useState(null);

  const testCounts = [10, 25, 50, 100, 200, 400, 800, 1600, 3200, 6400, 12900];

  const runAllTests = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const allResults = [];
      for (const count of testCounts) {
        const response = await base44.functions.invoke('strategyBettingTest', { gamesToSimulate: count });
        allResults.push({
          gameCount: count,
          ...response.data,
        });
        setResults([...allResults]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runAllTestsV2 = async () => {
    setLoading(true);
    setError(null);
    setResultsV2([]);

    try {
      const allResults = [];
      for (const count of testCounts) {
        const response = await base44.functions.invoke('strategyBettingTestV2', { gamesToSimulate: count, strategyName: selectedStrategy });
        allResults.push({
          gameCount: count,
          ...response.data,
        });
        setResultsV2([...allResults]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">
            ← Back to Game
          </Link>
          <h1 className="text-4xl font-bold mb-4">Strategy Betting Test</h1>

          {/* Tab buttons */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => { setActiveTab('ST1'); setExpandedIdx(null); }}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'ST1'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              ST1: Original
            </button>
            <button
              onClick={() => { setActiveTab('ST2'); setExpandedIdx(null); }}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'ST2'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              ST2: Multi-Strategy
            </button>
            <button
              onClick={() => { setActiveTab('Details'); setExpandedIdx(null); }}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'Details'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              📋 Strategy Details
            </button>
          </div>

          {/* ST1 Content */}
          {activeTab === 'ST1' && (
            <div className="space-y-4">
              <p className="text-gray-400">
                Testing a fixed strategy: bet $50 on hands 2, 5, 6, 7, 8, 9 + contrarian LOW/HIGH when 4+ cards of one type showing
              </p>
              <button
                onClick={runAllTests}
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold disabled:bg-gray-700 flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {loading ? 'Running Tests...' : 'Run All Tests'}
              </button>
            </div>
          )}

          {/* ST2 Content */}
          {activeTab === 'ST2' && (
            <div className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm text-gray-300 mb-2">Select Strategy:</label>
                  <select
                    value={selectedStrategy}
                    onChange={(e) => setSelectedStrategy(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-blue-500 outline-none"
                  >
                    {STRATEGIES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={runAllTestsV2}
                  disabled={loading}
                  className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold disabled:bg-gray-700 flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {loading ? 'Running...' : 'Run Tests'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-8 text-red-200">
            Error: {error}
          </div>
        )}

        {/* Results Table */}
        {activeTab === 'ST1' && results.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-2xl font-bold">Results — ST1: Original Strategy</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-4 py-3 text-left">Games Played / Requested</th>
                    <th className="px-4 py-3 text-right">Total Profit</th>
                    <th className="px-4 py-3 text-right">Avg Per Game</th>
                    <th className="px-4 py-3 text-right">Final Balance</th>
                    <th className="px-4 py-3 text-right">ROI</th>
                    <th className="px-4 py-3 text-center">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => {
                    const profit = parseFloat(result.totalProfit);
                    const roi = parseFloat(result.roi);
                    const playerWon = profit > 0;
                    const casinoWon = profit < 0;

                    return (
                      <>
                        <motion.tr
                          key={idx}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`border-b border-slate-700 hover:bg-slate-700/30 cursor-pointer ${expandedIdx === idx ? 'bg-slate-700/50' : ''} ${result.stoppedEarly ? 'bg-red-900/20' : ''}`}
                          onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                        >
                          <td className={`px-4 py-3 font-bold ${result.stoppedEarly ? 'text-red-400' : 'text-white'}`}>
                            {result.gamesActuallyPlayed.toLocaleString()} / {result.gameCount.toLocaleString()}
                            {result.stoppedEarly && (
                              <span className="text-xs text-red-400 block">⚠️ BANKRUPT</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${playerWon ? 'text-green-400' : 'text-red-400'}`}>
                            {playerWon ? '+' : ''}{profit.toFixed(2)}
                          </td>
                          <td className={`px-4 py-3 text-right ${playerWon ? 'text-green-400' : 'text-red-400'}`}>
                            {playerWon ? '+' : ''}{parseFloat(result.avgProfitPerGame).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">${parseFloat(result.finalBalance).toFixed(2)}</td>
                          <td className={`px-4 py-3 text-right font-bold ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {roi >= 0 ? '+' : ''}{roi}%
                          </td>
                          <td className="px-4 py-3 text-center">
                            {expandedIdx === idx ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                          </td>
                        </motion.tr>

                        {/* Expanded Details */}
                        {expandedIdx === idx && (
                          <tr>
                            <td colSpan="6" className="p-0">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-slate-900/80 border-t border-slate-700 p-6"
                              >
                                <div className="space-y-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <h3 className="text-lg font-bold">Game #{idx + 1} Summary ({result.gamesActuallyPlayed.toLocaleString()} of {result.gameCount.toLocaleString()} games played)</h3>
                                      {result.stoppedEarly && (
                                        <p className="text-sm text-red-400 mt-1">⚠ Simulation stopped early: Bankroll depleted at game {result.gamesActuallyPlayed}</p>
                                      )}
                                    </div>
                                    {result.detailedGameLog && result.detailedGameLog.length > 0 && (
                                      <button
                                        onClick={() => setShowDetailBreakdown(idx)}
                                        className="px-3 py-1 rounded-lg border border-cyan-600/50 bg-cyan-900/30 text-cyan-300 text-xs font-bold hover:bg-cyan-900/50 transition-all flex items-center gap-1 flex-shrink-0"
                                        title="View detailed breakdown of each game"
                                      >
                                        <Zap className="w-3 h-3" /> Details
                                      </button>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Player Stats */}
                                    <div className={`rounded-lg border-2 p-4 ${playerWon ? 'border-green-600 bg-green-900/20' : 'border-red-600 bg-red-900/20'}`}>
                                      <div className="flex items-center justify-between mb-3">
                                        <h4 className={`text-lg font-bold ${playerWon ? 'text-green-400' : 'text-red-400'}`}>
                                          {playerWon ? '🎉 PLAYER WINS' : '❌ PLAYER LOSES'}
                                        </h4>
                                      </div>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">Starting Balance</span>
                                          <span className="font-bold text-white">$1,000.00</span>
                                        </div>
                                        <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                                          <span className="text-gray-300">Total Profit/Loss</span>
                                          <span className={`font-bold text-lg ${playerWon ? 'text-green-400' : 'text-red-400'}`}>
                                            {playerWon ? '+' : ''}{profit.toFixed(2)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">Final Balance</span>
                                          <span className="font-bold text-white">${parseFloat(result.finalBalance).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-gray-700 pb-2 mb-2">
                                          <span className="text-gray-300">ROI</span>
                                          <span className={`font-bold text-lg ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {roi >= 0 ? '+' : ''}{roi}%
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">Peak Bankroll</span>
                                          <span className="font-bold text-yellow-400">${parseFloat(result.maxBankrollEver).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">Peak at Game #</span>
                                          <span className="font-bold text-yellow-300">{result.maxBankrollGameNumber}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Casino Stats */}
                                    <div className={`rounded-lg border-2 p-4 ${casinoWon ? 'border-green-600 bg-green-900/20' : 'border-red-600 bg-red-900/20'}`}>
                                      <div className="flex items-center justify-between mb-3">
                                        <h4 className={`text-lg font-bold ${casinoWon ? 'text-green-400' : 'text-red-400'}`}>
                                          {casinoWon ? '🏆 CASINO WINS' : '📉 CASINO LOSES'}
                                        </h4>
                                      </div>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">House Edge</span>
                                          <span className="font-bold text-white">{(100 - roi).toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                                          <span className="text-gray-300">Casino Profit/Loss</span>
                                          <span className={`font-bold text-lg ${casinoWon ? 'text-green-400' : 'text-red-400'}`}>
                                            {casinoWon ? '+' : ''}{(-profit).toFixed(2)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">Avg Per Game</span>
                                          <span className={`font-bold ${casinoWon ? 'text-green-400' : 'text-red-400'}`}>
                                            {casinoWon ? '+' : ''}{(-parseFloat(result.avgProfitPerGame)).toFixed(2)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">Games Actually Played</span>
                                          <span className="font-bold text-white">{result.gamesActuallyPlayed.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">Requested Games</span>
                                          <span className="font-bold text-white">{result.gameCount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                                          <span className="text-gray-300">Peak Profit</span>
                                          <span className="font-bold text-yellow-400">${parseFloat(result.maxProfitEver).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">at Game #</span>
                                          <span className="font-bold text-yellow-300">{result.maxProfitGameNumber}</span>
                                        </div>
                                      </div>
                                      </div>
                                      </div>

                                      {/* Doubling Milestones */}
                                  {Object.keys(result.doublingMilestones).length > 0 && (
                                    <div className="rounded-lg bg-slate-700/50 p-4 border border-slate-600 mt-4">
                                      <p className="text-sm font-bold text-gray-300 mb-3">Bankroll Doubling Milestones</p>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {Object.entries(result.doublingMilestones)
                                          .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
                                          .map(([amount, gameNum]) => (
                                            <div key={amount} className="text-center p-2 rounded bg-slate-600/50">
                                              <p className="text-xs text-gray-400">Reached</p>
                                              <p className="text-lg font-bold text-green-400">${parseFloat(amount).toLocaleString()}</p>
                                              <p className="text-xs text-gray-500">Game #{gameNum}</p>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Stats Breakdown */}
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                                    <div className="rounded-lg bg-slate-700/50 p-3 border border-slate-600">
                                      <p className="text-xs text-gray-400">4 Low Triggered</p>
                                      <p className="text-lg font-bold text-blue-400">{result.stats?.fourLowTriggered || 0}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-700/50 p-3 border border-slate-600">
                                      <p className="text-xs text-gray-400">4 High Triggered</p>
                                      <p className="text-lg font-bold text-blue-400">{result.stats?.fourHighTriggered || 0}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-700/50 p-3 border border-slate-600">
                                      <p className="text-xs text-gray-400">River Became 5 Low</p>
                                      <p className="text-lg font-bold text-red-400">{result.stats?.riverBecameFiveLow || 0}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-700/50 p-3 border border-slate-600">
                                      <p className="text-xs text-gray-400">River Became 5 High</p>
                                      <p className="text-lg font-bold text-red-400">{result.stats?.riverBecameFiveHigh || 0}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-700/50 p-3 border border-slate-600">
                                      <p className="text-xs text-gray-400">River Wins</p>
                                      <p className="text-lg font-bold text-green-400">{result.stats?.riverWins || 0}</p>
                                    </div>
                                  </div>

                                  {/* Winning Hand Breakdown */}
                                  {result.stats?.winningHandBreakdown && (
                                    <div className="mt-4 rounded-lg bg-slate-700/50 p-4 border border-slate-600">
                                      <p className="text-sm font-bold text-gray-300 mb-3">Winning Hands (Our Bets: 2, 5, 6, 7, 8, 9)</p>
                                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                        {Object.entries(result.stats.winningHandBreakdown).map(([handId, count]) => (
                                          <div key={handId} className="text-center p-2 rounded bg-slate-600/50">
                                            <p className="text-xs text-gray-400">H{handId}</p>
                                            <p className="text-lg font-bold text-yellow-400">{count}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-4 p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                                    <p className="text-xs text-gray-400">
                                      <span className="font-bold">Strategy:</span> {result.strategy}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            {results.length > 0 && (
              <div className="p-6 border-t border-slate-700 bg-slate-900/30">
                <h3 className="text-xl font-bold mb-4">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Total Tested</p>
                    <p className="text-2xl font-bold">{results.reduce((s, r) => s + r.gameCount, 0).toLocaleString()} games</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Cumulative P/L</p>
                    <p className={`text-2xl font-bold ${results.reduce((s, r) => s + parseFloat(r.totalProfit), 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {results.reduce((s, r) => s + parseFloat(r.totalProfit), 0) >= 0 ? '+' : ''}${results.reduce((s, r) => s + parseFloat(r.totalProfit), 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Best Result</p>
                    <p className={`text-2xl font-bold ${Math.max(...results.map(r => parseFloat(r.roi))) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {Math.max(...results.map(r => parseFloat(r.roi))).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Avg ROI</p>
                    <p className={`text-2xl font-bold ${results.reduce((s, r) => s + parseFloat(r.roi), 0) / results.length >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(results.reduce((s, r) => s + parseFloat(r.roi), 0) / results.length).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ST2 Results Table */}
        {activeTab === 'ST2' && resultsV2.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-2xl font-bold">
                Results: {STRATEGIES.find(s => s.value === selectedStrategy)?.label}
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-4 py-3 text-left">Games Played / Requested</th>
                    <th className="px-4 py-3 text-right">Total Profit</th>
                    <th className="px-4 py-3 text-right">Avg Per Game</th>
                    <th className="px-4 py-3 text-right">Final Balance</th>
                    <th className="px-4 py-3 text-right">ROI</th>
                    <th className="px-4 py-3 text-center">Peak Bankroll</th>
                    <th className="px-4 py-3 text-center">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsV2.map((result, idx) => {
                    const profit = parseFloat(result.totalProfit);
                    const roi = parseFloat(result.roi);
                    const playerWon = profit > 0;

                    return (
                      <>
                        <motion.tr
                          key={idx}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`border-b border-slate-700 hover:bg-slate-700/30 cursor-pointer ${expandedIdx === idx ? 'bg-slate-700/50' : ''} ${result.stoppedEarly ? 'bg-red-900/20' : ''}`}
                          onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                        >
                          <td className={`px-4 py-3 font-bold ${result.stoppedEarly ? 'text-red-400' : 'text-white'}`}>
                            {result.gamesActuallyPlayed.toLocaleString()} / {result.gameCount.toLocaleString()}
                            {result.stoppedEarly && (
                              <span className="text-xs text-red-400 block">⚠️ BANKRUPT</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${playerWon ? 'text-green-400' : 'text-red-400'}`}>
                            {playerWon ? '+' : ''}{profit.toFixed(2)}
                          </td>
                          <td className={`px-4 py-3 text-right ${playerWon ? 'text-green-400' : 'text-red-400'}`}>
                            {playerWon ? '+' : ''}{parseFloat(result.avgProfitPerGame).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">${parseFloat(result.finalBalance).toFixed(2)}</td>
                          <td className={`px-4 py-3 text-right font-bold ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {roi >= 0 ? '+' : ''}{roi}%
                          </td>
                          <td className="px-4 py-3 text-center text-yellow-400 font-bold">
                            ${parseFloat(result.maxBankrollEver).toFixed(0)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {expandedIdx === idx ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                          </td>
                        </motion.tr>

                        {/* Expanded Details */}
                        {expandedIdx === idx && (
                          <tr>
                            <td colSpan="7" className="p-0">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-slate-900/80 border-t border-slate-700 p-6"
                              >
                                <div className="space-y-4">
                                   <div className="flex items-start justify-between">
                                     <div>
                                       <h3 className="text-lg font-bold mb-3">Game #{idx + 1} Summary ({result.gamesActuallyPlayed.toLocaleString()} of {result.gameCount.toLocaleString()} games played)</h3>
                                       {result.stoppedEarly && (
                                         <p className="text-sm text-red-400 mb-2">⚠ Simulation stopped early: Bankroll depleted at game {result.gamesActuallyPlayed}</p>
                                       )}
                                     </div>
                                     {result.detailedGameLog && result.detailedGameLog.length > 0 && (
                                       <button
                                         onClick={() => setShowDetailBreakdown(idx)}
                                         className="px-3 py-1 rounded-lg border border-cyan-600/50 bg-cyan-900/30 text-cyan-300 text-xs font-bold hover:bg-cyan-900/50 transition-all flex items-center gap-1 flex-shrink-0"
                                         title="View detailed breakdown of each game"
                                       >
                                         <Zap className="w-3 h-3" /> Details
                                       </button>
                                     )}
                                   </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Player Stats */}
                                    <div className={`rounded-lg border-2 p-4 ${playerWon ? 'border-green-600 bg-green-900/20' : 'border-red-600 bg-red-900/20'}`}>
                                      <div className="flex items-center justify-between mb-3">
                                        <h4 className={`text-lg font-bold ${playerWon ? 'text-green-400' : 'text-red-400'}`}>
                                          {playerWon ? '🎉 PLAYER WINS' : '❌ PLAYER LOSES'}
                                        </h4>
                                      </div>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">Starting Balance</span>
                                          <span className="font-bold text-white">$1,000.00</span>
                                        </div>
                                        <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                                          <span className="text-gray-300">Total Profit/Loss</span>
                                          <span className={`font-bold text-lg ${playerWon ? 'text-green-400' : 'text-red-400'}`}>
                                            {playerWon ? '+' : ''}{profit.toFixed(2)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">Final Balance</span>
                                          <span className="font-bold text-white">${parseFloat(result.finalBalance).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-gray-700 pb-2 mb-2">
                                          <span className="text-gray-300">ROI</span>
                                          <span className={`font-bold text-lg ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {roi >= 0 ? '+' : ''}{roi}%
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">Win Rate</span>
                                          <span className="font-bold text-blue-400">{result.stats?.winRate || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                           <span className="text-gray-300">Max Win Streak</span>
                                           <span className="font-bold text-green-400">{result.stats?.maxWinStreak || 0}</span>
                                         </div>
                                         <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                                           <span className="text-gray-300">Peak Bankroll</span>
                                           <span className="font-bold text-yellow-400">${parseFloat(result.maxBankrollEver).toFixed(2)}</span>
                                         </div>
                                         <div className="flex justify-between">
                                           <span className="text-gray-300">Peak at Game #</span>
                                           <span className="font-bold text-yellow-300">{result.maxBankrollGameNumber}</span>
                                         </div>
                                        </div>
                                        </div>

                                        {/* Casino Stats */}
                                        <div className={`rounded-lg border-2 p-4 ${!playerWon ? 'border-green-600 bg-green-900/20' : 'border-red-600 bg-red-900/20'}`}>
                                      <div className="flex items-center justify-between mb-3">
                                        <h4 className={`text-lg font-bold ${!playerWon ? 'text-green-400' : 'text-red-400'}`}>
                                          {!playerWon ? '🏆 CASINO WINS' : '📉 CASINO LOSES'}
                                        </h4>
                                      </div>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">House Edge</span>
                                          <span className="font-bold text-white">{(100 - roi).toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                                          <span className="text-gray-300">Casino Profit/Loss</span>
                                          <span className={`font-bold text-lg ${!playerWon ? 'text-green-400' : 'text-red-400'}`}>
                                            {!playerWon ? '+' : ''}{(-profit).toFixed(2)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">Avg Per Game</span>
                                          <span className={`font-bold ${!playerWon ? 'text-green-400' : 'text-red-400'}`}>
                                            {!playerWon ? '+' : ''}{(-parseFloat(result.avgProfitPerGame)).toFixed(2)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between border-b border-gray-700 pb-2 mb-2">
                                          <span className="text-gray-300">Games Played</span>
                                          <span className="font-bold text-white">{result.gamesActuallyPlayed.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">Loss Rate</span>
                                          <span className="font-bold text-red-400">{result.stats?.lossCount ? `${((result.stats.lossCount / result.gamesActuallyPlayed) * 100).toFixed(1)}%` : '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-300">Max Loss Streak</span>
                                          <span className="font-bold text-red-400">{result.stats?.maxLossStreak || 0}</span>
                                        </div>
                                        </div>
                                        </div>
                                        </div>

                                  {/* Doubling Milestones */}
                                  {result.doublingMilestones && Object.keys(result.doublingMilestones).length > 0 && (
                                    <div className="rounded-lg bg-slate-700/50 p-4 border border-slate-600 mt-4">
                                      <p className="text-sm font-bold text-gray-300 mb-3">Bankroll Doubling Milestones</p>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {Object.entries(result.doublingMilestones)
                                          .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
                                          .map(([amount, gameNum]) => (
                                            <div key={amount} className="text-center p-2 rounded bg-slate-600/50">
                                              <p className="text-xs text-gray-400">Reached</p>
                                              <p className="text-lg font-bold text-green-400">${parseFloat(amount).toLocaleString()}</p>
                                              <p className="text-xs text-gray-500">Game #{gameNum}</p>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Strategy-specific breakdown */}
                                  {result.stats && (
                                    <div className="mt-4 rounded-lg bg-slate-700/50 p-4 border border-slate-600">
                                      <p className="text-sm font-bold text-gray-300 mb-3">Strategy Performance</p>
                                      <div className="space-y-2 text-sm">
                                        {result.stats.winCount !== undefined && (
                                          <>
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">Wins</span>
                                              <span className="font-bold text-green-400">{result.stats.winCount}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-400">Losses</span>
                                              <span className="font-bold text-red-400">{result.stats.lossCount}</span>
                                            </div>
                                          </>
                                        )}
                                        {result.stats.maxProfit !== undefined && (
                                          <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                                            <span className="text-gray-400">Max Profit Peak</span>
                                            <span className="font-bold text-yellow-400">${parseFloat(result.stats.maxProfit).toFixed(2)}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {result.strategy && (
                                    <div className="mt-4 p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                                      <p className="text-xs text-gray-400">
                                        <span className="font-bold">Strategy Mix:</span> {result.strategy}
                                      </p>
                                    </div>
                                  )}
                                  </div>
                                  </motion.div>
                                  </td>
                                  </tr>
                                  )}
                                  </>
                                  );
                                  })}
                                  </tbody>
                                  </table>
                                  </div>

            {/* ST2 Summary */}
            {resultsV2.length > 0 && (
              <div className="p-6 border-t border-slate-700 bg-slate-900/30">
                <h3 className="text-xl font-bold mb-4">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Total Tested</p>
                    <p className="text-2xl font-bold">{resultsV2.reduce((s, r) => s + r.gameCount, 0).toLocaleString()} games</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Cumulative P/L</p>
                    <p className={`text-2xl font-bold ${resultsV2.reduce((s, r) => s + parseFloat(r.totalProfit), 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {resultsV2.reduce((s, r) => s + parseFloat(r.totalProfit), 0) >= 0 ? '+' : ''}${resultsV2.reduce((s, r) => s + parseFloat(r.totalProfit), 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Best Peak</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      ${Math.max(...resultsV2.map(r => parseFloat(r.maxBankrollEver))).toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Avg ROI</p>
                    <p className={`text-2xl font-bold ${resultsV2.reduce((s, r) => s + parseFloat(r.roi), 0) / resultsV2.length >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(resultsV2.reduce((s, r) => s + parseFloat(r.roi), 0) / resultsV2.length).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Details Tab */}
        {activeTab === 'Details' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <label className="block text-sm text-gray-300 mb-3">Select Strategy to View Details:</label>
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-blue-500 outline-none"
              >
                {STRATEGIES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {STRATEGY_DETAILS[selectedStrategy] && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-600/30 rounded-lg p-6 space-y-4"
              >
                {/* Strategy Name & Description */}
                <div>
                  <h2 className="text-2xl font-bold text-purple-300 mb-2">
                    {STRATEGIES.find(s => s.value === selectedStrategy)?.label}
                  </h2>
                  <p className="text-gray-300 text-base italic">
                    {STRATEGY_DETAILS[selectedStrategy].description}
                  </p>
                </div>

                {/* Steps */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">📋 Strategy Steps:</h3>
                  <ol className="space-y-2 list-decimal list-inside">
                    {STRATEGY_DETAILS[selectedStrategy].steps.map((step, idx) => (
                      <li key={idx} className="text-gray-300 leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Adaptation Info */}
                <div className="bg-slate-700/50 rounded-lg p-4 border-l-4 border-purple-500">
                  <h3 className="text-lg font-bold text-purple-300 mb-2">🎯 Adaptation & Scaling:</h3>
                  <p className="text-gray-300">{STRATEGY_DETAILS[selectedStrategy].adaptation}</p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t border-slate-700">
                  <div className="bg-slate-700/30 rounded p-3">
                    <p className="text-xs text-gray-400 mb-1">Risk Level</p>
                    <p className="text-lg font-bold text-white">
                      {selectedStrategy === 'MetaAdaptive' ? '⚡ Adaptive' :
                       selectedStrategy.includes('Diversif') || selectedStrategy === 'ConservativeHedger' ? '🟢 Low' :
                       selectedStrategy.includes('Balanced') ? '🟡 Medium' :
                       selectedStrategy.includes('High') || selectedStrategy === 'RiverFocused' ? '🔴 High' : '🟡 Medium'}
                    </p>
                  </div>
                  <div className="bg-slate-700/30 rounded p-3">
                    <p className="text-xs text-gray-400 mb-1">Bet Count</p>
                    <p className="text-lg font-bold text-white">
                      {selectedStrategy === 'MetaAdaptive' ? 'Mixed' :
                       selectedStrategy === 'RiverFocused' ? '1-2' :
                       selectedStrategy === 'ST1_Original' ? '6+' :
                       selectedStrategy.includes('Diversif') ? '12' : '4-8'}
                    </p>
                  </div>
                  <div className="bg-slate-700/30 rounded p-3">
                    <p className="text-xs text-gray-400 mb-1">Variance</p>
                    <p className="text-lg font-bold text-white">
                      {selectedStrategy === 'MetaAdaptive' ? 'Auto-Optimized' :
                       selectedStrategy.includes('Diversif') || selectedStrategy === 'ConservativeHedger' ? 'Low' :
                       selectedStrategy === 'BalancedSpread' || selectedStrategy === 'Adaptive' ? 'Medium' : 'High'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-300">Running simulations...</p>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Detail Breakdown Modal */}
    {showDetailBreakdown !== null && (
      <GameDetailBreakdown
        gameLog={resultsV2[showDetailBreakdown]?.detailedGameLog || []}
        onClose={() => setShowDetailBreakdown(null)}
      />
    )}
    </>
  );
}