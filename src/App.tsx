// src/App.tsx
import { useState, useEffect } from 'react';
import { Clock, Users as UsersIcon, X, ChevronRight, Smartphone } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import Login from './components/Login';
import HistoryPanel from './components/HistoryPanel';
import UserManagement from './components/UserManagement';
import DriverSimulator from './components/DriverSimulator';
import type { Session, User } from '@supabase/supabase-js';

// Tipo de usuario (proveniente de su proyecto; puedes ajustarlo si exportas en otro lugar)
export interface UserProfile {
  id: string;
  full_name: string;
  company_id: string | null;
  role: 'SUPERADMIN' | 'COORDINADOR' | 'CONDUCTOR';
  email?: string;
}

export interface Trip {
  id: string;
  plate: string;
  driver_name: string;
  start_time: string;
  company_id: string;
}

export interface TripLog {
  id: string;
  trip_id: string;
  lat: number;
  lng: number;
  timestamp: string;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  // Tema fijo (no removemos el estilo)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // 1) Gatekeeper: verificar sesión y cargar perfil al inicio
  useEffect(() => {
    const init = async () => {
      // Cargar tema
      const savedTheme = localStorage.getItem('mineconnect-theme') as 'dark' | 'light';
      const t = savedTheme ?? 'dark';
      setTheme(t);
      document.documentElement.classList.toggle('dark', t === 'dark');

      // Verificar sesión actual
      const { data: { session: sess } } = await supabase.auth.getSession();
      setSession(sess ?? null);

      if (sess?.user) {
        await fetchUserProfile(sess.user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    };
    init();
  }, []);

  // 2) Gatekeeper: escuchar cambios de sesión
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_ev, sess) => {
      setSession(sess);
      if (sess?.user) {
        await fetchUserProfile(sess.user);
      } else {
        setUserProfile(null);
        setActiveView('dashboard');
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  // 3) Carga de Perfil
  const fetchUserProfile = async (user: User) => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) {
        // Si fuera el SUPERADMIN inexistente, crearlo brevemente
        if (user.email === 'fbarrosmarengo@gmail.com') {
          const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
            role: 'SUPERADMIN',
            company_id: null
          });
          if (insertError) console.error('Error creando perfil de SuperAdmin', insertError);
        }
        setUserProfile(null);
        return;
      }
      if (data) {
        const profile: UserProfile = { ...data, email: user.email };
        // Modo dios: si es el email del Super Admin, forzarlo
        if (user.email === 'fbarrosmarengo@gmail.com') {
          profile.role = 'SUPERADMIN';
          profile.company_id = null;
        }
        setUserProfile(profile);
        // Opcional: if (profile.role === 'SUPERADMIN') setActiveView('dashboard');
      }
    } catch (err) {
      console.error('Error al obtener perfil', err);
      setUserProfile(null);
    }
  };

  // 4) Logout limpio
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
    setActiveView('dashboard');
    setSidebarOpen(false);
  };

  // Theme toggle removed if not connected to UI

  // 6) RBAC: Items visibles
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', roles: ['SUPERADMIN','COORDINADOR'], icon: Smartphone },
    { id: 'history', label: 'Historial SAT', roles: ['SUPERADMIN','COORDINADOR'], icon: Clock },
    { id: 'users', label: 'Gestión de Usuarios', roles: ['SUPERADMIN','COORDINADOR'], icon: UsersIcon },
    { id: 'simulator', label: 'Simulador Pro', roles: ['CONDUCTOR','SUPERADMIN','COORDINADOR'], icon: Smartphone }
  ];
  const accessibleNavItems = userProfile ? navItems.filter(n => n.roles.includes(userProfile.role)) : [];

  // 7) Gatekeeper render
  if (loading) {
    return (
      <div className="h-screen bg-[#020617] text-white flex items-center justify-center">
        Cargando...
      </div>
    );
  }

  // Render gatekeeper: si no hay sesión o usuario, render Login
  if (!session || !userProfile) {
    return (
      <LoginGatekeeper />
    );
  }

  // Render de vistas (modo Dios afecta loadTrips/filters en Historia)
  const renderView = () => {
    switch (activeView) {
      case 'history':
        return <HistoryPanel trips={[]} userProfile={userProfile} />;
      case 'users':
        return <UserManagement userProfile={userProfile} onUserUpdate={() => {}} />;
      case 'simulator':
        return <DriverSimulator userProfile={userProfile} />;
      default:
        // Dashboard placeholder
        return (
          <div className="h-full p-6">
            <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-700 rounded-lg p-4 text-white">Unidades activas: 12</div>
              <div className="bg-slate-700 rounded-lg p-4 text-white">Kilómetros: 52,000</div>
              <div className="bg-slate-700 rounded-lg p-4 text-white">Viajes: 128</div>
              <div className="bg-slate-700 rounded-lg p-4 text-white">Alertas: 3</div>
            </div>
          </div>
        );
    }
  };

  // Layout
  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-[#020617]' : 'bg-white'}`}>
      {/* Sidebar (visible para SUPERADMIN y COORDINADOR) */}
      <aside className="w-64 border-r border-slate-700 bg-slate-900/90 text-white p-4 fixed h-full z-20 md:static md:h-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-bold">MineConnect</div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="mt-4 space-y-2">
          {accessibleNavItems.map(n => (
            <button key={n.id} onClick={() => setActiveView(n.id)} className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-800">
              <div className="flex items-center space-x-2">
                <n.icon className="w-4 h-4" />
                <span>{n.label}</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded">
            Cerrar Sesión
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-400 text-center">
          Modo Dios: {userProfile?.email === 'fbarrosmarengo@gmail.com' ? 'Activo' : 'No'}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-4 overflow-auto">{renderView()}</main>

    </div>
  );
}

// Gatekeeper login placeholder
function LoginGatekeeper() {
  return (
    <Login />
  );
}

export default App;
