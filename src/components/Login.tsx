// src/components/Login.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark'|'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('mineconnect-theme') as 'dark'|'light';
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('mineconnect-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Por favor, introduce tu email y contraseña.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        let msg = 'Error al iniciar sesión';
        if (signInError.message.includes('Invalid login credentials')) {
          msg = 'Email o contraseña incorrectos';
        } else if (signInError.message.includes('Email not confirmed')) {
          msg = 'Por favor confirma tu email';
        }
        setError(msg);
      }
    } catch (err) {
      setError('Error inesperado. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme==='dark' ? 'bg-[#020617]' : 'bg-white'} flex items-center justify-center p-4`}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700 shadow-2xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="text-2xl font-black text-white">MineConnect SAT</div>
          <button onClick={toggleTheme} className="p-2 rounded bg-white/10 text-white">
            {theme === 'dark' ? '🌞' : '🌙'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity:0, y:-8 }}
                animate={{ opacity:1, y:0 }}
                className="flex items-center space-x-3 p-3 rounded border border-red-600 bg-red-500/10 text-red-400"
              >
                <AlertCircle className="w-5 h-5" /><span className="text-sm">{error}</span>
              </motion.div>
            </AnimatePresence>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              placeholder="email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded bg-slate-700/50 border border-slate-600 text-white"
              disabled={loading}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 rounded bg-slate-700/50 border border-slate-600 text-white"
              disabled={loading}
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button type="submit" className="w-full py-3 rounded bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold" disabled={loading}>
            {loading ? <span>Verificando...</span> : 'Iniciar Sesión'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
