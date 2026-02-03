
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, X, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { useNotifications, NotificationItem } from '../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const NotificationBell: React.FC = () => {
    const { unreadCount, notifications, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const getIcon = (type: NotificationItem['type']) => {
        switch (type) {
            case 'SOS': return <AlertOctagon className="w-5 h-5 text-red-500" />;
            case 'GEOFENCE': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
            case 'FATIGUE': return <Info className="w-5 h-5 text-blue-500" />; // Or Eye icon if available
            default: return <Info className="w-5 h-5 text-gray-500" />;
        }
    };

    const getBgColor = (severity: NotificationItem['severity']) => {
        if (severity === 'critical') return 'bg-red-500/10 border-red-500/30';
        if (severity === 'high') return 'bg-orange-500/10 border-orange-500/30';
        return 'bg-white/5 border-white/10';
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl hover:bg-white/10 transition-colors group"
                title="Notificaciones"
            >
                <Bell className={`w-6 h-6 text-gray-300 group-hover:text-white transition-colors ${unreadCount > 0 ? 'animate-pulse-slow' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute left-full top-0 ml-4 w-80 md:w-96 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                        <h3 className="font-bold text-white">Notificaciones</h3>
                        <div className="flex gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                                >
                                    <Check className="w-3 h-3" /> Leídas
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearNotifications}
                                    className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" /> Limpiar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                                <Bell className="w-8 h-8 opacity-20 mb-2" />
                                <p className="text-sm">Sin notificaciones recientes</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => !notif.read && markAsRead(notif.id)}
                                        className={`p-4 hover:bg-white/5 transition-colors cursor-pointer relative ${!notif.read ? 'bg-white/5' : ''}`}
                                    >
                                        {!notif.read && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                                        )}
                                        <div className={`flex gap-3 p-3 rounded-xl border ${getBgColor(notif.severity)}`}>
                                            <div className="shrink-0 pt-1">
                                                {getIcon(notif.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <span className="font-semibold text-sm text-white truncate">
                                                        {notif.type === 'SOS' ? 'EMERGENCIA SOS' : notif.type}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                        {formatDistanceToNow(notif.timestamp, { addSuffix: true, locale: es })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-300 leading-relaxed">
                                                    {notif.message}
                                                </p>
                                                {notif.vehicleId && (
                                                    <div className="mt-2 text-[10px] font-mono text-gray-500 bg-black/30 w-fit px-2 py-0.5 rounded">
                                                        ID: {notif.vehicleId}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
