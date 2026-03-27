import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function DetailedSimulation() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">← Back to Game</Link>
          <h1 className="text-4xl font-bold mb-2">Detailed Game Simulation</h1>
          <p className="text-gray-400">Category-by-category RTP analysis to identify tuning targets.</p>
        </div>

        {/* Controls */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={() => runSim(100000)}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold"
          >
            {loading ? 'Simulating...' : '100K Hands'}
          </button>
          <button
            onClick={() => runSim(500000)}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-semibold"
          >
            {loading ? 'Simulating...' : '500K Hands'}
          </button>
        </div>

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

        {results && (
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
      </div>
    </div>
  );
}