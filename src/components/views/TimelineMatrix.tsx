import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, CheckCircle2 } from 'lucide-react';
import { Mission } from '../../types';

interface TimelineMatrixProps {
  timelineMatrix: Mission[];
  generateSchedule: () => Promise<void>;
  handleAction: (type: string, payload?: any) => Promise<void>;
  loading: boolean;
  theme: any;
}

export const TimelineMatrix: React.FC<TimelineMatrixProps> = ({
  timelineMatrix,
  generateSchedule,
  handleAction,
  loading,
  theme
}) => {
  return (
    <motion.div 
      key="schedule"
      initial={theme.animations.type !== 'minimal' ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 md:space-y-12 pb-32"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-0">
        <div>
          <h2 className={`text-2xl md:text-5xl font-black tracking-tighter text-text_primary`}>{theme.wording.schedule}</h2>
          <p className="text-text_secondary text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            {theme.id === 'elite' ? 'Temporal Optimization & Flow' : theme.id === 'simple' ? 'Your perfect day, planned out!' : 'Your daily focus timeline.'}
          </p>
        </div>
        <button 
          onClick={generateSchedule}
          disabled={loading}
          className="stitch-button stitch-button-primary text-[10px] uppercase tracking-widest w-full sm:w-auto"
        >
          {loading ? (theme.id === 'elite' ? 'Optimizing...' : 'Planning...') : (theme.id === 'elite' ? 'AI Re-Route' : 'Generate Schedule')}
        </button>
      </div>

      <div className="relative pl-10 sm:pl-14 space-y-8 sm:space-y-12">
        {/* Timeline Line */}
        <div className="absolute left-[23px] sm:left-[27px] top-4 bottom-4 w-1 bg-gradient-to-b from-primary via-secondary to-accent opacity-10 rounded-full"></div>
        
        {timelineMatrix.length > 0 ? timelineMatrix.map((mission, idx) => (
          <div key={mission.id} className="relative group">
            {/* Timeline Node */}
            <div className={`absolute -left-[38px] sm:-left-[45px] top-2 size-7 sm:size-9 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-background z-10 flex items-center justify-center transition-all duration-500 ${mission.status === 'completed' ? 'bg-primary' : 'bg-primary shadow-lg shadow-primary/40'}`}>
              {mission.status === 'completed' ? <Check size={14} className="text-black" /> : <div className="size-1.5 rounded-full bg-white animate-pulse"></div>}
            </div>
            
            <div className="stitch-card stitch-card-hover p-6 sm:p-8 border-border relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-surface rounded-lg text-[10px] font-black text-primary uppercase tracking-widest border border-primary/10">{mission.startTime}</span>
                    <span className="text-[10px] font-black text-text_secondary uppercase tracking-widest">{mission.duration} MIN {theme.id === 'elite' ? 'DURATION' : ''}</span>
                  </div>
                  <h4 className={`text-xl sm:text-2xl font-black tracking-tight ${mission.status === 'completed' ? 'text-text_secondary line-through' : 'text-text_primary'}`}>{mission.title}</h4>
                </div>
                <button 
                  onClick={() => handleAction('COMPLETE_TASK', { id: mission.id, streak: mission.streak })}
                  className={`size-10 sm:size-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ml-auto sm:ml-0 ${mission.status === 'completed' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface text-text_secondary hover:text-text_primary hover:bg-primary hover:text-black'}`}
                >
                  <CheckCircle2 size={20} />
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className={`stitch-card p-12 sm:p-24 text-center space-y-6 border-dashed ${theme.id === 'elite' ? 'border-border' : 'border-primary/20'}`}>
            <Clock size={48} className="mx-auto text-text_secondary opacity-20" />
            <div className="space-y-2">
              <p className="text-text_secondary font-bold text-lg italic">{theme.id === 'elite' ? 'Timeline Matrix not initialized.' : 'No schedule generated yet.'}</p>
              <p className="text-text_secondary text-xs font-medium">{theme.id === 'elite' ? 'Run AI Re-Route to generate your optimized path.' : 'Click the button above to plan your day!'}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
