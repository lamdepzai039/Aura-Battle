import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { registerAccount, signIn, startExternalSession } from '../utils/auth';
import { supabase } from '../utils/supabaseClient';

type LoginMode = 'signin' | 'signup';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function readGoogleProfile(credential: string): { name?: string; email?: string } | null {
  try {
    const payload = credential.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { name?: string; email?: string };
  } catch {
    return null;
  }
}

export function Login({ onAuthenticated }: { onAuthenticated: (username?: string) => void }) {
  const [mode, setMode] = useState<LoginMode>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const googleInitialized = useRef(false);

  useEffect(() => {
    if (supabase) {
      void supabase.auth.getSession().then(({ data }) => {
        const user = data.session?.user;
        if (!user) return;
        const emailAddress = user.email || '';
        const nextUsername = String(user.user_metadata?.username || emailAddress.split('@')[0] || 'SUPABASE PLAYER');
        startExternalSession(nextUsername, emailAddress);
        onAuthenticated(nextUsername);
      });
      return undefined;
    }
    if (!googleClientId) return;
    const initialize = () => {
      if (!window.google || googleInitialized.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: ({ credential }) => {
          const profile = readGoogleProfile(credential);
          if (!profile) {
            setNotice('Google returned an invalid credential.');
            return;
          }
          const googleUsername = profile.name || profile.email?.split('@')[0] || 'GOOGLE PLAYER';
          if (profile.email) startExternalSession(googleUsername, profile.email);
          onAuthenticated(googleUsername);
        },
      });
      googleInitialized.current = true;
      setGoogleReady(true);
    };
    initialize();
    const timer = window.setInterval(initialize, 250);
    return () => window.clearInterval(timer);
  }, [googleClientId, onAuthenticated]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === 'signup' && !username.trim()) {
      setNotice('Choose a username to continue.');
      return;
    }
    if (!email.includes('@') || password.length < 6) {
      setNotice('Enter a valid email and a 6+ character password.');
      return;
    }
    const result = mode === 'signup'
      ? await registerAccount(username, email, password)
      : await signIn(email, password);
    if (!result.ok) {
      setNotice(result.message || 'Unable to authenticate.');
      return;
    }
    onAuthenticated(result.username || username.trim() || 'LAM');
  }

  return (
    <main className="auth-shell">
      <div className="auth-aura auth-aura-one" aria-hidden="true" />
      <div className="auth-aura auth-aura-two" aria-hidden="true" />
      <div className="auth-grid" aria-hidden="true" />
      <motion.section className="auth-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="auth-brand"><span className="auth-mark">✦</span><span>AURA <b>BATTLE</b></span></div>
        <div className="auth-intro"><span className="eyebrow">WELCOME BACK, PLAYER</span><h1>{mode === 'signin' ? 'Enter the arena.' : 'Claim your aura.'}</h1><p>{mode === 'signin' ? 'Sign in to continue your competitive journey.' : 'Create your identity and join the arena.'}</p></div>
        <div className="auth-tabs" role="tablist"><button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setNotice(''); }} role="tab">SIGN IN</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setNotice(''); }} role="tab">CREATE ACCOUNT</button></div>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && <label>USERNAME<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your player name" maxLength={20} /></label>}
          <label>EMAIL<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="player@example.com" autoComplete="email" /></label>
          <label>PASSWORD<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="6+ characters" minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></label>
          {mode === 'signin' && <button type="button" className="auth-link">FORGOT PASSWORD?</button>}
          {notice && <p className="auth-notice" role="alert">{notice}</p>}
          <button className="auth-submit" type="submit">{mode === 'signin' ? 'ENTER ARENA' : 'CREATE ACCOUNT'} <span>↗</span></button>
        </form>
        <div className="auth-divider"><span>OR CONTINUE WITH</span></div>
        <button className="google-button" type="button" disabled={!supabase && !googleReady} onClick={() => { if (supabase) { void supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }); } else { window.google?.accounts.id.prompt(); } }}><span className="google-g">G</span> GOOGLE <small>{supabase || googleReady ? 'CONTINUE' : 'LOADING'}</small></button>
        <button className="guest-button" type="button" onClick={() => onAuthenticated('LAM')}>CONTINUE AS GUEST <span>→</span></button>
        <small className="auth-footer">By continuing, you agree to the Aura Battle terms.</small>
      </motion.section>
    </main>
  );
}
