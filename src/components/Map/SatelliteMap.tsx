import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useVehicles } from '../../context/VehicleContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Fix Leaflet default icon issue
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: iconMarker,
    iconRetinaUrl: iconRetina,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Optimized Static Truck Icon (Top View) - SVG Data URI
// Simple truck shape: Rectangular body + Cab
const getTruckColor = (status: string) => {
    switch (status) {
        case 'danger': return '#ef4444'; // red-500
        case 'warning': return '#f97316'; // orange-500
        default: return '#10b981'; // emerald-500
    }
};

const createVehicleIcon = (status: string) => {
    const color = getTruckColor(status);
    // SVG Truck Top View
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5">
      <path d="M4 8h11v8H4z" />
      <path d="M15 8h3a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-3z" />
      <path d="M5 16h2 M11 16h2" stroke-linecap="round" />
    </svg>`;

    // Encoded SVG for L.icon (Better performance than L.divIcon with innerHTML for massive markers)
    const encoded = 'data:image/svg+xml;base64,' + btoa(svg);

    return L.icon({
        iconUrl: encoded,
        iconSize: [28, 28], // Small but visible
        iconAnchor: [14, 14],
        popupAnchor: [0, -10],
        className: 'static-truck-icon'
    });
};

// Custom Cluster Icon for "Dark Glassmorphism" look
const createClusterCustomIcon = function (cluster: any) {
    const count = cluster.getChildCount();
    let colorClass = 'bg-cyan-500/80';
    if (count > 10) colorClass = 'bg-blue-600/80';
    if (count > 50) colorClass = 'bg-purple-600/80';

    return L.divIcon({
        html: `<div class="flex items-center justify-center w-full h-full rounded-full ${colorClass} text-white font-bold text-xs border border-white/30 backdrop-blur-sm shadow-xl">
                ${count}
              </div>`,
        className: 'custom-cluster-icon',
        iconSize: L.point(33, 33, true),
    });
};

import ErrorBoundary from '../ErrorBoundary';

const SatelliteMap: React.FC = () => {
    const { filteredVehicles } = useVehicles();

    // Memoize the center to avoid unnecessary calculations
    const center: [number, number] = useMemo(() => {
        // Centro de Emergencia: Base Minera si falla todo
        return [-24.84, -65.71];
    }, []);

    // Memoize the markers list
    const markers = useMemo(() => {
        try {
            // Filtro de Seguridad: Solo vehículos con coordenadas válidas
            const validVehicles = filteredVehicles.filter(v =>
                v &&
                v.location &&
                typeof v.location.lat === 'number' &&
                typeof v.location.lng === 'number' &&
                !isNaN(v.location.lat) &&
                !isNaN(v.location.lng)
            );

            if (validVehicles.length === 0) {
                // Si no hay vehículos válidos, no renderizar nada pero NO romper
                return null;
            }

            return validVehicles.map(v => (
                <Marker
                    key={v.id}
                    position={[v.location.lat, v.location.lng]}
                    icon={createVehicleIcon(v.status)}
                >
                    <Popup className="glass-popup">
                        <div className="p-2 min-w-[150px]">
                            <h3 className="font-bold text-accent">{v.plate}</h3>
                            <p className="text-xs text-gray-300">Velocidad: {v.speed} km/h</p>
                            <p className="text-xs text-gray-300">Estado: {v.status.toUpperCase()}</p>
                            <div className="mt-2 text-[10px] text-gray-400 border-t border-gray-600 pt-1 flex items-center gap-1">
                                {/* Small static dot instead of pulse to keep popup light */}
                                <div className={`w-2 h-2 rounded-full ${v.status === 'danger' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                Actualizado: {formatDistanceToNow(new Date(v.lastUpdate), { addSuffix: true, locale: es })}
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ));
        } catch (e) {
            console.error("Error CRÍTICO renderizando marcadores:", e);
            return null; // Fallback seguro: mapa vacío mejor que pantalla negra
        }
    }, [filteredVehicles]);

    return (
        <ErrorBoundary>
            <div className="w-full h-full relative z-0">
                <MapContainer
                    center={center}
                    zoom={10}
                    maxZoom={18}
                    style={{ height: '100%', width: '100%', background: '#050b14' }}
                    preferCanvas={true} // Performance boost for many markers
                >
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />

                    <MarkerClusterGroup
                        chunkedLoading // Performance for massive amounts of markers
                        iconCreateFunction={createClusterCustomIcon}
                        spiderfyOnMaxZoom={true}
                        showCoverageOnHover={false}
                    >
                        {markers}
                    </MarkerClusterGroup>
                </MapContainer>

                {/* Overlay Layers Control (Simulated) */}
                <div className="absolute bottom-8 left-8 z-[400] flex gap-2">
                    <button className="px-4 py-2 glass rounded-lg text-xs hover:bg-white/10 transition-colors text-white">Capas</button>
                    <button className="px-4 py-2 glass rounded-lg text-xs hover:bg-white/10 transition-colors text-white">Zonas de Riesgo</button>
                </div>
            </div>
        </ErrorBoundary>
    );
};

// Exporting Memoized Component
export default React.memo(SatelliteMap);
