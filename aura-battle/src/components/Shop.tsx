import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { addToInventory, canDailySpin, equipItem, getInventory, getWallet, hasOwned, claimDailySpin, spend, type Wallet } from '../utils/shopEconomy';
import { MemeSticker } from './MemeSticker';

type Category = 'ALL' | 'FEATURED' | 'AURA' | 'AVATAR' | 'FRAME' | 'EFFECTS' | 'EMOTES' | 'TITLES';
type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
type ShopItem = { id: string; name: string; category: Exclude<Category, 'ALL' | 'FEATURED'>; rarity: Rarity; description: string; featured?: boolean; limited?: boolean; season?: string; priceKey: 'gold' | 'diamonds'; price?: number; multiplier?: string };

const items: ShopItem[] = [
  { id: 'aura-11', name: 'QUIET CURRENT', category: 'AURA', rarity: 'COMMON', description: 'A restrained pulse for clean rounds.', multiplier: 'x1.1', priceKey: 'gold', price: 900, featured: true },
  { id: 'aura-12', name: 'NORTHSTAR', category: 'AURA', rarity: 'UNCOMMON', description: 'A steady signal that never drifts.', multiplier: 'x1.2', priceKey: 'gold', price: 1800, featured: true },
  { id: 'aura-13', name: 'FROSTLINE', category: 'AURA', rarity: 'RARE', description: 'Cold focus. Clean execution.', multiplier: 'x1.3', priceKey: 'gold', price: 3200 },
  { id: 'aura-14', name: 'SIGNAL BLOOM', category: 'AURA', rarity: 'EPIC', description: 'A pulse that follows every move.', multiplier: 'x1.4', priceKey: 'gold', price: 5200 },
  { id: 'aura-15', name: 'VOID SOVEREIGN', category: 'AURA', rarity: 'EPIC', description: 'Born from the infinite void.', multiplier: 'x1.5', priceKey: 'gold', price: 8000, featured: true },
  { id: 'aura-175', name: "MASTER'S FLAME", category: 'AURA', rarity: 'LEGENDARY', description: 'A mark for those who rise above.', multiplier: 'x1.75', priceKey: 'gold', price: 14000, season: 'SEASON 03' },
  { id: 'aura-2', name: 'SOVEREIGN ZERO', category: 'AURA', rarity: 'MYTHIC', description: 'The ceiling is only another starting line.', multiplier: 'x2', priceKey: 'gold', price: 24000 },
  { id: 'neon-wraith', name: 'NEON WRAITH', category: 'FRAME', rarity: 'EPIC', description: 'Frame your legend in quiet light.', limited: true, priceKey: 'diamonds', price: 30 },
  { id: 'orbit-born', name: 'ORBIT BORN', category: 'AVATAR', rarity: 'UNCOMMON', description: 'A clean signal from a distant arena.', priceKey: 'gold', price: 700 },
  { id: 'gg-emote', name: 'GG // SILENT', category: 'EMOTES', rarity: 'COMMON', description: 'Say less. Let the score speak.', priceKey: 'gold', price: 450 },
  { id: 'void-caller', name: 'VOID CALLER', category: 'TITLES', rarity: 'RARE', description: 'A title with gravity.', priceKey: 'gold', price: 1200 },
];

const categories: Array<[Category, string]> = [['ALL', '◇'], ['FEATURED', '✦'], ['AURA', '◉'], ['AVATAR', '○'], ['FRAME', '□'], ['EFFECTS', 'ϟ'], ['EMOTES', '☻'], ['TITLES', '⌁']];

