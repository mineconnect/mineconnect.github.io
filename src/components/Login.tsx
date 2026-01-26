import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile } from '../types';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    const checkExistingSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (profile) {
            onLogin(profile);
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    };
    
    checkExistingSession();
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (!isOnline) {
      setError('Sin conexión a internet. Por favor verifica tu conexión.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Attempt to sign in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        let errorMessage = 'Error de autenticación';
        
        if (signInError.message?.includes('Invalid login credentials')) {
          errorMessage = 'Email o contraseña incorrectos';
        } else if (signInError.message?.includes('Email not confirmed')) {
          errorMessage = 'Por favor confirma tu email antes de iniciar sesión';
        } else if (signInError.message?.includes('Too many requests')) {
          errorMessage = 'Demasiados intentos. Por favor espera unos minutos';
        }
        
        setError(errorMessage);
        return;
      }

      if (data.user) {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          setError('Error al cargar perfil de usuario');
          await supabase.auth.signOut();
          return;
        }

        onLogin(profile);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = email === 'fbarrosmarengo@gmail.com';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 safe-area">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700 shadow-2xl p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl mb-4">
              <ShieldCheck className="w-10 h-10 text-white" />
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full animate-ping"></div>
            </div>
            <h1 className="text-3xl font-black text-white mb-2">
              MINE<span className="text-blue-400">CONNECT</span> SAT
            </h1>
            <p className="text-slate-400 text-sm">
              Sistema de Rastreo Satelital
            </p>
            {isSuperAdmin && (
              <div className="mt-2 inline-flex items-center px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                <span className="text-xs text-emerald-400 font-medium">SUPERADMIN</span>
              </div>
            )}
          </div>

          {/* Connection Status */}
          <div className="mb-6">
            <div className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-full text-xs font-medium ${
              isOnline 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-400' : 'bg-red-400'
              } animate-pulse`}></div>
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="tu@email.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-center space-x-2"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span className="text-red-400 text-sm">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading || !isOnline}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all touch-button hardware-accelerated ${
                loading || !isOnline
                  ? 'bg-slate-600 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/30'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                <span>Iniciar Sesión</span>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <div className="text-center text-xs text-slate-500">
            <p>© 2024 MineConnect SAT Enterprise Edition</p>
            <p className="mt-1">Sistema avanzado de monitoreo satelital</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}