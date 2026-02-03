import React, { createContext, useContext, useReducer, ReactNode, useEffect, useCallback } from 'react';
import { Vehicle, Alert, UserProfile, SecurityEvent, Company } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useLegalHash } from '../hooks/useLegalHash';

// State Definition
interface VehicleState {
    vehicles: Vehicle[];
    alerts: Alert[];
    securityEvents: SecurityEvent[];
    companies: Company[];
    selectedCompanyId: string | null;
    currentUser: UserProfile | null;
    isLoading: boolean;
}

// Initial State
const initialState: VehicleState = {
    vehicles: [],
    alerts: [],
    securityEvents: [],
    companies: [],
    selectedCompanyId: null,
    currentUser: null, // Reset default user to null for safety
    isLoading: true
};

// Actions
type VehicleAction =
    | { type: 'SET_VEHICLES'; payload: Vehicle[] }
    | { type: 'UPDATE_VEHICLE'; payload: Vehicle }
    | { type: 'UPDATE_VEHICLE_LOCATION'; payload: { id: string; lat: number; lng: number } }
    | { type: 'ADD_ALERT'; payload: Alert }
    | { type: 'ADD_SECURITY_EVENT'; payload: SecurityEvent }
    | { type: 'SET_SECURITY_EVENTS'; payload: SecurityEvent[] }
    | { type: 'SET_COMPANIES'; payload: Company[] }
    | { type: 'SET_SELECTED_COMPANY'; payload: string | null }
    | { type: 'SET_LOADING'; payload: boolean };

