// One-time database setup — visit /api/dt/setup?secret=tol2026
// Requires SUPABASE_ACCESS_TOKEN in Vercel env vars
// Get it: supabase.com → click your name top-right → Account → Access Tokens → New token

export default async function handler(req, res) {
  if (req.query.secret !== 'tol2026') return res.status(401).end();

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: 'SUPABASE_ACCESS_TOKEN not set',
      fix: 'supabase.com → your name top-right → Account → Access Tokens → Generate new token. Add to Vercel env vars, redeploy, then visit this URL again.',
    });
  }

  async function runSQL(label, query) {
    const r = await fetch(
      `https://api.supabase.com/v1/projects/dmsviopgxcpgrplkjsjd/database/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      }
    );
    let body;
    try { body = await r.json(); } catch { body = await r.text(); }
    return { label, status: r.status, ok: r.ok, body };
  }

  const schema = await runSQL('schema', SCHEMA_SQL);
  if (!schema.ok) return res.status(500).json({ error: 'Schema failed', details: schema });

  const seed = await runSQL('seed', SEED_SQL);

  return res.status(200).json({
    ok: seed.ok,
    message: seed.ok ? 'Done! Database is ready.' : 'Schema OK, seed failed.',
    schema,
    seed,
  });
}

const SCHEMA_SQL = `
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_instructor boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

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

DROP TRIGGER IF EXISTS dt_cohorts_updated_at ON dt_cohorts;
CREATE TRIGGER dt_cohorts_updated_at
  BEFORE UPDATE ON dt_cohorts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE dt_cohorts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS dt_days (
  pk             uuid NOT NULL DEFAULT gen_random_uuid(),
  id             text NOT NULL,
  cohort_id      uuid REFERENCES dt_cohorts(id) ON DELETE CASCADE,
  week           int  NOT NULL,
  region         text NOT NULL,
  date_label     text NOT NULL,
  title          text NOT NULL,
  type           text NOT NULL,
  coords_x       int  NOT NULL,
  coords_y       int  NOT NULL,
  location       text,
  key_skill      text NOT NULL,
  concepts       jsonb NOT NULL DEFAULT '[]',
  theory_name    text NOT NULL,
  theory_author  text NOT NULL,
  theory_summary text NOT NULL,
  hook           text NOT NULL,
  note           text,
  earned_key     text,
  display_order  int  NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pk),
  UNIQUE NULLS NOT DISTINCT (id, cohort_id)
);

DROP TRIGGER IF EXISTS dt_days_updated_at ON dt_days;
CREATE TRIGGER dt_days_updated_at
  BEFORE UPDATE ON dt_days
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE dt_days ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS dt_enrollments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cohort_id   uuid NOT NULL REFERENCES dt_cohorts(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, cohort_id)
);

DROP TRIGGER IF EXISTS dt_enrollments_updated_at ON dt_enrollments;
CREATE TRIGGER dt_enrollments_updated_at
  BEFORE UPDATE ON dt_enrollments
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE dt_enrollments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS dt_meta (
  student_id   uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  name         text,
  value1       text NOT NULL DEFAULT '',
  value2       text NOT NULL DEFAULT '',
  onboarded_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS dt_meta_updated_at ON dt_meta;
CREATE TRIGGER dt_meta_updated_at
  BEFORE UPDATE ON dt_meta
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE dt_meta ENABLE ROW LEVEL SECURITY;

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

DROP TRIGGER IF EXISTS dt_entries_updated_at ON dt_entries;
CREATE TRIGGER dt_entries_updated_at
  BEFORE UPDATE ON dt_entries
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

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

DROP TRIGGER IF EXISTS dt_entries_set_completed_at ON dt_entries;
CREATE TRIGGER dt_entries_set_completed_at
  BEFORE UPDATE ON dt_entries
  FOR EACH ROW EXECUTE FUNCTION dt_entries_completed_at();

ALTER TABLE dt_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS dt_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_id       text NOT NULL,
  storage_path text NOT NULL,
  bytes        int,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, day_id)
);

DROP TRIGGER IF EXISTS dt_photos_updated_at ON dt_photos;
CREATE TRIGGER dt_photos_updated_at
  BEFORE UPDATE ON dt_photos
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE dt_photos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS dt_voices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_id           text NOT NULL,
  storage_path     text NOT NULL,
  duration_seconds int,
  bytes            int,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, day_id)
);

