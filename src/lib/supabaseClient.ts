import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Las variables de entorno de Supabase no están configuradas')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          company_id: string
          role: 'SUPERADMIN' | 'COORDINADOR' | 'CONDUCTOR'
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          company_id: string
          role?: 'admin' | 'operator' | 'viewer'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          company_id?: string
          role?: 'admin' | 'operator' | 'viewer'
          created_at?: string
        }
      }
      trips: {
        Row: {
          id: string
          plate: string
          vehicle_id: string
          driver_id: string
          driver_name: string
          company_id: string
          start_time: string
          end_time: string | null
          status: 'en_curso' | 'finalizado'
          max_speed: number
          avg_speed: number
          created_at: string
        }
        Insert: {
          id?: string
          plate: string
          vehicle_id: string
          driver_id: string
          driver_name: string
          company_id: string
          start_time?: string
          end_time?: string | null
          status?: 'en_curso' | 'finalizado'
          max_speed?: number
          avg_speed?: number
          created_at?: string
        }
        Update: {
          id?: string
          plate?: string
          vehicle_id?: string
          driver_id?: string
          driver_name?: string
          company_id?: string
          start_time?: string
          end_time?: string | null
          status?: 'en_curso' | 'finalizado'
          max_speed?: number
          avg_speed?: number
          created_at?: string
        }
      }
      trip_logs: {
        Row: {
          id: string
          trip_id: string
          lat: number
          lng: number
          speed: number
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          lat: number
          lng: number
          speed: number
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          lat?: number
          lng?: number
          speed?: number
          created_at?: string
        }
      }
    }
  }
}