export function Shop({ isAdmin, onHome, onLeaderboard, onGuild, onSettings }: { isAdmin: boolean; onHome: () => void; onLeaderboard: () => void; onGuild: () => void; onSettings: () => void }) {
  const [category, setCategory] = useState<Category>('FEATURED');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('Featured');
  const [selected, setSelected] = useState<ShopItem | null>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [wallet, setWallet] = useState<Wallet>(() => getWallet(isAdmin));
  const [inventory, setInventory] = useState(() => getInventory());
  const [dailyReady, setDailyReady] = useState(() => canDailySpin());
  const [drawResult, setDrawResult] = useState<ShopItem | null>(null);
  const [toast, setToast] = useState('');
  const [spinning, setSpinning] = useState(false);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  function refreshEconomy() {
    setWallet(getWallet(isAdmin));
    setInventory(getInventory());
    setDailyReady(canDailySpin());
  }

  function spinAura(premium: boolean) {
    if (spinning) return;
    const isFreeDailySpin = !premium && dailyReady;
    const cost = premium ? 30 : 300;
    const currency = premium ? 'diamonds' : 'gold';
    if (!isFreeDailySpin && !spend(currency, cost, isAdmin)) { notify(`Not enough ${premium ? 'diamonds' : 'gold'}.`); return; }
    if (isFreeDailySpin) claimDailySpin();
    const pool = items.filter((item) => item.category === 'AURA' && (premium || item.rarity !== 'MYTHIC'));
    const result = pool[Math.floor(Math.random() * pool.length)];
    setSpinning(true);
    window.setTimeout(() => {
      addToInventory(result.id);
      refreshEconomy();
      setDrawResult(result);
      setSpinning(false);
    }, 720);
  }

  function buyItem(item: ShopItem) {
    if (!item.price || hasOwned(item.id)) return;
    if (!spend(item.priceKey, item.price, isAdmin)) { notify(`Not enough ${item.priceKey === 'gold' ? 'gold' : 'diamonds'}.`); return; }
    addToInventory(item.id);
    refreshEconomy();
    setSelected(null);
    notify(`${item.name} added to inventory.`);
  }

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchesCategory = category === 'ALL' || category === 'FEATURED' ? category === 'ALL' || item.featured : item.category === category;
      return matchesCategory && (!normalized || `${item.name} ${item.category} ${item.rarity}`.toLowerCase().includes(normalized));
    });
    if (sort === 'Newest') return [...filtered].reverse();
    if (sort === 'Rarity') return [...filtered].sort((a, b) => b.rarity.localeCompare(a.rarity));
    return filtered;
  }, [category, query, sort]);

  return <div className="shop-shell">
    <div className="shop-grid" aria-hidden="true" /><div className="shop-aura shop-aura-one" aria-hidden="true" /><div className="shop-aura shop-aura-two" aria-hidden="true" />
    <header className="shop-header"><button className="shop-home-link" onClick={onHome}>← HOME</button><div className="shop-title"><span className="eyebrow">COSMETIC MARKETPLACE</span><h1>✦ SHOP</h1><p>Build your signature aura.</p></div><div className="currency-strip">{isAdmin && <span className="admin-wallet-badge">ADMIN WALLET</span>}<button className="currency-chip" title="Diamonds are the premium currency."><span>◇</span><strong>{isAdmin ? '∞' : wallet.diamonds.toLocaleString()}</strong><small>DIAMONDS</small></button><button className="currency-chip" title="Gold is earned through gameplay."><span>◈</span><strong>{isAdmin ? '∞' : wallet.gold.toLocaleString()}</strong><small>GOLD</small></button><button className="inventory-button" onClick={() => setInventoryOpen(true)}>♧ INVENTORY</button></div></header>
    <div className="shop-toolbar"><div className="shop-tabs">{categories.map(([name, icon]) => <button key={name} className={category === name ? 'active' : ''} onClick={() => setCategory(name)}><span>{icon}</span>{name}</button>)}</div><div className="shop-tools"><label className="shop-search">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cosmetics..." aria-label="Search cosmetics" /></label><button className="filter-button" onClick={() => setFilterOpen((open) => !open)}>☷ FILTER</button><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort shop items"><option>Featured</option><option>Newest</option><option>Rarity</option><option>Price: Low → High</option></select></div></div>
    {filterOpen && <div className="shop-filter"><span>RARITY</span>{(['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'] as Rarity[]).map((rarity) => <button key={rarity} onClick={() => setQuery(rarity)}>{rarity}</button>)}<button onClick={() => setQuery('')}>CLEAR</button></div>}
    <main className="shop-main"><div className="meme-layer shop-meme-layer" aria-hidden="true"><MemeSticker kind="AURA" size="small" className="meme-shop-aura" /><MemeSticker kind="67" size="micro" className="meme-shop-67" /></div>
      <section className="shop-hero"><div className="hero-copy"><span className="shop-kicker"><i /> FEATURED AURA · SERVER CATALOG</span><h2>VOID<br /><em>SOVEREIGN</em></h2><p>Born from the infinite void.</p><div className="hero-meta"><RarityBadge rarity="LEGENDARY" /><span className="server-price">PRICE FROM SERVER</span></div><button className="outline-shop-button" onClick={() => setSelected(items[0])}>VIEW DETAILS <span>↗</span></button></div><div className="hero-preview aura-art aura-art-aura-15"><div className="aura-ring aura-ring-large" /><div className="aura-ring aura-ring-small" /><span>VOID</span><small>PREVIEW</small></div></section>
      <section className="shop-section"><div className="section-heading"><div><span className="eyebrow">CURATED DROP</span><h2>{category === 'FEATURED' ? 'FEATURED ITEMS' : `${category} COLLECTION`}</h2></div><span className="catalog-status">CATALOG · {visibleItems.length.toString().padStart(2, '0')} ITEMS</span></div><div className="shop-grid-items">{visibleItems.map((item, index) => <ShopCard key={item.id} item={item} index={index} onOpen={() => setSelected(item)} />)}</div>{visibleItems.length === 0 && <div className="shop-empty">NO COSMETICS MATCH THIS SEARCH.</div>}</section>
      <section className="shop-lower-grid"><div className="daily-panel"><span className="eyebrow">DAILY AURA DRAW</span><h2>DAILY SHOP</h2><p>One free standard draw per day. Extra standard spins cost 300 Gold.</p><div className={`aura-wheel ${spinning ? 'spinning' : ''}`}><span>◈</span><small>{spinning ? 'ROLLING...' : dailyReady ? 'FREE TODAY' : '300 GOLD'}</small></div><div className="draw-actions"><button className="draw-button" onClick={() => spinAura(false)} disabled={spinning}><span>◈</span> {spinning ? 'ROLLING...' : dailyReady ? 'DAILY SPIN · FREE' : 'SPIN · 300 GOLD'}</button><button className="draw-button premium" onClick={() => spinAura(true)} disabled={spinning}><span>◇</span> SPIN · 30 DIAMONDS</button></div><small>{dailyReady ? 'FREE DAILY SPIN AVAILABLE' : 'EXTRA SPINS COST 300 GOLD'} · PREMIUM SPIN HAS NO DAILY LIMIT</small></div><div className="daily-panel season-panel"><span className="eyebrow">SEASON 03 EXCLUSIVE</span><h2>MASTER'S FLAME</h2><p>Multiplier {items[5].multiplier} · {items[5].price?.toLocaleString()} gold.</p><button onClick={() => setSelected(items[5])}>PREVIEW ITEM <span>↗</span></button></div></section>
    </main>
    <nav className="bottom-nav shop-nav">{[['⌂', 'HOME'], ['◇', 'SHOP'], ['♜', 'LEADERBOARD'], ['⚔', 'PLAY MODE'], ['♢', 'GUILD'], ['⚙', 'SETTING']].map(([icon, label], index) => <button key={label} className={index === 1 ? 'active' : ''} onClick={index === 0 ? onHome : index === 2 ? onLeaderboard : index === 4 ? onGuild : index === 5 ? onSettings : undefined}><span>{icon}</span><small>{label}</small></button>)}</nav>
    {selected && <ItemModal item={selected} owned={hasOwned(selected.id)} onClose={() => setSelected(null)} onBuy={() => buyItem(selected)} onEquip={() => { equipItem(selected.id); refreshEconomy(); notify(`${selected.name} equipped.`); }} />}
    {drawResult && <div className="modal-backdrop"><motion.div className="inventory-modal draw-result" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}><span className="eyebrow">AURA DRAW COMPLETE</span><h2>{drawResult.name}</h2><RarityBadge rarity={drawResult.rarity} /><div className="draw-result-preview"><span>{drawResult.multiplier}</span></div><p>Added to your inventory.</p><button onClick={() => setDrawResult(null)}>CLOSE</button></motion.div></div>}
    {inventoryOpen && <div className="modal-backdrop"><motion.div className="inventory-modal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><button className="modal-close" onClick={() => setInventoryOpen(false)} aria-label="Close inventory">×</button><span className="eyebrow">YOUR COLLECTION</span><h2>INVENTORY</h2>{inventory.length ? <div className="inventory-list">{inventory.map((owned) => { const item = items.find((entry) => entry.id === owned.id); return item ? <button key={owned.id} onClick={() => { setSelected(item); setInventoryOpen(false); }}><span>{item.multiplier || item.category}</span><strong>{item.name}</strong><small>{owned.equipped ? 'EQUIPPED' : 'OWNED'}</small></button> : null; })}</div> : <div className="inventory-empty"><span>♧</span><strong>YOUR INVENTORY IS EMPTY</strong><small>Daily Aura Draw results will appear here.</small></div>}</motion.div></div>}
    {toast && <div className="shop-toast">✓ {toast}</div>}
  </div>;
}

