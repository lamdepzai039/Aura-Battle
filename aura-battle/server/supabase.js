import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabase = Boolean(supabaseUrl && serviceRoleKey);
export const supabaseAdmin = hasSupabase ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export async function requireUser(req) {
  if (!supabaseAdmin) {
    const error = new Error('Supabase server configuration is missing.');
    error.statusCode = 503;
    throw error;
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    const authError = new Error('Invalid authentication token.');
    authError.statusCode = 401;
    throw authError;
  }
  return data.user;
}

export async function getProfileByUsername(username) {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin.from('profiles').select('*').ilike('username', username).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProfile(userId) {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLeaderboard(limit = 100) {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin.from('profiles').select('id,username,level,xp,rating,tier,wins,losses,ties,updated_at').order('rating', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}
