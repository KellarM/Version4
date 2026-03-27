import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function HandByHandAnalysis() {
  const [gameCount, setGameCount] = useState(25);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [expandedGame, setExpandedGame] = useState(null);
  const [error, setError] = useState(null);

  const runSimulation = async (count) => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('detailedHandSimulation', { gamesToSimulate: count });
      setResults(response.data);
      setGameCount(count);
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
          <h1 className="text-4xl font-bold mb-2">Hand-by-Hand Analysis</h1>
          <p className="text-gray-400">Detailed breakdown of each game to analyze RTP and payout distribution</p>
        </div>

        {/* Controls */}
        <div className="mb-8 flex gap-3 flex-wrap">
          {[10, 25, 50, 75, 100].map(count => (
            <button
              key={count}
              onClick={() => runSimulation(count)}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                gameCount === count && results
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300 disabled:bg-gray-700'
              }`}
            >
              {loading && gameCount === count ? 'Simulating...' : `${count} Games`}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-300">Simulating games...</p>
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
            {/* Summary Box */}
            <div className={`rounded-lg border-2 p-6 ${
              results.summary.isCompliant
                ? 'border-green-500 bg-green-900/20'
                : 'border-orange-500 bg-orange-900/20'
            }`}>
              <h2 className="text-2xl font-bold mb-4">Summary</h2>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Total Games</p>
                  <p className="text-3xl font-bold">{results.summary.totalGames}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Bets</p>
                  <p className="text-2xl font-bold">${(results.summary.totalBets / 1000).toFixed(0)}K</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">House Profit</p>
                  <p className={`text-2xl font-bold ${results.summary.houseProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${(results.summary.houseProfit / 1000).toFixed(0)}K
                  </p>
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
              <p className="mt-4 text-sm">
                {results.summary.isCompliant 
                  ? '✓ Within 95-98% compliance range'
                  : '⚠ Outside 95-98% target range'
                }
              </p>
            </div>

            {/* Games Table */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-xl font-bold">Game Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/50">
                      <th className="px-4 py-3 text-left">Game</th>
                      <th className="px-4 py-3 text-center">Players</th>
                      <th className="px-4 py-3 text-right">Total Bets</th>
                      <th className="px-4 py-3 text-right">Payouts</th>
                      <th className="px-4 py-3 text-right">House Profit</th>
                      <th className="px-4 py-3 text-center">RTP</th>
                      <th className="px-4 py-3 text-center">Cumulative RTP</th>
                      <th className="px-4 py-3 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.games.map((game, idx) => (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`border-b border-slate-700 hover:bg-slate-700/30 cursor-pointer ${
                          expandedGame === idx ? 'bg-slate-700/50' : ''
                        }`}
                        onClick={() => setExpandedGame(expandedGame === idx ? null : idx)}
                      >
                        <td className="px-4 py-3 font-bold">#{game.gameNumber}</td>
                        <td className="px-4 py-3 text-center">{game.playerCount}</td>
                        <td className="px-4 py-3 text-right">${game.totalBets.toFixed(0)}</td>
                        <td className="px-4 py-3 text-right">${game.totalPayouts.toFixed(2)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${game.houseProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {game.houseProfit >= 0 ? '+' : ''}${game.houseProfit.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">{game.rtp}</td>
                        <td className="px-4 py-3 text-center text-purple-400 font-bold">{game.cumulativeRTP}</td>
                        <td className="px-4 py-3 text-center">
                          {expandedGame === idx ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expanded Game Details */}
            {expandedGame !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-6"
              >
                <h3 className="text-lg font-bold mb-4">Game #{results.games[expandedGame].gameNumber} - Player Details</h3>
                <div className="space-y-4">
                  {results.games[expandedGame].players.map((player, idx) => (
                    <div key={idx} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-lg">Player {player.playerId}</p>
                          <p className="text-sm text-gray-400">{player.strategy} Strategy</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-yellow-400">Bet: ${player.totalBet.toFixed(0)}</p>
                          <p className={`font-bold ${player.totalWin >= player.totalBet ? 'text-green-400' : 'text-red-400'}`}>
                            Win: ${player.totalWin.toFixed(2)}
                          </p>
                          <p className={`font-bold ${player.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {player.profit >= 0 ? '+' : ''}${player.profit.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {Object.keys(player.bets).length > 0 && (
                        <div className="text-xs text-gray-400 space-y-1">
                          {player.bets.hand && <p>Hand Bet: #{player.bets.hand.id} (${player.bets.hand.amount})</p>}
                          {player.bets.rank && <p>Rank Bet: {player.bets.rank.name} (${player.bets.rank.amount})</p>}
                          {player.bets.color && <p>Color Bet: {player.bets.color.type} (${player.bets.color.amount})</p>}
                          {player.bets.lowHigh && <p>Low/High: {player.bets.lowHigh.type} (${player.bets.lowHigh.amount})</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}