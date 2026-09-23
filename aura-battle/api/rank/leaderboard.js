import { getLeaderboard, hasSupabase } from '../../server/supabase.js';

export default async function handler(_req, res) {
  if (!hasSupabase) {
    res.status(503).json({ error: 'Supabase persistence is not configured.' });
    return;
  }
  try {
    res.status(200).json({ profiles: await getLeaderboard() });
  } catch (error) {
    console.error('[AuraBattle][API] leaderboard error', error);
    res.status(500).json({ error: 'Unable to load leaderboard.' });
  }
}
