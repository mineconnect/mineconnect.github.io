import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip } from 'react-leaflet';
import { Clock, MapPin, Navigation, Activity, Download, Eye, TrendingUp, AlertCircle } from 'lucide-react';
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
  const [hoveredPoint] = useState<{lat: number; lng: number; speed: number} | null>(null);

  const completedTrips = trips.filter(trip => trip.status === 'finalizado');

  useEffect(() => {
    if (selectedTrip) {
      analyzeTrip(selectedTrip.trip);
    }
  }, []);

  const analyzeTrip = async (trip: Trip) => {
    setLoading(true);
    try {
      const { data: logs } = await supabase
        .from('trip_logs')
        .select('*')
        .eq('trip_id', trip.id)
        .order('created_at', { ascending: true });

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

  const generateReport = async () => {
    if (!selectedTrip) return;

    const reportElement = document.getElementById('trip-report');
    if (!reportElement) return;

    try {
      const canvas = await html2canvas(reportElement);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF();
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`reporte-viaje-${selectedTrip.trip.plate}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const polylinePositions = selectedTrip?.logs.map(log => [log.lat, log.lng] as [number, number]) || [];

  return (
    <div className="h-screen bg-dark-primary text-white p-4">
      <div className="h-full max-w-7xl mx-auto">
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700 h-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-blue-600 p-6">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <Clock className="w-8 h-8" />
              <span>Historial de Viajes</span>
            </h2>
            <p className="text-blue-100 mt-2">
              {completedTrips.length} viajes completados | Análisis avanzado de telemetría
            </p>
          </div>

          <div className="flex h-[calc(100%-120px)]">
            {/* Trips List */}
            <div className="w-1/3 border-r border-slate-700 p-4 overflow-y-auto">
              <div className="space-y-3">
                {completedTrips.map((trip) => (
                  <motion.div
                    key={trip.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => analyzeTrip(trip)}
                    className={`bg-slate-800/50 rounded-lg p-4 cursor-pointer border transition-all ${
                      selectedTrip?.trip.id === trip.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-lg">{trip.plate}</div>
                        <div className="text-sm text-slate-400">{trip.driver_name}</div>
                      </div>
                      <Eye className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500">Vel. Max:</span>
                        <span className="ml-1 text-primary">{Math.round(trip.max_speed)} km/h</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Vel. Prom:</span>
                        <span className="ml-1 text-accent">{Math.round(trip.avg_speed)} km/h</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {new Date(trip.start_time).toLocaleDateString('es-AR')}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Analysis View */}
            <div className="flex-1 p-4 overflow-y-auto">
              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center h-64"
                  >
                    <div className="text-center">
                      <Activity className="w-12 h-12 text-primary mx-auto mb-3 animate-pulse" />
                      <p>Analizando datos de telemetría...</p>
                    </div>
                  </motion.div>
                )}

                {!loading && !selectedTrip && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center h-64"
                  >
                    <div className="text-center text-slate-400">
                      <Navigation className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Selecciona un viaje para análisis</p>
                      <p className="text-sm mt-2">Visualiza rutas, paradas y estadísticas detalladas</p>
                    </div>
                  </motion.div>
                )}

                {!loading && selectedTrip && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    id="trip-report"
                    className="space-y-4"
                  >
                    {/* Stats Cards */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-center justify-between">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          <span className="text-2xl font-bold text-primary">
                            {Math.round(selectedTrip.trip.max_speed)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Vel. Máxima (km/h)</div>
                      </div>
                      
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-center justify-between">
                          <Activity className="w-5 h-5 text-accent" />
                          <span className="text-2xl font-bold text-accent">
                            {Math.round(selectedTrip.trip.avg_speed)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Vel. Promedio (km/h)</div>
                      </div>
                      
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-center justify-between">
                          <Clock className="w-5 h-5 text-blue-400" />
                          <span className="text-2xl font-bold text-blue-400">
                            {selectedTrip.logs.length}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Puntos GPS</div>
                      </div>
                      
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-center justify-between">
                          <MapPin className="w-5 h-5 text-yellow-400" />
                          <span className="text-2xl font-bold text-yellow-400">
                            {selectedTrip.stops.length}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Paradas Detectadas</div>
                      </div>
                    </div>

                    {/* Map */}
                    <div className="bg-slate-800/30 rounded-lg overflow-hidden border border-slate-700" style={{ height: '400px' }}>
                      <MapContainer
                        center={[
                          selectedTrip.logs[0]?.lat || -34.6037,
                          selectedTrip.logs[0]?.lng || -58.3816
                        ]}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        
                        {/* Route polyline */}
                        <Polyline
                          positions={polylinePositions}
                          color="#3b82f6"
                          weight={3}
                          opacity={0.8}
                        />

                        {/* Stop markers */}
                        {selectedTrip.stops.map((stop, index) => (
                          <Marker key={index} position={[stop.lat, stop.lng]}>
                            <Popup>
                              <div className="text-sm">
                                <strong>Parada #{index + 1}</strong><br />
                                Duración: {formatDuration(stop.duration)}<br />
                                Hora: {new Date(stop.startTime).toLocaleTimeString('es-AR')}
                              </div>
                            </Popup>
                          </Marker>
                        ))}

                        {/* Speed tooltip */}
                        {hoveredPoint && (
                          <Marker position={[hoveredPoint.lat, hoveredPoint.lng]}>
                            <Tooltip permanent>
                              Velocidad: {hoveredPoint.speed} km/h
                            </Tooltip>
                          </Marker>
                        )}
                      </MapContainer>
                    </div>

                    {/* Stops List */}
                    {selectedTrip.stops.length > 0 && (
                      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                        <h3 className="font-semibold mb-3 flex items-center space-x-2">
                          <AlertCircle className="w-5 h-5 text-yellow-400" />
                          <span>Paradas Detectadas</span>
                        </h3>
                        <div className="space-y-2">
                          {selectedTrip.stops.map((stop, index) => (
                            <div key={index} className="flex items-center justify-between text-sm bg-slate-900/50 rounded p-2">
                              <span>Parada #{index + 1}</span>
                              <span className="text-accent">{formatDuration(stop.duration)}</span>
                              <span className="text-slate-400">
                                {new Date(stop.startTime).toLocaleTimeString('es-AR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Generate Report Button */}
                    <button
                      onClick={generateReport}
                      className="bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Generar Reporte PDF</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}