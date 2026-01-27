// HistoryPanel.tsx - versión simplificada y limpia
import { Globe, MapPin } from 'lucide-react';
import type { Trip, UserProfile } from '../App';

interface HistoryPanelProps {
  trips: Trip[];
  userProfile: UserProfile | null;
}

export default function HistoryPanel({ trips, userProfile }: HistoryPanelProps) {
  // RBAC simple
  const isSuperAdmin = userProfile?.email === 'fbarrosmarengo@gmail.com' || userProfile?.role === 'SUPERADMIN';
  const visibleTrips = trips.filter(t => {
    if (!userProfile) return false;
    if (isSuperAdmin) return true;
    if (userProfile.role === 'COORDINADOR') return t.company_id === userProfile.company_id;
    return false;
  });

  // (El polylinePositions y analyzeTrip han sido eliminados para simplificar el panel)

  return (
    <div className={`h-screen p-4 lg:p-6 safe-area bg-[#020617] text-white`}>
      <div className="h-full rounded-2xl border overflow-hidden flex flex-col">
        <div className="p-4 lg:p-6 border-b flex items-center">
          <Globe className="w-5 h-5" />
          <span className="ml-2 font-bold">Historial SAT</span>
        </div>
        <div className="p-4 overflow-y-auto">
          {visibleTrips.length === 0 ? (
            <div className="text-center text-slate-400">Sin datos</div>
          ) : (
            visibleTrips.map(trip => (
              <div key={trip.id} className="bg-slate-900/40 border border-slate-700 rounded-lg p-3 mb-3 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4" />
                  <div>
                    <div className="font-semibold">{trip.plate} - {trip.driver_name}</div>
                    <div className="text-xs text-slate-400">{trip.start_time}</div>
                  </div>
                </div>
                <span className="text-xs text-slate-300">{trip.driver_name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
