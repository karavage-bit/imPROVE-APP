// pages/locked.js
// Shown when a student tries to access the platform while their account
// is locked pending parent review of a flagged submission.
// Tone: calm, non-punitive, supportive.

import Head from "next/head";
import { Logo } from "../src/components/UI";
import { CRISIS_RESOURCES } from "../src/lib/crisis";

export default function LockedPage() {
  return (
    <>
      <Head>
        <title>Access paused — imPROVED</title>
      </Head>
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          background: "var(--bg-1)",
        }}
      >
        <div style={{ maxWidth: 520, width: "100%" }}>
          <div style={{ marginBottom: 36 }}>
            <Logo size={24} />
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 800,
              color: "var(--text-1)",
              marginBottom: 16,
              lineHeight: 1.3,
            }}
          >
            Your access is paused
          </h1>

          <p style={{ fontSize: 15, lineHeight: 1.9, color: "var(--text-2)", marginBottom: 20 }}>
            Something in your recent writing was flagged by our safety system. This happens
            automatically — it doesn't mean you're in trouble or did something wrong.
          </p>

          <p style={{ fontSize: 15, lineHeight: 1.9, color: "var(--text-2)", marginBottom: 20 }}>
            We've sent an email to your parent or guardian explaining the situation. Once they
            confirm they've checked in with you, your access will be restored automatically.
            You don't need to do anything except wait for that conversation.
          </p>

          <p style={{ fontSize: 15, lineHeight: 1.9, color: "var(--text-2)", marginBottom: 32 }}>
            Your progress is saved. Nothing has been lost.
          </p>

          <div
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border-2)",
              borderRadius: "var(--radius-lg)",
              padding: "24px",
              marginBottom: 24,
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--gold)",
                marginBottom: 14,
              }}
            >
              If you need to talk to someone right now
            </p>

            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>
                {CRISIS_RESOURCES.primary.name}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 6, lineHeight: 1.6 }}>
                {CRISIS_RESOURCES.primary.description}
              </p>
              <a
                href={`tel:${CRISIS_RESOURCES.primary.phone}`}
                style={{ color: "var(--gold)", fontWeight: 600, fontSize: 14, textDecoration: "none", marginRight: 16 }}
              >
                📞 Call {CRISIS_RESOURCES.primary.phone}
              </a>
              <a
                href={CRISIS_RESOURCES.primary.web}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--gold)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
              >
                💬 Chat online
              </a>
            </div>

            {CRISIS_RESOURCES.secondary.slice(0, 2).map((r, i) => (
              <div key={i} style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-1)" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", marginBottom: 3 }}>{r.name}</p>
                <p style={{ fontSize: 13, color: "var(--text-4)" }}>{r.action}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: "var(--text-4)", lineHeight: 1.7, textAlign: "center" }}>
            Questions? Email{" "}
            <a href="mailto:hello@improvedskills.com" style={{ color: "var(--text-3)" }}>
              hello@improvedskills.com
            </a>
          </p>
        </div>
      </main>
    </>
  );
}
