import { useEffect, useRef, useState } from 'react';

const MIN_CLICK_INTERVAL_MS = 70;
const SIMILAR_INTERVAL_TOLERANCE_MS = 2;
const SIMILAR_INTERVAL_LIMIT = 3;
const CHEAT_LOCK_MS = 3000;

type ClickForAuraProps = {
  aura: number;
  onAuraEarned: () => void;
};

export function ClickForAura({ aura, onAuraEarned }: ClickForAuraProps) {
  const [notice, setNotice] = useState('Click the aura core to earn +1 Aura.');
  const [locked, setLocked] = useState(false);
  const [lockRemainingMs, setLockRemainingMs] = useState(0);
  const lastClickAt = useRef<number | null>(null);
  const previousInterval = useRef<number | null>(null);
  const similarIntervals = useRef(0);
  const lockUntil = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!lockUntil.current) return;
      const remaining = Math.max(0, lockUntil.current - performance.now());
      setLockRemainingMs(remaining);
      if (remaining === 0) {
        lockUntil.current = 0;
        setLocked(false);
        setNotice('Aura core ready. Keep the rhythm human.');
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, []);

  function handleAuraClick() {
    if (locked) return;

    const currentTime = performance.now();
    const previousClick = lastClickAt.current;
    lastClickAt.current = currentTime;

    if (previousClick === null) {
      onAuraEarned();
      setNotice('+1 Aura earned.');
      return;
    }

    const interval = currentTime - previousClick;
    if (interval < MIN_CLICK_INTERVAL_MS) {
      setNotice(`Too fast. Wait at least ${MIN_CLICK_INTERVAL_MS}ms between clicks.`);
      return;
    }

    if (previousInterval.current !== null && Math.abs(interval - previousInterval.current) <= SIMILAR_INTERVAL_TOLERANCE_MS) {
      similarIntervals.current += 1;
    } else {
      similarIntervals.current = 0;
    }
    previousInterval.current = interval;

    if (similarIntervals.current >= SIMILAR_INTERVAL_LIMIT) {
      lockUntil.current = currentTime + CHEAT_LOCK_MS;
      setLocked(true);
      setLockRemainingMs(CHEAT_LOCK_MS);
      setNotice('Suspicious rhythm detected. Aura core paused for 3 seconds.');
      similarIntervals.current = 0;
      return;
    }

    onAuraEarned();
    setNotice('+1 Aura earned.');
  }

  return (
    <section className="click-aura-game" aria-labelledby="click-aura-title">
      <div className="click-aura-heading">
        <div>
          <span className="eyebrow">EVENT MINI GAME</span>
          <h3 id="click-aura-title">CLICK FOR AURA</h3>
        </div>
        <div className="aura-counter"><strong>{aura}</strong><span>AURA</span></div>
      </div>
      <p className="click-aura-copy">Tap the core for Aura. Keep your clicks natural.</p>
      <button className={`aura-core-button ${locked ? 'is-locked' : ''}`} onClick={handleAuraClick} disabled={locked} aria-label={locked ? 'Aura core paused' : 'Click for one aura'}>
        <span className="aura-core-symbol">✦</span>
        <strong>{locked ? `${Math.ceil(lockRemainingMs / 1000)}S` : '+1'}</strong>
        <small>{locked ? 'PAUSED' : 'AURA'}</small>
      </button>
      <p className={`click-aura-notice ${locked ? 'is-warning' : ''}`} role="status">{notice}</p>
    </section>
  );
}
