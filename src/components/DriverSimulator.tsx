import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Navigation, AlertCircle, Activity, Clock, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { Trip, Position, UserProfile } from '../types';

interface DriverSimulatorProps {
  user: UserProfile | null;
  onTripUpdate: () => void;
}

interface GPSEntry {
  timestamp: string;
  lat: number;
  lng: number;
  speed: number;
  message: string;
}

export default function DriverSimulator({ user, onTripUpdate }: DriverSimulatorProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [gpsLogs, setGpsLogs] = useState<GPSEntry[]>([]);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tripDuration, setTripDuration] = useState(0);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && currentTrip) {
      interval = setInterval(() => {
        setTripDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, currentTrip]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [gpsLogs]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addGPSLog = (lat: number, lng: number, speed: number, message: string) => {
    const timestamp = new Date().toLocaleTimeString('es-AR');
    const log: GPSEntry = { timestamp, lat, lng, speed, message };
    setGpsLogs(prev => [...prev.slice(-19), log]);
  };

  const startTracking = async () => {
    if (!user) {
      setError('Usuario no autenticado');
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocalización no soportada en este dispositivo');
      return;
    }

    try {
      const newTrip: Omit<Trip, 'id' | 'max_speed' | 'avg_speed' | 'created_at'> = {
        plate: 'AUTO-001',
        vehicle_id: crypto.randomUUID(),
        driver_id: user.id,
        driver_name: user.full_name,
        company_id: user.company_id,
        start_time: new Date().toISOString(),
        end_time: null,
        status: 'en_curso'
      };

      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert(newTrip)
        .select()
        .single();

      if (tripError) throw tripError;

      setCurrentTrip(tripData);
      setIsTracking(true);
      setError(null);
      setTripDuration(0);
      setGpsLogs([]);

      addGPSLog(0, 0, 0, '🚀 Viaje iniciado - MineConnect SAT Pro');

      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, speed } = position.coords;
          const speedKmh = speed ? Math.round(speed * 3.6) : 0;
          
          setCurrentPosition({ lat: latitude, lng: longitude, speed: speedKmh, timestamp: Date.now() });
          setCurrentSpeed(speedKmh);

          addGPSLog(latitude, longitude, speedKmh, `📍 GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} | ${speedKmh} km/h`);

          if (tripData) {
            await supabase.from('trip_logs').insert({
              trip_id: tripData.id,
              lat: latitude,
              lng: longitude,
              speed: speedKmh
            });
          }
        },
        (error) => {
          let errorMessage = 'Error de GPS: ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Permiso denegado';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Posición no disponible';
              break;
            case error.TIMEOUT:
              errorMessage += 'Tiempo de espera agotado';
              break;
            default:
              errorMessage += 'Error desconocido';
              break;
          }
          addGPSLog(0, 0, 0, `❌ ${errorMessage}`);
          setError(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

      setWatchId(id);
    } catch (error) {
      console.error('Error starting trip:', error);
      setError('Error al iniciar el viaje');
    }
  };

  const stopTracking = async () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    if (currentTrip) {
      try {
        const endTime = new Date().toISOString();
        
        const { data: logsData } = await supabase
          .from('trip_logs')
          .select('speed')
          .eq('trip_id', currentTrip.id);

        if (logsData && logsData.length > 0) {
          const speeds = logsData.map(log => log.speed);
          const maxSpeed = Math.max(...speeds);
          const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;

          await supabase
            .from('trips')
            .update({
              end_time: endTime,
              status: 'finalizado',
              max_speed: maxSpeed,
              avg_speed: avgSpeed
            })
            .eq('id', currentTrip.id);
        } else {
          await supabase
            .from('trips')
            .update({
              end_time: endTime,
              status: 'finalizado'
            })
            .eq('id', currentTrip.id);
        }

        addGPSLog(0, 0, 0, `🏁 Viaje finalizado - Duración: ${formatDuration(tripDuration)}`);
        onTripUpdate();
      } catch (error) {
        console.error('Error stopping trip:', error);
        addGPSLog(0, 0, 0, '❌ Error al finalizar el viaje');
      }
    }

    setIsTracking(false);
    setCurrentTrip(null);
    setCurrentPosition(null);
    setCurrentSpeed(0);
  };

  return (
    <div className="h-screen bg-dark-primary flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-blue-600 p-6">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <Navigation className="w-8 h-8" />
              <span>MineConnect SAT Pro</span>
            </h2>
            <p className="text-blue-100 mt-2">Simulador Avanzado de Telemetría</p>
          </div>

          {/* Status Bar */}
          <div className="bg-slate-800/50 p-4 border-b border-slate-700">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-slate-400">Estado</div>
                <div className="text-lg font-semibold flex items-center justify-center space-x-2">
                  <Activity className={`w-5 h-5 ${isTracking ? 'text-accent animate-pulse' : 'text-slate-500'}`} />
                  <span className={isTracking ? 'text-accent' : 'text-slate-500'}>
                    {isTracking ? 'EN RUTA' : 'DETENIDO'}
                  </span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-400">Velocidad</div>
                <div className="text-lg font-bold text-primary">
                  {currentSpeed} <span className="text-sm font-normal">km/h</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-400">Tiempo</div>
                <div className="text-lg font-bold text-accent">
                  {formatDuration(tripDuration)}
                </div>
              </div>
            </div>
          </div>

          {/* Main Control Area */}
          <div className="p-8">
            <div className="flex flex-col items-center space-y-6">
              {/* Main Button */}
              <motion.button
                whileHover={{ scale: isTracking ? 0.95 : 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={isTracking ? stopTracking : startTracking}
                className={`relative w-32 h-32 rounded-full shadow-2xl transition-all duration-300 ${
                  isTracking 
                    ? 'bg-gradient-to-br from-danger to-red-700 hover:from-red-600 hover:to-red-800' 
                    : 'bg-gradient-to-br from-accent to-emerald-700 hover:from-emerald-600 hover:to-emerald-800'
                }`}
              >
                <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-current"></div>
                <div className="relative flex items-center justify-center h-full">
                  {isTracking ? (
                    <Pause className="w-12 h-12 text-white" />
                  ) : (
                    <Play className="w-12 h-12 text-white ml-2" />
                  )}
                </div>
              </motion.button>

              <div className="text-center">
                <p className="text-xl font-semibold">
                  {isTracking ? 'Detener Viaje' : 'Iniciar Viaje'}
                </p>
                <p className="text-slate-400 mt-1">
                  {currentTrip ? `Patente: ${currentTrip.plate}` : 'Presiona para comenzar'}
                </p>
              </div>

              {currentPosition && (
                <div className="w-full bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-slate-300">
                      Última posición: {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-center space-x-2"
                >
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 text-sm">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* GPS Logs Terminal */}
            <div className="mt-6">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400">Consola de Eventos GPS</span>
              </div>
              <div
                ref={logContainerRef}
                className="bg-slate-950/50 rounded-lg border border-slate-800 p-4 h-48 overflow-y-auto font-mono text-xs"
              >
                {gpsLogs.length === 0 ? (
                  <div className="text-slate-500">Esperando eventos GPS...</div>
                ) : (
                  gpsLogs.map((log, index) => (
                    <div key={index} className="mb-1">
                      <span className="text-accent">[{log.timestamp}]</span>
                      <span className="text-slate-300 ml-2">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}