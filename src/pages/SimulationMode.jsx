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
              results.analysis.conclusion.isCompliant
                ? 'border-green-500 bg-green-900/20'
                : 'border-red-500 bg-red-900/20'
            }`}>
              <h2 className="text-2xl font-bold mb-4">Compliance Analysis</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Average RTP</p>
                  <p className="text-3xl font-bold">{results.analysis.conclusion.averagePayout}%</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <p className={`text-xl font-bold ${
                    results.analysis.conclusion.isCompliant ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {results.analysis.conclusion.isCompliant ? '✓ COMPLIANT' : '✗ NON-COMPLIANT'}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm">{results.analysis.conclusion.recommendation}</p>
            </div>

            {/* Payout Percentages */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Payout Percentages by Bet Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 rounded p-4">
                  <p className="text-gray-400 text-sm mb-1">Carded Hands</p>
                  <p className="text-2xl font-bold">{results.stats.payoutPercentages.hand}%</p>
                </div>
                <div className="bg-slate-900/50 rounded p-4">
                  <p className="text-gray-400 text-sm mb-1">Color Board</p>
                  <p className="text-2xl font-bold">{results.stats.payoutPercentages.color}%</p>
                </div>
                <div className="bg-slate-900/50 rounded p-4">
                  <p className="text-gray-400 text-sm mb-1">Hand Rank</p>
                  <p className="text-2xl font-bold">{results.stats.payoutPercentages.rank}%</p>
                </div>
                <div className="bg-slate-900/50 rounded p-4">
                  <p className="text-gray-400 text-sm mb-1">Low/High</p>
                  <p className="text-2xl font-bold">{results.stats.payoutPercentages.lowHigh}%</p>
                </div>
              </div>
            </div>

            {/* Hand Frequency */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Winning Hand Frequency ({results.stats.totalHands.toLocaleString()} hands)</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                {Object.entries(results.analysis.handFrequency).map(([hand, freq]) => (
                  <div key={hand} className="bg-slate-900/50 rounded p-3">
                    <p className="text-gray-400">Hand {hand}</p>
                    <p className="text-lg font-bold">{freq}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Color Frequency */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Color Board Winning Combinations</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                {Object.entries(results.analysis.colorFrequency).map(([key, freq]) => (
                  <div key={key} className="bg-slate-900/50 rounded p-3">
                    <p className={`font-bold ${key.includes('R') ? 'text-red-400' : 'text-gray-300'}`}>{key}</p>
                    <p className="text-gray-400">{freq}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw Stats */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Raw Statistics</h3>
              <pre className="bg-slate-900 rounded p-4 text-xs overflow-auto max-h-96 text-gray-300">
                {JSON.stringify(results.stats, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}