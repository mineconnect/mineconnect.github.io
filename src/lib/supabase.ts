
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Using fallback mode.');
} else {
    console.log('--- Verificando Integridad de Llaves ---', {
        urlPrefix: 'HIDDEN',
        keyPrefix: 'HIDDEN'
    });
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);

export const isSupabaseConfigured = () => {
    return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'undefined');
};
