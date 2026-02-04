
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function Login() {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const cleanEmail = email.trim();
        const cleanPassword = password.trim();

        // --- DIAGNÓSTICO DE EMERGENCIA PARA SOPORTE ---
        // (Bloque de debug eliminado por políticas de seguridad)

        // 1. Limpieza de sesión forzada antes de intentar nada
        await supabase.auth.signOut();

        // 2. Intento de Login
        const { error } = await signIn(cleanEmail, cleanPassword);

        if (error) {
            console.error('❌ Error CRÍTICO en Login:', error);
            // if (email === 'fbarrosmarengo@gmail.com') {
            //     console.error('Detalles del error:', JSON.stringify(error, null, 2));
            //     console.groupEnd();
            // }

            // Mensaje más descriptivo si es posible
            let errorMessage = 'Credenciales inválidas. Por favor intente nuevamente.';
            if (error.message.includes('Email not confirmed')) errorMessage = 'El email no ha sido confirmado aún.';
            if (error.message.includes('Invalid login credentials')) errorMessage = 'Email o contraseña incorrectos.';

            setError(errorMessage);
            setLoading(false);
        } else {
            // Login exitoso
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-bg-primary overflow-hidden relative">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0f1c] to-black z-0"></div>
            <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse z-0"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse z-0 delay-1000"></div>

            <div className="relative z-10 w-full max-w-md p-8 glass rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl animate-fade-in-up">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">MineConnect <span className="text-primary">SAT</span></h1>
                    <p className="text-gray-400 text-sm font-light">Gestión Satelital Avanzada para Minería</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm flex items-center gap-2 animate-shake">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1">Email</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                </svg>
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 text-white rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all outline-none placeholder-gray-600"
                                placeholder="usuario@mineconnect.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1">Contraseña</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 text-white rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all outline-none placeholder-gray-600"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center mt-8"
                    >
                        {loading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            "INGRESAR AL SISTEMA"
                        )}
                    </button>

                    <div className="text-center pt-4">
                        <a href="#" className="text-xs text-gray-500 hover:text-primary transition-colors">¿Olvidaste tu contraseña?</a>
                    </div>
                </form>
            </div>

            <div className="absolute bottom-4 left-0 w-full text-center text-gray-600 text-xs font-mono">
                System Status: <span className="text-green-500">ONLINE</span> | v2.4.0-rc
            </div>
        </div>
    );
}
