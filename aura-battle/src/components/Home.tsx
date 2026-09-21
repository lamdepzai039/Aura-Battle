import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { addMessage, getMessages, reactToMessage, type ChatChannel, type ChatMessage } from '../utils/chatStore';
import { getGuildState } from '../utils/guildStore';
import { DAILY_LOGIN_REWARDS, claimDailyReward, getDailyLoginState, getLoginDayIndex } from '../utils/dailyLogin';
import { claimEventReward, getActiveEvent, getEventCatalog, getEventProgressById, redeemEventCode } from '../utils/eventStore';
import { ClickForAura } from './ClickForAura';
import { MemeSticker } from './MemeSticker';
import { getPlayerProfile } from '../utils/playerProfile';

export function Home({
  username,
  onPlay,
  onPractice,
  onLeaderboard,
  onShop,
  onGuild,
  onSettings,
}: {
  username: string;
  onPlay: () => void;
  onPractice: () => void;
  onLeaderboard: () => void;
  onShop: () => void;
  onGuild: () => void;
  onSettings: () => void;
}) {
  const profile = getPlayerProfile(username);
  const [chatOpen, setChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeChat, setActiveChat] = useState('GLOBAL');
  const [message, setMessage] = useState('');
  const [socialPanel, setSocialPanel] = useState<'friends' | 'mail' | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [questOpen, setQuestOpen] = useState(false);
  const [eventCode, setEventCode] = useState('');
  const [eventCodeNotice, setEventCodeNotice] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => getMessages('GLOBAL'));
  const [chatNotice, setChatNotice] = useState('');
  const [claimNotice, setClaimNotice] = useState('');
  const [eventCatalog, setEventCatalog] = useState(() => getEventCatalog(username));
  const [selectedEventId, setSelectedEventId] = useState(() => getActiveEvent(username).id);
  const [clickAura, setClickAura] = useState(0);
  const [dailyState, setDailyState] = useState(() => getDailyLoginState());
  const [now, setNow] = useState(() => Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSentAt = useRef(0);

  const eventState = eventCatalog.find((event) => event.id === selectedEventId) ?? eventCatalog[0] ?? getActiveEvent(username);
  const eventProgress = getEventProgressById(username, eventState.id);
  const currentDay = getLoginDayIndex();
  const currentDayReward = DAILY_LOGIN_REWARDS.find((reward) => reward.day === currentDay);
  const loginClaimable = !dailyState.claimedDays.includes(currentDay) && currentDay > dailyState.lastClaimedDay;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!eventOpen && !questOpen) return undefined;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setEventOpen(false);
        setQuestOpen(false);
      }
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [eventOpen, questOpen]);

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if (!content) return;
    if (activeChat === 'GUILD' && !getGuildState()) { setChatNotice('Join a Guild before using Guild Chat.'); return; }
    if (Date.now() - lastSentAt.current < 1200) { setChatNotice('Please wait before sending another message.'); return; }
    lastSentAt.current = Date.now();
    addMessage(activeChat as ChatChannel, username, content);
    setMessages(getMessages(activeChat as ChatChannel));
    setMessage('');
    setChatNotice('');
  }

  function handleClaimEvent() {
    const nextState = claimEventReward(username, eventState.id);
    setEventCatalog(getEventCatalog(username));
    setClaimNotice(nextState.claimed ? 'Event reward claimed!' : 'Complete every event task to claim.');
  }

  function handleRedeemEventCode(event: FormEvent) {
    event.preventDefault();
    const result = redeemEventCode(username, eventCode);
    setEventCodeNotice(result.message);
    if (result.success) {
      setEventCode('');
      setClaimNotice(`Code redeemed: ${result.reward}`);
    }
  }

  function handleClaimDaily() {
    const result = claimDailyReward();
    if (result.success) {
      setDailyState(result.state);
      setClaimNotice(`Day ${result.day} reward claimed!`);
    } else {
      setClaimNotice(result.message);
    }
  }

  return (
    <div className="home-shell">
      <div className="home-grid" aria-hidden="true" />
      <div className="home-orb home-orb-one" aria-hidden="true" />
      <div className="home-orb home-orb-two" aria-hidden="true" />
      <div className="home-particles" aria-hidden="true" />

      <header className="home-topbar">
        <button className="profile-card" onClick={() => setProfileOpen((open) => !open)} aria-label="Open player profile">
          <span className="avatar avatar-lam">{username.slice(0, 1).toUpperCase()}</span>
          <span className="profile-copy"><strong>{username}</strong><small>#829381 · LV.{profile.level}</small></span>
          <span className="profile-rank">{profile.rankEmoji} {profile.rank}</span>
          <span className="xp-track"><i /></span>
        </button>

        <div className="top-actions">
          <div className="top-actions-stack">
            <button className="icon-action" aria-label="Add friend" onClick={() => setSocialPanel('friends')}><span>＋</span><small>FRIENDS</small></button>
            <button className="icon-action event-button" aria-label="Open event panel" onClick={() => setEventOpen(true)}>
              <span>✦</span>
              <b className="pulse-dot">•</b>
              <small>EVENT</small>
            </button>
            <button className="icon-action quest-toggle-button" aria-label="Toggle quest panel" onClick={() => setQuestOpen((open) => !open)}>
              <span>◈</span>
              <small>QUEST</small>
            </button>
          </div>
          <button className="icon-action" aria-label="Open mail" onClick={() => setSocialPanel('mail')}><span>✉</span><small>INBOX</small></button>
        </div>
      </header>

      {profileOpen && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="profile-popover">
        <span className="avatar avatar-lam avatar-large">{username.slice(0, 1).toUpperCase()}</span><div><strong>{username}</strong><p>{profile.rank} · {profile.rating.toLocaleString()} RP</p></div>
        <button onClick={() => setProfileOpen(false)}>VIEW PROFILE <span>↗</span></button>
      </motion.div>}

      {eventOpen && (
        <div className="event-modal-backdrop" onClick={() => setEventOpen(false)}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="event-title" initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="event-modal" onClick={(event) => event.stopPropagation()}>
            <div className="event-modal-header">
              <div>
                <span className="eyebrow event-kicker">ACTIVE EVENT</span>
                <h2 id="event-title">{eventState.title}</h2>
              </div>
              <button onClick={() => setEventOpen(false)} aria-label="Close event panel">×</button>
            </div>

            <div className="event-summary-grid">
              <div className="event-metric">
                <span>EVENT PROGRESS</span>
                <strong>{eventProgress}%</strong>
              </div>
              <div className="event-metric">
                <span>ENDS IN</span>
                <strong>{Math.max(1, Math.ceil((new Date(eventState.endDate).getTime() - now) / (1000 * 60 * 60 * 24)))}D</strong>
              </div>
            </div>

            <div className="event-summary-grid" style={{ marginTop: '0.8rem' }}>
              {eventCatalog.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEventId(event.id)}
                  style={{
                    border: event.id === selectedEventId ? '1px solid rgba(45, 212, 191, 0.8)' : '1px solid rgba(255,255,255,0.08)',
                    background: event.id === selectedEventId ? 'rgba(34, 211, 238, 0.08)' : 'rgba(15, 23, 42, 0.5)',
                    color: '#e2f7ff',
                    borderRadius: '999px',
                    padding: '0.45rem 0.8rem',
                    fontSize: '10px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                  }}
                >
                  {event.kind}
                </button>
              ))}
            </div>

            <p className="event-description">{eventState.description}</p>

            <ClickForAura aura={clickAura} onAuraEarned={() => setClickAura((value) => value + 1)} />

            <div className="event-progress-bar">
              <i style={{ width: `${eventProgress}%` }} />
            </div>

            <div className="event-task-list">
              {eventState.tasks.map((task) => {
                const percent = Math.min(100, Math.round((task.progress / task.goal) * 100));
                return (
                  <div key={task.id} className="event-task-item">
                    <div className="event-task-meta">
                      <strong>{task.title}</strong>
                      <span>{task.progress}/{task.goal}</span>
                    </div>
                    <div className="mini-progress"><i style={{ width: `${percent}%` }} /></div>
                    <small>{task.reward}</small>
                  </div>
                );
              })}
            </div>

            <div className="event-rewards">
              <span className="eyebrow">REWARDS</span>
              <div className="reward-chips">{eventState.totalRewards.map((reward) => <span key={reward}>{reward}</span>)}</div>
            </div>

            <form className="event-code-form" onSubmit={handleRedeemEventCode}>
              <label htmlFor="event-code-input">ENTER EVENT CODE</label>
              <div className="event-code-row">
                <input id="event-code-input" value={eventCode} onChange={(event) => setEventCode(event.target.value.toUpperCase())} maxLength={20} placeholder="WELCOME" aria-label="Enter event code" />
                <button type="submit" className="event-code-button">REDEEM</button>
              </div>
              {eventCodeNotice && <small className="event-code-status">{eventCodeNotice}</small>}
            </form>

            <button className="event-claim-button" onClick={handleClaimEvent} disabled={eventState.claimed || eventProgress < 100}>
              {eventState.claimed ? 'CLAIMED' : eventProgress >= 100 ? 'CLAIM REWARD' : 'KEEP PUSHING'}
            </button>
          </motion.div>
        </div>
      )}

      <aside className={`chat-panel ${chatOpen ? 'chat-panel-open' : ''}`}>
        <div className="chat-heading"><div><span className="eyebrow"><i className="live-dot" /> COMMUNITY FEED</span><h2>GLOBAL CHAT</h2></div><button onClick={() => setChatOpen(false)} className="chat-close" aria-label="Close chat">×</button></div>
        <div className="chat-tabs">{['GLOBAL', 'GUILD', 'PARTY'].map((tab) => <button key={tab} className={activeChat === tab ? 'active' : ''} onClick={() => { setActiveChat(tab); setMessages(getMessages(tab as ChatChannel)); }}>{tab}</button>)}</div>
        <div className="chat-messages" aria-live="polite">{messages.length ? messages.map((item) => <ChatBubble key={item.id} message={item} onReact={(reaction) => { reactToMessage(item.id, reaction); setMessages(getMessages(activeChat as ChatChannel)); }} />) : <div className="chat-empty-state">No messages yet. Start the conversation.</div>}<div ref={messagesEndRef} /></div>
        <form className="chat-input" onSubmit={sendMessage}><input value={message} maxLength={80} onChange={(event) => setMessage(event.target.value)} placeholder="Message..." aria-label="Chat message" /><button type="submit" aria-label="Send message">↗</button></form>
        <small className="chat-note">{chatNotice || 'Be respectful · 80 character limit · local chat mode'}</small>
      </aside>

      {questOpen && (
        <div className="quest-panel-backdrop" onClick={() => setQuestOpen(false)}>
          <aside className="quest-panel" aria-labelledby="quest-title" onClick={(event) => event.stopPropagation()}>
            <div className="quest-heading">
              <div><span className="eyebrow">ACTIVE OBJECTIVES</span><h2 id="quest-title">QUESTS</h2></div>
              <button type="button" className="quest-close" aria-label="Close quest panel" onClick={() => setQuestOpen(false)}>×</button>
            </div>
            <div className="quest-event-label"><span>{eventState.title}</span><strong>{eventProgress}%</strong></div>
            <div className="quest-progress"><i style={{ width: `${eventProgress}%` }} /></div>
            <div className="quest-list">
              {eventState.tasks.map((task) => {
                const percent = Math.min(100, Math.round((task.progress / task.goal) * 100));
                const complete = task.progress >= task.goal;
                return (
                  <div key={task.id} className={`quest-item ${complete ? 'complete' : ''}`}>
                    <span className="quest-icon">{complete ? '✓' : '◆'}</span>
                    <div className="quest-copy">
                      <strong>{task.title}</strong>
                      <div className="quest-item-meta"><span>{task.progress}/{task.goal}</span><small>{task.reward}</small></div>
                      <div className="quest-item-progress"><i style={{ width: `${percent}%` }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="quest-view-button" onClick={() => { setQuestOpen(false); setEventOpen(true); }}>VIEW EVENT <span>↗</span></button>
          </aside>
        </div>
      )}

      {socialPanel && <div className="social-panel"><div className="social-panel-heading"><div><span className="eyebrow">PLAYER CONNECTIONS</span><h2>{socialPanel === 'friends' ? 'ADD FRIEND' : 'MAIL'}</h2></div><button onClick={() => setSocialPanel(null)} aria-label="Close panel">×</button></div>{socialPanel === 'friends' ? <><p className="panel-copy">Find players by username or Player ID.</p><div className="social-search"><input placeholder="Username or #Player ID" /><button type="button">SEARCH</button></div><div className="empty-social"><span>＋</span><strong>NO REQUESTS YET</strong><small>Friend requests will appear here.</small></div></> : <div className="empty-social"><span>✉</span><strong>YOUR INBOX IS EMPTY</strong><small>System mail and invites will appear here.</small></div>}</div>}

      <main className="home-main">
        <div className="meme-layer" aria-hidden="true"><MemeSticker kind="67" size="large" className="meme-hero-67" /><MemeSticker kind="THINKING" size="small" className="meme-hero-thinking" /><MemeSticker kind="HUH" size="small" className="meme-hero-huh" /><MemeSticker kind="MIKE" size="small" className="meme-hero-mike" /></div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="title-block">
          <span className="season-label"><i /> SEASON 03 <em>ENDS IN 12D 08H</em></span>
          <h1>AURA <span>BATTLE</span></h1>
          <p>READY FOR THE NEXT ROUND</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.45 }} className="hero-summary">
          <span className="hero-chip">RANKED</span>
          <span className="hero-chip">PRACTICE</span>
          <span className="hero-chip">PARTY</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.6 }} className="play-layout">
          <div className="play-column">
            <button className="play-button" onClick={onPlay}>
              <span className="play-icon">⚡</span>
              <strong>PLAY</strong>
              <small>QUICK MATCH</small>
            </button>
            <span className="match-hint"><i /> FIND MATCH <b>•</b> ~12S</span>
            <MemeSticker kind="LOCK IN" size="micro" className="meme-lock-in" />
          </div>

          <div className="rank-card">
            <div className="rank-card-top">
              <span className="rank-symbol">✦</span>
              <div>
                <small>CURRENT RANK</small>
                <h2>{profile.rank}</h2>
              </div>
              <span className="rank-caret">↗</span>
            </div>
            <div className="rp-row">
              <strong>{username ? username.slice(0, 1).toUpperCase() : 'A'}</strong>
              <span>ARMOR</span>
              <em>READY</em>
            </div>
            <div className="progress-bar"><i /></div>
            <div className="next-rank"><span>STREAK</span><b>HOT</b></div>
          </div>
        </motion.div>

        <div className="utility-row"><button onClick={onPractice}><span>◈</span> PRACTICE</button><button onClick={onLeaderboard}><span>♜</span> LEADERBOARD</button></div>

        <section className="feature-grid">
          <div className="daily-login-panel">
            <div className="panel-heading-row">
              <div>
                <span className="eyebrow">DAILY LOGIN</span>
                <h3>30 DAY REWARDS</h3>
              </div>
              <button className="claim-mini-button" onClick={handleClaimDaily} disabled={!loginClaimable}>{loginClaimable ? 'CLAIM' : 'LIVE'}</button>
            </div>
            <div className="daily-grid">
              {DAILY_LOGIN_REWARDS.map((reward) => {
                const claimed = dailyState.claimedDays.includes(reward.day);
                const isCurrent = reward.day === currentDay;
                const locked = reward.day > currentDay && !claimed;
                const stateClass = claimed ? 'claimed' : locked ? 'locked' : isCurrent ? 'current' : 'available';
                return (
                    <div key={reward.day} className={`daily-cell ${stateClass}`}>
                    <span className="day-label">DAY {reward.day}</span>
                    <strong>{reward.icon}</strong>
                    <em>{reward.label}</em>
                    <small>{reward.amount}</small>
                      <span className="daily-status">{claimed ? 'CLAIMED' : locked ? 'LOCKED' : isCurrent ? 'CLAIMABLE' : 'AVAILABLE'}</span>
                  </div>
                );
              })}
            </div>
            {currentDayReward && <div className="daily-current-reward">Today: <strong>{currentDayReward.label}</strong> {currentDayReward.amount}</div>}
            {claimNotice && <p className="claim-notice" role="status">{claimNotice}</p>}
          </div>

          <div className="event-preview-panel">
            <div className="panel-heading-row">
              <div>
                <span className="eyebrow">EVENT</span>
                <h3>{eventState.title}</h3>
              </div>
              <button className="ghost-button" onClick={() => setEventOpen(true)}>OPEN</button>
            </div>
            <p className="event-preview-copy">{eventState.description}</p>
            <div className="event-mini-progress">
              <span>{eventProgress}%</span>
              <div><i style={{ width: `${eventProgress}%` }} /></div>
            </div>
            <div className="event-preview-rewards">
              {eventState.totalRewards.slice(0, 3).map((reward) => <span key={reward}>{reward}</span>)}
            </div>
          </div>
        </section>

        <div className="online-status"><span className="status-pulse" /> ONLINE STATUS <b>ACTIVE NOW</b></div>
      </main>

      <button className="mobile-chat-trigger" onClick={() => setChatOpen(true)} aria-label="Open global chat">◌</button>
      <nav className="bottom-nav">{[['⌂', 'HOME'], ['◇', 'SHOP'], ['♜', 'LEADERBOARD'], ['⚔', 'PLAY MODE'], ['♢', 'GUILD'], ['⚙', 'SETTINGS']].map(([icon, label], index) => <button key={label} className={index === 0 ? 'active' : ''} onClick={label === 'SHOP' ? onShop : label === 'LEADERBOARD' ? onLeaderboard : label === 'PLAY MODE' ? onPlay : label === 'GUILD' ? onGuild : label === 'SETTINGS' ? onSettings : undefined}><span>{icon}</span><small>{label}</small></button>)}</nav>
    </div>
  );
}

function ChatBubble({ message, onReact }: { message: ChatMessage; onReact: (reaction: string) => void }) { return <div className="chat-bubble"><span className="chat-avatar">{message.username.slice(0, 1).toUpperCase()}</span><div><p><strong>{message.username}</strong><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></p><span>{message.content}</span><div className="chat-reactions"><button onClick={() => onReact('🔥')}>🔥 {message.reactions['🔥'] || 0}</button><button onClick={() => onReact('😂')}>😂 {message.reactions['😂'] || 0}</button></div></div></div>; }
