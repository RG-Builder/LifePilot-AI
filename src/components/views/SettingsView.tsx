import React from 'react';
import { motion } from 'framer-motion';
import { Settings, LogOut, CreditCard, Shield, FileText, Moon, Sparkles } from 'lucide-react';
import { User } from '../../types';

interface SettingsViewProps {
  user: User | null;
  theme: any;
  setTheme: (theme: string) => void;
  logout: () => Promise<void>;
  setShowPricing: (show: boolean) => void;
  setShowPrivacy: (show: boolean) => void;
  setShowTerms: (show: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  theme,
  setTheme,
  logout,
  setShowPricing,
  setShowPrivacy,
  setShowTerms
}) => {
  return (
    <motion.div 
      key="settings"
      initial={theme.animations.type !== 'minimal' ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 sm:space-y-12 pb-32"
    >
      <div>
        <h2 className={`text-2xl md:text-5xl font-black tracking-tighter text-text_primary`}>System <span className="text-primary">Configuration</span></h2>
        <p className="text-text_secondary text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-2">
          {theme.id === 'elite' ? 'Neural Interface & Protocol Settings' : 'Customize your experience.'}
        </p>
      </div>

      {/* User Profile Section */}
      <div className="stitch-card p-6 md:p-10 border-border relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-text_secondary">
          <Settings size={120} />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-10 relative z-10">
          <div className="size-20 md:size-28 rounded-[32px] md:rounded-[40px] bg-primary/10 flex items-center justify-center text-primary border-4 border-surface shadow-2xl">
            <span className="text-3xl md:text-5xl font-black">{user?.email?.[0].toUpperCase()}</span>
          </div>
          <div className="text-center sm:text-left space-y-2">
            <h3 className="text-2xl md:text-3xl font-black tracking-tight text-text_primary">{user?.email}</h3>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">
                {user?.plan === 'premium' ? 'Elite Protocol' : 'Standard Protocol'}
              </div>
              <div className="text-[10px] font-medium text-text_secondary">{user?.plan === 'premium' ? 'Elite Access Active' : 'Standard Protocol'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles size={16} />
          </div>
          <h3 className="text-lg font-black tracking-tight text-text_primary">UI Personality</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { id: 'elite', name: 'Elite AI', desc: 'High-performance tactical interface' },
            { id: 'simple', name: 'Simple', desc: 'Clean, friendly, and approachable' },
            { id: 'minimal', name: 'Minimal', desc: 'Zero distractions, pure focus' }
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`stitch-card p-6 text-left transition-all group ${theme.id === t.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/30'}`}
            >
              <div className={`text-xs font-black uppercase tracking-widest mb-1 ${theme.id === t.id ? 'text-primary' : 'text-text_secondary'}`}>{t.name}</div>
              <div className="text-xs font-medium text-text_secondary group-hover:text-text_primary transition-colors">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* System Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button 
          onClick={() => setShowPricing(true)}
          className="stitch-card p-6 flex items-center justify-between hover:bg-surface transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-black transition-all">
              <CreditCard size={20} />
            </div>
            <span className="font-black uppercase tracking-widest text-xs text-text_primary">Subscription</span>
          </div>
          <Settings size={16} className="text-text_secondary" />
        </button>
        <button 
          onClick={() => setShowPrivacy(true)}
          className="stitch-card p-6 flex items-center justify-between hover:bg-surface transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-black transition-all">
              <Shield size={20} />
            </div>
            <span className="font-black uppercase tracking-widest text-xs text-text_primary">Privacy Protocol</span>
          </div>
          <Settings size={16} className="text-text_secondary" />
        </button>
        <button 
          onClick={() => setShowTerms(true)}
          className="stitch-card p-6 flex items-center justify-between hover:bg-surface transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text_secondary group-hover:bg-text_primary group-hover:text-surface transition-all">
              <FileText size={20} />
            </div>
            <span className="font-black uppercase tracking-widest text-xs text-text_primary">Terms of Service</span>
          </div>
          <Settings size={16} className="text-text_secondary" />
        </button>
        <button 
          onClick={logout}
          className="stitch-card p-6 flex items-center justify-between hover:bg-danger/10 transition-all group border-danger/10"
        >
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-xl bg-danger/10 flex items-center justify-center text-danger group-hover:bg-danger group-hover:text-white transition-all">
              <LogOut size={20} />
            </div>
            <span className="font-black uppercase tracking-widest text-xs text-danger">De-Authorize System</span>
          </div>
        </button>
      </div>
    </motion.div>
  );
};
