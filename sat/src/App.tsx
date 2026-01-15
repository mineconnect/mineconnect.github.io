import React, { useState } from 'react';
import { LayoutDashboard, Settings, LogOut, Globe, Shield, Smartphone } from 'lucide-react';
import DashboardMap from './components/DashboardMap';
import AdminPanel from './components/AdminPanel';
import GeminiTools from './components/GeminiTools';
import Login from './components/Login';
import type { UserProfile } from './types';
import { saveLocationUpdate, supabase } from './services/supabaseClient';

// Driver Simulator Component (simulating the Phone App behavior)
const DriverSimulator = ({ onClose, user }: { onClose: () => void, user: UserProfile }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [mockTripId] = useState(`trip-${Math.floor(Math.random()*1000)}`);

  const toggleTracking = () => {
    if (isTracking) {
      setIsTracking(false);
      setLogs(p => ["Tracking detenido.", ...p]);
    } else {
      setIsTracking(true);
      setLogs(p => ["Iniciando GPS Satelital...", ...p]);
      // Simulate GPS loop
      const interval = setInterval(() => {
        if (!isTracking && Math.random() > 2) clearInterval(interval);
        
        // Mock Movement (Argentina coords)
        const lat = -34.6037 + (Math.random() - 0.5) * 0.01;
        const lng = -58.3816 + (Math.random() - 0.5) * 0.01;
        const speed = Math.floor(Math.random() * 80);
        
        saveLocationUpdate(mockTripId, lat, lng, speed);
        
        setLogs(p => [`Enviado: ${lat.toFixed(4)}, ${lng.toFixed(4)} | ${navigator.onLine ? 'Online' : 'OFFLINE (Cola)'}`, ...p.slice(0, 9)]);
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative h-[640px] flex flex-col font-sans">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-10"></div>
        
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-white relative">
          <div className="absolute top-4 right-4 text-xs font-mono text-green-400">5G</div>
          
          <Globe className="w-16 h-16 text-blue-500 mb-6" />
          <h2 className="text-2xl font-bold mb-2">MineConnect Driver</h2>
          <p className="text-gray-400 text-sm mb-1">Usuario: {user.email}</p>
          <p className="text-gray-500 text-xs mb-8">Empresa ID: {user.company_id?.substring(0,8) || 'N/A'}</p>

          <button
             onClick={toggleTracking}
             className={`w-48 h-48 rounded-full border-8 flex items-center justify-center transition-all duration-300 ${
               isTracking ? 'border-red-500 bg-red-500/20 text-red-400 shadow-[0_0_40px_rgba(239,68,68,0.4)]' : 'border-green-500 bg-green-500/20 text-green-400 shadow-[0_0_40px_rgba(34,197,94,0.3)]'
             }`}
          >
            <div className="text-center">
              <span className="block text-3xl font-bold tracking-wider">{isTracking ? 'STOP' : 'START'}</span>
              <span className="text-sm uppercase mt-1">VIAJE</span>
            </div>
          </button>

          <div className="w-full mt-8 bg-black/60 rounded-lg p-3 h-36 overflow-hidden font-mono text-xs text-green-300 border border-gray-800">
            {logs.map((l, i) => <div key={i} className="whitespace-nowrap">{l}</div>)}
            {logs.length === 0 && <span className="opacity-50">Esperando inicio...</span>}
          </div>
        </div>

        <button onClick={onClose} className="bg-gray-800 text-white py-4 font-bold hover:bg-gray-700 transition-colors">
          Cerrar Simulación
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');
  const [showTools, setShowTools] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  const handleLoginSuccess = (profile: UserProfile) => {
    setCurrentUser(profile);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-brand-gray-50 text-brand-gray-900 font-sans overflow-hidden">
      {showSimulator && currentUser && <DriverSimulator onClose={() => setShowSimulator(false)} user={currentUser} />}

      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-brand-gray-900 text-white flex flex-col transition-all duration-300 flex-shrink-0 z-50">
        <div className="p-6 flex items-center gap-3 h-16 border-b border-brand-gray-800">
          <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight hidden lg:block text-white">MineConnect<span className="text-brand-blue">SAT</span></span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
              view === 'dashboard' ? 'bg-brand-blue text-white shadow-lg' : 'text-gray-400 hover:bg-brand-gray-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="hidden lg:block">Monitoreo</span>
          </button>
          
          <button
            onClick={() => setView('admin')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
              view === 'admin' ? 'bg-brand-blue text-white shadow-lg' : 'text-gray-400 hover:bg-brand-gray-800 hover:text-white'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="hidden lg:block">
              {currentUser?.role === 'super_admin' ? 'Admin Global' : 'Mi Empresa'}
            </span>
          </button>

          <button
            onClick={() => setShowTools(!showTools)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
              showTools ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:bg-brand-gray-800 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="hidden lg:block">Herramientas IA</span>
          </button>

           <button
            onClick={() => setShowSimulator(true)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all text-green-400 hover:bg-brand-gray-800 hover:text-green-300 mt-4 border border-green-500/30`}
          >
            <Smartphone className="w-5 h-5" />
            <span className="hidden lg:block">App Conductor</span>
          </button>
        </nav>

        <div className="p-4 border-t border-brand-gray-800">
          <div className="mb-4 px-2 hidden lg:block">
              <p className="text-xs text-gray-400">Logueado como:</p>
              <p className="text-sm font-bold text-white truncate">{currentUser?.full_name || currentUser?.email}</p>
              <p className="text-xs text-brand-blue uppercase mt-1 font-semibold tracking-wider">{currentUser?.role.replace('_', ' ')}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white hover:bg-brand-gray-800 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="hidden lg:block font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-brand-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-2xl font-bold text-brand-gray-900">
            {view === 'dashboard' ? 'Centro de Control Satelital' : (currentUser?.role === 'super_admin' ? 'Super Admin Panel' : 'Gestión de Flota')}
          </h1>
          <div className="flex items-center gap-4">
             {currentUser?.company_id && (
                 <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                     ID: {currentUser.company_id}
                 </span>
             )}
            <div className="w-10 h-10 bg-brand-gray-200 rounded-full border-2 border-white shadow-inner overflow-hidden">
                <img src={`https://ui-avatars.com/api/?name=${currentUser?.full_name || currentUser?.email}&background=0D8ABC&color=fff&bold=true`} alt="Avatar" />
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-brand-gray-100">
          <div className="flex h-full gap-6">
              <div className={`flex-1 flex flex-col h-full transition-all duration-300`}>
                  <div className="flex-1 h-full overflow-y-auto">
                      {view === 'dashboard' ? <DashboardMap /> : <AdminPanel currentUser={currentUser} />}
                  </div>
              </div>

              {/* AI Tools Slide-over Panel */}
              <div className={`fixed top-0 right-0 bottom-0 w-[450px] bg-white shadow-2xl z-[100] transform transition-transform duration-500 ease-in-out ${showTools ? 'translate-x-0' : 'translate-x-full'}`}>
                 <GeminiTools />
              </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