DROP TRIGGER IF EXISTS dt_voices_updated_at ON dt_voices;
CREATE TRIGGER dt_voices_updated_at
  BEFORE UPDATE ON dt_voices
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE dt_voices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS dt_earned_moments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  moment_key  text NOT NULL,
  earned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, moment_key)
);

ALTER TABLE dt_earned_moments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS dt_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_id      text,
  flag_type   text NOT NULL,
  severity    text NOT NULL DEFAULT 'attention',
  excerpt     text,
  status      text NOT NULL DEFAULT 'open',
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS dt_flags_updated_at ON dt_flags;
CREATE TRIGGER dt_flags_updated_at
  BEFORE UPDATE ON dt_flags
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE dt_flags ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_dt_instructor()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_instructor = true
  );
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'instructor: full access to cohorts' AND tablename = 'dt_cohorts') THEN
    CREATE POLICY "instructor: full access to cohorts" ON dt_cohorts FOR ALL USING (is_dt_instructor()) WITH CHECK (is_dt_instructor());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student: view own cohort' AND tablename = 'dt_cohorts') THEN
    CREATE POLICY "student: view own cohort" ON dt_cohorts FOR SELECT USING (EXISTS (SELECT 1 FROM dt_enrollments WHERE student_id = auth.uid() AND cohort_id = dt_cohorts.id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student: read default and own-cohort days' AND tablename = 'dt_days') THEN
    CREATE POLICY "student: read default and own-cohort days" ON dt_days FOR SELECT USING (cohort_id IS NULL OR EXISTS (SELECT 1 FROM dt_enrollments WHERE student_id = auth.uid() AND cohort_id = dt_days.cohort_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'instructor: full access to days' AND tablename = 'dt_days') THEN
    CREATE POLICY "instructor: full access to days" ON dt_days FOR ALL USING (is_dt_instructor()) WITH CHECK (is_dt_instructor());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'instructor: full access to enrollments' AND tablename = 'dt_enrollments') THEN
    CREATE POLICY "instructor: full access to enrollments" ON dt_enrollments FOR ALL USING (is_dt_instructor()) WITH CHECK (is_dt_instructor());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student: view own enrollment' AND tablename = 'dt_enrollments') THEN
    CREATE POLICY "student: view own enrollment" ON dt_enrollments FOR SELECT USING (student_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student: own meta' AND tablename = 'dt_meta') THEN
    CREATE POLICY "student: own meta" ON dt_meta FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'instructor: read all meta' AND tablename = 'dt_meta') THEN
    CREATE POLICY "instructor: read all meta" ON dt_meta FOR SELECT USING (is_dt_instructor());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student: own entries' AND tablename = 'dt_entries') THEN
    CREATE POLICY "student: own entries" ON dt_entries FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'instructor: read all entries' AND tablename = 'dt_entries') THEN
    CREATE POLICY "instructor: read all entries" ON dt_entries FOR SELECT USING (is_dt_instructor());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student: own photos' AND tablename = 'dt_photos') THEN
    CREATE POLICY "student: own photos" ON dt_photos FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'instructor: read all photos' AND tablename = 'dt_photos') THEN
    CREATE POLICY "instructor: read all photos" ON dt_photos FOR SELECT USING (is_dt_instructor());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student: own voices' AND tablename = 'dt_voices') THEN
    CREATE POLICY "student: own voices" ON dt_voices FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'instructor: read all voices' AND tablename = 'dt_voices') THEN
    CREATE POLICY "instructor: read all voices" ON dt_voices FOR SELECT USING (is_dt_instructor());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student: own earned moments' AND tablename = 'dt_earned_moments') THEN
    CREATE POLICY "student: own earned moments" ON dt_earned_moments FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'instructor: read all earned moments' AND tablename = 'dt_earned_moments') THEN
    CREATE POLICY "instructor: read all earned moments" ON dt_earned_moments FOR SELECT USING (is_dt_instructor());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'instructor: full access to flags' AND tablename = 'dt_flags') THEN
    CREATE POLICY "instructor: full access to flags" ON dt_flags FOR ALL USING (is_dt_instructor()) WITH CHECK (is_dt_instructor());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS dt_entries_student_idx ON dt_entries (student_id);
