// Landing page — pages/index.js
// First touchpoint. Sells the thesis. Routes to checkout.

import { useState } from "react";
import Head from "next/head";
import { SKILLS } from "../src/data/skills";
import { Logo, PrimaryBtn } from "../src/components/UI";

export default function LandingPage() {
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <>
      <Head>
        <title>imPROVED — The skills your résumé claims. Proved.</title>
        <meta
          name="description"
          content="Ten foundational skills built through research-backed curriculum, real-world challenge, and live AI-driven friction. Documented credentials, not certificates."
        />
        <meta property="og:title" content="imPROVED — Demonstrated, not claimed" />
        <meta
          property="og:description"
          content="The skills colleges look for, employers hire for, and parents hope their kids develop — proved with real evidence."
        />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap" />
      </Head>

      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "60px 24px",
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,184,75,0.08), transparent), var(--bg-1)",
        }}
      >
        {/* Hero */}
        <section style={{ maxWidth: 640, textAlign: "center", marginBottom: 80 }} className="au">
          <Logo size={56} />
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-3)",
              marginTop: 32,
              marginBottom: 22,
            }}
          >
            10 Skills · Demonstrated · Not Claimed
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 5vw, 44px)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-1px",
              color: "var(--text-1)",
              marginBottom: 22,
            }}
          >
            The skills your résumé claims.<br />
            <span style={{ color: "var(--gold)" }}>Proved.</span>
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.95, color: "var(--text-2)", marginBottom: 36 }}>
            The skills that used to develop on their own — through boredom, friction, and real-world consequence — no longer do. imPROVED builds them deliberately, using peer-reviewed research and real challenge. Every skill is documented. Every completion is proved.
          </p>
          <PrimaryBtn onClick={() => setShowCheckout(true)} style={{ fontSize: 15, padding: "14px 44px" }}>
            Start with two skills free →
          </PrimaryBtn>
          <p style={{ marginTop: 16, fontSize: 12, color: "var(--text-4)" }}>
            $39 for full access · 30-day money-back guarantee · Built on peer-reviewed research
          </p>
        </section>

        {/* Skills grid */}
        <section style={{ maxWidth: 880, width: "100%", marginBottom: 80 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-3)",
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            The Ten Skills
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {SKILLS.map((sk, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border-1)",
                  borderLeft: `2px solid ${sk.color}`,
                  borderRadius: "var(--radius)",
                  padding: "16px 18px",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text-1)",
                    marginBottom: 6,
                  }}
                >
                  {sk.name}
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>{sk.tagline}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section style={{ maxWidth: 640, marginBottom: 80 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 800,
              color: "var(--text-1)",
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            How each skill works
          </h2>
          {[
            { label: "1. Hook", desc: "A real story or research finding that connects the skill to the student's life — not a lecture." },
            { label: "2. Science", desc: "The peer-reviewed research behind why the skill matters. Cited, not summarized." },
            { label: "3. Real-World Challenge", desc: "An offline mission. Apply the skill in real life and document what happened." },
            { label: "4. The Defense", desc: "A four-part written defense of your thinking against challenge questions. An evaluator judges whether you engaged the prompts substantively or evaded them." },
            { label: "5. Verification", desc: "A documented, shareable credential — not a certificate. Proves what they actually did." },
          ].map((step, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 18,
                paddingBottom: 20,
                marginBottom: 20,
                borderBottom: i < 4 ? "1px solid var(--border-1)" : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--gold)",
                  minWidth: 100,
                }}
              >
                {step.label}
              </div>
              <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.85 }}>{step.desc}</p>
            </div>
          ))}
        </section>

        {/* Pricing */}
        <section style={{ maxWidth: 640, width: "100%", marginBottom: 80 }}>
          <div
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--gold)",
              borderRadius: "var(--radius-lg)",
              padding: 32,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--gold)",
                marginBottom: 14,
              }}
            >
              Full Access
            </p>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 800, color: "var(--text-1)", marginBottom: 8 }}>
              $39
            </div>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 24 }}>One-time. All ten skills. Permanent verifications.</p>
            <ul style={{ listStyle: "none", textAlign: "left", marginBottom: 28, fontSize: 14, color: "var(--text-2)", lineHeight: 2 }}>
              <li>✓ All 10 skills with full curriculum</li>
              <li>✓ Structured Defense submissions, AI-evaluated</li>
              <li>✓ Permanent shareable verification URLs</li>
              <li>✓ Downloadable PDF credentials</li>
              <li>✓ 30-day, 90-day, and 180-day spaced revisits</li>
              <li>✓ 30-day money-back guarantee</li>
            </ul>
            <PrimaryBtn onClick={() => setShowCheckout(true)} full style={{ fontSize: 15, padding: "14px" }}>
              Get full access →
            </PrimaryBtn>
            <p style={{ marginTop: 14, fontSize: 11, color: "var(--text-4)" }}>
              Skills 1 and 2 are completely free, no card required. Try them first.
            </p>
          </div>
        </section>

        {/* Privacy promise */}
        <section style={{ maxWidth: 640, textAlign: "center", marginBottom: 60 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 12,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-3)",
              marginBottom: 18,
            }}
          >
            Our privacy promise
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.95, color: "var(--text-2)" }}>
            We do not sell your reflections. We do not train AI on what you write. We do not show
            your responses to anyone you did not explicitly authorize. You can delete everything
            you've ever written, instantly, with one click. This is non-negotiable.
          </p>
        </section>

        <footer style={{ fontSize: 11, color: "var(--text-4)", textAlign: "center" }}>
          imPROVED · Built on peer-reviewed research · <a href="/privacy" style={{ color: "var(--text-3)" }}>Privacy</a> · <a href="/terms" style={{ color: "var(--text-3)" }}>Terms</a>
        </footer>
      </main>

      {showCheckout && <CheckoutModal onClose={() => setShowCheckout(false)} />}
    </>
  );
}

