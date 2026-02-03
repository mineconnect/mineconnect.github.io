export type VehicleStatus = 'online' | 'offline' | 'warning' | 'danger';

export interface Vehicle {
    id: string;
    plate: string;
    driverId?: string;
    status: VehicleStatus;
    location: {
        lat: number;
        lng: number;
    };
    speed: number;
    heading: number;
    lastUpdate: Date;
    batteryLevel?: number;
    fatigueLevel?: number; // 0-100
    companyId?: string; // Multi-tenant support
}

export interface Company {
    id: string;
    name: string;
    logo_url?: string;
    plan?: 'basic' | 'pro' | 'enterprise';
}

export interface UserProfile {
    id: string;
    email: string;
    fullName: string;
    role: 'superadmin' | 'admin' | 'coordinator' | 'driver';
    companyId: string;
    avatarUrl?: string;
}

export interface Alert {
    id: string;
    vehicleId: string;
    type: 'speed' | 'geofence' | 'fatigue' | 'sos';
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    resolved: boolean;
}

export interface SecurityEvent {
    id: string;
    userId: string;
    vehicleId?: string;
    type: 'SOS' | 'GEOFENCE_VIOLATION' | 'FATIGUE_ALERT' | 'SOS_RESOLVED';
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    location?: {
        lat: number;
        lng: number;
    };
    timestamp: Date;
    legalHash: string;
    details?: any;
    verified?: boolean; // For UI display
}
