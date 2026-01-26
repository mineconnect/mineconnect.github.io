import { useState } from 'react'; // useEffect quitado
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'; // Tooltip quitado
import { Clock, Navigation, Activity, Download, Eye } from 'lucide-react'; // MapPin, TrendingUp, AlertCircle quitados
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Trip, TripLog } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface HistoryPanelProps {
  trips: Trip[];
  onRefresh: () => void;
}

interface TripAnalysis {
  trip: Trip;
  logs: TripLog[];
  stops: Array<{
    lat: number;
    lng: number;
    startTime: string;
    duration: number;
  }>;
}

export default function HistoryPanel({ trips }: HistoryPanelProps) {
  const [selectedTrip, setSelectedTrip] = useState<TripAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  // hoveredPoint quitado

  const completedTrips = trips.filter(trip => trip.status === 'finalizado');

  const analyzeTrip = async (trip: Trip) => {
    if (!trip || !trip.id) return;

    setLoading(true);
    try {
      const { data: logs, error } = await supabase
        .from('trip_logs')
        .select('*')
        .eq('trip_id', trip.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (logs) {
        const stops = detectStops(logs);
        setSelectedTrip({ trip, logs, stops });
      }
    } catch (error) {
      console.error('Error analyzing trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectStops = (logs: TripLog[]) => {
    const stops = [];
    let currentStop = null;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      
      if (log.speed === 0 && !currentStop) {
        currentStop = {
          lat: log.lat,
          lng: log.lng,
          startTime: log.created_at,
          duration: 0
        };
      } else if (log.speed > 0 && currentStop) {
        const endTime = logs[i - 1]?.created_at || log.created_at;
        const duration = new Date(endTime).getTime() - new Date(currentStop.startTime).getTime();
        
        if (duration > 120000) {
          stops.push({ ...currentStop, duration });
        }
        currentStop = null;
      }
    }
    return stops;
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const generateReport = async () => {
    if (!selectedTrip) return;
    const reportElement = document.getElementById('trip-report');
    if (!reportElement) return;

    try {
      const canvas = await html2canvas(reportElement);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      pdf.addImage(imgData, 'PNG', 10, 10, 190, (canvas.height * 190) / canvas.width);
      pdf.save(`reporte-${selectedTrip.trip.plate}.pdf`);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const polylinePositions = selectedTrip?.logs.map(log => [log.lat, log.lng] as [number, number]) || [];

  return (
    <div className="h-screen bg-[#020617] text-white p-4">
      <div className="h-full max-w-7xl mx-auto">
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700 h-full overflow-hidden flex flex-col shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <Clock className="w-8 h-8" />
              <span>Historial de Viajes</span>
            </h2>
            <p className="text-blue-100 mt-1">Auditoría de telemetría y rutas satelitales</p>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-80 border-r border-slate-700 p-4 overflow-y-auto bg-slate-900/50">
              <div className="space-y-3">
                {completedTrips.map((trip) => (
                  <motion.div
                    key={trip.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => analyzeTrip(trip)}
                    className={`bg-slate-800/80 rounded-xl p-4 cursor-pointer border transition-all ${
                      selectedTrip?.trip.id === trip.id 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-blue-400 text-lg">{trip.plate}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(trip.start_time).toLocaleDateString()}
                        </div>
                      </div>
                      <Eye className={`w-4 h-4 ${selectedTrip?.trip.id === trip.id ? 'text-blue-400' : 'text-slate-500'}`} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-[#020617]">
              <AnimatePresence mode="wait">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Activity className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                    <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Descargando Logs...</p>
                  </div>
                ) : selectedTrip ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div id="trip-report" className="grid grid-cols-4 gap-4">
                       <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Vel. Máxima</p>
                          <p className="text-2xl font-bold text-blue-400">{Math.round(selectedTrip.trip.max_speed)} <span className="text-sm font-normal text-slate-600">km/h</span></p>
                       </div>
                       <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Vel. Promedio</p>
                          <p className="text-2xl font-bold text-emerald-400">{Math.round(selectedTrip.trip.avg_speed)} <span className="text-sm font-normal text-slate-600">km/h</span></p>
                       </div>
                       <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Puntos GPS</p>
                          <p className="text-2xl font-bold text-purple-400">{selectedTrip.logs.length}</p>
                       </div>
                       <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Paradas</p>
                          <p className="text-2xl font-bold text-yellow-400">{selectedTrip.stops.length}</p>
                       </div>
                    </div>

                    <div className="h-96 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative z-0">
                      <MapContainer
                        center={polylinePositions[0] || [-34.6037, -58.3816]}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Polyline positions={polylinePositions} color="#3b82f6" weight={5} />
                        {selectedTrip.stops.map((stop, i) => (
                          <Marker key={i} position={[stop.lat, stop.lng]}>
                            <Popup>Parada: {formatDuration(stop.duration)}</Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>

                    <button onClick={generateReport} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95">
                       <Download className="w-5 h-5" />
                       <span>Exportar Reporte Satelital</span>
                    </button>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-20">
                    <Navigation className="w-24 h-24 mb-4" />
                    <p className="text-xl font-bold">Seleccione un viaje</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}