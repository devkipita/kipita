# Kipita auth email templates

Branded HTML for the Supabase Auth emails, matching the web app (green theme,
DM Sans, rounded, GenZ-warm tone). These are **not** wired up automatically —
paste them into the Supabase dashboard.

## Where to paste

Supabase → **Authentication → Email Templates**:

| File                  | Template          | Used by                                         |
| --------------------- | ----------------- | ----------------------------------------------- |
| `magic-link.html`     | **Magic Link**    | Email-first signup (`signInWithOtp` email link) |
| `magic-link.html`     | **Confirm signup**| If you switch to password-at-signup             |
| `reset-password.html` | **Reset Password**| Forgot-password flow (`resetPasswordForEmail`)  |

Supabase substitutes `{{ .ConfirmationURL }}` with the link that routes through
`/auth/callback`, which exchanges the code for a session and forwards to
`/auth/set-password` (signup) or `/auth/reset-password` (recovery).

## Redirect allow-list

Add these to Supabase → **Authentication → URL Configuration → Redirect URLs**:

```
http://localhost:3000/auth/callback
https://kipita.app/auth/callback
```

## Providers

The UI shows a **Continue with Google** button. Enable Google under
**Authentication → Providers → Google** and add the callback URL above for it to
work; until then the button shows a friendly "not switched on yet" message.
Phone OTP needs an SMS provider configured under **Authentication → Providers →
Phone**.
