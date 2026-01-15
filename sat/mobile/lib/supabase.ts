import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

// Debugging: Log the Supabase Anon Key to check for issues
console.log("DEBUG KEY:", supabaseAnonKey);

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const saveLocationUpdate = async (tripId: string, userId: string, lat: number, lng: number, speed: number | null) => {
    try {
        const { error } = await supabase.from('trip_logs').insert({
            trip_id: tripId,
            user_id: userId,
            lat: lat,
            lng: lng,
            speed: speed,
            timestamp: new Date().toISOString()
        });

        if (error) throw error;
        console.log("📍 Location saved:", { trip_id: tripId, user_id: userId, lat, lng, speed }); // Added user_id to log
    } catch (err) {
        console.error("Error saving location:", err);
    }
};