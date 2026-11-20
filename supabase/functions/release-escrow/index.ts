import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

/**
 * RETIRED (migration 068). Fares are no longer released from the browser or by any caller of this function.
 *
 * The database releases each boarded passenger's fare by itself, `release_window_hours` (6) after the ride is
 * completed, and only when nobody has reported a problem: see `release_due_escrow()` and the cron job
 * `kipita-release-escrow`. A function that let a driver, or a page they control, trigger the release would
 * bypass the pickup-code check and the problem window, so this one answers 410 Gone to everyone.
 *
 * Deploy this version before (or together with) migration 068. Until it is deployed, the previous version is
 * still callable by a driver's own sign-in token.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  return new Response(
    JSON.stringify({
      error: 'Fares are released automatically after the ride, once the problem window has passed.',
    }),
    { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
