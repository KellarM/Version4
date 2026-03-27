import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

export default function HandByHandAnalysis() {
  const [gameCount, setGameCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [expandedGame, setExpandedGame] = useState(null);
  const [error, setError] = useState(null);

  const runSimulation = async (count, isAdd = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('detailedHandSimulation', { gamesToSimulate: count });
      
      if (isAdd && results) {
        // Append new games
        const updatedGames = [...results.games, ...response.data.games];
        const totalBets = results.summary.totalBets + response.data.summary.totalBets;
        const totalPayouts = results.summary.totalPayouts + response.data.summary.totalPayouts;
        const houseProfit = totalBets - totalPayouts;
        const overallRTP = ((totalPayouts / totalBets) * 100).toFixed(2);
        
        // Recalculate cumulative RTP for all games
        let runningBets = 0;
        let runningPayouts = 0;
        const recalculatedGames = updatedGames.map(game => {
          runningBets += game.totalBets;
          runningPayouts += game.totalPayouts;
          return {
            ...game,
            cumulativeRTP: ((runningPayouts / runningBets) * 100).toFixed(2) + '%',
          };
        });

        setResults({
          ...response.data,
          games: recalculatedGames,
          summary: {
            totalGames: results.summary.totalGames + count,
            totalBets,
            totalPayouts,
            houseProfit,
            overallRTP: overallRTP + '%',
            isCompliant: parseFloat(overallRTP) >= 95 && parseFloat(overallRTP) <= 98,
          },
        });
        setGameCount(results.summary.totalGames + count);
      } else {
        // Start fresh
        setResults(response.data);
        setGameCount(count);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearData = () => {
    setResults(null);
    setGameCount(0);
    setExpandedGame(null);
    setError(null);
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
          <div className="flex gap-3 flex-wrap">
            {[10, 25, 50, 75, 100, 1000, 5000].map(count => (
              <button
                key={count}
                onClick={() => runSimulation(count, false)}
                disabled={loading}
                className="px-6 py-3 rounded-lg font-semibold transition-all bg-slate-700 hover:bg-slate-600 text-gray-300 disabled:bg-gray-700"
              >
                {loading ? 'Simulating...' : `${count} Games`}
              </button>
            ))}
          </div>
          
          {results && (
            <div className="flex gap-3 ml-auto">
              <button
                onClick={() => runSimulation(gameCount, true)}
                disabled={loading}
                className="px-4 py-3 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                ADD {gameCount} More
              </button>
              <button
                onClick={clearData}
                disabled={loading}
                className="px-4 py-3 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Data
              </button>
            </div>
          )}
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
                <h3 className="text-lg font-bold mb-4">Game #{results.games[expandedGame].gameNumber} - Detailed Breakdown</h3>
                <div className="space-y-4">
                  {results.games[expandedGame].players.map((player, pIdx) => (
                    <div key={pIdx} className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
                      <div className="bg-slate-800/70 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-lg">Player {player.playerId} - {player.strategy} Strategy</p>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-400">Total Bet: </span>
                          <span className="font-bold text-yellow-400">${player.totalBet.toFixed(0)}</span>
                          <span className="text-gray-400 ml-4">Total Win: </span>
                          <span className={`font-bold ${player.totalWin >= player.totalBet ? 'text-green-400' : 'text-red-400'}`}>
                            ${player.totalWin.toFixed(2)}
                          </span>
                          <span className="text-gray-400 ml-4">Profit: </span>
                          <span className={`font-bold ${player.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {player.profit >= 0 ? '+' : ''}${player.profit.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-2">
                        {player.bets.hand && (
                          <div className="grid grid-cols-12 gap-2 text-sm bg-blue-900/20 p-3 rounded border border-blue-800/30">
                            <div className="col-span-3 font-bold text-blue-400">Card Hand</div>
                            <div className="col-span-3 text-gray-300">Hand #{player.bets.hand.id}</div>
                            <div className="col-span-2 text-yellow-400">Bet: ${player.bets.hand.amount}</div>
                            <div className="col-span-4 text-right text-gray-400">Outcome: Calculated in game</div>
                          </div>
                        )}
                        
                        {player.bets.rank && (
                          <div className="grid grid-cols-12 gap-2 text-sm bg-purple-900/20 p-3 rounded border border-purple-800/30">
                            <div className="col-span-3 font-bold text-purple-400">Rank Hand</div>
                            <div className="col-span-3 text-gray-300">{player.bets.rank.name}</div>
                            <div className="col-span-2 text-yellow-400">Bet: ${player.bets.rank.amount}</div>
                            <div className="col-span-4 text-right text-gray-400">Outcome: Calculated in game</div>
                          </div>
                        )}
                        
                        {player.bets.color && (
                          <div className="grid grid-cols-12 gap-2 text-sm bg-red-900/20 p-3 rounded border border-red-800/30">
                            <div className="col-span-3 font-bold text-red-400">Red/Black</div>
                            <div className="col-span-3 text-gray-300">{player.bets.color.type}</div>
                            <div className="col-span-2 text-yellow-400">Bet: ${player.bets.color.amount}</div>
                            <div className="col-span-4 text-right text-gray-400">Outcome: Calculated in game</div>
                          </div>
                        )}
                        
                        {player.bets.lowHigh && (
                          <div className="grid grid-cols-12 gap-2 text-sm bg-teal-900/20 p-3 rounded border border-teal-800/30">
                            <div className="col-span-3 font-bold text-teal-400">Low/High</div>
                            <div className="col-span-3 text-gray-300">{player.bets.lowHigh.type}</div>
                            <div className="col-span-2 text-yellow-400">Bet: ${player.bets.lowHigh.amount}</div>
                            <div className="col-span-4 text-right text-gray-400">Outcome: Calculated in game</div>
                          </div>
                        )}
                        
                        {Object.keys(player.bets).length === 0 && (
                          <p className="text-gray-500 text-sm italic">No bets placed</p>
                        )}
                      </div>
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