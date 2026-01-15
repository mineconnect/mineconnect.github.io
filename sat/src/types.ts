
export type UserRole = 'super_admin' | 'company_admin' | 'driver';

export interface Company {
  id: string;
  name: string;
  plan: 'basic' | 'pro' | 'enterprise';
  created_at?: string;
}

export interface UserProfile {
  id: string; // Supabase Auth ID
  email: string;
  role: UserRole;
  company_id: string | null; // Null for super_admin
  full_name: string;
}

export interface Trip {
  id: string;
  driver_id: string;
  company_id: string;
  vehicle_id: string;
  status: 'active' | 'delayed' | 'completed' | 'sos';
  last_ping: string; // ISO date
  current_lat: number;
  current_lng: number;
  destination?: string;
  battery_level: number;
  speed_kmh?: number;
  // --- CAMPOS ADICIONALES OBSERVADOS EN USO ---
  duration_seconds?: number;
  distance_meters?: number;
  max_speed?: number;
  start_address?: string;
  end_address?: string;
  alerts?: any[]; // Puede ser un array de objetos de alerta
}

export interface TripLog {
  id: string;
  trip_id: string;
  lat: number;
  lng: number;
  speed: number;
  timestamp: string;
  synced: boolean;
}

// Chat types
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  sources?: Array<{ uri: string; title: string }>;
}

export const ImageSize = {
  SIZE_1K: '1K',
  SIZE_2K: '2K',
  SIZE_4K: '4K'
} as const;

export type ImageSize = typeof ImageSize[keyof typeof ImageSize];