CREATE INDEX IF NOT EXISTS dt_entries_day_idx     ON dt_entries (day_id);
CREATE INDEX IF NOT EXISTS dt_entries_updated_idx ON dt_entries (updated_at DESC);
CREATE INDEX IF NOT EXISTS dt_flags_student_idx   ON dt_flags (student_id);
CREATE INDEX IF NOT EXISTS dt_flags_status_idx    ON dt_flags (status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS dt_photos_student_idx  ON dt_photos (student_id);
CREATE INDEX IF NOT EXISTS dt_voices_student_idx  ON dt_voices (student_id);
`;

const SEED_SQL = `
INSERT INTO dt_days (id, cohort_id, week, region, date_label, title, type, coords_x, coords_y, location, key_skill, concepts, theory_name, theory_author, theory_summary, hook, note, earned_key, display_order) VALUES
('pre-1', NULL, 0, 'The Compass Harbor', 'June 8 - 21', 'Forging the Compass Needle', 'foundation', 500, 220, NULL, 'Self-Awareness & Values Alignment', '["Grit Scale (Duckworth)","Hidden Potential Character Quiz (Grant)","Primal Self-Assessment (Fletcher)","Two Core Values Audit (Brown)","Pre-Mortem Part I","Creature of Discomfort Commitment"]', 'Growth Mindset', 'Carol Dweck', 'Intelligence and ability are malleable. Struggle is biological evidence of new neural connections forming.', 'Without an internal compass, every difficult moment this summer gets navigated by instinct alone. Your instincts will tell you to protect yourself. Your values compass will tell you to grow.', NULL, NULL, 0),
('w1-mon-am', NULL, 1, 'The Character Range', 'Mon June 22 - Morning', 'Character Mechanics & The Sponge Mindset', 'class', 320, 540, NULL, 'Absorptive Capacity & Feedback Receptivity', '["Absorptive Capacity Spectrum","Naturalness Bias","Effort Counts Twice (Duckworth)","Character vs. Instinct"]', 'Authentic Leadership', 'Bill George', 'Leaders defined by alignment between stated values and actual behavior under pressure. Build from the inside out.', 'You are about to walk into a professional environment for the first time this summer. What version of yourself do you expect to show up?', NULL, NULL, 1),
('w1-mon-pm', NULL, 1, 'The Character Range', 'Mon June 22 - Evening', 'Identity Voting & The First Test', 'evening', 680, 640, NULL, 'Followership & Inhibitory Control', '["Identity Voting (Clear)","Inhibitory Control","Absorptive Capacity Matrix","Social Skydiving (Lewis)","Challenge Partner assignment"]', 'Followership', 'Robert Kelley', 'The most effective followers are active, independent, critical thinkers who commit fully. How you perform as a follower is the first measure of leadership potential.', 'Tonight we test whether your values are real or just words. When you are exhausted and nobody is watching, which version of you shows up?', NULL, NULL, 2),
('w1-tue', NULL, 1, 'The Character Range', 'Tue June 23 - Morning', 'The Babble Effect & Mental Modes', 'class', 280, 770, NULL, 'Scientist Mode vs. Loud Confidence', '["Babble Effect","Four Mental Modes: Scientist / Preacher / Prosecutor / Politician","Warren Harding Error","Standing Debate stress inoculation"]', 'Rethinking & Mental Modes', 'Adam Grant', 'Scientist mode produces the best decisions under uncertainty: hold beliefs as hypotheses, revise when evidence changes.', 'The last time a group you were in made a decision: was the person who made the call the most competent, or just the most confident?', NULL, NULL, 3),
('w1-wed', NULL, 1, 'The Character Range', 'Wed June 24 - Morning', 'Intuition as Anomaly Detection', 'class', 720, 880, NULL, 'The Intuition Pillar', '["Intuition as anomaly detection","Effort x Effort = Achievement","Anomaly Detection Log","Proactivity as the behavioral expression of intuition"]', 'Primal Intelligence: Intuition', 'Angus Fletcher', 'Trained capacity to notice the small deviation that others rationalize away. Pattern recognition, not gut feeling.', 'Something feels slightly off in your department. Do you flag it or file it away? That single habit separates exceptional leaders from competent ones.', NULL, NULL, 4),
('w1-thu', NULL, 1, 'The Character Range', 'Thu June 25 - Morning', 'Finite vs. Infinite Games', 'class', 360, 1010, NULL, 'The Long Game', '["Finite vs. Infinite Games (Sinek/Carse)","Scientist Mode applied to Chamberlain","Junk the Plan Essay preview"]', 'The Infinite Game', 'Simon Sinek', 'Finite players optimize to win. Infinite players advance a cause that outlasts any single player. Leadership is not a finite game.', 'Are you here to win the summer or to build something? Both are real answers. Only one of them will still matter in five years.', NULL, NULL, 5),
('w1-fri', NULL, 1, 'The Character Range', 'Fri June 26 - Field', 'Gettysburg & Little Round Top', 'field', 800, 1140, 'Gettysburg, PA', 'Leadership Under Doctrine Failure', '["Lincoln Leadership Institute","Chamberlain bayonet charge case study","Moto vs. Logic on the battlefield","Junk the Plan Essay field notes"]', 'Decision Under Doctrine Failure', 'Course Synthesis', 'When every standard procedure has failed and the situation has outrun the plan, what does a leader do?', 'Was Chamberlain''s bayonet charge crazy, or the most rational thing anyone could have done in that moment? You answer that on the ground he stood on.', NULL, NULL, 6),
('w1-internship', NULL, 1, 'The Character Range', 'Internship Week 1', 'Real Tests, Real Floor', 'internship', 160, 870, NULL, 'Field Application', '["1.1 The Social Skydive","1.2 The Human Sponge Shadow","1.3 Character vs. Instinct Daily Log"]', 'The Internship as Laboratory', 'Course Design', 'Each concept introduced in class is assigned a real test in a real environment within the same week.', 'The classroom is the operating manual. The internship is the operation.', NULL, NULL, 7),
('w2-mon-am', NULL, 2, 'The Forking River', 'Mon June 29 - Morning', 'When the Plan Breaks', 'class', 360, 1380, NULL, 'Cognitive Agility & Narrative Intelligence', '["Story Thinking (Moto) vs. Logic","Branching Futures","Fresh Start Effect (Milkman)","System 1 / System 2 (Kahneman)"]', 'Primal Intelligence: Imagination', 'Angus Fletcher', 'Imagination = mapping what-if scenarios before the plan breaks. Logic deduces; Moto invents possibility when data is absent.', 'Your supervisor just changed the plan you spent three days preparing. In the next five minutes you have to come up with something new. What happens in your brain right now?', NULL, NULL, 8),
('w2-mon-pm', NULL, 2, 'The Forking River', 'Mon June 29 - Evening', 'The Impossible Brief', 'evening', 720, 1490, NULL, 'Designed Failure Under Pressure', '["The Impossible Brief","Neophilia vs. Nuance","Interest Development","Trident Plan introduction"]', 'Designed Failure Pedagogy', 'Course Method', 'Stress-inoculate the framework before you need it. The disruption forces a real-time switch from Logic to Moto under genuine pressure.', 'In two weeks, you will be asked to admit a real mistake to a real supervisor in a real environment. What you feel tonight is what you will feel then.', NULL, NULL, 9),
('w2-tue', NULL, 2, 'The Forking River', 'Tue June 30 - Morning', 'The Trident Plan & Wabi-Sabi Excellence', 'class', 280, 1620, NULL, 'Branching Futures in Practice', '["Trident Plan: 1 Mountaintop Goal, 3 distinct tactical paths","Wabi-Sabi Excellence","Near+1 Vigilance","Technology Audit"]', 'Strategic Imperfectionism', 'Fletcher / Grant', 'Choose what to let be imperfect so you can concentrate energy on what actually matters.', 'Your phone gives you exactly what you want, when you want it. Now you are at an internship where none of that works. Can you invent a new path in real time?', NULL, NULL, 10),
('w2-wed', NULL, 2, 'The Forking River', 'Wed July 1 - Morning', 'Proactive vs. Protective Learning', 'class', 740, 1750, NULL, 'The Tutor Effect & Advice-Mode', '["Tutor Effect","Proactive vs. Protective Learning","Advice vs. Feedback","Prosocial Network Map"]', 'The Loop of Progress', 'Adam Grant', 'Show early imperfect work. Asking what advice do you have activates coaching mode rather than critical mode.', 'You have a deliverable. You know it isn''t as good as it could be. Submit and get feedback, or delay and protect yourself?', NULL, NULL, 11),
('w2-thu', NULL, 2, 'The Forking River', 'Thu July 2 - Morning', 'The Unseen Narrative', 'class', 380, 1880, NULL, 'Argument Structure Under Uncertainty', '["Junk the Plan Essay workshop","The Unseen Narrative","Deliberate practice","Defending Chamberlain rationally"]', 'Beyond Probabilities', 'Course Synthesis', 'Great leaders move beyond calculating probabilities to creating possibilities.', 'What is the hardest argument to make in defense of Chamberlain''s decision? If you can write that version, you understand leadership under uncertainty.', NULL, NULL, 12),
('w2-internship', NULL, 2, 'The Forking River', 'Internship Week 2', 'Plan, Draft, Map', 'internship', 160, 1700, NULL, 'Field Application', '["2.1 The Trident Plan","2.2 The Rough Draft Challenge","2.3 Prosocial Network Map","Junk the Plan Essay"]', 'Same-Week Application', 'Course Design', 'You read about absorptive capacity Monday and demonstrate it at the internship by Wednesday.', 'The challenges are not extra credit. They are the point.', NULL, NULL, 13),
('w3-mon-am', NULL, 3, 'The Compass Valley', 'Mon July 6 - Morning', 'Emotion as Diagnostic Signal', 'class', 380, 2200, NULL, 'The Emotion Pillar', '["Fear: invent one immediate next step","Anger: use Moto for 3 alternatives","Shame: return to values compass","Tuning Anxiety","Emotion Signal Drill"]', 'Emotional Intelligence', 'Daniel Goleman', 'Self-Awareness, Self-Management, Social Awareness, Relationship Management. The Emotion Pillar operationalizes the first two with diagnostic precision.', 'Something went wrong at your internship last week. Those feelings are not random. They are precise diagnostic signals. Today we find out what each one means.', 'This is the week most students find the hardest. The novelty is gone. The feedback has been honest, not encouraging. The gap between who you expected to be and who you are is uncomfortably visible.', NULL, 14),
('w3-mon-pm', NULL, 3, 'The Compass Valley', 'Mon July 6 - Evening', 'Deliberate Practice & The Challenge Network', 'evening', 700, 2330, NULL, 'Productive Disagreement', '["Deliberate practice (Ericsson)","Task Conflict vs. Relationship Conflict","Care Personally Challenge Directly (Scott)","Building your Challenge Network"]', 'Conflict Management Styles', 'Thomas-Kilmann', 'Five modes: Competing / Collaborating / Compromising / Avoiding / Accommodating. Avoiding is almost always the most expensive choice over time.', 'Elite performers specifically target their weakest areas. What is your equivalent of targeting weakness with deliberate practice?', NULL, NULL, 15),
('w3-tue', NULL, 3, 'The Compass Valley', 'Tue July 7 - Morning', 'The Loop of Progress', 'class', 280, 2460, NULL, 'Backing Up to Move Forward', '["The Loop of Progress","Three types of failure: basic / complex / intelligent","Beginner at the Next Level","Backing Up to Move Forward"]', 'Intelligent Failure Typology', 'Amy Edmondson', 'Only intelligent failure (small, hypothesis-driven errors in new territory) should be pursued deliberately.', 'Your performance this week looks worse than two weeks ago because you''re trying new things you''re not yet good at. Do you go back to what you were good at?', NULL, NULL, 16),
('w3-wed', NULL, 3, 'The Compass Valley', 'Wed July 8 - Morning', 'The Vulnerable Leader Equation', 'class', 740, 2590, NULL, 'Trust Through Visible Imperfection', '["Vulnerable Leader Equation","Armored vs. Daring leadership (Brown)","Feedback as investment","Adversarial Peer Review","Naming your primary armor"]', 'Daring Leadership', 'Brene Brown', 'The daring leader removes their own armor before asking anyone else to remove theirs. Psychological safety cannot be mandated only modeled.', 'Your supervisor is watching how you handle the mistake not the mistake itself. The admission of imperfection combined with demonstrated competence is a trust-building tool.', NULL, NULL, 17),
('w3-thu', NULL, 3, 'The Compass Valley', 'Thu July 9 - Morning', 'Antifragility & D.C. Preparation', 'class', 360, 2720, NULL, 'Systems That Strengthen Under Stress', '["Antifragility design","Capitol: collective decision-making architecture","White House: Commander Intent in governance","Holocaust Museum: institutional failure of psychological safety"]', 'Antifragility', 'Fletcher / Course Synthesis', 'A system that uses stress as input for growth, rather than merely surviving it.', 'The leadership question is not how did this happen. It is: at what point did institutional structures fail to allow individuals to speak truth to power?', NULL, NULL, 18),
('w3-fri', NULL, 3, 'The Compass Valley', 'Fri July 10 - Field', 'D.C. Three Sites Three Frameworks', 'field', 820, 2850, 'Washington, D.C.', 'Institutional Leadership at Scale', '["White House: scaling Commander Intent","U.S. Capitol: legislative process as Collective Intelligence","Holocaust Museum: conditions of dissent failure","D.C. Field Journal"]', 'Psychological Safety at Catastrophic Scale', 'Edmondson Applied', 'When silence is structurally easier than speech, what kind of organizational conditions made that true?', 'Three sites in one day. The answer to what does any of this have to do with leadership is not inspiration. It is organizational leadership failure at a scale that killed millions.', NULL, NULL, 19),
('w3-internship', NULL, 3, 'The Compass Valley', 'Internship Week 3', 'Diagnose, Confess, Practice', 'internship', 140, 2530, NULL, 'The Hardest Week Tests', '["3.1 Smart Signal Diagnostic Audit","3.2 Vulnerability-Competence Briefing","3.3 Deliberate Practice Design"]', 'The Hardest Assignment', 'Course Design', 'Admitting a real mistake to a real supervisor before they notice is the hardest professional skill in the program.', 'It took real trust in your supervisor to do that. Acknowledging the honesty before addressing the mistake will make a lasting impression.', NULL, NULL, 20),
('w4-mon-am', NULL, 4, 'The Bridge of Crossing', 'Mon July 13 - Morning', 'Collective Intelligence', 'class', 380, 3060, NULL, 'Prosocial Skills Beat Team IQ', '["Collective Intelligence (Grant)","Babble Effect at the group level","Brainwriting vs. Brainstorming","HIPPO effect","Chilean Mine Rescue case study"]', 'Maslow Hierarchy of Needs', 'Abraham Maslow', 'You cannot lead others until you have your own psychological foundation in place.', 'In every group project: who did the work? Who came up with ideas? Who got credit? If those were not the same people you have already experienced this week''s research finding.', NULL, NULL, 21),
('w4-mon-pm', NULL, 4, 'The Bridge of Crossing', 'Mon July 13 - Evening', 'Live with Dr. Angus Fletcher', 'evening', 720, 3170, NULL, 'Direct Engagement With the Source', '["Live Zoom with Dr. Angus Fletcher","Pre-Mortem Part II partner debrief","Concept lived vs. concept still theoretical"]', 'The Researcher in the Room', 'Course Method', 'Bring concrete experiences from your life that you want to analyze through the primal intelligence lens.', 'The question you bring should not be about the book. It should be about your summer.', NULL, NULL, 22),
('w4-tue', NULL, 4, 'The Bridge of Crossing', 'Tue July 14 - Morning', 'Scaffolding & Fading', 'class', 280, 3300, NULL, 'Teaching Without Creating Dependence', '["Scaffolding and Fading (Grant)","Tutor Effect at the leadership level","Legacy Scaffolding Blueprint","Lattice vs. Ladder"]', 'Situational Leadership', 'Hersey & Blanchard', 'Adapt your style to the developmental level of the follower: Directing to Coaching to Supporting to Delegating.', 'Your internship is almost over. What happens to four weeks of knowledge when you leave?', NULL, NULL, 23),
('w4-wed', NULL, 4, 'The Bridge of Crossing', 'Wed July 15 - Morning', 'Commander Intent', 'class', 740, 3430, NULL, 'The Why and The Goal', '["Commander Intent: communicate the Why and Goal","Job Crafting","Just Cause framework (Sinek)","Purpose as the most durable fuel for grit"]', 'Servant Leadership', 'Robert Greenleaf', 'The leader''s role is to serve the development of followers and the higher purpose. The leader goes last, not first.', 'You''re writing a document for someone you''ve never met, for a role you''ve spent four weeks figuring out.', NULL, NULL, 24),
('w4-thu', NULL, 4, 'The Bridge of Crossing', 'Thu July 16 - Morning', 'The Lattice Pitch', 'class', 360, 3560, NULL, 'Influence Without Title', '["Lattice vs. Ladder","The Lattice Pitch","Pre-Suasion (Cialdini): the moment before you speak"]', 'Power Bases', 'French & Raven', 'Five bases: Legitimate / Reward / Coercive / Expert / Referent. The most effective long-term leaders build Expert and Referent power.', 'Tomorrow you sit with Dr. Angela Duckworth at Penn. The question is: where in your actual behavior do you see grit operating, and where do you see it failing?', NULL, NULL, 25),
('w4-fri', NULL, 4, 'The Bridge of Crossing', 'Fri July 17 - Field', 'Duckworth Roundtable at UPenn', 'field', 820, 3690, 'Wharton, Philadelphia, PA', 'Conversation, Not Lecture', '["Academic roundtable with Dr. Angela Duckworth","Pre-submitted questions tied to internship evidence","Pre-course Grit Scale baseline as anchor"]', 'Evidence-Based Self-Knowledge', 'Duckworth Applied', 'You arrive with four weeks of internship evidence and engage her in conversation about what grit looks like under real professional conditions.', 'The expectation is not that you come to listen. The expectation is that you arrive with evidence and engage.', NULL, NULL, 26),
('w4-internship', NULL, 4, 'The Bridge of Crossing', 'Internship Week 4 (Final)', 'Handbook, Brainwrite, Blueprint', 'internship', 140, 3360, NULL, 'Final Field Application', '["4.1 Commander Intent Strategic Handbook","4.2 Brainwriting vs. Brainstorming Efficiency Report","4.3 Legacy Scaffolding Blueprint"]', 'Transformational vs. Transactional', 'Burns & Bass', 'Transactional leaders manage. Transformational leaders elevate followers toward purpose beyond self-interest.', 'If your supervisor has 10 minutes to tell you where you grew, where you plateaued, and what surprised them that conversation will be one of the most valuable things in your entire summer.', NULL, NULL, 27),
('w5-mon', NULL, 5, 'The Synthesis Plateau', 'Mon July 20', 'Distance Traveled & Hope', 'class', 400, 3920, NULL, 'Growth From Starting Position', '["Distance Traveled framework","Hope as a cognitive skill","Three dimensions of explanatory style","Brainwriting joint presentations"]', 'Learned Optimism', 'Martin Seligman', 'Hope is a learned explanatory style that determines how you respond to setbacks and whether effort continues after failure.', 'The distance between who you were June 8th and who you are July 20th is the only honest measure of what this summer produced in you.', NULL, NULL, 28),
('w5-tue', NULL, 5, 'The Synthesis Plateau', 'Tue July 21', 'Eating Your Enemy', 'class', 660, 4040, NULL, 'Innovation Through Respect', '["Eating Your Enemy (Grant)","Influential Listening","Looping for Understanding (Duhigg)","Range (Epstein)"]', 'Range', 'David Epstein', 'In complex unpredictable domains, people with broad varied experience consistently outperform narrow specialists.', 'Genuine innovation comes from those who study what their strongest competitors do best and deliberately incorporate it.', NULL, NULL, 29),
('w5-wed', NULL, 5, 'The Synthesis Plateau', 'Wed July 22', 'Self-Reliant Vision', 'class', 320, 4170, NULL, 'The Common Sense Pillar', '["Common Sense Pillar","Self-Reliant Vision","Unleashing the Rookie","Technology Audit revisit"]', 'Organizational Culture', 'Edgar Schein', 'Three levels: Artifacts / Espoused Values / Underlying Assumptions. Leadership failures are born in the gap between Espoused Values and Underlying Assumptions.', 'You are three weeks from your senior year. Do you trust your internal infrastructure enough to take the first step into uncertainty without waiting for permission?', NULL, NULL, 30),
('w5-thu', NULL, 5, 'The Synthesis Plateau', 'Thu July 23', 'Voice-Amplifying Systems', 'class', 700, 4300, NULL, 'Structural Inclusion', '["Voice-Amplifying System design","Distance Traveled Portfolio assembly","Life Narrative organized around Valleys Crossed","Final Synthesis Paper workshop"]', 'Inclusive Leadership', 'Bourke & Dillon (Deloitte)', 'Six traits: Commitment, Courage, Cognizance of Bias, Curiosity, Cultural Intelligence, Collaboration.', 'Your final synthesis paper is the only assignment where the research evidence is your own summer.', NULL, NULL, 31),
('w5-fri', NULL, 5, 'The Synthesis Plateau', 'Fri July 24 - Field', 'U.S. Army War College', 'field', 820, 4430, 'Carlisle, PA', 'Every Framework Activated Simultaneously', '["War Games Simulation","Think Tank Visit","Futures Lab","Senior Officers Roundtable"]', 'The Capstone Test', 'Course Synthesis', 'Every cognitive framework from the course activated simultaneously, on the highest-stakes ground available.', 'Which course concept did you see validated most clearly here? Which one was revealed as more complex than the book suggested?', NULL, NULL, 32),
('w5-deliverables', NULL, 5, 'The Synthesis Plateau', 'Week 5 Deliverables', 'Putting It Together', 'internship', 140, 4140, NULL, 'Synthesis Output', '["Collective Intelligence Comparative Case Study","Innovation Proposal","Voice-Amplifying System Proposal","Army War College Reflection"]', 'The Bridge to Public Argument', 'Course Design', 'Synthesis is not summary. It is the construction of a defensible argument from data collected across multiple environments.', 'You are putting together a summer worth of development and building it into something you can articulate, defend, and use.', NULL, NULL, 33),
('w6-mon', NULL, 6, 'Distance Traveled Lookout', 'Mon July 27', 'The Identity Ballot Box', 'async', 380, 4670, NULL, 'Counting the Votes', '["Atomic Habits Re-Read","How to Change Re-Read","Distance Traveled Portfolio assembly","Senior Year Commander Intent assigned"]', 'Identity-Based Habits', 'James Clear', 'You do not rise to the level of your goals; you fall to the level of your identity. Every action is a vote cast for the type of person you believe yourself to be.', 'No class sessions this week. The scaffolding is removed. What remains is you, your work, your values compass, and a deadline.', NULL, NULL, 34),
('w6-tue', NULL, 6, 'Distance Traveled Lookout', 'Tue July 28', 'The Valleys Crossed', 'async', 700, 4790, NULL, 'Honest Narrative', '["Just Cause re-read (Sinek)","Life Narrative Presentation: Valleys Crossed not Peaks","Character Scorecard draft"]', 'The Just Cause', 'Sinek (revisited)', 'A goal has a finish line. A cause has a direction. Your presentation should not end with what you achieved it should end with what you are now positioned to advance.', 'The presentation is not a highlight reel. It is the honest account of this summer, organized around the moments that were hardest and most developmental.', NULL, NULL, 35),
('w6-wed', NULL, 6, 'Distance Traveled Lookout', 'Wed July 29', 'The Rule Rewrite', 'async', 320, 4910, NULL, 'Change Leadership Applied', '["Rule Rewrite proposal","Schein Underlying Assumptions level","Goal vs. Cause distinction","Real institution real problem real proposed solution"]', 'Change Leadership (8-Step)', 'John Kotter', 'Create Urgency, Build Coalition, Form Vision, Communicate, Remove Obstacles, Short-Term Wins, Build on Change, Anchor in Culture.', 'The Rule Rewrite asks you to identify a real rule that produces the opposite of its intended effect.', NULL, NULL, 36),
('w6-thu', NULL, 6, 'Distance Traveled Lookout', 'Thu July 30', 'The Personal Scaffolding Map', 'async', 700, 5040, NULL, 'Naming Your Network', '["Personal Scaffolding Map","Senior Year Commander Intent finalization","Brown re-read (the armor question)","Final compilation"]', 'Faded Scaffolding', 'Course Synthesis', 'Your map should include not just who supports you, but when that support should be faded.', 'Senior year begins in four weeks. The scaffolding ends tomorrow. You need those answers before you leave for college, not after you arrive.', NULL, NULL, 37),
('w6-fri', NULL, 6, 'Distance Traveled Lookout', 'Fri July 31 - Deadline', 'The Last Test', 'deadline', 500, 5170, NULL, 'Self-Directed Capacity', '["All deliverables submitted by 11:59 PM","Final Synthesis Paper","Life Narrative Presentation","Distance Traveled Portfolio","Character Scorecard","Rule Rewrite","Personal Scaffolding Map","Senior Year Commander Intent"]', 'The Deadline as Diagnostic', 'Course Design', 'What you do today, on a Friday in late July when no one is watching, tells you more about who you actually are than any field experience.', 'The work is either done or it is not. The development is either real or it is performed. You know which one it is.', NULL, NULL, 38),
('horizon', NULL, 7, 'The Horizon', 'Aug 8 to Senior Year', 'What Continues After', 'horizon', 500, 5430, NULL, 'Durable Identity', '["Aug 8 Identity Re-Activation Text","Aug 15 Cohort Re-Gathering","Weekly Challenge Partner texts","Sept 15 Distance Traveled +30 Entry","Optional Fall check-ins"]', 'Senior Year Bridge Protocol', 'Course Design', 'What you built this summer will collapse without commitment devices that survive into senior year. Your principles do not hold themselves; the structure holds them.', 'This protocol exists to make sure the person you became this summer is still the person who shows up in September, October, and February.', NULL, NULL, 39)
ON CONFLICT DO NOTHING;
`;
