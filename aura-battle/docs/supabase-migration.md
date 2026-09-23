# Supabase migration

## Required environment

Client:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server/Vercel only:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Never expose `SUPABASE_SERVICE_ROLE_KEY` through a `VITE_` variable.

## Apply schema

Run the SQL in `supabase/migrations/202609230001_initial.sql` with the Supabase CLI or SQL editor. The migration creates profiles, wallets, inventory, matches, match players, event progress, daily claims, RLS policies and the transactional rank RPC.

## Migration behavior

The existing browser auth store remains available as a legacy fallback when Supabase client variables are absent. Once Supabase Auth is configured, new sign-ins use Supabase Auth and the browser session is only a UI cache. Existing local accounts cannot have their client-side SHA-256 password hashes imported into Supabase Auth; users must authenticate again during migration.

## Deployment boundary

Vercel API handlers must use the service-role key only on the server and validate the Supabase access token before changing persistent data. WebSocket room membership and WebRTC signaling remain ephemeral and should run on a realtime service rather than Vercel Functions.
