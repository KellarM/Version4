import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';

const TRIAL_SIZES = [
  { label: '1M games',   value: 1_000_000 },
  { label: '5M games',   value: 5_000_000 },
  { label: '10M games',  value: 10_000_000 },
  { label: '100M games', value: 100_000_000 },
];

function RTPBadge({ rtp }) {
  const val = parseFloat(rtp);
  if (val >= 94 && val <= 99) return <span className="text-green-400 font-bold">{rtp}</span>;
  if (val > 99) return <span className="text-red-400 font-bold">{rtp} ↑</span>;
  return <span className="text-orange-400 font-bold">{rtp} ↓</span>;
}

function DeltaBadge({ delta }) {
  const val = parseFloat(delta);
  if (Math.abs(val) < 0.5) return <span className="text-green-400 text-xs">≈ on target</span>;
  if (val > 0) return <span className="text-orange-400 text-xs">+{val} needed</span>;
  return <span className="text-blue-400 text-xs">{val} reduce</span>;
}

export default function FrequencyProfiler() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSize, setSelectedSize] = useState(1_000_000);

  const runProfiler = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await base44.functions.invoke('winFrequencyProfiler', { games: selectedSize });
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

        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">← Back to Game</Link>
          <h1 className="text-4xl font-bold mb-2">📊 Win Frequency Profiler</h1>
          <p className="text-gray-400">Run the real game engine to measure empirical win frequencies and calculate mathematically correct payout multipliers.</p>
        </div>

        {/* Controls */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Simulation Size</label>
              <div className="flex gap-2 flex-wrap">
                {TRIAL_SIZES.map(s => (
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
              <p className="text-yellow-400/60 text-xs mt-2">⚠ Large simulations (10M+) may take 60–120s. Server CPU limits apply.</p>
            </div>
            <button
              onClick={runProfiler}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold disabled:bg-gray-700 flex items-center gap-2 transition-all"
            >
              <Play className="w-4 h-4" />
              {loading ? 'Profiling...' : 'Run Profiler'}
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
            <p className="text-gray-300 text-lg">Running {selectedSize.toLocaleString()} games through real engine...</p>
            <p className="text-gray-500 text-sm mt-2">Evaluating all 10 fixed hands against actual 32-card deck deals</p>
          </div>
        )}

        {results && !loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Summary banner */}
            <div className="bg-slate-800/50 border border-cyan-700/50 rounded-xl p-5">
              <div className="flex flex-wrap gap-6 items-center">
                <div>
                  <p className="text-gray-400 text-sm">Games Simulated</p>
                  <p className="text-2xl font-black text-white">{results.gamesSimulated.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Target RTP</p>
                  <p className="text-2xl font-black text-cyan-400">{results.targetRTP}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Combined Hand Implied RTP</p>
                  <p className="text-2xl font-black text-red-400">{results.summary?.hand_combined_implied_RTP}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Should be ~96.5% per hand if payouts were correct</p>
                </div>
              </div>
            </div>

            {/* Hand Frequencies */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-xl font-bold">🃏 Hand Win Frequencies</h2>
                <p className="text-gray-400 text-sm mt-1">How often each fixed hand wins vs the real 32-card deck</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-700 text-gray-400 text-xs">
                      <th className="px-4 py-3 text-left">Hand</th>
                      <th className="px-4 py-3 text-left">Cards</th>
                      <th className="px-4 py-3 text-right">Win Freq</th>
                      <th className="px-4 py-3 text-right">Current Payout</th>
                      <th className="px-4 py-3 text-right">Implied RTP</th>
                      <th className="px-4 py-3 text-right">Fair Payout @ 96.5%</th>
                      <th className="px-4 py-3 text-right">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.handFrequencies?.map(h => (
                      <tr key={h.handId} className="border-b border-slate-700 hover:bg-slate-700/20">
                        <td className="px-4 py-3 font-bold text-yellow-400">H{h.handId}</td>
                        <td className="px-4 py-3 text-gray-300 font-mono text-xs">{h.cards}</td>
                        <td className="px-4 py-3 text-right text-white font-semibold">{h.winFrequency}</td>
                        <td className="px-4 py-3 text-right text-gray-300">{h.currentPayout}x</td>
                        <td className="px-4 py-3 text-right"><RTPBadge rtp={h.impliedRTP} /></td>
                        <td className="px-4 py-3 text-right text-cyan-300 font-bold">{h.fairPayoutAt965}x</td>
                        <td className="px-4 py-3 text-right"><DeltaBadge delta={h.deltaVsCurrent} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rank Frequencies */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-xl font-bold">🎴 Rank Hit Frequencies</h2>
                <p className="text-gray-400 text-sm mt-1">How often each poker rank is the winning board rank (32-card deck actual frequencies)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-700 text-gray-400 text-xs">
                      <th className="px-4 py-3 text-left">Rank</th>
                      <th className="px-4 py-3 text-right">Hits</th>
                      <th className="px-4 py-3 text-right">Frequency</th>
                      <th className="px-4 py-3 text-right">Current Payout</th>
                      <th className="px-4 py-3 text-right">Implied RTP</th>
                      <th className="px-4 py-3 text-right">Fair Payout @ 96.5%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.rankFrequencies?.map(r => (
                      <tr key={r.rank} className="border-b border-slate-700 hover:bg-slate-700/20">
                        <td className="px-4 py-3 font-semibold text-white">{r.rank}</td>
                        <td className="px-4 py-3 text-right text-gray-400">{r.hits.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-white font-semibold">{r.frequency}</td>
                        <td className="px-4 py-3 text-right text-gray-300">{r.currentPayout != null ? r.currentPayout + 'x' : 'Progressive'}</td>
                        <td className="px-4 py-3 text-right"><RTPBadge rtp={r.impliedRTP !== '—' ? r.impliedRTP : '—'} /></td>
                        <td className="px-4 py-3 text-right text-cyan-300 font-bold">{r.fairPayoutAt965}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Color + River */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Color Frequencies */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                  <h2 className="text-xl font-bold">🎨 Color Board Frequencies</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-700 text-gray-400 text-xs">
                      <th className="px-4 py-3 text-left">Color</th>
                      <th className="px-4 py-3 text-right">Frequency</th>
                      <th className="px-4 py-3 text-right">Current</th>
                      <th className="px-4 py-3 text-right">Implied RTP</th>
                      <th className="px-4 py-3 text-right">Fair @ 96.5%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.colorFrequencies?.map(c => (
                      <tr key={c.color} className="border-b border-slate-700 hover:bg-slate-700/20">
                        <td className="px-4 py-3 font-bold">
                          <span className={c.color.includes('R') ? 'text-red-400' : 'text-gray-200'}>{c.color}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-white">{c.frequency}</td>
                        <td className="px-4 py-3 text-right text-gray-300">{c.currentPayout}x</td>
                        <td className="px-4 py-3 text-right"><RTPBadge rtp={c.impliedRTP} /></td>
                        <td className="px-4 py-3 text-right text-cyan-300 font-bold">{c.fairPayoutAt965}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* River Frequencies */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                  <h2 className="text-xl font-bold">🌊 River Low/High Frequencies</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-700 text-gray-400 text-xs">
                      <th className="px-4 py-3 text-left">Outcome</th>
                      <th className="px-4 py-3 text-right">Frequency</th>
                      <th className="px-4 py-3 text-right">Current</th>
                      <th className="px-4 py-3 text-right">Implied RTP</th>
                      <th className="px-4 py-3 text-right">Fair @ 96.5%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.riverFrequencies && Object.entries(results.riverFrequencies).map(([key, rv]) => (
                      <tr key={key} className="border-b border-slate-700 hover:bg-slate-700/20">
                        <td className="px-4 py-3 font-bold">
                          <span className={key === 'LOW' ? 'text-green-400' : 'text-blue-400'}>{key}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-white">{rv.frequency}</td>
                        <td className="px-4 py-3 text-right text-gray-300">{rv.currentPayout}x</td>
                        <td className="px-4 py-3 text-right"><RTPBadge rtp={rv.impliedRTP} /></td>
                        <td className="px-4 py-3 text-right text-cyan-300 font-bold">{rv.fairPayoutAt965}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-xs text-gray-500 text-right">
              Profiled: {new Date().toLocaleString()} · {results.gamesSimulated.toLocaleString()} games · Real 32-card engine
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}