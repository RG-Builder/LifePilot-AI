import React from 'react';
import { LayoutDashboard, Target, Dumbbell, Clock, Brain, Settings } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  theme: any;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, theme }) => {
  const navItems = [
    { id: 'home', icon: LayoutDashboard, label: theme.wording.dashboard.split(' ')[0] },
    { id: 'tasks', icon: Target, label: theme.wording.missions.split(' ')[0] },
    { id: 'habits', icon: Dumbbell, label: 'Habits' },
    { id: 'schedule', icon: Clock, label: theme.wording.timeline.split(' ')[0] },
    { id: 'analytics', icon: Brain, label: theme.wording.awareness.split(' ')[0] },
    { id: 'settings', icon: Settings, label: 'Style' },
  ];

  return (
    <nav className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[94%] sm:w-[90%] max-w-lg">
      <div className={`stitch-card p-1.5 sm:p-2 flex items-center justify-between shadow-2xl backdrop-blur-3xl rounded-[32px] bg-surface border-border`}>
        {navItems.map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1 sm:gap-1.5 px-3 sm:px-6 py-3 sm:py-4 rounded-[24px] sm:rounded-[28px] transition-all duration-500 ${
              activeTab === item.id ? 'bg-primary text-black shadow-xl shadow-primary/20 scale-105' : 'text-text_secondary hover:text-text_primary hover:bg-surface'
            }`}
          >
            <item.icon size={20} strokeWidth={activeTab === item.id ? 3 : 2} className="sm:size-[22px]" />
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
