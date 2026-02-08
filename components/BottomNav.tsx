
import React from 'react';
import { Map, ListChecks, Settings } from 'lucide-react';
import { AppMode } from '../types';

interface BottomNavProps {
    currentMode: AppMode;
    onModeChange: (mode: AppMode) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentMode, onModeChange }) => {
    const menuItems = [
        { id: AppMode.MAP, icon: Map, label: 'Harita' },

        { id: AppMode.HISTORY, icon: ListChecks, label: 'Liste' },
        { id: AppMode.SETTINGS, icon: Settings, label: 'Ayarlar' },
    ];

    return (
        <nav className="lg:hidden fixed bottom-[50px] left-0 right-0 h-16 bg-white border-t border-slate-200 flex justify-between items-center px-6 pb-safe z-[500] shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)]">
            {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentMode === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => onModeChange(item.id)}
                        className={`flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all duration-300 ${isActive ? 'text-blue-600 -translate-y-2' : 'text-slate-400'}`}
                    >
                        <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-transparent'}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] font-black tracking-wide transition-opacity duration-300 ${isActive ? 'opacity-100 translate-y-0.5' : 'opacity-0 scale-50 absolute -bottom-2'}`}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
};

export default BottomNav;
