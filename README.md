# imPROVED

> The skills your résumé claims. Proved.

A research-backed platform that builds ten foundational skills through curriculum, real-world challenge, and a structured Defense submission with AI evaluation. Verifications are documented credentials, not certificates.

---

## Architecture

- **Next.js 14** (Pages router) — frontend + API routes
- **Supabase** — Postgres database, auth (magic links), Row Level Security
- **Anthropic API** — Claude Sonnet 4.5 evaluates Defense submissions via structured tool_use (one-shot, not live conversation)
- **Stripe** — payments ($39 Full Access, +$19 Verification Plus)
- **Resend** — transactional email + spaced revisit nudges
- **Vercel** — hosting + hourly cron job for nudge delivery

---

## Local Development Setup

### 1. Install dependencies

```bash
cd improved-app
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL Editor in your Supabase dashboard.
3. Copy the entire contents of `supabase/schema.sql` into the editor and run it. This creates all tables, indexes, RLS policies, triggers, and helper functions.
4. From `Settings → API`, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
5. From `Authentication → Providers`, ensure Email is enabled. Magic links work out of the box.

### 3. Set up Anthropic

1. Get an API key from [console.anthropic.com](https://console.anthropic.com/settings/keys).
2. Add it to `.env.local` as `ANTHROPIC_API_KEY`.

### 4. Set up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com).
2. In test mode, create two products:
   - **Full Access** — $39 USD, one-time payment
   - **Verification Plus** — $19 USD, one-time payment
3. Copy each Price ID (starts with `price_...`) into `.env.local` as `STRIPE_PRICE_PAID` and `STRIPE_PRICE_PLUS`.
4. From `Developers → API keys`, copy your secret key into `STRIPE_SECRET_KEY`.
5. For local webhook testing, install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe-webhook
   ```
   This prints a webhook signing secret — copy it into `STRIPE_WEBHOOK_SECRET`.

### 5. Set up Resend

