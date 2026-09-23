import { describe, expect, it } from 'vitest';
import { hasSupabase, requireUser } from './supabase.js';

describe('Supabase persistence boundary', () => {
  it('does not claim persistence without server credentials', () => {
    if (process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    expect(hasSupabase).toBe(false);
  });

  it('rejects unauthenticated requests when persistence is configured', async () => {
    if (!hasSupabase) return;
    await expect(requireUser({ headers: {} })).rejects.toMatchObject({ statusCode: 401 });
  });
});
