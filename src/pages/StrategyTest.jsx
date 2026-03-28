import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';

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
];

export default function StrategyTest() {
  const [activeTab, setActiveTab] = useState('ST1');
  const [selectedStrategy, setSelectedStrategy] = useState('BalancedSpread');
  const [results, setResults] = useState([]);
  const [resultsV2, setResultsV2] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState(null);

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">
            ← Back to Game
          </Link>
          <h1 className="text-4xl font-bold mb-4">Strategy Betting Test</h1>

          {/* Tab buttons */}
          <div className="flex gap-2 mb-6">
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
              <h2 className="text-2xl font-bold">Results</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-4 py-3 text-left">Games</th>
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
                          className={`border-b border-slate-700 hover:bg-slate-700/30 cursor-pointer ${expandedIdx === idx ? 'bg-slate-700/50' : ''}`}
                          onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                        >
                          <td className="px-4 py-3 font-bold">
                            {result.gameCount.toLocaleString()}
                            {result.stoppedEarly && (
                              <span className="text-xs text-red-400 block">(stopped at {result.gamesActuallyPlayed})</span>
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
                                  <div>
                                    <h3 className="text-lg font-bold mb-3">Game #{idx + 1} Summary ({result.gamesActuallyPlayed.toLocaleString()} of {result.gameCount.toLocaleString()} games played)</h3>
                                    {result.stoppedEarly && (
                                      <p className="text-sm text-red-400 mb-2">⚠ Simulation stopped early: Bankroll depleted at game {result.gamesActuallyPlayed}</p>
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
                    <th className="px-4 py-3 text-left">Games</th>
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
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`border-b border-slate-700 hover:bg-slate-700/30 cursor-pointer`}
                        onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                      >
                        <td className="px-4 py-3 font-bold">
                          {result.gameCount.toLocaleString()}
                          {result.stoppedEarly && (
                            <span className="text-xs text-red-400 block">(stopped at {result.gamesActuallyPlayed})</span>
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
  );
}