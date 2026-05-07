// API Route: /api/verification-pdf

import PDFDocument from "pdfkit";
import { getServiceClient } from "../../src/lib/supabase";

export default async function handler(req, res) {
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "slug required" });

  const sb = getServiceClient();
  const { data: v, error } = await sb
    .from("verifications")
    .select("*")
    .eq("public_slug", slug)
    .eq("is_public", true)
    .single();

  if (error || !v) return res.status(404).json({ error: "Verification not found" });

  const doc = new PDFDocument({ size: "LETTER", margin: 60, info: { Title: `${v.skill_name} — Verified` } });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="imPROVED-${v.skill_name.replace(/\s+/g, "-")}-${v.display_name}.pdf"`
  );

  doc.pipe(res);

  const GOLD = "#B8893A";
  const NAVY = "#1B2845";
  const TEXT = "#2a2a2a";
  const MUTED = "#888";

  doc.font("Helvetica-Bold").fontSize(11).fillColor(MUTED).text("imPROVED", 60, 60, { characterSpacing: 2 });
  doc.fontSize(9).fillColor(GOLD).text("VERIFIED CREDENTIAL", 60, 78, { characterSpacing: 2 });

  doc.moveTo(60, 110).lineTo(552, 110).strokeColor("#ddd").lineWidth(0.5).stroke();

  doc.font("Helvetica-Bold").fontSize(36).fillColor(NAVY).text(v.display_name, 60, 140);
  doc.font("Helvetica").fontSize(13).fillColor(MUTED).text("has proved the skill of", 60, 188);

  doc.font("Helvetica-Bold").fontSize(28).fillColor(GOLD).text(v.skill_name, 60, 212);

  const metaY = 280;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text("DATE", 60, metaY, { characterSpacing: 1.5 });
  doc.font("Helvetica").fontSize(11).fillColor(TEXT).text(
    new Date(v.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    60,
    metaY + 14
  );

  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text("VERIFICATION ID", 240, metaY, { characterSpacing: 1.5 });
  doc.font("Helvetica").fontSize(11).fillColor(TEXT).text(v.public_slug, 240, metaY + 14);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text("SKILL VERSION", 420, metaY, { characterSpacing: 1.5 });
  doc.font("Helvetica").fontSize(11).fillColor(TEXT).text(v.skill_version, 420, metaY + 14);

  doc.moveTo(60, 330).lineTo(552, 330).strokeColor("#ddd").lineWidth(0.5).stroke();

  doc.font("Helvetica-Bold").fontSize(10).fillColor(MUTED).text("RESEARCH FOUNDATION", 60, 350, { characterSpacing: 1.5 });
  doc.font("Helvetica").fontSize(11).fillColor(TEXT).text(v.citations, 60, 368, { width: 492, lineGap: 4 });

  doc.font("Helvetica-Bold").fontSize(10).fillColor(MUTED).text("WHAT WAS PROVED", 60, 430, { characterSpacing: 1.5 });
  const provedText = `${v.display_name} did not simply read about ${v.skill_name.toLowerCase()}. They reflected on its relevance to their own life, applied it in the real world, documented what happened, and submitted a four-part written Defense — an initial response to a live scenario plus three follow-up challenges. An independent evaluator reviewed the complete Defense and found it substantively engaged the prompts. Surface answers do not advance through the platform.`;
  doc.font("Helvetica").fontSize(11).fillColor(TEXT).text(provedText, 60, 448, { width: 492, lineGap: 5 });

  doc.font("Helvetica-Bold").fontSize(10).fillColor(MUTED).text("FOR EMPLOYERS AND ADMISSIONS READERS", 60, 600, { characterSpacing: 1.5 });
  const employerText = `The skill on this credential is documented, not declared. Verification can be confirmed at improvedskills.com/v/${v.public_slug}`;
  doc.font("Helvetica").fontSize(11).fillColor(TEXT).text(employerText, 60, 618, { width: 492, lineGap: 5 });

  doc.moveTo(60, 700).lineTo(552, 700).strokeColor(GOLD).lineWidth(1).stroke();
  doc.font("Helvetica-Oblique").fontSize(10).fillColor(MUTED).text(
    '"The skills your résumé claims. Proved."',
    60,
    715,
    { width: 492, align: "center" }
  );

  doc.end();
}
