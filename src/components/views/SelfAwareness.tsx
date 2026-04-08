import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Target, Activity, Flame, Zap } from 'lucide-react';
import { Mission, Habit, Analytics } from '../../types';

interface SelfAwarenessProps {
  missions: Mission[];
  consistencySystem: Habit[];
  selfAwareness: Analytics | null;
  theme: any;
}

export const SelfAwareness: React.FC<SelfAwarenessProps> = ({
  missions,
  consistencySystem,
  selfAwareness,
  theme
}) => {
  const completedMissions = missions.filter(m => m.status === 'completed');
  const totalMissions = missions.length;
  const cognitiveEfficiency = totalMissions > 0 ? Math.round((completedMissions.length / totalMissions) * 100) : 0;
  
  const habitConsistency = consistencySystem.length > 0 ? 
    Math.round((consistencySystem.reduce((acc, h) => acc + (h.current_count / h.goal_count), 0) / consistencySystem.length) * 100) : 0;

  return (
    <motion.div 
      key="analytics"
      initial={theme.animations.type !== 'minimal' ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 sm:space-y-12 pb-32"
    >
      <div>
        <h2 className={`text-2xl md:text-5xl font-black tracking-tighter text-text_primary`}>{theme.wording.awareness}</h2>
        <p className="text-text_secondary text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-2">
          {theme.id === 'elite' ? 'Neural Performance Analytics & Feedback' : 'Understand your patterns and improve.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="stitch-card p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Brain size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-text_primary">Cognitive Efficiency</h3>
              <p className="text-xs font-medium text-text_secondary">Mission completion ratio</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-text_primary">{cognitiveEfficiency}%</span>
            <span className="text-xs font-bold text-success uppercase tracking-widest">+4.2% vs last week</span>
          </div>
          <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${cognitiveEfficiency}%` }}
              className="h-full bg-primary"
            />
          </div>
        </div>

        <div className="stitch-card p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-text_primary">Habit Stability</h3>
              <p className="text-xs font-medium text-text_secondary">Consistency protocol adherence</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-text_primary">{habitConsistency}%</span>
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Stable</span>
          </div>
          <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${habitConsistency}%` }}
              className="h-full bg-secondary"
            />
          </div>
        </div>
      </div>

      <div className="stitch-card p-8">
        <h3 className="text-xl font-black tracking-tight text-text_primary mb-8">Performance Matrix</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-text_secondary">Focus Minutes</div>
            <div className="text-3xl font-black text-text_primary">{selfAwareness?.focusTimeMinutes || 0}</div>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-text_secondary">Missions Secured</div>
            <div className="text-3xl font-black text-text_primary">{completedMissions.length}</div>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-text_secondary">Peak Streak</div>
            <div className="text-3xl font-black text-text_primary">{Math.max(...consistencySystem.map(h => h.streak), 0)}</div>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-text_secondary">Drive Score</div>
            <div className="text-3xl font-black text-primary">{selfAwareness?.productivityScore || 0}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
