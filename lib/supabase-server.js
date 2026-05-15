import { createClient } from '@supabase/supabase-js';

export function createServerClient(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authHeader = req.headers['authorization'];
  const cookieHeader = req.headers['cookie'];
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    },
    auth: { persistSession: false },
  });
}

export async function getUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function assertInstructor(supabase, user) {
  if (!user) return false;
  const { data } = await supabase
    .from('profiles')
    .select('is_instructor')
    .eq('id', user.id)
    .single();
  return data?.is_instructor === true;
}

export function methodNotAllowed(res, allowed = ['GET']) {
  res.setHeader('Allow', allowed);
  return res.status(405).json({ error: 'Method not allowed' });
}
