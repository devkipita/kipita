/**
 * RETIRED 20 Nov 2026.
 *
 * Refunds are no longer requested and reviewed by hand. A passenger cancels the booking and the
 * database settles the money under the cancellation policy (migration 063: cancel_booking,
 * mark_no_show, resolve_no_show). The old flow parked the fare at 'refund_pending' and left a request
 * for an admin, which collided with the no-show hold and could pay a fare out twice.
 *
 * The function stays deployed only so that anything still calling it gets a clear answer instead of a
 * 404. Nothing here reads or writes the database. Delete it once no client refers to it.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      requested: false,
      reason: 'use_cancel',
      message:
        'Refund requests are retired. Cancel the booking instead and the refund follows the cancellation policy.',
    }),
    { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
