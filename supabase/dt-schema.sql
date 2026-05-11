-- ============================================================
-- Distance Traveled — Schema
-- Apply via Supabase Dashboard SQL Editor or:
--   supabase db query --file supabase/dt-schema.sql
-- ============================================================

-- ── Instructor flag on profiles ────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_instructor boolean NOT NULL DEFAULT false;

-- ── Shared updated_at trigger (reuse if already exists) ────
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── dt_cohorts ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dt_cohorts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  instructor_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  start_date            date,
  end_date              date,
  atlas_unlock_date     date,
  atlas_unlock_threshold int NOT NULL DEFAULT 24,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER dt_cohorts_updated_at
  BEFORE UPDATE ON dt_cohorts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE dt_cohorts ENABLE ROW LEVEL SECURITY;

-- ── dt_days ────────────────────────────────────────────────
-- Curriculum nodes. cohort_id = null means the default curriculum.
-- Instructors may create cohort-scoped overrides (same id, different cohort_id).
CREATE TABLE IF NOT EXISTS dt_days (
  id             text NOT NULL,
  cohort_id      uuid REFERENCES dt_cohorts(id) ON DELETE CASCADE,
  week           int  NOT NULL,
  region         text NOT NULL,
  date_label     text NOT NULL,
  title          text NOT NULL,
  type           text NOT NULL, -- foundation|class|evening|field|internship|async|deadline|horizon
  coords_x       int  NOT NULL,
  coords_y       int  NOT NULL,
  location       text,
  key_skill      text NOT NULL,
  concepts       jsonb NOT NULL DEFAULT '[]',
  theory_name    text NOT NULL,
  theory_author  text NOT NULL,
  theory_summary text NOT NULL,
  hook           text NOT NULL,
  note           text,          -- burgundy callout; only w3-mon-am has this
  earned_key     text,          -- reserved for future earned-moment logic
  display_order  int  NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, COALESCE(cohort_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

-- Simpler unique constraint for queries
CREATE UNIQUE INDEX IF NOT EXISTS dt_days_id_cohort_uq
  ON dt_days (id, cohort_id NULLS FIRST);

CREATE TRIGGER dt_days_updated_at
  BEFORE UPDATE ON dt_days
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE dt_days ENABLE ROW LEVEL SECURITY;

-- ── dt_enrollments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dt_enrollments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cohort_id   uuid NOT NULL REFERENCES dt_cohorts(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, cohort_id)
);

CREATE TRIGGER dt_enrollments_updated_at
  BEFORE UPDATE ON dt_enrollments
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE dt_enrollments ENABLE ROW LEVEL SECURITY;

-- ── dt_meta ────────────────────────────────────────────────
-- Per-student onboarding: name + two core values.
CREATE TABLE IF NOT EXISTS dt_meta (
  student_id   uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  name         text,
  value1       text NOT NULL DEFAULT '',
  value2       text NOT NULL DEFAULT '',
  onboarded_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER dt_meta_updated_at
  BEFORE UPDATE ON dt_meta
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE dt_meta ENABLE ROW LEVEL SECURITY;

-- ── dt_entries ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dt_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_id       text NOT NULL,
  real_moment  text CHECK (char_length(real_moment) <= 280),
  horizon      text CHECK (char_length(horizon) <= 200),
  pin          text,
  completed    boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, day_id)
);

CREATE TRIGGER dt_entries_updated_at
  BEFORE UPDATE ON dt_entries
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Auto-set completed_at
CREATE OR REPLACE FUNCTION dt_entries_completed_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.completed = true AND OLD.completed = false THEN
    NEW.completed_at = now();
  ELSIF NEW.completed = false THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dt_entries_set_completed_at
  BEFORE UPDATE ON dt_entries
  FOR EACH ROW EXECUTE FUNCTION dt_entries_completed_at();

ALTER TABLE dt_entries ENABLE ROW LEVEL SECURITY;

-- ── dt_photos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dt_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_id       text NOT NULL,
  storage_path text NOT NULL, -- '{student_id}/{day_id}.jpg' in dt-photos bucket
  bytes        int,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, day_id)
);

CREATE TRIGGER dt_photos_updated_at
  BEFORE UPDATE ON dt_photos
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE dt_photos ENABLE ROW LEVEL SECURITY;

-- ── dt_voices ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dt_voices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_id           text NOT NULL,
  storage_path     text NOT NULL, -- '{student_id}/{day_id}.webm' in dt-voices bucket
  duration_seconds int,
  bytes            int,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, day_id)
);

CREATE TRIGGER dt_voices_updated_at
  BEFORE UPDATE ON dt_voices
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE dt_voices ENABLE ROW LEVEL SECURITY;

-- ── dt_earned_moments ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS dt_earned_moments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  moment_key  text NOT NULL,
  earned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, moment_key)
);

ALTER TABLE dt_earned_moments ENABLE ROW LEVEL SECURITY;

