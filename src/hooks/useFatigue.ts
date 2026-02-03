import { useState, useEffect, useRef } from 'react';
import type { Alert } from '../types';
import { useVehicles } from '../context/VehicleContext';

export const useFatigue = (driverId: string | undefined) => {
    const { logSecurityEvent } = useVehicles();
    const [biorhythm, setBiorhythm] = useState(100); // 100% despierto
    const [alerts, setAlerts] = useState<Alert[]>([]);

    useEffect(() => {
        if (!driverId) return;

        const interval = setInterval(() => {
            setBiorhythm(prev => {
                const drop = Math.random() * 2;
                const newVal = Math.max(0, prev - drop);

                if (newVal < 30 && prev >= 30) {
                    // Trigger alert warning
                    logSecurityEvent('FATIGUE_ALERT', 'medium', { level: newVal, driverId });
                }
                return newVal;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [driverId]);

    return { biorhythm, fatigueAlerts: alerts };
};
