import { getProfile, getProfileByUsername, hasSupabase, requireUser, supabaseAdmin } from '../../server/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  if (!hasSupabase || typeof req.body?.playerA !== 'string' || typeof req.body?.playerB !== 'string' || !['win', 'loss', 'tie'].includes(req.body?.outcome)) {
    res.status(400).json({ error: 'Invalid rank match payload or missing persistence configuration.' });
    return;
  }
  try {
    const user = await requireUser(req);
    const current = await getProfile(user.id);
    const opponent = await getProfileByUsername(req.body.playerB);
    if (!current || current.username.toLowerCase() !== req.body.playerA.trim().toLowerCase() || !opponent) {
      res.status(403).json({ error: 'Player identity does not match the authenticated user.' });
      return;
    }
    const { data, error } = await supabaseAdmin.rpc('record_rank_match', { p_player_a: user.id, p_player_b: opponent.id, p_outcome: req.body.outcome, p_mode: req.body.mode || 'online' });
    if (error) throw error;
    res.status(200).json({ profiles: data || [] });
  } catch (error) {
    console.error('[AuraBattle][API] rank match error', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Unable to record match.' });
  }
}
