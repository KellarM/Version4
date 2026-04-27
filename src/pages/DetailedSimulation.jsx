import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function DetailedSimulation() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [strategyResults, setStrategyResults] = useState(null);
  const [calibrationResults, setCalibrationResults] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('basic');

  const runSim = async (handCount = 100000) => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('detailedGameSimulation', { handsToSimulate: handCount });
      setResults(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runStrategySim = async (handCount = 100000) => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('strategicPlayerSimulation', { handsToSimulate: handCount, strategy: 'all' });
      setStrategyResults(response.data);
      setTab('strategy');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runCalibration = async (handCount = 50000) => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('calibratePayouts', { handsToSimulate: handCount });
      setCalibrationResults(response.data);
      setTab('calibration');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">← Back to Game</Link>
          <h1 className="text-4xl font-bold mb-2">Detailed Game Simulation</h1>
          <p className="text-gray-400">Category-by-category RTP analysis to identify tuning targets.</p>
        </div>

        {/* Controls */}
        <div className="mb-8 flex gap-4 flex-wrap">
          <button
            onClick={() => runSim(100000)}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold"
          >
            {loading ? 'Simulating...' : 'Basic: 100K'}
          </button>
          <button
            onClick={() => runSim(500000)}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-semibold"
          >
            {loading ? 'Simulating...' : 'Basic: 500K'}
          </button>
          <button
            onClick={() => runStrategySim(100000)}
            disabled={loading}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded-lg font-semibold"
          >
            {loading ? 'Simulating...' : 'Strategies: 100K'}
          </button>
          <button
            onClick={() => runStrategySim(500000)}
            disabled={loading}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-semibold"
          >
            {loading ? 'Simulating...' : 'Strategies: 500K'}
          </button>
          <button
            onClick={() => runCalibration(50000)}
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold"
          >
            {loading ? 'Calibrating...' : 'Calibrate Payouts'}
          </button>
        </div>

        {/* Tabs */}
        {(results || strategyResults || calibrationResults) && (
          <div className="mb-6 flex gap-2 flex-wrap">
            <button
              onClick={() => setTab('basic')}
              disabled={!results}
              className={`px-4 py-2 rounded-lg font-semibold ${tab === 'basic' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-400'}`}
            >
              Basic Breakdown
            </button>
            <button
              onClick={() => setTab('strategy')}
              disabled={!strategyResults}
              className={`px-4 py-2 rounded-lg font-semibold ${tab === 'strategy' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-400'}`}
            >
              Strategy Testing
            </button>
            <button
              onClick={() => setTab('calibration')}
              disabled={!calibrationResults}
              className={`px-4 py-2 rounded-lg font-semibold ${tab === 'calibration' ? 'bg-green-600 text-white' : 'bg-slate-700 text-gray-400'}`}
            >
              Payout Calibration
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-300">Running simulation...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-8 text-red-200">
            Error: {error}
          </div>
        )}

        {tab === 'basic' && results && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Overall Summary */}
            <div className={`rounded-lg border-2 p-6 ${
              results.summary.isCompliant
                ? 'border-green-500 bg-green-900/20'
                : 'border-orange-500 bg-orange-900/20'
            }`}>
              <h2 className="text-2xl font-bold mb-4">Overall Results</h2>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Rounds</p>
                  <p className="text-3xl font-bold">{(results.summary.totalRounds / 1000).toFixed(0)}K</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Bets</p>
                  <p className="text-2xl font-bold">${(results.summary.totalBets / 1000).toFixed(0)}K</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Payouts</p>
                  <p className="text-2xl font-bold">${(results.summary.totalPayouts / 1000).toFixed(0)}K</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Overall RTP</p>
                  <p className={`text-3xl font-bold ${
                    results.summary.isCompliant ? 'text-green-400' : 'text-orange-400'
                  }`}>
                    {results.summary.overallRTP}
                  </p>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-2 gap-6">
              {/* Hand Bets */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Carded Hands</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">RTP</span>
                    <span className="font-bold text-yellow-400">{results.categoryBreakdown.hand.rtp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contribution</span>
                    <span className="font-bold">{results.categoryBreakdown.hand.contribution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win Rate</span>
                    <span className="font-bold">100%</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Payouts</span>
                    <span>${results.categoryBreakdown.hand.payouts}</span>
                  </div>
                </div>
              </div>

              {/* Rank Bets */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Hand Rank</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">RTP</span>
                    <span className="font-bold text-blue-400">{results.categoryBreakdown.rank.rtp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contribution</span>
                    <span className="font-bold">{results.categoryBreakdown.rank.contribution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win Rate</span>
                    <span className="font-bold">{results.categoryBreakdown.rank.winRate}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Payouts</span>
                    <span>${results.categoryBreakdown.rank.payouts}</span>
                  </div>
                </div>
              </div>

              {/* Color Board */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Color Board</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">RTP</span>
                    <span className="font-bold text-purple-400">{results.categoryBreakdown.color.rtp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contribution</span>
                    <span className="font-bold">{results.categoryBreakdown.color.contribution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win Rate</span>
                    <span className="font-bold">{results.categoryBreakdown.color.winRate}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Payouts</span>
                    <span>${results.categoryBreakdown.color.payouts}</span>
                  </div>
                </div>
              </div>

              {/* Low/High */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Low / High</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">RTP</span>
                    <span className="font-bold text-green-400">{results.categoryBreakdown.lowHigh.rtp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contribution</span>
                    <span className="font-bold">{results.categoryBreakdown.lowHigh.contribution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win Rate</span>
                    <span className="font-bold">{results.categoryBreakdown.lowHigh.winRate}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Payouts</span>
                    <span>${results.categoryBreakdown.lowHigh.payouts}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rank Details */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Hand Rank RTP by Type</h3>
              <div className="grid grid-cols-3 gap-4">
                {results.categoryBreakdown.rank.byRank.map(r => (
                  <div key={r.rank} className="bg-slate-900/50 rounded p-3">
                    <p className="font-bold text-sm mb-2">{r.rank}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-gray-400">
                        <span>RTP:</span>
                        <span className="font-bold text-blue-400">{r.rtp}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Wins:</span>
                        <span>{r.wins}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Payouts:</span>
                        <span>${r.payouts}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Color Details */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Color Board RTP by Outcome</h3>
              <div className="grid grid-cols-6 gap-4">
                {results.categoryBreakdown.color.byColor.map(c => (
                  <div key={c.color} className="bg-slate-900/50 rounded p-3">
                    <p className="font-bold text-sm mb-2">{c.color}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-gray-400">
                        <span>RTP:</span>
                        <span className="font-bold text-purple-400">{c.rtp}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Wins:</span>
                        <span>{c.wins}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Payouts:</span>
                        <span>${c.payouts}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* STRATEGY TESTING TAB */}
        {tab === 'strategy' && strategyResults && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Recommendation */}
            <div className={`rounded-lg border-2 p-6 ${
              strategyResults.recommendation.includes('EXPLOITABLE')
                ? 'border-red-500 bg-red-900/20'
                : strategyResults.recommendation.includes('SLIGHTLY')
                ? 'border-orange-500 bg-orange-900/20'
                : 'border-green-500 bg-green-900/20'
            }`}>
              <h2 className="text-2xl font-bold mb-4">Exploitation Risk Assessment</h2>
              <p className="text-lg">{strategyResults.recommendation}</p>
            </div>

            {/* Strategy Comparison */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-6">Strategy Comparison (Best Player vs Casual)</h3>
              <div className="space-y-4">
                {Object.entries(strategyResults.strategies).map(([strategyName, data]) => {
                  const rtp = parseFloat(data.rtp);
                  const isExploitable = rtp > 100;
                  
                  return (
                    <div key={strategyName} className={`rounded-lg p-4 border ${
                      isExploitable ? 'border-red-600/50 bg-red-900/20' : 'border-slate-600 bg-slate-900/30'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-lg">{strategyName}</h4>
                        <span className={`text-2xl font-black ${
                          isExploitable ? 'text-red-400' : 'text-green-400'
                        }`}>{data.rtp}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div className="bg-slate-900/50 p-3 rounded">
                          <p className="text-gray-400">Avg Bet/Round</p>
                          <p className="font-bold">${data.avgBetPerRound}</p>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded">
                          <p className="text-gray-400">Avg Payout/Round</p>
                          <p className="font-bold">${data.avgPayoutPerRound}</p>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded">
                          <p className="text-gray-400">Casino Profit</p>
                          <p className={`font-bold ${isExploitable ? 'text-red-400' : 'text-green-400'}`}>${data.casinoProfit}</p>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded">
                          <p className="text-gray-400">Profit Margin</p>
                          <p className={`font-bold ${isExploitable ? 'text-red-400' : 'text-green-400'}`}>{data.profitMargin}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Key Insights */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Key Insights</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• <span className="font-bold">Maximum Exploitation RTP:</span> {Math.max(...Object.values(strategyResults.strategies).map(s => parseFloat(s.rtp))).toFixed(2)}%</li>
                <li>• <span className="font-bold">Most Dangerous Strategy:</span> {Object.entries(strategyResults.strategies).reduce((a, b) => parseFloat(b[1].rtp) > parseFloat(a[1].rtp) ? b : a)[0]}</li>
                <li>• <span className="font-bold">Recommended Action:</span> Reduce rank payouts by 20-30%, lower color board multipliers, and cap hedging opportunities</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* CALIBRATION TAB */}
        {tab === 'calibration' && calibrationResults && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Recommendation */}
            <div className={`rounded-lg border-2 p-6 ${
              calibrationResults.recommendation.includes('OPTIMAL')
                ? 'border-green-500 bg-green-900/20'
                : calibrationResults.recommendation.includes('EXPLOITABLE')
                ? 'border-red-500 bg-red-900/20'
                : 'border-orange-500 bg-orange-900/20'
            }`}>
              <h2 className="text-2xl font-bold mb-4">Recommended Configuration</h2>
              <p className="text-lg">{calibrationResults.recommendation}</p>
            </div>

            {/* Best Config Details */}
            {calibrationResults.bestConfiguration && (
              <div className="bg-slate-800/50 border border-green-600/50 rounded-lg p-6">
                <h3 className="text-2xl font-bold mb-6">✓ Optimal Payouts</h3>
                <div className="grid grid-cols-1 gap-6">
                  {/* Rank Payouts */}
                  <div>
                    <h4 className="font-bold text-lg mb-3 text-blue-400">Hand Rank Payouts</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(calibrationResults.bestConfiguration.payoutConfig.rankPayouts).map(([rank, payout]) => (
                        <div key={rank} className="bg-slate-900/50 rounded p-3">
                          <p className="text-sm text-gray-400">{rank}</p>
                          <p className="font-bold text-lg text-yellow-400">{payout.toFixed(2)}:1</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Color Payouts */}
                  <div>
                    <h4 className="font-bold text-lg mb-3 text-purple-400">Color Board Payouts</h4>
                    <div className="grid grid-cols-6 gap-2">
                      {Object.entries(calibrationResults.bestConfiguration.payoutConfig.colorPayouts).map(([color, payout]) => (
                        <div key={color} className="bg-slate-900/50 rounded p-3">
                          <p className="text-sm text-gray-400">{color}</p>
                          <p className="font-bold text-lg text-yellow-400">{payout.toFixed(2)}:1</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Low/High */}
                  <div>
                    <h4 className="font-bold text-lg mb-3 text-green-400">Low/High Payout</h4>
                    <div className="bg-slate-900/50 rounded p-3 w-full">
                      <p className="font-bold text-2xl text-yellow-400">{calibrationResults.bestConfiguration.payoutConfig.lowHighPayout.toFixed(2)}:1</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Config Comparison Table */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Configuration Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-2 px-2">Configuration</th>
                      <th className="text-center py-2 px-2">Naive RTP</th>
                      <th className="text-center py-2 px-2">Hedge Color RTP</th>
                      <th className="text-center py-2 px-2">Max Risk</th>
                      <th className="text-center py-2 px-2">Safe?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calibrationResults.testResults.map((result, idx) => (
                      <tr key={idx} className={`border-b border-slate-700 ${result.isSafe ? 'bg-green-900/10' : 'bg-red-900/10'}`}>
                        <td className="py-2 px-2 font-bold">{result.config}</td>
                        <td className="text-center py-2 px-2">{result.naiveRTP}</td>
                        <td className="text-center py-2 px-2">{result.hedgeColorTrendRTP}</td>
                        <td className="text-center py-2 px-2 font-bold">{result.maxRiskRTP}</td>
                        <td className="text-center py-2 px-2">{result.isSafe ? '✓' : '✗'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}