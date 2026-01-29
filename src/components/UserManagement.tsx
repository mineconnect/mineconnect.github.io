import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Edit, Trash, } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { UserProfile } from '../App'

type UserManagementProps = {
  userProfile: UserProfile | null
}

export default function UserManagement({ userProfile }: UserManagementProps) {
  const [drivers, setDrivers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<UserProfile | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminCompany, setAdminCompany] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isSuperAdmin = userProfile?.role === 'admin'
  const isCoordinator = userProfile?.role === 'coordinator'

  const fetchProfiles = async () => {
    setLoading(true)
    let query = supabase.from('profiles').select('*')
    if (userProfile?.role !== 'admin') {
      // For non-admin, hide Admins and show others within their company
      query = query.not('role', 'eq', 'admin').eq('company_id', userProfile?.company_id)
    }
    const { data, error } = await query.order('full_name')
    if (error) {
      console.error('Error fetching profiles', error)
      setError('No se pudieron cargar los usuarios.')
      setDrivers([])
    } else {
      setDrivers(data as UserProfile[])
    }
    setLoading(false)
  }

  // Available roles according to caller's role
  const availableRoles = isSuperAdmin
    ? ['coordinator', 'conductor']
    : isCoordinator
      ? ['conductor']
      : []

  const [selectedRole, setSelectedRole] = useState<string>(availableRoles[0] ?? '')
  useEffect(() => {
    if (availableRoles.length > 0 && (!selectedRole || !availableRoles.includes(selectedRole))) {
      setSelectedRole(availableRoles[0])
    }
  }, [availableRoles])

  useEffect(() => {
    if (isSuperAdmin || isCoordinator) fetchProfiles()
  }, [userProfile])

  // Rest of this file: you already have create/edit/delete logic
  // Ensure you display an "Empresa" column when admin
  // Also ensure that new user creation uses the Admin-provided Company ID if admin

  // Render basic skeleton if no data
  if (loading) return <div>Loading users…</div>

  return (
    <div className="p-4 lg:p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Users /> Gestión de Conductores</h1>
        <button onClick={() => { setIsFormOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          <Plus size={18} /> Nuevo Conductor
        </button>
      </div>

      {isFormOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 bg-slate-800 p-4 rounded-lg">
          <form className="space-y-4">
            <h2 className="text-lg font-semibold text-white">{editingDriver ? 'Editando' : 'Nuevo'} Conductor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Nombre Completo" value={fullName} onChange={e => setFullName(e.target.value)} required className="p-2 rounded bg-slate-700 text-white border border-slate-600" />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!editingDriver} className="p-2 rounded bg-slate-700 text-white border border-slate-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600">
                {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {isSuperAdmin && (
                <div className="mt-2">
                  <label className="block text-sm text-white mb-1">Empresa (Company ID)</label>
                  <input type="text" placeholder="Company ID" value={adminCompany} onChange={e => setAdminCompany(e.target.value)} className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600" />
                </div>
              )}
            </div>
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required={!editingDriver} className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600" />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-4">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded" disabled={false}>Guardar</button>
              <button type="button" className="bg-slate-600 text-white px-4 py-2 rounded" onClick={() => {/* close */}}>Cancelar</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="bg-slate-800 rounded-lg overflow-hidden">
        {drivers.length > 0 ? (
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Email</th>
                {isSuperAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Empresa</th>}
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {drivers.map(d => (
                <tr key={d.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{d.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{d.email}</td>
                  {isSuperAdmin && <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{d.company_id}</td>}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button className="text-blue-400 hover:text-blue-300" title="Edit"><Edit size={16}/></button>
                    <button className="text-red-400 hover:text-red-300" title="Delete"><Trash size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-center text-slate-400">No se encontraron usuarios</div>
        )}
      </div>
    </div>
  )
}
