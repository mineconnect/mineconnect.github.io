import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Activity, Clock, ShieldCheck } from 'lucide-react'; // Limpio
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUser(profile);
        await loadTrips(profile.company_id);
      }
    } catch (error) {
      console.error('Error general:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrips = async (companyId: string) => {
      if (!companyId) return;
      const { data } = await supabase
          .from('trips')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
      
      if (data) setTrips(data);
  };

  const activeTrips = trips.filter(trip => trip.status === 'en_curso');
  const completedTrips = trips.filter(trip => trip.status === 'finalizado');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <Activity className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <div className="text-blue-400 font-bold text-xl tracking-widest">MINECONNECT SAT</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex">
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        className="w-72 bg-slate-900 border-r border-slate-800 fixed h-full z-50 lg:relative lg:translate-x-0"
      >
        <div className="p-6 border-b border-slate-800">
           <div className="flex items-center space-x-2 mb-6">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl font-black tracking-tighter">MINE<span className="text-blue-500">CONNECT</span></h1>
           </div>
           {user && (
               <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold">
                      {user.full_name[0]}
                  </div>
                  <div className="overflow-hidden">
                      <p className="text-sm font-bold truncate">{user.full_name}</p>
                      <p className="text-xs text-slate-500 uppercase">{user.role}</p>
                  </div>
               </div>
           )}
        </div>

        <nav className="p-4 space-y-2">
           {[
               { id: 'dashboard', icon: MapPin, label: 'Panel Global' },
               { id: 'simulator', icon: Activity, label: 'Simulador Pro' },
               { id: 'history', icon: Clock, label: 'Historial SAT' }
           ].map((item) => (
               <button
                key={item.id}
                onClick={() => { setActiveView(item.id as any); setSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    activeView === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800'
                }`}
               >
                  <item.icon className="w-5 h-5" />
                  <span className="font-bold text-sm">{item.label}</span>
               </button>
           ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800 space-y-3">
            <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">SISTEMA ACTIVO</span>
                <span className="text-emerald-500">ONLINE</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-2/3 animate-pulse"></div>
            </div>
        </div>
      </motion.aside>

      <main className="flex-1 relative overflow-hidden">
        {activeView === 'dashboard' && (
            <div className="h-screen flex flex-col items-center justify-center p-10">
                <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
                        <Activity className="text-blue-500 w-12 h-12 mb-4" />
                        <div className="text-5xl font-black mb-2">{activeTrips.length}</div>
                        <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">Unidades en Tránsito</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
                        <Clock className="text-emerald-500 w-12 h-12 mb-4" />
                        <div className="text-5xl font-black mb-2">{completedTrips.length}</div>
                        <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">Viajes Finalizados</div>
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