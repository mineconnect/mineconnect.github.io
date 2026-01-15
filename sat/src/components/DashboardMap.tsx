
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Trip } from '../types';
import { Navigation, Signal, Battery } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// Fix Leaflet icon
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconShadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    shadowUrl: iconShadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Fallback Mock Data in case Supabase table is empty or connection fails
const MOCK_TRIPS: Trip[] = [
  { id: 'mock-1', driver_id: 'd1', company_id: 'c1', vehicle_id: 'HILUX-DEMO', status: 'active', last_ping: new Date().toISOString(), current_lat: -34.6037, current_lng: -58.3816, battery_level: 85, speed_kmh: 65 },
  { id: 'mock-2', driver_id: 'd2', company_id: 'c1', vehicle_id: 'CAT-DEMO', status: 'delayed', last_ping: new Date().toISOString(), current_lat: -24.1858, current_lng: -65.2995, battery_level: 42, speed_kmh: 0 },
];

const DashboardMap: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);

  useEffect(() => {
    fetchTrips();
    
    // Subscribe to realtime updates for trips
    const channel = supabase
      .channel('public:trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
        console.log('Realtime update:', payload);
        setIsRealtime(true);
        fetchTrips(); // Refresh data on change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase.from('trips').select('*');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setTrips(data);
      } else {
        // Fallback to mock if DB is empty for demo purposes
        setTrips(MOCK_TRIPS);
      }
    } catch (e) {
      console.warn("Supabase fetch failed (Tables might not exist), using mock data.", e);
      setTrips(MOCK_TRIPS);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4">
      {/* Map Area */}
      <div className="flex-1 rounded-xl overflow-hidden shadow-lg border border-slate-200 relative z-0">
        <MapContainer center={[-34.6037, -58.3816]} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {trips.map(trip => (
            <Marker
              key={trip.id}
              position={[trip.current_lat, trip.current_lng]}
              eventHandlers={{
                click: () => setSelectedTrip(trip),
              }}
            >
              <Popup>
                <div className="font-sans min-w-[150px]">
                  <strong className="block text-sm text-slate-900 mb-1">{trip.vehicle_id}</strong>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                     <span>Bat: {trip.battery_level}%</span>
                     <span>Vel: {trip.speed_kmh || 0} km/h</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Último Ping: {new Date(trip.last_ping).toLocaleTimeString()}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Status Overlay */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
            <div className={`px-3 py-1 rounded-full shadow-md text-xs font-semibold flex items-center gap-2 ${isRealtime ? 'bg-white/90 text-emerald-600' : 'bg-white/90 text-slate-500'}`}>
                <div className={`w-2 h-2 rounded-full ${isRealtime ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                {isRealtime ? 'Satelital Activo (Realtime)' : 'Modo Demo / Polling'}
            </div>
        </div>
      </div>

      {/* Sidebar List */}
      <div className="w-full md:w-80 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            Flota ({trips.length})
          </h3>
          {loading && <div className="text-xs text-slate-400">Actualizando...</div>}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {trips.map(trip => (
            <div
              key={trip.id}
              onClick={() => setSelectedTrip(trip)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedTrip?.id === trip.id 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-white border-slate-100 hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-sm text-slate-800">{trip.vehicle_id}</span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  trip.status === 'sos' ? 'bg-red-100 text-red-600' :
                  trip.status === 'delayed' ? 'bg-amber-100 text-amber-600' :
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  {trip.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                 <div className="flex items-center gap-1">
                    <Battery className="w-3 h-3" />
                    {trip.battery_level}%
                 </div>
                 <div className="flex items-center gap-1">
                    <Signal className="w-3 h-3" />
                    {trip.speed_kmh || 0} km/h
                 </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400">
                <span>ID: {trip.company_id || 'N/A'}</span>
                <span>{new Date(trip.last_ping).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardMap;

