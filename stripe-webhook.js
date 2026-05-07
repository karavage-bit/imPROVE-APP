// API Route: /api/stripe-webhook
// Handles Stripe events. After successful payment:
//   1. Create or update the parent's profile with paid tier
//   2. Generate a student access magic link
//   3. Email both parent and student

import Stripe from "stripe";
import { getServiceClient } from "../../src/lib/supabase";
import { sendEmail } from "../../src/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Disable body parser so we can verify the raw signature
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const sb = getServiceClient();

    const { student_email, parent_email, tier } = session.metadata;

    try {
      // Generate magic link for the student
      const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
        type: "magiclink",
        email: student_email,
        options: { redirectTo: `${process.env.APP_URL}/welcome` },
      });

      if (linkErr) throw linkErr;

      const magicLink = linkData?.properties?.action_link;
      const userId = linkData?.user?.id;

      // Update profile with paid tier
      if (userId) {
        await sb.from("profiles").upsert(
          {
            id: userId,
            email: student_email,
            display_name: student_email.split("@")[0],
            tier,
            stripe_customer_id: session.customer,
            stripe_payment_intent_id: session.payment_intent,
            paid_at: new Date().toISOString(),
            is_parent_purchaser: false,
            parent_attestation_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }

      // Email the student with the magic link
      await sendEmail({
        to: student_email,
        subject: "Your access to imPROVED is ready",
        html: `
          <p>Hi,</p>
          <p>A parent or guardian just purchased imPROVED on your behalf.</p>
          <p>Click below to start. The link is good for 24 hours.</p>
          <p><a href="${magicLink}" style="display:inline-block;padding:12px 24px;background:#E8B84B;color:#0c0c0c;border-radius:8px;text-decoration:none;font-weight:600">Start imPROVED →</a></p>
          <p style="color:#666;font-size:13px;margin-top:20px">Your reflections are private. Your parent will not see what you write unless you choose to share it. The skills you complete generate a Verification Summary you can share on college applications, job applications, or with anyone you choose.</p>
        `,
      });

      // Confirmation email to the parent
      await sendEmail({
        to: parent_email,
        subject: "Thanks for your imPROVED purchase",
        html: `
          <p>Thanks for purchasing imPROVED.</p>
          <p>An access link has been sent to <strong>${student_email}</strong>.</p>
          <p>Your purchase covers all 10 skills. The student's reflections are private to them — you'll only see what they choose to share with you (specifically, their Verification Summary at the end of each skill).</p>
          <p>If you have questions, reply to this email.</p>
        `,
      });

      // Audit
      await sb.from("audit_log").insert({
        user_id: userId,
        event_type: "payment_completed",
        event_data: {
          tier,
          stripe_session_id: session.id,
          parent_email,
          student_email,
        },
      });
    } catch (err) {
      console.error("Error processing checkout completion:", err);
      // Don't return 500 — Stripe will retry indefinitely
      // Log to Sentry/etc and acknowledge receipt
    }
  }

  return res.status(200).json({ received: true });
}