1. Create an account at [resend.com](https://resend.com).
2. Verify your sending domain (or use Resend's test domain initially).
3. Create an API key and copy into `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to your verified sender (e.g. `imPROVED <hello@yourdomain.com>`).

### 6. Run locally

```bash
cp .env.example .env.local
# Fill in all the values you collected above
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Production Deployment (Vercel)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin git@github.com:yourname/improved-app.git
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
2. Vercel auto-detects Next.js. Accept defaults.
3. **Before deploying**, add all environment variables from your `.env.local` to Vercel's Environment Variables dashboard. Set each for `Production`, `Preview`, and `Development`.
4. Update `APP_URL` to your production domain (e.g. `https://improvedskills.com`).

### 3. Configure Stripe webhook in production

1. In Stripe Dashboard → `Developers → Webhooks`, add an endpoint:
   - URL: `https://improvedskills.com/api/stripe-webhook`
   - Events: `checkout.session.completed`
2. Copy the signing secret and update `STRIPE_WEBHOOK_SECRET` in Vercel.

### 4. Configure Supabase production redirect URL

1. In Supabase → `Authentication → URL Configuration`, add your production URL (e.g. `https://improvedskills.com/dashboard`) to allowed redirect URLs.

### 5. Cron job (automatically configured)

The hourly nudge cron is defined in `vercel.json`. It will run automatically on Vercel Pro plans. On Hobby plans, cron runs daily — you may want to upgrade for the spaced revisit emails to work as designed.

### 6. Custom domain

Point your domain's DNS to Vercel per their instructions. Update `APP_URL` accordingly.

---

## Environment Variables Reference

See `.env.example` for the complete list. The critical ones:

| Variable | Purpose | Required |
|----------|---------|----------|
| `APP_URL` | Public app URL | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Database/auth URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-side key (RLS-protected) | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key | Yes |
| `ANTHROPIC_API_KEY` | Defense evaluation | Yes |
| `STRIPE_SECRET_KEY` | Payment processing | Yes |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | Yes |
| `STRIPE_PRICE_PAID` | $39 tier price ID | Yes |
| `STRIPE_PRICE_PLUS` | $19 add-on price ID | Yes |
| `RESEND_API_KEY` | Email sending | Yes |
| `CRON_SECRET` | Cron auth | Yes |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Analytics | Optional |
| `NEXT_PUBLIC_SENTRY_DSN` | Error tracking | Optional |

---

## Skill Content Versioning

Skill content is stored in `src/data/skills.js` and version-tracked in `src/data/versions.js`.

When you make a **material content change** to a skill (revising the science, replacing a citation, rewriting the Defense follow-up questions), bump the version in `SKILL_VERSIONS`. Existing verifications retain the version they were earned against — older credentials remain meaningful and stable.

Cosmetic changes (typo fixes, light prose edits) don't require a version bump.

---

## Cost Modeling

At Claude Sonnet 4.5 pricing, a single Defense evaluation call costs roughly $0.02-$0.04. Completing all 10 skills is approximately $0.20-$0.40 per user — dramatically cheaper than the prior live conversation model.

At $39 with Stripe taking ~3%, gross margin per Full Access user is approximately $37. Very healthy.

The Defense Submission model has a built-in cost ceiling: at most 2 evaluation calls per skill (initial + one revision), so worst case is ~20 API calls per fully-paid user.

---

## Operations

### Monitoring

- **Errors:** Sentry (if `NEXT_PUBLIC_SENTRY_DSN` set) catches frontend errors automatically.
- **Analytics:** Plausible gives you usage patterns without invasive tracking.
- **Uptime:** Vercel dashboard shows function execution. Consider adding [uptimerobot.com](https://uptimerobot.com) for external monitoring.
- **Database:** Supabase dashboard shows query performance, storage, and auth events.

### Crisis content

The crisis detection module (`src/lib/crisis.js`) screens user input client-side before any API call. When detected, it surfaces a resource overlay (988 Lifeline + secondary resources). Importantly: **it does not notify parents or anyone else**. This is a deliberate design decision documented in the privacy policy.

Review the patterns in `crisis.js` periodically. Add new patterns based on what you observe in production (review the audit_log for `engagement_quality = 'crisis_flag'` entries — these are anonymized counts, not content).

### Refunds

Within 30 days, full refund + account deletion. Process refunds via Stripe Dashboard, then run the deletion in Supabase SQL Editor:

```sql
SELECT delete_user_data('the-user-uuid-here');
```

---

## Key Files

| File | Purpose |
|------|---------|
| `pages/index.js` | Landing page + checkout modal |
| `pages/dashboard.js` | Authenticated home, skill grid |
| `pages/welcome.js` | Post-checkout student consent flow |
| `pages/upgrade.js` | Free → paid conversion |
| `pages/settings.js` | Notification controls + account deletion |
| `pages/v/[slug].js` | Public Verification page (SSR for OG previews) |
| `pages/api/evaluate-defense.js` | Anthropic API one-shot evaluator with structured tool_use |
| `pages/api/verify.js` | Creates Verification + schedules nudges |
| `pages/api/checkout.js` | Stripe Checkout session creation |
| `pages/api/stripe-webhook.js` | Payment completion handler |
| `pages/api/cron/send-nudges.js` | Hourly nudge dispatcher |
| `src/components/SkillView.jsx` | 5-step skill flow with auto-save |
| `src/hooks/useDefenseEval.js` | One-shot defense submission with retry, abort, crisis screening |
| `src/lib/crisis.js` | Client-side crisis detection |
| `supabase/schema.sql` | Complete database schema |

---

## Pre-Launch Checklist

- [ ] Database schema run in production Supabase
- [ ] All environment variables set in Vercel
- [ ] Stripe products created and Price IDs updated
- [ ] Stripe webhook configured for production URL
- [ ] Supabase redirect URLs include production domain
- [ ] Email sending domain verified in Resend
- [ ] Test full purchase flow end-to-end (test mode)
- [ ] Test magic link login
- [ ] Test Defense submission with crisis content (resources should appear, no AI call made)
- [ ] Test account deletion (data should be fully removed)
- [ ] Verify mobile responsive on real device
- [ ] Switch Stripe to live mode and update keys
- [ ] Soft launch with 5 real students before broad announcement

---

## License

Private. Not for redistribution.

## Contact

hello@improvedskills.com
