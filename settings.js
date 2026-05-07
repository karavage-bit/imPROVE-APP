// Settings page — pages/settings.js
// User controls: notifications, data export, account deletion.
// Trust is built here. Every promise from the welcome page is honored with a button.

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Logo, GhostBtn } from "../src/components/UI";
import { supabase, getCurrentUser, getProfile } from "../src/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [nudgesPaused, setNudgesPaused] = useState(false);
  const [error, setError] = useState("");

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

      // Check for any unsent nudges (proxy for "nudges enabled")
      const { data: pendingNudges } = await supabase
        .from("nudges")
        .select("id")
        .eq("user_id", u.id)
        .is("sent_at", null)
        .limit(1);
      setNudgesPaused(!pendingNudges || pendingNudges.length === 0);
      setLoading(false);
    })();
  }, [router]);

  async function handlePauseNudges() {
    // Mark all pending nudges as sent so they don't fire
    await supabase
      .from("nudges")
      .update({ sent_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("sent_at", null);
    setNudgesPaused(true);
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      // Pull everything the user has written
      const [progress, messages, verifications] = await Promise.all([
        supabase.from("skill_progress").select("*").eq("user_id", user.id),
        supabase.from("defense_evaluations").select("*").eq("user_id", user.id),
        supabase.from("verifications").select("*").eq("user_id", user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: {
          display_name: profile.display_name,
          email: profile.email,
          tier: profile.tier,
          created_at: profile.created_at,
        },
        skill_progress: progress.data || [],
        defense_evaluations: messages.data || [],
        verifications: verifications.data || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `improved-data-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Export failed. Please try again.");
    }
    setExportLoading(false);
  }

  async function handleDelete() {
    if (deleteConfirm !== "DELETE") {
      setError('You must type "DELETE" exactly.');
      return;
    }
    setDeleting(true);
    setError("");

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      const data = await res.json();
      if (data.success) {
        await supabase.auth.signOut();
        router.push("/?deleted=true");
      } else {
        setError(data.error || "Deletion failed.");
        setDeleting(false);
      }
    } catch (e) {
      setError("Something went wrong. Please contact support.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-3)", fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Settings — imPROVED</title>
      </Head>
      <main style={{ minHeight: "100vh", maxWidth: 620, margin: "0 auto", padding: "28px 20px 60px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{ background: "none", border: "none", color: "var(--text-4)", fontSize: 13, cursor: "pointer" }}
          >
            ← back
          </button>
          <Logo size={20} />
        </header>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 800,
            color: "var(--text-1)",
            marginBottom: 32,
          }}
        >
          Settings
        </h1>

        {/* Account info */}
        <Section title="Account">
          <Row label="Display name" value={profile?.display_name} />
          <Row label="Email" value={profile?.email} />
          <Row
            label="Plan"
            value={profile?.tier === "paid" ? "Full Access" : profile?.tier === "plus" ? "Verification Plus" : "Free (Skills 1-2)"}
          />
        </Section>

        {/* Notifications */}
        <Section title="Email reminders">
          <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.85, marginBottom: 14 }}>
            We send up to one follow-up email two days after you complete a real-world challenge,
            plus three spaced revisit emails at 30, 90, and 180 days. That's it. No marketing
            emails. No streaks. No upsells.
          </p>
          {nudgesPaused ? (
            <div
              style={{
                fontSize: 13,
                color: "var(--text-2)",
                padding: "10px 14px",
                background: "var(--bg-3)",
                border: "1px solid var(--border-2)",
                borderRadius: "var(--radius)",
              }}
            >
              ✓ All pending reminders paused. Future skill completions will schedule new ones.
            </div>
          ) : (
            <GhostBtn onClick={handlePauseNudges}>Pause all pending reminders</GhostBtn>
          )}
        </Section>

        {/* Export */}
        <Section title="Your data">
          <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.85, marginBottom: 14 }}>
            Download everything you've ever written here as a JSON file. Includes all reflections,
            Defense submissions, and verifications.
          </p>
          <GhostBtn onClick={handleExport} disabled={exportLoading}>
            {exportLoading ? "Preparing..." : "Download my data"}
          </GhostBtn>
        </Section>

        {/* Danger zone */}
        <Section title="Delete account" danger>
          <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.85, marginBottom: 14 }}>
            This permanently deletes every reflection, every Defense submission, and every
            verification you've ever created here. There is no undo. There is no waiting period.
          </p>
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              style={{
                background: "transparent",
                border: "1px solid rgba(224,75,75,0.4)",
                color: "var(--red)",
                padding: "10px 22px",
                borderRadius: "var(--radius)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Delete my account
            </button>
          ) : (
            <div
              style={{
                background: "rgba(224,75,75,0.06)",
                border: "1px solid rgba(224,75,75,0.3)",
                borderRadius: "var(--radius)",
                padding: 18,
              }}
            >
              <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 12, lineHeight: 1.7 }}>
                Type <strong>DELETE</strong> to confirm. This cannot be undone.
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE"
                style={{ marginBottom: 12 }}
                autoFocus
              />
              {error && <p style={{ fontSize: 13, color: "var(--red)", marginBottom: 10 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => {
                    setShowDelete(false);
                    setDeleteConfirm("");
                    setError("");
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-3)",
                    color: "var(--text-3)",
                    padding: "10px 20px",
                    borderRadius: "var(--radius)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirm !== "DELETE" || deleting}
                  style={{
                    background: deleteConfirm === "DELETE" ? "var(--red)" : "transparent",
                    border: "1px solid var(--red)",
                    color: deleteConfirm === "DELETE" ? "#fff" : "var(--red)",
                    padding: "10px 20px",
                    borderRadius: "var(--radius)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: deleteConfirm === "DELETE" ? "pointer" : "not-allowed",
                    opacity: deleteConfirm === "DELETE" ? 1 : 0.5,
                  }}
                >
                  {deleting ? "Deleting..." : "Delete forever"}
                </button>
              </div>
            </div>
          )}
        </Section>
      </main>
    </>
  );
}

function Section({ title, children, danger }) {
  return (
    <section
      style={{
        marginBottom: 36,
        padding: "22px 24px",
        background: "var(--bg-2)",
        border: `1px solid ${danger ? "rgba(224,75,75,0.2)" : "var(--border-1)"}`,
        borderRadius: "var(--radius-lg)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: danger ? "var(--red)" : "var(--text-3)",
          marginBottom: 16,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
      <span style={{ color: "var(--text-3)" }}>{label}</span>
      <span style={{ color: "var(--text-1)" }}>{value}</span>
    </div>
  );
}
