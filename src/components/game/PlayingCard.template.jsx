/**
 * PlayingCard Template (Saved 2026-03-29)
 * ========================================
 * 
 * Card Layout Specification:
 * - Rank + Suit Symbol in TOP-LEFT corner (small, stacked)
 * - Rank + Suit Symbol in BOTTOM-RIGHT corner (small, stacked, upside-down rotated)
 * - Large Suit Symbol (5x larger) centered on card face
 * - All text fully within card bounds with equal padding from corners
 * - Suit symbol under rank in both corner positions (same size as rank)
 * 
 * Color Logic:
 * - Hearts (♥) and Diamonds (♦): Red (#dc2626)
 * - Spades (♠) and Clubs (♣): Black (#000)
 * - Glow effect: yellow-400 ring when glow prop is true
 * 
 * Size Variants:
 * - xs: w-8 h-11
 * - sm: w-[3.9rem] h-[5.5rem]
 * - md: w-14 h-20 (default)
 * - lg: w-16 h-24
 * - xl: w-20 h-28
 * 
 * Props:
 * - card: { rank, suit } (null renders empty placeholder)
 * - size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 * - faceDown: boolean (renders back design)
 * - glow: boolean (adds highlight effect)
 * 
 * Reference Images Used:
 * - 2♠, 3♠, 4♠, 5♠, 6♠, 7♠, 8♠, 9♠, 10♠, J♠, Q♠, K♠, A♠
 * (All follow same corner + center layout)
 */