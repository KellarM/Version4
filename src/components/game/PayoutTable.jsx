export default function PayoutTable() {
  return (
    <div className="mt-2 border border-slate-700/60 rounded-xl bg-slate-900/60 px-4 py-3 text-xs text-gray-400 space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="text-amber-500 flex-shrink-0 mt-0.5">!</span>
        <p>
          <span className="text-white font-semibold">Community Board Win — </span>
          If the 5-card Community Board is stronger than all 10 carded hands at showdown, all Hand bets lose. Rank Board, Color Board, and River bets remain active and pay based on the board's final composition.
        </p>
      </div>
    </div>
  );
}