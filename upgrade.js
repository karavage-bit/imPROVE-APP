// Upgrade page — pages/upgrade.js
// Where free-tier users go when they finish skills 1-2 and want the rest.
// Key UX principle: NO dark patterns. No countdown timers, no fake scarcity,
// no "this offer expires." The wall is honest because the value is real.

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Logo, PrimaryBtn, GhostBtn } from "../src/components/UI";
import { getCurrentUser, getProfile, supabase } from "../src/lib/supabase";

export default function UpgradePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) {
        router.push("/login");
        return;
      }
      const p = await getProfile(u.id);
      if (p?.tier === "paid" || p?.tier === "plus") {
        router.push("/dashboard");
        return;
      }
      setUser(u);
      setProfile(p);
      setLoading(false);
    })();
  }, [router]);

  async function handleUpgrade(tier) {
    setRedirecting(true);
    setError("");
    try {
      const isDev = process.env.NEXT_PUBLIC_DEV_MODE === "true";

      if (isDev) {
        // Dev mode: just upgrade the existing user's tier directly via Supabase
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ tier, paid_at: new Date().toISOString() })
          .eq("id", user.id);
        if (updateErr) {
          setError("Dev upgrade failed: " + updateErr.message);
          setRedirecting(false);
          return;
        }
        alert(`DEV MODE — tier upgraded to "${tier}" without payment.`);
        router.push("/dashboard");
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          parentEmail: profile.email,
          studentEmail: profile.email + "+student",
          parentAttestation: true,
          existingUserId: user.id,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Checkout failed.");
        setRedirecting(false);
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setRedirecting(false);
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
        <title>Unlock the rest — imPROVED</title>
      </Head>
      <main
        style={{
          minHeight: "100vh",
          padding: "40px 24px",
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,184,75,0.08), transparent), var(--bg-1)",
        }}
      >
        <div style={{ maxWidth: 620, margin: "0 auto" }} className="au">
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
            <Logo size={22} />
            <button
              onClick={() => router.push("/dashboard")}
              style={{ background: "none", border: "none", color: "var(--text-4)", fontSize: 13, cursor: "pointer" }}
            >
              ← back to dashboard
            </button>
          </header>

          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--gold)",
              marginBottom: 16,
            }}
          >
            Unlock the rest
          </p>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 36,
              fontWeight: 800,
              lineHeight: 1.2,
              color: "var(--text-1)",
              marginBottom: 18,
            }}
          >
            You've proved two skills.<br />
            <span style={{ color: "var(--gold)" }}>Eight to go.</span>
          </h1>

          <p style={{ fontSize: 15, lineHeight: 1.95, color: "var(--text-2)", marginBottom: 36 }}>
            One payment. No subscription. No expiration. Once you unlock, the remaining skills
            stay yours — including the spaced revisits at 30, 90, and 180 days that actually make
            the work stick.
          </p>

          {/* Standard tier */}
          <div
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--gold)",
              borderRadius: "var(--radius-lg)",
              padding: 32,
              marginBottom: 18,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -12,
                left: 24,
                background: "var(--gold)",
                color: "#0c0c0c",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                padding: "4px 10px",
                borderRadius: 4,
              }}
            >
              MOST CHOOSE THIS
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>
                Full Access
              </h2>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 800, color: "var(--gold)" }}>
                $39
              </div>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 22px", fontSize: 14, color: "var(--text-2)", lineHeight: 2 }}>
              <li>✓ All 10 skills, full curriculum</li>
              <li>✓ Structured Defense submissions, AI-evaluated</li>
              <li>✓ Permanent shareable Verification URLs</li>
              <li>✓ Downloadable PDF credentials</li>
              <li>✓ Spaced revisits at 30, 90, 180 days</li>
              <li>✓ 30-day money-back guarantee</li>
            </ul>
            <PrimaryBtn onClick={() => handleUpgrade("paid")} disabled={redirecting} full style={{ padding: "13px" }}>
              {redirecting ? "Loading..." : "Unlock Full Access — $39"}
            </PrimaryBtn>
          </div>

          {/* Plus tier */}
          <div
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border-2)",
              borderRadius: "var(--radius-lg)",
              padding: 28,
              marginBottom: 22,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>
                Verification Plus
              </h2>
              <div style={{ fontSize: 16, color: "var(--text-2)" }}>+$19</div>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.85, marginBottom: 16 }}>
              For students serious about using these credentials on college applications, internship
              applications, or in early career conversations.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", fontSize: 13, color: "var(--text-2)", lineHeight: 1.95 }}>
              <li>+ Designed PDF credentials with full citations</li>
              <li>+ "Verified by imPROVED" LinkedIn badge integration</li>
              <li>+ Permanent journal of all real-world challenge documentation</li>
              <li>+ Priority email support</li>
            </ul>
            <GhostBtn onClick={() => handleUpgrade("plus")} disabled={redirecting} style={{ width: "100%" }}>
              Add Verification Plus — $58 total
            </GhostBtn>
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "var(--red)", marginBottom: 16, textAlign: "center" }}>{error}</p>
          )}

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <p style={{ fontSize: 12, color: "var(--text-4)", lineHeight: 1.7 }}>
              Secure payment via Stripe. Reply to your receipt within 30 days for a full refund —
              no questions, no friction.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
