import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = 'Kipita <noreply@kipita.co.ke>';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { template, to: userId, data } = await req.json();

    // Fetch user email
    const { data: user } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!user?.email) {
      return new Response(JSON.stringify({ error: 'No email for user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { subject, html } = await buildEmail(template, data, user, supabase);

    // Send via Resend (or any transactional email provider)
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [user.email],
        subject,
        html,
      }),
    });

    const emailData = await emailRes.json();

    return new Response(JSON.stringify({ success: true, id: emailData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Email send error:', err);
    return new Response(JSON.stringify({ error: 'Email send failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function buildEmail(
  template: string,
  data: Record<string, string>,
  user: { email: string; full_name: string },
  supabase: any,
): Promise<{ subject: string; html: string }> {
  const name = user.full_name || 'there';

  switch (template) {
    case 'welcome':
      return {
        subject: 'Karibu Kipita! 🚗',
        html: emailLayout(`
          <h2 style="color:#1B5E20;">Karibu, ${name}!</h2>
          <p>Welcome to Kipita — Kenya's smartest carpool app.</p>
          <p>Whether you're getting a ride or offering one, we've got you covered.</p>
          ${ctaButton('Open Kipita', 'kipita://home')}
          <p style="color:#888;font-size:13px;">Need help? Reach us at support@kipita.co.ke</p>
        `),
      };

    case 'payment_receipt': {
      const { payment_id, booking_id } = data;
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', payment_id)
        .single();

      return {
        subject: 'Payment Receipt — Kipita',
        html: emailLayout(`
          <h2 style="color:#1B5E20;">Payment Confirmed ✓</h2>
          <p>Hi ${name},</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px 0;color:#666;">Amount</td><td style="padding:8px 0;text-align:right;font-weight:600;">KES ${payment?.amount ?? '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Method</td><td style="padding:8px 0;text-align:right;font-weight:600;">${(payment?.method ?? '').toUpperCase()}</td></tr>
            <tr><td style="padding:8px 0;color:#666;">Reference</td><td style="padding:8px 0;text-align:right;font-size:12px;">${payment?.provider_reference ?? payment_id.slice(0, 12)}</td></tr>
          </table>
          ${ctaButton('View Trip', `kipita://trips/${booking_id}`)}
          <p style="color:#888;font-size:13px;">Questions? Contact support@kipita.co.ke</p>
        `),
      };
    }

    case 'trip_confirmation': {
      const { booking_id } = data;
      const { data: booking } = await supabase
        .from('bookings')
        .select('*, ride:rides(from_location, to_location, departure_date, departure_time)')
        .eq('id', booking_id)
        .single();

      const ride = booking?.ride;

      return {
        subject: 'Trip Confirmed — Kipita',
        html: emailLayout(`
          <h2 style="color:#1B5E20;">Trip Confirmed! 🎉</h2>
          <p>Hi ${name}, your trip is all set.</p>
          <div style="background:#E8F5E9;border-radius:12px;padding:16px;margin:16px 0;">
            <p style="margin:0;font-weight:600;">📍 ${ride?.from_location ?? '—'} → ${ride?.to_location ?? '—'}</p>
            <p style="margin:8px 0 0;color:#666;">📅 ${ride?.departure_date ?? '—'} at ${ride?.departure_time ?? '—'}</p>
            <p style="margin:8px 0 0;color:#666;">💺 ${booking?.seats_booked ?? 1} seat(s)</p>
          </div>
          ${ctaButton('View Trip Details', `kipita://trips/${booking_id}`)}
          <p style="color:#888;font-size:13px;">Safe travels! — Team Kipita</p>
        `),
      };
    }

    default:
      return {
        subject: 'Kipita Notification',
        html: emailLayout(`<p>Hi ${name}, you have a new notification from Kipita.</p>`),
      };
  }
}

function emailLayout(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="background:#1B5E20;padding:24px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">🚗 Kipita</h1>
    </div>
    <!-- Body -->
    <div style="padding:24px 28px;">
      ${body}
    </div>
    <!-- Footer -->
    <div style="background:#f9f9f9;padding:16px 28px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;color:#999;font-size:12px;">© ${new Date().getFullYear()} Kipita. Nairobi, Kenya.</p>
      <p style="margin:4px 0 0;color:#999;font-size:12px;">
        <a href="mailto:support@kipita.co.ke" style="color:#1B5E20;">Contact Support</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function ctaButton(label: string, href: string): string {
  return `
    <div style="text-align:center;margin:24px 0;">
      <a href="${href}" style="display:inline-block;background:#1B5E20;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:15px;">
        ${label}
      </a>
    </div>`;
}
