// Public Verification Page: /v/[slug]

import Head from "next/head";
import { getServiceClient } from "../../src/lib/supabase";

export async function getServerSideProps({ params }) {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("verifications")
    .select("*")
    .eq("public_slug", params.slug)
    .eq("is_public", true)
    .single();

  if (error || !data) {
    return { notFound: true };
  }

  return { props: { verification: data } };
}

export default function VerificationPage({ verification }) {
  const v = verification;
  const date = new Date(v.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const judgmentLabel = v.defense_judgment === "engaged" ? "Substantively Engaged" : "Engaged";
  const ogTitle = `${v.display_name} proved ${v.skill_name} on imPROVED`;
  const ogDesc = `Verified ${v.skill_name} skill — based on academic research from ${v.citations.split(" · ").slice(0, 2).join(", ")}`;

  return (
    <>
      <Head>
        <title>{ogTitle}</title>
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDesc} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <main style={S.page}>
        <div style={S.card}>
          <header style={S.header}>
            <div style={S.logo}>
              <span style={S.logoIm}>im</span>
              <span style={S.logoProved}>PROVED</span>
            </div>
            <div style={S.verifiedBadge}>✓ VERIFIED</div>
          </header>

          <div style={S.divider} />

          <h1 style={S.studentName}>{v.display_name}</h1>
          <p style={S.subtitle}>has proved the skill of</p>
          <h2 style={S.skillName}>{v.skill_name}</h2>

          <div style={S.metaRow}>
            <div style={S.metaItem}>
              <div style={S.metaLabel}>Date</div>
              <div style={S.metaValue}>{date}</div>
            </div>
            <div style={S.metaItem}>
              <div style={S.metaLabel}>Skill version</div>
              <div style={S.metaValue}>{v.skill_version}</div>
            </div>
            <div style={S.metaItem}>
              <div style={S.metaLabel}>Verification ID</div>
              <div style={S.metaValue}>{v.public_slug}</div>
            </div>
          </div>

          <section style={S.section}>
            <h3 style={S.sectionTitle}>Research Foundation</h3>
            <p style={S.sectionBody}>{v.citations}</p>
          </section>

          <section style={S.section}>
            <h3 style={S.sectionTitle}>What was proved</h3>
            <p style={S.sectionBody}>
              {v.display_name} did not simply read about {v.skill_name.toLowerCase()}. They reflected on
              its relevance to their own life, applied it in the real world, documented what
              happened, and then submitted a four-part written Defense — an initial response to a
              live scenario plus three follow-up challenges designed to push past easy answers. An
              independent evaluator then reviewed the complete Defense and judged it as <em>{judgmentLabel.toLowerCase()}</em> with the prompts.
            </p>
          </section>

          <section style={S.section}>
            <h3 style={S.sectionTitle}>What this means for an employer or admissions reader</h3>
            <p style={S.sectionBody}>
              The skill on this credential is documented, not declared. The platform enforces
              specific friction at every step — minimum response lengths, sequential progression,
              real-world application requirements, and a structured Defense submission with
              independent evaluation. Surface answers do not advance the user through the
              platform. A completed Verification represents real cognitive and behavioral work,
              grounded in peer-reviewed academic research.
            </p>
          </section>

          <footer style={S.footer}>
            <p style={S.footerText}>imPROVED — The skills your résumé claims. Proved.</p>
            <p style={S.footerSmall}>
              To verify this credential is authentic, view it directly at improvedskills.com/v/{v.public_slug}
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0c0c0c 0%, #131313 100%)",
    padding: "40px 20px",
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    color: "#e4ddd0",
    display: "flex",
    justifyContent: "center",
  },
  card: {
    maxWidth: 720,
    width: "100%",
    background: "#161616",
    border: "1px solid #2a2a2a",
    borderRadius: 16,
    padding: "44px 48px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 22,
    letterSpacing: "-0.5px",
  },
  logoIm: { color: "#7a7268" },
  logoProved: { color: "#E8B84B" },
  verifiedBadge: {
    background: "#0f1f14",
    color: "#4aab6a",
    border: "1px solid #4aab6a40",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
  },
  divider: {
    height: 1,
    background: "linear-gradient(90deg, transparent, #333, transparent)",
    margin: "20px 0 32px",
  },
  studentName: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: "-1px",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#7a7268",
    marginBottom: 8,
  },
  skillName: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 28,
    fontWeight: 700,
    color: "#E8B84B",
    marginBottom: 32,
    letterSpacing: "-0.5px",
  },
  metaRow: {
    display: "flex",
    gap: 32,
    marginBottom: 36,
    paddingTop: 20,
    paddingBottom: 24,
    borderTop: "1px solid #1e1e1e",
    borderBottom: "1px solid #1e1e1e",
    flexWrap: "wrap",
  },
  metaItem: { flex: 1, minWidth: 120 },
  metaLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#3a3530",
    marginBottom: 6,
  },
  metaValue: { fontSize: 14, color: "#e4ddd0", fontWeight: 500 },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#7a7268",
    marginBottom: 12,
  },
  sectionBody: { fontSize: 15, lineHeight: 1.85, color: "#b8b0a4" },
  footer: {
    marginTop: 40,
    paddingTop: 24,
    borderTop: "1px solid #1e1e1e",
    textAlign: "center",
  },
  footerText: { fontSize: 13, color: "#7a7268", marginBottom: 6, fontStyle: "italic" },
  footerSmall: { fontSize: 11, color: "#3a3530" },
};
