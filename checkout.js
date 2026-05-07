// API Route: /api/checkout
// Creates a Stripe Checkout session for the $39 paid tier.
// Requires the parent attestation flag in the request body.

import Stripe from "stripe";
import { getServiceClient } from "../../src/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const PRICE_PAID_TIER = process.env.STRIPE_PRICE_PAID; // e.g. "price_xxx"
const PRICE_PLUS_TIER = process.env.STRIPE_PRICE_PLUS; // e.g. "price_yyy"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tier = "paid", studentEmail, parentEmail, parentAttestation } = req.body;

    if (!parentAttestation) {
      return res.status(400).json({
        error: "Parent attestation required. By purchasing, you confirm you are 18+ and a parent or guardian.",
      });
    }

    if (!parentEmail || !studentEmail) {
      return res.status(400).json({ error: "Both parent and student emails required" });
    }

    if (parentEmail === studentEmail) {
      return res.status(400).json({
        error: "Parent and student emails must be different",
      });
    }

    const priceId = tier === "plus" ? PRICE_PLUS_TIER : PRICE_PAID_TIER;
    if (!priceId) {
      return res.status(500).json({ error: "Stripe price ID not configured" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: parentEmail,
      success_url: `${process.env.APP_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/?canceled=true`,
      metadata: {
        student_email: studentEmail,
        parent_email: parentEmail,
        tier,
        parent_attestation: "true",
      },
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: "Checkout creation failed", detail: err.message });
  }
}
