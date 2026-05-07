// API Route: /api/delete-account
// One-click "delete everything I've ever written" — required for trust + compliance.

import { getServiceClient } from "../../src/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Auth required" });

  const sb = getServiceClient();
  const { data: userData, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !userData?.user) return res.status(401).json({ error: "Invalid auth" });

  const userId = userData.user.id;
  const { confirmation } = req.body;
  if (confirmation !== "DELETE") {
    return res.status(400).json({
      error: 'You must type "DELETE" exactly to confirm account deletion.',
    });
  }

  try {
    // Delete user-owned data via cascade
    await sb.from("defense_evaluations").delete().eq("user_id", userId);
    await sb.from("skill_progress").delete().eq("user_id", userId);
    await sb.from("verifications").delete().eq("user_id", userId);
    await sb.from("nudges").delete().eq("user_id", userId);

    // Mark profile as deleted (soft delete preserves audit trail)
    await sb.from("profiles").update({ deleted_at: new Date().toISOString() }).eq("id", userId);

    // Log the deletion event
    await sb.from("audit_log").insert({
      user_id: userId,
      event_type: "user_data_deleted",
      event_data: { requested_by_user: true },
    });

    // Delete the auth user (this triggers the cascading deletion)
    await sb.auth.admin.deleteUser(userId);

    return res.status(200).json({ success: true, message: "All data deleted." });
  } catch (err) {
    console.error("Delete account error:", err);
    return res.status(500).json({ error: "Deletion failed", detail: err.message });
  }
}
