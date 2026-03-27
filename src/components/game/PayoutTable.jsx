import { FIXED_HANDS, SUITS, HAND_RANK_PAYOUTS, RB_TABLE } from '@/lib/gameEngine';

export default function PayoutTable() {
  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* Hand Rank Payouts */}
      <div className="border border-yellow-700/40 rounded-xl p-3 bg-black/30">
        <div className="text-yellow-400 text-xs font-bold tracking-wider uppercase mb-2 text-center">Rank Position Payouts</div>
        <table className="w-full">
          <tbody>
            {HAND_RANK_PAYOUTS.map(h => (
              <tr key={h.name} className="border-b border-green-900/30">
                <td className={`py-0.5 ${h.special ? 'text-orange-400 font-semibold' : 'text-green-300/80'}`}>{h.name}</td>
                <td className={`text-right font-bold ${h.special ? 'text-orange-300' : 'text-yellow-300'}`}>{h.payout}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Red/Black Payouts */}
      <div className="border border-yellow-700/40 rounded-xl p-3 bg-black/30">
        <div className="text-yellow-400 text-xs font-bold tracking-wider uppercase mb-2 text-center">Red / Black Payouts</div>
        <table className="w-full">
          <tbody>
            {RB_TABLE.map(r => (
              <tr key={r.key} className="border-b border-green-900/30">
                <td className={`py-0.5 ${r.key.includes('R') ? 'text-red-400' : 'text-gray-300'}`}>{r.label}</td>
                <td className="text-right text-yellow-300 font-bold">{r.payout}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Low/High Payout */}
      <div className="border border-yellow-700/40 rounded-xl p-3 bg-black/30">
        <div className="text-yellow-400 text-xs font-bold tracking-wider uppercase mb-2 text-center">Low / High (River)</div>
        <div className="flex justify-between text-green-300/80">
          <span>Low (2–7)</span>
          <span className="text-yellow-300 font-bold">1:1</span>
        </div>
        <div className="flex justify-between text-green-300/80">
          <span>High (8–Ace)</span>
          <span className="text-yellow-300 font-bold">1:1</span>
        </div>
      </div>
    </div>
  );
}