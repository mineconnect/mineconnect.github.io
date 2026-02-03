import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define available tabs
export type TabType = 'map' | 'drivers' | 'alerts' | 'reports' | 'audit' | 'analytics';

interface UIContextType {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeTab, setActiveTab] = useState<TabType>('map');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

    return (
        <UIContext.Provider value={{ activeTab, setActiveTab, isSidebarOpen, toggleSidebar }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
