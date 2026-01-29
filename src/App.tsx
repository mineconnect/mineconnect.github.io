import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

export type UserProfile = {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'coordinator' | 'conductor' | string
  company_id: string | null
}

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [showAuth, setShowAuth] = useState(false)

  async function fetchProfile() {
    setLoading(true)
    setError(null)

    const timeoutMs = 30000
    let finished = false
    const timeout = window.setTimeout(() => {
      if (!finished) {
        setError('Error de conexión')
        setLoading(false)
      }
    }, timeoutMs)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session ?? null

      if (!session || !session.user) {
        setProfile(null)
        setShowAuth(true)
        setLoading(false)
        finished = true
        clearTimeout(timeout)
        return
      }

      const userId = session.user.id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        setError('Error de conexión')
        setProfile(null)
        setShowAuth(true)
      } else if (profileData) {
        setProfile(profileData as UserProfile)
        setShowAuth(false)
      } else {
        setProfile(null)
        setShowAuth(true)
      }
    } catch {
      if (!finished) {
        setError('Error de conexión')
        setShowAuth(true)
      }
    } finally {
      finished = true
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey])

  const retry = () => setRetryKey((k) => k + 1)

  if (loading) return <div>Loading profile…</div>

  if (error) {
    return (
      <div>
        <div>Error: {error}</div>
        <button onClick={retry}>Reintentar</button>
      </div>
    )
  }

  if (showAuth || !profile) {
    // Integración de Auth
    return (
      <Auth onLoginSuccess={fetchProfile}/>
    )
  }

  return (
    <div>
      Bienvenido {profile.full_name} — {profile.role}
      {/* Aquí se podrían montar HistoryPanel y DriverSimulator pasando profile si procede */}
    </div>
  )
}

// Componente Auth simple (puedes adaptar a tu Auth existente)
function Auth({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const login = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else onLoginSuccess()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Iniciar sesión</h2>
      <form onSubmit={login}>
        <div>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit" disabled={loading}>Login</button>
      </form>
    </div>
  )
}

export default App