function CheckoutModal({ onClose }) {
  const [parentEmail, setParentEmail] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [attestation, setAttestation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    if (parentEmail === studentEmail) {
      setError("Parent and student emails must be different.");
      return;
    }
    setLoading(true);
    try {
      // Dev mode: bypass Stripe entirely
      const isDev = process.env.NEXT_PUBLIC_DEV_MODE === "true";
      const endpoint = isDev ? "/api/dev-checkout" : "/api/checkout";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentEmail,
          studentEmail,
          parentAttestation: attestation,
          tier: "paid",
        }),
      });
      const data = await res.json();

      if (isDev && data.success) {
        // Dev mode: show the magic link directly so you can click it
        if (data.magicLink) {
          if (confirm(`DEV MODE — no payment processed.\n\nMagic link generated for ${studentEmail}.\n\nClick OK to open it now.`)) {
            window.location.href = data.magicLink;
          } else {
            setLoading(false);
          }
        } else {
          setError("Dev checkout succeeded but no magic link returned.");
          setLoading(false);
        }
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Checkout failed.");
        setLoading(false);
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "var(--bg-2)",
          border: "1px solid var(--border-3)",
          borderRadius: "var(--radius-lg)",
          padding: 32,
        }}
      >
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 8, color: "var(--text-1)" }}>
          Get Started
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-3)", marginBottom: 24, lineHeight: 1.7 }}>
          imPROVED is purchased by a parent or guardian on behalf of a student. The student's
          reflections stay private to them.
        </p>

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 6, letterSpacing: "0.05em" }}>
          PARENT/GUARDIAN EMAIL
        </label>
        <input
          type="email"
          value={parentEmail}
          onChange={(e) => setParentEmail(e.target.value)}
          placeholder="parent@example.com"
          style={{ marginBottom: 14 }}
          required
        />

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 6, letterSpacing: "0.05em" }}>
          STUDENT EMAIL (must be different)
        </label>
        <input
          type="email"
          value={studentEmail}
          onChange={(e) => setStudentEmail(e.target.value)}
          placeholder="student@example.com"
          style={{ marginBottom: 18 }}
          required
        />

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 24 }}>
          <input
            type="checkbox"
            checked={attestation}
            onChange={(e) => setAttestation(e.target.checked)}
            style={{ marginTop: 4, width: "auto" }}
          />
          <span>
            I confirm I am 18 years or older and a parent or guardian of the student. I understand
            their reflections are private and will not be shared with me without their consent.
          </span>
        </label>

        {error && (
          <p style={{ fontSize: 13, color: "var(--red)", marginBottom: 16 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: "11px 20px",
              background: "transparent",
              border: "1px solid var(--border-3)",
              borderRadius: "var(--radius)",
              color: "var(--text-3)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <PrimaryBtn
            onClick={handleSubmit}
            disabled={!parentEmail || !studentEmail || !attestation || loading}
            style={{ flex: 1 }}
          >
            {loading ? "Loading..." : "Continue to checkout — $39 →"}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
