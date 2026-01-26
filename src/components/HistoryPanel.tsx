import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip } from 'react-leaflet';
import { Clock, Download, Eye, MapPin, Activity, AlertCircle, TrendingUp, FileText, Calendar, User, Globe } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { UserProfile } from '../App'; // Import UserProfile from App

// --- Leaflet Icon Fix ---
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const startIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDI1IDQxIj48cGF0aCBkPSJNMTIuNSAwQzUuNTkgMCAwIDUuNTkgMCAxMi41QzAgMjAuNiAxMi41IDQxIDEyLjUgNDFDMjIuNSAzMS42IDI1IDIwLjYgMjUgMTIuNUMyNSA1LjU5IDE5LjQgMCAxMi41IDBaIiBmaWxsPSIjMGI4N2ZmIi8+PGNpcmNsZSBjeD0iMTIuNSIgY3k9IjEyLjUiIHI9IjUiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
  iconSize: [25, 41], iconAnchor: [12, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDI1IDQxIj48cGF0aCBkPSJNMTIuNSAwQzUuNTkgMCAwIDUuNTkgMCAxMi41QzAgMjAuNiAxMi41IDQxIDEyLjUgNDFDMjIuNSAzMS42IDI1IDIwLjYgMjUgMTIuNUMyNSA1LjU5IDE5LjQgMCAxMi41IDBaIiBmaWxsPSIjZmM1NjNhIi8+PGNpcmNsZSBjeD0iMTIuNSIgY3k9IjEyLjUiIHI9IjUiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
  iconSize: [25, 41], iconAnchor: [12, 41]
});


// --- Types ---
interface Trip {
  id: string;
  plate: string;
  driver_name: string;
  start_time: string;
  end_time: string | null;
  status: 'en_curso' | 'finalizado';
  max_speed: number;
  avg_speed: number;
}

interface TripLog {
  lat: number;
  lng: number;
  speed: number;
  created_at: string;
}

interface HistoryPanelProps {
  userProfile: UserProfile | null;
}

// --- Component ---
export default function HistoryPanel({ userProfile }: HistoryPanelProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<{ trip: Trip; logs: TripLog[] } | null>(null);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('mineconnect-theme') || 'dark');

  useEffect(() => {
    const handleThemeChange = () => {
        setTheme(localStorage.getItem('mineconnect-theme') || 'dark');
    };
    window.addEventListener('storage', handleThemeChange);
    return () => window.removeEventListener('storage', handleThemeChange);
  }, []);

  useEffect(() => {
    const fetchTrips = async () => {
      if (!userProfile) return;

      setLoadingTrips(true);
      let query = supabase.from('trips').select('*');

      // RBAC: Filter by company for Coordinators
      if (userProfile.role === 'COORDINADOR') {
        query = query.eq('company_id', userProfile.company_id);
      }
      
      // Superadmins see all trips, so no extra filter is needed.
      query = query.eq('status', 'finalizado').order('start_time', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching history trips:", error);
        setTrips([]);
      } else {
        setTrips(data as Trip[]);
      }
      setLoadingTrips(false);
    };

    fetchTrips();
    
    // Realtime subscription
    const channel = supabase
      .channel('public:trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, fetchTrips)
      .subscribe();
      
    return () => {
        supabase.removeChannel(channel);
    };

  }, [userProfile]);

  const handleAnalyzeTrip = async (trip: Trip) => {
    setLoadingLogs(true);
    setSelectedTrip({ trip, logs: [] }); // Show trip info immediately

    const { data, error } = await supabase
      .from('trip_logs')
      .select('lat, lng, speed, created_at')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching trip logs:", error);
    } else {
      setSelectedTrip({ trip, logs: data as TripLog[] });
    }
    setLoadingLogs(false);
  };
  
  const polylinePositions = selectedTrip?.logs.map(log => [log.lat, log.lng] as [number, number]) || [];
  
  const isSuperAdmin = userProfile?.role === 'SUPERADMIN';

  return (
    <div className={`h-screen flex flex-col p-4 lg:p-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'}`}>
        <header className="mb-4">
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Clock/> Historial de Viajes
                {isSuperAdmin && <span className="text-sm font-normal text-emerald-400">(SUPERADMIN)</span>}
            </h1>
        </header>

        <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Trips List */}
            <div className={``w-1/3 rounded-lg p-4 overflow-y-auto `${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'}`}>
                {loadingTrips ? (
                    <div className="flex justify-center items-center h-full"><Activity className="animate-spin text-blue-500"/></div>
                ) : (
                    <div className="space-y-3">
                        {trips.map(trip => (
                            <motion.div
                                key={trip.id}
                                whileHover={{ scale: 1.03 }}
                                onClick={() => handleAnalyzeTrip(trip)}
                                className={`p-4 rounded-lg cursor-pointer border ${
                                    selectedTrip?.`trip.id` === `trip.id`
                                        ? 'bg-blue-600 text-white border-blue-400'
                                        : `${theme === 'dark' ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-gray-200 border-gray-300 hover:bg-gray-300'}`
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <p className="font-bold">{trip.plate}</p>
                                    <p className="text-xs">{new Date(trip.start_time).toLocaleDateString()}</p>
                                </div>
                                <p className="text-xs opacity-70">{trip.driver_name}</p>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Trip Details */}
            <div className={``w-2/3 rounded-lg p-4 flex flex-col gap-4 overflow-y-auto `${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'}`}>
                {loadingLogs && (
                    <div className="flex justify-center items-center h-full"><Activity className="animate-spin text-blue-500"/></div>
                )}
                {!selectedTrip && !loadingLogs && (
                    <div className="flex justify-center items-center h-full text-slate-500">Seleccione un viaje para ver los detalles.</div>
                )}
                {selectedTrip && (
                    <>
                        <h2 className="text-xl font-bold">{selectedTrip.trip.plate}</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}`}>
                                <p className="text-sm opacity-70">Velocidad Máx.</p>
                                <p className="text-2xl font-bold">{Math.round(selectedTrip.trip.max_speed)} <span className="text-sm">km/h</span></p>
                            </div>
                            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}`}>
                                <p className="text-sm opacity-70">Velocidad Prom.</p>
                                <p className="text-2xl font-bold">{Math.round(selectedTrip.trip.avg_speed)} <span className="text-sm">km/h</span></p>
                            </div>
                        </div>
                        <div className="h-96 rounded-lg overflow-hidden">
                          {polylinePositions.length > 0 ? (
                            <MapContainer center={polylinePositions[0]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <Polyline positions={polylinePositions} color="blue" />
                                <Marker position={polylinePositions[0]} icon={startIcon}>
                                    <Tooltip>Inicio</Tooltip>
                                </Marker>
                                <Marker position={polylinePositions[polylinePositions.length - 1]} icon={endIcon}>
                                    <Tooltip>Fin</Tooltip>
                                </Marker>
                            </MapContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center bg-slate-700 text-slate-400">No hay datos de ruta para mostrar.</div>
                          )}
                        </div>
                    </>
                )}
            </div>
        </div>
    </div>
  );
}
