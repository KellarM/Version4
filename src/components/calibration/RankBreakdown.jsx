import { BarChart2 } from 'lucide-react';

function RTPCell({ rtp }) {
  if (rtp === null || rtp === undefined || isNaN(rtp)) return <span className="text-gray-500">—</span>;
  const num = parseFloat(rtp);
  const ok = num >= 95 && num <= 98;
  return (
    <span className={`font-bold ${ok ? 'text-green-400' : num > 98 ? 'text-orange-400' : 'text-red-400'}`}>
      {num.toFixed(2)}%
    </span>
  );
}

const NO_BET_RANKS = new Set(['One Pair (no bet)', 'Straight Flush (no bet)', 'Royal Flush']);

// handRankPayouts: the PER_HAND_RANK_PAYOUTS[handId] object for the specific hand being audited
export default function RankBreakdown({ rankBreakdown, totalHandWins, totalGames, handRankPayouts }) {
  if (!rankBreakdown || rankBreakdown.length === 0) {
    return (
      <div className="text-gray-500 text-xs italic py-2">No rank breakdown data available.</div>
    );
  }

  // Sort by wins descending
  const sorted = [...rankBreakdown].sort((a, b) => b.wins - a.wins);

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
          Rank Breakdown — {totalHandWins.toLocaleString()} wins / {(totalGames / 1000).toFixed(0)}K rounds
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-gray-500 uppercase bg-slate-900/60">
              <th className="px-3 py-2 text-left">Rank Achieved</th>
              <th className="px-3 py-2 text-right">Wins</th>
              <th className="px-3 py-2 text-right">% of Hand Wins</th>
              <th className="px-3 py-2 text-right">Win% (of rounds)</th>
              <th className="px-3 py-2 text-right">House Edge</th>
              <th className="px-3 py-2 text-right">Actual RTP</th>
              <th className="px-3 py-2 text-right">Curr Odds</th>
              <th className="px-3 py-2 text-right">Fair (1)</th>
              <th className="px-3 py-2 text-right">For 95%</th>
              <th className="px-3 py-2 text-right">For 96.5%</th>
              <th className="px-3 py-2 text-right">For 98%</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ rank, wins }) => {
              const noBet = NO_BET_RANKS.has(rank);
              // Use the per-hand rank payout from PER_HAND_RANK_PAYOUTS for this specific hand
              const payout = noBet ? null : (handRankPayouts?.[rank] ?? null);

              // winFreq = wins / totalGames = the actual probability of this rank occurring
              // in a round. This is the correct base for RTP and odds calculations because:
              // "I bet $1 on this rank — how often do I win per round?"
              const winFreq = totalGames > 0 ? wins / totalGames : 0;
              const pctOfHandWins = totalHandWins > 0 ? ((wins / totalHandWins) * 100).toFixed(2) : '0.00';
              const winPct = (winFreq * 100).toFixed(4);

              // RTP = win frequency × (1 + payout) × 100
              // Uses winFreq (per-round) not condFreq (per-hand-win) to correctly reflect
              // what a player placing a rank bet each round would actually experience.
              const rtp = (payout !== null && winFreq > 0)
                ? (winFreq * (1 + payout) * 100)
                : null;
              const houseEdge = rtp !== null ? (100 - rtp) : null;
              const fairOdds = winFreq > 0 ? Math.round(((1 / winFreq) - 1) * 100) / 100 : null;
              const for95    = winFreq > 0 ? Math.round(((0.95  / winFreq) - 1) * 100) / 100 : null;
              const for965   = winFreq > 0 ? Math.round(((0.965 / winFreq) - 1) * 100) / 100 : null;
              const for98    = winFreq > 0 ? Math.round(((0.98  / winFreq) - 1) * 100) / 100 : null;

              return (
                <tr key={rank} className="border-b border-slate-700/30 hover:bg-slate-700/10">
                  <td className={`px-3 py-2 font-semibold ${noBet ? 'text-gray-500 italic' : 'text-white'}`}>
                    {rank}
                    {noBet && <span className="ml-1 text-gray-600 text-xs">(no bet)</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-white">
                    {wins.toLocaleString()}
                    <span className="text-gray-600 ml-1">/ {totalHandWins.toLocaleString()}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-300 font-mono">{pctOfHandWins}%</td>
                  <td className="px-3 py-2 text-right text-gray-300 font-mono">{winPct}%</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {houseEdge !== null
                      ? <span className={`font-bold ${houseEdge > 0 ? 'text-red-400' : 'text-green-400'}`}>{houseEdge.toFixed(2)}%</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {rtp !== null ? <RTPCell rtp={rtp} /> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-300 font-mono">
                    {payout !== null ? `${payout}:1` : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-400 font-mono">
                    {fairOdds !== null ? `${fairOdds}:1` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-green-400 font-mono">
                    {for95 !== null ? `${for95}:1` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-yellow-400 font-mono">
                    {for965 !== null ? `${for965}:1` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-blue-400 font-mono">
                    {for98 !== null ? `${for98}:1` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}