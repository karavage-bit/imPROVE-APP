-- =============================================================================
-- imPROVED — Schema Additions (run after initial schema.sql)
-- Safe to run multiple times (idempotent)
-- =============================================================================

-- REVIEW QUEUE
-- Every Defense submission goes here first. Blueprint reviews and approves
-- or returns with feedback before verification is issued.
CREATE TABLE IF NOT EXISTS public.review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL,
  skill_version TEXT NOT NULL DEFAULT 'v1.0',
  display_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  -- All responses stored for Blueprint's review
  hook_response TEXT NOT NULL,
  science_response TEXT NOT NULL,
  challenge_response TEXT NOT NULL,
  defense_initial TEXT NOT NULL,
  defense_q1 TEXT NOT NULL,
  defense_q2 TEXT NOT NULL,
  defense_q3 TEXT NOT NULL,
  defense_judgment TEXT NOT NULL,
  defense_observation TEXT,
  -- Behavioral flags from client-side detection
  behavioral_flags JSONB DEFAULT '[]'::jsonb,
  -- Review state
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','returned','flagged')),
  reviewer_feedback TEXT,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_queue_status ON public.review_queue(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_queue_user ON public.review_queue(user_id);

-- FLAG LOCKS
-- When content is flagged, this record locks the account.
-- Parent must confirm via email link before access is restored.
CREATE TABLE IF NOT EXISTS public.flag_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('crisis','inappropriate','concerning')),
  -- We store category only, NOT the flagged content (privacy)
  flag_category TEXT,
  student_email TEXT NOT NULL,
  parent_email TEXT,
  student_notified_at TIMESTAMPTZ,
  parent_notified_at TIMESTAMPTZ,
  parent_confirmed_at TIMESTAMPTZ,
  -- Unique token for parent's confirmation email link
  confirm_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  unlocked_at TIMESTAMPTZ,
  -- Is the lock currently active?
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_flag_locks_user ON public.flag_locks(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_flag_locks_token ON public.flag_locks(confirm_token) WHERE is_active = TRUE;

-- RLS for new tables
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flag_locks ENABLE ROW LEVEL SECURITY;

-- Review queue: users see their own submissions only
DROP POLICY IF EXISTS "Users see own review queue" ON public.review_queue;
CREATE POLICY "Users see own review queue" ON public.review_queue
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own review queue" ON public.review_queue;
CREATE POLICY "Users insert own review queue" ON public.review_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Flag locks: users see their own
DROP POLICY IF EXISTS "Users see own flag locks" ON public.flag_locks;
CREATE POLICY "Users see own flag locks" ON public.flag_locks
  FOR SELECT USING (auth.uid() = user_id);

-- Helper: check if a user is currently locked
CREATE OR REPLACE FUNCTION public.is_user_locked(check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flag_locks
    WHERE user_id = check_user_id
    AND is_active = TRUE
    AND parent_confirmed_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: get active lock for a user
CREATE OR REPLACE FUNCTION public.get_active_lock(check_user_id UUID)
RETURNS TABLE(id UUID, flag_type TEXT, locked_at TIMESTAMPTZ, parent_confirmed_at TIMESTAMPTZ)
AS $$
  SELECT id, flag_type, locked_at, parent_confirmed_at
  FROM public.flag_locks
  WHERE user_id = check_user_id
  AND is_active = TRUE
  ORDER BY locked_at DESC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
