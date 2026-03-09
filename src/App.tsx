import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Trash2, 
  Sparkles,
  ChevronRight,
  BarChart3,
  LayoutDashboard,
  Download,
  Bell,
  Trophy,
  Home,
  Flame,
  Zap,
  Brain,
  X,
  ArrowRight,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import confetti from 'canvas-confetti';

interface Task {
  id: number;
  title: string;
  importance: number;
  duration: number;
  deadline?: string;
  is_habit: boolean;
  streak: number;
  status: 'pending' | 'completed';
  startTime?: string;
  endTime?: string;
  isOverdue?: boolean;
}

interface Analytics {
  productivityScore: number;
  totalCompleted: number;
  focusTimeMinutes: number;
  habits: { id: number; title: string; streak: number; status: string }[];
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<Task[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [title, setTitle] = useState('');
  const [importance, setImportance] = useState(5);
  const [duration, setDuration] = useState(30);
  const [deadline, setDeadline] = useState('');
  const [isHabit, setIsHabit] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [motivationQuote, setMotivationQuote] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'schedule' | 'habits' | 'analytics'>('home');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [dailyGoal, setDailyGoal] = useState(() => localStorage.getItem('aura_daily_goal') || '');
  const [error, setError] = useState<string | null>(null);
  const [focusTimer, setFocusTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('aura_onboarded'));
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [lastAiCall, setLastAiCall] = useState(0);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);

