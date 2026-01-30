import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import HistoryPanel from './components/HistoryPanel'
import UserManagement from './components/UserManagement'
import DriverSimulator from './components/DriverSimulator'
// Icon imports removed for a clean background/UI integration
import { UserProfile } from './types'

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
        setProfile({ ...profileData, company_id: profileData.company_id ?? '' } as UserProfile)
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

  // Auth login form con fondo orbital: 100% en español
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
      <div className="relative w-full h-screen bg-black overflow-hidden" aria-label="Auth Background">
        {/* Fondo Tierra en órbita cercana (8K) */}
        <div className="absolute inset-0" aria-label="Fondo Tierra Orbital">
          <div
            className="earth-spot"
            style={{
              position: 'absolute',
              width: '1300px', height: '1300px', borderRadius: '50%',
              right: '-28%', top: '-12%',
              backgroundImage: `url('/assets/earth-8k-blue-marble.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: '60% 60%',
              animation: 'earthPan 180s linear infinite',
              boxShadow: '0 0 180px rgba(0,140,255,0.8)'
            }}
          />
        </div>

        {/* Login Card - Glassmorphism suave a la izquierda */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10 w-[min(420px,90%)]" style={{
          backdropFilter: 'blur(22px)',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 16,
          padding: 22,
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.4)'
        }}>
          <form onSubmit={login} className="space-y-4">
            <div className="text-center">
              <div className="text-white text-lg font-semibold">Iniciar Sesión</div>
              <div className="text-sky-200 text-sm">Monitoreo Satelital</div>
            </div>
            <div>
              <label className="block text-sky-100 text-sm mb-1">Correo</label>
              <input className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded" placeholder="usuario@dominio" value={email} onChange={e=>setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sky-100 text-sm mb-1">Contraseña</label>
              <input type="password" className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
            </div>
            {err && <div className="text-red-200 text-sm">{err}</div>}
            <button type="submit" className="w-full py-3 rounded bg-gradient-to-r from-sky-500 to-cyan-600 text-white font-semibold">
              {loadingAuth ? 'Conectando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>

        <style>{`
          @keyframes earthPan {
            from { background-position: 60% 60%; }
            to { background-position: 64% 60%; }
          }
        `}</style>
      </div>
    )
  }

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center">Cargando...</div>
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-xl mb-4">Error de Conexión</div>
          <div className="text-slate-300 mb-6">{error}</div>
          <button onClick={retry} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">Reintentar</button>
        </div>
      </div>
    )
  }

  if (showAuth || !profile) {
    return <Auth onLoginSuccess={fetchProfile} />
  }

  // Interfaz principal (mantenida mínimamente para navegación durante el push)
  const sideButton = (label: string, onClick: ()=>void, active: boolean) => (
    <button className={`p-2 rounded hover:bg-slate-800 ${active ? 'bg-slate-800' : ''}`} onClick={onClick}>{label}</button>
  )

  return (
    <div className="h-screen flex">
      <aside className="w-64 bg-slate-900 text-white p-4 border-r border-slate-800/50">
        <div className="text-xl font-semibold mb-6">MineConnect SAT Pro</div>
        <nav className="flex flex-col gap-2">
          {sideButton('Historial', ()=>setActiveTab('historial'), activeTab==='historial')}
          {(profile?.role === 'admin' || profile?.role === 'coordinator') && sideButton('Conductores', ()=>setActiveTab('conductores'), activeTab==='conductores')}
          {profile?.role === 'conductor' && sideButton('Simulador', ()=>setActiveTab('simulador'), activeTab==='simulador')}
        </nav>
        <div className="mt-6 border-t border-slate-800 pt-3 text-sm text-slate-400">Empresa: {profile?.company_id}</div>
      </aside>
      <main className="flex-1 p-4 bg-gray-100">
        {activeTab === 'historial' && <HistoryPanel />}
        {activeTab === 'conductores' && <UserManagement userProfile={profile} />}
        {activeTab === 'simulador' && <DriverSimulator user={profile} onTripUpdate={()=>{}}/>}
      </main>
    </div>
  )
}

export type { UserProfile }
export default App
