import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip } from 'react-leaflet';
import { Clock, Navigation, Activity, Download, Eye, MapPin, TrendingUp, AlertCircle, FileText, Calendar, User, Globe, Shield } from 'lucide-react';
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

interface HistoryPanelProps {
  trips: Trip[];
  user: UserProfile | null;
}

export default function HistoryPanel({ trips, user }: HistoryPanelProps) {
  const [selectedTrip, setSelectedTrip] = useState<{trip: Trip, logs: TripLog[], stops: any[]} | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('mineconnect-theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

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

  const isAdmin = user?.role === 'admin';
  const completedTrips = trips.filter(t => t.status === 'finalizado');

  return (
    <div className={`h-screen p-4 lg:p-6 safe-area ${
      theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'
    }`}>
      <div className={`h-full rounded-[2rem] border overflow-hidden flex flex-col mobile-landscape-compact backdrop-blur-xl ${
        theme === 'dark' 
          ? 'bg-slate-900/95 border-slate-800' 
          : 'bg-white/95 border-gray-200'
      }`}>
        
        {/* Header */}
        <div className={`p-4 lg:p-8 flex justify-between items-center shadow-lg safe-area-top ${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-blue-600 to-blue-800' 
            : 'bg-gradient-to-r from-blue-500 to-blue-700'
        }`}>
          <div>
            <h2 className={`text-2xl lg:text-3xl font-black flex items-center space-x-3 italic ${
              theme === 'dark' ? 'text-white' : 'text-white'
            }`}>
              {isAdmin ? (
                <Globe className="w-6 h-6 lg:w-8 lg:h-8 hardware-accelerated text-emerald-400" />
              ) : (
                <FileText className="w-6 h-6 lg:w-8 lg:h-8 hardware-accelerated" />
              )}
              <span>HISTORIAL SAT</span>
              {isAdmin && (
                <span className="text-sm lg:text-base text-emerald-400 font-normal normal-case ml-2">
                  (GLOBAL)
                </span>
              )}
            </h2>
            <p className={`text-xs lg:text-sm font-bold opacity-80 uppercase tracking-tighter ${
              theme === 'dark' ? 'text-blue-100' : 'text-blue-100'
            }`}>
              Auditoría de Flota en Tiempo Real
              {isAdmin && ' - Todas las Empresas'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`hidden lg:flex items-center space-x-2 ${
              theme === 'dark' ? 'text-white/70' : 'text-white/70'
            }`}>
              <Activity className="w-4 h-4" />
              <span className="text-xs">{completedTrips.length} Viajes</span>
            </div>
            {isAdmin && (
              <div className="hidden lg:flex items-center space-x-2 text-emerald-400">
                <Shield className="w-4 h-4" />
                <span className="text-xs font-medium">Superadmin</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Listado de Viajes - Mobile responsive */}
          <div className={`w-full sm:w-80 border-r p-4 lg:p-6 overflow-y-auto space-y-3 lg:space-y-4 custom-scrollbar ${
            theme === 'dark' 
              ? 'border-slate-800 bg-slate-900/20' 
              : 'border-gray-200 bg-gray-50/50'
          }`}>
            {completedTrips.length === 0 ? (
              <div className="text-center py-8">
                <Clock className={`w-12 h-12 mx-auto mb-3 ${
                  theme === 'dark' ? 'text-slate-600' : 'text-gray-400'
                }`} />
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
                }`}>No hay viajes finalizados</p>
              </div>
            ) : (
              completedTrips.map((trip) => (
                <motion.div
                  key={trip.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => analyzeTrip(trip)}
                  className={`p-4 lg:p-5 rounded-xl lg:rounded-2xl border cursor-pointer transition-all touch-button hardware-accelerated ${
                    selectedTrip?.trip.id === trip.id 
                      ? theme === 'dark'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-400 shadow-xl' 
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-300 shadow-xl'
                      : theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700 hover:border-blue-500 hover:bg-slate-800/70'
                        : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-lg lg:text-xl font-black italic ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>{trip.plate}</span>
                    <Eye className={`w-4 h-4 lg:opacity-50 ${
                      theme === 'dark' ? 'text-current' : 'text-current'
                    }`} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className={`text-[10px] lg:text-xs font-black uppercase tracking-widest ${
                      theme === 'dark' ? 'opacity-60 text-slate-400' : 'opacity-60 text-gray-500'
                    }`}>
                      {new Date(trip.start_time).toLocaleDateString('es-AR')}
                    </p>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-blue-400">{Math.round(trip.max_speed)} km/h</span>
                    </div>
                  </div>
                  <div className={`mt-2 text-xs ${
                    theme === 'dark' ? 'text-slate-500' : 'text-gray-600'
                  }`}>
                    {trip.driver_name}
                  </div>
                  {isAdmin && (
                    <div className="mt-2 flex items-center space-x-1">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                      <span className="text-[10px] text-emerald-400">Visibilidad Global</span>
                    </div>
                  )}
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
                    <Activity className={`w-12 h-12 lg:w-16 lg:h-16 animate-spin ${
                      theme === 'dark' ? 'text-blue-500' : 'text-blue-600'
                    }`} />
                    <div className={`absolute inset-0 w-12 h-12 lg:w-16 lg:h-16 border-4 rounded-full animate-ping ${
                      theme === 'dark' ? 'border-blue-500/20' : 'border-blue-600/20'
                    }`}></div>
                  </div>
                  <p className={`font-black italic tracking-widest text-sm lg:text-base mt-4 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
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
                  <div className={`rounded-xl lg:rounded-2xl p-4 lg:p-6 border backdrop-blur-sm ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-slate-800/50 to-slate-900/50 border-slate-700'
                      : 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300'
                  }`}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <h3 className={`text-xl lg:text-2xl font-black ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>{selectedTrip.trip.plate}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <User className={`w-3 h-3 ${
                            theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                          }`} />
                          <span className={`text-xs lg:text-sm ${
                            theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                          }`}>{selectedTrip.trip.driver_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className={`text-xs lg:text-sm ${
                          theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                        }`}>
                          {new Date(selectedTrip.trip.start_time).toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Grid de Estadísticas - Mobile responsive */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    <div className={`p-4 lg:p-6 rounded-xl lg:rounded-3xl border shadow-xl ${
                      theme === 'dark'
                        ? 'bg-gradient-to-br from-blue-600/20 to-blue-700/20 border-blue-600/30'
                        : 'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300'
                    }`}>
                      <TrendingUp className={`w-4 h-4 lg:w-5 lg:h-5 mb-2 lg:mb-3 ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      }`} />
                      <p className={`text-2xl lg:text-3xl font-black ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {Math.round(selectedTrip.trip.max_speed)}
                      </p>
                      <p className={`text-[10px] font-black uppercase italic ${
                        theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                      }`}>Km/h Max</p>
                    </div>
                    <div className={`p-4 lg:p-6 rounded-xl lg:rounded-3xl border shadow-xl ${
                      theme === 'dark'
                        ? 'bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 border-emerald-600/30'
                        : 'bg-gradient-to-br from-emerald-100 to-emerald-200 border-emerald-300'
                    }`}>
                      <Activity className={`w-4 h-4 lg:w-5 lg:h-5 mb-2 lg:mb-3 ${
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                      }`} />
                      <p className={`text-2xl lg:text-3xl font-black ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {Math.round(selectedTrip.trip.avg_speed)}
                      </p>
                      <p className={`text-[10px] font-black uppercase italic ${
                        theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                      }`}>Km/h Prom</p>
                    </div>
                    <div className={`p-4 lg:p-6 rounded-xl lg:rounded-3xl border shadow-xl ${
                      theme === 'dark'
                        ? 'bg-gradient-to-br from-purple-600/20 to-purple-700/20 border-purple-600/30'
                        : 'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300'
                    }`}>
                      <MapPin className={`w-4 h-4 lg:w-5 lg:h-5 mb-2 lg:mb-3 ${
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      }`} />
                      <p className={`text-2xl lg:text-3xl font-black ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {selectedTrip.logs.length}
                      </p>
                      <p className={`text-[10px] font-black uppercase italic ${
                        theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                      }`}>Logs GPS</p>
                    </div>
                    <div className={`p-4 lg:p-6 rounded-xl lg:rounded-3xl border shadow-xl ${
                      theme === 'dark'
                        ? 'bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 border-yellow-600/30'
                        : 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-300'
                    }`}>
                      <AlertCircle className={`w-4 h-4 lg:w-5 lg:h-5 mb-2 lg:mb-3 ${
                        theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                      }`} />
                      <p className={`text-2xl lg:text-3xl font-black ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {selectedTrip.stops.length}
                      </p>
                      <p className={`text-[10px] font-black uppercase italic ${
                        theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                      }`}>Paradas</p>
                    </div>
                  </div>

                  {/* Mapa Industrial - Mobile responsive */}
                  {polylinePositions.length > 0 ? (
                    <div className={`h-[300px] lg:h-[450px] rounded-[1.5rem] lg:rounded-[2.5rem] overflow-hidden border shadow-2xl relative z-0 ${
                      theme === 'dark' ? 'border-slate-800' : 'border-gray-300'
                    }`}>
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
                          <Tooltip>
                            <div className="text-sm">
                              <strong>Inicio del Viaje</strong><br />
                              {new Date(selectedTrip.trip.start_time).toLocaleTimeString('es-AR')}
                            </div>
                          </Tooltip>
                        </Marker>
                        
                        {polylinePositions.length > 1 && (
                          <Marker position={polylinePositions[polylinePositions.length - 1]} icon={endIcon}>
                            <Tooltip>
                              <div className="text-sm">
                                <strong>Fin del Viaje</strong><br />
                                {selectedTrip.trip.end_time ? new Date(selectedTrip.trip.end_time).toLocaleTimeString('es-AR') : 'N/A'}
                              </div>
                            </Tooltip>
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
                    <div className={`h-[300px] lg:h-[450px] rounded-[1.5rem] lg:rounded-[2.5rem] border flex items-center justify-center ${
                      theme === 'dark' 
                        ? 'border-slate-800 bg-slate-900/50' 
                        : 'border-gray-300 bg-gray-100'
                    }`}>
                      <div className="text-center">
                        <MapPin className={`w-12 h-12 mx-auto mb-3 ${
                          theme === 'dark' ? 'text-slate-600' : 'text-gray-400'
                        }`} />
                        <p className={
                          theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
                        }>Sin datos de ruta disponibles</p>
                      </div>
                    </div>
                  )}

                  {/* Paradas detectadas */}
                  {selectedTrip.stops.length > 0 && (
                    <div className={`rounded-xl lg:rounded-2xl p-4 lg:p-6 border ${
                      theme === 'dark' 
                        ? 'bg-slate-800/30 border-slate-700' 
                        : 'bg-gray-100 border-gray-300'
                    }`}>
                      <h4 className="font-bold mb-4 flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                        <span>Paradas Detectadas</span>
                      </h4>
                      <div className="space-y-2">
                        {selectedTrip.stops.map((stop, index) => (
                          <div key={index} className={`flex items-center justify-between rounded-lg p-3 border ${
                            theme === 'dark' 
                              ? 'bg-slate-900/50 border-slate-700' 
                              : 'bg-white border-gray-200'
                          }`}>
                            <span className="text-sm font-medium">Parada #{index + 1}</span>
                            <div className="text-right">
                              <span className="text-sm text-accent">{formatDuration(stop.duration)}</span>
                              <div className={`text-xs ${
                                theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                              }`}>
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
                    className={`px-6 lg:px-10 py-3 lg:py-5 rounded-xl lg:rounded-2xl font-black flex items-center justify-center space-x-3 transition-all transform shadow-lg touch-button hardware-accelerated ${
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-blue-600/30'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-blue-500/30'
                    }`}
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
                  <p className={`text-xl lg:text-2xl font-black italic tracking-tighter text-center ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    ESPERANDO SELECCIÓN DE UNIDAD
                  </p>
                  <p className={`text-sm mt-2 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-gray-600'
                  }`}>
                    {isAdmin ? 'Selecciona un viaje global para análisis' : 'Selecciona un viaje para análisis detallado'}
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}