-- ── dt_flags ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dt_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_id      text,
  flag_type   text NOT NULL, -- stalled|crisis_language|valley_distress|late_start|manual
  severity    text NOT NULL DEFAULT 'attention', -- info|attention|urgent
  excerpt     text,
  status      text NOT NULL DEFAULT 'open', -- open|reviewed|dismissed
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER dt_flags_updated_at
  BEFORE UPDATE ON dt_flags
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE dt_flags ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ════════════════════════════════════════════════════════════

-- Helper: is the calling user an instructor?
CREATE OR REPLACE FUNCTION is_dt_instructor()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_instructor = true
  );
$$;

-- ── dt_cohorts ─────────────────────────────────────────────
CREATE POLICY "instructor: full access to cohorts"
  ON dt_cohorts FOR ALL
  USING (is_dt_instructor())
  WITH CHECK (is_dt_instructor());

CREATE POLICY "student: view own cohort"
  ON dt_cohorts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dt_enrollments
      WHERE student_id = auth.uid() AND cohort_id = dt_cohorts.id
    )
  );

-- ── dt_days ────────────────────────────────────────────────
-- Students see default curriculum (cohort_id IS NULL) + their own cohort's overrides.
CREATE POLICY "student: read default and own-cohort days"
  ON dt_days FOR SELECT
  USING (
    cohort_id IS NULL
    OR EXISTS (
      SELECT 1 FROM dt_enrollments
      WHERE student_id = auth.uid() AND cohort_id = dt_days.cohort_id
    )
  );

CREATE POLICY "instructor: full access to days"
  ON dt_days FOR ALL
  USING (is_dt_instructor())
  WITH CHECK (is_dt_instructor());

-- ── dt_enrollments ─────────────────────────────────────────
CREATE POLICY "instructor: full access to enrollments"
  ON dt_enrollments FOR ALL
  USING (is_dt_instructor())
  WITH CHECK (is_dt_instructor());

CREATE POLICY "student: view own enrollment"
  ON dt_enrollments FOR SELECT
  USING (student_id = auth.uid());

-- ── dt_meta ────────────────────────────────────────────────
CREATE POLICY "student: own meta"
  ON dt_meta FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "instructor: read all meta"
  ON dt_meta FOR SELECT
  USING (is_dt_instructor());

-- ── dt_entries ─────────────────────────────────────────────
CREATE POLICY "student: own entries"
  ON dt_entries FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "instructor: read all entries"
  ON dt_entries FOR SELECT
  USING (is_dt_instructor());

-- ── dt_photos ──────────────────────────────────────────────
CREATE POLICY "student: own photos"
  ON dt_photos FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "instructor: read all photos"
  ON dt_photos FOR SELECT
  USING (is_dt_instructor());

-- ── dt_voices ──────────────────────────────────────────────
CREATE POLICY "student: own voices"
  ON dt_voices FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "instructor: read all voices"
  ON dt_voices FOR SELECT
  USING (is_dt_instructor());

-- ── dt_earned_moments ──────────────────────────────────────
CREATE POLICY "student: own earned moments"
  ON dt_earned_moments FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "instructor: read all earned moments"
  ON dt_earned_moments FOR SELECT
  USING (is_dt_instructor());

-- ── dt_flags ───────────────────────────────────────────────
-- Students cannot see flags at all.
CREATE POLICY "instructor: full access to flags"
  ON dt_flags FOR ALL
  USING (is_dt_instructor())
  WITH CHECK (is_dt_instructor());

-- ════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- Run separately in Supabase Dashboard > Storage, or via CLI:
--   supabase storage create dt-photos --public=false
--   supabase storage create dt-voices --public=false
-- Then add storage RLS policies below via Dashboard.
--
-- Storage RLS (paste into Dashboard > Storage > Policies):
--
-- dt-photos bucket:
--   INSERT: bucket_id = 'dt-photos' AND (storage.foldername(name))[1] = auth.uid()::text
--   SELECT: bucket_id = 'dt-photos' AND (storage.foldername(name))[1] = auth.uid()::text OR is_dt_instructor()
--   UPDATE: bucket_id = 'dt-photos' AND (storage.foldername(name))[1] = auth.uid()::text
--   DELETE: bucket_id = 'dt-photos' AND (storage.foldername(name))[1] = auth.uid()::text
--
-- dt-voices bucket: same pattern
-- ════════════════════════════════════════════════════════════

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS dt_entries_student_idx ON dt_entries (student_id);
CREATE INDEX IF NOT EXISTS dt_entries_day_idx     ON dt_entries (day_id);
CREATE INDEX IF NOT EXISTS dt_entries_updated_idx ON dt_entries (updated_at DESC);
CREATE INDEX IF NOT EXISTS dt_flags_student_idx   ON dt_flags (student_id);
CREATE INDEX IF NOT EXISTS dt_flags_status_idx    ON dt_flags (status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS dt_photos_student_idx  ON dt_photos (student_id);
CREATE INDEX IF NOT EXISTS dt_voices_student_idx  ON dt_voices (student_id);
