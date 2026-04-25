import React from 'react';

type ThemeType = 'minimal' | 'simple' | 'elite';

interface LoadingStateProps {
  message: string;
  theme: ThemeType;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message, theme }) => {
  return (
    <div className={`stitch-card p-10 text-center ${theme === 'elite' ? 'border-border' : ''}`}>
      <div className="mx-auto mb-4 size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-text_secondary font-bold">{message}</p>
    </div>
  );
};
