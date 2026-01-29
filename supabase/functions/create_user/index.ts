import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

async function getCallerFromToken(token: string | null) {
  if (!token) return null
  try {
    const { data, error } = await supabase.auth.getUser(token)
    return (error || !data?.user) ? null : data.user
  } catch {
    return null
  }
}

async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? null
  const caller = await getCallerFromToken(token)
  let callerRole: string | null = null
  if (caller?.id) {
    const { data, error } = await supabase.from('profiles').select('role').eq('id', caller.id).single()
    if (!error && data?.role) callerRole = data.role
  }

  const body = await req.json()
  const { email, password, full_name, role, company_id } = body

  const allowed =
    (callerRole === 'admin' && (role === 'coordinator' || role === 'conductor')) ||
    (callerRole === 'coordinator' && role === 'conductor')
  if (!callerRole || !allowed) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const userId = authData?.user?.id
  if (!userId) {
    return new Response(JSON.stringify({ error: 'User creation failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { error: insertError } = await supabase.from('profiles').insert({
    id: userId,
    full_name,
    email,
    role,
    company_id: company_id ?? caller?.company_id ?? null
  })
  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type':'application/json' } })
  }

  return new Response(JSON.stringify({ user: { id: userId, email, full_name, role } }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

serve(handler)
