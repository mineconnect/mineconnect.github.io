
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { useVehicles } from './VehicleContext'; // To get selectedCompanyId if needed for additional filtering logic

// Types
export type NotificationType = 'SOS' | 'GEOFENCE' | 'FATIGUE';

export interface NotificationItem {
    id: string;
    type: NotificationType;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    timestamp: Date;
    read: boolean;
    vehicleId?: string;
    details?: any;
    count?: number; // For grouped notifications
}

interface NotificationContextType {
    notifications: NotificationItem[];
    unreadCount: number;
    markAllAsRead: () => void;
    markAsRead: (id: string) => void;
    clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Sound Assets (Assuming these exist in public/sounds/)
// You should add these files: public/sounds/sos_siren.mp3, public/sounds/warning_beep.mp3
const SOUNDS = {
    SOS: new Audio('/sounds/sos_siren.mp3'),
    WARNING: new Audio('/sounds/warning_beep.mp3'),
};

// Preload sounds
Object.values(SOUNDS).forEach(audio => {
    audio.load();
    audio.volume = 1.0;
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { state: vehicleState } = useVehicles(); // To access selectedCompanyId for SuperAdmin filtering
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    // Grouping / Anti-Spam Logic refs
    const recentWarningsRef = useRef<{ [key: string]: number }>({});
    const groupingTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

    // Filtering logic helper
    const shouldNotify = useCallback((companyIdFromEvent: string) => {
        if (!user) return false;

        // If user is SuperAdmin (logic to determine superadmin usually involves a profile check or role)
        // For now, assuming if vehicleState.companies exists and is populated, we might be admin.
        // But simpler: 
        // 1. If we have a selectedCompanyId global filter, ONLY show events from that company
        // 2. If we DON'T have a selectedCompanyId (Global View), show ALL events (User sees everything they have access to via RLS)

        if (vehicleState.selectedCompanyId) {
            return companyIdFromEvent === vehicleState.selectedCompanyId;
        }

        return true;
    }, [user, vehicleState.selectedCompanyId]);

    const playSound = (type: 'SOS' | 'WARNING') => {
        const audio = type === 'SOS' ? SOUNDS.SOS : SOUNDS.WARNING;
        audio.currentTime = 0;
        audio.play().catch(err => console.warn("Audio play blocked (user must interact first):", err));
    };

    const addNotification = (newItem: NotificationItem) => {
        setNotifications(prev => [newItem, ...prev]);
    };

    const handleNewEvent = useCallback((payload: any) => {
        const eventData = payload.new;

        // Check if we should notify based on company filter
        // Note: We need company_id in the event payload. If security_events doesn't have it explicitly, 
        // we might need to rely on the join or ensure the INSERT includes it. 
        // Assuming 'company_id' is present in security_events as per standard multi-tenant architecture.
        if (eventData.company_id && !shouldNotify(eventData.company_id)) {
            return;
        }

        const type = eventData.type as NotificationType;
        const severity = eventData.severity;
        const message = `Evento Detectado: ${type} - ${severity}`; // Customize message based on details if available

        // CRITICAL HANDLING (SOS) - No grouping, immediate persistent alert
        if (type === 'SOS' || severity === 'critical') {
            playSound('SOS');
            toast.error(message, {
                description: `Vehículo: ${eventData.vehicle_id || 'Desconocido'} - Hora: ${new Date().toLocaleTimeString()}`,
                duration: Infinity, // Persistent
                action: {
                    label: 'Ver Detalles',
                    onClick: () => console.log('Navigating to event', eventData.id)
                },
                style: {
                    border: '2px solid red',
                    backgroundColor: '#ffeef0'
                }
            });

            addNotification({
                id: eventData.id,
                type: 'SOS',
                severity: 'critical',
                message,
                timestamp: new Date(eventData.timestamp),
                read: false,
                vehicleId: eventData.vehicle_id,
                details: eventData.details
            });
            return;
        }

        // WARNING/INFO HANDLING (Geocence, Fatigue) - Apply Grouping
        const groupKey = `${type}_${eventData.vehicle_id || 'general'}`;

        // Increment counter for this specific warning type
        recentWarningsRef.current[groupKey] = (recentWarningsRef.current[groupKey] || 0) + 1;

        // Clear existing timeout to "debounce" the final notification
        if (groupingTimeoutRef.current[groupKey]) {
            clearTimeout(groupingTimeoutRef.current[groupKey]);
        }

        // Set a timeout to fire the notification if no more come in quickly (e.g., 2 seconds buffer)
        // OR checks if we hit a threshold immediately? 
        // Strategy: Wait 1 second. If count > 1, show grouped. Else show single.

        groupingTimeoutRef.current[groupKey] = setTimeout(() => {
            const count = recentWarningsRef.current[groupKey];

            playSound('WARNING');

            const displayMessage = count > 1
                ? `${count} nuevas alertas de ${type} detectadas`
                : message;

            toast(displayMessage, {
                description: count > 1 ? 'Múltiples eventos recibidos en breve periodo.' : `Vehículo: ${eventData.vehicle_id}`,
                duration: 10000, // 10 seconds ephemeral
                style: {
                    borderLeft: '4px solid orange'
                }
            });

            addNotification({
                id: eventData.id, // Using the ID of the last one, or generate a unique ID for the group
                type: type,
                severity: severity,
                message: displayMessage,
                timestamp: new Date(),
                read: false,
                count: count,
                vehicleId: eventData.vehicle_id
            });

            // Reset counter
            delete recentWarningsRef.current[groupKey];
            delete groupingTimeoutRef.current[groupKey];
        }, 1500); // 1.5s buffer window

    }, [shouldNotify]);


    useEffect(() => {
        if (!user) return;

        // Subscribe to security_events
        const channel = supabase
            .channel('notification_center')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'security_events'
                },
                handleNewEvent
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, handleNewEvent]);

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const clearNotifications = () => {
        setNotifications([]);
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAllAsRead, markAsRead, clearNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
