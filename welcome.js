// Welcome page — pages/welcome.js
// First page the student sees after a parent purchases.
// CRITICAL UX MOMENT: we re-frame the space as the STUDENT's, not the parent's.
// The student gives informed consent here before any reflection writing begins.

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Logo, PrimaryBtn, GhostBtn } from "../src/components/UI";
import { DeclarationModal } from "../src/components/DeclarationModal";
import { supabase, getCurrentUser, getProfile, updateProfile, logAuditEvent } from "../src/lib/supabase";

export default function WelcomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showDeclaration, setShowDeclaration] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) {
        // Magic link not yet processed; wait briefly then check again
        setTimeout(async () => {
          const u2 = await getCurrentUser();
          if (!u2) {
            router.push("/login");
            return;
          }
          setUser(u2);
          const p = await getProfile(u2.id);
          setProfile(p);
          setLoading(false);
        }, 1200);
        return;
      }
      setUser(u);
      const p = await getProfile(u.id);
      setProfile(p);

      // If they've already consented, skip straight to dashboard
      if (p?.student_consent_at) {
        router.push("/dashboard");
        return;
      }
      setLoading(false);
    })();
  }, [router]);

  async function handleConsent() {
    setConfirming(true);
    await updateProfile(user.id, { student_consent_at: new Date().toISOString() });
    await logAuditEvent({
      userId: user.id,
      eventType: "student_consent_given",
      eventData: { tier: profile?.tier },
    });
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-3)", fontSize: 14 }}>Setting up your access...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Welcome — imPROVED</title>
      </Head>
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,184,75,0.06), transparent), var(--bg-1)",
        }}
      >
        <div style={{ maxWidth: 560, width: "100%" }} className="au">
          <Logo size={28} />

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 32,
              fontWeight: 800,
              lineHeight: 1.25,
              marginTop: 36,
              marginBottom: 18,
              color: "var(--text-1)",
            }}
          >
            This space is yours.
          </h1>

          <p style={{ fontSize: 15, lineHeight: 1.95, color: "var(--text-2)", marginBottom: 22 }}>
            A parent or guardian purchased imPROVED for you. Before you start, here's what you
            should know — and what you're agreeing to:
          </p>

          <div
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border-2)",
              borderRadius: "var(--radius-lg)",
              padding: "24px 26px",
              marginBottom: 22,
            }}
          >
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {[
                {
                  bold: "Your reflections are private.",
                  rest: " The person who purchased this for you cannot see what you write. Not your hooks, not your science responses, not your Defense submissions.",
                },
                {
                  bold: "You decide what to share.",
                  rest: " When you complete a skill, you'll get a Verification page. Only you decide who sees it.",
                },
                {
                  bold: "We don't train AI on your writing.",
                  rest: " Your reflections are not used to train any model. Ever.",
                },
                {
                  bold: "You can delete everything, instantly.",
                  rest: " One click in Settings wipes every word you've ever written here. No customer support call, no waiting period.",
                },
                {
                  bold: "We notice if you're in crisis.",
                  rest: " If something you write suggests you're in serious distress, we'll surface real-world resources. We won't notify your parents. That's your call.",
                },
              ].map((item, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 14,
                    lineHeight: 1.85,
                    color: "var(--text-2)",
                    marginBottom: i < 4 ? 14 : 0,
                    paddingLeft: 22,
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 8,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--gold)",
                    }}
                  />
                  <strong style={{ color: "var(--text-1)" }}>{item.bold}</strong>
                  {item.rest}
                </li>
              ))}
            </ul>
          </div>

          <p
            style={{
              fontSize: 14,
              lineHeight: 1.85,
              color: "var(--text-3)",
              marginBottom: 28,
              fontStyle: "italic",
            }}
          >
            One more thing: this won't be a feel-good experience. The Defense step pushes
            you to address questions you'd rather skip. The challenges happen offline, in real
            life. The verification only counts if you actually do the work. That's the point.
          </p>

          <PrimaryBtn onClick={() => setShowDeclaration(true)} disabled={confirming} full style={{ padding: "13px", fontSize: 15 }}>
            {confirming ? "Setting up..." : "I understand. Let's begin →"}
          </PrimaryBtn>

          {showDeclaration && (
            <DeclarationModal
              type="app_start"
              onConfirm={async () => {
                setShowDeclaration(false);
                await handleConsent();
              }}
            />
          )}

          <p style={{ marginTop: 18, fontSize: 11, color: "var(--text-4)", textAlign: "center", lineHeight: 1.7 }}>
            By continuing, you agree to our{" "}
            <a href="/terms" style={{ color: "var(--text-3)" }}>Terms</a> and{" "}
            <a href="/privacy" style={{ color: "var(--text-3)" }}>Privacy Promise</a>.
          </p>
        </div>
      </main>
    </>
  );
}
