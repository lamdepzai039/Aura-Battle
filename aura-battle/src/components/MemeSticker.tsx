import { stickers, type StickerKind } from '../ui/stickers';
import type { CSSProperties } from 'react';

export function MemeSticker({ kind, size = 'micro', className = '' }: { kind: StickerKind; size?: 'micro' | 'small' | 'large'; className?: string }) {
  const sticker = stickers[kind];
  return <span className={`meme-sticker meme-${sticker.tone} meme-${size} ${sticker.image ? 'meme-image-sticker' : ''} ${className}`} style={{ '--sticker-rotate': `${sticker.rotate}deg` } as CSSProperties} aria-label={`${kind} sticker`} role="img">{sticker.image ? <img src={sticker.image} alt="" onError={(event) => { event.currentTarget.hidden = true; }} /> : null}<span>{sticker.label}</span></span>;
}
