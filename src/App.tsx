import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

export type UserProfile = {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'coordinator' | 'conductor' | string
  company_id: string | null
}

// No usamos endpoints internos; este ENDPOINT abreviado se mantiene fuera de la lógica
// ENDPOINT_PROFILE eliminado intencionalmente

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  // Fetch profile con timeout de 30s y retry sin logout
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
      // Obtener sesión y usuario
      const { data: sessionData } = await (supabase as any).auth.getSession()
      const session = sessionData?.session ?? null

      if (!session || !session.user) {
        // Sin sesión: no hacer logout automático
        setProfile(null)
        setLoading(false)
        finished = true
        clearTimeout(timeout)
        return
      }

      const user = session.user
      // Cargar perfil desde la tabla profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        setError('Error de conexión')
      } else if (profileData) {
        setProfile(profileData as UserProfile)
      } else {
        setProfile(null)
      }
    } catch {
      if (!finished) {
        setError('Error de conexión')
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

  if (!profile) {
    return <div>Login requerido</div>
  }

  // Render básico
  return (
    <div>
      Bienvenido {profile.full_name} — {profile.role}
      {/* Aquí podrías montar HistoryPanel y DriverSimulator, pasando profile si corresponde */}
    </div>
  )
}

export default App
