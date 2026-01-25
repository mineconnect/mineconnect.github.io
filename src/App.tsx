import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Activity, Clock, User, Menu, X } from 'lucide-react';
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
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUser(profile);
        
        const { data: tripsData } = await supabase
          .from('trips')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false });

        if (tripsData) {
          setTrips(tripsData);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeTrips = trips.filter(trip => trip.status === 'en_curso');
  const completedTrips = trips.filter(trip => trip.status === 'finalizado');

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-primary text-xl">Cargando MineConnect SAT...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-primary text-white flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        className="w-80 bg-slate-900/90 backdrop-blur-lg border-r border-slate-700 fixed h-full z-50 lg:relative lg:translate-x-0"
      >
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">MineConnect SAT</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          {user && (
            <div className="mt-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium">{user.full_name}</p>
                <p className="text-sm text-slate-400 capitalize">{user.role}</p>
              </div>
            </div>
          )}
        </div>

        <nav className="p-4">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-all ${
              activeView === 'dashboard' 
                ? 'bg-primary text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5" />
              <span>Panel de Control</span>
            </div>
          </button>

          <button
            onClick={() => setActiveView('simulator')}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-all ${
              activeView === 'simulator' 
                ? 'bg-primary text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5" />
              <span>Simulador Pro</span>
            </div>
          </button>

          <button
            onClick={() => setActiveView('history')}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-all ${
              activeView === 'history' 
                ? 'bg-primary text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5" />
              <span>Historial</span>
            </div>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Viajes Activos</span>
                <span className="text-2xl font-bold text-accent">{activeTrips.length}</span>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Viajes Completados</span>
                <span className="text-2xl font-bold text-primary">{completedTrips.length}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-primary p-2 rounded-lg"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Main Content */}
      <main className="flex-1 relative">
        {activeView === 'dashboard' && (
          <div className="h-screen flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-20 h-20 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Panel de Control</h2>
              <p className="text-slate-400">Mapa interactivo de rastreo satelital</p>
              <div className="mt-8 grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-slate-700">
                  <div className="text-3xl font-bold text-accent">{activeTrips.length}</div>
                  <div className="text-sm text-slate-400">Unidades Activas</div>
                </div>
                <div className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-slate-700">
                  <div className="text-3xl font-bold text-primary">{completedTrips.length}</div>
                  <div className="text-sm text-slate-400">Viajes Hoy</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'simulator' && (
          <DriverSimulator 
            user={user}
            onTripUpdate={fetchUserAndTrips}
          />
        )}

        {activeView === 'history' && (
          <HistoryPanel 
            trips={trips}
            onRefresh={fetchUserAndTrips}
          />
        )}
      </main>
    </div>
  );
}

export default App;