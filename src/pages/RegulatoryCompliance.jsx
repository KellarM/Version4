import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, Download, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RegulatoryCompliance() {
  const [auditResults, setAuditResults] = useState(null);
  const [calibrationResults, setCalibrationResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('audit');

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('regulatoryAudit', {});
      setAuditResults(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runCalibration = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('calibrateToCompliance', {});
      setCalibrationResults(response.data);
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
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">
            ← Back to Game
          </Link>
          <h1 className="text-4xl font-bold mb-2">Regulatory Compliance Audit</h1>
          <p className="text-gray-400">Audit all 11 strategies and calibrate payouts for 95–98% RTP licensing compliance</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            Audit Results
          </button>
          <button
            onClick={() => setActiveTab('calibration')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'calibration'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            Calibration Engine
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-8 text-red-200">
            {error}
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex gap-3">
              <button
                onClick={runAudit}
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold disabled:bg-gray-700 flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {loading ? 'Running Audit...' : 'Run Full Audit (11 Strategies × 1M Games)'}
              </button>
            </div>

            {auditResults && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Target Range</p>
                    <p className="text-xl font-bold text-yellow-400">{auditResults.targetRTPRange}</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Compliant Strategies</p>
                    <p className="text-xl font-bold text-green-400">{auditResults.compliantCount}/{auditResults.totalStrategiesAudited}</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Aggregate RTP</p>
                    <p className="text-xl font-bold text-blue-400">{auditResults.aggregateRTP}%</p>
                  </div>
                  <div className={`border rounded-lg p-4 ${auditResults.overallStatus.includes('✅') ? 'bg-green-900/20 border-green-600' : 'bg-orange-900/20 border-orange-600'}`}>
                    <p className="text-gray-400 text-sm mb-1">Status</p>
                    <p className="text-lg font-bold">{auditResults.overallStatus}</p>
                  </div>
                </div>

                {/* Strategy Table */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-slate-700">
                    <h2 className="text-2xl font-bold">Strategy Audit Results</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 bg-slate-900/50">
                          <th className="px-4 py-3 text-left">Strategy</th>
                          <th className="px-4 py-3 text-left">Description</th>
                          <th className="px-4 py-3 text-right">RTP</th>
                          <th className="px-4 py-3 text-right">House Edge</th>
                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditResults.strategies.map((strat) => {
                          const rtp = parseFloat(strat.rtp);
                          const isCompliant = strat.compliant;
                          return (
                            <tr key={strat.strategy} className="border-b border-slate-700 hover:bg-slate-700/30">
                              <td className="px-4 py-3 font-semibold">{strat.strategy}</td>
                              <td className="px-4 py-3 text-gray-400">{strat.description}</td>
                              <td className={`px-4 py-3 text-right font-bold ${isCompliant ? 'text-green-400' : rtp > 98 ? 'text-red-400' : 'text-orange-400'}`}>
                                {strat.rtp}%
                              </td>
                              <td className="px-4 py-3 text-right text-gray-400">{strat.houseEdge}%</td>
                              <td className="px-4 py-3 text-center">
                                {isCompliant ? (
                                  <span className="inline-flex items-center gap-1 text-green-400">
                                    <CheckCircle2 className="w-4 h-4" /> PASS
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-400">
                                    <AlertCircle className="w-4 h-4" /> FAIL
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="text-gray-400 text-sm">{auditResults.recommendation}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Calibration Tab */}
        {activeTab === 'calibration' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex gap-3">
              <button
                onClick={runCalibration}
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:bg-gray-700 flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {loading ? 'Calibrating...' : 'Calculate Optimal Payouts'}
              </button>
            </div>

            {calibrationResults && (
              <div className="space-y-6">
                {/* Current State */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4">Current RTP by Category</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(calibrationResults.currentState).map(([key, value]) => (
                      <div key={key} className="bg-slate-900/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        <p className="text-2xl font-bold text-yellow-400">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scaling Factors */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4">Scaling Factors (to achieve 96.5% RTP target)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(calibrationResults.scalingFactors).map(([key, value]) => (
                      <div key={key} className="bg-slate-900/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1 capitalize">{key}</p>
                        <p className="text-2xl font-bold text-blue-400">{value}x</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Payouts */}
                <div className="space-y-4">
                  {/* Hands */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-bold mb-4">Suggested Hand Payouts</h3>
                    <div className="grid grid-cols-5 gap-3">
                      {calibrationResults.suggestedPayouts.hands.map((h) => (
                        <div key={h.id} className="bg-slate-900/50 rounded-lg p-3 text-center">
                          <p className="text-gray-400 text-sm mb-1">Hand {h.id}</p>
                          <p className="text-gray-400 line-through text-xs">{h.current}</p>
                          <p className="text-lg font-bold text-green-400">{h.suggested}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ranks */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-bold mb-4">Suggested Rank Payouts</h3>
                    <div className="grid grid-cols-4 gap-3">
                      {Object.entries(calibrationResults.suggestedPayouts.ranks).map(([rank, suggested]) => (
                        <div key={rank} className="bg-slate-900/50 rounded-lg p-3 text-center">
                          <p className="text-gray-400 text-xs mb-1">{rank}</p>
                          <p className="text-lg font-bold text-green-400">{suggested}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-bold mb-4">Suggested Color Payouts</h3>
                    <div className="grid grid-cols-6 gap-3">
                      {Object.entries(calibrationResults.suggestedPayouts.colors).map(([key, suggested]) => (
                        <div key={key} className="bg-slate-900/50 rounded-lg p-3 text-center">
                          <p className="text-gray-400 text-sm mb-1">{key}</p>
                          <p className="text-lg font-bold text-green-400">{suggested}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Verification */}
                <div className={`border rounded-lg p-6 ${calibrationResults.verification.isCompliant ? 'bg-green-900/20 border-green-600' : 'bg-orange-900/20 border-orange-600'}`}>
                  <h3 className="text-lg font-bold mb-3">Verification</h3>
                  <div className="space-y-2">
                    <p><span className="text-gray-400">Target Range:</span> <span className="font-bold text-yellow-400">{calibrationResults.verification.targetRange}</span></p>
                    <p><span className="text-gray-400">Theoretical RTP (with suggested payouts):</span> <span className="text-xl font-bold text-green-400">{calibrationResults.verification.theoreticalRTPAfterAdjustment}</span></p>
                    <p className="text-sm text-gray-300">{calibrationResults.nextSteps}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-300">Simulating {activeTab === 'audit' ? '11 strategies × 1M games' : '500K games'}...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}