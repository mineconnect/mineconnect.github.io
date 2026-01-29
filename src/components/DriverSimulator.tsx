import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Navigation, Activity, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { Trip, UserProfile } from '../types';

interface DriverSimulatorProps {
  user: UserProfile | null;
  onTripUpdate: () => void;
}

type GPSPoint = {
  id?: number;
  trip_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  company_id: string | null;
  created_at?: number;
};

// IndexedDB helpers
const DB_NAME = 'gps_sync';
const STORE_NAME = 'points';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function addPointToQueue(p: GPSPoint): Promise<number | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(p);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

async function getAllQueuedPoints(): Promise<GPSPoint[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as GPSPoint[]);
    req.onerror = () => reject(req.error);
  });
}

async function removeQueuedPoints(ids: number[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const id of ids) {
    store.delete(id);
  }
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// Persist GPS point to IndexedDB on each GPS update
const GPS_QUEUE_INTERVAL_MS = 30000; // 30 seconds batch

export default function DriverSimulator({ user, onTripUpdate }: DriverSimulatorProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [gpsLogs, setGpsLogs] = useState<any[]>([]);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tripDuration, setTripDuration] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Initialize batch sync timer
  useEffect(() => {
    const interval = setInterval(() => batchSync(), GPS_QUEUE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: any;
    if (isTracking && currentTrip) {
      interval = setInterval(() => setTripDuration((p) => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, currentTrip]);

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
      });
    }
  }, []);

  const addGPSLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('es-AR');
    setGpsLogs((prev) => [...prev.slice(-15), { timestamp, message }]);
  };

  const startGPSWatch = (tripId: string) => {
    return navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        const speedKmh = speed ? Math.round(speed * 3.6) : 0;
        setCurrentSpeed(speedKmh);
        addGPSLog(`📍 GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} | ${speedKmh} km/h`);
        // Persist GPS point to queue (IndexedDB)
        if (!tripId) {
          addGPSLog('⚠ GPS: missing tripId, skipping insert to queue');
          return;
        }
        const point: GPSPoint = {
          trip_id: tripId,
          latitude,
          longitude,
          speed: speedKmh,
          company_id: user?.company_id ?? null,
          created_at: Date.now(),
        } as GPSPoint;
        // save to queue
        try {
          await addPointToQueue(point);
        } catch (e) {
          addGPSLog('⚠ GPS: failed to queue point');
        }
      },
      (err) => {
        const msg = err.code === 3 ? "Tiempo de espera agotado" : "Error de señal";
        setError(msg);
        addGPSLog(`❌ ${msg}`);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  };

  // Batch sync to server (30s)
  async function batchSync() {
    try {
      const queued = await getAllQueuedPoints();
      if (!queued || queued.length === 0) return;
      const payloads = queued.map(p => ({
        trip_id: p.trip_id,
        latitude: p.latitude,
        longitude: p.longitude,
        speed: p.speed,
        company_id: p.company_id
      }));
      // Try batch insert to gps_points
      const { error } = await supabase.from('gps_points').insert(payloads);
      if (!error) {
        // remove all queued points that were sent
        const ids = queued.map(q => q.id!).filter((id) => typeof id === 'number');
        await removeQueuedPoints(ids);
      } else {
        // keep for next retry
        console.warn('Batch GPS sync failed', error);
      }
    } catch (e) {
      console.error('Batch GPS sync error', e);
    }
  }

  const startTracking = async () => {
    console.log('Starting GPS tracking for user:', user?.id ?? 'unknown');
    if (!user) return setError('Usuario no autenticado');
    try {
      const tripCompanyId = user.company_id;
      const { data, error: tripError } = await supabase.from('trips').insert({
        plate: user.role === 'admin' ? 'ADMIN-001' : 'AUTO-001',
        vehicle_id: crypto.randomUUID(),
        driver_id: user.id,
        driver_name: user.full_name,
        company_id: tripCompanyId,
        status: 'en_curso',
        start_time: new Date().toISOString()
      }).select().single();

      if (tripError) throw tripError;
      setCurrentTrip(data);
      setIsTracking(true);
      setGpsLogs([]);
      addGPSLog("🚀 Operación iniciada - SAT Pro Activo");
      const id = startGPSWatch(data.id);
      setWatchId(id);
    } catch (e) { setError('Error al iniciar'); }
  };

  const stopTracking = async () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (currentTrip) {
      await supabase.from('trips').update({ end_time: new Date().toISOString(), status: 'finalizado' }).eq('id', currentTrip.id);
      onTripUpdate();
    }
    setIsTracking(false);
    setCurrentTrip(null);
    setCurrentSpeed(0);
    addGPSLog("🏁 Operación finalizada");
  };

  return (
    <div className="h-screen flex items-center justify-center p-4 bg-[#020617]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden bg-slate-900 border-slate-800">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 flex justify-between items-center">
          <h2 className="text-2xl font-black text-white flex items-center space-x-3">
            <Navigation className="w-8 h-8" />
            <span>MineConnect SAT Pro</span>
          </h2>
          {batteryLevel && <span className="text-blue-200 text-sm font-bold">{batteryLevel}% 🔋</span>}
        </div>

        <div className="p-4 bg-slate-800/50 border-b border-slate-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black">Velocidad</p>
              <p className="text-2xl font-black text-white">{currentSpeed} <span className="text-xs">km/h</span></p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black">Estado</p>
              <div className={`flex items-center justify-center space-x-2 ${isTracking ? 'text-emerald-400' : 'text-slate-500'}`}>
                <Activity className={`w-4 h-4 ${isTracking ? 'animate-pulse' : ''}`} />
                <span className="font-bold text-sm">{isTracking ? 'EN RUTA' : 'STANDBY'}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black">Cronómetro</p>
              <p className="text-2xl font-black text-blue-400">
                {Math.floor(tripDuration / 60)}:{(tripDuration % 60).toString().padStart(2, '0')}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 flex flex-col items-center">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={isTracking ? stopTracking : startTracking}
            className={`w-40 h-40 rounded-full flex items-center justify-center shadow-2xl transition-all ${
              isTracking ? 'bg-red-600 shadow-red-900/40' : 'bg-emerald-600 shadow-emerald-900/40'
            }`}
          >
            {isTracking ? <Pause className="w-16 h-16 text-white" /> : <Play className="w-16 h-16 text-white ml-2" />}
          </motion.button>

          <div className="w-full mt-8">
            <p className="text-xs text-slate-500 font-bold uppercase mb-2 flex items-center">
              <Smartphone className="w-3 h-3 mr-2" /> Consola GPS
            </p>
            <div ref={logContainerRef} className="rounded-xl p-4 h-40 overflow-y-auto font-mono text-[10px] bg-black/50 text-emerald-500 border border-slate-800">
              {gpsLogs.map((log, i) => (
                <div key={i} className="mb-1">
                  <span className="opacity-50">[{log.timestamp}]</span> {log.message}
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 mt-4 text-sm text-center">{error}</p>}
        </div>
      </motion.div>
    </div>
  );
}
