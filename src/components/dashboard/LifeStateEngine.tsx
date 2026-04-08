import React from 'react';
import { Flame, Zap, Brain } from 'lucide-react';
import { Mission, MotivationState } from '../../types/index';
import { isToday } from '../../lib/utils';

interface LifeStateEngineProps {
  missions: Mission[];
  dailyScore: number;
  motivationState: MotivationState | null;
  motivationQuote: string;
  theme: any;
}

export const LifeStateEngine: React.FC<LifeStateEngineProps> = ({ 
  missions, 
  dailyScore, 
  motivationState, 
  motivationQuote, 
  theme 
}) => {
  const todayMissions = missions.filter(m => 
    isToday(m.created_at) || 
    (m.deadline && isToday(m.deadline)) || 
    (m.completed_at && isToday(m.completed_at))
  );
  const completedToday = todayMissions.filter(m => m.status === 'completed' && m.completed_at && isToday(m.completed_at)).length;
  const totalToday = todayMissions.length;
  const efficiency = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
  
  const displayScore = dailyScore || efficiency;

  return (
    <div className="flex flex-col items-center py-8 sm:py-12">
      <div className="diamond-container mb-8 sm:mb-12">
        <div className={`diamond-glow scale-110 opacity-50 ${displayScore > 80 ? 'bg-success' : displayScore > 50 ? 'bg-primary' : 'bg-danger'}`} />
        
        <div className={`absolute inset-0 border-2 border-primary/30 ${theme.id === 'elite' ? 'rotate-45 rounded-xl' : theme.id === 'simple' ? 'rounded-full' : 'rounded-lg'} transition-all duration-500`} 
             style={{ background: theme.id === 'elite' ? 'radial-gradient(circle at center, rgba(var(--color-primary-rgb, 0, 242, 255), 0.1), transparent)' : 'transparent' }} />
        
        <div className="relative z-10 flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-1">Daily Drive</span>
          <div className="flex items-baseline">
            <span className={`text-5xl sm:text-7xl font-black tracking-tighter text-text_primary`}>{displayScore}</span>
            <span className="text-xl sm:text-2xl font-bold text-primary/60 ml-1">%</span>
          </div>
          <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
            <div className={`size-1.5 bg-primary rounded-full ${theme.animations.type !== 'minimal' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {motivationState?.recovery_mode ? 'Recovery Mode' : displayScore > 80 ? 'Optimal' : displayScore > 50 ? 'Stable' : 'Low Power'}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-xs text-center space-y-4">
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-secondary">
              <Flame size={16} fill="currentColor" />
              <span className="text-lg font-black">{motivationState?.current_streak || 0}</span>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-text_secondary">Streak</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-primary">
              <Zap size={16} fill="currentColor" />
              <span className="text-lg font-black">{motivationState?.focus_streak || 0}</span>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-text_secondary">Focus</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-text_secondary">
            <Brain className="size-3 text-primary" />
            Neural Insight
          </div>
          <p className="text-sm font-medium text-text_primary leading-relaxed">
            {motivationQuote}
          </p>
        </div>
      </div>
    </div>
  );
};
