import { getProfile, getProfileByUsername, hasSupabase, requireUser, supabaseAdmin } from '../../server/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  const teamA = Array.isArray(req.body?.teamA) ? req.body.teamA.filter((name) => typeof name === 'string') : [];
  const teamB = Array.isArray(req.body?.teamB) ? req.body.teamB.filter((name) => typeof name === 'string') : [];
  if (!hasSupabase || !teamA.length || !teamB.length || !['win', 'loss', 'tie'].includes(req.body?.outcome)) {
    res.status(400).json({ error: 'Invalid team match payload or missing persistence configuration.' });
    return;
  }
  try {
    const user = await requireUser(req);
    const current = await getProfile(user.id);
    const names = [...teamA, ...teamB].map((name) => name.trim().toLowerCase());
    if (!current || !names.includes(current.username.toLowerCase())) {
      res.status(403).json({ error: 'Authenticated player is not part of this team match.' });
      return;
    }
    const resolveTeam = async (namesForTeam) => {
      const profiles = await Promise.all(namesForTeam.map((name) => getProfileByUsername(name)));
      if (profiles.some((profile) => !profile)) throw Object.assign(new Error('Team player profile not found.'), { statusCode: 400 });
      return profiles.map((profile) => profile.id);
    };
    const { data, error } = await supabaseAdmin.rpc('record_team_rank_match', { p_team_a: await resolveTeam(teamA), p_team_b: await resolveTeam(teamB), p_outcome: req.body.outcome, p_mode: req.body.mode || 'duo' });
    if (error) throw error;
    res.status(200).json({ profiles: data || [] });
  } catch (error) {
    console.error('[AuraBattle][API] team rank match error', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Unable to record team match.' });
  }
}
