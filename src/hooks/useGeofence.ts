import { useState, useCallback } from 'react';
import { useVehicles } from '../context/VehicleContext';

export interface Geofence {
    id: string;
    name: string;
    type: 'danger' | 'warning' | 'info';
    coordinates: { lat: number; lng: number }[]; // Polygon points
}

export const useGeofence = () => {
    const { logSecurityEvent } = useVehicles();
    const [lastViolation, setLastViolation] = useState<string | null>(null);
    const [geofences, setGeofences] = useState<Geofence[]>([
        {
            id: 'g1',
            name: 'Zona de Explosivos',
            type: 'danger',
            coordinates: [
                { lat: -24.123, lng: -66.123 },
                { lat: -24.125, lng: -66.120 },
                { lat: -24.128, lng: -66.125 },
            ]
        }
    ]);

    const checkGeofence = useCallback((lat: number, lng: number) => {
        // Algoritmo Ray-Casting simplificado para punto en polígono
        return geofences.find(geo => {
            // Simulación de detección: Si lat/lng coinciden vagamente con la zona de peligro
            const isInside = (Math.abs(lat - -24.123) < 0.01 && Math.abs(lng - -66.123) < 0.01);

            if (isInside && lastViolation !== geo.id) {
                setLastViolation(geo.id);
                logSecurityEvent('GEOFENCE_VIOLATION', 'high', {
                    geofenceId: geo.id,
                    geofenceName: geo.name,
                    location: { lat, lng }
                });
            } else if (!isInside && lastViolation === geo.id) {
                setLastViolation(null);
            }

            return isInside;
        });
    }, [geofences]);

    const addGeofence = (geofence: Geofence) => {
        setGeofences(prev => [...prev, geofence]);
    };

    return { geofences, checkGeofence, addGeofence };
};
