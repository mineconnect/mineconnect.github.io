import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import HistoryPanel from './components/HistoryPanel'
import UserManagement from './components/UserManagement'
import DriverSimulator from './components/DriverSimulator'

import { UserProfile } from './types'

// ENDPOINT_PROFILE eliminado intencionalmente

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [activeTab, setActiveTab] = useState<'historial'|'conductores'|'simulador'>('historial')
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
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (profileError) {
        setError('Error de conexión')
        setProfile(null)
        setShowAuth(true)
      } else if (profileData) {
        // Normalizar company_id a string
        setProfile({
          ...profileData,
          company_id: profileData.company_id ?? ''
        } as UserProfile)
        setShowAuth(false)
      } else {
        setProfile(null)
        setShowAuth(true)
      }
    } catch {
      setError('Error de conexión')
      setShowAuth(true)
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

  // Auth simple inline
  function Auth({ onLoginSuccess }: { onLoginSuccess: () => void }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [err, setErr] = useState<string | null>(null)
    const [loadingAuth, setLoadingAuth] = useState(false)

    const login = async (e: any) => {
      e.preventDefault()
      setLoadingAuth(true); setErr(null)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoadingAuth(false)
      if (error) setErr(error.message)
      else onLoginSuccess()
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
          {err && <div style={{ color: 'red' }}>{err}</div>}
          <button type="submit" disabled={loadingAuth}>{loadingAuth ? 'Cargando' : 'Login'}</button>
        </form>
      </div>
    )
  }

  // Render condicional
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
    return (
      <Auth onLoginSuccess={fetchProfile} />
    )
  }

  // Layout con Sidebar
  const sideButton = (label: string, onClick: ()=>void, active: boolean) => (
    <button className={`p-2 rounded hover:bg-slate-800 ${active ? 'bg-slate-800' : ''}`} onClick={onClick}>{label}</button>
  )

  return (
    <div className="h-screen flex">
      <aside className="w-64 bg-slate-900 text-white p-4">
        <div className="text-xl font-semibold mb-6">MineConnect SAT Pro</div>
        <nav className="flex flex-col gap-2">
          {sideButton('Historial', ()=>setActiveTab('historial'), activeTab==='historial')}
          {(profile?.role === 'admin' || profile?.role === 'coordinator') && sideButton('Conductores', ()=>setActiveTab('conductores'), activeTab==='conductores')}
          {profile?.role === 'conductor' && sideButton('Simulador', ()=>setActiveTab('simulador'), activeTab==='simulador')}
        </nav>
        <div className="mt-6 border-t border-slate-800 pt-3 text-sm text-slate-400">
          Empresa: {profile?.company_id}
        </div>
      </aside>

      <main className="flex-1 p-4 bg-gray-100">
        {activeTab === 'historial' && <HistoryPanel />}
        {activeTab === 'conductores' && <UserManagement userProfile={profile} />}
        {activeTab === 'simulador' && <DriverSimulator user={profile} onTripUpdate={()=>{}}/>}
      </main>
    </div>
  )
}


export default App
