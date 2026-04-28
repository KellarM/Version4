/**
 * Static card image URLs for the 10 fixed hands in Rapid Fire Texas Hold'em.
 * Key format: "RANK_suit" (suit is lowercase full string matching gameEngine.js)
 */
export const CARD_IMAGES = {
  // Hand 1: A♦ / 10♥
  'A_diamonds':  'https://media.base44.com/images/public/69efcf8f4ff921af12d96aea/f83e25e37_AceDiamonds.PNG',
  '10_hearts':   'https://media.base44.com/images/public/69efcf8f4ff921af12d96aea/2e4a4d49c_10Hearts.PNG',

  // Hand 2: K♣ / K♠
  'K_clubs':     'https://media.base44.com/images/public/69efcf8f4ff921af12d96aea/29c07cd4f_KingClubs.PNG',
  'K_spades':    'https://media.base44.com/images/public/69efcf8f4ff921af12d96aea/e8db95bb4_KingSpades.PNG',

  // Hand 3: Q♣ / J♠
  'Q_clubs':     'https://media.base44.com/images/public/69efcf8f4ff921af12d96aea/7c2f0eda5_QueenClubs.PNG',
  'J_spades':    'https://media.base44.com/images/public/69efcf8f4ff921af12d96aea/a1b3c4d5e_JackSpades.PNG',

  // Hand 4: Q♠ / 10♠
  'Q_spades':    'https://media.base44.com/images/public/69efcf8f4ff921af12d96aea/f1e2d3c4b_QueenSpades.PNG',
  '10_spades':   'https://media.base44.com/images/public/69efcf8f4ff921af12d96aea/a9b8c7d6e_10Spades.PNG',

  // Hand 5: J♣ / 9♣
  'J_clubs':     'https://media.base44.com/images/public/69efcf8f4ff921af12d96aea/b2c3d4e5f_JackClubs.PNG',
  '9_clubs':     'https://media.base44.com/images/public/69efcf8f4ff921af12d96aea/c3d4e5f6a_9Clubs.PNG',

  // Hand 6: 8♦ / 6♦
  '8_diamonds':  'https://media.base44.com/images/public/69efcf8f4ff921af12d96aea/d4e5f6a7b_8Diamonds.PNG',
  '6_diamonds':  'https://media.base44.com/images/public/69efcf8f4ff921af12d96aea/e5f6a7b8c_6Diamonds.PNG',

  // Hand 7: 7♦ / 7♠
  '7_diamonds':  'https://media.base44.com/images/public/69efcf8f4ff921af12d96aea/f6a7b8c9d_7Diamonds.PNG',
  '7_spades':    'https://media.base44.com/images/public/69efcf8f4ff921af12d96aea/a7b8c9d0e_7Spades.PNG',

  // Hand 8: 4♥ / 2♥
  '4_hearts':    'https://media.base44.com/images/public/69eff22784cd2fbeba98f9be/98cfa7eaa_4Hearts.png',
  '2_hearts':    'https://media.base44.com/images/public/69eff22784cd2fbeba98f9be/370ab55b9_2Hearts.png',

  // Hand 9: 3♣ / 3♥
  '3_clubs':     'https://media.base44.com/images/public/69eff22784cd2fbeba98f9be/de95f3ce0_3Clubs.png',
  '3_hearts':    'https://media.base44.com/images/public/69eff22784cd2fbeba98f9be/8aa990eb3_3Hearts.png',

  // Hand 10: A♥ / 5♦
  'A_hearts':    'https://media.base44.com/images/public/69eff22784cd2fbeba98f9be/075308c86_AceHearts.png',
  '5_diamonds':  'https://media.base44.com/images/public/69eff22784cd2fbeba98f9be/aac1d390c_5Diamonds.png',
};

/**
 * Get the image URL for a card object { rank, suit }
 * suit values: 'diamonds', 'hearts', 'clubs', 'spades'
 */
export function getCardImageUrl(card) {
  if (!card) return null;
  const key = `${card.rank}_${card.suit}`;
  return CARD_IMAGES[key] ?? null;
}