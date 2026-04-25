import React from 'react';

interface TaskFilterProps {
  value: 'all' | 'pending' | 'completed' | 'overdue';
  onChange: (value: 'all' | 'pending' | 'completed' | 'overdue') => void;
}

export const TaskFilter: React.FC<TaskFilterProps> = ({ value, onChange }) => {
  return (
    <div className="flex p-1.5 rounded-[20px] md:rounded-[24px] border overflow-x-auto no-scrollbar bg-surface border-border">
      {(['all', 'pending', 'completed', 'overdue'] as const).map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={`px-4 md:px-8 py-2 md:py-3.5 rounded-[16px] md:rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            value === item ? 'bg-primary text-black shadow-xl shadow-primary/20' : 'text-text_secondary hover:text-text_primary'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
};
