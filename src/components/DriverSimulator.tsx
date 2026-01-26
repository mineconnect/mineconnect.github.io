import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Navigation, AlertCircle, Activity, Battery, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile } from '../App';

// --- Types ---
interface DriverSimulatorProps {
  userProfile: UserProfile | null;
}

interface Trip {
  id: string;
  plate: string;
  driver_id: string;
  driver_name: string;
  company_id: string;
  start_time: string;
}

const GPS_INTERVAL = 10000; // 10 seconds between position checks
const RETRY_DELAY = 5000; // 5 seconds for timeout retry
const MAX_RETRIES = 3; // Max 3 retries on timeout

// --- Component ---
export default function DriverSimulator({ userProfile }: DriverSimulatorProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string |null>(null);
  const [statusMessage, setStatusMessage] = useState("Listo para iniciar.");
  
  // Refs to hold values that change without re-rendering
  const gpsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopAllTimers = useCallback(() => {
    if (gpsTimerRef.current) clearInterval(gpsTimerRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    gpsTimerRef.current = null;
    retryTimerRef.current = null;
  }, []);
  
  // Cleanup timers on component unmount
  useEffect(() => {
    return () => stopAllTimers();
  }, [stopAllTimers]);

  const getPositionWithRetries = useCallback((tripId: string, attempt = 1) => {
    setStatusMessage("Obteniendo señal GPS...");
    
    navigator.geolocation.getCurrentPosition(
      // --- SUCCESS ---
      async (position) => {
        const speedKmh = position.coords.speed ? Math.round(position.coords.speed * 3.6) : 0;
        setCurrentSpeed(speedKmh);
        setStatusMessage(`Posición adquirida. Velocidad: ${speedKmh}` km/h``);

        await supabase.from('trip_logs').insert({
          trip_id: tripId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: speedKmh,
        });
      },
      // --- ERROR ---
      (err) => {
        if (err.code === err.TIMEOUT) {
          setStatusMessage(`GPS Timeout. Reintentando en 5s... (${attempt}/${MAX_RETRIES})`);
          if (attempt < MAX_RETRIES) {
            retryTimerRef.current = setTimeout(() => getPositionWithRetries(tripId, attempt + 1), RETRY_DELAY);
          } else {
            setStatusMessage("Error: No se pudo obtener la señal GPS después de varios intentos.");
            setCurrentSpeed(0); // Set speed to 0 after final failure
          }
        } else {
          const errorMsg = "Error de GPS: " + (err.code === err.PERMISSION_DENIED ? "Permiso denegado." : "Señal no disponible.");
          setError(errorMsg);
  
          // Stop tracking on critical errors
          if (isTracking) {
             stopTracking();
          }
        }
      },
      // --- OPTIONS ---
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [isTracking]);

  const startTracking = async () => {
    if (!userProfile) {
      setError("No se pudo iniciar: perfil de usuario no encontrado.");
      return;
    }
    stopAllTimers(); // Ensure no previous timers are running
    
    setIsTracking(true);
    setStatusMessage("Iniciando nuevo viaje...");

    const { data, error: tripError } = await supabase
      .from('trips')
      .insert({
        plate: 'SIM-001',
        driver_id: userProfile.id,
        driver_name: userProfile.full_name,
        company_id: userProfile.company_id,
        status: 'en_curso',
      })
      .select()
      .single();

    if (tripError) {
      setError("No se pudo crear el viaje en la base de datos.");
      setIsTracking(false);
      return;
    }

    setCurrentTrip(data as Trip);
    const tripId = data.id;

    // Initial position check, then set interval
    getPositionWithRetries(tripId);
    gpsTimerRef.current = setInterval(() => getPositionWithRetries(tripId), GPS_INTERVAL);
  };

  const stopTracking = async () => {
    stopAllTimers();
    setIsTracking(false);
    setStatusMessage("Viaje finalizado. Guardando datos...");

    if (currentTrip) {
      const { data: logs } = await supabase
        .from('trip_logs')
        .select('speed')
        .eq('trip_id', currentTrip.id);
      
      const speeds = logs?.map(l => l.speed) || [0];
      const maxSpeed = Math.max(...speeds);
      const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length || 0;

      await supabase
        .from('trips')
        .update({
          end_time: new Date().toISOString(),
          status: 'finalizado',
          max_speed: maxSpeed,
          avg_speed: avgSpeed,
        })
        .eq('id', currentTrip.id);
    }
    
    setCurrentTrip(null);
    setCurrentSpeed(0);
    setStatusMessage("Listo para iniciar.");
  };

  // Render Guard
  if (userProfile?.role !== 'CONDUCTOR') {
     return (
      <div className="p-6 text-center text-slate-500">
        <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
        <h3 className="mt-2 text-lg font-medium text-white">Acceso No Autorizado</h3>
        <p>El simulador es solo para el rol de CONDUCTOR.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center bg-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-white bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl p-8 text-center"
      >
        <Navigation className="mx-auto h-16 w-16 text-blue-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Simulador de Conductor</h1>
        <p className="text-slate-400 mb-6">{statusMessage}</p>
        
        <div className="my-8">
            <p className="text-6xl font-black tracking-tighter">{currentSpeed}</p>
            <p className="text-slate-500">km/h</p>
        </div>

        <motion.button
          onClick={isTracking ? stopTracking : startTracking}
          whileTap={{ scale: 0.95 }}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
            isTracking ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isTracking ? <Pause className="inline-block mr-2"/> : <Play className="inline-block mr-2"/>}
          {isTracking ? 'Finalizar Viaje' : 'Iniciar Viaje'}
        </motion.button>

        {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
      </motion.div>
    </div>
  );
}