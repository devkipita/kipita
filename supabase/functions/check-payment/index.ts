import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: authData } = await supabase.auth.getUser(jwt);
    if (!authData?.user) {
      return new Response(JSON.stringify({ error: 'Not signed in' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: caller } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authData.user.id)
      .maybeSingle();

    if (!caller) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { payment_id } = await req.json();

    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .eq('user_id', caller.id)
      .single();

    if (error || !payment) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      status: payment.status,
      completed: payment.status === 'completed',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Check failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
