import { useEffect, useState } from 'react'
import { Users, Plus } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { UserProfile } from '../App' // exportado en App.tsx

type UserManagementProps = {
  userProfile: UserProfile | null
}

export default function UserManagement({ userProfile }: UserManagementProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProfiles = async () => {
    setLoading(true)
    let query = supabase.from('profiles').select('*')
    if (userProfile?.role !== 'admin') {
      query = query.eq('company_id', userProfile?.company_id)
    }
    const { data, error } = await query.order('full_name')
    if (error) {
      setProfiles([])
    } else {
      setProfiles(data as UserProfile[])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (userProfile) fetchProfiles()
  }, [userProfile])

  if (loading) return <div>Loading users…</div>

  return (
    <div className="p-4 lg:p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users /> Gestión de Conductores
        </h1>
        <button onClick={() => { /* abre modal para crear usuario si existe */ }} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          <Plus size={18} /> Nuevo Conductor
        </button>
      </div>

      <div className="bg-slate-800 rounded-lg overflow-hidden">
        {profiles.length > 0 ? (
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Empresa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {profiles.map(p => (
                <tr key={p.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{p.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{p.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{p.company_id ?? ''}</td>
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
