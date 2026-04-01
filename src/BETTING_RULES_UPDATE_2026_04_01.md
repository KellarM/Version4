# Rapid Fire - Texas 10 Betting Rules Update
**Effective Date:** April 1, 2026

## Overview
Added One Pair isolation rule to Hand Rank betting, preventing One Pair from being combined with any other rank bet.

## Updated Rules

### Card Hand Bets
- **Max Bets:** 2 simultaneous Card Hand bets when any Hand Rank bet is active
- **Constraint:** No restriction when no rank bets are placed

### Hand Rank Bets (UPDATED)
- **0 Card Hand bets:** Unlimited rank bets allowed
- **1–2 Card Hand bets:** Max 2 rank bets allowed
- **3+ Card Hand bets:** All rank bets locked
- **ONE PAIR ISOLATION (NEW):** One Pair must be bet exclusively — it cannot be combined with any other rank bet. If One Pair is active, all other rank slots are locked. If any other rank is active, One Pair is locked.
- **Alert:** Purple warning shown when isolation rule is violated
- **All ranks:** Fixed-odds — no progressives

### Color Board (Red/Black)
- Available during betting phase
- Can bet multiple color combinations
- No restrictions related to Hand Rank bets

### Low/High Bets
- Available after Turn card is dealt
- Max bet amount = sum of all board bets (hand + rank + color combined)

## Implementation Details

### Components Affected
1. **RapidFireGame** — `handleRankBet` now fires `onepair` alert type for isolation violations
2. **RankBets** — Visual lock applied for One Pair isolation (both directions)
3. **RankBetLimitAlert** — New `onepair` alert type with purple styling and specific message
4. **GameRulesModal** — One Pair isolation rule documented in Hand Rank section
5. **ToolsMenu** — BETTING_RULES constant updated
6. **payoutConstants.js** — BETTING CONSTRAINTS comment block updated

## Testing Checklist
- [ ] One Pair bet locks all other rank slots
- [ ] Betting any other rank locks One Pair slot
- [ ] Purple "One Pair Must Be Bet Exclusively" alert shown on violation
- [ ] Removing One Pair unlocks all other rank slots
- [ ] Existing hand-count constraints still apply independently
- [ ] Settlement correctly pays One Pair at 158.34:1