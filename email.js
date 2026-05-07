// Email helper using Resend (https://resend.com)
// Free tier: 3,000 emails/month. Sufficient for early launch.
// Set RESEND_API_KEY in Vercel env vars.

const RESEND_API = "https://api.resend.com/emails";
const FROM_ADDRESS = process.env.EMAIL_FROM || "imPROVED <hello@improvedskills.com>";

export async function sendEmail({ to, subject, html, replyTo }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing; email not sent:", { to, subject });
    return { skipped: true };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: replyTo,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Resend error: ${res.status} ${errBody}`);
    }

    return res.json();
  } catch (err) {
    console.error("sendEmail failed:", err);
    return { error: err.message };
  }
}

// Templates for the nudge system
export function buildChallengeFollowupEmail({ displayName, skillName, challengeTitle }) {
  return {
    subject: `Did you do the ${skillName} challenge?`,
    html: `
      <p>Hi ${displayName},</p>
      <p>Two days ago, you committed to <strong>${challengeTitle}</strong> as part of your ${skillName} skill.</p>
      <p>This is the moment that decides whether the skill is real for you or not. Did you do it?</p>
      <p>If yes — great. Log it in the app to update your Verification Summary.</p>
      <p>If not — that's information too. What stopped you?</p>
      <p style="margin-top:24px"><a href="${process.env.APP_URL}/dashboard" style="display:inline-block;padding:10px 22px;background:#E8B84B;color:#0c0c0c;border-radius:8px;text-decoration:none;font-weight:600">Open imPROVED</a></p>
      <p style="color:#888;font-size:12px;margin-top:32px">You'll get one more email about this skill in 30 days. To stop these, <a href="${process.env.APP_URL}/settings">update your settings</a>.</p>
    `,
  };
}

export function buildSpacedRevisitEmail({ displayName, skillName, daysAgo }) {
  return {
    subject: `${displayName}, how's your ${skillName} holding up?`,
    html: `
      <p>Hi ${displayName},</p>
      <p>${daysAgo} days ago you completed the ${skillName} skill on imPROVED.</p>
      <p>One question, no pressure: <strong>where in your real life is this skill being tested right now?</strong></p>
      <p>This isn't just nostalgia — research shows revisiting a skill at spaced intervals is the difference between knowing about something and actually living it.</p>
      <p style="margin-top:24px"><a href="${process.env.APP_URL}/dashboard" style="display:inline-block;padding:10px 22px;background:#E8B84B;color:#0c0c0c;border-radius:8px;text-decoration:none;font-weight:600">Continue your work</a></p>
    `,
  };
}

export function buildShareWithOnePersonEmail({ studentName, skillName, slug }) {
  return {
    subject: `${studentName} just proved a skill on imPROVED`,
    html: `
      <p>Hi,</p>
      <p>${studentName} just completed the <strong>${skillName}</strong> skill on imPROVED — and they wanted to share it with you.</p>
      <p>imPROVED is different from most platforms: students don't just learn about skills, they document real-world application and engage in live AI-driven challenge before earning a verification.</p>
      <p style="margin-top:24px"><a href="${process.env.APP_URL}/v/${slug}" style="display:inline-block;padding:10px 22px;background:#E8B84B;color:#0c0c0c;border-radius:8px;text-decoration:none;font-weight:600">See ${studentName}'s verification</a></p>
      <p style="color:#888;font-size:12px;margin-top:32px">Want to learn more about imPROVED? <a href="${process.env.APP_URL}">improvedskills.com</a></p>
    `,
  };
}
