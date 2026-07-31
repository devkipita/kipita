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

// ── Brand palette (mirrors the in-app theme) ─────────────────────────────
const BRAND = {
  ink: '#002113', // deep green — headings
  green: '#2C694D', // primary — buttons & accents
  greenDark: '#1F4E39', // header bar
  mint: '#B0F1CC', // primary container
  mintSoft: '#E7F8EE', // panel background
  muted: '#5B6B63', // secondary text
  border: '#E4EAE6',
  pageBg: '#F1F4F2',
};

async function buildEmail(
  template: string,
  data: Record<string, string>,
  user: { email: string; full_name: string },
  supabase: any,
): Promise<{ subject: string; html: string }> {
  const name = (user.full_name || '').trim().split(' ')[0] || 'there';

  switch (template) {
    case 'welcome':
      return {
        subject: 'Karibu Kipita! 🚗',
        html: emailLayout({
          preheader: "You're in. Let's get you moving across Kenya.",
          body: `
            ${heading(`Karibu, ${name}!`)}
            ${paragraph(
              "Welcome to Kipita — the smart way to share rides across Kenya. Whether you're catching a ride or offering seats, you're covered.",
            )}
            ${panel(`
              ${panelRow('🔎', 'Find a ride', 'Search routes and book a seat in seconds.')}
              ${panelRow('🚗', 'Offer a ride', 'Post your trip and fill empty seats.')}
              ${panelRow('💬', 'Stay in touch', 'Chat with drivers and riders in-app.')}
            `)}
            ${ctaButton('Open Kipita', 'kipita://home')}
            ${helpNote()}
          `,
        }),
      };

    case 'payment_receipt': {
      const { payment_id, booking_id } = data;
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', payment_id)
        .single();

      return {
        subject: 'Your Kipita payment receipt',
        html: emailLayout({
          preheader: `Payment of KES ${payment?.amount ?? ''} confirmed.`,
          body: `
            ${badge('Payment confirmed')}
            ${heading('Payment received ✓')}
            ${paragraph(`Hi ${name}, thanks for your payment. Here's your receipt.`)}
            ${detailCard([
              ['Amount', `KES ${payment?.amount ?? '—'}`, true],
              ['Method', String(payment?.method ?? '—').toUpperCase()],
              ['Reference', payment?.provider_reference ?? payment_id.slice(0, 12)],
            ])}
            ${ctaButton('View trip', `kipita://trips/${booking_id}`)}
            ${helpNote('Questions about this charge?')}
          `,
        }),
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
        subject: 'Your trip is confirmed 🎉',
        html: emailLayout({
          preheader: `${ride?.from_location ?? ''} → ${ride?.to_location ?? ''} · ${ride?.departure_date ?? ''}`,
          body: `
            ${badge('Trip confirmed')}
            ${heading('You’re all set! 🎉')}
            ${paragraph(`Hi ${name}, your seat is booked. Here are your trip details.`)}
            ${routePanel(
              ride?.from_location ?? '—',
              ride?.to_location ?? '—',
              ride?.departure_date ?? '—',
              ride?.departure_time ?? '—',
              booking?.seats_booked ?? 1,
            )}
            ${ctaButton('View trip details', `kipita://trips/${booking_id}`)}
            ${paragraph(`Safe travels! — Team Kipita`, BRAND.muted, 13)}
          `,
        }),
      };
    }

    default:
      return {
        subject: 'Kipita notification',
        html: emailLayout({
          preheader: 'You have a new update from Kipita.',
          body: `
            ${heading(`Hi ${name}`)}
            ${paragraph('You have a new notification from Kipita. Open the app to see the details.')}
            ${ctaButton('Open Kipita', 'kipita://home')}
            ${helpNote()}
          `,
        }),
      };
  }
}

// ── Layout & reusable components ─────────────────────────────────────────

function emailLayout({ preheader, body }: { preheader: string; body: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background:${BRAND.pageBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.pageBg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid ${BRAND.border};">
          <!-- Header -->
          <tr>
            <td style="background:${BRAND.greenDark};padding:28px 32px;">
              <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">Kipita</span>
              <span style="color:${BRAND.mint};font-size:22px;font-weight:800;"> 🚗</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:${BRAND.ink};font-size:15px;line-height:1.6;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#FAFBFA;padding:24px 32px;border-top:1px solid ${BRAND.border};">
              <p style="margin:0 0 6px;color:${BRAND.muted};font-size:12px;line-height:1.5;">
                You’re receiving this because you have a Kipita account.
              </p>
              <p style="margin:0;color:${BRAND.muted};font-size:12px;line-height:1.5;">
                © ${new Date().getFullYear()} Kipita · Nairobi, Kenya ·
                <a href="mailto:support@kipita.co.ke" style="color:${BRAND.green};text-decoration:none;font-weight:600;">Contact support</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 12px;color:${BRAND.ink};font-size:24px;font-weight:800;letter-spacing:-0.4px;line-height:1.25;">${text}</h1>`;
}

function paragraph(text: string, color: string = BRAND.ink, size = 15): string {
  return `<p style="margin:0 0 16px;color:${color};font-size:${size}px;line-height:1.6;">${text}</p>`;
}

function badge(text: string): string {
  return `<div style="display:inline-block;background:${BRAND.mint};color:${BRAND.ink};font-size:12px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;padding:6px 12px;border-radius:999px;margin:0 0 16px;">${text}</div>`;
}

function ctaButton(label: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
      <tr>
        <td style="border-radius:14px;background:${BRAND.green};">
          <a href="${href}" style="display:inline-block;padding:15px 34px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:14px;">${label}</a>
        </td>
      </tr>
    </table>`;
}

/** Rows of label → value; pass [label, value, emphasise?]. */
function detailCard(rows: Array<[string, string] | [string, string, boolean]>): string {
  const body = rows
    .map(([label, value, strong], i) => {
      const border = i < rows.length - 1 ? `border-bottom:1px solid ${BRAND.border};` : '';
      const valueStyle = strong
        ? `color:${BRAND.ink};font-size:18px;font-weight:800;`
        : `color:${BRAND.ink};font-size:14px;font-weight:600;`;
      return `
        <tr>
          <td style="padding:12px 0;color:${BRAND.muted};font-size:14px;${border}">${label}</td>
          <td style="padding:12px 0;text-align:right;${valueStyle}${border}">${value}</td>
        </tr>`;
    })
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.mintSoft};border:1px solid ${BRAND.border};border-radius:16px;padding:4px 20px;margin:8px 0 4px;">
      ${body}
    </table>`;
}

function routePanel(from: string, to: string, date: string, time: string, seats: number): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.mintSoft};border:1px solid ${BRAND.border};border-radius:16px;margin:8px 0 4px;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0;color:${BRAND.ink};font-size:17px;font-weight:800;line-height:1.4;">${from} <span style="color:${BRAND.green};">→</span> ${to}</p>
          <p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px;">📅 &nbsp;${date} · ${time}</p>
          <p style="margin:6px 0 0;color:${BRAND.muted};font-size:14px;">💺 &nbsp;${seats} seat${seats === 1 ? '' : 's'}</p>
        </td>
      </tr>
    </table>`;
}

function panel(rows: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.mintSoft};border:1px solid ${BRAND.border};border-radius:16px;margin:8px 0 4px;">
      <tr><td style="padding:8px 20px;">${rows}</td></tr>
    </table>`;
}

function panelRow(icon: string, title: string, desc: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="32" valign="top" style="padding:12px 0;font-size:20px;">${icon}</td>
        <td style="padding:12px 0;">
          <p style="margin:0;color:${BRAND.ink};font-size:15px;font-weight:700;">${title}</p>
          <p style="margin:2px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.5;">${desc}</p>
        </td>
      </tr>
    </table>`;
}

function helpNote(lead = 'Need a hand?'): string {
  return `<p style="margin:20px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.6;">${lead} Reach us anytime at <a href="mailto:support@kipita.co.ke" style="color:${BRAND.green};text-decoration:none;font-weight:600;">support@kipita.co.ke</a>.</p>`;
}
