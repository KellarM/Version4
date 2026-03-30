import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, RefreshCw, Zap } from 'lucide-react';

const RTP_LOW = 95;
const RTP_HIGH = 98;

function RTPBadge({ value }) {
  const num = parseFloat(value);
  const compliant = num >= RTP_LOW && num <= RTP_HIGH;
  const tooLow = num < RTP_LOW;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
      ${compliant ? 'bg-green-800/60 text-green-300' : tooLow ? 'bg-red-800/60 text-red-300' : 'bg-orange-800/60 text-orange-300'}`}>
      {compliant ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {value}
    </span>
  );
}

function CategoryCard({ label, data, color }) {
  const rtp = parseFloat(data.rtp);
  const tooLow = rtp < RTP_LOW;
  const tooHigh = rtp > RTP_HIGH;
  return (
    <div className={`rounded-xl border p-4 ${tooHigh ? 'border-orange-500/60 bg-orange-900/10' : tooLow ? 'border-red-500/60 bg-red-900/10' : 'border-green-500/60 bg-green-900/10'}`}>
      <div className="flex justify-between items-start mb-2">
        <span className={`font-bold text-sm ${color}`}>{label}</span>
        <RTPBadge value={data.rtp} />
      </div>
      <div className="text-xs text-gray-400">Bet share: <span className="text-white font-semibold">{data.betShare}</span></div>
      <div className="mt-2 text-xs">
        {tooLow && <span className="text-red-400 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Payouts too low — increase multipliers</span>}
        {tooHigh && <span className="text-orange-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Payouts too high — reduce multipliers</span>}
        {!tooLow && !tooHigh && <span className="text-green-400">✓ Within target range</span>}
      </div>
    </div>
  );
}

export default function PayoutCalibration() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [gamesRun, setGamesRun] = useState(null);

  const runCalibration = async (games) => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await base44.functions.invoke('calibratePayouts', { gamesToSimulate: games });
      setResults(response.data);
      setGamesRun(games);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const overallRTP = results ? parseFloat(results.currentState.overallRTP) : null;
  const suggestedRTP = results ? parseFloat(results.verification.theoreticalRTPWithSuggestedPayouts) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">← Back to Game</Link>
          <h1 className="text-4xl font-bold mb-2">Payout Calibration Engine</h1>
          <p className="text-gray-400">Monte Carlo simulation to mathematically derive multipliers that achieve 95–98% RTP.</p>
        </div>

        {/* Controls */}
        <div className="mb-8">
          <div className="flex gap-3 flex-wrap items-center mb-3">
            {[50000, 100000, 250000, 500000].map(n => (
              <button
                key={n}
                onClick={() => runCalibration(n)}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg font-semibold bg-slate-700 hover:bg-slate-600 disabled:bg-gray-700 disabled:text-gray-500 text-sm transition-all"
              >
                {n >= 1000000 ? `${n / 1000000}M` : `${n / 1000}K`} Games
              </button>
            ))}
            <button
              onClick={() => runCalibration(500000)}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg font-bold bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-black text-sm transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              500K (Recommended)
            </button>
          </div>
          <p className="text-gray-500 text-xs flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
            Max capped at 500K — larger simulations time out and crash the page.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex flex-col items-center gap-4">
              <RefreshCw className="w-12 h-12 text-yellow-400 animate-spin" />
              <p className="text-gray-300 text-lg">Running Monte Carlo simulation...</p>
              <p className="text-gray-500 text-sm">500K games takes ~5–8 seconds</p>
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
        {results && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

            {/* Top Summary */}
            <div className="grid grid-cols-2 gap-4">
              {/* Current State */}
              <div className={`rounded-xl border-2 p-6 ${results.currentState.isCompliant ? 'border-green-500 bg-green-900/10' : 'border-red-500 bg-red-900/10'}`}>
                <h2 className="text-lg font-bold text-gray-300 mb-1">Current RTP</h2>
                <p className={`text-5xl font-black mb-3 ${results.currentState.isCompliant ? 'text-green-400' : 'text-red-400'}`}>
                  {results.currentState.overallRTP}
                </p>
                <p className="text-sm text-gray-400">{gamesRun?.toLocaleString()} games simulated</p>
                {!results.currentState.isCompliant && (
                  <p className="mt-2 text-red-300 text-sm flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {overallRTP < RTP_LOW ? `${(RTP_LOW - overallRTP).toFixed(1)}% below target — casino keeping too much` : `${(overallRTP - RTP_HIGH).toFixed(1)}% above target — casino losing money`}
                  </p>
                )}
              </div>

              {/* Suggested State */}
              <div className={`rounded-xl border-2 p-6 ${results.verification.isCompliant ? 'border-green-500 bg-green-900/10' : 'border-orange-500 bg-orange-900/10'}`}>
                <h2 className="text-lg font-bold text-gray-300 mb-1">Projected RTP After Adjustments</h2>
                <p className={`text-5xl font-black mb-3 ${results.verification.isCompliant ? 'text-green-400' : 'text-orange-400'}`}>
                  {results.verification.theoreticalRTPWithSuggestedPayouts}
                </p>
                <p className="text-sm text-gray-400">Target: {results.verification.targetRange}</p>
                {results.verification.isCompliant && (
                  <p className="mt-2 text-green-300 text-sm flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Suggested payouts will hit target range
                  </p>
                )}
              </div>
            </div>

            {/* Category Breakdown */}
            <div>
              <h2 className="text-xl font-bold mb-3">Current RTP by Bet Category</h2>
              <div className="grid grid-cols-4 gap-3">
                <CategoryCard label="Carded Hands" data={results.currentState.categories.hand}  color="text-blue-400" />
                <CategoryCard label="Hand Rank"    data={results.currentState.categories.rank}  color="text-purple-400" />
                <CategoryCard label="Color Board"  data={results.currentState.categories.color} color="text-red-400" />
                <CategoryCard label="Low / High"   data={results.currentState.categories.lh}    color="text-teal-400" />
              </div>
            </div>

            {/* Scaling Factors */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h2 className="text-xl font-bold mb-3">Scaling Factors Applied</h2>
              <p className="text-gray-400 text-sm mb-4">Each category's payouts are multiplied by this factor to reach the 96.5% midpoint target.</p>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(results.detail.scalingFactors).map(([cat, factor]) => {
                  const labels = { hand: 'Carded Hands', rank: 'Hand Rank', color: 'Color Board', lh: 'Low / High' };
                  const increase = factor > 1;
                  return (
                    <div key={cat} className="bg-slate-900/60 rounded-lg p-3 text-center">
                      <p className="text-gray-400 text-xs mb-1">{labels[cat]}</p>
                      <p className={`text-2xl font-black ${increase ? 'text-green-400' : 'text-orange-400'}`}>{factor}×</p>
                      <p className={`text-xs mt-1 ${increase ? 'text-green-500' : 'text-orange-500'}`}>
                        {increase ? `+${((factor - 1) * 100).toFixed(0)}% increase` : `-${((1 - factor) * 100).toFixed(0)}% decrease`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Suggested Payouts */}
            <div className="grid grid-cols-2 gap-4">

              {/* Hand Payouts */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h3 className="text-lg font-bold mb-3 text-blue-400">Carded Hand Payouts</h3>
                <div className="space-y-1.5">
                  {results.suggestedPayouts.hand.map(h => (
                    <div key={h.id} className="flex justify-between items-center text-sm bg-slate-900/40 rounded px-3 py-1.5">
                      <span className="text-gray-400">Hand #{h.id}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-red-400 line-through">{h.current}:1</span>
                        <span className="text-green-400 font-bold">{h.suggested}:1</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rank Payouts */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h3 className="text-lg font-bold mb-3 text-purple-400">Hand Rank Payouts</h3>
                <div className="space-y-1.5">
                  {Object.entries(results.detail.rankByRank).map(([rank, d]) => (
                    <div key={rank} className="flex justify-between items-center text-sm bg-slate-900/40 rounded px-3 py-1.5">
                      <div>
                        <span className="text-gray-300">{rank}</span>
                        <span className="text-gray-500 text-xs ml-2">({d.winFrequency})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {d.currentPayout !== null ? (
                          <>
                            <span className="text-red-400 line-through">{d.currentPayout}:1</span>
                            <span className="text-green-400 font-bold">{d.suggested}:1</span>
                          </>
                        ) : (
                          <span className="text-yellow-400 font-bold">Progressive</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color Payouts */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h3 className="text-lg font-bold mb-3 text-red-400">Color Board Payouts</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(results.detail.colorByColor).map(([key, d]) => (
                    <div key={key} className="bg-slate-900/40 rounded px-3 py-2 text-sm">
                      <div className="flex justify-between">
                        <span className={`font-bold ${key.includes('R') ? 'text-red-400' : 'text-gray-300'}`}>{key}</span>
                        <span className="text-gray-500 text-xs">{d.winProbability}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-red-400 line-through text-xs">{d.currentPayout}:1</span>
                        <span className="text-green-400 font-bold text-sm">{d.suggested}:1</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Low/High + Theoretical Breakdown */}
              <div className="flex flex-col gap-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                  <h3 className="text-lg font-bold mb-3 text-teal-400">Low / High Payout</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-gray-400 text-xs">Current</p>
                      <p className="text-red-400 text-2xl font-black line-through">0.35:1</p>
                    </div>
                    <div className="text-2xl text-gray-500">→</div>
                    <div className="text-center">
                      <p className="text-gray-400 text-xs">Suggested</p>
                      <p className="text-green-400 text-2xl font-black">{results.suggestedPayouts.lowHigh}:1</p>
                    </div>
                  </div>
                </div>

                {/* Theoretical RTP per category after fix */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                  <h3 className="text-lg font-bold mb-3 text-yellow-400">Projected Category RTPs</h3>
                  <div className="space-y-1.5">
                    {Object.entries(results.verification.categoryTheoretical).map(([cat, rtp]) => {
                      const labels = { hand: 'Carded Hands', rank: 'Hand Rank', color: 'Color Board', lh: 'Low / High' };
                      return (
                        <div key={cat} className="flex justify-between text-sm">
                          <span className="text-gray-400">{labels[cat]}</span>
                          <RTPBadge value={rtp} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Callout */}
            <div className={`rounded-xl border-2 p-6 ${results.verification.isCompliant ? 'border-green-500 bg-green-900/10' : 'border-orange-500 bg-orange-900/10'}`}>
              <h2 className="text-xl font-bold mb-2">
                {results.verification.isCompliant ? '✓ Ready to Apply' : '⚠ Further Tuning Needed'}
              </h2>
              <p className="text-gray-300 text-sm">
                {results.verification.isCompliant
                  ? `The suggested multipliers above will bring the overall RTP to ${results.verification.theoreticalRTPWithSuggestedPayouts}, firmly within the 95–98% compliance range. Apply these values to the live game payout tables in RapidFireGame.jsx and detailedHandSimulation.js.`
                  : `The auto-suggested payouts project an RTP of ${results.verification.theoreticalRTPWithSuggestedPayouts}. Run a larger simulation (10M games) for more accurate calibration, or manually fine-tune the multipliers above.`}
              </p>
              {results.verification.isCompliant && (
                <div className="mt-4 bg-slate-900/60 rounded-lg p-4 text-xs text-gray-300 font-mono space-y-1">
                  <p className="text-yellow-400 font-bold mb-2">// Apply to RapidFireGame.jsx settle() and detailedHandSimulation rankPayoutMap:</p>
                  {Object.entries(results.suggestedPayouts.rank).map(([rank, val]) => val !== null && (
                    <p key={rank}>'{rank}': {val},</p>
                  ))}
                  <p className="text-teal-400 mt-2">// Low/High: {results.suggestedPayouts.lowHigh}</p>
                  <p className="text-blue-400 mt-2">// Color Board: {JSON.stringify(results.suggestedPayouts.color)}</p>
                </div>
              )}
            </div>

          </motion.div>
        )}
      </div>
    </div>
  );
}