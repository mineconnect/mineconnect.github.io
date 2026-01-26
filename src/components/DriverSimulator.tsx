import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Navigation, AlertCircle, Activity, MapPin, Smartphone, Battery } from 'lucide-react';
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

interface GPSStatus {
  accuracy: number;
  lastUpdate: number;
  retryCount: number;
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
  const [wakeLock, setWakeLock] = useState<any>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>({
    accuracy: 0,
    lastUpdate: Date.now(),
    retryCount: 0
  });
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
    // Get battery level
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }

    return () => {
      if (wakeLock) {
        wakeLock.release();
        setWakeLock(null);
      }
    };
  }, [wakeLock]);

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

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await (navigator as any).wakeLock.request('screen');
        setWakeLock(lock);
        lock.addEventListener('release', () => {
          setWakeLock(null);
        });
      }
    } catch (error) {
      console.warn('Wake Lock not supported or denied:', error);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
    }
  };

  const addGPSLog = (lat: number, lng: number, speed: number, message: string) => {
    const timestamp = new Date().toLocaleTimeString('es-AR');
    const log: GPSEntry = { timestamp, lat, lng, speed, message };
    setGpsLogs(prev => [...prev.slice(-19), log]);
  };

  const reconnectGPS = async () => {
    if (reconnectionAttempts >= 3) {
      addGPSLog(0, 0, 0, '❌ Máximo de reintentos de GPS alcanzado');
      setGpsStatus(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));
      return;
    }

    setReconnectionAttempts(prev => prev + 1);
    addGPSLog(0, 0, 0, `🔄 Reintentando GPS (${reconnectionAttempts + 1}/3)...`);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (currentTrip && isTracking) {
      startGPSWatch(currentTrip.id);
    }
  };

  const startGPSWatch = (tripId: string) => {
    const id = navigator.geolocation.watchPosition(
      async (position) => {
        setReconnectionAttempts(0); // Reset on successful GPS
        setGpsStatus(prev => ({ ...prev, retryCount: 0, lastUpdate: Date.now() }));
        
        const { latitude, longitude, speed, accuracy } = position.coords;
        const speedKmh = speed ? Math.round(speed * 3.6) : 0;
        
        setCurrentPosition({ lat: latitude, lng: longitude, speed: speedKmh, timestamp: Date.now() });
        setCurrentSpeed(speedKmh);
        setGpsAccuracy(accuracy);

        addGPSLog(latitude, longitude, speedKmh, `📍 GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} | ${speedKmh} km/h | ±${Math.round(accuracy)}m`);

        try {
          await supabase.from('trip_logs').insert({
            trip_id: tripId,
            lat: latitude,
            lng: longitude,
            speed: speedKmh
          });
        } catch (error) {
          console.error('Error saving GPS data:', error);
          addGPSLog(latitude, longitude, speedKmh, '⚠️ Error guardando datos');
        }
      },
      (error) => {
        setReconnectionAttempts(prev => prev + 1);
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
        setGpsStatus(prev => ({ ...prev, retryCount: prev.retryCount + 1, lastUpdate: Date.now() }));
        
        // Auto-reconnect with exponential backoff
        const nextAttempt = reconnectionAttempts + 1;
        const backoffDelay = Math.min(1000 * Math.pow(2, nextAttempt), 10000);
        setTimeout(reconnectGPS, backoffDelay);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // Increased timeout for better reliability
        maximumAge: 0
      }
    );
    return id;
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
      // Request wake lock for mobile
      await requestWakeLock();
      
      // Handle admin users with null company_id
      const tripCompanyId = user.role === 'admin' && !user.company_id ? '00000000-0000-0000-0000-000000000000' : user.company_id;
      const plate = user.role === 'admin' ? 'ADMIN-001' : 'AUTO-001';
      
      const newTrip: Omit<Trip, 'id' | 'max_speed' | 'avg_speed' | 'created_at'> = {
        plate: plate,
        vehicle_id: crypto.randomUUID(),
        driver_id: user.id,
        driver_name: user.full_name,
        company_id: tripCompanyId,
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
      setReconnectionAttempts(0);
      setGpsStatus({ accuracy: 0, lastUpdate: Date.now(), retryCount: 0 });

      addGPSLog(0, 0, 0, '🚀 Viaje iniciado - MineConnect SAT Pro');
      addGPSLog(0, 0, 0, `👤 Usuario: ${user.full_name} (${user.role})`);
      addGPSLog(0, 0, 0, `🏢 Company ID: ${tripCompanyId}`);
      addGPSLog(0, 0, 0, '📱 Wake Lock activado - Pantalla activa');
      addGPSLog(0, 0, 0, '📡 Iniciando tracking GPS de alta precisión...');

      const id = startGPSWatch(tripData.id);
      setWatchId(id);
    } catch (error) {
      console.error('Error starting trip:', error);
      setError('Error al iniciar el viaje');
      addGPSLog(0, 0, 0, '❌ Error crítico al iniciar viaje');
    }
  };

  const stopTracking = async () => {
    // Stop GPS watch
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    // Release wake lock
    await releaseWakeLock();

    if (currentTrip) {
      try {
        const endTime = new Date().toISOString();
        
        const { data: logsData, error: logsError } = await supabase
          .from('trip_logs')
          .select('speed')
          .eq('trip_id', currentTrip.id);

        if (logsError) {
          console.error('Error fetching logs:', logsError);
          throw logsError;
        }

        if (logsData && logsData.length > 0) {
          const speeds = logsData.map(log => log.speed);
          const maxSpeed = Math.max(...speeds);
          const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;

          const { error: updateError } = await supabase
            .from('trips')
            .update({
              end_time: endTime,
              status: 'finalizado',
              max_speed: maxSpeed,
              avg_speed: Math.round(avgSpeed * 100) / 100 // Round to 2 decimal places
            })
            .eq('id', currentTrip.id);

          if (updateError) throw updateError;

          addGPSLog(0, 0, 0, `📊 Estadísticas finales: Máx ${maxSpeed} km/h | Prom ${Math.round(avgSpeed)} km/h`);
        } else {
          const { error: updateError } = await supabase
            .from('trips')
            .update({
              end_time: endTime,
              status: 'finalizado',
              max_speed: 0,
              avg_speed: 0
            })
            .eq('id', currentTrip.id);

          if (updateError) throw updateError;

          addGPSLog(0, 0, 0, '⚠️ Viaje finalizado sin datos de velocidad');
        }

        addGPSLog(0, 0, 0, `🏁 Viaje finalizado - Duración: ${formatDuration(tripDuration)}`);
        addGPSLog(0, 0, 0, '📱 Wake Lock liberado');
        
        onTripUpdate();
      } catch (error) {
        console.error('Error stopping trip:', error);
        addGPSLog(0, 0, 0, '❌ Error al finalizar el viaje');
        setError('Error al finalizar el viaje');
      }
    }

    setIsTracking(false);
    setCurrentTrip(null);
    setCurrentPosition(null);
    setCurrentSpeed(0);
    setGpsAccuracy(null);
    setReconnectionAttempts(0);
    setGpsStatus({ accuracy: 0, lastUpdate: Date.now(), retryCount: 0 });
  };

  return (
    <div className={`h-screen flex items-center justify-center p-4 safe-area`}>
      <div className="w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border shadow-2xl overflow-hidden mobile-landscape-compact bg-white/95 border-gray-200 backdrop-blur-xl`}
        >
          {/* Header */}
          <div className={`p-6 safe-area-top bg-gradient-to-r from-blue-600 to-blue-700`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-2xl font-black text-white flex items-center space-x-3`}>
                  <Navigation className="w-8 h-8 hardware-accelerated" />
                  <span>MineConnect SAT Pro</span>
                </h2>
                <p className={`text-blue-100 mt-2 text-sm`}>
                  Simulador Avanzado de Telemetría
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {batteryLevel !== null && (
                  <div className="flex items-center space-x-1">
                    <Battery className="w-4 h-4 text-blue-200" />
                    <span className={`text-xs text-blue-200`}>{batteryLevel}%</span>
                  </div>
                )}
                <div className={`flex items-center space-x-2 text-xs ${
                  gpsStatus.retryCount > 0 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    gpsStatus.retryCount > 0 ? 'bg-yellow-400' : 'bg-green-400'
                  } animate-pulse`}></div>
                  <span>{gpsStatus.retryCount > 0 ? 'Reintentando' : 'GPS OK'}</span>
                </div>
              </div>
            </div>

            {/* Status Bar */}
            <div className={`p-4 border-b bg-gray-100/50 border-gray-200`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider">Estado</div>
                  <div className="text-sm lg:text-lg font-semibold flex items-center justify-center space-x-2 mt-1">
                    <Activity className={`w-4 h-4 lg:w-5 lg:h-5 ${
                      isTracking ? 'text-accent animate-pulse' : 'text-slate-500'
                    }`} />
                    <span className={isTracking ? 'text-accent' : 'text-slate-500'}>
                      {isTracking ? 'EN RUTA' : 'DETENIDO'}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider">Velocidad</div>
                  <div className="text-sm lg:text-lg font-black text-primary mt-1">
                    {currentSpeed} <span className="text-xs lg:text-sm font-normal">km/h</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider">Tiempo</div>
                  <div className="text-sm lg:text-lg font-bold text-accent mt-1">
                    {formatDuration(tripDuration)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider">Precisión</div>
                  <div className="text-sm lg:text-lg font-bold text-yellow-500 mt-1">
                    {gpsAccuracy ? `±${Math.round(gpsAccuracy)}m` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Control Area */}
            <div className="p-6 lg:p-8">
              <div className="flex flex-col items-center space-y-6">
                {/* Main Button - Touch optimized for mobile */}
                <motion.button
                  whileHover={{ scale: isTracking ? 0.95 : 1.05 }}
                  whileTap={{ scale: isTracking ? 0.85 : 0.9 }}
                  onClick={isTracking ? stopTracking : startTracking}
                  className={`relative w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-full shadow-2xl transition-all duration-300 touch-button hardware-accelerated ${
                    isTracking 
                      ? 'bg-gradient-to-br from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 active:from-red-800 active:to-red-950' 
                      : 'bg-gradient-to-br from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 active:from-emerald-800 active:to-emerald-950'
                  }`}
                >
                  <div className={`absolute inset-0 rounded-full ${
                    isTracking ? 'animate-pulse' : 'animate-ping'
                  } opacity-30 bg-current`}></div>
                  <div className="relative flex items-center justify-center h-full">
                    {isTracking ? (
                      <>
                        <Pause className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-white" />
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                        </div>
                      </>
                    ) : (
                      <Play className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-white ml-2" />
                    )}
                  </div>
                </motion.button>

                <div className="text-center">
                  <p className="text-xl lg:text-2xl font-black">
                    {isTracking ? 'Detener Operación' : 'Iniciar Operación'}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {currentTrip ? `Patente: ${currentTrip.plate}` : 'Presiona para comenzar tracking'}
                  </p>
                  {reconnectionAttempts > 0 && (
                    <p className="text-yellow-400 text-xs mt-1">
                      Reconectando GPS... ({reconnectionAttempts}/3)
                    </p>
                  )}
                </div>

                {currentPosition && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`w-full rounded-xl p-4 backdrop-blur-sm hardware-accelerated bg-white/50 border-gray-200`}
                  >
                      <div className="flex items-center space-x-2 text-sm">
                       <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                       <span className={`break-all text-gray-700`}>
                         {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
                      </span>
                      </div>
                  </motion.div>
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
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* GPS Logs Terminal - Mobile optimized */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400">Consola de Eventos GPS</span>
                  </div>
                  {isTracking && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-emerald-400">LIVE</span>
                    </div>
                  )}
                </div>
                <div
                  ref={logContainerRef}
                  className={`rounded-xl border p-4 h-48 sm:h-56 overflow-y-auto font-mono text-xs custom-scrollbar hardware-accelerated bg-gray-50`}
                >
                  {gpsLogs.length === 0 ? (
                    <div className="text-center">
                      <div className="mb-2">📡</div>
                      Esperando eventos GPS...
                    </div>
                  ) : (
                    gpsLogs.map((log, index) => (
                      <div 
                        key={`${log.timestamp}-${index}`} 
                        className="mb-1 leading-relaxed"
                      >
                        <span className="text-accent font-bold">[{log.timestamp}]</span>
                        <span className={`ml-2 text-gray-700`}>{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
