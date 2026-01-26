import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile } from '../types';

interface UserManagementProps {
  user: UserProfile | null;
  onUserUpdate: () => void;
}

interface UserFormData {
  email: string;
  full_name: string;
  password: string;
  role: 'admin' | 'coordinator' | 'conductor';
  company_id: string;
}

export default function UserManagement({ user, onUserUpdate }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({ email: '', full_name: '', password: '', role: 'conductor', company_id: '' });
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let q = supabase.from('profiles').select('*');
      if (user.role === 'coordinator') {
        q = q.eq('company_id', user.company_id).eq('role', 'conductor');
      } else if (user.role === 'admin') {
        q = q.neq('role', 'admin');
      }
      const { data, error } = await q;
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const update: Partial<UserProfile> = {
          full_name: formData.full_name,
          role: formData.role,
          company_id: formData.company_id
        };
        if (formData.password) {
          await supabase.auth.admin.updateUserById(editingUser.id, { password: formData.password });
        }
        await supabase.from('profiles').update(update).eq('id', editingUser.id);
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true
        });
        if (error) throw error;
        const newId = data?.user?.id ?? (data as any)?.id;
        await supabase.from('profiles').insert({
          id: newId,
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
          company_id: formData.company_id
        });
      }
      setFormData({ email: '', full_name: '', password: '', role: 'conductor', company_id: '' });
      setEditingUser(null);
      await fetchUsers();
      onUserUpdate();
    } catch (err) {
      console.error('Error saving user:', err);
    }
  };

  const handleEdit = (u: UserProfile) => {
    setEditingUser(u);
    setFormData({ email: u.email || '', full_name: u.full_name, password: '', role: u.role, company_id: u.company_id || '' });
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
    try {
      await supabase.from('profiles').delete().eq('id', uid);
      try { await supabase.auth.admin.deleteUser(uid); } catch {}
      await fetchUsers();
      onUserUpdate();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({ email: '', full_name: '', password: '', role: 'conductor', company_id: '' });
  };

  const isAdmin = user?.role === 'admin';
  const isCoordinator = user?.role === 'coordinator';
  if (!isAdmin && !isCoordinator) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4 safe-area">
        <div className="text-center">
          <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-400">Acceso Restringido</h2>
          <p className="text-slate-500">No tienes permisos para gestionar usuarios</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 lg:p-6 safe-area">
      <div className="h-full max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-800">
            <h2 className="text-2xl font-black text-white flex items-center space-x-3"><Users className="w-6 h-6" /><span>Gestión de Usuarios</span></h2>
            <p className="text-blue-100 text-sm">{isAdmin ? 'Administración completa del sistema' : 'Gestión de conductores de tu empresa'}</p>
          </div>

          <div className="p-6 lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full p-2 bg-slate-800 border border-slate-600 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Nombre</label>
                  <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="w-full p-2 bg-slate-800 border border-slate-600 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full p-2 bg-slate-800 border border-slate-600 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Rol</label>
                  <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} className="w-full p-2 bg-slate-800 border border-slate-600 rounded">
                    <option value="admin">Superadmin</option>
                    <option value="coordinator">Coordinador</option>
                    <option value="conductor">Conductor</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Empresa (opcional)</label>
                <input type="text" value={formData.company_id} onChange={(e) => setFormData({ ...formData, company_id: e.target.value })} className="w-full p-2 bg-slate-800 border border-slate-600 rounded" />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">{editingUser ? 'Actualizar' : 'Crear'}</button>
                {editingUser && (
                  <button type="button" onClick={resetForm} className="bg-slate-600 text-white px-4 py-2 rounded">Cancelar</button>
                )}
              </div>
            </form>
          </div>

          <div className="p-6 lg:p-8">
            {loading ? (
              <div>Cargando...</div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-slate-900/30 rounded">
                    <div className="flex items-center space-x-3">
                      <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">{u.full_name?.[0] || 'U'}</span>
                      <div>
                        <div className="font-bold">{u.full_name}</div>
                        <div className="text-sm text-slate-400">{u.email}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleEdit(u)} className="px-2 py-1 bg-blue-600 rounded">Edit</button>
                      <button onClick={() => handleDelete(u.id)} className="px-2 py-1 bg-red-600 rounded">Del</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
