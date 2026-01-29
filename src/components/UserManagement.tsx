import { useEffect, useState } from 'react'
import { UserProfile } from '../App' // exportado en App.tsx
import { supabase } from '../lib/supabaseClient'

type UserManagementProps = {
  userProfile: UserProfile | null
}

function UserManagement({ userProfile }: UserManagementProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  async function loadProfiles() {
    setLoading(true)
    let query = supabase.from('profiles').select('*')
    if (userProfile?.role !== 'admin') query = query.eq('company_id', userProfile?.company_id)
    const { data, error } = await query.order('full_name')
    if (error) {
      setProfiles([])
    } else {
      setProfiles(data as UserProfile[])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (userProfile) loadProfiles()
  }, [userProfile])

  if (loading) return <div>Loading users…</div>

  return (
    <div className="p-4 lg:p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          MineConnect SAT Pro - Conductores
        </h1>
      </div>

      <div className="bg-slate-800 rounded-lg overflow-hidden" style={{ padding: 16 }}>
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Email</th>
              {userProfile?.role === 'admin' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-slate-800/50 divide-y divide-slate-700">
            {profiles.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{user.full_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{user.email}</td>
                {userProfile?.role === 'admin' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {}}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;