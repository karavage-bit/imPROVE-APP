-- =============================================================================
-- imPROVED — Database Schema (PostgreSQL / Supabase)
-- =============================================================================
-- Run this in Supabase SQL Editor before anything else.
-- It is idempotent: safe to run multiple times.
-- =============================================================================

-- 1) USERS PROFILE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_parent_purchaser BOOLEAN DEFAULT FALSE,
  parent_attestation_at TIMESTAMPTZ,
  student_consent_at TIMESTAMPTZ,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'paid', 'plus', 'institutional')),
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- 2) SKILL PROGRESS
-- Step 3 (Defense) stores responses as JSON in response_text:
--   { initial: "...", q1: "...", q2: "...", q3: "...", judgment: "...", observation: "..." }
CREATE TABLE IF NOT EXISTS public.skill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL CHECK (skill_id >= 0 AND skill_id <= 9),
  skill_version TEXT NOT NULL DEFAULT 'v1.0',
  step INTEGER NOT NULL CHECK (step >= 0 AND step <= 4),
  response_text TEXT,
  step_status TEXT DEFAULT 'in_progress' CHECK (step_status IN ('in_progress','completed','skipped')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_id, step, skill_version)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON public.skill_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_skill ON public.skill_progress(user_id, skill_id);

-- 3) DEFENSE EVALUATIONS
-- Append-only log of AI evaluator calls. Lets us audit AI behavior over time
-- and detect drift / mis-evaluations. ONE row per defense submission attempt.
CREATE TABLE IF NOT EXISTS public.defense_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL,
  skill_version TEXT NOT NULL DEFAULT 'v1.0',
  attempt_number INTEGER NOT NULL DEFAULT 1,
  defense_initial TEXT NOT NULL,
  defense_q1 TEXT NOT NULL,
  defense_q2 TEXT NOT NULL,
  defense_q3 TEXT NOT NULL,
  judgment TEXT NOT NULL CHECK (judgment IN ('engaged','partially_engaged','evaded','crisis_flag')),
  observation TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defense_user_skill ON public.defense_evaluations(user_id, skill_id, created_at);
CREATE INDEX IF NOT EXISTS idx_defense_judgment ON public.defense_evaluations(judgment, created_at);

-- 4) VERIFICATIONS
CREATE TABLE IF NOT EXISTS public.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_slug TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  skill_id INTEGER NOT NULL,
  skill_name TEXT NOT NULL,
  skill_version TEXT NOT NULL,
  citations TEXT NOT NULL,
  hook_response TEXT NOT NULL,
  science_response TEXT NOT NULL,
  challenge_response TEXT NOT NULL,
  defense_initial TEXT NOT NULL,
  defense_q1 TEXT NOT NULL,
  defense_q2 TEXT NOT NULL,
  defense_q3 TEXT NOT NULL,
  defense_judgment TEXT NOT NULL,
  defense_observation TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  shared_with_email TEXT,
  shared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verifications_user ON public.verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_slug ON public.verifications(public_slug);

-- 5) AUDIT LOG
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_time ON public.audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event ON public.audit_log(event_type, created_at DESC);

-- 6) NUDGES
CREATE TABLE IF NOT EXISTS public.nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id INTEGER,
  nudge_type TEXT NOT NULL CHECK (nudge_type IN ('challenge_followup','spaced_revisit_30','spaced_revisit_90','spaced_revisit_180','weekly_checkin')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  response_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nudges_pending ON public.nudges(scheduled_for) WHERE sent_at IS NULL;

-- =============================================================================
-- DROP OBSOLETE TABLE (was used by removed live Socratic conversation feature)
-- =============================================================================
DROP TABLE IF EXISTS public.socratic_messages CASCADE;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defense_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nudges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users manage own progress" ON public.skill_progress;
CREATE POLICY "Users manage own progress" ON public.skill_progress
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own defense evaluations" ON public.defense_evaluations;
CREATE POLICY "Users see own defense evaluations" ON public.defense_evaluations
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own verifications" ON public.verifications;
CREATE POLICY "Users see own verifications" ON public.verifications
  FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);

DROP POLICY IF EXISTS "Users insert own verifications" ON public.verifications;
CREATE POLICY "Users insert own verifications" ON public.verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own audit log" ON public.audit_log;
CREATE POLICY "Users see own audit log" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own nudges" ON public.nudges;
CREATE POLICY "Users see own nudges" ON public.nudges
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS progress_updated_at ON public.skill_progress;
CREATE TRIGGER progress_updated_at BEFORE UPDATE ON public.skill_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.defense_evaluations WHERE user_id = target_user_id;
  DELETE FROM public.skill_progress WHERE user_id = target_user_id;
  DELETE FROM public.verifications WHERE user_id = target_user_id;
  DELETE FROM public.nudges WHERE user_id = target_user_id;
  UPDATE public.profiles SET deleted_at = NOW() WHERE id = target_user_id;

  INSERT INTO public.audit_log (user_id, event_type, event_data)
  VALUES (target_user_id, 'user_data_deleted', '{"requested_by_user": true}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
