import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus } from 'lucide-react';
import { MissionCard } from '../missions/MissionCard';
import { Mission } from '../../types';

interface MissionMatrixProps {
  missions: Mission[];
  taskFilter: 'all' | 'pending' | 'completed' | 'overdue';
  setTaskFilter: (filter: 'all' | 'pending' | 'completed' | 'overdue') => void;
  saveMission: (e: React.FormEvent) => Promise<void>;
  editingMission: Mission | null;
  title: string;
  setTitle: (val: string) => void;
  urgencyScore: number;
  setUrgencyScore: (val: number) => void;
  estimatedEffort: number;
  setEstimatedEffort: (val: number) => void;
  impactLevel: number;
  setImpactLevel: (val: number) => void;
  duration: number;
  setDuration: (val: number) => void;
  deadline: string;
  setDeadline: (val: string) => void;
  deadlineError: string | null;
  setDeadlineError: (val: string | null) => void;
  category: string;
  setCategory: (val: string) => void;
  loading: boolean;
  resetForm: () => void;
  theme: any;
  handleAction: (type: string, payload?: any) => Promise<void>;
}

export const MissionMatrix: React.FC<MissionMatrixProps> = ({
  missions,
  taskFilter,
  setTaskFilter,
  saveMission,
  editingMission,
  title,
  setTitle,
  urgencyScore,
  setUrgencyScore,
  estimatedEffort,
  setEstimatedEffort,
  impactLevel,
  setImpactLevel,
  duration,
  setDuration,
  deadline,
  setDeadline,
  deadlineError,
  setDeadlineError,
  category,
  setCategory,
  loading,
  resetForm,
  theme,
  handleAction
}) => {
  return (
    <motion.div 
      key="tasks"
      initial={theme.animations.type !== 'minimal' ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 md:space-y-12 pb-32"
    >
      <div className="flex flex-col gap-6 md:gap-8">
        <div>
          <h2 className={`text-2xl md:text-5xl font-black tracking-tighter text-text_primary`}>{theme.wording.missions}</h2>
          <p className="text-text_secondary text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            {theme.id === 'elite' ? 'Tactical Asset Management & Deployment' : theme.id === 'simple' ? 'Keep track of everything you need to do!' : 'Manage your daily focus items.'}
          </p>
        </div>
        <div className={`flex p-1.5 rounded-[20px] md:rounded-[24px] border overflow-x-auto no-scrollbar bg-surface border-border`}>
          {(['all', 'pending', 'completed', 'overdue'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setTaskFilter(f)}
              className={`px-4 md:px-8 py-2 md:py-3.5 rounded-[16px] md:rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${taskFilter === f ? 'bg-primary text-black shadow-xl shadow-primary/20' : 'text-text_secondary hover:text-text_primary'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8 md:space-y-10">
        <form onSubmit={saveMission} className="stitch-card p-4 md:p-10 space-y-6 md:space-y-8 border-border relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none text-text_secondary">
            <Zap size={120} />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className={`size-10 md:size-12 rounded-xl md:rounded-2xl flex items-center justify-center shadow-inner ${editingMission ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
              {editingMission ? <Zap size={20} className="md:size-[24px]" /> : <Plus size={20} className="md:size-[24px]" />}
            </div>
            <h3 className={`text-lg md:text-2xl font-black tracking-tight text-text_primary`}>
              {editingMission ? (theme.id === 'elite' ? 'Refine Mission' : 'Edit Task') : (theme.id === 'elite' ? 'Initialize Mission' : 'New Task')}
            </h3>
          </div>
          <div className="space-y-6 md:space-y-8 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text_secondary uppercase tracking-widest ml-1">
                {theme.id === 'elite' ? 'Mission Objective' : 'What needs to be done?'}
              </label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={theme.id === 'elite' ? "Enter tactical objective..." : "e.g., Buy groceries"}
                className="w-full bg-surface border border-border rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-6 focus:border-primary/50 transition-all outline-none font-bold text-lg md:text-2xl placeholder:text-text_secondary/30 text-text_primary"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-text_secondary uppercase tracking-widest ml-1">Urgency Score (1-10)</label>
                  <span className="text-xs font-black text-primary">{urgencyScore}</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1"
                  value={urgencyScore}
                  onChange={(e) => setUrgencyScore(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-text_secondary uppercase tracking-widest ml-1">Estimated Effort (1-5)</label>
                  <span className="text-xs font-black text-secondary">{estimatedEffort}</span>
                </div>
                <input 
                  type="range" min="1" max="5" step="1"
                  value={estimatedEffort}
                  onChange={(e) => setEstimatedEffort(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-secondary"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-text_secondary uppercase tracking-widest ml-1">Impact Level (1-10)</label>
                  <span className="text-xs font-black text-accent">{impactLevel}</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1"
                  value={impactLevel}
                  onChange={(e) => setImpactLevel(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text_secondary uppercase tracking-widest ml-1">Duration (min)</label>
                <input 
                  type="number" 
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                  className="w-full bg-surface border border-border rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-5 focus:border-primary/50 outline-none font-bold text-text_primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text_secondary uppercase tracking-widest ml-1">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-5 focus:border-primary/50 outline-none font-bold text-text_primary appearance-none"
                >
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="health">Health</option>
                  <option value="finance">Finance</option>
                  <option value="growth">Growth</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text_secondary uppercase tracking-widest ml-1">
                  {theme.id === 'elite' ? 'Temporal Deadline' : 'Due Date'}
                </label>
                <input 
                  type="datetime-local" 
                  value={deadline}
                  onChange={(e) => {
                    setDeadline(e.target.value);
                    if (deadlineError) setDeadlineError(null);
                  }}
                  className={`w-full bg-surface border rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-5 outline-none font-bold transition-colors text-text_primary ${deadlineError ? 'border-danger' : 'border-border focus:border-primary/50'}`}
                />
              </div>
            </div>
            {deadlineError && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] font-bold text-danger uppercase tracking-widest ml-1"
              >
                {deadlineError}
              </motion.p>
            )}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 py-4 md:py-6 bg-primary text-black rounded-xl md:rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : editingMission ? (theme.id === 'elite' ? 'Update Mission' : 'Save Changes') : (theme.id === 'elite' ? 'Deploy Mission' : 'Add Task')}
              </button>
              {editingMission && (
                <button 
                  type="button"
                  onClick={resetForm}
                  className="px-8 py-4 md:py-6 bg-surface border border-border text-text_secondary rounded-xl md:rounded-2xl font-black uppercase tracking-widest hover:bg-danger/10 hover:text-danger transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="space-y-5">
          {missions
            .filter(m => {
              if (taskFilter === 'all') return true;
              if (taskFilter === 'pending') return m.status === 'pending';
              if (taskFilter === 'completed') return m.status === 'completed';
              if (taskFilter === 'overdue') return m.status === 'overdue';
              return true;
            })
            .map((mission: Mission) => (
              <MissionCard key={mission.id} mission={mission} theme={theme} handleAction={handleAction} />
            ))}
        </div>
      </div>
    </motion.div>
  );
};
