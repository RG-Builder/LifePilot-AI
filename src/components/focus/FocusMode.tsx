import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, CheckCircle2 } from 'lucide-react';
import { Mission } from '../../types';

interface FocusModeProps {
  task: Mission;
  handleAction: (type: string, payload?: any) => Promise<void>;
}

export const FocusMode: React.FC<FocusModeProps> = ({ task, handleAction }) => {
  const [timeLeft, setTimeLeft] = useState(task.duration * 60);
  const [isActive, setIsActive] = useState(true);
  const [distractions, setDistractions] = useState(0);
  
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(interval);
      handleAction('COMPLETE_TASK', { id: task.id, streak: task.streak });
      handleAction('STOP_FOCUS');
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, task, handleAction]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((task.duration * 60 - timeLeft) / (task.duration * 60)) * 100;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] size-[60%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[20%] -right-[10%] size-[60%] bg-secondary/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="w-full max-w-3xl space-y-12 text-center relative z-10">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-[0.3em]">
            <div className="size-2 rounded-full bg-primary animate-ping" />
            Focus Protocol Active
          </div>
          <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-text_primary drop-shadow-2xl">
            {task.title}
          </h2>
        </motion.div>
        
        <div className="relative size-80 md:size-[450px] mx-auto flex items-center justify-center">
          <svg className="absolute inset-0 size-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="46%"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="12"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="46%"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="12"
              strokeDasharray="100"
              strokeDashoffset={100 - progress}
              pathLength="100"
              className="transition-all duration-1000"
              strokeLinecap="round"
            />
          </svg>
          <div className="flex flex-col items-center">
            <div className="text-8xl md:text-[10rem] font-black tabular-nums tracking-tighter text-text_primary drop-shadow-[0_0_50px_var(--color-primary)]">
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs md:text-sm font-black uppercase tracking-[0.5em] text-text_secondary mt-4">
              Remaining Matrix
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="glass-card p-8 bg-surface border-border flex flex-col items-center justify-center gap-2">
            <div className="text-xs font-black uppercase tracking-widest text-text_secondary">Distractions Logged</div>
            <div className="text-4xl font-black text-primary">{distractions}</div>
            <button 
              onClick={() => setDistractions(d => d + 1)}
              className="mt-3 px-6 py-3 rounded-xl bg-surface hover:bg-surface/80 text-xs font-black uppercase tracking-widest text-text_primary transition-all border border-border"
            >
              Log Distraction
            </button>
          </div>
          <div className="glass-card p-8 bg-surface border-border flex flex-col items-center justify-center gap-2">
            <div className="text-xs font-black uppercase tracking-widest text-text_secondary">Current Efficiency</div>
            <div className="text-4xl font-black text-secondary">98.4%</div>
            <div className="text-xs font-bold text-text_secondary uppercase tracking-widest">Optimal Flow State</div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-6 pt-12">
          <button 
            onClick={() => setIsActive(!isActive)}
            className="size-24 md:size-28 rounded-full bg-text_primary text-background flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_50px_var(--color-text-primary)]"
          >
            {isActive ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-1" />}
          </button>
          <button 
            onClick={() => handleAction('STOP_FOCUS')}
            className="px-10 md:px-14 py-5 md:py-7 bg-surface text-text_secondary font-black uppercase tracking-widest rounded-2xl hover:bg-danger/20 hover:text-danger transition-all border border-border"
          >
            Abort Protocol
          </button>
          <button 
            onClick={() => {
              handleAction('COMPLETE_TASK', { id: task.id, streak: task.streak });
              handleAction('STOP_FOCUS');
            }}
            className="px-10 md:px-14 py-5 md:py-7 bg-primary text-black font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-primary/30"
          >
            Mission Complete
          </button>
        </div>
      </div>
    </div>
  );
};
