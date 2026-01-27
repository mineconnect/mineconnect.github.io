// src/components/UserManagement.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Plus, Edit2, Trash2, Loader2, Eye, EyeOff, Shield, AlertCircle, Users } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile } from '../App';

interface UserManagementProps {
  userProfile: UserProfile | null;
  onUserUpdate?: () => void;
}

interface UserFormData {
  email: string;
  full_name: string;
  password: string;
  role: 'SUPERADMIN' | 'COORDINADOR' | 'CONDUCTOR';
  company_id: string;
}

export default function UserManagement({ userProfile, onUserUpdate }: UserManagementProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    full_name: '',
    password: '',
    role: 'CONDUCTOR',
    company_id: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [userProfile]);

  const fetchUsers = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*');
      if (userProfile.role === 'SUPERADMIN' || (userProfile.email === 'fbarrosmarengo@gmail.com')) {
        query = query;
      } else if (userProfile.role === 'COORDINADOR') {
        query = query
          .eq('role', 'CONDUCTOR')
          .eq('company_id', userProfile.company_id);
      } else {
        setUsers([]);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser && !passwordConfirmation) {
      setError('Por favor confirma la contraseña para actualizar');
      return;
    }

    if (editingUser && passwordConfirmation && passwordConfirmation !== formData.password) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!formData.email || !formData.full_name || (!editingUser && !formData.password)) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    // Regla de Coordinador: solo CONDUCTOR
    if (userProfile?.role === 'COORDINADOR' && formData.role !== 'CONDUCTOR') {
      setError('Los Coordinadores solo pueden crear Conductores');
      return;
    }

    // Validación de roles: Coordinador no puede crear Admin/SuperAdmin
    if (userProfile?.role === 'COORDINADOR' && (formData.role === 'SUPERADMIN' || formData.role === 'COORDINADOR')) {
      setError('Los Coordinadores no pueden crear Administradores o Coordinadores.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingUser) {
        const updateData: Partial<UserFormData> = {
          full_name: formData.full_name,
          role: formData.role,
          company_id: formData.company_id
        };

        if (formData.password) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            editingUser.id,
            { password: formData.password }
          );
          if (updateError) throw updateError;
        }

        const { error } = await supabase.from('profiles').update(updateData).eq('id', editingUser.id);
        if (error) throw error;
        setSuccess('Usuario actualizado exitosamente');
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });
        if (signUpError) throw signUpError;

        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user?.id,
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
          company_id: formData.company_id
        });
        if (profileError) throw profileError;
        setSuccess('Usuario creado exitosamente');
      }

      setFormData({ email: '', full_name: '', password: '', role: 'CONDUCTOR', company_id: '' });
      setPasswordConfirmation('');
      setEditingUser(null);
      await fetchUsers();
      onUserUpdate?.();
    } catch (error: any) {
      console.error('Error saving user:', error);
      let msg = 'Error al guardar usuario';
      if (error?.message?.includes('duplicate key')) msg = 'El email ya está registrado';
      else if (error?.message?.includes('Password')) msg = 'La contraseña debe tener al menos 6 caracteres';
      else if (error?.message?.includes('Email')) msg = 'Formato de email inválido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      email: user.email || '',
      full_name: user.full_name,
      password: '',
      role: user.role,
      company_id: user.company_id || '',
    });
    setPasswordConfirmation('');
    setSuccess(null);
    setError(null);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
    try {
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) console.error('Auth delete error:', authError);

      setSuccess('Usuario eliminado exitosamente');
      await fetchUsers();
      onUserUpdate?.();
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Error al eliminar usuario');
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({ email: '', full_name: '', password: '', role: 'CONDUCTOR', company_id: '' });
    setPasswordConfirmation('');
    setSuccess(null);
    setError(null);
  };

  if (!userProfile || (userProfile.role !== 'SUPERADMIN' && userProfile.role !== 'COORDINADOR')) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4 safe-area">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-400">Acceso Restringido</h2>
          <p className="text-slate-500">No tienes permisos para gestionar usuarios</p>
        </div>
      </div>
    );
  }

  const isAdmin = userProfile?.role === 'SUPERADMIN';
  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 lg:p-6 safe-area">
      <div className="h-full max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 lg:p-8">
            <h2 className="text-2xl lg:text-3xl font-black text-white flex items-center space-x-3">
              {isAdmin ? <Users className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
              <span>Gestión de Usuarios</span>
            </h2>
            <p className="text-blue-100 text-sm">{isAdmin ? 'Administración completa' : 'Gestión de conductores'}</p>
          </div>

          {/* Messages */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="mx-4 mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400" /><span className="text-red-400 text-sm">{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="mx-4 mt-4 p-4 bg-emerald-900/20 border border-emerald-700 rounded-lg flex items-center space-x-3">
                <Shield className="w-5 h-5 text-emerald-400" /><span className="text-emerald-400 text-sm">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-6 lg:p-8">
            {/* Formulario de creación/edición */}
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} className="bg-slate-900/30 rounded-2xl border border-slate-600 p-6 lg:p-8 mb-6">
              <h3 className="text-lg font-black text-slate-200 mb-6 flex items-center space-x-2">
                {editingUser ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                <span>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</span>
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                      placeholder="email@ejemplo.com"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                      placeholder="Juan Pérez"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-12 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                      placeholder={editingUser ? 'Dejar en blanco para mantener actual' : '••••••'}
                      disabled={loading}
                      required={!editingUser}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      {formData.password && (showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />)}
                    </button>
                  </div>
                </div>

                {editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Confirmar Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordConfirmation}
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                        placeholder="••••••"
                        disabled={loading}
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {userProfile?.role === 'SUPERADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Rol</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                          className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
                          disabled={loading}
                          required
                      >
                          <option value="SUPERADMIN">SuperAdmin</option>
                          <option value="COORDINADOR">Coordinador</option>
                          <option value="CONDUCTOR">Conductor</option>
                      </select>
                    </div>
                  </div>
                )}

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">ID de Empresa</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={formData.company_id}
                        onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                        placeholder="Auto generado si se deja vacío"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.95 }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg">
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </div>
                    ) : (
                      editingUser ? 'Actualizar Usuario' : 'Crear Usuario'
                    )}
                  </motion.button>
                  {editingUser && (
                    <motion.button type="button" onClick={resetForm} whileTap={{ scale: 0.95 }} className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-3 rounded-lg">
                      Cancelar
                    </motion.button>
                  )}
                </div>
              </form>
            </motion.div>

            {/* Listado de Usuarios */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  <div>Buscando usuarios...</div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-black text-slate-400">No hay usuarios registrados</h3>
                  <p className="text-slate-500">Crea tu primer usuario para comenzar</p>
                </div>
              ) : (
                users.map((userItem) => (
                  <motion.div key={userItem.id} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} className="bg-slate-900/30 rounded-xl border border-slate-700 p-4 hover:border-slate-600 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${userItem.role==='SUPERADMIN' ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : userItem.role==='COORDINADOR' ? 'bg-gradient-to-br from-purple-600 to-purple-800' : 'bg-gradient-to-br from-blue-600 to-blue-800'}`}>
                            {userItem.email?.[0]?.toUpperCase() ?? 'U'}
                          </div>
                          <div>
                            <div className="text-white font-medium">{userItem.full_name}</div>
                            <div className="text-slate-400 text-xs">{userItem.email}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <motion.button onClick={() => handleEdit(userItem)} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </motion.button>
                        <motion.button onClick={() => handleDelete(userItem.id)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                        </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