  const handlePointerDown = (e: React.PointerEvent, task: Task) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsLongPress(false);
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      startEdit(task);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 600);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Small delay to ensure onClick sees the correct isLongPress state
    setTimeout(() => setIsLongPress(false), 50);
  };

  useEffect(() => {
    fetchTasks();
    fetchAnalytics();
    
    // Request notification permission
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // Notification Reminder Logic
  useEffect(() => {
    if (schedule.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHourMin = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      
      schedule.forEach(task => {
        if (task.startTime === currentHourMin && task.status === 'pending') {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Task Starting Now!", { 
              body: `Time to start: ${task.title}`,
              icon: "https://picsum.photos/seed/aura/128/128"
            });
          }
        }
        
        // Deadline approaching alert (1 hour before)
        if (task.deadline) {
          const deadlineDate = new Date(task.deadline);
          const diffMs = deadlineDate.getTime() - now.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          
          if (diffMins === 60 && task.status === 'pending') {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Deadline Approaching!", { 
                body: `1 hour left for: ${task.title}`,
                icon: "https://picsum.photos/seed/deadline/128/128"
              });
            }
          }
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [schedule]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setFocusTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completeOnboarding = () => {
    localStorage.setItem('aura_onboarded', 'true');
    setShowOnboarding(false);
    if (tasks.length > 0) generateSchedule();
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  };

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || duration <= 0) return;
    
    setLoading(true);
    setError(null);
    try {
      const method = editingTask ? 'PUT' : 'POST';
      const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, importance, duration, is_habit: isHabit, deadline }),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save task");
      }
      
      resetForm();
      await fetchTasks();
      await fetchAnalytics();
    } catch (error: any) {
      console.error("Failed to save task:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setImportance(5);
    setDuration(30);
    setDeadline('');
    setIsHabit(false);
    setEditingTask(null);
  };

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setImportance(task.importance);
    setDuration(task.duration);
    setDeadline(task.deadline || '');
    setIsHabit(task.is_habit);
    setActiveTab('tasks');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleDone = async (id: number) => {
    const res = await fetch(`/api/tasks/${id}/toggle`, { method: 'POST' });
    const result = await res.json();
    
    if (result.status === 'completed') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#10B981', '#F59E0B']
      });
      
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Task Completed!", { body: "Great job staying productive!" });
      }
    }

    fetchTasks();
    fetchAnalytics();
    if (schedule.length > 0) generateSchedule();
  };

  const deleteTask = async (id: number) => {
    console.log("Deleting task with id:", id);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      console.log("Delete response status:", res.status);
      if (!res.ok) throw new Error("Failed to delete task");
      
      await fetchTasks();
      await fetchAnalytics();
      
      // If we are looking at the schedule, refresh it too
      if (activeTab === 'schedule') {
        generateSchedule();
      }
    } catch (error) {
      console.error("Delete error:", error);
      setError("Could not delete task. Please try again.");
    }
  };

  const generateSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/schedule');
      const data = await res.json();
      setSchedule(data);
      setActiveTab('schedule');
      getAiInsights(data);
    } catch (error) {
      console.error("Failed to generate schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAiInsights = async (currentSchedule: Task[]) => {
    // Cooldown: Don't call AI more than once every 30 seconds
    const now = Date.now();
    if (now - lastAiCall < 30000) {
      console.log("AI call throttled to save quota");
      return;
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setAiSuggestion("AI Insights unavailable: API key not configured.");
        return;
      }
      
      setLastAiCall(now);
      const ai = new GoogleGenAI({ apiKey });
      
      // Combine insights and motivation into one request to save quota
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this daily schedule and provide 3 brief, actionable productivity tips AND a short powerful motivational quote (max 15 words). 
        Daily Goal: ${dailyGoal}. 
        Schedule: ${JSON.stringify(currentSchedule)}
        
        Return the response in JSON format with keys: "tips" (string) and "quote" (string).`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(response.text || "{}");
      setAiSuggestion(data.tips || "Focus on your high-importance tasks first.");
      setMotivationQuote(data.quote || "Your future is created by what you do today, not tomorrow.");

    } catch (error: any) {
      console.error("AI Insight error:", error);
      
      // Handle 429 Resource Exhausted specifically
      if (error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED")) {
        setAiSuggestion("Aura is currently recharging its AI core (Rate limit reached). Please try again in a few minutes.");
      } else {
        setAiSuggestion("Aura is resting. Focus on your top priorities!");
      }
    }
  };

  const exportToICS = () => {
    if (schedule.length === 0) return;

    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Aura AI//EN\n";
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

    schedule.forEach(task => {
      const start = task.startTime?.replace(':', '') + '00';
      const end = task.endTime?.replace(':', '') + '00';
      
      icsContent += "BEGIN:VEVENT\n";
      icsContent += `SUMMARY:${task.title}\n`;
      icsContent += `DTSTART:${today}T${start}\n`;
      icsContent += `DTEND:${today}T${end}\n`;
      icsContent += `DESCRIPTION:Importance: ${task.importance}, Duration: ${task.duration}m\n`;
      icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'aura_schedule.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const completionRate = analytics?.productivityScore || 0;

  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'pending') return task.status === 'pending';
    if (taskFilter === 'completed') return task.status === 'completed';
    if (taskFilter === 'overdue') return task.deadline && new Date(task.deadline) < new Date() && task.status === 'pending';
    return true;
  });

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans selection:bg-accent-focus/30">
      {/* Onboarding Overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-bg-primary flex items-center justify-center p-6"
          >
            <div className="max-w-md w-full glass-card p-10 text-center space-y-8">
              <div className="w-20 h-20 bg-accent-ai/20 rounded-3xl flex items-center justify-center mx-auto text-accent-ai">
                <Brain size={40} />
              </div>
              
              <AnimatePresence mode="wait">
                {onboardingStep === 1 && (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h2 className="text-3xl font-bold">Welcome to Aura</h2>
                    <p className="text-text-secondary">What is your primary goal for using Aura?</p>
                    <div className="grid grid-cols-1 gap-3 pt-4">
                      {['Deep Focus', 'Daily Routine', 'Project Management', 'Habit Building'].map(goal => (
                        <button 
                          key={goal}
                          onClick={() => setOnboardingStep(2)}
                          className="p-4 bg-bg-tertiary hover:bg-white/10 rounded-2xl text-left transition-all flex items-center justify-between group"
                        >
                          {goal}
                          <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
                
                {onboardingStep === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h2 className="text-3xl font-bold">Your Routine</h2>
                    <p className="text-text-secondary">When do you usually start your day?</p>
                    <div className="grid grid-cols-2 gap-3 pt-4">
                      {['5:00 AM', '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM'].map(time => (
                        <button 
                          key={time}
                          onClick={() => setOnboardingStep(3)}
                          className="p-4 bg-bg-tertiary hover:bg-white/10 rounded-2xl transition-all"
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {onboardingStep === 3 && (
                  <motion.div 
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <h2 className="text-3xl font-bold">Ready to Launch</h2>
                    <p className="text-text-secondary">Aura is ready to optimize your life. Let's build your first schedule.</p>
                    <button 
                      onClick={completeOnboarding}
                      className="w-full py-4 bg-accent-ai text-white rounded-2xl font-bold shadow-lg shadow-accent-ai/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Start My Journey
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation / Header */}
      <header className="flex items-center justify-between p-6 max-w-6xl mx-auto sticky top-0 z-40 bg-bg-dark/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-gradient-to-tr from-primary to-accent-blue flex items-center justify-center glow-primary">
            <Sparkles className="text-white" size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Aura</h1>
        </div>
        <div className="flex gap-4">
          <div className="hidden md:flex items-center gap-6 mr-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Streak: {analytics?.habits.reduce((acc, h) => Math.max(acc, h.streak), 0) || 0} Days</span>
            <div className="h-4 w-px bg-white/10"></div>
          </div>
          <button className="size-10 flex items-center justify-center rounded-xl bg-surface-dark border border-white/10 text-slate-300 hover:text-white transition-colors">
            <Bell size={20} />
          </button>
          <button 
            onClick={() => setShowAiPanel(!showAiPanel)}
            className="size-10 flex items-center justify-center rounded-xl bg-surface-dark border border-white/10 text-slate-300 hover:text-white transition-colors relative"
          >
            <Brain size={20} />
            <span className="absolute top-2.5 right-2.5 size-2 bg-primary rounded-full"></span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pb-32 overflow-y-auto max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Welcome & Motivation */}
              <section className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-bold">Hello, {process.env.USER_EMAIL?.split('@')[0] || 'Aura'}</h2>
                    <p className="text-slate-400 text-sm">{motivationQuote || "Your potential is limitless. Let's unlock it today."}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Productivity</p>
                    <p className="text-2xl font-bold text-primary">{completionRate}%</p>
                  </div>
                </div>
              </section>

              {/* Today's Focus Section */}
              <section>
                <div className="glass-card rounded-3xl p-8 relative overflow-hidden border-primary/20 bg-gradient-to-br from-surface-dark to-bg-dark">
                  <div className="absolute -top-20 -right-20 size-64 bg-primary/10 blur-[100px] rounded-full"></div>
                  <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                    {/* Circular Score */}
                    <div className="relative size-40 flex items-center justify-center">
                      <svg className="size-full -rotate-90">
                        <circle className="text-white/5" cx="80" cy="80" fill="transparent" r="74" stroke="currentColor" strokeWidth="12"></circle>
                        <circle 
                          className="text-primary transition-all duration-1000" 
                          cx="80" cy="80" fill="transparent" r="74" stroke="currentColor" 
                          strokeDasharray="464.7" 
                          strokeDashoffset={464.7 - (464.7 * completionRate / 100)} 
                          strokeWidth="12"
                          strokeLinecap="round"
                        ></circle>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black tracking-tighter">{completionRate}%</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Flow</span>
                      </div>
                    </div>
                    {/* Next Task & Timer */}
                    <div className="flex-1 text-center md:text-left space-y-4">
                      <div>
                        <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-1">Current Focus</p>
                        <h3 className="text-3xl font-bold truncate max-w-[250px] md:max-w-none">
                          {tasks.find(t => t.status === 'pending')?.title || 'All caught up!'}
                        </h3>
                      </div>
                      <div className="flex items-center justify-center md:justify-start gap-4">
                        <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/10 shadow-inner">
                          <span className="text-4xl font-mono font-bold tracking-tighter text-white">{formatTime(focusTimer)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsTimerRunning(!isTimerRunning)}
                            className={`size-14 rounded-full flex items-center justify-center transition-all ${isTimerRunning ? 'bg-white/10 text-white border border-white/20' : 'bg-primary text-white glow-primary hover:scale-105'}`}
                          >
                            {isTimerRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} className="ml-1" fill="currentColor" />}
                          </button>
                          <button 
                            onClick={() => { setFocusTimer(0); setIsTimerRunning(false); }}
                            className="size-14 rounded-full flex items-center justify-center bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <RotateCcw size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Quick Actions / Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-5 flex items-center gap-4 border-white/5">
                  <div className="size-10 rounded-xl bg-accent-orange/10 flex items-center justify-center text-accent-orange">
                    <Flame size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Streak</p>
                    <p className="text-lg font-bold">12 Days</p>
                  </div>
                </div>
                <div className="glass-card p-5 flex items-center gap-4 border-white/5">
                  <div className="size-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rank</p>
                    <p className="text-lg font-bold">Elite</p>
                  </div>
                </div>
              </div>

              {/* Next Up Tasks */}
              <section>
                <div className="flex justify-between items-end mb-4">
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Upcoming Queue</h2>
                  <button onClick={() => setActiveTab('tasks')} className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">View Vault</button>
                </div>
                <div className="space-y-3">
                  {tasks.filter(t => t.status === 'pending').slice(0, 3).map(task => (
                    <div 
                      key={task.id} 
                      onPointerDown={(e) => handlePointerDown(e, task)}
                      onPointerUp={handlePointerUp}
                      className={`glass-card rounded-2xl p-5 border-l-4 group hover:bg-white/5 transition-all cursor-pointer ${task.importance > 7 ? 'border-accent-orange' : 'border-accent-blue'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`size-1.5 rounded-full ${task.importance > 7 ? 'bg-accent-orange' : 'bg-accent-blue'}`}></span>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${task.importance > 7 ? 'text-accent-orange' : 'text-accent-blue'}`}>
                              {task.importance > 7 ? 'Critical' : 'Routine'}
                            </span>
                          </div>
                          <h4 className="text-lg font-semibold text-slate-200">{task.title}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">{task.startTime || '--:--'}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{task.duration}m</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={(e) => { e.stopPropagation(); if (confirm('Delete this task?')) deleteTask(task.id); }}
                            className="text-slate-600 hover:text-accent-orange transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleDone(task.id); }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:bg-primary transition-all"
                        >
                          <CheckCircle2 size={14} /> Complete
                        </button>
                      </div>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === 'pending').length === 0 && (
                    <div className="p-12 text-center text-slate-500 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                      <Sparkles size={24} className="mx-auto mb-3 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">All tasks completed</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Insights / Analytics */}
              <section>
                <div className="glass-card rounded-xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="text-primary" size={16} />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">AI Insight</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300 italic">
                    {aiSuggestion || "Your focus peaks in the morning. Schedule your deep work then for maximum results."}
                  </p>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div 
              key="tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">Task Vault</h2>
                <div className="flex bg-surface-dark p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
                  {(['all', 'pending', 'completed', 'overdue'] as const).map(f => (
                    <button 
                      key={f}
                      onClick={() => setTaskFilter(f)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${taskFilter === f ? 'bg-primary text-white shadow-lg glow-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <form onSubmit={saveTask} className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    {editingTask ? <Zap className="text-accent-orange" size={18} /> : <Plus className="text-primary" size={18} />}
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                      {editingTask ? 'Edit Task' : 'Quick Add'}
                    </h3>
                  </div>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Importance (1-10)</label>
                      <input 
                        type="number" 
                        min="1" max="10"
                        value={importance}
                        onChange={(e) => setImportance(parseInt(e.target.value) || 5)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Duration (min)</label>
                      <input 
                        type="number" 
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Deadline</label>
                    <input 
                      type="datetime-local" 
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsHabit(!isHabit)}
                    className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isHabit ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-slate-400 border border-white/5'}`}
                  >
                    <Flame size={16} /> {isHabit ? 'Daily Habit' : 'One-time Task'}
                  </button>
                  <button 
                    type="submit"
                    disabled={!title}
                    className="w-full py-3 bg-primary text-white rounded-xl font-bold glow-primary hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {editingTask ? 'Update Task' : 'Add to Queue'}
                  </button>
                  {editingTask && (
                    <button 
                      type="button"
                      onClick={resetForm}
                      className="w-full py-2 text-slate-500 text-xs font-bold uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                  )}
                </form>
              </div>

                <div className="lg:col-span-8 space-y-4">
                  <AnimatePresence mode="popLayout">
                    {filteredTasks.map(task => (
                      <motion.div 
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onPointerDown={(e) => handlePointerDown(e, task)}
                        onPointerUp={handlePointerUp}
                        className={`glass-card p-5 rounded-2xl border-l-4 transition-all cursor-pointer group ${task.status === 'completed' ? 'opacity-50 border-slate-700' : task.importance > 7 ? 'border-accent-orange' : 'border-accent-blue'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleDone(task.id); }}
                              className={`size-10 rounded-full border-2 flex items-center justify-center transition-all ${task.status === 'completed' ? 'bg-accent-done border-accent-done text-black' : 'border-white/10 hover:border-primary'}`}
                            >
                              {task.status === 'completed' ? <CheckCircle2 size={20} /> : <div className="size-2 rounded-full bg-white/20 group-hover:bg-primary transition-all"></div>}
                            </button>
                            <div>
                              <h4 className={`text-xl font-bold ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>{task.title}</h4>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Clock size={12} /> {task.duration}m</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${task.importance > 7 ? 'text-accent-orange' : 'text-slate-500'}`}><Zap size={12} /> P{task.importance}</span>
                                {task.deadline && <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Calendar size={12} /> {new Date(task.deadline).toLocaleDateString()}</span>}
                                {task.isHabit && <Flame size={12} className="text-accent-orange" />}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={(e) => { e.stopPropagation(); startEdit(task); }}
                              className="p-2 text-slate-500 hover:text-white transition-all"
                            >
                              <Plus size={18} className="rotate-45" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); if (confirm('Delete?')) deleteTask(task.id); }}
                              className="p-2 text-slate-500 hover:text-accent-orange transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {filteredTasks.length === 0 && (
                    <div className="p-20 text-center text-slate-500 border border-dashed border-white/10 rounded-[40px] bg-white/[0.02]">
                      <Sparkles size={32} className="mx-auto mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-sm">Vault is empty</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'schedule' && (
            <motion.div 
              key="schedule"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto space-y-10"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-4xl font-black tracking-tighter">Daily Roadmap</h2>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">AI Optimized Schedule</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={exportToICS} className="flex-1 md:flex-none p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2">
                    <Download size={18} /> <span className="md:hidden text-xs font-bold uppercase tracking-widest">Export</span>
                  </button>
                  <button onClick={generateSchedule} className="flex-[2] md:flex-none bg-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg glow-primary hover:scale-105 active:scale-95 transition-all">
                    <Sparkles size={18} /> Re-Optimize
                  </button>
                </div>
              </div>

              {schedule.length > 0 ? (
                <div className="space-y-6 relative">
                  <div className="absolute left-[47px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/50 via-white/5 to-transparent" />
                  {schedule.map((slot, idx) => (
                    <div key={idx} className="flex gap-8 group">
                      <div className="w-24 pt-6 text-right">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{slot.startTime}</span>
                      </div>
                      <div className="relative pb-4 flex-1">
                        <div className={`absolute -left-[45px] top-6 size-4 rounded-full border-4 bg-bg-dark z-10 transition-all ${slot.status === 'completed' ? 'border-accent-done scale-75' : slot.isOverdue ? 'border-accent-orange animate-pulse' : 'border-white/20 group-hover:border-primary'}`} />
                        <div className={`glass-card p-6 flex items-center justify-between group-hover:translate-x-2 transition-all border-white/5 ${slot.status === 'completed' ? 'opacity-40 grayscale' : ''}`}>
                          <div className="flex items-center gap-6">
                            <div className={`size-12 rounded-2xl flex items-center justify-center ${slot.importance > 7 ? 'bg-accent-orange/10 text-accent-orange' : 'bg-primary/10 text-primary'}`}>
                              {slot.is_habit ? <Flame size={24} /> : <Zap size={24} />}
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-white">{slot.title}</h4>
                              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                                {slot.duration}m • {slot.startTime} - {slot.endTime}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); if (confirm('Delete?')) deleteTask(slot.id); }}
                              className="size-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-accent-orange/20 text-slate-500 hover:text-accent-orange transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                            <button 
                              onClick={() => toggleDone(slot.id)} 
                              className={`size-10 rounded-xl flex items-center justify-center transition-all ${slot.status === 'completed' ? 'bg-accent-done text-black' : 'bg-white/5 hover:bg-primary text-slate-500 hover:text-white'}`}
                            >
                              <CheckCircle2 size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-32 text-center space-y-8 glass-card border-dashed border-white/10">
                  <div className="size-24 bg-white/5 rounded-[40px] flex items-center justify-center mx-auto text-slate-600">
                    <Calendar size={48} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Your roadmap is empty</h3>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">Aura's AI can build a perfectly optimized schedule based on your tasks and habits.</p>
                  </div>
                  <button onClick={generateSchedule} className="bg-white text-black px-10 py-4 rounded-2xl font-bold hover:scale-105 transition-all shadow-xl">Generate Schedule</button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'habits' && (
            <motion.div 
              key="habits"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-4xl font-black tracking-tighter">Habit Forge</h2>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Consistency is Mastery</p>
                </div>
                <button 
                  onClick={() => { setActiveTab('tasks'); setIsHabit(true); }}
                  className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg glow-primary hover:scale-105 transition-all"
                >
                  <Plus size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {analytics?.habits.map(habit => (
                  <div key={habit.id} className="glass-card p-8 flex flex-col items-center text-center space-y-6 group relative border-white/5 hover:border-primary/30 transition-all">
                    <button 
                      onClick={(e) => { e.stopPropagation(); if (confirm('Delete this habit?')) deleteTask(habit.id); }}
                      className="absolute top-4 right-4 p-2 text-slate-600 hover:text-accent-orange opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="relative">
                      <div className="size-24 bg-accent-orange/10 rounded-[40px] flex items-center justify-center text-accent-orange streak-flame">
                        <Flame size={48} fill="currentColor" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 size-10 bg-surface-dark border-2 border-accent-orange rounded-full flex items-center justify-center text-xs font-black text-accent-orange">
                        {habit.streak}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{habit.title}</h3>
                      <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] mt-1">Current Streak</p>
                    </div>
                    <div className="w-full space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <span>Progress</span>
                        <span>{Math.floor((habit.streak % 7) * 14.2)}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(habit.streak % 7) * 14.2}%` }}
                          className="h-full bg-gradient-to-r from-accent-orange to-primary"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleDone(habit.id)}
                      className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${habit.status === 'completed' ? 'bg-accent-done/20 text-accent-done border border-accent-done/30' : 'bg-white text-black hover:scale-[1.02] shadow-xl'}`}
                    >
                      {habit.status === 'completed' ? <><CheckCircle2 size={18} /> Forged Today</> : 'Mark Complete'}
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => { setActiveTab('tasks'); setIsHabit(true); }}
                  className="glass-card p-8 border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 hover:text-white hover:border-white/20 transition-all space-y-4 bg-white/[0.02]"
                >
                  <div className="size-16 rounded-3xl border-2 border-current flex items-center justify-center">
                    <Plus size={32} />
                  </div>
                  <span className="font-bold uppercase tracking-widest text-xs">Forge New Habit</span>
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black tracking-tighter">Performance</h2>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Your Growth Metrics</p>
                </div>
                <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                  <BarChart3 size={24} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Productivity', value: `${analytics?.productivityScore}%`, color: 'text-primary', icon: Zap },
                  { label: 'Completed', value: analytics?.totalCompleted, color: 'text-accent-blue', icon: CheckCircle2 },
                  { label: 'Focus Time', value: `${analytics?.focusTimeMinutes}m`, color: 'text-accent-orange', icon: Clock },
                ].map(stat => (
                  <div key={stat.label} className="glass-card p-8 text-center space-y-4 border-white/5">
                    <div className={`size-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center ${stat.color}`}>
                      <stat.icon size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                      <p className={`text-4xl font-black ${stat.color}`}>{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="glass-card p-8 space-y-8 border-white/5">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Activity Overview</h3>
                    <select className="bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest px-3 py-1 text-slate-400">
                      <option>Last 7 Days</option>
                      <option>Last 30 Days</option>
                    </select>
                  </div>
                  <div className="h-64 flex items-end justify-between gap-3">
                    {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                        <div className="relative w-full flex flex-col items-center">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            className={`w-full rounded-t-xl transition-all duration-500 ${i === 6 ? 'bg-primary shadow-[0_0_20px_rgba(123,0,255,0.3)]' : 'bg-white/5 group-hover:bg-white/10'}`}
                          />
                          <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-all text-[10px] font-bold text-white bg-primary px-2 py-1 rounded-md">
                            {h}%
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="glass-card p-8 space-y-8 border-white/5 bg-gradient-to-br from-surface-dark to-bg-dark relative overflow-hidden">
                  <div className="absolute -top-20 -right-20 size-64 bg-primary/5 blur-[100px] rounded-full"></div>
                  <div className="flex items-center gap-3 relative z-10">
                    <Brain className="text-primary" size={24} />
                    <h3 className="text-xl font-bold">AI Insights</h3>
                  </div>
                  <div className="space-y-6 relative z-10">
                    {aiSuggestion ? (
                      <div className="space-y-4">
                        <div className="p-6 bg-primary/10 border border-primary/20 rounded-3xl text-slate-300 text-sm leading-relaxed italic">
                          "{aiSuggestion}"
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Peak Focus</p>
                            <p className="text-sm font-bold">10:00 AM</p>
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Best Habit</p>
                            <p className="text-sm font-bold">Morning Meds</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 space-y-4">
                        <Sparkles size={32} className="mx-auto text-slate-700 animate-pulse" />
                        <p className="text-slate-500 text-sm font-medium">Generate a schedule to unlock deep performance analysis.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pointer-events-none">
        <div className="max-w-lg mx-auto glass-card p-2 flex items-center justify-between pointer-events-auto shadow-2xl border-white/5">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'tasks', icon: LayoutDashboard, label: 'Vault' },
            { id: 'schedule', icon: Calendar, label: 'Roadmap' },
            { id: 'habits', icon: Flame, label: 'Forge' },
            { id: 'analytics', icon: BarChart3, label: 'Stats' }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeTab === item.id ? 'bg-primary text-white shadow-lg glow-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <item.icon size={20} />
              <span className="text-[8px] font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Floating AI Assistant */}
      <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[60]">
        <AnimatePresence>
          {showAiPanel && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-20 right-0 w-80 glass-card p-6 shadow-2xl border-accent-ai/20"
            >
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold flex items-center gap-2 text-accent-ai"><Brain size={18} /> Aura AI</h4>
                <button onClick={() => setShowAiPanel(false)} className="text-text-muted hover:text-white"><X size={18} /></button>
              </div>
              <div className="space-y-4 text-sm">
                <p className="text-text-secondary">I've analyzed your patterns. You're most productive between 10 AM and 1 PM.</p>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="font-bold text-xs uppercase tracking-widest text-text-muted mb-1">Recommendation</p>
                  <p>Move "Project Work" to 10:30 AM for peak focus.</p>
                </div>
                <button onClick={generateSchedule} className="w-full py-3 bg-accent-ai text-white rounded-xl font-bold text-xs uppercase tracking-widest">Apply Optimization</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button 
          onClick={() => setShowAiPanel(!showAiPanel)}
          className="w-16 h-16 rounded-[24px] bg-accent-ai text-white flex items-center justify-center shadow-xl shadow-accent-ai/30 hover:scale-110 active:scale-90 transition-all"
        >
          <Sparkles size={28} />
        </button>
      </div>
    </div>
  );
}
