import React, { useState } from 'react';
import { useVehicles } from '../context/VehicleContext';
import { useReporting } from '../hooks/useReporting';
import { ShieldCheck, AlertTriangle, Info, Clock, MapPin, FileText, Download, Loader2 } from 'lucide-react';

export const SecurityUsageView: React.FC = () => {
    const { state } = useVehicles();
    const { generatePDF, generateCSV } = useReporting();
    const [isExporting, setIsExporting] = useState(false);
    const { securityEvents, selectedCompanyId, vehicles } = state;

    // Filter events based on selected company (via vehicle association)
    const filteredEvents = selectedCompanyId
        ? securityEvents.filter(event => {
            if (!event.vehicleId) return false;
            const vehicle = vehicles.find(v => v.id === event.vehicleId);
            return vehicle?.companyId === selectedCompanyId;
        })
        : securityEvents;

    // Sort by timestamp desc
    const sortedEvents = [...filteredEvents].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
        <div className="p-6 bg-slate-900/95 backdrop-blur-md min-h-screen text-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="text-emerald-400" />
                    Auditoría Legal de Seguridad
                </h1>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            setIsExporting(true);
                            await generatePDF({
                                title: 'Log de Auditoría de Seguridad',
                                companyName: state.companies.find(c => c.id === state.selectedCompanyId)?.name || 'Global Fleet',
                                events: sortedEvents
                            });
                            setIsExporting(false);
                        }}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors text-sm disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                        Exportar PDF
                    </button>
                    <button
                        onClick={() => generateCSV(sortedEvents)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded border border-emerald-500 transition-colors text-sm shadow-emerald-900/20 shadow-lg"
                    >
                        <Download size={14} />
                        Descargar CSV
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {sortedEvents.map(event => (
                    <div key={event.id} className="bg-slate-800/80 border border-slate-700/50 rounded-lg p-4 flex flex-col gap-3 relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-lg">
                        {/* Status Bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${event.severity === 'critical' ? 'bg-red-500' :
                            event.severity === 'high' ? 'bg-orange-500' :
                                event.severity === 'medium' ? 'bg-yellow-500' :
                                    'bg-blue-500'
                            }`} />

                        <div className="flex flex-col md:flex-row justify-between items-start pl-3 gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${event.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                        event.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>
                                        {event.type.replace('_', ' ')}
                                    </span>
                                    <span className="text-slate-400 text-xs flex items-center gap-1 bg-slate-900/50 px-2 py-0.5 rounded-full">
                                        <Clock size={12} />
                                        {new Date(event.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div className="font-mono text-xs text-slate-500 flex gap-4">
                                    <span>ID: {event.id.split('-')[0]}...</span>
                                    <span>User: {event.userId}</span>
                                </div>
                            </div>

                            {/* Verification Seal */}
                            <div className="flex flex-col items-end min-w-[200px]">
                                <div className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-md border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                    <ShieldCheck size={16} />
                                    <span className="text-xs font-bold tracking-wide">SELLADO & VERIFICADO</span>
                                </div>
                                <div className="text-[10px] font-mono text-slate-500 mt-1 truncate w-full text-right" title={event.legalHash}>
                                    Hash: {event.legalHash}
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="pl-3 flex flex-wrap gap-4 text-sm text-slate-300 mt-2 bg-slate-950/30 p-3 rounded border border-slate-800">
                            {event.location && (
                                <div className="flex items-center gap-2 text-slate-400 text-xs">
                                    <MapPin size={14} className="text-indigo-400" />
                                    <span>Lat: {event.location.lat.toFixed(6)}, Lng: {event.location.lng.toFixed(6)}</span>
                                </div>
                            )}
                            {event.vehicleId && (
                                <div className="flex items-center gap-2 text-slate-400 text-xs">
                                    <span className="font-semibold text-slate-500">Vehicle:</span> {event.vehicleId}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {sortedEvents.length === 0 && (
                    <div className="text-center text-slate-500 py-20 bg-slate-800/20 rounded-xl border border-dashed border-slate-700">
                        <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-slate-400">Sin Eventos de Seguridad</h3>
                        <p className="text-sm text-slate-600 mt-1">Los eventos críticos de auditoría aparecerán aquí.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
