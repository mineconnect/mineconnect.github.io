import { createClient } from '@supabase/supabase-js';

// 1. Leemos las variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// 2. Depuración (para estar seguros)
console.log("🔌 Iniciando Supabase...");
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("🚨 ERROR FATAL: Faltan las claves de Supabase en el archivo .env");
}

// 3. Crear Clientes
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = supabaseServiceRoleKey 
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
      })
    : supabase;

// 4. ✅ RESTAURAMOS LA FUNCIÓN PERDIDA
export const saveLocationUpdate = async (tripId: string, lat: number, lng: number, speed: number) => {
    try {
        const { error } = await supabase.from('trip_logs').insert({
            trip_id: tripId,
            lat: lat,
            lng: lng,
            speed: speed,
            timestamp: new Date().toISOString()
        });

        if (error) throw error;
        console.log("📍 Punto guardado:", { lat, lng, speed });
    } catch (err) {
        console.error("Error guardando ubicación:", err);
    }
};