import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Activity, Clock, User, Menu, X, ShieldCheck, ChevronRight } from 'lucide-react';
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

  useEffect(() => {
    fetchUserAndTrips();
  }, []);

  const fetchUserAndTrips = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
          const demoProfile = { id: 'demo', full_name: 'Invitado MineConnect', company_id: '00000000-0000-0000-0000-000000000000', role: 'admin' };
          setUser(demoProfile as any);
          await loadTrips(demoProfile.company_id);
          return;
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      if (profile) {
        setUser(profile);
        await loadTrips(profile.company_id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrips = async (companyId: string) => {
      if (!companyId) return;
      const { data } = await supabase.from('trips').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
      if (data) setTrips(data);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
      <Activity className="w-12 h-12 text-blue-500 animate-spin mb-4" />
      <p className="text-blue-400 font-bold tracking-widest">MINECONNECT SAT</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white flex overflow-hidden">
      {/* Sidebar Industrial */}
      <AnimatePresence>
        {(sidebarOpen || window.innerWidth > 1024) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-72 bg-slate-900 border-r border-slate-800 fixed lg:relative h-full z-50 flex flex-col"
          >
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-8 h-8 text-blue-500" />
                  <h1 className="text-xl font-black tracking-tighter">MINE<span className="text-blue-500">CONNECT</span></h1>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden"><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              {user && (
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 flex items-center space-x-3 shadow-inner">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center font-bold shadow-lg">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold truncate">{user.full_name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{user.role}</p>
                  </div>
                </div>
              )}
            </div>

            <nav className="p-4 flex-1 space-y-2">
              {[
                { id: 'dashboard', icon: MapPin, label: 'Panel Global' },
                { id: 'simulator', icon: Activity, label: 'Simulador Pro' },
                { id: 'history', icon: Clock, label: 'Historial SAT' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveView(item.id as any); setSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                    activeView === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5" />
                    <span className="font-bold text-sm">{item.label}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${activeView === item.id ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:opacity-100'}`} />
                </button>
              ))}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Trigger */}
      <button onClick={() => setSidebarOpen(true)} className="lg:hidden fixed top-6 left-6 z-40 bg-blue-600 p-3 rounded-xl shadow-xl">
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Main View */}
      <main className="flex-1 relative h-screen overflow-y-auto">
        {activeView === 'dashboard' && (
          <div className="h-full flex items-center justify-center p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
              <div className="bg-slate-900/50 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-md">
                <Activity className="text-blue-500 w-12 h-12 mb-6" />
                <div className="text-6xl font-black mb-2">{trips.filter(t => t.status === 'en_curso').length}</div>
                <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">Unidades Activas</div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-md">
                <Clock className="text-emerald-500 w-12 h-12 mb-6" />
                <div className="text-6xl font-black mb-2">{trips.filter(t => t.status === 'finalizado').length}</div>
                <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">Viajes Realizados</div>
              </div>
            </div>
          </div>
        )}
        {activeView === 'simulator' && <DriverSimulator user={user} onTripUpdate={fetchUserAndTrips} />}
        {activeView === 'history' && <HistoryPanel trips={trips} onRefresh={fetchUserAndTrips} />}
      </main>
    </div>
  );
}

export default App;