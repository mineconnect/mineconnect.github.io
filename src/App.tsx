import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, LogOut, Menu, Moon, Sun, Users, X, ShieldCheck, ChevronRight, User as LucideUser } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import DriverSimulator from './components/DriverSimulator';
import HistoryPanel from './components/HistoryPanel';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import type { Session, User } from '@supabase/supabase-js';

// Import UserProfile type from types
import type { UserProfile } from './types';

// Main App Component
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // --- Effects ---
  useEffect(() => {
    // 1. Theme Initialization
    const savedTheme = localStorage.getItem('mineconnect-theme') as 'dark' | 'light';
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('SESION:', session);
      setLoading(true);
      setAuthError(null);
      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUserProfile(null);
        setActiveView(''); // Reset view on logout
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Set initial view based on role
  useEffect(() => {
    if (userProfile) {
      switch (userProfile.role) {
        case 'admin':
        case 'coordinator':
          setActiveView('history');
          break;
        case 'conductor':
          setActiveView('simulator');
          break;
        default:
          setActiveView('');
      }
    }
  }, [userProfile]);

  // --- Data Fetching ---
  const fetchUserProfile = async (user: User) => {
    console.log('Buscando perfil para usuario:', user.id);
    
    // Crear un timeout de 20 segundos
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: El perfil tardó demasiado en cargar')), 20000);
    });

    try {
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        console.error("Error fetching user profile:", error);
        
        // Si el perfil no existe, creamos uno básico en lugar de hacer logout
        if (error.code === 'PGRST116') {
          console.log('Perfil no encontrado. Creando perfil básico...');
          const defaultProfile: UserProfile = {
            id: user.id,
            full_name: user.email?.split('@')[0] || 'Usuario',
            company_id: 'default',
            role: 'conductor', // Rol por defecto
            email: user.email,
            created_at: new Date().toISOString()
          };
          
          // Si es el superadmin, asignar rol correspondiente
          if (user.email === 'fbarrosmarengo@gmail.com') {
            defaultProfile.role = 'admin';
          }
          
          setUserProfile(defaultProfile);
          console.log('PERFIL:', defaultProfile);
          
          // Opcional: Crear el perfil en la base de datos
          try {
            await supabase.from('profiles').insert({
              id: user.id,
              full_name: defaultProfile.full_name,
              company_id: defaultProfile.company_id,
              role: defaultProfile.role
            });
            console.log('Perfil creado en la base de datos');
          } catch (createError) {
            console.warn('No se pudo crear el perfil en BD:', createError);
          }
        } else {
          setAuthError('Error al cargar el perfil de usuario');
          await handleLogout();
        }
        return;
      }

      if (data) {
        const profile: UserProfile = { ...data, email: user.email };
        // Override role for superadmin email
        if (user.email === 'fbarrosmarengo@gmail.com') {
          profile.role = 'admin';
        }
        setUserProfile(profile);
        console.log('PERFIL:', profile);
      }
    } catch (timeoutError: any) {
      console.error('Timeout al cargar perfil:', timeoutError);
      // No mostrar error inmediatamente, solo log y seguir esperando
      // El perfil puede llegar después del timeout
      console.log('Esperando perfil después del timeout...');
      // No hacer setLoading(false) aquí para permitir que la petición continúe
    }
  };

  // --- Handlers ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener will handle resetting state
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('mineconnect-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // --- RBAC ---
  const navItems = [
    { id: 'history', icon: Clock, label: 'Historial SAT', roles: ['admin', 'coordinator'] },
    { id: 'users', icon: Users, label: 'Gestión de Conductores', roles: ['admin', 'coordinator'] },
    { id: 'simulator', icon: Activity, label: 'Simulador Pro', roles: ['conductor'] },
  ];

  const accessibleNavItems = navItems.filter(item => userProfile && item.roles.includes(userProfile.role));

  // --- Render Logic ---
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center flex-col">
        <Activity className="w-16 h-16 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400">Cargando...</p>
        {authError && (
          <div className="mt-4 text-red-400 text-center max-w-md">
            <p>{authError}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }
  
  const renderView = () => {
    switch (activeView) {
      case 'history':
        return <HistoryPanel trips={[]} user={userProfile} />;
      case 'users':
        return <UserManagement userProfile={userProfile} />;
      case 'simulator':
        return <DriverSimulator user={userProfile} onTripUpdate={() => {}} />;
      default:
        return (
            <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-400">Seleccione una opción del menú para comenzar.</h2>
                </div>
            </div>
        );
    }
  };

  return (
    <div className={`min-h-screen text-white flex overflow-hidden ${theme === 'dark' ? 'bg-[#020617]' : 'bg-gray-50 text-gray-900'}`}>
      <AnimatePresence>
        {(sidebarOpen || (typeof window !== 'undefined' && window.innerWidth > 1024)) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={`w-72 border-r fixed lg:relative h-full z-20 flex flex-col ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}
          >
            {/* Header */}
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center space-x-2">
                  <ShieldCheck className={`w-8 h-8 hardware-accelerated ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`} />
                  <h1 className={`text-xl font-black tracking-tighter ${theme === 'dark' ? '' : 'text-gray-900'}`}>
                    MINE<span className={theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}>CONNECT</span> SAT
                  </h1>
                </div>
                <button onClick={() => setSidebarOpen(false)} className={`lg:hidden p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}>
                  <X className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`} />
                </button>
              </div>
              
              {/* User Profile */}
              {userProfile && (
                 <div className={`bg-gradient-to-br p-4 rounded-2xl flex items-center space-x-3 shadow-inner border ${theme === 'dark' ? 'from-slate-800/50 to-slate-900/50 border-slate-700' : 'from-gray-100/50 to-gray-200/50 border-gray-300'}`}>
<div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-lg hardware-accelerated bg-gradient-to-br ${
                       userProfile.role === 'admin' ? 'from-emerald-500 to-emerald-700' :
                       userProfile.role === 'coordinator' ? 'from-purple-500 to-purple-700' :
                       'from-blue-500 to-blue-700'
                     }`}>
                       <LucideUser className="w-6 h-6" />
                     </div>
                     <div className="overflow-hidden flex-1">
                       <p className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{userProfile.full_name}</p>
                       <p className={`text-[10px] uppercase font-black tracking-widest ${
                         userProfile.role === 'admin' ? 'text-emerald-400' :
                         userProfile.role === 'coordinator' ? 'text-purple-400' :
                         'text-slate-500'
                       }`}>
                         {userProfile.role}
                       </p>
                     </div>
                  </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="p-4 flex-1 space-y-2 overflow-y-auto">
              {accessibleNavItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setActiveView(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all group ${
                    activeView === item.id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                      : `${theme === 'dark' ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5" />
                    <span className="font-bold text-sm">{item.label}</span>
                  </div>
                   <ChevronRight className={`w-4 h-4 transition-transform ${activeView === `item.id` ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:opacity-100'}`} />
                </motion.button>
              ))}
            </nav>
            
            {/* Footer */}
            <div className={`p-4 border-t space-y-2 ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={toggleTheme} className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl transition-all ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    <span className="text-sm font-medium">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout} className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl transition-all ${theme === 'dark' ? 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20' : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'}`}>
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Cerrar Sesión</span>
                </motion.button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <button onClick={() => setSidebarOpen(true)} className={`lg:hidden fixed top-6 left-6 z-10 p-3 rounded-full shadow-lg ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'}`}>
        <Menu className="w-6 h-6 text-white" />
      </button>

      <main className="flex-1 relative h-screen overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
}

export default App;