function ShopCard({ item, index, onOpen }: { item: ShopItem; index: number; onOpen: () => void }) { const owned = hasOwned(item.id); return <motion.button className={`shop-card rarity-${item.rarity.toLowerCase()}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }} onClick={onOpen}><div className={`card-preview aura-art aura-art-${item.id}`}><span className="mini-aura" />{item.category === 'AURA' ? item.multiplier || '◉' : item.category === 'AVATAR' ? '○' : item.category === 'FRAME' ? '□' : '✦'}<small>{item.category}</small></div><div className="card-copy"><strong>{item.name}</strong><RarityBadge rarity={item.rarity} /><p>{item.description}</p><span className="card-price">{owned ? '✓ OWNED' : `${item.price?.toLocaleString()} ${item.priceKey === 'gold' ? 'GOLD' : 'DIAMONDS'}`}</span></div><span className="card-arrow">↗</span></motion.button>; }
function RarityBadge({ rarity }: { rarity: Rarity }) { return <span className={`rarity-badge rarity-${rarity.toLowerCase()}`}><i />{rarity}</span>; }
function ItemModal({ item, owned, onClose, onEquip, onBuy }: { item: ShopItem; owned: boolean; onClose: () => void; onEquip: () => void; onBuy: () => void }) { return <div className="modal-backdrop"><motion.div className="shop-detail-modal" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}><button className="modal-close" onClick={onClose} aria-label="Close item details">×</button><div className={`detail-preview aura-art aura-art-${item.id}`}><div className="aura-ring aura-ring-large" /><span>{item.multiplier || item.category}</span><small>PREVIEW MODE</small></div><div className="detail-copy"><span className="eyebrow">COSMETIC DETAIL</span><h2>{item.name}</h2><RarityBadge rarity={item.rarity} /><p>{item.description}</p>{item.multiplier && <div className="multiplier-display">AURA POWER <strong>{item.multiplier}</strong></div>}<div className="detail-status"><span>OWNERSHIP</span><strong>{owned ? '✓ OWNED' : `${item.price?.toLocaleString()} ${item.priceKey === 'gold' ? 'GOLD' : 'DIAMONDS'}`}</strong></div><div className="detail-actions">{owned ? <button onClick={onEquip}>EQUIP</button> : <button onClick={onBuy}>BUY NOW</button>}<button onClick={onClose}>CLOSE</button></div><small className="backend-note">Local wallet mode. Connect the economy service before shipping purchases.</small></div></motion.div></div>; }
