import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useVehicles } from '../../context/VehicleContext';

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

// Custom Vehicle Icon using DivIcon for CSS Pulse Effect
const createVehicleIcon = (status: string) => {
    const colorClass = status === 'danger' ? 'bg-red-500 shadow-red-500'
        : status === 'warning' ? 'bg-orange-500 shadow-orange-500'
            : 'bg-emerald-500 shadow-emerald-500';

    return L.divIcon({
        className: 'custom-vehicle-icon',
        html: `<div class="w-4 h-4 rounded-full ${colorClass} shadow-[0_0_15px_rgba(0,0,0,0.5)] border-2 border-white relative">
                <div class="absolute inset-0 rounded-full animate-ping opacity-75 ${colorClass}"></div>
               </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
};

const SatelliteMap: React.FC = () => {
    const { filteredVehicles } = useVehicles();
    const vehicles = filteredVehicles;

    // Center map on Mines (Argentina Puna approx)
    const center: [number, number] = [-24.5, -67.0];

    return (
        <div className="w-full h-full relative z-0">
            <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%', background: '#050b14' }}>
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {vehicles.map(v => (
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
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Overlay Layers Control (Simulated) */}
            <div className="absolute bottom-8 left-8 z-[400] flex gap-2">
                <button className="px-4 py-2 glass rounded-lg text-xs hover:bg-white/10 transition-colors text-white">Capas</button>
                <button className="px-4 py-2 glass rounded-lg text-xs hover:bg-white/10 transition-colors text-white">Zonas de Riesgo</button>
            </div>
        </div>
    );
};

export default SatelliteMap;
