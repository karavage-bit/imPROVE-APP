// Privacy page — pages/privacy.js
// Written in plain English. Reflects what the architecture ACTUALLY does.

import Head from "next/head";
import { Logo } from "../src/components/UI";

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy — imPROVED</title>
      </Head>
      <main style={{ minHeight: "100vh", maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: 36 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <Logo size={22} />
          </a>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 36,
            fontWeight: 800,
            color: "var(--text-1)",
            marginBottom: 12,
          }}
        >
          Privacy Promise
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-4)", marginBottom: 36 }}>
          Last updated: May 2026
        </p>

        <Section heading="What we promise, in plain English">
          <P>
            <Strong>We do not sell your reflections.</Strong> Not to advertisers, not to data
            brokers, not to anyone. The things you write here — your hooks, your science responses,
            your challenge documentation, your Defense submissions — are yours.
          </P>
          <P>
            <Strong>We do not train AI on what you write.</Strong> Your reflections are not used
            to train any model, ours or anyone else's. Anthropic, the AI provider that powers our
            Defense submissions, processes your responses once to generate an evaluation but does not
            retain them for training. You can verify this directly in Anthropic's policy.
          </P>
          <P>
            <Strong>We do not show your responses to anyone you didn't authorize.</Strong> A
            parent or guardian who purchased the platform on your behalf cannot see your
            reflections. The only thing they may receive is the public Verification page — and
            only if you choose to share it.
          </P>
          <P>
            <Strong>You can delete everything, instantly.</Strong> One click in Settings deletes
            every word you've ever written here. No customer support call. No 30-day waiting
            period. Gone.
          </P>
        </Section>

        <Section heading="What we collect">
          <Bullet><Strong>Account info:</Strong> your email and display name. Required to log in.</Bullet>
          <Bullet><Strong>Your reflections:</Strong> what you write in the hook, science, and challenge steps. Stored encrypted at rest in our database, accessible only to you.</Bullet>
          <Bullet><Strong>Defense submissions:</Strong> your written responses to scenario and follow-up challenge questions. Evaluated once by AI, then accessible only to you.</Bullet>
          <Bullet><Strong>Completion records:</Strong> which skills you've finished, with timestamps. Used to generate Verifications.</Bullet>
          <Bullet><Strong>Payment info:</Strong> handled by Stripe. We never see your card number.</Bullet>
          <Bullet><Strong>Basic usage analytics:</Strong> via Plausible, a privacy-friendly tool. No cookies, no personal identifiers, no cross-site tracking.</Bullet>
        </Section>

        <Section heading="What we don't collect">
          <Bullet>No location tracking.</Bullet>
          <Bullet>No device fingerprinting.</Bullet>
          <Bullet>No third-party advertising cookies.</Bullet>
          <Bullet>No social media tracking pixels.</Bullet>
          <Bullet>No keystroke logging or session replay.</Bullet>
        </Section>

        <Section heading="If we detect crisis content">
          <P>
            We screen text submissions for serious crisis indicators (active suicidal ideation,
            descriptions of ongoing abuse). If detected, we surface real-world resources directly
            to you. <Strong>We do not contact your parents, guardians, or anyone else.</Strong>{" "}
            That decision is yours. The screening happens locally in your browser; the matched
            text is recorded only as a flagged event so we can improve our safety detection over
            time, never associated with the actual content you wrote.
          </P>
          <P>
            One legal exception: if a court legally compels us to share specific data via valid
            subpoena, we will comply with the minimum required by law and notify you unless legally
            prohibited.
          </P>
        </Section>

        <Section heading="Who we share data with">
          <P>
            <Strong>Service providers we depend on:</Strong> Supabase (database hosting), Vercel
            (web hosting), Anthropic (AI for Defense evaluation), Stripe (payments), Resend
            (transactional email). Each is contractually bound to protect your data and use it
            only to provide their service. We do not share data with anyone else.
          </P>
        </Section>

        <Section heading="If you're under 18">
          <P>
            imPROVED is purchased by parents or guardians on behalf of students. The student is
            the user. We do not knowingly collect data from anyone under 13 (COPPA), and we do
            not market to minors. If you are a parent who believes your child accessed the
            platform without your authorization, contact us at privacy@improvedskills.com and
            we'll delete the account immediately.
          </P>
        </Section>

        <Section heading="How to reach us">
          <P>Privacy questions or data requests: privacy@improvedskills.com</P>
          <P>General questions: hello@improvedskills.com</P>
        </Section>
      </main>
    </>
  );
}

function Section({ heading, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--gold)",
          marginBottom: 14,
        }}
      >
        {heading}
      </h2>
      {children}
    </section>
  );
}

function P({ children }) {
  return (
    <p style={{ fontSize: 15, lineHeight: 1.95, color: "var(--text-2)", marginBottom: 16 }}>
      {children}
    </p>
  );
}

function Bullet({ children }) {
  return (
    <p
      style={{
        fontSize: 15,
        lineHeight: 1.95,
        color: "var(--text-2)",
        marginBottom: 12,
        paddingLeft: 18,
        position: "relative",
      }}
    >
      <span style={{ position: "absolute", left: 0, top: 8, width: 5, height: 5, borderRadius: "50%", background: "var(--gold)" }} />
      {children}
    </p>
  );
}

function Strong({ children }) {
  return <strong style={{ color: "var(--text-1)", fontWeight: 600 }}>{children}</strong>;
}
