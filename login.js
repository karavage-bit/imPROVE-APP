// Login page — magic link via email (no passwords)

import { useState } from "react";
import { useRouter } from "next/router";
import { Logo, PrimaryBtn } from "../src/components/UI";
import { supabase } from "../src/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: 400, width: "100%" }} className="au">
        <Logo size={28} />
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: "32px 0 10px", color: "var(--text-1)", lineHeight: 1.3, fontFamily: "var(--font-display)" }}>
          Sign in
        </h2>

        {sent ? (
          <div style={{ marginTop: 20, padding: 20, background: "var(--green-soft)", border: "1px solid rgba(74,171,106,0.3)", borderRadius: "var(--radius)", color: "var(--text-2)", fontSize: 14, lineHeight: 1.7 }}>
            ✓ Check your email. We sent a sign-in link to <strong>{email}</strong>.
          </div>
        ) : (
          <>
            <p style={{ color: "var(--text-3)", marginBottom: 24, fontSize: 14, lineHeight: 1.7 }}>
              We'll send you a one-time sign-in link. No password needed.
            </p>
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                style={{ marginBottom: 12 }}
              />
              {error && <p style={{ fontSize: 13, color: "var(--red)", marginBottom: 12 }}>{error}</p>}
              <PrimaryBtn type="submit" disabled={!email || loading} full>
                {loading ? "Sending..." : "Send sign-in link →"}
              </PrimaryBtn>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
