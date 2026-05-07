// pages/review/[id].js
// Blueprint's review interface for a single submission.
// Protected — only accessible when logged in as the reviewer account.
// Approve → triggers verification issuance + student notification.
// Return → sends student an email with Blueprint's feedback.

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase, getServiceClient } from "../../src/lib/supabase";
import { SKILLS } from "../../src/data/skills";

const REVIEWER_EMAIL = process.env.NEXT_PUBLIC_REVIEWER_EMAIL || "hello@improvedskills.com";

export default function ReviewPage() {
  const router = useRouter();
  const { id } = router.query;
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Only the reviewer account can access this
      if (user.email !== REVIEWER_EMAIL) {
        setError("Access denied. This page is only accessible to the reviewer account.");
        setLoading(false);
        return;
      }
      setCurrentUser(user);

      // Fetch the submission using service role (bypasses RLS)
      const res = await fetch(`/api/review-data?id=${id}`, {
        headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      });
      const data = await res.json();
      if (data.submission) setSubmission(data.submission);
      setLoading(false);
    })();
  }, [id, router]);

  async function handleAction(action) {
    if (action === "return" && !feedback.trim()) {
      setError("Please write feedback before returning the submission.");
      return;
    }
    setActing(true);
    setError("");

    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch("/api/review-action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ submissionId: id, action, feedback: feedback.trim() }),
    });
    const data = await res.json();
    if (data.success) setResult(action);
    else setError(data.error || "Action failed.");
    setActing(false);
  }

  if (loading) return <CenteredMsg text="Loading submission..." />;
  if (error && !submission) return <CenteredMsg text={error} />;
  if (result) return <CenteredMsg text={result === "approved" ? "✓ Approved — verification issued and student notified." : "✓ Returned — student notified with your feedback."} />;
  if (!submission) return <CenteredMsg text="Submission not found." />;

  const skill = SKILLS[submission.skill_id];
  const flags = submission.behavioral_flags || [];
  const judgmentColor = submission.defense_judgment === "engaged" ? "#28a745" : submission.defense_judgment === "partially_engaged" ? "#f59e0b" : "#dc2626";

  return (
    <>
      <Head><title>Review — {submission.display_name} — {skill?.name}</title></Head>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px", fontFamily: "system-ui, sans-serif", color: "#2a2a2a" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{submission.display_name}</h1>
            <p style={{ fontSize: 14, color: "#888" }}>{submission.student_email} · {skill?.name} · {new Date(submission.submitted_at).toLocaleDateString()}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#888", marginBottom: 4 }}>AI Judgment</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: judgmentColor }}>{submission.defense_judgment?.replace("_", " ").toUpperCase()}</div>
          </div>
        </div>

        {submission.defense_observation && (
          <div style={{ background: "#e8f4f8", borderLeft: "4px solid #1B2845", padding: "12px 16px", borderRadius: "0 8px 8px 0", marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#666", marginBottom: 6 }}>AI Observation</div>
            <p style={{ fontSize: 14, margin: 0 }}>{submission.defense_observation}</p>
          </div>
        )}

        {flags.length > 0 && (
          <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>⚠️ Behavioral Flags</div>
            {flags.map((f, i) => <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>• {f}</div>)}
          </div>
        )}

        {submission.status !== "pending" && (
          <div style={{ background: "#d4edda", border: "1px solid #28a745", borderRadius: 8, padding: 12, marginBottom: 24, fontSize: 13, fontWeight: 600 }}>
            This submission has already been {submission.status}.
          </div>
        )}

        {[
          { label: "Hook Response", value: submission.hook_response },
          { label: "Science Response", value: submission.science_response },
          { label: "Challenge Documentation", value: submission.challenge_response },
          { label: "Initial Defense", value: submission.defense_initial },
          { label: `Follow-up 1: ${skill?.defense?.followUps?.[0]?.substring(0, 60)}...`, value: submission.defense_q1 },
          { label: `Follow-up 2: ${skill?.defense?.followUps?.[1]?.substring(0, 60)}...`, value: submission.defense_q2 },
          { label: `Follow-up 3: ${skill?.defense?.followUps?.[2]?.substring(0, 60)}...`, value: submission.defense_q3 },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#1B2845", marginBottom: 8 }}>{section.label}</h3>
            <div style={{ background: "#f8f9fa", borderRadius: 8, padding: "14px 16px", fontSize: 14, lineHeight: 1.85, whiteSpace: "pre-wrap", minHeight: 60 }}>{section.value}</div>
          </div>
        ))}

        {submission.status === "pending" && (
          <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #eee", padding: "20px 0", marginTop: 32 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 8 }}>
                Feedback (required if returning, optional if approving)
              </label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                rows={4}
                placeholder="Write specific feedback for the student about what to strengthen or what was particularly strong..."
                style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, lineHeight: 1.7, fontFamily: "system-ui", resize: "vertical" }}
              />
            </div>
            {error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => handleAction("approved")}
                disabled={acting}
                style={{ flex: 1, padding: "13px", background: "#1B2845", color: "#E8B84B", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                {acting ? "Processing..." : "✓ Approve — Issue Verification"}
              </button>
              <button
                onClick={() => handleAction("returned")}
                disabled={acting}
                style={{ flex: 1, padding: "13px", background: "#f8f9fa", color: "#2a2a2a", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Return with Feedback
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function CenteredMsg({ text }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#888", fontSize: 15 }}>
      {text}
    </div>
  );
}
