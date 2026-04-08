import React from 'react';
import { motion } from 'framer-motion';
import { Bell, X, Sparkles } from 'lucide-react';

interface NotificationsPanelProps {
  setShowNotifications: (show: boolean) => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ setShowNotifications }) => {
  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l border-border z-[150] shadow-2xl flex flex-col"
    >
      <div className="p-6 border-b border-border flex items-center justify-between bg-surface">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
            <Bell size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tighter text-text_primary">Neural Feed</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary">System Updates</p>
          </div>
        </div>
        <button onClick={() => setShowNotifications(false)} className="text-text_secondary hover:text-text_primary">
          <X size={24} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        <div className="text-center py-12 space-y-4">
          <Sparkles size={48} className="mx-auto text-secondary opacity-20" />
          <p className="text-text_secondary font-bold text-sm italic">"Your neural feed is clear. Optimal performance maintained."</p>
        </div>
      </div>
    </motion.div>
  );
};
