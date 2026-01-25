export interface Position {
  lat: number;
  lng: number;
  speed?: number;
  timestamp: number;
}

export interface Trip {
  id: string;
  plate: string;
  vehicle_id: string;
  driver_id: string;
  driver_name: string;
  company_id: string;
  start_time: string;
  end_time: string | null;
  status: 'en_curso' | 'finalizado';
  max_speed: number;
  avg_speed: number;
  created_at: string;
}

export interface TripLog {
  id: string;
  trip_id: string;
  lat: number;
  lng: number;
  speed: number;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  company_id: string;
  role: 'admin' | 'operator' | 'viewer';
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  name: string;
  status: 'active' | 'inactive';
  last_position?: Position;
}