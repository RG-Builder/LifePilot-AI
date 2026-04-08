import React from 'react';
import { Zap, Clock, ArrowRight } from 'lucide-react';
import { Mission, MotivationState } from '../../types/index';

interface NextActionCardProps {
  task: Mission | null;
  onStartFocus: (task: Mission) => void;
  motivationState: MotivationState | null;
}

export const NextActionCard: React.FC<NextActionCardProps> = ({ task, onStartFocus, motivationState }) => {
  if (!task) return null;
  
  return (
    <div className={`stitch-card p-6 ${motivationState?.recovery_mode ? 'bg-secondary/10 border-secondary/30' : 'bg-primary/10 border-primary/30'} relative overflow-hidden group`}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Zap size={80} className={motivationState?.recovery_mode ? 'text-secondary' : 'text-primary'} />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className={`px-2 py-0.5 rounded-full ${motivationState?.recovery_mode ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'} text-[10px] font-black uppercase tracking-widest`}>
            {motivationState?.recovery_mode ? 'Recovery Objective' : 'Primary Objective'}
          </div>
          {task.status === 'overdue' && (
            <div className="px-2 py-0.5 rounded-full bg-danger/20 text-[10px] font-black uppercase tracking-widest text-danger">
              Overdue
            </div>
          )}
        </div>
        
        <div className="text-[10px] font-black uppercase tracking-widest text-text_secondary mb-1">Do this now:</div>
        <h3 className={`text-xl md:text-2xl font-black tracking-tighter mb-2 text-text_primary`}>
          {task.title}
        </h3>
        
        <div className="flex flex-wrap items-center gap-4 text-text_secondary text-xs font-bold uppercase tracking-widest mb-6">
          <div className="flex items-center gap-1.5">
            <Clock size={14} />
            {task.duration}m
          </div>
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-primary" />
            {task.impact} Impact
          </div>
        </div>
        
        <button 
          onClick={() => onStartFocus(task)}
          className={`w-full py-4 ${motivationState?.recovery_mode ? 'bg-secondary' : 'bg-primary'} text-black font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-lg`}
        >
          Engage Protocol
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