// Reducer
const vehicleReducer = (state: VehicleState, action: VehicleAction): VehicleState => {
    switch (action.type) {
        case 'SET_VEHICLES':
            return { ...state, vehicles: action.payload, isLoading: false };
        case 'UPDATE_VEHICLE':
            return {
                ...state,
                vehicles: state.vehicles.map(v =>
                    v.id === action.payload.id ? action.payload : v
                )
            };
        case 'UPDATE_VEHICLE_LOCATION':
            return {
                ...state,
                vehicles: state.vehicles.map(v =>
                    v.id === action.payload.id
                        ? { ...v, location: { lat: action.payload.lat, lng: action.payload.lng } }
                        : v
                )
            };
        case 'ADD_ALERT':
            return { ...state, alerts: [action.payload, ...state.alerts] };
        case 'ADD_SECURITY_EVENT':
            return { ...state, securityEvents: [action.payload, ...state.securityEvents] };
        case 'SET_SECURITY_EVENTS':
            return { ...state, securityEvents: action.payload };
        case 'SET_COMPANIES':
            return { ...state, companies: action.payload };
        case 'SET_SELECTED_COMPANY':
            return { ...state, selectedCompanyId: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        default:
            return state;
    }
};

// Mapper function to convert Supabase row to Vehicle type
const mapSupabaseToVehicle = (data: any): Vehicle => {
    return {
        id: data.id,
        plate: data.plate,
        status: data.status,
        location: {
            lat: data.lat,
            lng: data.lng
        },
        speed: data.speed || 0,
        heading: data.heading || 0,
        lastUpdate: new Date(data.last_update), // Convert ISO string to Date
        batteryLevel: data.battery_level,
        fatigueLevel: data.fatigue_level,
        companyId: data.company_id
    };
};

// Context Creation
const VehicleContext = createContext<{
    state: VehicleState;
    dispatch: React.Dispatch<VehicleAction>;
    logSecurityEvent: (type: SecurityEvent['type'], severity: SecurityEvent['severity'], details?: any, vehicleId?: string) => Promise<void>;
    setSelectedCompanyId: (id: string | null) => void;
    filteredVehicles: Vehicle[];
} | undefined>(undefined);

// Provider Component
export const VehicleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(vehicleReducer, initialState);
    const { user } = useAuth();
    const { generateHash } = useLegalHash();

    const setSelectedCompanyId = useCallback((id: string | null) => {
        dispatch({ type: 'SET_SELECTED_COMPANY', payload: id });
    }, []);

    const filteredVehicles = state.selectedCompanyId
        ? state.vehicles.filter(v => v.companyId === state.selectedCompanyId)
        : state.vehicles;

    const logSecurityEvent = useCallback(async (type: SecurityEvent['type'], severity: SecurityEvent['severity'], details: any = {}, vehicleId?: string) => {
        if (!user) return;

        const timestamp = new Date();
        const eventData = {
            type,
            severity,
            vehicleId,
            details,
            userId: user.id,
            timestamp: timestamp.toISOString()
        };

        const legalHash = await generateHash(eventData);

        const { error } = await supabase.from('security_events').insert({
            user_id: user.id,
            vehicle_id: vehicleId,
            type,
            severity,
            location: details.location || null, // Assuming location comes in details if available
            timestamp: timestamp.toISOString(),
            legal_hash: legalHash,
            details
        });

        if (error) {
            console.error('Error logging security event:', error);
        }
        // Optimistic update or wait for realtime subscription
    }, [user, generateHash]);

    useEffect(() => {
        if (!user) {
            dispatch({ type: 'SET_VEHICLES', payload: [] });
            dispatch({ type: 'SET_COMPANIES', payload: [] });
            return;
        }

        const fetchCompanies = async () => {
            // Fetch companies if user is superadmin (or just try, RLS will handle)
            // But strictly speaking, for optimization, check role? 
            // The prompt says "esto solo funcionará para ti gracias a la nueva política RLS".
            // So we should just fetch.
            const { data, error } = await supabase.from('companies').select('*');
            if (!error && data) {
                dispatch({ type: 'SET_COMPANIES', payload: data });
            }
        };

        const fetchVehicles = async () => {
            dispatch({ type: 'SET_LOADING', payload: true });

            const { data, error } = await supabase
                .from('vehicles')
                .select('*');

            if (error) {
                console.error('Error fetching vehicles:', error);
                dispatch({ type: 'SET_LOADING', payload: false });
                return;
            }

            if (data) {
                const mappedVehicles = data.map(mapSupabaseToVehicle);
                dispatch({ type: 'SET_VEHICLES', payload: mappedVehicles });
            }
        };

        fetchCompanies();
        fetchVehicles();

        // Real-time subscription
        const channel = supabase
            .channel('vehicles_channel')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'vehicles'
                },
                (payload) => {
                    console.log('Realtime update received:', payload);
                    if (payload.new) {
                        const updatedVehicle = mapSupabaseToVehicle(payload.new);
                        dispatch({ type: 'UPDATE_VEHICLE', payload: updatedVehicle });
                    }
                }
            )
            .subscribe();

        // Security Events Subscription
        const securityChannel = supabase
            .channel('security_events_channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'security_events'
                },
                (payload) => {
                    const newEvent = payload.new as any; // Cast to avoid inference issues with raw JSON
                    const securityEvent: SecurityEvent = {
                        id: newEvent.id,
                        userId: newEvent.user_id,
                        vehicleId: newEvent.vehicle_id,
                        type: newEvent.type,
                        severity: newEvent.severity,
                        location: newEvent.location,
                        timestamp: new Date(newEvent.timestamp),
                        legalHash: newEvent.legal_hash,
                        details: newEvent.details,
                        verified: true // By definition, if it comes from DB with hash, we consider it verified for notification purposes
                    };
                    dispatch({ type: 'ADD_SECURITY_EVENT', payload: securityEvent });

                    // Also trigger an Alert if critical/high
                    if (['critical', 'high'].includes(securityEvent.severity)) {
                        const alert: Alert = {
                            id: `alert-${securityEvent.id}`,
                            vehicleId: securityEvent.vehicleId || 'unknown',
                            type: securityEvent.type === 'SOS' ? 'sos' : 'geofence', // Simplified mapping
                            severity: securityEvent.severity as any,
                            timestamp: securityEvent.timestamp,
                            resolved: false
                        };
                        dispatch({ type: 'ADD_ALERT', payload: alert });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(securityChannel);
        };
    }, [user]);

    return (
        <VehicleContext.Provider value={{ state, dispatch, logSecurityEvent, setSelectedCompanyId, filteredVehicles }}>
            {children}
        </VehicleContext.Provider>
    );
};

// Custom Hook for Consumption
export const useVehicles = () => {
    const context = useContext(VehicleContext);
    if (!context) {
        throw new Error('useVehicles must be used within a VehicleProvider');
    }
    return context;
};
