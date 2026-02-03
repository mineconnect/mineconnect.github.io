import { useState } from 'react';
import { Toaster } from 'sonner';
import Sidebar from './components/Layout/Sidebar';
import SatelliteMap from './components/Map/SatelliteMap';
import { Analytics } from './pages/Analytics';
import { SecurityUsageView } from './components/SecurityUsageView';
import { useUI } from './context/UIContext';
import { useAuth } from './context/AuthContext';
import { useVehicles } from './context/VehicleContext';
import Login from './components/Auth/Login';

function App() {
    const { activeTab } = useUI();
    const { session, loading } = useAuth();
    const { logSecurityEvent } = useVehicles();
    const [sosActive, setSosActive] = useState(false);

    const handleSOS = async () => {
        if (!sosActive) {
            // Activate SOS
            setSosActive(true);
            await logSecurityEvent('SOS', 'critical', { message: 'SOS Activado por conductor' });
        } else {
            // Deactivate SOS
            setSosActive(false);
            await logSecurityEvent('SOS_RESOLVED', 'info', { message: 'Emergencia finalizada por usuario' });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-bg-primary">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-primary font-medium animate-pulse">Cargando datos de flota...</p>
            </div>
        );
    }

    if (!session) {
        return <Login />;
    }

    return (
        <div className="flex h-screen bg-bg-primary text-white overflow-hidden font-outfit">
            <Sidebar />

            <main className="flex-1 relative">
                {activeTab === 'map' && <SatelliteMap />}
                {activeTab === 'analytics' && <Analytics />}
                {activeTab === 'audit' && <SecurityUsageView />}

                {activeTab !== 'map' && activeTab !== 'audit' && activeTab !== 'analytics' && (
                    <div className="w-full h-full flex items-center justify-center glass flex-col">
                        <h2 className="text-3xl font-bold text-accent mb-4">Sección en Construcción</h2>
                        <p className="text-gray-400">Módulo: {activeTab.toUpperCase()}</p>
                    </div>
                )}

                {/* Global Overlays: SOS Button */}
                <button
                    onClick={handleSOS}
                    className={`absolute bottom-8 right-8 z-[500] w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer group 
                    ${sosActive
                            ? 'bg-red-600 animate-shake shadow-[0_0_50px_rgba(255,0,0,0.8)] scale-110'
                            : 'bg-gradient-to-br from-red-600 to-red-500 shadow-[0_0_40px_rgba(255,76,41,0.4)] hover:scale-110'
                        }`}
                >
                    <span className={`font-bold text-white text-xs tracking-widest ${sosActive ? '' : 'group-hover:hidden'}`}>
                        {sosActive ? 'FIN' : 'SOS'}
                    </span>
                    {!sosActive && (
                        <span className="hidden group-hover:block text-white font-bold text-xs">AYUDA</span>
                    )}
                </button>
            </main>
            <Toaster position="top-right" expand={true} richColors closeButton />
        </div>
    );
}

export default App;
