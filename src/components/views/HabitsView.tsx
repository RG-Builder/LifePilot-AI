import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { HabitCard } from '../habits/HabitCard';
import { EmptyState } from '../shared/EmptyState';
import { Habit } from '../../types';

interface HabitsViewProps {
  consistencySystem: Habit[];
  resetHabitForm: () => void;
  setShowHabitModal: (show: boolean) => void;
  editHabit: (habit: Habit) => void;
  handleAction: (type: string, payload?: any) => Promise<void>;
  theme: any;
}

export const HabitsView: React.FC<HabitsViewProps> = ({
  consistencySystem,
  resetHabitForm,
  setShowHabitModal,
  editHabit,
  handleAction,
  theme
}) => {
  return (
    <motion.div 
      key="habits"
      initial={theme.animations.type !== 'minimal' ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 md:space-y-12 pb-32"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className={`text-3xl sm:text-5xl font-black tracking-tighter text-text_primary`}>Consistency <span className="text-primary">Protocols</span></h2>
          <p className="text-text_secondary text-[10px] font-black uppercase tracking-[0.3em]">
            {theme.id === 'elite' ? 'Neural Habit Forge & Reinforcement' : 'Build routines that actually stick.'}
          </p>
        </div>
        <button 
          onClick={() => { resetHabitForm(); setShowHabitModal(true); }}
          className="size-12 rounded-2xl bg-primary text-black flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {consistencySystem.map(habit => (
          <HabitCard 
            key={habit.id} 
            habit={habit} 
            editHabit={editHabit} 
            handleAction={handleAction} 
          />
        ))}

        {consistencySystem.length === 0 && (
          <EmptyState
            type="habits"
            theme={theme.id}
            onAction={() => { resetHabitForm(); setShowHabitModal(true); }}
          />
        )}
      </div>
    </motion.div>
  );
};
