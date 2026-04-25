import React, { createContext, useContext, useMemo, useState } from 'react';
import { Habit, HabitHistory, Mission, ScheduleItem } from '../types';

interface AppContextType {
  tasks: Mission[];
  habits: Habit[];
  schedule: ScheduleItem[];
  habitHistory: HabitHistory[];
  currentFocusTask: Mission | null;
  completedTasks: Mission[];
  pendingTasks: Mission[];
  overdueTasks: Mission[];
  todayCompletedHabits: Habit[];
  isLoading: boolean;
  error: string | null;
  addTask: (task: Partial<Mission>) => void;
  editTask: (taskId: string, updates: Partial<Mission>) => void;
  deleteTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  setFocusTask: (task: Mission | null) => void;
  addHabit: (habit: Partial<Habit>) => void;
  editHabit: (habitId: string, updates: Partial<Habit>) => void;
  deleteHabit: (habitId: string) => void;
  toggleHabit: (habitId: string) => void;
  generateSchedule: () => Promise<void>;
  clearSchedule: () => void;
  setError: (error: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_TASKS: Mission[] = [];
const INITIAL_HABITS: Habit[] = [];
const INITIAL_SCHEDULE: ScheduleItem[] = [];
const INITIAL_HABIT_HISTORY: HabitHistory[] = [];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Mission[]>(INITIAL_TASKS);
  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(INITIAL_SCHEDULE);
  const [habitHistory, setHabitHistory] = useState<HabitHistory[]>(INITIAL_HABIT_HISTORY);
  const [currentFocusTask, setFocusTask] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeTask = (taskId: string) => {
    setTasks((prev) => prev.map((task) => task.id === taskId ? { ...task, status: 'completed', completed_at: new Date().toISOString() } : task));
  };

  const toggleHabit = (habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const totalHabits = habits.length;

    setHabits((prev) => prev.map((habit) => {
      if (habit.id !== habitId) return habit;

      const isCompletedToday = habit.current_count >= habit.goal_count;
      return {
        ...habit,
        current_count: isCompletedToday ? 0 : habit.goal_count,
        streak: isCompletedToday ? habit.streak : habit.streak + 1,
        last_completed_at: isCompletedToday ? habit.last_completed_at : today,
      };
    }));

    setHabitHistory((prev) => {
      const existing = prev.find((h) => h.date === today);
      if (!existing) {
        const completionRate = totalHabits > 0 ? Math.round((1 / totalHabits) * 100) : 0;
        return [...prev, { date: today, completedHabits: [habitId], completionRate }];
      }

      const hasHabit = existing.completedHabits.includes(habitId);
      const completedHabits = hasHabit
        ? existing.completedHabits.filter((id) => id !== habitId)
        : [...existing.completedHabits, habitId];

      const completionRate = totalHabits > 0 ? Math.round((completedHabits.length / totalHabits) * 100) : 0;
      return prev.map((h) => h.date === today ? { ...h, completedHabits, completionRate } : h);
    });
  };

  const generateSchedule = async () => {
    setIsLoading(true);
    try {
      const pending = tasks.filter((task) => task.status !== 'completed').slice(0, 5);
      const generated = pending.map((task, index) => ({
        id: task.id,
        title: task.title,
        startTime: `${String(9 + index).padStart(2, '0')}:00`,
        endTime: `${String(10 + index).padStart(2, '0')}:00`,
        duration: '60m',
        type: 'deep-work' as const,
        completed: false,
      }));
      setSchedule(generated);
    } catch (e) {
      setError('Could not generate schedule.');
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo<AppContextType>(() => ({
    tasks,
    habits,
    schedule,
    habitHistory,
    currentFocusTask,
    completedTasks: tasks.filter((task) => task.status === 'completed'),
    pendingTasks: tasks.filter((task) => task.status === 'pending'),
    overdueTasks: tasks.filter((task) => task.status === 'overdue'),
    todayCompletedHabits: habits.filter((habit) => habit.current_count > 0),
    isLoading,
    error,
    addTask: (task) => setTasks((prev) => [
      {
        id: crypto.randomUUID(),
        title: task.title || 'Untitled task',
        status: 'pending',
        priority: task.priority || 'medium',
        category: task.category || 'general',
        duration: task.duration || 30,
        impact: task.impact || 'moderate',
        urgency: task.urgency || 5,
        importance: task.importance || 5,
        is_habit: false,
        streak: 0,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]),
    editTask: (taskId, updates) => setTasks((prev) => prev.map((task) => task.id === taskId ? { ...task, ...updates } : task)),
    deleteTask: (taskId) => setTasks((prev) => prev.filter((task) => task.id !== taskId)),
    completeTask,
    setFocusTask,
    addHabit: (habit) => setHabits((prev) => [
      {
        id: crypto.randomUUID(),
        title: habit.title || 'Untitled habit',
        description: habit.description || '',
        frequency: habit.frequency || 'daily',
        goal_count: habit.goal_count || 1,
        current_count: 0,
        streak: 0,
        category: habit.category || 'Productivity',
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]),
    editHabit: (habitId, updates) => setHabits((prev) => prev.map((habit) => habit.id === habitId ? { ...habit, ...updates } : habit)),
    deleteHabit: (habitId) => setHabits((prev) => prev.filter((habit) => habit.id !== habitId)),
    toggleHabit,
    generateSchedule,
    clearSchedule: () => setSchedule([]),
    setError,
  }), [tasks, habits, schedule, habitHistory, currentFocusTask, isLoading, error]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
