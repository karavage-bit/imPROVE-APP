// Dashboard — pages/dashboard.js
// Authenticated user's home page. Shows progress, locks paid skills for free users.

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SKILLS } from "../src/data/skills";
import { FREE_SKILL_IDS } from "../src/data/versions";
import { Logo } from "../src/components/UI";
import { SkillView } from "../src/components/SkillView";
import { supabase, getCurrentUser, getProfile, loadAllProgress, signOut } from "../src/lib/supabase";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [completed, setCompleted] = useState(new Set());
  const [activeSkill, setActiveSkill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      const p = await getProfile(u.id);
      setProfile(p);

      // Check if account is locked pending parental review
      const { data: lockCheck } = await supabase.rpc("is_user_locked", { check_user_id: u.id });
      if (lockCheck) {
        router.push("/locked");
        return;
      }
      const progress = await loadAllProgress(u.id);

      // A skill is "done" if all 5 steps are completed
      const skillCompletion = {};
      progress.forEach((row) => {
        if (!skillCompletion[row.skill_id]) skillCompletion[row.skill_id] = new Set();
        if (row.step_status === "completed") skillCompletion[row.skill_id].add(row.step);
      });
      const doneSet = new Set();
      Object.entries(skillCompletion).forEach(([id, steps]) => {
        if (steps.size === 5) doneSet.add(parseInt(id));
      });
      setCompleted(doneSet);
      setLoading(false);
    })();
  }, [router]);

  function getSkillStatus(i) {
    if (completed.has(i)) return "done";
    // Free tier: skills 1-2 always open if prior is done; rest paywalled
    const isFree = FREE_SKILL_IDS.includes(i);
    const isPaid = profile?.tier === "paid" || profile?.tier === "plus";
    if (i === 0 || completed.has(i - 1)) {
      if (isFree || isPaid) return "open";
      return "paywalled";
    }
    return "locked";
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-3)", fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  if (activeSkill !== null) {
    return (
      <SkillView
        skill={SKILLS[activeSkill]}
        userId={user.id}
        displayName={profile.display_name}
        onComplete={() => {
          setActiveSkill(null);
          // Refresh progress
          loadAllProgress(user.id).then((progress) => {
            const skillCompletion = {};
            progress.forEach((row) => {
              if (!skillCompletion[row.skill_id]) skillCompletion[row.skill_id] = new Set();
              if (row.step_status === "completed") skillCompletion[row.skill_id].add(row.step);
            });
            const doneSet = new Set();
            Object.entries(skillCompletion).forEach(([id, steps]) => {
              if (steps.size === 5) doneSet.add(parseInt(id));
            });
            setCompleted(doneSet);
          });
        }}
        onBack={() => setActiveSkill(null)}
      />
    );
  }

  const n = completed.size;

  return (
    <div style={{ minHeight: "100vh", maxWidth: 820, margin: "0 auto", padding: "28px 20px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <Logo size={24} />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>{profile?.display_name}</div>
            <div style={{ fontSize: 13, color: "var(--gold)", fontWeight: 600 }}>{n} / 10 proved</div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            style={{ background: "none", border: "none", color: "var(--text-4)", fontSize: 12, cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div style={{ height: 4, background: "var(--border-1)", borderRadius: 2, marginBottom: 8, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${n * 10}%`,
            background: "linear-gradient(90deg, var(--gold), #f0d080)",
            transition: "width .8s cubic-bezier(0.34,1.56,0.64,1)",
            borderRadius: 2,
          }}
        />
      </div>
      <p style={{ fontSize: 11, color: "var(--text-4)", marginBottom: 24 }}>
        {n === 0 ? "Each skill unlocks the next. Complete one to continue." : n === 10 ? "All ten skills proved." : `${10 - n} skill${10 - n !== 1 ? "s" : ""} remaining.`}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {SKILLS.map((sk, i) => {
          const status = getSkillStatus(i);
          const clickable = status === "open" || status === "done" || status === "paywalled";
          return (
            <div
              key={sk.id}
              onClick={() => {
                if (status === "paywalled") {
                  router.push("/upgrade");
                } else if (clickable) {
                  setActiveSkill(i);
                }
              }}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : -1}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && clickable) {
                  if (status === "paywalled") router.push("/upgrade");
                  else setActiveSkill(i);
                }
              }}
              style={{
                background: status === "done" ? "#0f1f14" : "var(--bg-2)",
                border: `1px solid ${
                  status === "done"
                    ? "rgba(74,171,106,0.35)"
                    : status === "open"
                    ? `${sk.color}55`
                    : "var(--border-1)"
                }`,
                borderRadius: "var(--radius-lg)",
                padding: "18px 16px",
                cursor: clickable ? "pointer" : "default",
                opacity: status === "locked" ? 0.3 : 1,
                position: "relative",
                overflow: "hidden",
                transition: "border-color .2s",
              }}
            >
              {status === "open" && <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: sk.color }} />}
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color:
                    status === "done"
                      ? "var(--green)"
                      : status === "open"
                      ? sk.color
                      : status === "paywalled"
                      ? "var(--gold)"
                      : "var(--text-4)",
                  marginBottom: 8,
                }}
              >
                {status === "done"
                  ? "✓ proved"
                  : status === "locked"
                  ? "🔒 locked"
                  : status === "paywalled"
                  ? "🔓 unlock"
                  : `skill ${String(i + 1).padStart(2, "0")}`}
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: 700,
                  color: status === "done" ? "var(--green)" : "var(--text-1)",
                  marginBottom: 5,
                }}
              >
                {sk.name}
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-4)", lineHeight: 1.6 }}>{sk.tagline}</p>
            </div>
          );
        })}
      </div>

      {profile?.tier === "free" && completed.size >= FREE_SKILL_IDS.length && (
        <div
          style={{
            marginTop: 32,
            padding: 24,
            background: "var(--bg-2)",
            border: "1px solid var(--gold)",
            borderRadius: "var(--radius-lg)",
            textAlign: "center",
          }}
        >
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--gold)", marginBottom: 8 }}>
            Ready for the rest?
          </h3>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 16 }}>
            You've proved 2 of 10 skills. Unlock the remaining 8 for a one-time $39.
          </p>
          <button
            onClick={() => router.push("/upgrade")}
            style={{
              padding: "12px 32px",
              background: "var(--gold)",
              color: "#0c0c0c",
              border: "none",
              borderRadius: "var(--radius)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Upgrade →
          </button>
        </div>
      )}

      {n === 10 && (
        <div
          style={{
            marginTop: 40,
            padding: 32,
            border: "1px solid rgba(232,184,75,0.3)",
            borderRadius: "var(--radius-lg)",
            textAlign: "center",
            background: "radial-gradient(ellipse at 50% 0%, rgba(232,184,75,0.08), transparent)",
          }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--gold)", marginBottom: 12 }}>★</div>
          <h2 style={{ color: "var(--gold)", marginBottom: 8, fontSize: 20 }}>All Ten Skills Proved</h2>
          <p style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.8 }}>
            You didn't just read about these.<br />You did the work.
          </p>
        </div>
      )}
    </div>
  );
}
