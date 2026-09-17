export type StickerKind = '67' | 'REACTION' | 'SIGMA' | 'THINKING' | 'HUH' | 'MIKE' | 'AURA' | 'LOCK IN' | 'W' | 'L' | 'GOAT' | 'WHAT';

export const stickers: Record<StickerKind, { label: StickerKind; tone: 'blue' | 'paper' | 'steel' | 'warm'; rotate: number; image?: string }> = {
  '67': { label: '67', tone: 'warm', rotate: -8, image: '/assets/stickers/67.png' },
  REACTION: { label: 'REACTION', tone: 'paper', rotate: 5, image: '/assets/stickers/reaction-face.png' },
  SIGMA: { label: 'SIGMA', tone: 'steel', rotate: 5, image: '/assets/stickers/sigma-face.png' },
  THINKING: { label: 'THINKING', tone: 'steel', rotate: -5, image: '/assets/stickers/thinking.png' },
  HUH: { label: 'HUH', tone: 'paper', rotate: 6, image: '/assets/stickers/huh-cat.png' },
  MIKE: { label: 'MIKE', tone: 'blue', rotate: -4, image: '/assets/stickers/mike.png' },
  AURA: { label: 'AURA', tone: 'blue', rotate: -4 },
  'LOCK IN': { label: 'LOCK IN', tone: 'blue', rotate: 3 },
  W: { label: 'W', tone: 'blue', rotate: -6 },
  L: { label: 'L', tone: 'paper', rotate: 7 },
  GOAT: { label: 'GOAT', tone: 'warm', rotate: -3 },
  WHAT: { label: 'WHAT', tone: 'paper', rotate: 4 },
};
