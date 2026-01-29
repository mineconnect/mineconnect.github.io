import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import HistoryPanel from './components/HistoryPanel'
import UserManagement from './components/UserManagement'
import DriverSimulator from './components/DriverSimulator'
import { Satellite, Globe, Users, Map, LogOut } from 'lucide-react'
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

  // Auth component with satellite view
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
      <div className="relative min-h-screen overflow-hidden">
        {/* Immersive Earth Orbit View */}
        <div className="absolute inset-0 bg-black">
          {/* Deep Space Background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900 to-blue-950" />
            
            {/* Stars */}
            <div className="absolute inset-0 opacity-60">
              <div className="stars-layer-1" />
              <div className="stars-layer-2" />
            </div>
            
            {/* Earth with Atmosphere */}
            <div 
              className="absolute inset-0 earth-orbit-view"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=3000&h=2000&fit=crop')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center bottom',
                animation: 'pan-slow 120s ease-in-out infinite'
              }}
            />
            
            {/* Atmosphere Glow */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 via-blue-400/5 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-blue-600/20" />
            </div>
            
            {/* Lens Flare Effects */}
            <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-400 rounded-full filter blur-3xl opacity-20 animate-pulse" />
            <div className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-cyan-300 rounded-full filter blur-2xl opacity-15 animate-pulse" />
          </div>
        </div>

        {/* Login Box with Extreme Glassmorphism */}
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            {/* Floating Satellite */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Satellite className="w-20 h-20 text-blue-400 relative z-10 animate-bounce" style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-0 bg-blue-400 rounded-full filter blur-2xl opacity-30 animate-pulse" />
                </div>
              </div>
              <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">MineConnect</h1>
              <div className="text-2xl font-light text-blue-200 mb-2">SAT PRO</div>
              <div className="flex items-center justify-center space-x-2 text-blue-300/60 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Monitoreo Satelital Activo</span>
              </div>
            </div>

            {/* Extreme Glassmorphism Container */}
            <div 
              className="backdrop-blur-2xl bg-white/5 rounded-3xl p-8 border border-white/10 shadow-2xl"
              style={{
                boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 0 20px rgba(255, 255, 255, 0.03)'
              }}
            >
              <form onSubmit={login} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-2">Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    placeholder="usuario@mineconnect.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-2">Contraseña</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
                {err && (
                  <div className="p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
                    <div className="text-red-200 text-sm">{err}</div>
                  </div>
                )}
                <button 
                  type="submit" 
                  disabled={loadingAuth}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                >
                  {loadingAuth ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Conectando...
                    </span>
                  ) : 'Iniciar Sesión'}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-blue-200/60 text-sm">
              <p>Plataforma de Monitoreo Satelital © 2026</p>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pan-slow {
            0%, 100% { 
              transform: scale(1.3) translateX(-5%) translateY(0); 
            }
            25% { 
              transform: scale(1.3) translateX(0) translateY(-2%); 
            }
            50% { 
              transform: scale(1.3) translateX(5%) translateY(0); 
            }
            75% { 
              transform: scale(1.3) translateX(0) translateY(2%); 
            }
          }
          
          .stars-layer-1 {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(2px 2px at 20px 30px, white, transparent),
                              radial-gradient(2px 2px at 40px 70px, white, transparent),
                              radial-gradient(1px 1px at 50px 50px, white, transparent),
                              radial-gradient(1px 1px at 80px 10px, white, transparent),
                              radial-gradient(2px 2px at 130px 80px, white, transparent);
            background-size: 200px 200px;
            animation: drift 100s linear infinite;
          }
          
          .stars-layer-2 {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(1px 1px at 10px 10px, white, transparent),
                              radial-gradient(1px 1px at 150px 150px, white, transparent),
                              radial-gradient(2px 2px at 60px 170px, white, transparent),
                              radial-gradient(1px 1px at 175px 20px, white, transparent);
            background-size: 250px 250px;
            animation: drift 150s linear infinite reverse;
          }
          
          @keyframes drift {
            from { transform: translateX(0); }
            to { transform: translateX(-200px); }
          }
        `}</style>
      </div>
    )
  }

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Satellite className="w-12 h-12 text-blue-400 animate-pulse" />
          </div>
          <div className="text-white text-lg">Conectando con satélite...</div>
        </div>
      </div>
    )
  }

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-xl mb-4">Error de Conexión</div>
          <div className="text-slate-300 mb-6">{error}</div>
          <button 
            onClick={retry}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Reintentar Conexión
          </button>
        </div>
      </div>
    )
  }

  // Show auth screen if not authenticated
  if (showAuth || !profile) {
    return <Auth onLoginSuccess={fetchProfile} />
  }

  // Main Dashboard
  const sidebarItems = [
    { id: 'historial', label: 'Monitor de Viajes', icon: Map, allowed: true },
    { id: 'conductores', label: 'Conductores', icon: Users, allowed: profile?.role === 'admin' || profile?.role === 'coordinator' },
    { id: 'simulador', label: 'Simulador', icon: Globe, allowed: profile?.role === 'conductor' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Modern Sidebar */}
      <aside className="w-20 bg-slate-900/50 backdrop-blur-sm border-r border-slate-800/50 flex flex-col items-center py-8 space-y-8">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Satellite className="w-8 h-8 text-blue-400" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col items-center space-y-6">
          {sidebarItems.filter(item => item.allowed).map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`group relative p-3 rounded-xl transition-all duration-300 ${
                  activeTab === item.id 
                    ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/20' 
                    : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {activeTab === item.id && (
                  <div className="absolute inset-0 rounded-xl bg-blue-400/10 animate-pulse" />
                )}
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {item.label}
                </div>
              </button>
            )
          })}
        </nav>

        {/* User section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
            {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <button
            onClick={() => {
              supabase.auth.signOut()
              setShowAuth(true)
            }}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-950 overflow-hidden">
        {/* Header */}
        <header className="bg-slate-900/30 backdrop-blur-sm border-b border-slate-800/50 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {sidebarItems.find(item => item.id === activeTab)?.label}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Empresa: {profile?.company_id} | Usuario: {profile?.full_name}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Satélite Conectado</span>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="h-[calc(100vh-88px)]">
          {activeTab === 'historial' && <HistoryPanel />}
          {activeTab === 'conductores' && <UserManagement userProfile={profile} />}
          {activeTab === 'simulador' && <DriverSimulator user={profile} onTripUpdate={()=>{}}/>}
        </div>
      </main>
    </div>
  )
}

export default App