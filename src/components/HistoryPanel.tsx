import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import { Navigation, Activity, TrendingUp, FileText, Globe } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Trip, TripLog, UserProfile } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const startIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDI1IDQxIiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTEyLjUgMEM1LjU5NjA0IDAgMCA1LjU5NjA0IDAgMTIuNUMwIDIwLjU5NjA0IDEyLjUgNDEgMTIuNSA0MUMyMi41IDMxLjU5NjA0IDI1IDIwLjU5NjA0IDI1IDEyLjVDMjUgNS41OTYwNCAxOS40MDM5IDAgMTIuNSAwWiIgZmlsbD0iIzEwYjk4MSIvPgo8Y2lyY2xlIGN4PSIxMi41IiBjeT0iMTIuNSIgcj0iOCIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDI1IDQxIiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTEyLjUgMEM1LjU5NjA0IDAgMCA1LjU5NjA0IDAgMTIuNUMwIDIwLjU5NjA0IDEyLjUgNDEgMTIuNSA0MUMyMi41IDMxLjU5NjA0IDI1IDIwLjU5NjA0IDI1IDEyLjVDMjUgNS41OTYwNCAxOS40MDM5IDAgMTIuNSAwWiIgZmlsbD0iI2VmNDQ0NCIvPgo8Y2lyY2xlIGN4PSIxMi41IiBjeT0iMTIuNSIgcj0iOCIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

interface HistoryPanelProps {
  trips: Trip[];
  user: UserProfile | null;
}

export default function HistoryPanel({ trips, user }: HistoryPanelProps) {
  const [selectedTrip, setSelectedTrip] = useState<{trip: Trip, logs: TripLog[], stops: any[]} | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const analyzeTrip = async (trip: Trip) => {
    if (!trip?.id) return;
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
      console.error("Error al analizar:", error);
    } finally {
      setLoading(false);
    }
  };

  const detectStops = (logs: TripLog[]) => {
    const stops = [];
    let currentStop: any = null;
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      if (log.speed === 0 && !currentStop) {
        currentStop = { lat: log.lat, lng: log.lng, startTime: log.created_at, duration: 0 };
      } else if (log.speed > 0 && currentStop) {
        const endTime = logs[i - 1].created_at;
        const duration = new Date(endTime).getTime() - new Date(currentStop.startTime).getTime();
        if (duration > 120000) { stops.push({ ...currentStop, duration }); }
        currentStop = null;
      }
    }
    return stops;
  };


  const generateReport = async () => {
    if (!selectedTrip || pdfGenerating) return;
    setPdfGenerating(true);
    try {
      const pdf = new jsPDF();
      const mapElement = document.querySelector('.leaflet-container');
      if (mapElement) {
        const mapCanvas = await html2canvas(mapElement as HTMLElement, { backgroundColor: '#020617', scale: 2 });
        pdf.addImage(mapCanvas.toDataURL('image/png'), 'PNG', 15, 140, 180, 100);
      }
      pdf.save(`MineConnect_Report_${selectedTrip.trip.plate}.pdf`);
    } catch (e) { alert('Error generando PDF'); }
    finally { setPdfGenerating(false); }
  };

  const isAdmin = user?.role === 'admin' || user?.email === 'fbarrosmarengo@gmail.com';
  const completedTrips = trips.filter(t => t.status === 'finalizado');
  const polylinePositions = selectedTrip?.logs.map(log => [log.lat, log.lng] as [number, number]) || [];

  return (
    <div className="h-screen p-4 lg:p-6 bg-[#020617]">
      <div className="h-full rounded-[2rem] border overflow-hidden flex flex-col bg-slate-900/95 border-slate-800 backdrop-blur-xl">
        <div className="p-4 lg:p-8 flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg">
          <div>
            <h2 className="text-2xl lg:text-3xl font-black flex items-center space-x-3 italic text-white">
              {isAdmin ? <Globe className="text-emerald-400" /> : <FileText />}
              <span>HISTORIAL SAT</span>
              {isAdmin && <span className="text-sm text-emerald-400 font-normal ml-2">(GLOBAL)</span>}
            </h2>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-full sm:w-80 border-r border-slate-800 p-4 lg:p-6 overflow-y-auto space-y-4 bg-slate-900/20">
            {completedTrips.map((trip) => (
              <motion.div
                key={trip.id}
                onClick={() => analyzeTrip(trip)}
                className={`p-4 lg:p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedTrip?.trip.id === trip.id 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-400 shadow-xl' 
                    : 'bg-slate-800/50 border-slate-700 hover:border-blue-500'
                }`}
              >
                <span className="text-lg font-black italic text-white">{trip.plate}</span>
                <p className="text-[10px] font-black uppercase opacity-60 text-slate-400">{new Date(trip.start_time).toLocaleDateString()}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
            <AnimatePresence mode="wait">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-white italic">CARGANDO...</div>
              ) : selectedTrip ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-6 rounded-3xl border bg-slate-800/50 border-blue-600/30">
                      <TrendingUp className="text-blue-400 mb-2" />
                      <p className="text-2xl font-black text-white">{Math.round(selectedTrip.trip.max_speed)}</p>
                      <p className="text-[10px] font-black uppercase text-slate-400">Km/h Max</p>
                    </div>
                    <div className="p-6 rounded-3xl border bg-slate-800/50 border-emerald-600/30">
                      <Activity className="text-emerald-400 mb-2" />
                      <p className="text-2xl font-black text-white">{Math.round(selectedTrip.trip.avg_speed)}</p>
                      <p className="text-[10px] font-black uppercase text-slate-400">Km/h Prom</p>
                    </div>
                  </div>

                  {polylinePositions.length > 0 && (
                    <div className="h-[450px] rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl relative z-0">
                      <MapContainer center={polylinePositions[0]} zoom={15} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Polyline positions={polylinePositions} color="#3b82f6" weight={4} />
                        <Marker position={polylinePositions[0]} icon={startIcon} />
                        <Marker position={polylinePositions[polylinePositions.length - 1]} icon={endIcon} />
                      </MapContainer>
                    </div>
                  )}

                  <motion.button
                    onClick={generateReport}
                    disabled={pdfGenerating}
                    className="w-full py-5 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:opacity-50"
                  >
                    {pdfGenerating ? 'GENERANDO...' : 'GENERAR DOCUMENTACIÓN SAT'}
                  </motion.button>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-white">
                  <Navigation className="w-32 h-32 mb-4" />
                  <p className="text-2xl font-black italic">ESPERANDO SELECCIÓN</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}