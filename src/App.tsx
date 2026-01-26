import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Activity, Clock, User, Menu, X, ShieldCheck, ChevronRight, Smartphone, Globe, LogOut, Sun, Moon } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import DriverSimulator from './components/DriverSimulator';
import HistoryPanel from './components/HistoryPanel';
import type { Trip, UserProfile } from './types';

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'simulator' | 'history'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState<any>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('mineconnect-theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      // Default to dark theme
      document.documentElement.classList.add('dark');
    }

    fetchUserAndTrips();
    setupPWAInstall();
    setupRealtimeSubscription();
    
    // Online/Offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setupPWAInstall = () => {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      setPwaInstallPrompt(e);
    });
  };

  const installPWA = async () => {
    if (pwaInstallPrompt) {
      pwaInstallPrompt.prompt();
      await pwaInstallPrompt.userChoice;
      setPwaInstallPrompt(null);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('mineconnect-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        setUser(null);
        setTrips([]);
        // Optional: redirect to login or reload page
        // window.location.reload();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('trips_changes_global')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'trips' },
        (payload) => {
          console.log('Realtime update:', payload);
          fetchUserAndTrips();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const fetchUserAndTrips = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
          const demoProfile = { 
            id: 'demo', 
            full_name: 'Invitado MineConnect', 
            company_id: '00000000-0000-0000-0000-000000000000', 
            role: 'admin' as const,
            created_at: new Date().toISOString()
          };
          setUser(demoProfile);
          await loadTrips(demoProfile.company_id, demoProfile.role);
          return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      if (error) {
        console.error('Profile fetch error:', error);
        // Fallback to demo mode
        const demoProfile = { 
          id: 'demo', 
          full_name: 'Invitado MineConnect', 
          company_id: '00000000-0000-0000-0000-000000000000', 
          role: 'admin' as const,
          created_at: new Date().toISOString()
        };
        setUser(demoProfile);
        await loadTrips(demoProfile.company_id, demoProfile.role);
        return;
      }
      
      if (profile) {
        setUser(profile);
        await loadTrips(profile.company_id, profile.role);
      }
    } catch (error) {
      console.error('Error:', error);
      // Fallback to demo mode
      const demoProfile = { 
        id: 'demo', 
        full_name: 'Invitado MineConnect', 
        company_id: '00000000-0000-0000-0000-000000000000', 
        role: 'admin' as const,
        created_at: new Date().toISOString()
      };
      setUser(demoProfile);
      await loadTrips(demoProfile.company_id, demoProfile.role);
    } finally {
      setLoading(false);
    }
  };

  const loadTrips = async (companyId: string, userRole: string = 'operator') => {
      if (!companyId || companyId === '00000000-0000-0000-0000-000000000000') {
        if (userRole === 'admin') {
          // Admin users can see all trips even without company_id including NULL company_id
          try {
            const { data, error } = await supabase
              .from('trips')
              .select('*')
              .order('created_at', { ascending: false });
            
            if (error) {
              console.error('Admin trips fetch error:', error);
              setTrips([]);
            } else if (data) {
              setTrips(data);
            }
          } catch (error) {
            console.error('Error loading admin trips:', error);
            setTrips([]);
          }
        } else {
          setTrips([]);
        }
        return;
      }
      
      try {
        let query = supabase
          .from('trips')
          .select('*')
          .order('created_at', { ascending: false });

        // If user is admin, don't filter by company_id (global visibility)
        // Otherwise, filter by company_id as before
        if (userRole !== 'admin') {
          query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;
        
        if (error) {
          console.error('Trips fetch error:', error);
          setTrips([]);
        } else if (data) {
          setTrips(data);
        }
      } catch (error) {
        console.error('Error loading trips:', error);
        setTrips([]);
      }
  };

  if (loading) return (
    <div className={`min-h-screen flex flex-col items-center justify-center safe-area ${
      theme === 'dark' ? 'bg-[#020617]' : 'bg-gray-50'
    }`}>
      <div className="relative">
        <Activity className={`w-16 h-16 animate-spin mb-6 hardware-accelerated ${
          theme === 'dark' ? 'text-blue-500' : 'text-blue-600'
        }`} />
        <div className={`absolute inset-0 w-16 h-16 border-4 rounded-full animate-ping ${
          theme === 'dark' ? 'border-blue-500/20' : 'border-blue-600/20'
        }`}></div>
      </div>
      <p className={`font-black text-2xl tracking-widest mb-2 ${
        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
      }`}>MINECONNECT SAT</p>
      <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-600'}`}>
        Iniciando sistema avanzado...
      </p>
    </div>
  );

  return (
    <div className={`min-h-screen text-white flex overflow-hidden ${
      theme === 'dark' ? 'bg-[#020617]' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* PWA Install Banner */}
      {pwaInstallPrompt && (
        <div className={`fixed top-0 left-0 right-0 z-50 p-3 flex items-center justify-between safe-area ${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
            : 'bg-gradient-to-r from-blue-500 to-blue-600'
        }`}>
          <div className="flex items-center space-x-3">
            <Smartphone className="w-5 h-5" />
            <span className="text-sm font-medium">Instalar MineConnect SAT en tu dispositivo</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPwaInstallPrompt(null)}
              className="text-white/70 hover:text-white text-sm"
            >
              Ahora no
            </button>
            <button
              onClick={installPWA}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-bold hover:bg-blue-50"
            >
              Instalar
            </button>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="fixed top-20 right-6 z-40">
        <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-2 ${
          isOnline 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-emerald-400' : 'bg-red-400'
          } animate-pulse`}></div>
          <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>

      {/* Sidebar Industrial */}
      <AnimatePresence>
        {(sidebarOpen || typeof window !== 'undefined' && window.innerWidth > 1024) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={`w-72 border-r fixed lg:relative h-full z-50 flex flex-col ${
              theme === 'dark' 
                ? 'bg-slate-900 border-slate-800' 
                : 'bg-white border-gray-200'
            }`}
          >
            <div className={`p-6 border-b safe-area-top ${
              theme === 'dark' ? 'border-slate-800' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className={`w-8 h-8 hardware-accelerated ${
                    theme === 'dark' ? 'text-blue-500' : 'text-blue-600'
                  }`} />
                  <h1 className={`text-xl font-black tracking-tighter ${
                    theme === 'dark' ? '' : 'text-gray-900'
                  }`}>
                    MINE<span className={theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}>CONNECT</span> SAT
                  </h1>
                </div>
                <button 
                  onClick={() => setSidebarOpen(false)} 
                  className={`lg:hidden p-2 rounded-lg transition-colors touch-button ${
                    theme === 'dark' 
                      ? 'hover:bg-slate-800' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <X className={`w-6 h-6 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                  }`} />
                </button>
              </div>

              {user && (
                <div className={`bg-gradient-to-br p-4 rounded-2xl flex items-center space-x-3 shadow-inner backdrop-blur-sm border ${
                  theme === 'dark' 
                    ? 'from-slate-800/50 to-slate-900/50 border-slate-700' 
                    : 'from-gray-100/50 to-gray-200/50 border-gray-300'
                }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shadow-lg hardware-accelerated ${
                    user.role === 'admin' 
                      ? theme === 'dark' 
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' 
                        : 'bg-gradient-to-br from-emerald-600 to-emerald-800'
                      : theme === 'dark' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-700' 
                        : 'bg-gradient-to-br from-blue-600 to-blue-800'
                  }`}>
                    {user.role === 'admin' ? (
                      <Globe className="w-6 h-6 text-white" />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className={`text-sm font-bold truncate ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>{user.full_name}</p>
                    <p className={`text-[10px] uppercase font-black tracking-widest ${
                      user.role === 'admin' 
                        ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                        : theme === 'dark' ? 'text-slate-500' : 'text-gray-600'
                    }`}>
                      {user.role === 'admin' ? 'Superadmin Global' : user.role}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <nav className="p-4 flex-1 space-y-2 overflow-y-auto custom-scrollbar">
              {[
                { id: 'dashboard', icon: MapPin, label: 'Panel Global' },
                { id: 'simulator', icon: Activity, label: 'Simulador Pro' },
                { id: 'history', icon: Clock, label: 'Historial SAT' }
              ].map((item) => (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setActiveView(item.id as any); setSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all group touch-button ${
                    activeView === item.id 
                      ? theme === 'dark'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : theme === 'dark'
                        ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-bold text-sm">{item.label}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform flex-shrink-0 ${
                    activeView === item.id ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:opacity-100'
                  }`} />
                </motion.button>
              ))}
            </nav>

            {/* Theme Toggle & Logout */}
            <div className={`p-4 border-t space-y-2 ${
              theme === 'dark' ? 'border-slate-800' : 'border-gray-200'
            }`}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl transition-all touch-button ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">
                  {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                </span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl transition-all touch-button ${
                  theme === 'dark'
                    ? 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20'
                    : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                }`}
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Cerrar Sesión</span>
              </motion.button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Trigger */}
      <button 
        onClick={() => setSidebarOpen(true)} 
        className={`lg:hidden fixed top-24 left-6 z-40 p-4 rounded-xl shadow-xl touch-button safe-area-left hardware-accelerated ${
          theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
        }`}
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Main View */}
      <main className="flex-1 relative h-screen overflow-y-auto custom-scrollbar mobile-no-select">
        {activeView === 'dashboard' && (
          <div className="h-full flex items-center justify-center p-6 safe-area">
            <div className="w-full max-w-6xl">
              {/* Dashboard Header */}
              <div className="text-center mb-8">
                <h2 className={`text-3xl lg:text-4xl font-black mb-2 ${
                  theme === 'dark' ? '' : 'text-gray-900'
                }`}>
                  PANEL DE CONTROL
                  {user?.role === 'admin' && (
                    <span className={`ml-3 text-sm lg:text-base font-normal ${
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    }`}>
                      (GLOBAL)
                    </span>
                  )}
                </h2>
                <p className={`uppercase tracking-widest text-xs ${
                  theme === 'dark' ? 'text-slate-500' : 'text-gray-600'
                }`}>
                  Sistema Avanzado de Monitoreo
                  {user?.role === 'admin' && ' - Todas las Empresas'}
                </p>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 lg:gap-8">
                <motion.div 
                  whileHover={{ scale: 1.02, y: -2 }}
                  className={`p-6 lg:p-10 rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl backdrop-blur-md hardware-accelerated ${
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-slate-700'
                      : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4 lg:mb-6">
                    <div className={`p-3 rounded-xl ${
                      theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
                    }`}>
                      <Activity className={`w-8 h-8 lg:w-12 lg:h-12 ${
                        theme === 'dark' ? 'text-blue-500' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className={`text-3xl lg:text-4xl font-black ${
                      theme === 'dark' ? 'text-blue-500' : 'text-blue-600'
                    }`}>
                      {trips.filter(t => t.status === 'en_curso').length}
                    </div>
                  </div>
                  <div className={`font-bold uppercase tracking-widest text-xs lg:text-sm ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    Unidades Activas
                    {user?.role === 'admin' && (
                      <span className={`block text-xs normal-case ${
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                      }`}>Global</span>
                    )}
                  </div>
                  <div className={`mt-2 text-xs ${
                    theme === 'dark' ? 'text-slate-600' : 'text-gray-500'
                  }`}>Tiempo real</div>
                </motion.div>

                <motion.div 
                  whileHover={{ scale: 1.02, y: -2 }}
                  className={`p-6 lg:p-10 rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl backdrop-blur-md hardware-accelerated ${
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-slate-700'
                      : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4 lg:mb-6">
                    <div className={`p-3 rounded-xl ${
                      theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'
                    }`}>
                      <Clock className={`w-8 h-8 lg:w-12 lg:h-12 ${
                        theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'
                      }`} />
                    </div>
                    <div className={`text-3xl lg:text-4xl font-black ${
                      theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'
                    }`}>
                      {trips.filter(t => t.status === 'finalizado').length}
                    </div>
                  </div>
                  <div className={`font-bold uppercase tracking-widest text-xs lg:text-sm ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    Viajes Realizados
                    {user?.role === 'admin' && (
                      <span className={`block text-xs normal-case ${
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                      }`}>Global</span>
                    )}
                  </div>
                  <div className={`mt-2 text-xs ${
                    theme === 'dark' ? 'text-slate-600' : 'text-gray-500'
                  }`}>Historial completo</div>
                </motion.div>
              </div>

              {/* Mobile CTA */}
              <div className="mt-8 text-center lg:hidden">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveView('simulator')}
                  className={`px-6 py-3 rounded-xl font-bold touch-button shadow-lg hardware-accelerated ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                  }`}
                >
                  Iniciar Operación
                </motion.button>
              </div>
            </div>
          </div>
        )}
        {activeView === 'simulator' && <DriverSimulator user={user} onTripUpdate={fetchUserAndTrips} />}
        {activeView === 'history' && <HistoryPanel trips={trips} user={user} />}
      </main>
    </div>
  );
}

export default App;