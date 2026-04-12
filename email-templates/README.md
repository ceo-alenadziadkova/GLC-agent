# GLC email templates

Email-safe HTML in the GLC visual language: monospace protocol labels, large display headings, palette (`#000`, `#666`, `#E5E5E5`, `#F4F4F4`, `#F24F1D`, `#0ECF82`, `#1CBDFF`), no border-radius.

## What to use where

| Path | Use |
|------|-----|
| `supabase/*.html` | Paste **full document** into Supabase Dashboard → **Authentication** → **Email Templates** (body HTML). Set **subject** in the same UI. |
| `marketing/*.html` | Copy into Mailchimp, Resend, Brevo, etc. Replace `{{PLACEHOLDER}}` tokens with your ESP’s merge syntax. |
| `transactional/*.html` | Same as marketing: manual or ESP merge fields. |
| `preview/gallery.html` | **Browser-only** reference (Tailwind). **Do not** send or paste into Supabase — clients will not render it reliably. |

## Supabase template mapping

Hosted projects: paste HTML into **Dashboard → Authentication → Email Templates**. Local CLI: set `content_path` in `config.toml` as in [Customizing email templates](https://supabase.com/docs/guides/local-development/customizing-email-templates).

| Repo file | Dashboard label | `config.toml` section |
|-----------|-----------------|------------------------|
| `supabase/confirm-signup.html` | Confirm signup | `[auth.email.template.confirmation]` |
| `supabase/magic-link.html` | Magic link | `[auth.email.template.magic_link]` |
| `supabase/recovery.html` | Reset password | `[auth.email.template.recovery]` |
| `supabase/invite.html` | Invite user | `[auth.email.template.invite]` |
| `supabase/email-change.html` | Change email address | `[auth.email.template.email_change]` |
| `supabase/reauthentication.html` | Reauthentication | `[auth.email.template.reauthentication]` |

Template shapes (aligned with [Supabase auth email templates](https://supabase.com/docs/guides/local-development/customizing-email-templates)):

| Flow | Dashboard name | Repo file | Primary mechanism |
|------|----------------|-----------|-------------------|
| Verify new email after change | Change email address | `email-change.html` | `{{ .ConfirmationURL }}` + plain link fallback (no OTP in template) |
| Forgot password | Reset password | `recovery.html` | Same |
| Step-up before sensitive action | Reauthentication | `reauthentication.html` | **6-digit `{{ .Token }}`** (Supabase documents OTP for this template) |
| New signup | Confirm signup | `confirm-signup.html` | Link + fallback (`{{ .Token }}` optional in product; not used in our HTML) |

## Layout notes (production email)

- Tables + **inline `style=`**; no external Tailwind in real sends.
- Google Fonts `<link>` is best-effort; fallbacks are **Arial / Consolas**.
- Large “watermark” word is a **normal table row** (not `position:absolute`) for Outlook/Gmail compatibility.
- Some providers rewrite links (e.g. Microsoft Safe Links). **`confirm-signup.html`**, **`email-change.html`**, and **`recovery.html`** include a copy-paste **`{{ .ConfirmationURL }}`** block after the CTA. **`reauthentication.html`** is OTP-only per Supabase’s reauthentication template. Magic link / invite templates may still expose **`{{ .Token }}`** if you enable it — see [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates).

## Supabase variables

Official Go template fields include:

- `{{ .ConfirmationURL }}` — primary action link
- `{{ .Token }}` — 6-digit OTP (optional alternative to clicking the link)
- `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .RedirectTo }}`, `{{ .Data }}`
- `{{ .NewEmail }}`, `{{ .OldEmail }}` — change-email / notifications
- `{{ .TokenHash }}` — advanced custom links

### Suggested subjects (English)

Set these in the template editor **Subject** field (not in the HTML files).

| Template file | Example subject |
|---------------|-----------------|
| `confirm-signup.html` | Confirm your signup // GLC |
| `magic-link.html` | Your sign-in link // GLC |
| `recovery.html` | Reset your password // GLC |
| `invite.html` | You are invited to GLC |
| `email-change.html` | Verify your new email // GLC |
| `reauthentication.html` | Re-authenticate // GLC |
| `password-changed-notification.html` | Your password was changed // GLC |

## Marketing / transactional placeholders

Replace tokens when sending (or map to ESP merge tags):

| Token | Meaning |
|-------|---------|
| `{{FIRST_NAME}}` | Recipient first name |
| `{{COMPANY}}` | Company name |
| `{{HEADLINE}}`, `{{BODY_HTML}}` | Newsletter main title and rich body (ESP-dependent) |
| `{{UNSUBSCRIBE_URL}}` | Required for marketing in many jurisdictions |
| `{{INTAKE_URL}}` | Public pre-brief link, e.g. `https://app…/intake/<token>` |
| `{{CTA_URL}}`, `{{CTA_LABEL}}` | Primary button |
| `{{EMAIL_SUBJECT}}`, `{{LIST_ITEM_1}}`…`{{LIST_ITEM_3}}` | Inbound / feedback template (`transactional/feedback-inbound.html`) |

## File index

- `supabase/confirm-signup.html`
- `supabase/magic-link.html`
- `supabase/recovery.html`
- `supabase/invite.html`
- `supabase/email-change.html`
- `supabase/reauthentication.html`
- `supabase/password-changed-notification.html`
- `marketing/newsletter.html`
- `marketing/cold-outreach.html`
- `transactional/feedback-inbound.html`
- `transactional/intake-invite.html`
- `preview/gallery.html` (browser reference only)
