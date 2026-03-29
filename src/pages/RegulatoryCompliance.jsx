import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const GAME_SIZES = [
  { label: '100K / strategy (fast preview)', value: 100_000 },
  { label: '1M / strategy (~20s)', value: 1_000_000 },
  { label: '10M / strategy (full audit)', value: 10_000_000 },
];

function RtpBadge({ rtp }) {
  const val = parseFloat(rtp);
  if (val >= 95 && val <= 98) return <span className="text-green-400 font-bold">{rtp}</span>;
  if (val > 98) return <span className="text-red-400 font-bold">{rtp} ↑</span>;
  return <span className="text-orange-400 font-bold">{rtp} ↓</span>;
}

function DirectionIcon({ action }) {
  if (!action) return null;
  if (action.includes('INCREASE')) return <TrendingUp className="w-4 h-4 text-orange-400 inline mr-1" />;
  if (action.includes('REDUCE')) return <TrendingDown className="w-4 h-4 text-blue-400 inline mr-1" />;
  return <Minus className="w-4 h-4 text-green-400 inline mr-1" />;
}

export default function RegulatoryCompliance() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSize, setSelectedSize] = useState(1_000_000);
  const [expandedStrategy, setExpandedStrategy] = useState(null);

  const runCalibration = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await base44.functions.invoke('regulatoryCalibration', {
        gamesPerStrategy: selectedSize,
      });
      setResults(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const blended = results?.blendedResults;
  const isCompliant = blended?.aggregateRTP && parseFloat(blended.aggregateRTP) >= 95 && parseFloat(blended.aggregateRTP) <= 98;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">← Back to Game</Link>
          <h1 className="text-4xl font-bold mb-2">⚖️ Regulatory Calibration Audit</h1>
          <p className="text-gray-400">12 strategies × Monte Carlo simulation — blended RTP target: 95.0%–98.0%</p>
        </div>

        {/* Controls */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Simulation Scale</label>
              <div className="flex gap-2">
                {GAME_SIZES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setSelectedSize(s.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                      selectedSize === s.value
                        ? 'border-cyan-400 bg-cyan-900/40 text-cyan-300'
                        : 'border-slate-600 bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={runCalibration}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold disabled:bg-gray-700 flex items-center gap-2 transition-all"
            >
              <Play className="w-4 h-4" />
              {loading ? 'Running Simulation...' : 'Run Calibration Audit'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6 text-red-200">{error}</div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-14 h-14 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-300 text-lg">Simulating {(selectedSize * 12).toLocaleString()} games across 12 strategies...</p>
            <p className="text-gray-500 text-sm mt-2">This may take up to 60 seconds for 10M scale</p>
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Blended Summary */}
            <div className={`rounded-xl border-2 p-6 ${isCompliant ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'}`}>
              <h2 className="text-2xl font-bold mb-4">
                {isCompliant ? '🟢 Blended RTP: COMPLIANT' : '🔴 Blended RTP: ADJUSTMENT NEEDED'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Blended RTP</p>
                  <p className={`text-3xl font-black ${isCompliant ? 'text-green-400' : 'text-red-400'}`}>{blended.aggregateRTP}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">House Edge</p>
                  <p className="text-3xl font-black text-yellow-400">{blended.aggregateHouseEdge}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Compliant Strategies</p>
                  <p className="text-3xl font-black text-blue-400">{blended.compliantStrategies}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Games Run</p>
                  <p className="text-2xl font-black text-white">{results.config.totalGamesSimulated.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h3 className="text-xl font-bold mb-4">Category Blended RTP</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(results.categoryBlendedRTP).map(([cat, rtp]) => {
                  const val = parseFloat(rtp);
                  const color = val >= 95 && val <= 98 ? 'text-green-400' : val > 98 ? 'text-red-400' : 'text-orange-400';
                  return (
                    <div key={cat} className="bg-slate-900/50 rounded-lg p-4 text-center">
                      <p className="text-gray-400 text-sm mb-1 capitalize">{cat}</p>
                      <p className={`text-2xl font-black ${color}`}>{rtp}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {val >= 95 && val <= 98 ? '✓ In range' : val > 98 ? '↓ Reduce payouts' : '↑ Increase payouts'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calibration Recommendations */}
            {results.calibrationRecommendations && results.calibrationRecommendations.length > 0 && (
              <div className="bg-slate-800/50 border border-yellow-700/50 rounded-xl p-5">
                <h3 className="text-xl font-bold mb-4 text-yellow-400">📋 Calibration Recommendations</h3>
                <div className="space-y-3">
                  {results.calibrationRecommendations.map((rec, i) => (
                    <div key={i} className="bg-slate-900/50 rounded-lg p-4 flex items-start gap-4">
                      <div className="flex-shrink-0 w-20">
                        <span className="text-sm font-bold text-gray-300 capitalize">{rec.category || '—'}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white"><DirectionIcon action={rec.action} />{rec.action}</p>
                        {rec.currentRTP && (
                          <p className="text-sm text-gray-400 mt-1">
                            Current: <span className="text-orange-400">{rec.currentRTP}</span>
                            {' → '}Target: <span className="text-green-400">{rec.targetRTP}</span>
                            {rec.scaleFactor && <span className="ml-3 text-cyan-400">Scale factor: ×{rec.scaleFactor}</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-Strategy Results Table */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-700">
                <h3 className="text-xl font-bold">Individual Strategy Results</h3>
                <p className="text-gray-400 text-sm mt-1">Click a row to expand category breakdown + calibration details</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/50">
                      <th className="px-4 py-3 text-left">Strategy</th>
                      <th className="px-4 py-3 text-right">Bet/Game</th>
                      <th className="px-4 py-3 text-right">RTP</th>
                      <th className="px-4 py-3 text-right">House Edge</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-left">Calibration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.strategyResults.map((strat) => {
                      const isExp = expandedStrategy === strat.strategy;
                      return (
                        <>
                          <tr
                            key={strat.strategy}
                            onClick={() => setExpandedStrategy(isExp ? null : strat.strategy)}
                            className={`border-b border-slate-700 cursor-pointer transition-colors ${isExp ? 'bg-slate-700/60' : 'hover:bg-slate-700/30'}`}
                          >
                            <td className="px-4 py-3 font-semibold text-white">{strat.strategy}</td>
                            <td className="px-4 py-3 text-right text-gray-300">${strat.totalBetPerGame}</td>
                            <td className="px-4 py-3 text-right">
                              <RtpBadge rtp={strat.rtp} />
                            </td>
                            <td className="px-4 py-3 text-right text-gray-400">{strat.houseEdge}</td>
                            <td className="px-4 py-3 text-center">
                              {strat.compliant
                                ? <span className="inline-flex items-center gap-1 text-green-400 text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> PASS</span>
                                : <span className="inline-flex items-center gap-1 text-red-400 text-xs font-bold"><AlertCircle className="w-3.5 h-3.5" /> FAIL</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400">{strat.calibration?.direction}</td>
                          </tr>
                          {isExp && (
                            <tr key={strat.strategy + '_exp'} className="bg-slate-900/60 border-b border-slate-700">
                              <td colSpan={6} className="px-6 py-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                  {Object.entries(strat.categoryBreakdown).map(([cat, data]) => {
                                    if (!data) return null;
                                    return (
                                      <div key={cat} className="bg-slate-800/60 rounded-lg p-3">
                                        <p className="text-gray-400 text-xs capitalize mb-1">{cat}</p>
                                        <p className="font-bold text-white"><RtpBadge rtp={data.rtp} /></p>
                                        <p className="text-gray-500 text-xs">{data.betShare} of bets</p>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="bg-slate-800/40 rounded-lg p-3 text-xs text-gray-300 space-y-1">
                                  <p><span className="text-gray-500">Games simulated:</span> {strat.gamesSimulated.toLocaleString()}</p>
                                  <p><span className="text-gray-500">Target RTP:</span> {strat.calibration.targetRTP} &nbsp;|&nbsp; <span className="text-gray-500">Current:</span> {strat.calibration.currentRTP}</p>
                                  {strat.calibration.scaleFactor && (
                                    <p><span className="text-gray-500">Scale factor to reach target:</span> <span className="text-cyan-400 font-bold">×{strat.calibration.scaleFactor}</span></p>
                                  )}
                                  <p className="font-semibold text-yellow-300 mt-1">{strat.calibration.direction}</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit metadata */}
            <div className="text-xs text-gray-500 text-right">
              Audit run: {new Date(results.auditDate).toLocaleString()} &nbsp;|&nbsp;
              {results.config.gamesPerStrategy.toLocaleString()} games × {results.config.totalStrategies} strategies &nbsp;|&nbsp;
              Target: {results.config.targetRTP}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}