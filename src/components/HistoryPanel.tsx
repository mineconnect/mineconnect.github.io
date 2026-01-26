import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { Clock, Navigation, Activity, Download, Eye, MapPin, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Trip, TripLog } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function HistoryPanel({ trips }: { trips: Trip[], onRefresh: () => void }) {
  const [selectedTrip, setSelectedTrip] = useState<{trip: Trip, logs: TripLog[], stops: any[]} | null>(null);
  const [loading, setLoading] = useState(false);

  const analyzeTrip = async (trip: Trip) => {
    if (!trip?.id) return;
    setLoading(true);
    try {
      const { data: logs } = await supabase.from('trip_logs').select('*').eq('trip_id', trip.id).order('created_at', { ascending: true });
      if (logs) setSelectedTrip({ trip, logs, stops: [] });
    } catch (error) {
      console.error("Error al analizar:", error);
    } finally {
      setLoading(false);
    }
  };

  const polylinePositions = selectedTrip?.logs.map(log => [log.lat, log.lng] as [number, number]) || [];

  // FUNCIÓN DE REPORTE ACTIVA (Usa jsPDF y html2canvas)
  const generateReport = async () => {
    const report = document.getElementById('trip-report-area');
    if (!report || !selectedTrip) return;
    
    const canvas = await html2canvas(report);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.text(`Reporte de Unidad: ${selectedTrip.trip.plate}`, 10, 10);
    pdf.addImage(imgData, 'PNG', 10, 20, 190, 0);
    pdf.save(`MineConnect_SAT_${selectedTrip.trip.plate}.pdf`);
  };

  return (
    <div className="h-screen bg-[#020617] p-4 lg:p-8">
      <div className="h-full bg-slate-900/50 rounded-[2rem] border border-slate-800 overflow-hidden flex flex-col backdrop-blur-xl">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8 flex justify-between items-center shadow-lg">
          <div>
            <h2 className="text-3xl font-black flex items-center space-x-3 italic">
              <Clock className="w-8 h-8" />
              <span>HISTORIAL SAT</span>
            </h2>
            <p className="text-blue-100 text-sm font-bold opacity-80 uppercase tracking-tighter">Auditoría de Flota en Tiempo Real</p>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Listado de Viajes */}
          <div className="w-80 border-r border-slate-800 p-6 overflow-y-auto space-y-4 bg-slate-900/20">
            {trips.filter(t => t.status === 'finalizado').map((trip) => (
              <motion.div
                key={trip.id}
                whileHover={{ x: 5 }}
                onClick={() => analyzeTrip(trip)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedTrip?.trip.id === trip.id ? 'bg-blue-600 border-blue-400 shadow-xl' : 'bg-slate-800/50 border-slate-700 hover:border-blue-500'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xl font-black italic">{trip.plate}</span>
                  <Eye className="w-4 h-4 opacity-50" />
                </div>
                <p className="text-[10px] mt-2 opacity-60 font-black uppercase tracking-widest">{new Date(trip.start_time).toLocaleString('es-AR')}</p>
              </motion.div>
            ))}
          </div>

          {/* Área de Análisis */}
          <div id="trip-report-area" className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center opacity-50">
                  <Activity className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                  <p className="font-black italic tracking-widest">SINCRONIZANDO TELEMETRÍA...</p>
                </div>
              ) : selectedTrip ? (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                  
                  {/* Grid de Estadísticas */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700 shadow-xl">
                      <TrendingUp className="w-5 h-5 text-blue-500 mb-3" />
                      <p className="text-3xl font-black text-white">{Math.round(selectedTrip.trip.max_speed)}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase italic">Km/h Max</p>
                    </div>
                    <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700 shadow-xl">
                      <Activity className="w-5 h-5 text-emerald-500 mb-3" />
                      <p className="text-3xl font-black text-white">{Math.round(selectedTrip.trip.avg_speed)}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase italic">Km/h Prom</p>
                    </div>
                    <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700 shadow-xl">
                      <MapPin className="w-5 h-5 text-purple-500 mb-3" />
                      <p className="text-3xl font-black text-white">{selectedTrip.logs.length}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase italic">Logs GPS</p>
                    </div>
                    <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700 shadow-xl">
                      <AlertCircle className="w-5 h-5 text-yellow-500 mb-3" />
                      <p className="text-3xl font-black text-white">{selectedTrip.stops.length}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase italic">Paradas</p>
                    </div>
                  </div>

                  {/* Mapa Industrial */}
                  <div className="h-[450px] rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl relative z-0">
                    <MapContainer center={polylinePositions[0] || [-34.6, -58.4]} zoom={15} style={{ height: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      
                      {/* Marcadores de Inicio y Fin (Usa Marker y Popup) */}
                      {polylinePositions.length > 0 && (
                        <>
                          <Marker position={polylinePositions[0]}>
                            <Popup><span className="font-bold">PUNTO DE ORIGEN</span></Popup>
                          </Marker>
                          <Marker position={polylinePositions[polylinePositions.length - 1]}>
                            <Popup><span className="font-bold">PUNTO DE CIERRE</span></Popup>
                          </Marker>
                        </>
                      )}

                      <Polyline positions={polylinePositions} color="#3b82f6" weight={7} opacity={0.6} />
                    </MapContainer>
                  </div>

                  <button 
                    onClick={generateReport}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-black flex items-center space-x-3 transition-all transform active:scale-95 shadow-lg shadow-blue-600/30"
                  >
                    <Download className="w-6 h-6" />
                    <span>GENERAR DOCUMENTACIÓN SAT</span>
                  </button>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-10">
                  <Navigation className="w-32 h-32 mb-4" />
                  <p className="text-2xl font-black italic tracking-tighter">ESPERANDO SELECCIÓN DE UNIDAD</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}