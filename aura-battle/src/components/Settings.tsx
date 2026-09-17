import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { clearSession, getSession } from '../utils/auth';
import { getTranslation, languageOptions, setDocumentLanguage, type Language } from '../utils/i18n';
import { MemeSticker } from './MemeSticker';

type Section = 'GENERAL' | 'AUDIO' | 'VIDEO' | 'CONTROLS' | 'CAMERA' | 'PRIVACY' | 'NOTIFICATIONS' | 'ACCOUNT';

const sections: Array<[Section, string]> = [
  ['GENERAL', '⚙'], ['AUDIO', '♫'], ['VIDEO', '▣'], ['CONTROLS', '⌘'], ['CAMERA', '◉'], ['PRIVACY', '◇'], ['NOTIFICATIONS', '♢'], ['ACCOUNT', '○'],
];

const SETTINGS_KEY = 'aura-battle-settings';

function readSetting<T>(key: string, fallback: T): T {
  try {
    const values = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') as Record<string, unknown>;
    return (values[key] as T | undefined) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeSetting(key: string, value: unknown) {
  try {
    const values = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') as Record<string, unknown>;
    values[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(values));
  } catch {
    // Private browsing can disable localStorage; the setting still works in memory.
  }
}

export function Settings({ onBack, onLogout, onShop, onGuild }: { onBack: () => void; onLogout: () => void; onShop: () => void; onGuild: () => void }) {
  const [section, setSection] = useState<Section>('GENERAL');
  const [language, setLanguage] = useState<Language>(() => readSetting('Language', 'English' as Language));
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<'reset' | 'delete' | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() => readSetting('Reduced Motion', false));
  const [performance, setPerformance] = useState(() => readSetting('Performance Mode', false));
  const [notifications, setNotifications] = useState(() => readSetting('Friend Requests', true));

  const currentUsername = getSession() || 'LAM';
  const tr = getTranslation(language);

  useEffect(() => {
    setDocumentLanguage(language);
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
    document.documentElement.classList.toggle('performance-mode', performance);
    return () => {
      document.documentElement.classList.remove('reduced-motion', 'performance-mode');
    };
  }, [language, reducedMotion, performance]);

  function saveSetting(label: string) {
    setToast(`${label} saved`);
    window.setTimeout(() => setToast(''), 2200);
  }

  function resetSettings() {
    localStorage.removeItem(SETTINGS_KEY);
    setModal(null);
    saveSetting('Settings reset');
    window.setTimeout(() => window.location.reload(), 350);
  }

  function toggle(label: string, value: boolean, setter: (next: boolean) => void) {
    setter(!value);
    saveSetting(label);
  }

  return (
    <div className="settings-shell">
      <div className="settings-grid" aria-hidden="true" /><div className="settings-orb" aria-hidden="true" />
      <header className="settings-header"><button className="settings-back" onClick={onBack}>← HOME</button><div><span className="eyebrow">PLAYER CONFIGURATION</span><h1>⚙ {tr.settings} <MemeSticker kind="AURA" size="micro" className="meme-heading-sticker" /></h1><p>{tr.settingsDescription}</p></div><span className="settings-status"><i /> {tr.autoSaved}</span></header>
      <div className="settings-layout">
        <aside className="settings-sidebar"><label className="settings-mobile-label">{tr.section}<select value={section} onChange={(event) => setSection(event.target.value as Section)}>{sections.map(([name]) => <option key={name} value={name}>{tr.nav[name]}</option>)}</select></label><nav>{sections.map(([name, icon]) => <button key={name} className={section === name ? 'active' : ''} onClick={() => setSection(name)}><span>{icon}</span>{tr.nav[name]}{name === 'CONTROLS' && <i className="unsaved-dot" />}</button>)}</nav></aside>
        <motion.section key={section} className="settings-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {section === 'GENERAL' && <SettingsSection title={`${tr.nav.GENERAL} SETTINGS`} description={tr.descriptions.GENERAL}><SelectRow label={tr.language} value={language} options={languageOptions} onChange={(nextLanguage) => { setLanguage(nextLanguage as Language); writeSetting('Language', nextLanguage); saveSetting('Language'); }} /><SelectRow label={tr.theme} value="Dark" options={['Dark', 'Light', 'System']} onChange={() => saveSetting('Theme')} /><ToggleRow label={tr.reducedMotion} value={reducedMotion} onChange={() => toggle('Reduced Motion', reducedMotion, setReducedMotion)} /><SelectRow label={tr.uiScale} value="Medium" options={['Small', 'Medium', 'Large']} onChange={() => saveSetting('UI Scale')} /><SettingsAction label={tr.reset} onClick={() => setModal('reset')} /></SettingsSection>}
          {section === 'AUDIO' && <SettingsSection title="AUDIO" description="Balance the soundscape of the arena."><SliderRow label="Master Volume" value={80} onChange={() => saveSetting('Master Volume')} /><SliderRow label="Music" value={70} onChange={() => saveSetting('Music')} /><SliderRow label="Sound Effects" value={90} onChange={() => saveSetting('Sound Effects')} /><SliderRow label="UI Sounds" value={70} onChange={() => saveSetting('UI Sounds')} /><ToggleRow label="Voice Chat" value={false} onChange={() => saveSetting('Voice Chat')} /><SettingsAction label="TEST AUDIO" onClick={() => saveSetting('Audio test queued')} /></SettingsSection>}
          {section === 'VIDEO' && <SettingsSection title="VIDEO" description="Tune visual quality for your device."><SelectRow label="Graphics Quality" value="High" options={['Low', 'Medium', 'High', 'Ultra']} onChange={() => saveSetting('Graphics Quality')} /><SelectRow label="FPS Limit" value="60" options={['30', '60', '120', '144', '165', 'Unlimited']} onChange={() => saveSetting('FPS Limit')} /><SelectRow label="Resolution" value="Browser default" options={['Browser default']} onChange={() => saveSetting('Resolution')} /><ToggleRow label="Aura Effects" value={true} onChange={() => saveSetting('Aura Effects')} /><ToggleRow label="Particles" value={true} onChange={() => saveSetting('Particles')} /><ToggleRow label="Motion Effects" value={true} onChange={() => saveSetting('Motion Effects')} /><ToggleRow label="Performance Mode" value={performance} onChange={() => toggle('Performance Mode', performance, setPerformance)} /></SettingsSection>}
          {section === 'CONTROLS' && <SettingsSection title="CONTROLS" description="Your keyboard mapping for the arena."><KeyGroup title="MOVEMENT" keys={['W', 'A', 'S', 'D']} /><KeyGroup title="INTERACTION" keys={['E']} /><KeyGroup title="EMOTE" keys={['B']} /><KeyGroup title="CHAT / MENU" keys={['ENTER', 'ESC']} /><SettingsAction label="CHANGE KEYBINDS" onClick={() => saveSetting('Keybind editor')} /></SettingsSection>}
          {section === 'CAMERA' && <SettingsSection title="CAMERA" description="Camera access is only requested when you enable it."><ToggleRow label="Camera Access" value={false} onChange={() => saveSetting('Camera permission required')} /><ToggleRow label="Mirror Camera" value={false} onChange={() => saveSetting('Mirror Camera')} /><SelectRow label="Camera Quality" value="High" options={['Low', 'Medium', 'High']} onChange={() => saveSetting('Camera Quality')} /><SliderRow label="Camera Sensitivity" value={60} onChange={() => saveSetting('Camera Sensitivity')} /><div className="camera-placeholder"><span>◉</span><strong>CAMERA PREVIEW</strong><small>Camera permission required</small><button onClick={() => saveSetting('Camera permission required')}>ENABLE CAMERA</button></div></SettingsSection>}
          {section === 'PRIVACY' && <SettingsSection title="PRIVACY" description="Choose how other players can reach you."><SelectRow label="Profile Visibility" value="PUBLIC" options={['PUBLIC', 'FRIENDS', 'PRIVATE']} onChange={() => saveSetting('Profile Visibility')} /><SelectRow label="Friend Requests" value="EVERYONE" options={['EVERYONE', 'FRIENDS OF FRIENDS', 'NOBODY']} onChange={() => saveSetting('Friend Requests')} /><SelectRow label="Match Invites" value="EVERYONE" options={['EVERYONE', 'FRIENDS', 'NOBODY']} onChange={() => saveSetting('Match Invites')} /><ToggleRow label="Allow Global Chat" value={true} onChange={() => saveSetting('Global Chat')} /><ToggleRow label="Show Online Status" value={true} onChange={() => saveSetting('Online Status')} /><ToggleRow label="Show Match History" value={true} onChange={() => saveSetting('Match History')} /></SettingsSection>}
          {section === 'NOTIFICATIONS' && <SettingsSection title="NOTIFICATIONS" description="Control what appears in your inbox."><ToggleRow label="Friend Requests" value={notifications} onChange={() => toggle('Friend Requests', notifications, setNotifications)} /><ToggleRow label="Game Invites" value={true} onChange={() => saveSetting('Game Invites')} /><ToggleRow label="Guild Notifications" value={true} onChange={() => saveSetting('Guild Notifications')} /><ToggleRow label="Mail Notifications" value={true} onChange={() => saveSetting('Mail Notifications')} /><ToggleRow label="Rank Notifications" value={true} onChange={() => saveSetting('Rank Notifications')} /><ToggleRow label="Season Notifications" value={true} onChange={() => saveSetting('Season Notifications')} /><SettingsAction label="MUTE ALL" onClick={() => saveSetting('All notifications muted')} /></SettingsSection>}
          {section === 'ACCOUNT' && <SettingsSection title="ACCOUNT" description="Your player identity and account controls."><div className="account-identity"><span className="account-avatar">{currentUsername.slice(0, 1).toUpperCase()}</span><div><strong>{currentUsername}</strong><small>PLAYER ID #829381</small></div><b>LV.27</b></div><InfoRow label="Email" value="Stored locally" /><SettingsAction label="EDIT PROFILE" onClick={() => saveSetting('Profile editor')} /><SettingsAction label="CHANGE PASSWORD" onClick={() => saveSetting('Password flow')} /><div className="danger-zone"><span>DANGER ZONE</span><SettingsAction label="LOG OUT" onClick={() => { clearSession(); onLogout(); }} danger /><SettingsAction label="DELETE ACCOUNT" onClick={() => setModal('delete')} danger /></div></SettingsSection>}
        </motion.section>
      </div>
      <nav className="bottom-nav settings-nav">{[['⌂', 'HOME'], ['◇', 'SHOP'], ['♜', 'LEADERBOARD'], ['⚔', 'PLAY MODE'], ['♢', 'GUILD'], ['⚙', 'SETTING']].map(([icon, label], index) => <button key={label} className={index === 5 ? 'active' : ''} onClick={index === 0 ? onBack : index === 1 ? onShop : index === 4 ? onGuild : undefined}><span>{icon}</span><small>{label}</small></button>)}</nav>
      {toast && <motion.div className="settings-toast" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>✓ {toast}</motion.div>}
      {modal && <div className="modal-backdrop"><motion.div className="confirm-modal" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}><span className="modal-icon">!</span><h2>{modal === 'delete' ? 'Delete Account?' : 'Reset all settings?'}</h2><p>{modal === 'delete' ? 'Account deletion requires a connected backend.' : 'Your preferences will be restored to default.'}</p><div><button onClick={() => setModal(null)}>CANCEL</button><button className="danger-button" onClick={modal === 'delete' ? () => { setModal(null); saveSetting('Delete request queued'); } : resetSettings}>{modal === 'delete' ? 'CONFIRM' : 'RESET'}</button></div></motion.div></div>}
    </div>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <div className="settings-card"><div className="settings-card-heading"><div><span className="eyebrow">PLAYER PREFERENCES</span><h2>{title}</h2><p>{description}</p></div><span className="section-mark">✦</span></div><div className="settings-fields">{children}</div></div>; }
function SelectRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (nextValue: string) => void }) { const [selected, setSelected] = useState(() => readSetting(label, value)); return <label className="setting-row select-row"><span>{label}<small>Choose your preferred option</small></span><select value={selected} onChange={(event) => { setSelected(event.target.value); writeSetting(label, event.target.value); onChange(event.target.value); }}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) { const [enabled, setEnabled] = useState(() => readSetting(label, value)); return <div className="setting-row"><span>{label}</span><button className={`toggle ${enabled ? 'on' : ''}`} onClick={() => { const next = !enabled; setEnabled(next); writeSetting(label, next); onChange(); }} aria-pressed={enabled}><i /></button></div>; }
function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: () => void }) { const [amount, setAmount] = useState(() => readSetting(label, value)); return <label className="setting-row slider-row"><span>{label}<b>{amount}%</b></span><input type="range" min="0" max="100" value={amount} onChange={(event) => { const next = Number(event.target.value); setAmount(next); writeSetting(label, next); onChange(); }} /></label>; }
function KeyGroup({ title, keys }: { title: string; keys: string[] }) { return <div className="key-group"><small>{title}</small><div>{keys.map((key) => <button key={key} onClick={() => undefined}>{key}</button>)}</div></div>; }
function SettingsAction({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) { return <button className={`settings-action ${danger ? 'danger-action' : ''}`} onClick={onClick}>{label}<span>↗</span></button>; }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="setting-row info-row"><span>{label}</span><b>{value}</b></div>; }
