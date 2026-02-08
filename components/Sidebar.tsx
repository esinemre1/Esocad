
import React from 'react';
import { Map, ListChecks, Settings, Landmark, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppMode } from '../types';

interface SidebarProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  isExpanded: boolean;
  setIsExpanded: (val: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (val: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentMode,
  onModeChange,
  isExpanded,
  setIsExpanded,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const menuItems = [
    { id: AppMode.MAP, icon: Map, label: 'Arazi Haritası' },

    { id: AppMode.HISTORY, icon: ListChecks, label: 'Nokta Listesi' },
    { id: AppMode.SETTINGS, icon: Settings, label: 'Ayarlar' },
  ];

  const handleMenuClick = (id: AppMode) => {
    onModeChange(id);
    if (window.innerWidth < 1024) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-[70] lg:relative
        bg-slate-900 border-r border-slate-800 text-white
        transition-all duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        ${isExpanded ? 'lg:w-64' : 'lg:w-20'}
      `}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-blue-600 rounded-xl shrink-0">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            {(isExpanded || isMobileOpen) && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-2">
                <span className="font-black text-lg leading-none tracking-tight">ESOCAD</span>
              </div>
            )}
          </div>
          <button onClick={() => setIsMobileOpen(false)} className="lg:hidden p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentMode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`
                  w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all relative group
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                `}
                title={!isExpanded ? item.label : ''}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                {(isExpanded || isMobileOpen) && (
                  <span className="font-semibold text-sm whitespace-nowrap animate-in fade-in slide-in-from-left-2 text-left">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="hidden lg:flex absolute -right-3 top-20 bg-slate-800 p-1.5 rounded-full border border-slate-700 hover:bg-slate-700 transition-colors z-[80] shadow-xl text-blue-400"
        >
          {isExpanded ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        <div className="p-4 border-t border-slate-800 text-center">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mx-auto" />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
