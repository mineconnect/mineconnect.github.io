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

  // Auth component with fotorrealistic Earth
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
      <div className="relative min-h-screen bg-black overflow-hidden">
        {/* Deep Space - Almost No Stars */}
        <div className="absolute inset-0 bg-black">
          {/* Minimal Stars - Barely Perceptible */}
          <div className="absolute inset-0 opacity-5">
            <div className="minimal-stars" />
          </div>
        </div>

        {/* Earth - Low Earth Orbit View */}
        <div className="absolute inset-0">
          <div className="absolute w-[200vw] h-[200vh] -top-1/2 -left-1/2">
            {/* Earth Surface - Close Up Orbital View */}
            <div 
              className="absolute inset-0 earth-orbit-view"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=3000&h=2000&fit=crop&q=100')`,
                backgroundSize: '120% 120%',
                backgroundPosition: '35% 45%',
                boxShadow: 'inset -80px -80px 160px rgba(0,0,0,0.9), inset 40px 40px 80px rgba(100,200,255,0.3)'
              }}
            >
              {/* Enhanced Cloud Layer with Shadows */}
              <div 
                className="absolute inset-0 opacity-70"
                style={{
                  backgroundImage: `url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=3000&h=2000&fit=crop&q=100')`,
                  backgroundSize: '120% 120%',
                  backgroundPosition: '35% 40%',
                  mixBlendMode: 'screen',
                  filter: 'blur(0.8px) brightness(1.1) contrast(1.1)'
                }}
              />

              {/* Mountain Ranges and Relief Enhancement */}
              <div 
                className="absolute inset-0 opacity-30"
                style={{
                  background: 'linear-gradient(135deg, transparent 0%, rgba(139,69,19,0.1) 25%, transparent 50%, rgba(34,139,34,0.1) 75%, transparent 100%)',
                  mixBlendMode: 'multiply'
                }}
              />
              
              {/* Prominent Atmospheric Glow */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(ellipse at 50% 30%, rgba(100,150,255,0.4) 0%, rgba(50,120,220,0.3) 30%, transparent 60%)',
                  filter: 'blur(4px)'
                }}
              />
              
              {/* Intense Blue Rim Atmosphere */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(ellipse at 50% 30%, transparent 50%, rgba(100,200,255,0.6) 70%, rgba(50,150,255,0.8) 85%, transparent 95%)',
                  filter: 'blur(2px)'
                }}
              />
              
              {/* Orbital Sunset - Orange Terminated */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(255,94,0,0.2) 20%, transparent 40%, rgba(255,150,0,0.1) 60%, rgba(0,0,0,0.6) 100%)',
                  mixBlendMode: 'overlay'
                }}
              />
              
              {/* Deep Shadow and Curvature */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 25%, transparent 50%, rgba(0,0,0,0.3) 75%, rgba(0,0,0,0.9) 100%)',
                  mixBlendMode: 'multiply'
                }}
              />
            </div>
          </div>
        </div>

        {/* Login Box - Left Side Minimalist */}
        <div className="relative z-20 min-h-screen flex items-center justify-start px-8 md:px-16">
          <div className="w-full max-w-sm">
            {/* Brand */}
            <div className="mb-12">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-400/20">
                  <Satellite className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white tracking-tight">MineConnect</h1>
                  <p className="text-xl text-blue-300 font-light">SAT PRO</p>
                </div>
              </div>
              <p className="text-blue-200/30 text-sm">Sistema de Monitoreo Satelital</p>
            </div>

            {/* Ultra-Minimalist Glassmorphism */}
            <div 
              className="backdrop-blur-xl bg-white/2 rounded-2xl p-6 border border-white/5"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), inset 0 0 20px rgba(255, 255, 255, 0.01)'
              }}
            >
              <form onSubmit={login} className="space-y-5">
                <div>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required
                    placeholder="Correo electrónico"
                    className="w-full px-4 py-3 bg-black/30 border border-white/5 rounded-lg text-white placeholder-blue-200/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400/30 transition-all text-sm"
                  />
                </div>
                <div>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required
                    placeholder="Contraseña"
                    className="w-full px-4 py-3 bg-black/30 border border-white/5 rounded-lg text-white placeholder-blue-200/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400/30 transition-all text-sm"
                  />
                </div>
                {err && (
                  <div className="p-3 bg-red-500/10 border border-red-400/20 rounded-lg">
                    <div className="text-red-300 text-sm">{err}</div>
                  </div>
                )}
                <button 
                  type="submit" 
                  disabled={loadingAuth}
                  className="w-full py-3 bg-blue-500/10 border border-blue-400/20 text-blue-100 font-medium rounded-lg hover:bg-blue-500/15 hover:border-blue-400/30 focus:outline-none focus:ring-2 focus:ring-blue-400/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  {loadingAuth ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Conectando...
                    </span>
                  ) : 'Iniciar Sesión'}
                </button>
              </form>
            </div>

            {/* Status */}
            <div className="flex items-center justify-center space-x-2 mt-6 text-blue-200/30 text-xs">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span>Sistema En Línea</span>
            </div>
          </div>
        </div>

        <style>{`
          .minimal-stars {
            position: absolute;
            inset: 0;
            background-image: 
              radial-gradient(0.5px 0.5px at 200px 300px, rgba(255,255,255,0.8), transparent),
              radial-gradient(0.5px 0.5px at 600px 100px, rgba(255,255,255,0.6), transparent),
              radial-gradient(0.5px 0.5px at 1000px 400px, rgba(255,255,255,0.4), transparent);
            background-size: 1200px 600px;
            animation: drift 300s linear infinite;
          }
          
          .earth-orbit-view {
            animation: orbital-drift 180s ease-in-out infinite;
          }
          
          @keyframes drift {
            from { transform: translateX(0); }
            to { transform: translateX(-1200px); }
          }
          
          @keyframes orbital-drift {
            0%, 100% { 
              transform: translateX(0) translateY(0) scale(1); 
            }
            25% { 
              transform: translateX(-2%) translateY(-1%) scale(1.02); 
            }
            50% { 
              transform: translateX(2%) translateY(-0.5%) scale(1.01); 
            }
            75% { 
              transform: translateX(1%) translateY(1%) scale(1.02); 
            }
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