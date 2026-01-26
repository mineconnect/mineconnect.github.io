import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip } from 'react-leaflet';
import { Clock, Navigation, Activity, Download, Eye, MapPin, TrendingUp, AlertCircle, FileText, Calendar, User } from 'lucide-react';
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

// Custom icons for markers
const startIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDI1IDQxIiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTEyLjUgMEM1LjU5NjA0IDAgMCA1LjU5NjA0IDAgMTIuNUMwIDIwLjU5NjA0IDEyLjUgNDEgMTIuNSA0MUMyMi41IDMxLjU5NjA0IDI1IDIwLjU5NjA0IDI1IDEyLjVDMjUgNS41OTYwNCAxOS40MDM5IDAgMTIuNSAwWiIgZmlsbD0iIzEwYjk4MSIvPgo8Y2lyY2xlIGN4PSIxMi41IiBjeT0iMTIuNSIgcj0iOCIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -41]
});

const endIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDI1IDQxIiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTEyLjUgMEM1LjU5NjA0IDAgMCA1LjU5NjA0IDAgMTIuNUMwIDIwLjU5NjA0IDEyLjUgNDEgMTIuNSA0MUMyMi41IDMxLjU5NjA0IDI1IDIwLjU5NjA0IDI1IDEyLjVDMjUgNS41OTYwNCAxOS40MDM5IDAgMTIuNSAwWiIgZmlsbD0iI2VmNDQ0NCIvPgo8Y2lyY2xlIGN4PSIxMi41IiBjeT0iMTIuNSIgcj0iOCIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -41]
});

