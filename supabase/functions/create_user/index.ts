import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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
  // Preflight handling must be first
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
  let callerCompany: string | null = null
  if (caller?.id) {
    const { data, error } = await supabase.from('profiles').select('role, company_id').eq('id', caller.id).single()
    if (!error && data) { callerRole = data.role; callerCompany = data.company_id }
  }

  const body = await req.json()
  const { email, password, full_name, role, company_id } = body
  const roleValue = (role === 'admin' || role === 'coordinator' || role === 'conductor') ? role : 'conductor'
  const companyToUse = company_id ?? callerCompany ?? null
  console.log('Edge create_user payload:', { email, full_name, role: roleValue, company_id: companyToUse })

  const allowed = (callerRole === 'admin' && (roleValue === 'coordinator' || roleValue === 'conductor')) || (callerRole === 'coordinator' && roleValue === 'conductor')
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

  try {
    await supabase.from('profiles').insert({ id: userId, full_name, email, role: roleValue, company_id: companyToUse })
  } catch (insertError) {
    await supabase.auth.admin.deleteUser(userId)
    return new Response(JSON.stringify({ error: (insertError as any).message ?? 'Profile insert failed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type':'application/json' } })
  }

  return new Response(JSON.stringify({ user: { id: userId, email, full_name, role: roleValue } }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

serve(handler)
