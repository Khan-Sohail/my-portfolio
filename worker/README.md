# Portfolio Contact API (Cloudflare Worker)

Server-side contact form endpoint for the portfolio. Receives the form
submission, validates it, then notifies the owner via **Email (Resend)** and
**WhatsApp (Meta Cloud API)**. Both channels run independently — a failure in
one never surfaces as a submission failure to the visitor.

Architecture:

```
Visitor -> Portfolio form -> POST /api/contact -> validation
                                                    |-> Email service (Resend)
                                                    |-> WhatsApp service (Cloud API, template)
```

## Local development

```bash
cd worker
npm install
npm test          # node --test, 28 tests (validation, flows, failures, rate limit)
npx wrangler dev  # local runtime at http://localhost:8787
```

## Deployment

```bash
cd worker
npx wrangler login
npx wrangler secret put CONTACT_EMAIL          # ksohail.sk32@gmail.com
npx wrangler secret put MAIL_FROM              # e.g. "Portfolio Contact <onboarding@resend.dev>" while testing
npx wrangler secret put RESEND_API_KEY         # from https://resend.com -> API Keys
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID
npx wrangler secret put WHATSAPP_ACCESS_TOKEN  # System User permanent token, scope: whatsapp_business_messaging
npx wrangler secret put WHATSAPP_RECIPIENT_NUMBER  # E.164 without '+', e.g. 919967832161
npx wrangler deploy
```

The Worker URL will be `https://portfolio-contact-api.<your-subdomain>.workers.dev`.
Put that URL into `CONTACT_API_URL` in `js/main.js` (currently a placeholder).

## Prerequisites (one-time, on the provider side)

### Email (Resend)
1. Create a free account at https://resend.com.
2. Create an API key.
3. Send from `onboarding@resend.dev` while testing (no domain needed), or
   verify your own domain and use `MAIL_FROM` = `Name <on@yourdomain.com>`.
4. Set `CONTACT_EMAIL` to `ksohail.sk32@gmail.com`.

### WhatsApp (Meta Cloud API)
1. Create a Meta app at https://developers.facebook.com (use case: WhatsApp).
2. Create/link a WhatsApp Business Account (WABA) and a business phone number.
3. Generate a **System User permanent token** (Business Manager -> System
   users) with `whatsapp_business_messaging` scope.
4. Copy the **Phone Number ID** (WhatsApp -> API Setup).
5. Create a message template named exactly `portfolio_contact_notification`
   (category Utility, language en_US) with body:

   ```
   New Portfolio Contact
   Name: {{1}}
   Email: {{2}}
   Message: {{3}}
   Source: Portfolio Website
   ```

   Meta must approve it before outbound template sends work. Business-initiated
   messages outside the 24-hour customer window require an approved template —
   free-form text is rejected by the API.

## Configuration

All variables are documented in `.env.example` (repo root). Owner-specific
values go through `wrangler secret put`; non-secret defaults live in
`wrangler.toml` `[vars]`.

## Behavior notes

- Validation: name ≤ 100 chars, email ≤ 254 chars (format-checked), message ≤ 5000 chars. Applied client-side and server-side.
- Spam protection: hidden honeypot field (`company`) + native rate limiting
  (5 requests / 60 s per IP, Cloudflare Rate Limiting API; in-memory fallback
  in local dev).
- CORS: only `CONTACT_ALLOWED_ORIGIN` (default `https://khan-sohail.github.io`)
  may call the endpoint; preflight handled.
- Errors: provider failures are logged (status only, no tokens/payloads) and
  the submission is still acknowledged — email and WhatsApp are independent.
- No secrets in code, logs, or responses.