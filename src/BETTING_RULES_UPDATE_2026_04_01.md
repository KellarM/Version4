# Rapid Fire - Texas 10 Betting Rules Update
**Effective Date:** April 1, 2026
**Amended:** May 6, 2026

## Overview
This document previously described a "One Pair Isolation" rule that has since been **removed**. One Pair is now treated identically to all other rank bets — no special lock or isolation logic applies.

## Current Rules (as of May 6, 2026)

### Card Hand Bets
- **Max Bets:** 2 simultaneous Card Hand bets when any Hand Rank bet is active
- **Max Bets (no rank):** Up to 4 Card Hand bets with no side market access
- **Constraint:** 3 or more hand bets = kill switch fires, all side markets locked

### Hand Rank Bets
- **0 Card Hand bets:** Rank board fully locked
- **1 Card Hand bet:** Exactly 1 Rank bet allowed
- **2 Card Hand bets:** Up to 2 Rank bets allowed
- **3+ Card Hand bets:** All rank bets locked
- **Rank bets are not hand-specific** — they apply to whichever active card hand(s) hit that rank
- **Rank cap:** Total rank bets cannot exceed total hand bets
- **All ranks treated equally** — One Pair has no special isolation rule

### Color & River Board Unlock
- **Unlock condition:** Total rank bet amount must **exactly equal** total hand bet amount
- If rank total ≠ hand total → Color and River boards are locked
- Player does NOT need a color bet to access the River board
- **Color max bet:** = Total hand bets + Total rank bets
- **River max bet:** = Total hand bets + Total rank bets + Total color bets

### One Pair (UPDATED — Isolation Rule Removed)
- One Pair is now a standard rank bet with no special constraints
- Can be combined with other rank bets freely (subject to the 2-rank slot limit)
- Odds are per-hand — see perHandRankPayouts.js

## Removed Rules
- ~~ONE PAIR ISOLATION~~ — One Pair can now be combined with any other rank bet
- ~~Purple isolation alert~~ — removed
- ~~Mutual lock between One Pair and other ranks~~ — removed
