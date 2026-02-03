import React from 'react';
import { Map, Users, AlertTriangle, FileText, Settings, LogOut, Radio, ShieldCheck, BarChart3 } from 'lucide-react';
import { useUI, TabType } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { CompanySelector } from '../UI/CompanySelector';
import { NotificationBell } from '../Notifications/NotificationBell';

const Sidebar: React.FC = () => {
    const { activeTab, setActiveTab } = useUI();
    const { signOut } = useAuth();

    const menuItems: { id: TabType; label: string; icon: React.ElementType }[] = [
        { id: 'map', label: 'Monitor Satelital', icon: Map },
        { id: 'analytics', label: 'Dashboard Ejecutivo', icon: BarChart3 },
        { id: 'drivers', label: 'Conductores', icon: Users },
        { id: 'alerts', label: 'Alertas de Riesgo', icon: AlertTriangle },
        { id: 'reports', label: 'Reportes Legales', icon: FileText },
        { id: 'audit', label: 'Auditoría Legal', icon: ShieldCheck },
    ];

    return (
        <aside className="hidden md:flex flex-col w-72 h-screen glass-heavy border-r border-white/10 p-6 z-50">
            <div className="flex items-center justify-between mb-10 px-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-[0_0_20px_rgba(0,255,171,0.3)]">
                        <Radio className="text-black w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-outfit font-bold text-xl tracking-tight">MineConnect</h1>
                        <p className="text-xs text-gray-400 tracking-widest uppercase">SAT System V2</p>
                    </div>
                </div>
                <NotificationBell />
            </div>

            <CompanySelector />

            <nav className="flex-1 space-y-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 group ${isActive
                                ? 'bg-accent/10 border border-accent/30 text-accent shadow-[0_0_15px_rgba(0,255,171,0.1)]'
                                : 'hover:bg-white/5 text-gray-400 hover:text-white border border-transparent'
                                }`}
                        >
                            <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="font-medium text-sm tracking-wide">{item.label}</span>
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)] animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="pt-6 border-t border-white/10 space-y-2">
                <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all text-sm">
                    <Settings className="w-5 h-5" />
                    <span>Configuración</span>
                </button>
                <button
                    onClick={signOut}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all text-sm group"
                >
                    <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>

            <div className="mt-8 px-2">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-accent/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                    <h4 className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-mono">Estado Red</h4>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                        <span className="text-sm font-bold text-white">Satelital: OK</span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-2 font-mono">PING: 24ms | UPLINK: 99.8%</p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
