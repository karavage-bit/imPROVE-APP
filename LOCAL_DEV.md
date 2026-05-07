# Local Dev Setup (No Stripe Required)

This guide gets you running locally in about 15 minutes. You'll skip Stripe entirely and use a dev-only checkout that grants paid access without payment.

## What you actually need

| Service | Required? | Why |
|---------|-----------|-----|
| Supabase | **Yes** | Database, auth, storage |
| Anthropic | **Yes** | Defense evaluation |
| Stripe | No | Skipped via DEV_MODE |
| Resend (email) | No | Magic link returned in API response |
| Vercel | No | Run locally first |

## Step-by-step

### 1. Set up Supabase (5 min)

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New project**. Name it whatever you want (e.g. "improved-dev").
3. Set a database password and pick a region close to you. Click **Create**.
4. Wait ~2 minutes for the project to provision.
5. In the left sidebar, click **SQL Editor** → **New query**.
6. Open `supabase/schema.sql` in this codebase, copy the entire contents, paste into the SQL editor, click **Run**. You should see "Success. No rows returned." If you see errors, the schema is idempotent — you can rerun safely.
7. In the left sidebar, click **Project Settings** (gear icon) → **API**.
8. Copy these three values — you'll paste them into `.env.local` in step 4:
   - **Project URL** → goes into `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys → `anon` `public`** → goes into `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Project API keys → `service_role` `secret`** → goes into `SUPABASE_SERVICE_ROLE_KEY` (⚠️ keep this private)

### 2. Get an Anthropic API key (2 min)

1. Go to [console.anthropic.com](https://console.anthropic.com).
2. Sign up or log in.
3. Add a small amount of credit ($5 is plenty for extensive testing — Defense evaluations are about $0.04 each).
4. Go to **Settings → API Keys** → **Create Key**.
5. Copy the key (starts with `sk-ant-`). You'll paste it into `.env.local` next.

### 3. Install dependencies

```bash
cd improved-app
npm install
```

If you don't have Node yet, install it from [nodejs.org](https://nodejs.org) (version 18.17 or higher).

### 4. Create `.env.local`

```bash
cp .env.example .env.local
```

Open `.env.local` in your editor and fill in only these values:

```
APP_URL=http://localhost:3000

DEV_MODE=true
NEXT_PUBLIC_DEV_MODE=true

NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

ANTHROPIC_API_KEY=sk-ant-...

CRON_SECRET=any-random-string-here
```

You can leave Stripe, Resend, Plausible, Sentry blank or remove those lines entirely. The app handles missing optional services gracefully.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Test the full flow

1. **Click "Get full access"** on the landing page.
2. **Enter any two different emails** (e.g. `parent@test.com` and `student@test.com`). Check the attestation box.
3. **Click continue.** Because `DEV_MODE=true`, it routes to `/api/dev-checkout` instead of Stripe. A confirm dialog appears with the magic link — click **OK** to log in as the student.
4. You'll land on the **Welcome page**. Click "I understand. Let's begin."
5. You're now on the **Dashboard** with paid tier, all 10 skills unlocked.
6. **Click Skill 1 (Self-Awareness)** and run through Hook → Science → Challenge → Defense → Verified. The Defense step makes one Anthropic API call, costs about $0.04.
7. **Visit your verification at `/v/[slug]`** to see the public credential page.
8. **Download the PDF** from the Verified screen.

## Common things to test

- **Resume after refresh:** start a skill, fill in the Hook, refresh the page. Your text should still be there. Auto-save runs every 800ms after you stop typing.
- **Crisis detection:** in the Hook textarea, type something like "I want to kill myself" — a resource overlay should appear before any API call. Dismiss it and continue normally.
- **Defense evaluation paths:** try writing genuinely thoughtful responses (should get "engaged"), then try shallow one-line responses (should get "evaded"). The minimum character counts on each field will block obviously empty submissions before the AI sees them.
- **Account deletion:** Settings → Delete account → type DELETE → confirm. Refresh the page. Try to log in with the same email — you should get a fresh account.

## Inspecting data in Supabase

While testing, you can watch what's being stored:
1. In Supabase dashboard → **Table Editor**.
2. Open `profiles`, `skill_progress`, `defense_evaluations`, `verifications`, `audit_log`.
3. Run the same flow and refresh — you'll see rows being created.

If you need to manually upgrade a user to paid tier without going through any checkout:

```sql
-- In Supabase SQL Editor
UPDATE profiles SET tier = 'paid', paid_at = NOW() WHERE email = 'student@test.com';
```

If you need to wipe everything and start fresh:

```sql
-- Nukes all data. Auth users persist; profile data resets.
DELETE FROM defense_evaluations;
DELETE FROM verifications;
DELETE FROM nudges;
DELETE FROM skill_progress;
DELETE FROM audit_log;
UPDATE profiles SET tier = 'free', paid_at = NULL;
```

## When you're ready for Stripe

Add it later when you're ready to take real payments — the full Stripe setup is in the main `README.md`. Until then, keep `DEV_MODE=true` and you can iterate on the actual product without any payment infrastructure.

## When you're ready to deploy

1. Set `DEV_MODE=false` (or remove the line entirely) in Vercel's environment variables. The `/api/dev-checkout` route hard-blocks itself in production.
2. Set `NEXT_PUBLIC_DEV_MODE=false` so the frontend stops showing the dev checkout shortcut.
3. Add real Stripe keys per the main README.
4. Add Resend for email delivery.
