import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Edit, Trash, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile } from '../App'; // Import from App.tsx

interface UserManagementProps {
  userProfile: UserProfile | null;
}

// Helper: create user via Edge Function
async function createUserViaEdge(
  email: string,
  password: string,
  fullName: string,
  role: string,
  companyId?: string | null
): Promise<any> {
  // Get current session token
  const { data: sessionData } = await (supabase as any).auth.getSession()
  const token = sessionData?.session?.access_token ?? null

  const base = (import.meta.env as any).VITE_SUPABASE_FUNCTIONS_URL || ''
  const url = `${base.replace(/\\$/, '')}/create_user`
  const payload = { email, password, full_name: fullName, role, company_id: companyId ?? null }

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err?.error ?? `Edge function error: ${resp.status}`)
  }
  return await resp.json()
}

export default function UserManagement({ userProfile }: UserManagementProps) {
  const [drivers, setDrivers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<UserProfile | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

const isSuperAdmin = userProfile?.role === 'admin';
const isCoordinator = userProfile?.role === 'coordinator';

// Available roles according to caller's role
const availableRoles = userProfile?.role === 'admin'
  ? ['coordinator', 'conductor']
  : userProfile?.role === 'coordinator'
    ? ['conductor']
    : []

const [selectedRole, setSelectedRole] = useState<string>(availableRoles[0] ?? '')
useEffect(() => {
  if (availableRoles.length > 0 && (!selectedRole || !availableRoles.includes(selectedRole))) {
    setSelectedRole(availableRoles[0])
  }
}, [availableRoles])

  useEffect(() => {
    if (isSuperAdmin || isCoordinator) {
      fetchDrivers();
    }
  }, [userProfile]);

  const fetchDrivers = async () => {
    if (!userProfile) return;
    setLoading(true);

    let query = supabase.from('profiles').select('*').eq('role', 'CONDUCTOR');

    if (isCoordinator) {
      query = query.eq('company_id', userProfile.company_id);
    }
    // Superadmin will see all drivers from all companies

    const { data, error } = await query.order('full_name');
    
    if (error) {
      console.error("Error fetching drivers:", error);
      setError("No se pudieron cargar los conductores.");
    } else {
      setDrivers(data as UserProfile[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setEditingDriver(null);
    setIsFormOpen(false);
    setError(null);
  };

  const handleEdit = (driver: UserProfile) => {
    setEditingDriver(driver);
    setFullName(driver.full_name);
    setEmail(driver.email || '');
    setPassword('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || (!password && !editingDriver)) {
      setError("Por favor, completa todos los campos requeridos.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (editingDriver) {
        // Update existing user
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', editingDriver.id);

        if (profileError) throw profileError;

        if (password) {
          // This requires special Supabase permissions. Assuming they are set.
          const { error: authError } = await supabase.auth.admin.updateUserById(editingDriver.id, { password });
          if (authError) throw authError;
        }

      } else {
        // Create nuevo usuario via Edge Function
        const edgeRes = await createUserViaEdge(email, password, fullName, selectedRole, userProfile?.company_id ?? null)
        if (edgeRes?.error) throw edgeRes.error
        const newUserId = edgeRes?.user?.id
        if (!newUserId) throw new Error("Could not create user.")

        // Se asume que la Edge Function ya inserta el perfil; solo validamos éxito.
      }
      
      resetForm();
      fetchDrivers();

    } catch (err: any) {
      console.error("Error saving driver:", err);
      setError(err.message || "Ocurrió un error al guardar el conductor.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (driverId: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar a este conductor? Esta acción es irreversible.")) {
      setLoading(true);
      // First delete profile, then auth user to avoid foreign key issues.
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', driverId);
      if (profileError) {
        setError("Error al eliminar el perfil.");
        setLoading(false);
        return;
      }
      
      const { error: authError } = await supabase.auth.admin.deleteUser(driverId);
      if (authError) {
          // Profile was deleted, but auth user wasn't. Might need manual cleanup.
          setError("Perfil eliminado, pero hubo un error al eliminar la cuenta de autenticación.");
      }
      
      fetchDrivers();
      setLoading(false);
    }
  };

  // Render Guard
  if (!isSuperAdmin && !isCoordinator) {
    return (
      <div className="p-6 text-center text-slate-500">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
        <h3 className="mt-2 text-lg font-medium text-white">Acceso Denegado</h3>
        <p>No tienes los permisos necesarios para gestionar conductores.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Users /> Gestión de Conductores</h1>
        <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={18} /> Nuevo Conductor
        </button>
      </div>

      {isFormOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 bg-slate-800 p-4 rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold text-white">{editingDriver ? 'Editando' : 'Nuevo'} Conductor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Nombre Completo" value={fullName} onChange={e => setFullName(e.target.value)} required className="p-2 rounded bg-slate-700 text-white border border-slate-600" />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!editingDriver} className="p-2 rounded bg-slate-700 text-white border border-slate-600 disabled:opacity-50" />
            </div>
            <input type="password" placeholder={editingDriver ? 'Nueva Contraseña (opcional)' : 'Contraseña'} value={password} onChange={e => setPassword(e.target.value)} required={!editingDriver} className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600" />
            
            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-4">
              <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">{loading ? "Guardando..." : "Guardar"}</button>
              <button type="button" onClick={resetForm} className="bg-slate-600 text-white px-4 py-2 rounded">Cancelar</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="bg-slate-800 rounded-lg overflow-hidden">
        {loading && <div className="p-4 text-center">Cargando...</div>}
        {!loading && drivers.length === 0 && <div className="p-4 text-center text-slate-400">No se encontraron conductores.</div>}
        {!loading && drivers.length > 0 && (
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Email</th>
                {isSuperAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">ID de Compañía</th>}
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {drivers.map(driver => (
                <tr key={driver.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{driver.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{driver.email}</td>
                  {isSuperAdmin && <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{driver.company_id}</td>}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => handleEdit(driver)} className="text-blue-400 hover:text-blue-300"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(driver.id)} className="text-red-400 hover:text-red-300"><Trash size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
