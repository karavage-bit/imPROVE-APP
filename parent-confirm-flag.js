// API Route: /api/parent-confirm-flag
// Parent clicks the link from their email. This page:
// 1. Validates the token
// 2. Records parent confirmation
// 3. Unlocks the student's account
// 4. Shows a confirmation page

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(renderPage("Invalid link", "This confirmation link is missing a token. Please use the link from your email exactly as sent."));
  }

  const { getServiceClient } = await import("../../src/lib/supabase");
  const sb = getServiceClient();

  // Find the active lock with this token
  const { data: lock, error } = await sb
    .from("flag_locks")
    .select("*")
    .eq("confirm_token", token)
    .eq("is_active", true)
    .single();

  if (error || !lock) {
    return res.status(404).send(
      renderPage(
        "Link not found or already used",
        "This confirmation link has already been used or has expired. If your student's access is still paused, please email hello@improvedskills.com."
      )
    );
  }

  if (lock.parent_confirmed_at) {
    return res.status(200).send(
      renderPage(
        "Already confirmed",
        "You've already confirmed this. Your student's access has been restored."
      )
    );
  }

  // Confirm and unlock
  const now = new Date().toISOString();
  await sb
    .from("flag_locks")
    .update({
      parent_confirmed_at: now,
      unlocked_at: now,
      is_active: false,
    })
    .eq("id", lock.id);

  // Audit
  await sb.from("audit_log").insert({
    user_id: lock.user_id,
    event_type: "flag_parent_confirmed",
    event_data: { lock_id: lock.id, flag_type: lock.flag_type },
  });

  return res.status(200).send(
    renderPage(
      "Access restored",
      `Thank you for confirming. Your student's access to imPROVED has been restored. Please continue checking in with them — that conversation matters more than anything our platform can offer.`
    )
  );
}

function renderPage(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — imPROVED</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0c0c0c;
      color: #e4ddd0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
    }
    .card {
      max-width: 480px;
      width: 100%;
      background: #161616;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
    }
    .logo { font-size: 22px; font-weight: 800; margin-bottom: 32px; }
    .logo span:first-child { color: #7a7268; }
    .logo span:last-child { color: #E8B84B; }
    h1 { font-size: 24px; color: #e4ddd0; margin-bottom: 16px; }
    p { font-size: 15px; line-height: 1.85; color: #b8b0a4; margin-bottom: 20px; }
    .home {
      display: inline-block;
      margin-top: 8px;
      padding: 11px 28px;
      background: #E8B84B;
      color: #0c0c0c;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo"><span>im</span><span>PROVED</span></div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/" class="home">Return to imPROVED</a>
  </div>
</body>
</html>`;
}
