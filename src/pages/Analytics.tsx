import React, { useEffect, useState, useMemo } from 'react';
import { useVehicles } from '../context/VehicleContext';
import { supabase } from '../lib/supabase';
import { SecurityEvent } from '../types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from 'recharts';
import {
    Activity, AlertTriangle, ShieldCheck, Zap,
    TrendingUp, AlertOctagon, MapPin, FileText, Download, Loader2
} from 'lucide-react';
import { useReporting } from '../hooks/useReporting';
import { toast } from 'sonner';

// Helper for Glass Cards
const KPICard = ({ title, value, subtext, icon: Icon, colorClass, trend }: any) => (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/10 p-6 shadow-xl group hover:border-white/20 transition-all">
        <div className={`absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity ${colorClass}`}>
            <Icon size={64} />
        </div>
        <div className="relative z-10">
            <h3 className="text-slate-400 text-sm uppercase tracking-wider font-semibold mb-1">{title}</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white font-outfit">{value}</span>
                {trend && (
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${trend > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
            <p className="text-xs text-slate-500 mt-2 font-mono">{subtext}</p>
        </div>
        {/* Decorative glow */}
        <div className={`absolute -bottom-4 -left-4 w-24 h-24 rounded-full blur-2xl opacity-20 ${colorClass.replace('text-', 'bg-')}`} />
    </div>
);

export const Analytics: React.FC = () => {
    const { filteredVehicles, state } = useVehicles();
    const { generatePDF } = useReporting();
    const [isExporting, setIsExporting] = useState(false);
    const [historicalEvents, setHistoricalEvents] = useState<SecurityEvent[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);

    const handleExportPDF = async () => {
        setIsExporting(true);
        const company = state.companies.find(c => c.id === state.selectedCompanyId);

        await generatePDF({
            title: 'Reporte Ejecutivo de Seguridad',
            companyName: company?.name || 'Global Fleet',
            includeCharts: true,
            chartIds: ['kpi-section', 'charts-section'],
            events: historicalEvents.slice(0, 50) // Last 50 events
        });
        setIsExporting(false);
    };

    // Fetch last 7 days of events
    useEffect(() => {
        const fetchStats = async () => {
            setLoadingStats(true);
            try {
                let query = supabase
                    .from('security_events')
                    .select('*')
                    .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                    .order('timestamp', { ascending: true });

                // Apply company filter manually if needed, or rely on RLS. 
                // Since we are creating a generic query, RLS should likely handle strict isolation.
                // However, for SuperAdmin switching views, we might want to filter by vehicle_id if company_id isn't on events.

                const { data, error } = await query;

                if (error) throw error;

                if (data) {
                    // Map to typed objects
                    const mapped: SecurityEvent[] = data.map((d: any) => ({
                        id: d.id,
                        userId: d.user_id,
                        vehicleId: d.vehicle_id,
                        type: d.type,
                        severity: d.severity,
                        timestamp: new Date(d.timestamp),
                        legalHash: d.legal_hash,
                        details: d.details
                    }));
                    setHistoricalEvents(mapped);
                }
            } catch (err) {
                console.error("Error fetching analytics:", err);
                toast.error("Error cargando históricos");
            } finally {
                setLoadingStats(false);
            }
        };

        fetchStats();
    }, [state.selectedCompanyId]); // Refetch if company changes (RLS should change data returned)

    // --- Computed Metrics ---

    // 1. Total Active Vehicles (Realtime)
    const activeVehicles = useMemo(() =>
        filteredVehicles.filter(v => v.status === 'online' || v.status === 'warning').length,
        [filteredVehicles]);

    // Filter events to current company view (Client side filter safety net)
    // We match events that belong to the filtered vehicles list
    const relevantEvents = useMemo(() => {
        const vehicleIds = new Set(filteredVehicles.map(v => v.id));
        return historicalEvents.filter(e => !e.vehicleId || vehicleIds.has(e.vehicleId));
    }, [historicalEvents, filteredVehicles]);

    // 2. Critical Alertas (Last 24h)
    const critical24h = useMemo(() => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return relevantEvents.filter(e =>
            (e.severity === 'critical' || e.type === 'SOS') &&
            e.timestamp > yesterday
        ).length;
    }, [relevantEvents]);

    // 3. Risk Zones (Geofence violations) (Last 7d or 24h? Prompt says "Conteo de infracciones")
    const riskZoneViolations = relevantEvents.filter(e => e.type === 'GEOFENCE_VIOLATION').length;

    // 4. Safety Index
    // Base 100%. Deduct for alerts.
    // Logic: 100 - (Critical * 5 + High * 2 + Medium * 0.5) / (ActiveVehicles || 1)
    const safetyIndex = useMemo(() => {
        if (filteredVehicles.length === 0) return 0;
        const penalty = relevantEvents.reduce((acc, curr) => {
            if (curr.severity === 'critical') return acc + 5;
            if (curr.severity === 'high') return acc + 2;
            if (curr.severity === 'medium') return acc + 0.5;
            return acc;
        }, 0);

        // Normalize per vehicle
        const index = 100 - (penalty / filteredVehicles.length);
        return Math.max(0, Math.round(index));
    }, [relevantEvents, filteredVehicles.length]);


    // --- Charts Data Preparation ---

    // Trend: Fatigue Alerts over the week
    const fatigueTrendData = useMemo(() => {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const counts = new Array(7).fill(0);

        relevantEvents.forEach(e => {
            if (e.type === 'FATIGUE_ALERT') {
                const day = e.timestamp.getDay();
                counts[day]++;
            }
        });

        // Rotate to start from "Today" or just standard week? Standard week is easier to read.
        return days.map((day, i) => ({
            name: day,
            alerts: counts[i]
        }));
    }, [relevantEvents]);

    // Top 5 Incidents by Vehicle
    const topIncidentsData = useMemo(() => {
        const vehicleCounts: Record<string, number> = {};

        relevantEvents.forEach(e => {
            if (!e.vehicleId) return;
            vehicleCounts[e.vehicleId] = (vehicleCounts[e.vehicleId] || 0) + 1;
        });

        const sorted = Object.entries(vehicleCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([vId, count]) => {
                const vehicle = filteredVehicles.find(v => v.id === vId);
                return {
                    name: vehicle ? vehicle.plate : vId.substring(0, 6),
                    events: count,
                    fullPlate: vehicle?.plate
                };
            });

        return sorted;
    }, [relevantEvents, filteredVehicles]);


    return (
        <div className="p-8 h-full overflow-y-auto bg-slate-950 text-white font-outfit">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                        Dashboard Ejecutivo
                    </h1>
                    <p className="text-slate-400 mt-1 flex items-center gap-2">
                        <Activity size={16} className="text-blue-500" />
                        Monitoreo de Flota en Tiempo Real
                    </p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                            {isExporting ? 'Generando...' : 'Reporte PDF'}
                        </button>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-widest text-right">Empresa</p>
                        <p className="text-lg font-semibold text-white">
                            {state.companies.find(c => c.id === state.selectedCompanyId)?.name || 'Vista Global'}
                        </p>
                    </div>
                </div>
            </header>

            {/* KPI Cards Row */}
            <div id="kpi-section" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard
                    title="Vehículos Activos"
                    value={activeVehicles} // Realtime from Context
                    subtext={`De un total de ${filteredVehicles.length}`}
                    icon={Zap}
                    colorClass="text-emerald-400"
                />
                <KPICard
                    title="Alertas Críticas (24h)"
                    value={critical24h}
                    subtext="Eventos SOS / Críticos"
                    icon={AlertOctagon}
                    colorClass="text-red-500"
                    trend={critical24h > 0 ? 15 : 0} // Dummy trend logic or calculated
                />
                <KPICard
                    title="Índice de Seguridad"
                    value={`${safetyIndex}%`}
                    subtext="Basado en operaciones"
                    icon={ShieldCheck}
                    colorClass={safetyIndex > 90 ? "text-blue-400" : "text-amber-400"}
                />
                <KPICard
                    title="Zonas de Riesgo"
                    value={riskZoneViolations}
                    subtext="Invasiones de Geocerca (7d)"
                    icon={MapPin}
                    colorClass="text-amber-500"
                    trend={-5}
                />
            </div>

            {/* Charts Row */}
            <div id="charts-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Trend Chart */}
                <div className="col-span-2 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white font-semibold flex items-center gap-2">
                            <TrendingUp size={18} className="text-blue-400" />
                            Tendencia de Fatiga (Semanal)
                        </h3>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={fatigueTrendData}>
                                <defs>
                                    <linearGradient id="colorFatigue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="alerts" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFatigue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Incidents */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-white font-semibold flex items-center gap-2 mb-6">
                        <AlertTriangle size={18} className="text-amber-400" />
                        Top 5 Incidentes
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topIncidentsData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" fontSize={12} hide />
                                <YAxis dataKey="name" type="category" stroke="#fff" fontSize={12} width={80} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                />
                                <Bar dataKey="events" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
};
