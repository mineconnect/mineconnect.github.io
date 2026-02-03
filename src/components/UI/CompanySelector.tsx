import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Building2, Globe } from 'lucide-react';
import { useVehicles } from '../../context/VehicleContext';
import { useAuth } from '../../context/AuthContext';

export const CompanySelector: React.FC = () => {
    const { state, setSelectedCompanyId } = useVehicles();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Only for superadmins
    if (user?.role !== 'superadmin') return null;

    const currentCompany = state.companies.find(c => c.id === state.selectedCompanyId);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (id: string | null) => {
        setSelectedCompanyId(id);
        setIsOpen(false);
    };

    return (
        <div className="relative mb-6 px-2 z-[60]" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 border border-white/10 ${isOpen ? 'bg-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]' : 'bg-white/5 hover:bg-white/10'
                    }`}
            >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                    {state.selectedCompanyId ? <Building2 className="w-4 h-4 text-blue-400" /> : <Globe className="w-4 h-4 text-emerald-400" />}
                </div>

                <div className="flex-1 text-left">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Visualizando</p>
                    <p className="text-sm font-medium text-white truncate">
                        {currentCompany ? currentCompany.name : 'Flota Global'}
                    </p>
                </div>

                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
                >
                    <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                        <button
                            onClick={() => handleSelect(null)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${state.selectedCompanyId === null ? 'bg-accent/10 text-accent/90' : 'hover:bg-white/5 text-gray-300'
                                }`}
                        >
                            <Globe className="w-4 h-4" />
                            <span className="text-sm">Todas las Empresas</span>
                            {state.selectedCompanyId === null && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />}
                        </button>

                        <div className="h-px bg-white/5 my-1" />

                        {state.companies.map(company => (
                            <button
                                key={company.id}
                                onClick={() => handleSelect(company.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${state.selectedCompanyId === company.id ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-white/5 text-gray-300'
                                    }`}
                            >
                                <Building2 className="w-4 h-4" />
                                <span className="text-sm truncate text-left">{company.name}</span>
                                {state.selectedCompanyId === company.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
