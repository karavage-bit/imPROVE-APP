// API Route: /api/review-data
// Fetches a single review queue submission for Blueprint's review page.
// Protected to reviewer account only.

import { getServiceClient } from "../../src/lib/supabase";

const REVIEWER_EMAIL = process.env.REVIEWER_EMAIL || "hello@improvedskills.com";

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Auth required" });

  const sb = getServiceClient();
  const { data: userData } = await sb.auth.getUser(token);
  if (!userData?.user || userData.user.email !== REVIEWER_EMAIL) {
    return res.status(403).json({ error: "Access denied" });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "id required" });

  const { data: submission, error } = await sb
    .from("review_queue")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !submission) return res.status(404).json({ error: "Not found" });

  return res.status(200).json({ submission });
}
