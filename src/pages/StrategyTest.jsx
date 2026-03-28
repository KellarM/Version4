import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';

export default function StrategyTest() {
  const [results, setResults] = useState([]);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">
            ← Back to Game
          </Link>
          <h1 className="text-4xl font-bold mb-2">Strategy Betting Test</h1>
          <p className="text-gray-400 mb-4">
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

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-8 text-red-200">
            Error: {error}
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
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
                    const isPositive = profit >= 0;

                    return (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b border-slate-700 hover:bg-slate-700/30 cursor-pointer"
                        onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                      >
                        <td className="px-4 py-3 font-bold">{result.gameCount.toLocaleString()}</td>
                        <td className={`px-4 py-3 text-right font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}{profit.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-right ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}{parseFloat(result.avgProfitPerGame).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">${parseFloat(result.finalBalance).toFixed(2)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {roi >= 0 ? '+' : ''}{roi}%
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