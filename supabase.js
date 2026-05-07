// Supabase client for browser and server-side use
// Uses environment variables that you set in Vercel:
//   NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
//   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...   (server-only, never exposed)

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Browser-side client (respects RLS, runs as the logged-in user)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Server-side admin client (bypasses RLS — use ONLY in API routes for trusted ops)
export function getServiceClient() {
  if (!SUPABASE_SERVICE) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ----- Auth helpers -----
export async function signUpWithEmail({ email, password, displayName }) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
}

export async function signInWithEmail({ email, password }) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

// ----- Profile helpers -----
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data;
}

export async function updateProfile(userId, fields) {
  return supabase.from("profiles").update(fields).eq("id", userId);
}

// ----- Progress helpers (auto-save) -----
export async function saveProgress({ userId, skillId, skillVersion, step, responseText, status = "in_progress" }) {
  return supabase.from("skill_progress").upsert(
    {
      user_id: userId,
      skill_id: skillId,
      skill_version: skillVersion,
      step,
      response_text: responseText,
      step_status: status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,skill_id,step,skill_version" }
  );
}

export async function loadProgress(userId, skillId, skillVersion = "v1.0") {
  const { data, error } = await supabase
    .from("skill_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("skill_id", skillId)
    .eq("skill_version", skillVersion)
    .order("step");
  if (error) return [];
  return data;
}

export async function loadAllProgress(userId) {
  const { data, error } = await supabase
    .from("skill_progress")
    .select("skill_id, step, step_status")
    .eq("user_id", userId);
  if (error) return [];
  return data;
}

// ----- Verification helpers -----
export async function createVerification(payload) {
  const { data, error } = await supabase
    .from("verifications")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getVerificationBySlug(slug) {
  const { data, error } = await supabase
    .from("verifications")
    .select("*")
    .eq("public_slug", slug)
    .eq("is_public", true)
    .single();
  if (error) return null;
  return data;
}

// ----- Audit -----
export async function logAuditEvent({ userId, eventType, eventData }) {
  return supabase.from("audit_log").insert({
    user_id: userId,
    event_type: eventType,
    event_data: eventData,
  });
}

// ----- Account deletion -----
export async function deleteAllUserData(userId) {
  return supabase.rpc("delete_user_data", { target_user_id: userId });
}
