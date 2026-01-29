import { useEffect, useState } from 'react'
import { UserProfile } from '../types'
import { supabase } from '../lib/supabaseClient'
import { Users, UserPlus, Shield, Search, Filter, MoreVertical, Mail, Calendar, Activity } from 'lucide-react'

type UserManagementProps = {
  userProfile: UserProfile | null
}

function UserManagement({ userProfile }: UserManagementProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'coordinator' | 'conductor'>('all')

  async function loadProfiles() {
    setLoading(true)
    let query = supabase.from('profiles').select('*')
    if (userProfile?.role !== 'admin') query = query.eq('company_id', userProfile?.company_id)
    const { data, error } = await query.order('full_name')
    if (error) {
      console.error('Error loading profiles:', error)
      setProfiles([])
    } else {
      setProfiles(data as UserProfile[])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (userProfile) loadProfiles()
  }, [userProfile])

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || profile.role === filterRole
    return matchesSearch && matchesRole
  })

  const getRoleBadge = (role: string) => {
    const styles = {
      'admin': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'coordinator': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'conductor': 'bg-green-500/20 text-green-400 border-green-500/30'
    }
    const labels = {
      'admin': 'Administrador',
      'coordinator': 'Coordinador',
      'conductor': 'Conductor'
    }
    return {
      className: styles[role as keyof typeof styles] || styles.conductor,
      label: labels[role as keyof typeof labels] || role
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando conductores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-slate-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Gestión de Conductores</h1>
              <p className="text-slate-400 text-sm mt-1">Administra los conductores de {userProfile?.company_id}</p>
            </div>
          </div>
          {userProfile?.role === 'admin' && (
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Conductor</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              className="px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="all">Todos los roles</option>
              <option value="admin">Administradores</option>
              <option value="coordinator">Coordinadores</option>
              <option value="conductor">Conductores</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Conductores</p>
              <p className="text-2xl font-bold text-white">{filteredProfiles.length}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Activos Hoy</p>
              <p className="text-2xl font-bold text-green-400">
                {filteredProfiles.filter(p => p.role === 'conductor').length}
              </p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Activity className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Administradores</p>
              <p className="text-2xl font-bold text-purple-400">
                {filteredProfiles.filter(p => p.role === 'admin').length}
              </p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
        {filteredProfiles.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No se encontraron conductores</p>
            <p className="text-slate-500 text-sm mt-2">
              {searchTerm || filterRole !== 'all' ? 'Intenta ajustar los filtros' : 'Registra nuevos conductores'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Conductor</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Registrado</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredProfiles.map((profile) => {
                  const roleInfo = getRoleBadge(profile.role)
                  return (
                    <tr 
                      key={profile.id} 
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                              {getInitials(profile.full_name)}
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900"></div>
                          </div>
                          <div>
                            <p className="text-white font-medium">{profile.full_name}</p>
                            <p className="text-slate-400 text-xs">ID: {profile.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300">{profile.email || 'No registrado'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${roleInfo.className}`}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300 font-mono text-sm">{profile.company_id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">
                            {new Date(profile.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {userProfile?.role === 'admin' && (
                            <>
                              <button 
                                className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Users className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="mt-8 flex items-center justify-between text-sm text-slate-400">
        <div>
          Mostrando {filteredProfiles.length} de {profiles.length} conductores
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Sistema en línea</span>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;