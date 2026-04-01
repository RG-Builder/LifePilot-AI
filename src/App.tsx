import React, { useState, useEffect, Component } from 'react';
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
  RotateCcw,
  Settings,
  LogOut,
  CreditCard,
  Shield,
  FileText,
  Edit3
} from 'lucide-react';
import { PrivacyPolicy, TermsOfService } from './components/Legal';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { auth, googleProvider, db, logEvent } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut
} from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';

interface Task {
  id: number;
  title: string;
  importance: number;
  duration: number;
  deadline?: string;
  is_habit: boolean;
  streak: number;
  status: 'pending' | 'completed';
  category: string;
  startTime?: string;
  endTime?: string;
  isOverdue?: boolean;
}

interface User {
  id: number;
  email: string;
  plan: 'free' | 'premium';
}

interface Analytics {
  productivityScore: number;
  totalCompleted: number;
  focusTimeMinutes: number;
  habits: { id: number; title: string; streak: number; status: string }[];
}

interface Habit {
  id: number;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly';
  goal_count: number;
  current_count: number;
  streak: number;
  last_completed_at?: string;
}

interface HabitStat {
  id: number;
  title: string;
  history: { date: string; count: number }[];
}

const SUPPORT_EMAIL = "lifepilotai.app@gmail.com";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  state: { hasError: boolean, error: Error | null } = { hasError: false, error: null };
  props: { children: React.ReactNode };

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong. Please try refreshing the page.";
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.error.includes('insufficient permissions')) {
            displayMessage = "You don't have permission to perform this action. Please contact support if you believe this is an error.";
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6 text-center">
          <div className="glass-card p-10 max-w-md space-y-6 border-accent-urgent/20">
            <div className="size-20 bg-accent-urgent/10 rounded-full flex items-center justify-center text-accent-urgent mx-auto">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold">Unexpected Error</h2>
            <p className="text-slate-400">{displayMessage}</p>
            <div className="pt-4 space-y-4">
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg glow-primary"
              >
                Refresh Page
              </button>
              <p className="text-xs text-slate-500">
                If the problem persists, contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary">{SUPPORT_EMAIL}</a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('lifepilot_token'));
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPricing, setShowPricing] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitStats, setHabitStats] = useState<HabitStat[]>([]);
  const [schedule, setSchedule] = useState<Task[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const getFreshToken = async () => {
    if (!auth.currentUser) return null;
    try {
      const newToken = await auth.currentUser.getIdToken(true);
      setToken(newToken);
      localStorage.setItem('lifepilot_token', newToken);
      return newToken;
    } catch (err) {
      console.error("Failed to refresh token:", err);
      return null;
    }
  };

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    let currentToken = token;
    if (!currentToken) {
      currentToken = await getFreshToken();
    }
    if (!currentToken) throw new Error("No authentication token available");

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${currentToken}`
    };

    let res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      // Token might be expired, try once more with a fresh one
      currentToken = await getFreshToken();
      if (currentToken) {
        const retryHeaders = {
          ...options.headers,
          'Authorization': `Bearer ${currentToken}`
        };
        res = await fetch(url, { ...options, headers: retryHeaders });
      }
    }

    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.message || `Request failed with status ${res.status}`);
      } else {
        const text = await res.text();
        throw new Error(`Request failed with status ${res.status}: ${text.substring(0, 100)}`);
      }
    }

    return res;
  };

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [title, setTitle] = useState('');
  const [importance, setImportance] = useState(5);
  const [duration, setDuration] = useState(30);
  const [deadline, setDeadline] = useState('');
  const [isHabit, setIsHabit] = useState(false);
  const [category, setCategory] = useState('general');
  
  // Habit Form State
  const [habitTitle, setHabitTitle] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [habitFreq, setHabitFreq] = useState<'daily' | 'weekly'>('daily');
  const [habitGoal, setHabitGoal] = useState(1);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<{ plan: string, dailyRequests: number, monthlyTokens: number, limits: { requests: number, tokens: number } } | null>(null);
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('lifepilot_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('lifepilot_device_id', id);
    }
    return id;
  });

  const fetchUsage = async () => {
    try {
      const res = await apiFetch('/api/usage/status');
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      } else {
        const errData = await res.json();
        console.error("Usage fetch failed:", errData.error);
      }
    } catch (err) {
      console.error("Failed to fetch usage status:", err);
    }
  };

  useEffect(() => {
    if (token) fetchUsage();
  }, [token]);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [motivationQuote, setMotivationQuote] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'schedule' | 'habits' | 'analytics' | 'settings'>('home');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [dailyGoal, setDailyGoal] = useState(() => localStorage.getItem('lifepilot_daily_goal') || '');
  const [error, setError] = useState<string | null>(null);
  const [focusTimer, setFocusTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('lifepilot_onboarded'));
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [lastAiCall, setLastAiCall] = useState(0);
  const [showAiPanel, setShowAiPanel] = useState(false);

  useEffect(() => {
    logEvent('tab_view', { tab_id: activeTab });
  }, [activeTab]);

  const isConfigPlaceholder = firebaseConfig.appId === 'PASTE_YOUR_WEB_APP_ID_HERE';

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

  const refreshUser = async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else if (res.status === 401) {
        // Token is invalid or expired, or project mismatch
        console.warn("Session invalid, signing out...");
        logout();
      }
    } catch (e) {
      console.error("Failed to refresh user:", e);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser();
      fetchTasks();
      fetchAnalytics();
      fetchHabits();
      fetchHabitStats();
    } else {
      setShowAuth(true);
    }
    
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
            new Notification("LifePilot AI: Task Starting!", { 
              body: `Time to start: ${task.title}`,
              icon: "https://picsum.photos/seed/lifepilot/128/128"
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
              new Notification("LifePilot AI: Deadline Alert!", { 
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
    localStorage.setItem('lifepilot_onboarded', 'true');
    setShowOnboarding(false);
    if (tasks.length > 0) generateSchedule();
  };

  useEffect(() => {
    async function testConnection() {
      const path = 'test/connection';
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.code === 'permission-denied' || (error.message && error.message.includes('insufficient permissions'))) {
          handleFirestoreError(error, OperationType.GET, path);
        }
        console.error("Firestore Connection Test Error:", error);
        if (error.message && error.message.includes('the client is offline')) {
          setError("Firestore is offline. Please check your Firebase configuration and ensure Firestore is enabled in the console.");
        } else {
          setError(`Firebase Configuration Error: ${error.message}`);
        }
      }
    }
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        localStorage.setItem('lifepilot_token', idToken);
        setToken(idToken);
        
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            setShowAuth(false);
          } else if (res.status === 401) {
            // Token might be invalid/expired even if just fetched (rare but possible)
            const freshToken = await firebaseUser.getIdToken(true);
            setToken(freshToken);
          }
        } catch (err) {
          console.error("Auth sync error:", err);
        }
      } else {
        setToken(null);
        setUser(null);
        setShowAuth(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
      // onAuthStateChanged will handle the rest
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      setAuthMode('login');
      setAuthMessage("Signup successful! You are now logged in.");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message || "Failed to initialize Google login");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('lifepilot_token');
      localStorage.clear();
      sessionStorage.clear();
      setToken(null);
      setUser(null);
      setShowAuth(true);
      setTasks([]);
      setSchedule([]);
      setAnalytics(null);
      setHabits([]);
      setHabitStats([]);
    } catch (error: any) {
      setError("Logout failed");
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await apiFetch('/api/tasks');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        console.error("Tasks fetch returned non-array:", data);
        setTasks([]);
        if (data.error) setError(data.error);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      setTasks([]);
    }
  };

  const fetchHabits = async () => {
    try {
      const res = await apiFetch('/api/habits');
      const data = await res.json();
      if (Array.isArray(data)) {
        setHabits(data);
      } else {
        console.error("Habits fetch returned non-array:", data);
        setHabits([]);
      }
    } catch (err) {
      console.error("Failed to fetch habits:", err);
    }
  };

  const fetchHabitStats = async () => {
    try {
      const res = await apiFetch('/api/habits/stats');
      const data = await res.json();
      if (Array.isArray(data)) {
        setHabitStats(data);
      } else {
        console.error("Habit stats fetch returned non-array:", data);
        setHabitStats([]);
      }
    } catch (err) {
      console.error("Failed to fetch habit stats:", err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await apiFetch('/api/analytics');
      const data = await res.json();
      if (data && !data.error) {
        setAnalytics(data);
      } else {
        console.error("Analytics fetch error:", data?.error);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  };

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || duration <= 0 || !token) return;
    
    setLoading(true);
    setError(null);
    try {
      const method = editingTask ? 'PUT' : 'POST';
      const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
      
      const res = await apiFetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, importance, duration, is_habit: isHabit, deadline, category }),
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
    const res = await apiFetch(`/api/tasks/${id}/toggle`, { 
      method: 'POST'
    });
    const result = await res.json();
    
    if (result.status === 'completed') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#10B981', '#F59E0B']
      });
      
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("LifePilot AI: Task Completed!", { 
          body: "Excellent work! You're staying on track with LifePilot AI.",
          icon: "/favicon.ico"
        });
      }
    }

    fetchTasks();
    fetchAnalytics();
    if (schedule.length > 0) generateSchedule();
  };

  const deleteTask = async (id: number) => {
    console.log("Deleting task with id:", id);
    try {
      const res = await apiFetch(`/api/tasks/${id}`, { 
        method: 'DELETE'
      });
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
    if (!token) {
      setShowAuth(true);
      return;
    }
    
    setLoading(true);
    setAiSuggestion(null);
    setError(null);

    try {
      const habitList = habits.map(h => `${h.title} (${h.frequency}, goal: ${h.goal_count})`).join(', ');
      const taskList = tasks.map(t => t.title).join(', ');
      const prompt = `Generate a daily schedule for a user with these tasks: ${taskList}. Also incorporate these habits: ${habitList}. Focus on productivity and balance. Return a concise, motivating summary.`;
      
      // Use backend AI endpoint for security (keeps keys hidden)
      const res = await apiFetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          systemInstruction: "You are LifePilot AI, a professional productivity assistant. Your goal is to help users optimize their daily schedules for maximum focus and balance. Be concise, motivating, and professional."
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate schedule");
      }

      setAiSuggestion(data.text);
      
      // Also refresh the schedule from the backend
      const scheduleRes = await apiFetch('/api/schedule');
      const scheduleData = await scheduleRes.json();
      if (Array.isArray(scheduleData)) {
        setSchedule(scheduleData);
      } else {
        console.error("Schedule fetch returned non-array:", scheduleData);
        setSchedule([]);
      }
      setActiveTab('schedule');

    } catch (error: any) {
      console.error("AI Generation Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const habitData = {
        title: habitTitle,
        description: habitDesc,
        frequency: habitFreq,
        goal_count: habitGoal
      };

      if (editingHabit) {
        await apiFetch(`/api/habits/${editingHabit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(habitData)
        });
      } else {
        await apiFetch('/api/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(habitData)
        });
      }

      setHabitTitle('');
      setHabitDesc('');
      setHabitFreq('daily');
      setHabitGoal(1);
      setShowHabitModal(false);
      setEditingHabit(null);
      fetchHabits();
      fetchHabitStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const completeHabit = async (id: number) => {
    try {
      const res = await apiFetch(`/api/habits/${id}/complete`, {
        method: 'POST'
      });
      if (res.ok) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
        fetchHabits();
        fetchHabitStats();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteHabit = async (id: number) => {
    if (!confirm("Are you sure you want to delete this habit?")) return;
    try {
      await apiFetch(`/api/habits/${id}`, {
        method: 'DELETE'
      });
      fetchHabits();
      fetchHabitStats();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const editHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setHabitTitle(habit.title);
    setHabitDesc(habit.description);
    setHabitFreq(habit.frequency);
    setHabitGoal(habit.goal_count);
    setShowHabitModal(true);
  };

  const getAiInsights = async (currentSchedule: Task[]) => {
    if (!token) return;
    
    try {
      const prompt = `Analyze this daily schedule and provide 3 brief, actionable productivity tips AND a short powerful motivational quote (max 15 words). 
        Daily Goal: ${dailyGoal}. 
        Schedule: ${JSON.stringify(currentSchedule)}
        
        Return the response in JSON format with keys: "tips" (string) and "quote" (string).`;
      
      const res = await apiFetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          systemInstruction: "You are LifePilot AI, a professional productivity assistant. Your goal is to help users optimize their daily schedules for maximum focus and balance. Be concise, motivating, and professional."
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to get AI insights");
      }

      try {
        const parsed = JSON.parse(data.text);
        setAiSuggestion(parsed.tips);
        setMotivationQuote(parsed.quote);
      } catch (e) {
        setAiSuggestion(data.text);
      }
      
      fetchUsage(); // Refresh usage status
    } catch (error: any) {
      console.error("AI Insights Error:", error);
      setAiSuggestion(error.message || "AI Insights temporarily unavailable.");
    }
  };

  const exportToICS = () => {
    if (schedule.length === 0) return;

    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//LifePilot AI//EN\n";
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
    link.setAttribute('download', 'lifepilot_schedule.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpgrade = async (razorpayResponse: any) => {
    try {
      const res = await apiFetch('/api/payments/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(razorpayResponse)
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUser();
        setShowPricing(false);
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 }
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const initiatePayment = async (amount: number) => {
    try {
      const res = await apiFetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });
      const order = await res.json();
      
      const options = {
        key: process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummy',
        amount: order.amount,
        currency: order.currency,
        name: "LifePilot AI",
        description: "Premium Subscription",
        order_id: order.id,
        handler: handleUpgrade,
        prefill: {
          email: user?.email
        },
        theme: {
          color: "#4F46E5"
        }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      setError("Payment failed to initialize");
    }
  };

  const completionRate = analytics?.productivityScore || 0;

  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'pending') return task.status === 'pending';
    if (taskFilter === 'completed') return task.status === 'completed';
    if (taskFilter === 'overdue') return task.deadline && new Date(task.deadline) < new Date() && task.status === 'pending';
    return true;
  });

  const clearSession = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  if (error && (error.includes('Firebase Configuration Error') || error.includes('Firestore is offline') || error.includes('client is offline'))) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border border-red-500/30 shadow-2xl">
          <div className="flex items-center gap-3 text-red-400 mb-6">
            <AlertCircle className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Connection Issue</h1>
          </div>
          
          <div className="space-y-4 text-slate-300 mb-8">
            <p className="text-sm leading-relaxed">
              We're having trouble reaching your Firestore database. If you just set up Firebase, a <strong>full page refresh</strong> may be required.
            </p>
            <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-red-300 break-all">
              {error}
            </div>
            
            <div className="pt-4 space-y-3">
              <p className="text-sm font-semibold text-white">Troubleshooting Steps:</p>
              <ul className="list-disc list-inside text-xs space-y-2 opacity-80">
                <li><strong>Refresh the page</strong> (Ctrl+R or Cmd+R).</li>
                <li>Ensure the database is created in the <a href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data`} target="_blank" className="text-indigo-400 underline">Firestore Console</a>.</li>
                <li>Check if your internet connection is stable.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
            >
              Refresh & Retry
            </button>
            <button 
              onClick={clearSession}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
            >
              Clear Session & Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-primary text-text-primary font-sans selection:bg-accent-focus/30">
      {/* Config Warning */}
      {isConfigPlaceholder && (
        <div className="bg-accent-urgent text-white text-center py-2 text-xs font-bold sticky top-0 z-[120]">
          Action Required: Please update the appId in firebase-applet-config.json
        </div>
      )}

      {/* Auth Overlay */}
      <AnimatePresence>
        {showAuth && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-bg-primary flex items-center justify-center p-6"
          >
            <div className="max-w-md w-full glass-card p-10 text-center space-y-8">
              <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto text-primary">
                <Sparkles size={40} />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                <p className="text-text-secondary">Join LifePilot AI to automate your productivity.</p>
              </div>

              <form onSubmit={authMode === 'login' ? login : signup} className="space-y-4">
                <input 
                  type="email" 
                  placeholder="Email" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-primary transition-all"
                  required
                />
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-primary transition-all"
                  required
                />
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg glow-primary hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Sign Up')}
                </button>
              </form>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-bg-primary px-2 text-slate-500">Or continue with</span>
                </div>
              </div>

              <button 
                onClick={handleGoogleLogin}
                className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="size-5" />
                Google
              </button>

              <div className="pt-4">
                <button 
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setError(null);
                    setAuthMessage(null);
                  }}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                </button>
              </div>
              
              {error && <p className="text-accent-urgent text-sm font-bold">{error}</p>}
              {authMessage && <p className="text-primary text-sm font-bold">{authMessage}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Habit Modal */}
      <AnimatePresence>
        {showHabitModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-bg-primary/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card p-10 max-w-lg w-full space-y-8 border-white/10"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-black tracking-tighter">{editingHabit ? 'Refine Habit' : 'Forge Habit'}</h3>
                <button onClick={() => setShowHabitModal(false)} className="text-slate-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={saveHabit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Habit Title</label>
                  <input 
                    required
                    value={habitTitle}
                    onChange={(e) => setHabitTitle(e.target.value)}
                    placeholder="e.g., Morning Meditation"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:border-primary transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</label>
                  <textarea 
                    value={habitDesc}
                    onChange={(e) => setHabitDesc(e.target.value)}
                    placeholder="Why is this habit important?"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:border-primary transition-all outline-none h-24 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Frequency</label>
                    <select 
                      value={habitFreq}
                      onChange={(e) => setHabitFreq(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:border-primary transition-all outline-none appearance-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Goal Count</label>
                    <input 
                      type="number"
                      min="1"
                      required
                      value={habitGoal}
                      onChange={(e) => setHabitGoal(parseInt(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:border-primary transition-all outline-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-lg glow-primary hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Forging...' : editingHabit ? 'Update Habit' : 'Forge Habit'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pricing Overlay */}
      <AnimatePresence>
        {showPricing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[105] bg-bg-primary/95 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-card p-10 space-y-6 border-white/5">
                <h3 className="text-2xl font-bold">Free Plan</h3>
                <p className="text-slate-400">Perfect for getting started.</p>
                <div className="text-4xl font-black">₹0 <span className="text-sm font-normal text-slate-500">/ forever</span></div>
                <ul className="space-y-4 pt-6">
                  {['Basic Task Management', 'Basic Schedule Generator', 'Limited Habit Tracking (3)', 'Standard Reminders'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                      <CheckCircle2 size={18} className="text-slate-500" /> {f}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => setShowPricing(false)}
                  className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-slate-400"
                >
                  Current Plan
                </button>
              </div>

              <div className="glass-card p-10 space-y-6 border-primary/30 relative overflow-hidden bg-gradient-to-br from-primary/10 to-transparent">
                <div className="absolute top-4 right-4 bg-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">Best Value</div>
                <h3 className="text-2xl font-bold">Premium Plan</h3>
                <p className="text-slate-400">Unlock your full potential.</p>
                <div className="text-4xl font-black">₹499 <span className="text-sm font-normal text-slate-500">/ month</span></div>
                <ul className="space-y-4 pt-6">
                  {['AI Smart Scheduling', 'Advanced Productivity Analytics', 'Unlimited Habits & Tasks', 'AI Productivity Insights', 'Student Productivity Mode'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white">
                      <CheckCircle2 size={18} className="text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => initiatePayment(499)}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg glow-primary hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Upgrade to Premium
                </button>
                <button 
                  onClick={() => setShowPricing(false)}
                  className="w-full text-center text-xs text-slate-500 pt-2"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    <h2 className="text-3xl font-bold">Welcome to LifePilot AI</h2>
                    <p className="text-text-secondary">What is your primary goal for using LifePilot AI?</p>
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
                    <p className="text-text-secondary">LifePilot AI is ready to optimize your life. Let's build your first schedule.</p>
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
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">LifePilot AI</h1>
          {user?.subscription_plan === 'premium' && (
            <span className="bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-primary/30">Premium</span>
          )}
        </div>
        <div className="flex gap-4">
          <div className="hidden md:flex items-center gap-6 mr-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Streak: {analytics?.habits.reduce((acc, h) => Math.max(acc, h.streak), 0) || 0} Days</span>
            <div className="h-4 w-px bg-white/10"></div>
          </div>
          {user?.subscription_plan === 'trial' && (
            <button 
              onClick={() => setShowPricing(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
            >
              Upgrade
            </button>
          )}
          <button 
            onClick={logout}
            className="size-10 flex items-center justify-center rounded-xl bg-surface-dark border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Logout"
          >
            <X size={20} />
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
                    <h2 className="text-3xl font-bold">Hello, {process.env.USER_EMAIL?.split('@')[0] || 'LifePilot'}</h2>
                    <p className="text-slate-400 text-sm">{motivationQuote || "Your potential is limitless. Let's unlock it today."}</p>
                  </div>
                  {usage && (
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${usage.plan === 'trial' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-primary/10 text-primary border-primary/30'}`}>
                          {usage.plan} Plan
                        </span>
                      </div>
                      <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={`h-full transition-all duration-500 ${usage.dailyRequests >= usage.limits.requests ? 'bg-accent-urgent' : 'bg-primary'}`}
                          style={{ width: `${(usage.dailyRequests / usage.limits.requests) * 100}%` }}
                        />
                      </div>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                        {usage.dailyRequests} / {usage.limits.requests} Requests Today
                      </p>
                    </div>
                  )}
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
                            onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this task?')) deleteTask(task.id); }}
                            className="text-slate-600 hover:text-accent-orange transition-colors"
                            title="Delete Task"
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
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                      {['general', 'study', 'exam', 'work', 'personal'].map(cat => (
                        <button 
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap ${category === cat ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-slate-500'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
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
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => { if (window.confirm('Are you sure you want to delete this task?')) { deleteTask(editingTask.id); resetForm(); } }}
                        className="flex-1 py-3 bg-accent-urgent/10 text-accent-urgent border border-accent-urgent/20 rounded-xl font-bold hover:bg-accent-urgent hover:text-white transition-all"
                      >
                        Delete Task
                      </button>
                      <button 
                        type="button"
                        onClick={resetForm}
                        className="flex-1 py-3 bg-white/5 text-slate-500 rounded-xl font-bold hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
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
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20 px-2 rounded-full">{task.category}</span>
                                {task.deadline && <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Calendar size={12} /> {new Date(task.deadline).toLocaleDateString()}</span>}
                                {task.isHabit && <Flame size={12} className="text-accent-orange" />}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 transition-all">
                            <button 
                              onClick={(e) => { e.stopPropagation(); startEdit(task); }}
                              className="p-2 text-slate-500 hover:text-white transition-all"
                              title="Edit Task"
                            >
                              <Plus size={18} className="rotate-45" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this task?')) deleteTask(task.id); }}
                              className="p-2 text-slate-500 hover:text-accent-orange transition-all"
                              title="Delete Task"
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
                              onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this task?')) deleteTask(slot.id); }}
                              className="size-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-accent-orange/20 text-slate-500 hover:text-accent-orange transition-all"
                              title="Delete Task"
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
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">LifePilot AI's AI can build a perfectly optimized schedule based on your tasks and habits.</p>
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
                  onClick={() => { setShowHabitModal(true); setEditingHabit(null); }}
                  className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg glow-primary hover:scale-105 transition-all"
                >
                  <Plus size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {habits.map(habit => (
                  <div key={habit.id} className="glass-card p-8 flex flex-col items-center text-center space-y-6 group relative border-white/5 hover:border-primary/30 transition-all">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => editHabit(habit)}
                        className="p-2 text-slate-600 hover:text-primary"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteHabit(habit.id)}
                        className="p-2 text-slate-600 hover:text-accent-orange"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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
                      <p className="text-slate-500 text-xs mt-1">{habit.description}</p>
                      <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] mt-2">{habit.frequency} Goal: {habit.goal_count}</p>
                    </div>
                    <div className="w-full space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <span>Progress</span>
                        <span>{Math.min(100, Math.floor((habit.current_count / habit.goal_count) * 100))}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (habit.current_count / habit.goal_count) * 100)}%` }}
                          className="h-full bg-gradient-to-r from-accent-orange to-primary"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => completeHabit(habit.id)}
                      disabled={habit.current_count >= habit.goal_count}
                      className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${habit.current_count >= habit.goal_count ? 'bg-accent-done/20 text-accent-done border border-accent-done/30' : 'bg-white text-black hover:scale-[1.02] shadow-xl'}`}
                    >
                      {habit.current_count >= habit.goal_count ? <><CheckCircle2 size={18} /> Goal Met</> : 'Mark Progress'}
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => { setShowHabitModal(true); setEditingHabit(null); }}
                  className="glass-card p-8 border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 hover:text-white hover:border-white/20 transition-all space-y-4 bg-white/[0.02]"
                >
                  <div className="size-16 rounded-3xl border-2 border-current flex items-center justify-center">
                    <Plus size={32} />
                  </div>
                  <span className="font-bold uppercase tracking-widest text-xs">Forge New Habit</span>
                </button>
              </div>

              {habitStats.length > 0 && (
                <div className="glass-card p-10 space-y-8 border-white/5">
                  <h3 className="text-2xl font-bold">Habit History (30 Days)</h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={habitStats[0]?.history || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={10} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        {habitStats.map((stat, idx) => (
                          <Line 
                            key={stat.id} 
                            type="monotone" 
                            dataKey="count" 
                            data={stat.history} 
                            name={stat.title}
                            stroke={idx === 0 ? '#4285F4' : idx === 1 ? '#F27D26' : '#34A853'} 
                            strokeWidth={3}
                            dot={{ r: 4, fill: idx === 0 ? '#4285F4' : idx === 1 ? '#F27D26' : '#34A853' }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 pb-20"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">Performance Core</h2>
                <p className="text-xs text-slate-500">Real-time productivity telemetry</p>
              </div>

              {/* Top Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-6 border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Flow State</p>
                  <p className="text-3xl font-black text-white">{analytics?.productivityScore || 0}%</p>
                  <div className="mt-2 w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-1000" 
                      style={{ width: `${analytics?.productivityScore || 0}%` }}
                    />
                  </div>
                </div>
                <div className="glass-card p-6 border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Focus Time</p>
                  <p className="text-3xl font-black text-white">{analytics?.focusTimeMinutes || 0}m</p>
                  <p className="text-[10px] text-slate-500 mt-1">Total deep work</p>
                </div>
              </div>

              {/* Main Chart */}
              <div className="glass-card p-6 border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">Activity Pulse</h3>
                  <div className="flex gap-2">
                    <span className="size-2 rounded-full bg-primary"></span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase">Last 7 Days</span>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={analytics?.advanced?.completionRateByDay || [
                        { day: 'Mon', count: 4 },
                        { day: 'Tue', count: 7 },
                        { day: 'Wed', count: 5 },
                        { day: 'Thu', count: 9 },
                        { day: 'Fri', count: 12 },
                        { day: 'Sat', count: 8 },
                        { day: 'Sun', count: 6 },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#6366f1" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorCount)" 
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Habit Streaks */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Habit Resilience</h3>
                <div className="grid grid-cols-1 gap-3">
                  {analytics?.habits?.map(habit => (
                    <div key={habit.id} className="glass-card p-4 flex items-center justify-between border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Zap size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{habit.title}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{habit.streak} Day Streak</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {[...Array(7)].map((_, i) => (
                          <div 
                            key={i} 
                            className={`size-2 rounded-full ${i < (habit.streak % 7) ? 'bg-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-white/5'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!analytics?.habits || analytics.habits.length === 0) && (
                    <div className="p-8 text-center glass-card border-dashed border-white/10 text-slate-500">
                      <p className="text-[10px] font-bold uppercase tracking-widest">No habits forged yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Productivity Score */}
              <div className="glass-card p-8 bg-gradient-to-br from-primary/20 to-transparent border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Brain size={120} />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-primary" size={20} />
                    <h3 className="text-lg font-bold">AI Performance Audit</h3>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Based on your last 7 days of telemetry, your focus is 14% higher than the average user in your cohort. 
                    Your peak performance window is <strong>10:15 AM — 1:45 PM</strong>.
                  </p>
                  <div className="pt-2">
                    <button className="px-6 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg glow-primary">
                      Download Full Report
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black tracking-tighter">Settings</h2>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Manage Your Experience</p>
                </div>
                <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                  <Settings size={24} />
                </div>
              </div>

              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Account & Subscription</h3>
                <div className="glass-card divide-y divide-white/5 overflow-hidden border-white/5">
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <p className="font-bold">Subscription Plan</p>
                        <p className="text-xs text-slate-500 capitalize">{usage?.plan || 'Free'} Plan</p>
                      </div>
                    </div>
                    {usage?.plan === 'trial' || usage?.plan === 'free' ? (
                      <button 
                        onClick={() => setShowPricing(true)}
                        className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg glow-primary"
                      >
                        Upgrade
                      </button>
                    ) : (
                      <span className="text-[10px] font-black text-accent-done uppercase tracking-widest">Active</span>
                    )}
                  </div>
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                        <Shield size={20} />
                      </div>
                      <div>
                        <p className="font-bold">Account Email</p>
                        <p className="text-xs text-slate-500">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Legal & Support</h3>
                <div className="glass-card divide-y divide-white/5 overflow-hidden border-white/5">
                  <button 
                    onClick={() => setShowTerms(true)}
                    className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                        <FileText size={20} />
                      </div>
                      <p className="font-bold">Terms of Service</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-600" />
                  </button>
                  <button 
                    onClick={() => setShowPrivacy(true)}
                    className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                        <Shield size={20} />
                      </div>
                      <p className="font-bold">Privacy Policy</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-600" />
                  </button>
                </div>
              </section>

              <button 
                onClick={logout}
                className="w-full p-6 glass-card border-accent-urgent/20 flex items-center justify-center gap-3 text-accent-urgent font-bold hover:bg-accent-urgent/5 transition-colors"
              >
                <LogOut size={20} /> Sign Out
              </button>

              <div className="text-center space-y-2">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">LifePilot AI v1.0.0</p>
                <p className="text-[8px] text-slate-800">Designed for the Play Store</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Legal Overlays */}
      <AnimatePresence>
        {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
        {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pointer-events-none">
        <div className="max-w-lg mx-auto glass-card p-2 flex items-center justify-between pointer-events-auto shadow-2xl border-white/5">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'tasks', icon: LayoutDashboard, label: 'Vault' },
            { id: 'schedule', icon: Calendar, label: 'Roadmap' },
            { id: 'analytics', icon: BarChart3, label: 'Stats' },
            { id: 'settings', icon: Settings, label: 'Menu' }
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
                <h4 className="font-bold flex items-center gap-2 text-accent-ai"><Brain size={18} /> LifePilot AI</h4>
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
    </ErrorBoundary>
  );
}
