import React from 'react';
import { Calendar, CheckSquare, Repeat } from 'lucide-react';

type EmptyType = 'tasks' | 'habits' | 'schedule';
type ThemeType = 'minimal' | 'simple' | 'elite';

interface EmptyStateProps {
  type: EmptyType;
  theme: ThemeType;
  onAction: () => void;
}

const EMPTY_COPY: Record<EmptyType, { title: string; action: string; icon: React.ReactNode }> = {
  tasks: {
    title: 'No tasks yet - add your first task!',
    action: 'Add task',
    icon: <CheckSquare size={36} className="opacity-30" />,
  },
  habits: {
    title: 'No habits tracked - start building momentum!',
    action: 'Add habit',
    icon: <Repeat size={36} className="opacity-30" />,
  },
  schedule: {
    title: 'No schedule - generate with AI!',
    action: 'Generate schedule',
    icon: <Calendar size={36} className="opacity-30" />,
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({ type, theme, onAction }) => {
  const copy = EMPTY_COPY[type];

  return (
    <div className={`p-12 text-center border border-dashed rounded-[28px] bg-surface/50 ${theme === 'elite' ? 'border-border' : 'border-primary/30'}`}>
      <div className="text-text_secondary mb-4 flex justify-center">{copy.icon}</div>
      <p className="font-bold text-text_secondary">{copy.title}</p>
      <button
        onClick={onAction}
        className="mt-5 px-6 py-3 rounded-xl bg-primary/10 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
      >
        {copy.action}
      </button>
    </div>
  );
};
