// API Route: /api/share-verification
// Sends a verification to ONE nominated person — the highest-ROI viral mechanism.

import { getServiceClient } from "../../src/lib/supabase";
import { sendEmail, buildShareWithOnePersonEmail } from "../../src/lib/email";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Auth required" });

  const sb = getServiceClient();
  const { data: userData, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !userData?.user) return res.status(401).json({ error: "Invalid auth" });

  const { slug, recipientEmail } = req.body;
  if (!slug || !recipientEmail) return res.status(400).json({ error: "Missing fields" });

  // Verify the verification belongs to this user
  const { data: v } = await sb
    .from("verifications")
    .select("*")
    .eq("public_slug", slug)
    .eq("user_id", userData.user.id)
    .single();

  if (!v) return res.status(404).json({ error: "Verification not found" });

  // Send the email
  const emailContent = buildShareWithOnePersonEmail({
    studentName: v.display_name,
    skillName: v.skill_name,
    slug: v.public_slug,
  });

  const result = await sendEmail({
    to: recipientEmail,
    ...emailContent,
  });

  if (result.error) return res.status(500).json({ error: "Email failed" });

  // Update verification record
  await sb
    .from("verifications")
    .update({
      shared_with_email: recipientEmail,
      shared_at: new Date().toISOString(),
    })
    .eq("public_slug", slug);

  await sb.from("audit_log").insert({
    user_id: userData.user.id,
    event_type: "verification_shared",
    event_data: { slug, recipient: recipientEmail },
  });

  return res.status(200).json({ success: true });
}
