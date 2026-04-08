import React from 'react';
import { Sparkles, Brain, Settings } from 'lucide-react';
import { User } from '../../types';

interface HeaderProps {
  user: User | null;
  showAiPanel: boolean;
  setShowAiPanel: (show: boolean) => void;
  setActiveTab: (tab: any) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, showAiPanel, setShowAiPanel, setActiveTab }) => {
  return (
    <header className={`flex items-center justify-between p-4 md:p-6 max-w-6xl mx-auto sticky top-0 z-40 backdrop-blur-2xl border-b w-full bg-background/80 border-border`}>
      <div className="flex items-center gap-2 md:gap-3">
        <div className="size-8 md:size-10 rounded-lg md:rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <Sparkles className="text-black md:hidden" size={16} />
          <Sparkles className="text-black hidden md:block" size={20} />
        </div>
        <h1 className={`text-lg md:text-2xl font-black tracking-tighter text-text_primary`}>LifePilot <span className="text-primary">AI</span></h1>
        {user?.plan === 'premium' && (
          <span className="bg-primary/10 text-primary text-[7px] md:text-[8px] font-black uppercase tracking-widest px-1.5 md:px-2 py-0.5 md:py-1 rounded-md border border-primary/20">Premium</span>
        )}
      </div>
      <div className="flex gap-3 md:gap-4 items-center">
        <button 
          onClick={() => setShowAiPanel(!showAiPanel)}
          className={`size-8 md:size-10 flex items-center justify-center rounded-lg md:rounded-xl border transition-all relative bg-surface border-border text-text_secondary hover:text-text_primary`}
        >
          <Brain size={18} className="md:hidden" />
          <Brain size={20} className="hidden md:block" />
          <span className={`absolute top-2 right-2 md:top-2.5 md:right-2.5 size-1.5 md:size-2 bg-primary rounded-full`}></span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`size-8 md:size-10 flex items-center justify-center rounded-lg md:rounded-xl border transition-all bg-surface border-border text-text_secondary hover:text-text_primary`}
          title="Settings"
        >
          <Settings size={18} className="md:hidden" />
          <Settings size={20} className="hidden md:block" />
        </button>
      </div>
    </header>
  );
};