export default function HistoryPanel({ trips }: { trips: Trip[], onRefresh?: () => void }) {
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

      if (error) {
        console.error("Error fetching logs:", error);
        setSelectedTrip({ trip, logs: [], stops: [] });
        return;
      }

      if (logs) {
        const stops = detectStops(logs);
        setSelectedTrip({ trip, logs, stops });
      }
    } catch (error) {
      console.error("Error al analizar:", error);
      setSelectedTrip({ trip, logs: [], stops: [] });
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
        const endTime = logs[i - 1].created_at;
        const duration = new Date(endTime).getTime() - new Date(currentStop.startTime).getTime();
        
        if (duration > 120000) { // Más de 2 minutos
          stops.push({
            ...currentStop,
            duration
          });
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
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const polylinePositions = selectedTrip?.logs.map(log => [log.lat, log.lng] as [number, number]) || [];

  // FUNCIÓN DE REPORTE PDF PROFESIONAL
  const generateReport = async () => {
    if (!selectedTrip || pdfGenerating) return;
    
    setPdfGenerating(true);
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header profesional
      pdf.setFillColor(2, 6, 23);
      pdf.rect(0, 0, 210, 40, 'F');
      
      // Logo y título
      pdf.setFontSize(24);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MineConnect SAT', 15, 20);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(147, 197, 253);
      pdf.text('Sistema Avanzado de Rastreo Satelital', 15, 28);
      
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 15, 35);

      // Información del viaje
      pdf.setFillColor(30, 41, 59);
      pdf.rect(0, 45, 210, 30, 'F');
      
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INFORMACIÓN DEL VIAJE', 15, 58);
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Patente: ${selectedTrip.trip.plate}`, 15, 68);
      pdf.text(`Conductor: ${selectedTrip.trip.driver_name}`, 100, 68);
      pdf.text(`Inicio: ${new Date(selectedTrip.trip.start_time).toLocaleString('es-AR')}`, 15, 73);

      // Estadísticas principales
      pdf.setFillColor(51, 65, 85);
      pdf.rect(15, 85, 180, 40, 'F');
      
      pdf.setFontSize(12);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ESTADÍSTICAS DE TELEMETRÍA', 20, 100);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Velocidad Máxima: ${Math.round(selectedTrip.trip.max_speed)} km/h`, 20, 110);
      pdf.text(`Velocidad Promedio: ${Math.round(selectedTrip.trip.avg_speed)} km/h`, 20, 115);
      pdf.text(`Puntos GPS Registrados: ${selectedTrip.logs.length}`, 20, 120);
      pdf.text(`Paradas Detectadas: ${selectedTrip.stops.length}`, 20, 125);

      // Captura del mapa
      const mapElement = document.querySelector('.leaflet-container');
      if (mapElement) {
        const mapCanvas = await html2canvas(mapElement as HTMLElement, {
          backgroundColor: '#020617',
          scale: 2
        });
        const mapImgData = mapCanvas.toDataURL('image/png');
        pdf.addImage(mapImgData, 'PNG', 15, 135, 180, 100);
      }

      // Detalles de paradas si existen
      if (selectedTrip.stops.length > 0) {
        pdf.addPage();
        
        pdf.setFillColor(2, 6, 23);
        pdf.rect(0, 0, 210, 40, 'F');
        
        pdf.setFontSize(20);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PARADAS DETECTADAS', 15, 25);
        
        let yPosition = 50;
        selectedTrip.stops.forEach((stop, index) => {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(255, 255, 255);
          pdf.text(`Parada ${index + 1}:`, 15, yPosition);
          pdf.text(`Duración: ${formatDuration(stop.duration)}`, 60, yPosition);
          pdf.text(`Hora: ${new Date(stop.startTime).toLocaleTimeString('es-AR')}`, 120, yPosition);
          yPosition += 10;
        });
      }

      // Pie de página
      pdf.setFontSize(8);
      pdf.setTextColor(147, 197, 253);
      pdf.text('Reporte generado automáticamente por MineConnect SAT Enterprise Edition', 105, 290, { align: 'center' });
      
      // Guardar PDF
      pdf.save(`MineConnect_SAT_Report_${selectedTrip.trip.plate}_${Date.now()}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el reporte PDF');
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div className="h-screen bg-dark-primary p-4 lg:p-6 safe-area">
      <div className="h-full bg-slate-900/95 backdrop-blur-xl rounded-[2rem] border border-slate-800 overflow-hidden flex flex-col mobile-landscape-compact">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 lg:p-8 flex justify-between items-center shadow-lg safe-area-top">
          <div>
            <h2 className="text-2xl lg:text-3xl font-black flex items-center space-x-3 italic">
              <FileText className="w-6 h-6 lg:w-8 lg:h-8 hardware-accelerated" />
              <span>HISTORIAL SAT</span>
            </h2>
            <p className="text-blue-100 text-xs lg:text-sm font-bold opacity-80 uppercase tracking-tighter">
              Auditoría de Flota en Tiempo Real
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center space-x-2 text-white/70">
              <Activity className="w-4 h-4" />
              <span className="text-xs">{trips.filter(t => t.status === 'finalizado').length} Viajes</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Listado de Viajes - Mobile responsive */}
          <div className="w-full sm:w-80 border-r border-slate-800 p-4 lg:p-6 overflow-y-auto space-y-3 lg:space-y-4 bg-slate-900/20 custom-scrollbar">
            {trips.filter(t => t.status === 'finalizado').length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No hay viajes finalizados</p>
              </div>
            ) : (
              trips.filter(t => t.status === 'finalizado').map((trip) => (
                <motion.div
                  key={trip.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => analyzeTrip(trip)}
                  className={`p-4 lg:p-5 rounded-xl lg:rounded-2xl border cursor-pointer transition-all touch-button hardware-accelerated ${
                    selectedTrip?.trip.id === trip.id 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-400 shadow-xl' 
                      : 'bg-slate-800/50 border-slate-700 hover:border-blue-500 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-lg lg:text-xl font-black italic">{trip.plate}</span>
                    <Eye className="w-4 h-4 lg:opacity-50 text-current" />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[10px] lg:text-xs opacity-60 font-black uppercase tracking-widest">
                      {new Date(trip.start_time).toLocaleDateString('es-AR')}
                    </p>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-blue-400">{Math.round(trip.max_speed)} km/h</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {trip.driver_name}
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Área de Análisis - Mobile responsive */}
          <div className="flex-1 p-4 lg:p-8 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center opacity-50">
                  <div className="relative">
                    <Activity className="w-12 h-12 lg:w-16 lg:h-16 text-blue-500 animate-spin" />
                    <div className="absolute inset-0 w-12 h-12 lg:w-16 lg:h-16 border-4 border-blue-500/20 rounded-full animate-ping"></div>
                  </div>
                  <p className="font-black italic tracking-widest text-sm lg:text-base mt-4">
                    SINCRONIZANDO TELEMETRÍA...
                  </p>
                </div>
              ) : selectedTrip ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="space-y-6 lg:space-y-8"
                >
                  
                  {/* Trip Info Header */}
                  <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-slate-700 backdrop-blur-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <h3 className="text-xl lg:text-2xl font-black">{selectedTrip.trip.plate}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="text-xs lg:text-sm text-slate-400">{selectedTrip.trip.driver_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-xs lg:text-sm text-slate-400">
                          {new Date(selectedTrip.trip.start_time).toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Grid de Estadísticas - Mobile responsive */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 p-4 lg:p-6 rounded-xl lg:rounded-3xl border border-blue-600/30 shadow-xl">
                      <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400 mb-2 lg:mb-3" />
                      <p className="text-2xl lg:text-3xl font-black text-white">
                        {Math.round(selectedTrip.trip.max_speed)}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase italic">Km/h Max</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 p-4 lg:p-6 rounded-xl lg:rounded-3xl border border-emerald-600/30 shadow-xl">
                      <Activity className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400 mb-2 lg:mb-3" />
                      <p className="text-2xl lg:text-3xl font-black text-white">
                        {Math.round(selectedTrip.trip.avg_speed)}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase italic">Km/h Prom</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 p-4 lg:p-6 rounded-xl lg:rounded-3xl border border-purple-600/30 shadow-xl">
                      <MapPin className="w-4 h-4 lg:w-5 lg:h-5 text-purple-400 mb-2 lg:mb-3" />
                      <p className="text-2xl lg:text-3xl font-black text-white">
                        {selectedTrip.logs.length}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase italic">Logs GPS</p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 p-4 lg:p-6 rounded-xl lg:rounded-3xl border border-yellow-600/30 shadow-xl">
                      <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-400 mb-2 lg:mb-3" />
                      <p className="text-2xl lg:text-3xl font-black text-white">
                        {selectedTrip.stops.length}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase italic">Paradas</p>
                    </div>
                  </div>

                  {/* Mapa Industrial - Mobile responsive */}
                  {polylinePositions.length > 0 ? (
                    <div className="h-[300px] lg:h-[450px] rounded-[1.5rem] lg:rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl relative z-0">
                      <MapContainer 
                        center={polylinePositions[0]} 
                        zoom={15} 
                        style={{ height: '100%', width: '100%' }}
                        className="z-0"
                      >
                        <TileLayer 
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        
                        {/* Marcadores de Inicio y Fin */}
                        <Marker position={polylinePositions[0]} icon={startIcon}>
                          <Popup>
                            <div className="text-sm">
                              <strong>PUNTO DE ORIGEN</strong><br />
                              {new Date(selectedTrip.trip.start_time).toLocaleTimeString('es-AR')}
                            </div>
                          </Popup>
                          <Tooltip>Inicio del Viaje</Tooltip>
                        </Marker>
                        
                        {polylinePositions.length > 1 && (
                          <Marker position={polylinePositions[polylinePositions.length - 1]} icon={endIcon}>
                            <Popup>
                              <div className="text-sm">
                                <strong>PUNTO DE CIERRE</strong><br />
                                {selectedTrip.trip.end_time ? new Date(selectedTrip.trip.end_time).toLocaleTimeString('es-AR') : 'N/A'}
                              </div>
                            </Popup>
                            <Tooltip>Fin del Viaje</Tooltip>
                          </Marker>
                        )}

                        <Polyline 
                          positions={polylinePositions} 
                          color="#3b82f6" 
                          weight={4} 
                          opacity={0.8}
                          smoothFactor={1}
                        />
                      </MapContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] lg:h-[450px] rounded-[1.5rem] lg:rounded-[2.5rem] border border-slate-800 flex items-center justify-center bg-slate-900/50">
                      <div className="text-center">
                        <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500">Sin datos de ruta disponibles</p>
                      </div>
                    </div>
                  )}

                  {/* Paradas detectadas */}
                  {selectedTrip.stops.length > 0 && (
                    <div className="bg-slate-800/30 rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-slate-700">
                      <h4 className="font-bold mb-4 flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                        <span>Paradas Detectadas</span>
                      </h4>
                      <div className="space-y-2">
                        {selectedTrip.stops.map((stop, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                            <span className="text-sm font-medium">Parada #{index + 1}</span>
                            <div className="text-right">
                              <span className="text-sm text-accent">{formatDuration(stop.duration)}</span>
                              <div className="text-xs text-slate-400">
                                {new Date(stop.startTime).toLocaleTimeString('es-AR')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botón de reporte - Mobile optimized */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={generateReport}
                    disabled={pdfGenerating}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 lg:px-10 py-3 lg:py-5 rounded-xl lg:rounded-2xl font-black flex items-center justify-center space-x-3 transition-all transform shadow-lg shadow-blue-600/30 touch-button hardware-accelerated"
                  >
                    <Download className={`w-5 h-5 lg:w-6 lg:h-6 ${pdfGenerating ? 'animate-spin' : ''}`} />
                    <span className="text-sm lg:text-base">
                      {pdfGenerating ? 'GENERANDO...' : 'GENERAR DOCUMENTACIÓN SAT'}
                    </span>
                  </motion.button>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-10">
                  <Navigation className="w-24 h-24 lg:w-32 lg:h-32 mb-4" />
                  <p className="text-xl lg:text-2xl font-black italic tracking-tighter text-center">
                    ESPERANDO SELECCIÓN DE UNIDAD
                  </p>
                  <p className="text-sm text-slate-500 mt-2">Selecciona un viaje para análisis detallado</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}