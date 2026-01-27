// src/components/DriverSimulator.tsx
import { useState } from 'react';
import type { UserProfile } from '../App';
// Eliminamos React import (presunto en tu setup moderno ya está en el runtime)
type Position = { lat: number; lng: number } | null;

interface DriverSimulatorProps {
  userProfile: UserProfile | null;
}

export default function DriverSimulator({ userProfile }: DriverSimulatorProps) {
  const [position, setPosition] = useState<Position>(null);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Company ID is not tracked when not needed

  // Retry GPS (3 intentos, 5s)
  const gpsWithRetry = async (maxRetries = 3, delayMs = 5000): Promise<Position> => {
    let attempts = 0;
    const tryGet = (): Promise<Position> => new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation no soportado'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
      );
    });
    while (attempts < maxRetries) {
      attempts++;
      try {
        const p = await tryGet();
        return p;
      } catch (e) {
        if (attempts >= maxRetries) throw e;
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
    return null;
  };

  const startTrip = async () => {
    setError(null);
    setTracking(true);
    try {
      const pos = await gpsWithRetry(3, 5000);
      setPosition(pos);
      // Aquí podrías insertar el inicio de viaje en Supabase con company_id
    } catch (err: any) {
      setError(`GPS: ${err?.message ?? 'Desconocido'}`);
      setTracking(false);
    }
  };

  const stopTrip = () => {
    setTracking(false);
    setPosition(null);
  };

  return (
    <div className="h-screen p-4 lg:p-6 safe-area bg-[#020617] text-white">
      <div className="max-w-2xl mx-auto bg-slate-800/60 border border-slate-700 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {/* Icono de estado */}
            Conductor
          </div>
          <div className="text-sm text-slate-300">{userProfile?.role ?? ''}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900 rounded-xl p-4">
            <div className="text-xs text-slate-300">Posición</div>
            <div className="text-xl font-bold">{position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : 'Sin datos'}</div>
          </div>
          <div className="bg-slate-900 rounded-xl p-4">
            <div className="text-xs text-slate-300">Estado</div>
            <div className="text-xl font-bold">{tracking ? 'En ruta' : 'Parado'}</div>
          </div>
        </div>

        {error && <div className="p-3 mb-2 bg-red-500/20 border border-red-600 rounded">{error}</div>}

        <div className="flex space-x-3">
          {userProfile?.role === 'CONDUCTOR' && (
            <button onClick={startTrip} className="px-4 py-2 rounded bg-blue-600 text-white">Iniciar Viaje</button>
          )}
          <button onClick={stopTrip} className="px-4 py-2 rounded bg-slate-600 text-white">Detener</button>
        </div>

        <div className="mt-4 h-80 rounded-xl border border-slate-700 bg-black/20 flex items-center justify-center">
          Mapa simulador (placeholder)
        </div>
      </div>
    </div>
  );
}
