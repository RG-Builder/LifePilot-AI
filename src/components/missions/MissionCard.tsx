import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, X, Heart, Briefcase, Target, Clock, CheckCircle2 } from 'lucide-react';
import { Mission } from '../../types';
import { toDate } from '../../lib/utils';

interface MissionCardProps {
  mission: Mission;
  theme: any;
  handleAction: (type: string, payload?: any) => Promise<void>;
}

export const MissionCard: React.FC<MissionCardProps> = ({ mission, theme, handleAction }) => {
  const impactColor = mission.impact === 'critical' ? 'text-danger' : mission.impact === 'high' ? 'text-primary' : 'text-secondary';
  
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      handleAction('DELETE_TASK', { id: mission.id });
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <motion.div 
      layout
      whileHover={{ scale: 1.01, borderColor: 'var(--color-primary)' }}
      initial={theme.animations.type !== 'minimal' ? { opacity: 0, y: 20 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      className={`stitch-card p-4 sm:p-6 group relative overflow-hidden transition-all border-transparent hover:border-primary/30 ${mission.status === 'completed' ? 'opacity-60 grayscale-[0.5]' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${impactColor}`}>
              {mission.status === 'overdue' ? 'OVERDUE' : mission.impact} {theme.id === 'elite' ? 'Impact' : theme.id === 'simple' ? 'Level' : ''}
            </span>
            <span className="text-[10px] font-bold text-text_secondary/50 uppercase tracking-widest">•</span>
            <span className="text-[10px] font-bold text-text_secondary uppercase tracking-widest">
              {mission.category}
            </span>
          </div>
          <h3 className={`text-xl font-bold tracking-tight transition-colors ${theme.id === 'elite' ? 'text-text_primary group-hover:text-primary' : 'text-text_primary'} ${mission.status === 'completed' ? 'line-through opacity-50' : ''}`}>
            {mission.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDelete}
            className={`size-8 rounded-lg flex items-center justify-center transition-all ${confirmDelete ? 'bg-danger text-white' : 'text-text_secondary hover:text-danger hover:bg-danger/10 opacity-40 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`}
            title={confirmDelete ? "Click again to confirm" : "Delete Mission"}
          >
            {confirmDelete ? <X size={16} /> : <Trash2 size={16} />}
          </button>
          <div className={`size-10 rounded-xl flex items-center justify-center text-text_secondary bg-surface border border-border`}>
            {mission.category === 'health' ? <Heart size={20} /> : mission.category === 'work' ? <Briefcase size={20} /> : <Target size={20} />}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6">
        <div className="flex items-center gap-1.5 text-text_secondary">
          <Clock size={14} />
          <span className="text-xs font-medium">{mission.duration}m</span>
        </div>
        {mission.deadline && (
          <div className={`flex items-center gap-1.5 ${mission.status === 'overdue' ? 'text-danger' : 'text-text_secondary'}`}>
            <Clock size={14} />
            <span className="text-xs font-medium">
              {toDate(mission.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
        {mission.status === 'completed' && mission.completed_at && (
          <div className="flex items-center gap-1.5 text-success">
            <CheckCircle2 size={14} />
            <span className="text-xs font-medium">
              Completed {toDate(mission.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {mission.status !== 'completed' && (
          <button 
            onClick={() => handleAction('COMPLETE_TASK', { id: mission.id, streak: mission.streak })}
            className="size-10 md:size-12 rounded-xl md:rounded-2xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all"
          >
            <CheckCircle2 size={20} />
          </button>
        )}
        <button 
          onClick={() => handleAction('START_FOCUS', { task: mission })}
          className="flex-1 py-3 md:py-4 bg-surface border border-border text-text_primary rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs hover:bg-primary hover:text-black hover:border-primary transition-all"
        >
          {theme.id === 'elite' ? 'Engage Protocol' : 'Start Focus'}
        </button>
      </div>
    </motion.div>
  );
};
