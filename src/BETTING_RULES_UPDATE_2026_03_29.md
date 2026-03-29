# Rapid Fire - Texas 10 Betting Rules Update
**Effective Date:** March 29, 2026

## Overview
Updated betting constraints to prevent exploitation of Hand Rank bets when multiple Card Hand bets are active.

## Updated Rules

### Card Hand Bets
- **Max Bets:** 4 simultaneous Card Hand bets allowed
- **Alert:** Triggers when player attempts 5th bet with 5-second countdown
- **Constraint:** No restriction on when hand bets can be placed

### Hand Rank Bets (UPDATED)
- **Max Bets:** Only **1 Hand Rank bet** allowed per round
- **Unlock Condition:** Hand Rank board is **unavailable** if more than **2 Card Hand bets** are active
- **Alert Message:** "Hand Rank Bets Are Unavailable If More than 2 Bets Are Made On Card Hands"
- **Alert Duration:** 5-second countdown with dismiss on click
- **Removal Option:** Players can remove Card Hand bets to unlock Hand Rank betting
- **Progressives:** Royal Flush, Straight Flush, and One Pair jackpots always remain available before deal (don't count toward unlock condition)

### Color Board (Red/Black)
- Available during betting phase
- Can bet multiple color combinations
- No restrictions related to Hand Rank bets

### Low/High Bets
- Available after Turn card is dealt
- Max bet amount = sum of all board bets (hand + rank + color combined)
- No Hand Rank restrictions

## Implementation Details

### Game Logic (pages/RapidFireGame.jsx)
```javascript
const MAX_HAND_BETS = 4;              // Absolute max hand bets
const MAX_HAND_BETS_FOR_RANK = 2;     // Max hand bets to allow rank betting
const canBetRank = handBetCount <= MAX_HAND_BETS_FOR_RANK;
const maxRankBets = 1;                // Only 1 rank bet allowed
```

### Components Affected
1. **RankBetLimitAlert** (NEW) - Displays when player tries to bet with >2 hand bets
2. **RankBets** - Updated to show lock icon when hand bets exceed threshold
3. **RapidFireGame** - Updated constraint logic and alert integration
4. **payoutConstants.js** - Documentation of new rules

### Alert Behavior
- **Trigger:** Player attempts Hand Rank bet while handBetCount > 2
- **Display:** Orange warning box with explanation and current hand bet count
- **Duration:** 5-second countdown or click to dismiss
- **Recommendation:** Shows how many bets to remove to unlock

## Simulation Updates
All backend simulation functions (detailedHandSimulation, strategicPlayerSimulation, etc.) have been updated to respect the new constraints:
- Max 2 hand bets when including a rank bet
- Only 1 rank bet per round
- Progressives always available

## Testing Checklist
- [ ] Hand Rank alert triggers only when handBetCount > 2
- [ ] Alert dismisses after 5 seconds or on click
- [ ] Hand Rank board shows lock icon when constrained
- [ ] Players can remove hand bets to unlock rank board
- [ ] Only 1 rank bet allowed at a time
- [ ] Progressives available regardless of hand bet count
- [ ] Color/Low-High bets unaffected by new constraints
- [ ] Simulations respect 2-hand / 1-rank limits

## Documentation Updates
- Updated ToolsMenu BETTING_RULES constant with new constraints
- Updated payoutConstants.js header documentation
- Created this rules update document

## Impact on House Edge
The constraint ensures players cannot exploit multi-hand + multi-rank combinations:
- Previous risk: 4 hands × 6+ ranks = potential 24+ outcome combinations
- Current constraint: 2 hands × 1 rank = limited to 2 outcome combinations per round
- House edge maintained across all bet categories