import { useEffect, useState } from 'react'

export type UserProfile = {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'coordinator' | 'conductor' | string
  company_id: string | null
}

const ENDPOINT_PROFILE = '/api/profile' // ajusta si tienes otro endpoint

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // no fetch retry key; solo usa reintento explícito
  const [retryKey, setRetryKey] = useState(0)

  // fetch profile con timeout de 30s usando Promise.race
  async function fetchProfile() {
    setLoading(true)
    setError(null)

    const timeoutMs = 30000
    let finished = false
    const timeoutId = window.setTimeout(() => {
      if (!finished) {
        setError('Error de conexión')
        setLoading(false)
      }
    }, timeoutMs)

    try {
      const res = await fetch(ENDPOINT_PROFILE, { method: 'GET', credentials: 'include' })
      if (!res.ok) {
        if (!finished) {
          setError('Error de conexión')
          setLoading(false)
        }
      } else {
        const data = await res.json()
        if (data && data.id) {
          setProfile(data as UserProfile)
        } else {
          if (!finished) {
            setError('Error de conexión')
            setLoading(false)
          }
        }
      }
    } catch (e) {
      if (!finished) {
        setError('Error de conexión')
        setLoading(false)
      }
    } finally {
      finished = true
      clearTimeout(timeoutId)
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
        <div>{error}</div>
        <button onClick={retry}>Reintentar</button>
      </div>
    )
  }

  // Interfaz mínima de la app
  return (
    <div>
      Bienvenido, {profile?.full_name ?? 'Usuario'} — {profile?.role}
      {/* Aquí puedes integrar HistoryPanel y DriverSimulator pasándole profile si corresponde */}
    </div>
  )
}

export default App
