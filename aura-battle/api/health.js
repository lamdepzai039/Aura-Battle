import { hasSupabase } from '../server/supabase.js';

export default function handler(_req, res) {
  res.status(200).json({ ok: true, persistence: hasSupabase ? 'supabase' : 'unconfigured' });
}
