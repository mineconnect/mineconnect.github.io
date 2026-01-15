import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- TIPOS DE DATOS ---
interface LogData {
    lat: number;
    lng: number;
    speed: number;
    timestamp: string;
}

interface VisorProps {
    logs: LogData[];
}

const VisorDeRuta: React.FC<VisorProps> = ({ logs }) => {
  const { segmentos, paradas, centroMapa } = useMemo(() => {
    // Si no hay datos, centramos en Argentina por defecto
    if (!logs || logs.length === 0) return { segmentos: [], paradas: [], centroMapa: [-34.6037, -58.3816] as [number, number] };

    const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Arrays para guardar el resultado
    let segments: { positions: [number, number][], color: string, avgSpeed: number }[] = [];
    let stops: { lat: number; lng: number; duration: number; hora: string }[] = [];
    
    const getColor = (speed: number) => {
        if (speed < 5) return '#ef4444'; // Rojo (Parado)
        if (speed < 40) return '#eab308'; // Amarillo (Lento)
        if (speed < 80) return '#10b981'; // Verde (Normal)
        return '#f97316'; // Naranja (Rápido)
    };

    let currentPositions: [number, number][] = [[sortedLogs[0].lat, sortedLogs[0].lng]];
    let currentColor = getColor(sortedLogs[0].speed);
    let currentSpeeds: number[] = [sortedLogs[0].speed];
    
    let stopStartTime: LogData | null = null;

    for (let i = 0; i < sortedLogs.length - 1; i++) {
        const actual = sortedLogs[i];
        const siguiente = sortedLogs[i+1];
        const colorActual = getColor(actual.speed);
        
        // --- LÓGICA DE RUTAS Y COLORES ---
        if (colorActual !== currentColor) {
            const avg = Math.round(currentSpeeds.reduce((a, b) => a + b, 0) / currentSpeeds.length);
            segments.push({ positions: currentPositions, color: currentColor, avgSpeed: avg });
            
            currentPositions = [[actual.lat, actual.lng]];
            currentColor = colorActual;
            currentSpeeds = [actual.speed];
        }
        
        currentPositions.push([siguiente.lat, siguiente.lng]);
        currentSpeeds.push(siguiente.speed);

        // --- LÓGICA DE PARADAS (DETECCIÓN) ---
        if (actual.speed < 2) {
            if (!stopStartTime) stopStartTime = actual;
        } else {
            if (stopStartTime) {
                const duration = (new Date(actual.timestamp).getTime() - new Date(stopStartTime.timestamp).getTime()) / 60000;
                // Consideramos parada si estuvo más de 3 minutos quieto
                if (duration > 3) { 
                    stops.push({ 
                        lat: stopStartTime.lat, 
                        lng: stopStartTime.lng, 
                        duration: Math.round(duration),
                        hora: new Date(stopStartTime.timestamp).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})
                    });
                }
                stopStartTime = null;
            }
        }
    }
    
    if (currentPositions.length > 0) {
        const avg = Math.round(currentSpeeds.reduce((a, b) => a + b, 0) / currentSpeeds.length);
        segments.push({ positions: currentPositions, color: currentColor, avgSpeed: avg });
    }

    // Calcular centro
    const centerLat = sortedLogs.reduce((acc, curr) => acc + curr.lat, 0) / sortedLogs.length;
    const centerLng = sortedLogs.reduce((acc, curr) => acc + curr.lng, 0) / sortedLogs.length;

    return { segmentos: segments, paradas: stops, centroMapa: [centerLat, centerLng] as [number, number] };
  }, [logs]);

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', zIndex: 0 }}>
      <MapContainer center={centroMapa} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer 
            attribution='&copy; OSM'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
        />
        
        {/* DIBUJO DE LA RUTA */}
        {segmentos.map((seg, i) => (
            <Polyline key={i} positions={seg.positions} pathOptions={{ color: seg.color, weight: 6, opacity: 0.8 }}>
                <Tooltip sticky>
                    <div className="text-xs font-bold text-slate-700">
                        Velocidad prom: {seg.avgSpeed} km/h
                    </div>
                </Tooltip>
            </Polyline>
        ))}

        {/* DIBUJO DE LAS PARADAS */}
        {paradas.map((p, i) => (
            <CircleMarker key={i} center={[p.lat, p.lng]} radius={10} pathOptions={{ color: '#b91c1c', fillColor: '#fca5a5', fillOpacity: 0.9, weight: 2 }}>
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                    <div className="text-center">
                        <strong className="block text-red-600 uppercase">🛑 Parada Detectada</strong>
                        <span className="text-slate-800 font-bold">{p.duration} min</span>
                        <br/>
                        <span className="text-xs text-gray-500">Hora: {p.hora}</span>
                    </div>
                </Tooltip>
            </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default VisorDeRuta;