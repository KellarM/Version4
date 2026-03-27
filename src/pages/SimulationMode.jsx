import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';

export default function SimulationMode() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runSimulation = async (handCount = 2000000) => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('simulateGameHands', { handsToSimulate: handCount });
      setResults(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Game Simulation & Analysis</h1>
        <p className="text-gray-400 mb-8">Run statistical simulations to verify game odds and regulatory compliance.</p>

        {/* Controls */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={() => runSimulation(100000)}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold"
          >
            {loading ? 'Simulating...' : 'Test 100K Hands'}
          </button>
          <button
            onClick={() => runSimulation(2000000)}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-semibold"
          >
            {loading ? 'Simulating...' : 'Test 2M Hands'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-300">Running simulation... this may take a moment</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-8 text-red-200">
            Error: {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Compliance Summary */}
            <div className={`rounded-lg border-2 p-6 ${
              results.summary.isCompliant
                ? 'border-green-500 bg-green-900/20'
                : 'border-red-500 bg-red-900/20'
            }`}>
              <h2 className="text-2xl font-bold mb-4">Compliance Analysis</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Total Hands Simulated</p>
                  <p className="text-3xl font-bold">{(results.summary.totalHandsSimulated / 1000000).toFixed(1)}M</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Overall RTP</p>
                  <p className={`text-3xl font-bold ${
                    results.summary.isCompliant ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {results.summary.overallRTP}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-300">{results.summary.recommendation}</p>
            </div>

            {/* Summary Stats */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Summary Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 rounded p-4">
                  <p className="text-gray-400 text-sm mb-1">Total Bets</p>
                  <p className="text-2xl font-bold">${(results.summary.totalBets / 1000000).toFixed(1)}M</p>
                </div>
                <div className="bg-slate-900/50 rounded p-4">
                  <p className="text-gray-400 text-sm mb-1">Total Payouts</p>
                  <p className="text-2xl font-bold">${(results.summary.totalPayouts / 1000000).toFixed(1)}M</p>
                </div>
                <div className="bg-slate-900/50 rounded p-4">
                  <p className="text-gray-400 text-sm mb-1">Casino Profit</p>
                  <p className="text-2xl font-bold text-green-400">${(results.summary.casinoProfit / 1000).toFixed(0)}K</p>
                </div>
                <div className="bg-slate-900/50 rounded p-4">
                  <p className="text-gray-400 text-sm mb-1">Avg Profit/Round</p>
                  <p className="text-2xl font-bold">${results.summary.avgProfitPerRound}</p>
                </div>
              </div>
            </div>

            {/* Sample Rounds */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Sample Round Results</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-2 px-2">Round</th>
                      <th className="text-right py-2 px-2">Bets</th>
                      <th className="text-right py-2 px-2">Payouts</th>
                      <th className="text-right py-2 px-2">P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.sampleRounds.map((round, idx) => (
                      <tr key={idx} className="border-b border-slate-700 hover:bg-slate-900/30">
                        <td className="py-2 px-2 text-gray-400">#{round.round}</td>
                        <td className="text-right py-2 px-2">${round.bets}</td>
                        <td className="text-right py-2 px-2">${round.payouts.toFixed(2)}</td>
                        <td className={`text-right py-2 px-2 font-bold ${round.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {round.profit >= 0 ? '+' : ''}${round.profit.toFixed(2)}
                        </td>
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