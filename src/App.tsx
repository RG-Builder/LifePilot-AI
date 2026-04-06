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
  Edit3,
  Tag,
  Check,
  Target,
  Moon,
  Mic,
  Heart,
  Briefcase,
  LayoutGrid,
  Activity,
  Cpu,
  Layers,
  Fingerprint,
  ChevronLeft,
  ShieldCheck,
  Gauge,
  Dna,
  Timer,
  User as UserIcon,
  Settings as SettingsIcon,
  Sun,
  Utensils,
  CheckCircle,
  Rocket,
  Dumbbell
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
import { useTheme, ThemeType } from './theme';

interface Mission {
  id: number;
  title: string;
  impact: 'low' | 'moderate' | 'high' | 'critical';
  urgency: number;
  urgency_score?: number;
  estimated_effort?: number;
  impact_level?: number;
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

interface LifeState {
  score: number;
  status: 'Focused' | 'Distracted' | 'Peak' | 'Low Energy' | 'Recovering';
  insight: string;
  focusLevel: number;
  hydration: number;
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
          <div className="stitch-card p-10 max-w-md space-y-6 border-accent-red/20">
            <div className="size-20 bg-accent-red/10 rounded-full flex items-center justify-center text-accent-red mx-auto">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-2xl font-black tracking-tighter">System Error</h2>
            <p className="text-slate-400 font-medium">{displayMessage}</p>
            <div className="pt-4 space-y-4">
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-accent-red text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-accent-red/20 hover:brightness-110 transition-all"
              >
                Re-Initialize System
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
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('lifepilot_token'));
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPricing, setShowPricing] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const [missions, setMissions] = useState<Mission[]>([]);
  const [nextAction, setNextAction] = useState<Mission | null>(null);
  const [focusTask, setFocusTask] = useState<Mission | null>(null);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [consistencySystem, setConsistencySystem] = useState<Habit[]>([]);
  const [timelineMatrix, setTimelineMatrix] = useState<Mission[]>([]);
  const [selfAwareness, setSelfAwareness] = useState<Analytics | null>(null);
  const [lifeState, setLifeState] = useState<LifeState>({
    score: 84,
    status: 'Peak',
    insight: 'Biometric Peak is arriving. Deep Work is optimal for the next 90 minutes.',
    focusLevel: 88,
    hydration: 1450
  });
  const [habitStats, setHabitStats] = useState<HabitStat[]>([]);

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

  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  
  const [title, setTitle] = useState('');
  const [impact, setImpact] = useState<'low' | 'moderate' | 'high' | 'critical'>('moderate');
  const [urgencyScore, setUrgencyScore] = useState(5);
  const [estimatedEffort, setEstimatedEffort] = useState(3);
  const [impactLevel, setImpactLevel] = useState(5);
  const [duration, setDuration] = useState(30);
  const [deadline, setDeadline] = useState('');
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [isHabit, setIsHabit] = useState(false);
  const [category, setCategory] = useState('general');
  
  // Habit Form State
  const [habitTitle, setHabitTitle] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [habitFreq, setHabitFreq] = useState<'daily' | 'weekly'>('daily');
  const [habitGoal, setHabitGoal] = useState(1);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showAiScheduleModal, setShowAiScheduleModal] = useState(false);
  const [aiScheduleContent, setAiScheduleContent] = useState('');
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
    if (isAuthReady && token) fetchUsage();
  }, [token, isAuthReady]);
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

  const renderOnboarding = () => {
    if (theme.id === 'simple') {
      return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col font-sans overflow-y-auto no-scrollbar">
          {/* Header */}
          <div className="p-6 flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-20">
            <button onClick={() => setOnboardingStep(Math.max(1, onboardingStep - 1))} className="text-gray-400 hover:text-gray-600">
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1 mx-8 h-3 bg-gray-100 rounded-full overflow-hidden relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(onboardingStep / 4) * 100}%` }}
                className="h-full bg-primary rounded-full"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Rocket size={14} className="text-primary" />
              </div>
            </div>
            <button onClick={() => completeOnboarding()} className="text-gray-300 hover:text-gray-500">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 p-6 flex flex-col items-center">
            <AnimatePresence mode="wait">
              {onboardingStep === 1 && (
                <motion.div 
                  key="simple-step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full max-w-md space-y-8"
                >
                  <div className="space-y-4">
                    <h2 className="text-3xl font-extrabold text-gray-800 leading-tight">
                      What's your main <span className="text-primary italic">mission?</span>
                    </h2>
                    <p className="text-gray-500 font-semibold">Choose the focus area where you want LifePilot AI to help you excel this week.</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { id: 'focus', title: 'Deep Focus', desc: 'Eliminate distractions and crush your big projects.', icon: <Target className="text-blue-500" />, bg: 'bg-blue-50' },
                      { id: 'habits', title: 'Healthy Habits', desc: 'Consistency is key. Build routines that actually stick.', icon: <Dumbbell className="text-primary" />, bg: 'bg-green-50' },
                      { id: 'sleep', title: 'Better Sleep', desc: 'Optimize your wind-down and wake up fully energized.', icon: <Moon className="text-yellow-500" />, bg: 'bg-yellow-50' },
                      { id: 'time', title: 'More Free Time', desc: 'Automate the boring stuff to focus on what you love.', icon: <Clock className="text-purple-500" />, bg: 'bg-purple-50' }
                    ].map(item => (
                      <button 
                        key={item.id}
                        onClick={() => setOnboardingStep(2)}
                        className="w-full p-6 bg-white border-2 border-gray-100 rounded-[24px] flex items-center gap-6 text-left hover:border-primary hover:bg-green-50/30 transition-all group active:scale-[0.98]"
                      >
                        <div className={`size-14 rounded-2xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-extrabold text-gray-800">{item.title}</h4>
                          <p className="text-sm text-gray-500 font-medium">{item.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {onboardingStep === 2 && (
                <motion.div 
                  key="simple-step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full max-w-md space-y-8"
                >
                  <div className="text-center space-y-4">
                    <div className="inline-block px-4 py-1 bg-yellow-400 text-white text-[10px] font-black uppercase tracking-widest rounded-full transform -rotate-2">Calibration</div>
                    <h2 className="text-3xl font-extrabold text-gray-800 leading-tight">Let's set your flight plan</h2>
                    <p className="text-gray-500 font-semibold">Your pilot adapts to your natural rhythm. Tell us when you start and end your day.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="p-8 bg-gray-50 rounded-[32px] border-2 border-gray-100 space-y-6 relative overflow-hidden">
                      <div className="absolute top-4 right-4 text-gray-200"><Sun size={64} /></div>
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="size-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                          <Sun size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-extrabold text-gray-800">Wake Up Time</h4>
                          <p className="text-xs text-gray-400 font-bold uppercase">Early Bird</p>
                        </div>
                      </div>
                      <div className="flex justify-center items-center gap-4 bg-white p-6 rounded-2xl border-2 border-gray-100">
                        <div className="text-5xl font-black text-gray-800">06:30</div>
                        <div className="flex flex-col gap-2">
                          <button className="px-4 py-1 bg-primary text-white text-xs font-black rounded-lg">AM</button>
                          <button className="px-4 py-1 bg-gray-100 text-gray-400 text-xs font-black rounded-lg">PM</button>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 bg-gray-50 rounded-[32px] border-2 border-gray-100 space-y-6 relative overflow-hidden">
                      <div className="absolute top-4 right-4 text-gray-200"><Moon size={64} /></div>
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="size-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                          <Moon size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-extrabold text-gray-800">Bedtime</h4>
                          <p className="text-xs text-gray-400 font-bold uppercase">Night Owl</p>
                        </div>
                      </div>
                      <div className="flex justify-center items-center gap-4 bg-white p-6 rounded-2xl border-2 border-gray-100">
                        <div className="text-5xl font-black text-gray-800">10:45</div>
                        <div className="flex flex-col gap-2">
                          <button className="px-4 py-1 bg-gray-100 text-gray-400 text-xs font-black rounded-lg">AM</button>
                          <button className="px-4 py-1 bg-blue-500 text-white text-xs font-black rounded-lg">PM</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {onboardingStep === 3 && (
                <motion.div 
                  key="simple-step3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="w-full max-w-md space-y-12 flex flex-col items-center py-12"
                >
                  <div className="relative size-48">
                    <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping"></div>
                    <div className="relative size-48 bg-primary rounded-full flex items-center justify-center text-white shadow-2xl shadow-primary/40">
                      <Sparkles size={64} />
                    </div>
                  </div>

                  <div className="text-center space-y-4">
                    <h2 className="text-4xl font-black text-gray-800">Building your perfect day...</h2>
                    <p className="text-gray-500 font-semibold">Our AI is orchestrating your habits, goals, and breaks into a seamless flow.</p>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden relative">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '85%' }}
                        transition={{ duration: 2 }}
                        className="h-full bg-primary"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-6 bg-white border-t border-gray-100 sticky bottom-0">
            <div className="max-w-md mx-auto flex gap-4">
              <button 
                onClick={() => setOnboardingStep(Math.max(1, onboardingStep - 1))}
                className="px-6 py-4 bg-white border-2 border-gray-200 rounded-2xl text-gray-400 font-black uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all"
              >
                Back
              </button>
              <button 
                onClick={() => {
                  if (onboardingStep < 3) setOnboardingStep(onboardingStep + 1);
                  else completeOnboarding();
                }}
                className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-[0_4px_0_rgb(60,140,0)] hover:brightness-110 active:translate-y-[2px] active:shadow-[0_2px_0_rgb(60,140,0)] transition-all flex items-center justify-center gap-3"
              >
                {onboardingStep === 3 ? 'Show me my day!' : 'Continue'}
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Elite AI Onboarding (Original)
    return (
      <div className="fixed inset-0 z-[200] bg-bg-dark flex flex-col grid-background overflow-y-auto no-scrollbar">
        {/* Onboarding Header */}
        <div className="flex items-center justify-between p-8 sticky top-0 bg-bg-dark/80 backdrop-blur-xl z-20 border-b border-white/5">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => completeOnboarding()}
              className="size-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-all"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Calibration Sequence</span>
            </div>
          </div>
          <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 0{onboardingStep}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
          <div className="max-w-2xl w-full">
            <AnimatePresence mode="wait">
              {onboardingStep === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 sm:space-y-12"
                >
                  <div className="text-center space-y-4">
                    <h2 className="text-4xl sm:text-7xl font-black tracking-tighter text-white leading-none">LIFE <span className="text-primary">PILOT</span></h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Your High-Performance Digital Partner</p>
                  </div>

                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent-purple/20 to-accent-blue/20 rounded-[48px] blur-xl opacity-50 group-hover:opacity-100 transition-all duration-1000"></div>
                    <div className="relative stitch-card p-6 sm:p-12 border-white/10 flex flex-col items-center gap-8">
                      <div className="absolute top-6 right-8 text-right hidden sm:block">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Core Status</div>
                        <div className="text-[10px] font-black text-primary uppercase tracking-widest">Stable // 98.4%</div>
                      </div>
                      
                      <div className="size-32 sm:size-48 rounded-[32px] sm:rounded-[40px] bg-white/[0.02] border border-white/10 flex items-center justify-center relative overflow-hidden shadow-inner">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
                        <div className="relative z-10 size-16 sm:size-24 bg-primary/10 rounded-2xl sm:rounded-3xl flex items-center justify-center text-primary border border-primary/20 shadow-2xl">
                          <Brain size={32} className="sm:size-[48px] animate-pulse-subtle" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20">
                          <div className="h-full bg-primary w-2/3 animate-pulse"></div>
                        </div>
                      </div>

                      <div className="text-center space-y-2">
                        <div className="text-[10px] font-black text-accent-purple uppercase tracking-widest">Neural Sync</div>
                        <div className="text-xs font-black text-white uppercase tracking-[0.2em]">READY_FOR_BOOT</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="stitch-card p-6 sm:p-8 border-white/5 space-y-4 hover:border-primary/20 transition-all group">
                      <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Sparkles size={20} className="sm:size-[24px]" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest text-white">Autonomous Optimization</h4>
                        <p className="text-[10px] sm:text-xs text-slate-500 leading-relaxed">Dynamic scheduling that adapts to your physiological performance peaks.</p>
                      </div>
                    </div>
                    <div className="stitch-card p-6 sm:p-8 border-white/5 space-y-4 hover:border-accent-purple/20 transition-all group">
                      <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-accent-purple/10 flex items-center justify-center text-accent-purple group-hover:scale-110 transition-transform">
                        <Fingerprint size={20} className="sm:size-[24px]" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest text-white">Biometric Integration</h4>
                        <p className="text-[10px] sm:text-xs text-slate-500 leading-relaxed">Seamlessly bridges with your wearables for real-time life-state mapping.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 sm:pt-8">
                    <button 
                      onClick={() => setOnboardingStep(2)}
                      className="flex-1 py-6 sm:py-8 bg-primary text-bg-dark rounded-2xl sm:rounded-[24px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all group text-sm sm:text-base"
                    >
                      Begin Calibration
                      <ArrowRight size={20} className="sm:size-[24px] group-hover:translate-x-2 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}
              
              {onboardingStep === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 sm:space-y-12"
                >
                  <div className="space-y-4">
                    <h2 className="text-4xl sm:text-7xl font-black tracking-tighter text-white leading-none">SET <br/><span className="text-primary">DIRECTIVES</span></h2>
                    <p className="text-slate-400 font-medium text-sm sm:text-lg max-w-lg">Define the operational parameters for your LifePilot AI. These goals will calibrate your cognitive environment and mission prioritizations.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {[
                      { id: 'focus', title: 'Peak Focus', desc: 'Eliminate peripheral noise. High-intensity cognitive output with automated distraction suppression.', icon: <Target size={20} />, color: 'text-primary' },
                      { id: 'mastery', title: 'Calm Mastery', desc: 'Maintain equilibrium. Managed stress levels and sustainable productivity flow.', icon: <Moon size={20} />, color: 'text-accent-blue' },
                      { id: 'creative', title: 'Creative Velocity', desc: 'Maximize lateral thinking. AI-assisted ideation and high-output synthesis.', icon: <Sparkles size={20} />, color: 'text-accent-purple' },
                      { id: 'physical', title: 'Physical Peak', desc: 'Bio-optimization. Integration with somatic data for peak physiological performance.', icon: <Activity size={20} />, color: 'text-accent-red' }
                    ].map(directive => (
                      <button 
                        key={directive.id}
                        onClick={() => setOnboardingStep(3)}
                        className="stitch-card p-5 sm:p-8 border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all text-left flex items-start gap-4 sm:gap-6 group relative overflow-hidden"
                      >
                        <div className={`size-10 sm:size-14 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center ${directive.color} group-hover:scale-110 transition-transform shrink-0`}>
                          {directive.icon}
                        </div>
                        <div className="space-y-1 sm:space-y-2 flex-1">
                          <h4 className={`text-lg sm:text-2xl font-black tracking-tight ${directive.color}`}>{directive.title}</h4>
                          <p className="text-slate-500 text-[10px] sm:text-sm leading-relaxed font-medium">{directive.desc}</p>
                        </div>
                        <div className="absolute top-4 right-4 size-1.5 sm:size-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 shadow-[0_0_10px_rgba(0,242,255,1)] transition-all"></div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-8">
                    <div className="text-center space-y-1 sm:space-y-2">
                      <div className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Calibration Load</div>
                      <div className="text-2xl sm:text-4xl font-black text-white">84%</div>
                    </div>
                    <div className="h-1.5 sm:h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '84%' }}
                        className="h-full bg-primary shadow-[0_0_15px_rgba(0,242,255,0.5)]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-6 sm:gap-12 pt-2 sm:pt-4">
                    <div className="flex items-center gap-2">
                      <div className="size-1 bg-primary rounded-full animate-pulse"></div>
                      <span className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest">Neural Link Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-1 bg-accent-purple rounded-full"></div>
                      <span className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest">Latency 14ms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-1 bg-accent-teal rounded-full"></div>
                      <span className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest">Encryption: Quantum</span>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 sm:pt-8">
                    <button 
                      onClick={() => setOnboardingStep(1)}
                      className="size-14 sm:size-20 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <ChevronLeft size={20} className="sm:size-[24px]" />
                    </button>
                    <button 
                      onClick={() => setOnboardingStep(3)}
                      className="flex-1 py-4 sm:py-6 bg-primary text-bg-dark rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-3 text-sm sm:text-base"
                    >
                      <ArrowRight size={20} className="sm:size-[24px]" />
                    </button>
                  </div>
                </motion.div>
              )}

              {onboardingStep === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 sm:space-y-12"
                >
                  <div className="text-center space-y-4">
                    <p className="text-primary text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em]">Core Processing</p>
                    <h2 className="text-4xl sm:text-7xl font-black tracking-tighter text-white leading-none">SYSTEM <br/>SYNTHESIS</h2>
                  </div>

                  <div className="flex justify-center py-6 sm:py-12">
                    <div className="relative size-48 sm:size-64 flex items-center justify-center">
                      <svg className="absolute inset-0 size-full -rotate-90">
                        <circle 
                          cx="96" cy="96" r="88" 
                          className="sm:hidden text-white/5"
                          fill="none" stroke="currentColor" strokeWidth="4" 
                        />
                        <circle 
                          cx="128" cy="128" r="120" 
                          className="hidden sm:block text-white/5"
                          fill="none" stroke="currentColor" strokeWidth="4" 
                        />
                        <motion.circle 
                          cx="96" cy="96" r="88" 
                          fill="none" stroke="currentColor" strokeWidth="4" 
                          strokeDasharray="553"
                          initial={{ strokeDashoffset: 553 }}
                          animate={{ strokeDashoffset: 553 * (1 - 0.84) }}
                          className="sm:hidden text-primary"
                          strokeLinecap="round"
                        />
                        <motion.circle 
                          cx="128" cy="128" r="120" 
                          fill="none" stroke="currentColor" strokeWidth="4" 
                          strokeDasharray="754"
                          initial={{ strokeDashoffset: 754 }}
                          animate={{ strokeDashoffset: 754 * (1 - 0.84) }}
                          className="hidden sm:block text-primary"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="text-center space-y-1">
                        <div className="text-4xl sm:text-6xl font-black tracking-tighter text-white">84%</div>
                        <div className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Integrity</div>
                      </div>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-1.5 sm:size-2 bg-primary rounded-full shadow-[0_0_10px_rgba(0,242,255,1)]"></div>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {[
                      { label: 'Neural Link', status: 'Analyzing focus peaks across circadian rhythms...', progress: 65, color: 'bg-primary' },
                      { label: 'Architect', status: 'Architecting mission matrix for maximum output...', progress: 100, color: 'bg-accent-purple' },
                      { label: 'Sync', status: 'Synchronizing life-pilot protocols to biological baseline...', progress: 45, color: 'bg-slate-700' }
                    ].map(proc => (
                      <div key={proc.label} className="stitch-card p-5 sm:p-6 border-white/5 space-y-3 sm:space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={`size-1.5 sm:size-2 rounded-full ${proc.color}`}></div>
                          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white">{proc.label}</span>
                        </div>
                        <p className="text-[10px] sm:text-xs font-medium text-slate-400">{proc.status}</p>
                        <div className="h-1 sm:h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${proc.progress}%` }}
                            className={`h-full ${proc.color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 pt-4 sm:pt-8">
                    <button 
                      onClick={() => setOnboardingStep(2)}
                      className="size-14 sm:size-20 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <ChevronLeft size={20} className="sm:size-[24px]" />
                    </button>
                    <div className="flex-1 flex flex-col items-center justify-center gap-1.5 sm:gap-2">
                      <div className="h-1 w-24 sm:w-32 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-[84%]"></div>
                      </div>
                      <span className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">84% Compiled</span>
                    </div>
                    <button 
                      onClick={() => setOnboardingStep(4)}
                      className="size-14 sm:size-20 bg-primary text-bg-dark rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 hover:brightness-110 transition-all"
                    >
                      <ArrowRight size={20} className="sm:size-[24px]" />
                    </button>
                  </div>
                </motion.div>
              )}

              {onboardingStep === 4 && (
                <motion.div 
                  key="step4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 sm:space-y-12"
                >
                  <div className="space-y-4">
                    <h2 className="text-4xl sm:text-7xl font-black tracking-tighter text-white leading-none">CALIBRATE <br/><span className="text-primary">ROUTINE</span></h2>
                    <p className="text-primary text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em]">Protocol 8.4: Chronotype Alignment</p>
                  </div>

                  <div className="stitch-card p-6 sm:p-12 border-white/5 flex flex-col items-center gap-6 sm:gap-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
                    <div className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Primary Awakening</div>
                    <div className="flex items-baseline gap-1 sm:gap-2">
                      <span className="text-5xl sm:text-8xl font-black tracking-tighter text-white">06:45</span>
                      <span className="text-lg sm:text-2xl font-black text-slate-500 uppercase">AM</span>
                    </div>
                    <div className="relative size-48 sm:size-64 group cursor-pointer">
                      <div className="absolute inset-0 border border-white/5 rounded-[32px] sm:rounded-[48px] rotate-45"></div>
                      <div className="absolute inset-3 sm:inset-4 border border-white/10 rounded-[28px] sm:rounded-[40px] rotate-45"></div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 sm:gap-4">
                        <div className="size-12 sm:size-16 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
                          <Sparkles size={24} className="sm:size-[32px]" />
                        </div>
                        <div className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest">Set Wake Time</div>
                      </div>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-3 sm:size-4 bg-primary rounded-full shadow-[0_0_15px_rgba(0,242,255,1)] border-2 sm:border-4 border-bg-dark"></div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 sm:pt-8">
                    <button 
                      onClick={() => setOnboardingStep(3)}
                      className="size-14 sm:size-20 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <ChevronLeft size={20} className="sm:size-[24px]" />
                    </button>
                    <button 
                      onClick={() => completeOnboarding()}
                      className="flex-1 py-6 sm:py-8 bg-primary text-bg-dark rounded-2xl sm:rounded-[24px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all group text-sm sm:text-base"
                    >
                      Initialize Pilot
                      <ArrowRight size={20} className="sm:size-[24px] group-hover:translate-x-2 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  const isConfigPlaceholder = firebaseConfig.appId === 'PASTE_YOUR_WEB_APP_ID_HERE';

  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);

  const handlePointerDown = (e: React.PointerEvent, task: Mission) => {
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
    if (isAuthReady) {
      if (token) {
        refreshUser();
        fetchMissions();
        fetchSelfAwareness();
        fetchConsistencySystem();
        fetchHabitStats();
        fetchUserProfile();
        fetchGoals();
        fetchNextAction();
        fetchAiInsights();
      } else {
        setShowAuth(true);
      }
    }
    
    // Request notification permission
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, [token, isAuthReady]);

  // Notification Reminder Logic
  useEffect(() => {
    if (timelineMatrix.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHourMin = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      
      timelineMatrix.forEach(task => {
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
  }, [timelineMatrix]);

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
    if (missions.length > 0) generateSchedule();
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
      setIsAuthReady(true);
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
    setLoading(true);
    setError(null);
    console.log("Starting Google login...");
    try {
      // Remove custom parameters for a moment to see if it helps with internal-error
      // googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google login successful:", result.user.email);
    } catch (err: any) {
      console.error("Google login error details:", JSON.stringify(err, null, 2));
      console.error("Error Code:", err.code);
      console.error("Error Message:", err.message);
      
      if (err.code === 'auth/popup-blocked') {
        setError("Popup blocked! Please allow popups for this site to sign in with Google.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError("This domain is not authorized for Google login. Please contact support.");
      } else if (err.code === 'auth/internal-error') {
        setError("Firebase internal error. This often happens if the Google provider is not enabled in the Firebase Console or if there's a configuration mismatch.");
      } else {
        setError(err.message || "Failed to initialize Google login");
      }
    } finally {
      setLoading(false);
    }
  };

  const LifeStateEngine = () => (
    <div className="flex flex-col items-center py-8 sm:py-12">
      <div className="diamond-container mb-8 sm:mb-12">
        {/* Outer Glows */}
        {theme.id === 'elite' && (
          <>
            <div className="diamond-glow scale-110 opacity-50" />
            <div className="diamond-glow scale-125 opacity-20" />
          </>
        )}
        
        {/* Main Shape */}
        <div className={`absolute inset-0 border-2 border-primary/30 ${theme.id === 'elite' ? 'rotate-45 rounded-xl' : theme.id === 'simple' ? 'rounded-full' : 'rounded-lg'} transition-all duration-500`} 
             style={{ background: theme.id === 'elite' ? 'radial-gradient(circle at center, rgba(0, 242, 255, 0.1), transparent)' : 'transparent' }} />
        
        {/* Accents */}
        {theme.id === 'elite' && (
          <>
            <div className="diamond-accent top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="diamond-accent bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2" />
            <div className="diamond-accent left-0 top-1/2 -translate-y-1/2 -translate-x-1/2" />
            <div className="diamond-accent right-0 top-1/2 -translate-y-1/2 translate-x-1/2" />
          </>
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-1">{theme.wording.efficiency}</span>
          <div className="flex items-baseline">
            <span className={`text-5xl sm:text-7xl font-black tracking-tighter ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>{lifeState.score}</span>
            <span className="text-xl sm:text-2xl font-bold text-primary/60 ml-1">%</span>
          </div>
          <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
            <div className={`size-1.5 bg-primary rounded-full ${theme.animations.type !== 'minimal' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Optimal</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-xs text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">
          <Zap className="size-3 text-primary" />
          {theme.wording.insight}
        </div>
        <p className="text-sm font-medium text-text-primary leading-relaxed">
          {lifeState.insight}
        </p>
      </div>
    </div>
  );

  const MissionCard: React.FC<{ mission: Mission }> = ({ mission }) => {
    const impactColor = mission.impact === 'critical' ? 'text-accent-red' : mission.impact === 'high' ? 'text-primary' : 'text-accent-purple';
    const buttonClass = mission.impact === 'critical' ? 'mission-button-critical' : mission.impact === 'high' ? 'mission-button-high' : 'mission-button-moderate';

    return (
      <motion.div 
        layout
        initial={theme.animations.type !== 'minimal' ? { opacity: 0, y: 20 } : { opacity: 1 }}
        animate={{ opacity: 1, y: 0 }}
        className="stitch-card p-4 sm:p-6 group relative overflow-hidden"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-widest ${impactColor}`}>
                {mission.impact} {theme.id === 'elite' ? 'Impact' : theme.id === 'simple' ? 'Level' : ''}
              </span>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">•</span>
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                {mission.category}
              </span>
            </div>
            <h3 className={`text-xl font-bold tracking-tight transition-colors ${theme.id === 'elite' ? 'text-white group-hover:text-primary' : 'text-text-primary'}`}>
              {mission.title}
            </h3>
          </div>
          <div className={`size-10 rounded-xl flex items-center justify-center text-text-secondary ${theme.id === 'elite' ? 'bg-white/5 border border-white/10' : 'bg-primary/10'}`}>
            {mission.category === 'health' ? <Heart size={20} /> : mission.category === 'work' ? <Briefcase size={20} /> : <Target size={20} />}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Clock size={14} />
            <span className="text-xs font-medium">{mission.duration}m</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Zap size={14} className="text-primary" />
            <span className="text-xs font-medium">+{mission.xp || 100} XP</span>
          </div>
          {mission.deadline && (
            <div className={`flex items-center gap-1.5 ${new Date(mission.deadline) < new Date() && mission.status === 'pending' ? 'text-accent-red' : 'text-text-secondary'}`}>
              <Calendar size={14} />
              <span className="text-xs font-medium">
                {new Date(mission.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        <button 
          onClick={() => toggleDone(mission.id)}
          className={buttonClass}
        >
          {theme.wording.execute}
          <ArrowRight size={18} />
        </button>
      </motion.div>
    );
  };

  const renderMissionMatrix = () => (
    <motion.div 
      key="tasks"
      initial={theme.animations.type !== 'minimal' ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 md:space-y-12 pb-32"
    >
      <div className="flex flex-col gap-6 md:gap-8">
        <div>
          <h2 className={`text-2xl md:text-5xl font-black tracking-tighter ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>{theme.wording.missions}</h2>
          <p className="text-text-secondary text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            {theme.id === 'elite' ? 'Tactical Asset Management & Deployment' : theme.id === 'simple' ? 'Keep track of everything you need to do!' : 'Manage your daily focus items.'}
          </p>
        </div>
        <div className={`flex p-1.5 rounded-[20px] md:rounded-[24px] border overflow-x-auto no-scrollbar ${theme.id === 'elite' ? 'bg-white/[0.03] border-white/5' : 'bg-primary/5 border-primary/10'}`}>
          {(['all', 'pending', 'completed', 'overdue'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setTaskFilter(f)}
              className={`px-4 md:px-8 py-2 md:py-3.5 rounded-[16px] md:rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${taskFilter === f ? 'bg-primary text-bg-dark shadow-xl shadow-primary/20' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8 md:space-y-10">
        <form onSubmit={saveMission} className="stitch-card p-4 md:p-10 space-y-6 md:space-y-8 border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Zap size={120} />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className={`size-10 md:size-12 rounded-xl md:rounded-2xl flex items-center justify-center shadow-inner ${editingMission ? 'bg-accent-red/10 text-accent-red' : 'bg-primary/10 text-primary'}`}>
              {editingMission ? <Zap size={20} className="md:size-[24px]" /> : <Plus size={20} className="md:size-[24px]" />}
            </div>
            <h3 className={`text-lg md:text-2xl font-black tracking-tight ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>
              {editingMission ? (theme.id === 'elite' ? 'Refine Mission' : 'Edit Task') : (theme.id === 'elite' ? 'Initialize Mission' : 'New Task')}
            </h3>
          </div>
          <div className="space-y-6 md:space-y-8 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                {theme.id === 'elite' ? 'Mission Objective' : 'What needs to be done?'}
              </label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={theme.id === 'elite' ? "Enter tactical objective..." : "e.g., Buy groceries"}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-6 focus:border-primary/50 transition-all outline-none font-bold text-lg md:text-2xl placeholder:text-slate-700"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Urgency Score (1-10)</label>
                  <span className="text-xs font-black text-primary">{urgencyScore}</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1"
                  value={urgencyScore}
                  onChange={(e) => setUrgencyScore(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Estimated Effort (1-5)</label>
                  <span className="text-xs font-black text-accent-purple">{estimatedEffort}</span>
                </div>
                <input 
                  type="range" min="1" max="5" step="1"
                  value={estimatedEffort}
                  onChange={(e) => setEstimatedEffort(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-accent-purple"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Impact Level (1-10)</label>
                  <span className="text-xs font-black text-accent-blue">{impactLevel}</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1"
                  value={impactLevel}
                  onChange={(e) => setImpactLevel(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-accent-blue"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Duration (min)</label>
                <input 
                  type="number" 
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-5 focus:border-primary/50 outline-none font-bold"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                {theme.id === 'elite' ? 'Temporal Deadline' : 'Due Date'}
              </label>
              <input 
                type="datetime-local" 
                value={deadline}
                onChange={(e) => {
                  setDeadline(e.target.value);
                  if (deadlineError) setDeadlineError(null);
                }}
                className={`w-full bg-white/[0.03] border rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-5 outline-none font-bold transition-colors ${deadlineError ? 'border-accent-red' : 'border-white/10 focus:border-primary/50'}`}
              />
              {deadlineError && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] font-bold text-accent-red uppercase tracking-widest ml-1"
                >
                  {deadlineError}
                </motion.p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 py-4 md:py-6 bg-primary text-bg-dark rounded-xl md:rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : editingMission ? (theme.id === 'elite' ? 'Update Mission' : 'Save Changes') : (theme.id === 'elite' ? 'Deploy Mission' : 'Add Task')}
              </button>
              {editingMission && (
                <button 
                  type="button"
                  onClick={resetForm}
                  className="px-8 py-4 md:py-6 bg-white/5 text-text-secondary rounded-xl md:rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
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
              if (taskFilter === 'overdue') return m.isOverdue;
              return true;
            })
            .map((mission: Mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          {missions.length === 0 && (
            <div className={`p-12 md:p-24 text-center border border-dashed rounded-[32px] md:rounded-[48px] ${theme.id === 'elite' ? 'text-slate-600 border-white/10 bg-white/[0.01]' : 'text-text-secondary border-primary/20 bg-primary/5'}`}>
              <Sparkles size={48} className="mx-auto mb-6 opacity-10" />
              <p className="font-black uppercase tracking-[0.3em] text-[10px] md:text-sm">{theme.id === 'elite' ? 'Matrix is empty' : 'No tasks yet'}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderTimelineMatrix = () => (
    <motion.div 
      key="schedule"
      initial={theme.animations.type !== 'minimal' ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 md:space-y-12 pb-32"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-0">
        <div>
          <h2 className={`text-2xl md:text-5xl font-black tracking-tighter ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>{theme.wording.schedule}</h2>
          <p className="text-text-secondary text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            {theme.id === 'elite' ? 'Temporal Optimization & Flow' : theme.id === 'simple' ? 'Your perfect day, planned out!' : 'Your daily focus timeline.'}
          </p>
        </div>
        <button 
          onClick={generateSchedule}
          disabled={loading}
          className="stitch-button stitch-button-primary text-[10px] uppercase tracking-widest w-full sm:w-auto"
        >
          {loading ? (theme.id === 'elite' ? 'Optimizing...' : 'Planning...') : (theme.id === 'elite' ? 'AI Re-Route' : 'Generate Schedule')}
        </button>
      </div>

      <div className="relative pl-10 sm:pl-14 space-y-8 sm:space-y-12">
        {/* Timeline Line */}
        <div className="absolute left-[23px] sm:left-[27px] top-4 bottom-4 w-1 bg-gradient-to-b from-primary via-accent-purple to-accent-blue opacity-10 rounded-full"></div>
        
        {timelineMatrix.length > 0 ? timelineMatrix.map((mission, idx) => (
          <div key={mission.id} className="relative group">
            {/* Timeline Node */}
            <div className={`absolute -left-[38px] sm:-left-[45px] top-2 size-7 sm:size-9 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-bg-dark z-10 flex items-center justify-center transition-all duration-500 ${mission.status === 'completed' ? 'bg-primary' : 'bg-primary shadow-lg shadow-primary/40'}`}>
              {mission.status === 'completed' ? <Check size={14} className="text-bg-dark" /> : <div className="size-1.5 rounded-full bg-white animate-pulse"></div>}
            </div>
            
            <div className="stitch-card stitch-card-hover p-6 sm:p-8 border-white/5 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-primary uppercase tracking-widest border border-primary/10">{mission.startTime}</span>
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{mission.duration} MIN {theme.id === 'elite' ? 'DURATION' : ''}</span>
                  </div>
                  <h4 className={`text-xl sm:text-2xl font-black tracking-tight ${mission.status === 'completed' ? 'text-text-secondary line-through' : theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>{mission.title}</h4>
                </div>
                <button 
                  onClick={() => toggleDone(mission.id)}
                  className={`size-10 sm:size-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ml-auto sm:ml-0 ${mission.status === 'completed' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-white/5 text-text-secondary hover:text-text-primary hover:bg-primary hover:text-bg-dark'}`}
                >
                  <CheckCircle2 size={20} />
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className={`stitch-card p-12 sm:p-24 text-center space-y-6 border-dashed ${theme.id === 'elite' ? 'border-white/10' : 'border-primary/20'}`}>
            <Clock size={48} className="mx-auto text-text-secondary opacity-20" />
            <div className="space-y-2">
              <p className="text-text-secondary font-bold text-lg italic">{theme.id === 'elite' ? 'Timeline Matrix not initialized.' : 'No schedule generated yet.'}</p>
              <p className="text-text-secondary text-xs font-medium">{theme.id === 'elite' ? 'Run AI Re-Route to generate your optimized path.' : 'Click the button above to plan your day!'}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderSelfAwareness = () => (
    <motion.div 
      key="analytics"
      initial={theme.animations.type !== 'minimal' ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 sm:space-y-12 pb-32"
    >
      <div className="space-y-2">
        <h2 className={`text-3xl sm:text-5xl font-black tracking-tighter ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>{theme.wording.analytics}</h2>
        <p className="text-text-secondary text-[10px] font-black uppercase tracking-[0.3em]">
          {theme.id === 'elite' ? 'Neural Performance Analytics & Growth' : theme.id === 'simple' ? 'See how much you\'ve grown!' : 'Your performance metrics.'}
        </p>
      </div>

      {/* Performance Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
        <div className="stitch-card p-6 sm:p-10 space-y-4 sm:space-y-6 border-white/10">
          <div className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{theme.id === 'elite' ? 'Cognitive Efficiency' : 'Efficiency'}</div>
          <div className="text-4xl sm:text-6xl font-black tracking-tighter text-primary">92%</div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-[92%] shadow-[0_0_10px_rgba(66,133,244,0.5)]" />
          </div>
        </div>
        <div className="stitch-card p-6 sm:p-10 space-y-4 sm:space-y-6 border-white/10">
          <div className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{theme.id === 'elite' ? 'Consistency Index' : 'Consistency'}</div>
          <div className="text-4xl sm:text-6xl font-black tracking-tighter text-accent-purple">8.4</div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-accent-purple w-[84%] shadow-[0_0_10px_rgba(147,51,234,0.5)]" />
          </div>
        </div>
        <div className="stitch-card p-6 sm:p-10 space-y-4 sm:space-y-6 border-white/10">
          <div className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{theme.id === 'elite' ? 'Focus Resilience' : 'Focus'}</div>
          <div className="text-4xl sm:text-6xl font-black tracking-tighter text-primary">High</div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i <= 4 ? 'bg-primary shadow-[0_0_10px_rgba(0,242,255,0.5)]' : 'bg-white/5'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Growth Visualization */}
      <div className="glass-card p-8 border-white/5 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className={`text-xl font-bold tracking-tight ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>{theme.id === 'elite' ? 'Growth Trajectory' : 'Your Progress'}</h3>
          <div className="flex items-center gap-2">
            <div className="size-2 bg-primary rounded-full" />
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{theme.wording.score}</span>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[
              { day: 'Mon', score: 65 },
              { day: 'Tue', score: 68 },
              { day: 'Wed', score: 75 },
              { day: 'Thu', score: 72 },
              { day: 'Fri', score: 84 },
              { day: 'Sat', score: 88 },
              { day: 'Sun', score: 92 },
            ]}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 10, fontWeight: 'bold' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-bg-dark)', border: '1px solid var(--color-primary)', borderRadius: '16px' }}
                itemStyle={{ color: 'var(--color-primary)', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );

  const NextActionCard = ({ task, onStartFocus }: { task: Mission | null, onStartFocus: (task: Mission) => void }) => {
    if (!task) return null;
    
    return (
      <div className="stitch-card p-6 bg-primary/10 border-primary/30 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Zap size={80} className="text-primary" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="px-2 py-0.5 rounded-full bg-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
              Next Strategic Action
            </div>
            {task.isOverdue && (
              <div className="px-2 py-0.5 rounded-full bg-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-500">
                Overdue
              </div>
            )}
          </div>
          
          <h3 className={`text-xl md:text-2xl font-black tracking-tighter mb-2 ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>
            {task.title}
          </h3>
          
          <div className="flex flex-wrap items-center gap-4 text-text-secondary text-xs font-bold uppercase tracking-widest mb-6">
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              {task.duration}m
            </div>
            <div className="flex items-center gap-1.5">
              <Zap size={14} />
              Impact: {task.impact}
            </div>
            {task.deadline && (
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                {new Date(task.deadline).toLocaleDateString()}
              </div>
            )}
          </div>
          
          <button 
            onClick={() => onStartFocus(task)}
            className="w-full py-4 bg-primary text-white font-black uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/30"
          >
            <Play size={18} fill="currentColor" />
            Engage Focus Mode
          </button>
        </div>
      </div>
    );
  };

  const FocusMode = ({ task, onComplete, onCancel }: { task: Mission, onComplete: () => void, onCancel: () => void }) => {
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
        onComplete();
      }
      return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = ((task.duration * 60 - timeLeft) / (task.duration * 60)) * 100;

    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 md:p-12">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />
        </div>
        
        <div className="w-full max-w-2xl space-y-12 text-center relative z-10">
          <div className="space-y-4">
            <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.5em] text-primary animate-pulse">
              Deep Focus Protocol Active
            </div>
            <h2 className={`text-3xl md:text-5xl font-black tracking-tighter ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>
              {task.title}
            </h2>
          </div>
          
          <div className="relative size-64 md:size-80 mx-auto flex items-center justify-center">
            <svg className="absolute inset-0 size-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="48%"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-white/5"
              />
              <circle
                cx="50%"
                cy="50%"
                r="48%"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray="301.59"
                strokeDashoffset={301.59 - (301.59 * progress) / 100}
                className="text-primary transition-all duration-1000"
              />
            </svg>
            <div className={`text-6xl md:text-8xl font-black tabular-nums tracking-tighter ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="stitch-card p-4 bg-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Distractions</div>
              <div className="text-2xl font-black text-primary">{distractions}</div>
              <button 
                onClick={() => setDistractions(d => d + 1)}
                className="mt-2 text-[10px] font-bold uppercase text-text-secondary hover:text-primary transition-colors"
              >
                Log Distraction
              </button>
            </div>
            <div className="stitch-card p-4 bg-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Efficiency</div>
              <div className="text-2xl font-black text-accent-purple">High</div>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={() => setIsActive(!isActive)}
              className="size-16 rounded-full bg-white/5 flex items-center justify-center text-text-primary hover:bg-white/10 transition-all"
            >
              {isActive ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
            </button>
            <button 
              onClick={onCancel}
              className="px-8 py-4 bg-white/5 text-text-secondary font-black uppercase tracking-widest rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all"
            >
              Abort Mission
            </button>
            <button 
              onClick={onComplete}
              className="px-8 py-4 bg-primary text-white font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-primary/20"
            >
              Complete Early
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6 md:space-y-8 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between px-0">
        <div>
          <h1 className={`text-2xl md:text-3xl font-black tracking-tighter ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>
            {theme.wording.dashboard.split(' ')[0]} <span className="text-primary">{theme.wording.dashboard.split(' ')[1] || ''}</span>
          </h1>
          <p className="text-[10px] md:text-xs font-bold text-text-secondary uppercase tracking-[0.2em] mt-1">
            {theme.wording.neuralSync}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className={`text-xs font-black uppercase tracking-widest ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>Level 12</div>
            <div className="w-24 h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
              <div className="w-3/4 h-full bg-primary" />
            </div>
          </div>
          <div className={`size-10 md:size-12 rounded-xl md:rounded-2xl flex items-center justify-center text-text-secondary ${theme.id === 'elite' ? 'bg-white/5 border border-white/10' : 'bg-primary/10'}`}>
            <Bell size={20} />
          </div>
        </div>
      </div>

      {/* Life State Engine */}
      <LifeStateEngine />

      {/* Strategic Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <NextActionCard 
            task={nextAction} 
            onStartFocus={(task) => setFocusTask(task)} 
          />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">AI Insights</h2>
            <Brain size={14} className="text-primary" />
          </div>
          <div className="space-y-3">
            {aiInsights.length > 0 ? aiInsights.map((insight, i) => (
              <div key={i} className="stitch-card p-3 bg-white/5 border-l-2 border-primary/50">
                <p className="text-xs font-medium text-text-primary leading-relaxed">
                  {insight.insight_text}
                </p>
              </div>
            )) : (
              <div className="stitch-card p-3 bg-white/5 border-l-2 border-white/10 opacity-50">
                <p className="text-xs font-medium text-text-secondary">
                  Analyzing patterns... insights will appear shortly.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Core Actions */}
      <div className="space-y-4">
        <button 
          onClick={() => setShowAiScheduleModal(true)}
          className="pilot-button"
        >
          <Sparkles className="size-5 md:size-6" />
          {theme.wording.pilot}
        </button>
        
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <button 
            onClick={() => setActiveTab('tasks')}
            className="stitch-card p-4 md:p-5 flex flex-col items-center gap-3 hover:bg-white/5 transition-all"
          >
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <LayoutGrid size={20} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>{theme.wording.missions}</span>
          </button>
          <button 
            onClick={() => setActiveTab('schedule')}
            className="stitch-card p-4 md:p-5 flex flex-col items-center gap-3 hover:bg-white/5 transition-all"
          >
            <div className="size-10 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple">
              <Activity size={20} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>{theme.wording.timeline}</span>
          </button>
        </div>
      </div>

      {/* Active Missions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-0">
          <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-text-secondary">{theme.wording.activeMissions}</h2>
          <button className="text-[10px] font-black uppercase tracking-widest text-primary">View All</button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {missions.filter(m => m.status === 'pending').slice(0, 3).map(mission => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      </div>

      {/* Consistency Pulse */}
      <div className={`stitch-card p-4 md:p-6 bg-primary/5 ${theme.id === 'elite' ? 'border-primary/20' : 'border-primary/10'}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="size-10 md:size-12 rounded-xl md:rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
            <Activity size={20} className="md:hidden" />
            <Activity size={24} className="hidden md:block" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-primary">Consistency Pulse</div>
            <div className={`text-base md:text-lg font-bold ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>92% Stability</div>
          </div>
        </div>
        <div className="flex gap-1 h-8 items-end">
          {[40, 70, 45, 90, 65, 80, 95, 60, 85, 75, 90, 100].map((h, i) => (
            <div 
              key={i} 
              className="flex-1 bg-primary/20 rounded-t-sm"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
  const renderSettings = () => (
    <div className="space-y-8 pb-32">
      <div className="space-y-2">
        <h2 className={`text-3xl font-black tracking-tighter ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>System <span className="text-primary">Configuration</span></h2>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">UI Personality & Preferences</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className={`text-sm font-black uppercase tracking-widest ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>Select UI Personality</h3>
          <div className="grid grid-cols-1 gap-4">
            {(['elite', 'simple', 'minimal'] as ThemeType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`stitch-card p-6 flex items-center justify-between transition-all ${theme.id === t ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-white/5 hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`size-12 rounded-2xl flex items-center justify-center ${t === 'elite' ? 'bg-primary/10 text-primary' : t === 'simple' ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'}`}>
                    {t === 'elite' ? <Zap size={24} /> : t === 'simple' ? <Sparkles size={24} /> : <Target size={24} />}
                  </div>
                  <div className="text-left">
                    <div className={`font-black uppercase tracking-widest ${theme.id === t ? 'text-primary' : theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>
                      {t === 'elite' ? 'Elite AI' : t === 'simple' ? 'Simple & Friendly' : 'Minimal Clean'}
                    </div>
                    <div className="text-[10px] font-medium text-text-secondary">
                      {t === 'elite' ? 'Futuristic, powerful, system-driven' : t === 'simple' ? 'Friendly, motivating, easy' : 'Clean, focused, distraction-free'}
                    </div>
                  </div>
                </div>
                {theme.id === t && (
                  <div className="size-6 bg-primary rounded-full flex items-center justify-center text-bg-dark">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="stitch-card p-6 border-white/5 space-y-6">
          <h3 className={`text-sm font-black uppercase tracking-widest ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>Account Protocol</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                  <UserIcon size={20} />
                </div>
                <div>
                  <div className={`text-xs font-black uppercase tracking-widest ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>Neural ID</div>
                  <div className="text-[10px] font-medium text-text-secondary">{user?.email}</div>
                </div>
              </div>
              <button onClick={logout} className="text-[10px] font-black uppercase tracking-widest text-accent-red hover:brightness-110">De-Authorize</button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Shield size={20} />
                </div>
                <div>
                  <div className={`text-xs font-black uppercase tracking-widest ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>Subscription</div>
                  <div className="text-[10px] font-medium text-text-secondary">{user?.subscription_plan === 'premium' ? 'Elite Access Active' : 'Standard Protocol'}</div>
                </div>
              </div>
              {user?.subscription_plan !== 'premium' && (
                <button onClick={() => setShowPricing(true)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:brightness-110 underline">Upgrade</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('lifepilot_token');
      localStorage.clear();
      sessionStorage.clear();
      setToken(null);
      setUser(null);
      setShowAuth(true);
      setMissions([]);
      setTimelineMatrix([]);
      setSelfAwareness(null);
      setConsistencySystem([]);
    } catch (error: any) {
      setError("Logout failed");
    }
  };

  const fetchMissions = async () => {
    try {
      const res = await apiFetch('/api/tasks');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMissions(data.map((m: any) => ({
          ...m,
          impact: m.importance >= 8 ? 'critical' : m.importance >= 6 ? 'high' : m.importance >= 4 ? 'moderate' : 'low',
          urgency: m.importance
        })));
      } else {
        console.error("Missions fetch returned non-array:", data);
        setMissions([]);
        if (data.error) setError(data.error);
      }
    } catch (error) {
      console.error("Failed to fetch missions:", error);
      setMissions([]);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await apiFetch('/api/user/profile');
      const data = await res.json();
      setUserProfile(data);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  const fetchGoals = async () => {
    try {
      const res = await apiFetch('/api/goals');
      const data = await res.json();
      setGoals(data);
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    }
  };

  const fetchNextAction = async () => {
    try {
      const res = await apiFetch('/api/ai/next-action');
      const data = await res.json();
      if (data.id) setNextAction(data);
      else setNextAction(null);
    } catch (error) {
      console.error("Failed to fetch next action:", error);
    }
  };

  const fetchAiInsights = async () => {
    try {
      const res = await apiFetch('/api/ai/insights');
      const data = await res.json();
      setAiInsights(data);
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    }
  };

  const fetchConsistencySystem = async () => {
    try {
      const res = await apiFetch('/api/habits');
      const data = await res.json();
      if (Array.isArray(data)) {
        setConsistencySystem(data);
      } else {
        console.error("Consistency system fetch returned non-array:", data);
        setConsistencySystem([]);
      }
    } catch (err) {
      console.error("Failed to fetch consistency system:", err);
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

  const fetchSelfAwareness = async () => {
    try {
      const res = await apiFetch('/api/analytics');
      const data = await res.json();
      if (data && !data.error) {
        setSelfAwareness(data);
      } else {
        console.error("Self-awareness fetch error:", data?.error);
      }
    } catch (error) {
      console.error("Failed to fetch self-awareness:", error);
    }
  };

  const saveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || duration <= 0 || !token) return;

    // Deadline validation
    if (deadline) {
      const selectedDate = new Date(deadline);
      if (isNaN(selectedDate.getTime())) {
        setDeadlineError("Invalid date format.");
        return;
      }
      const now = new Date();
      if (selectedDate < now) {
        setDeadlineError("Deadline cannot be in the past.");
        return;
      }
    }
    setDeadlineError(null);
    
    setLoading(true);
    setError(null);
    try {
      const method = editingMission ? 'PUT' : 'POST';
      const url = editingMission ? `/api/tasks/${editingMission.id}` : '/api/tasks';
      
      const res = await apiFetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          title, 
          importance: impactLevel, 
          urgency_score: urgencyScore,
          estimated_effort: estimatedEffort,
          impact_level: impactLevel,
          duration, 
          is_habit: isHabit, 
          deadline, 
          category 
        }),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save mission");
      }
      
      resetForm();
      await fetchMissions();
      await fetchSelfAwareness();
      await fetchNextAction();
      await fetchAiInsights();
    } catch (error: any) {
      console.error("Failed to save mission:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setImpact('moderate');
    setUrgencyScore(5);
    setEstimatedEffort(3);
    setImpactLevel(5);
    setDuration(30);
    setDeadline('');
    setDeadlineError(null);
    setIsHabit(false);
    setEditingMission(null);
  };

  const startEdit = (mission: Mission) => {
    setEditingMission(mission);
    setTitle(mission.title);
    setImpact(mission.impact);
    setUrgencyScore(mission.urgency_score || 5);
    setEstimatedEffort(mission.estimated_effort || 3);
    setImpactLevel(mission.impact_level || 5);
    setDuration(mission.duration);
    setDeadline(mission.deadline || '');
    setIsHabit(mission.is_habit);
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

    fetchMissions();
    fetchSelfAwareness();
    if (timelineMatrix.length > 0) generateSchedule();
  };

  const deleteTask = async (id: number) => {
    console.log("Deleting task with id:", id);
    try {
      const res = await apiFetch(`/api/tasks/${id}`, { 
        method: 'DELETE'
      });
      console.log("Delete response status:", res.status);
      if (!res.ok) throw new Error("Failed to delete task");
      
      await fetchMissions();
      await fetchSelfAwareness();
      
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
      const habitList = consistencySystem.map(h => `${h.title} (${h.frequency}, goal: ${h.goal_count})`).join(', ');
      const missionList = missions.map(m => `${m.title} (Impact: ${m.impact}${m.deadline ? `, Due: ${m.deadline}` : ''})`).join(', ');
      const prompt = `Generate a daily schedule for a user with these missions: ${missionList}. Also incorporate these consistency protocols (habits): ${habitList}. Focus on peak performance, cognitive load management, and circadian alignment. Return a concise, powerful strategist-level summary.`;
      
      const res = await apiFetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          taskType: 'complex',
          systemInstruction: "You are LifePilot AI, an elite productivity strategist. Your goal is to help users control their day for maximum output and biological alignment. Speak in short, powerful insights. Be authoritative and intelligent."
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate timeline matrix");
      }

      setAiSuggestion(data.text);
      setAiScheduleContent(data.text);
      setShowAiScheduleModal(true);
      
      // Also refresh the schedule from the backend
      const scheduleRes = await apiFetch('/api/schedule');
      const scheduleData = await scheduleRes.json();
      if (Array.isArray(scheduleData)) {
        setTimelineMatrix(scheduleData);
      } else {
        console.error("Timeline matrix fetch returned non-array:", scheduleData);
        setTimelineMatrix([]);
      }
      setActiveTab('schedule');

    } catch (error: any) {
      console.error("AI Generation Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetHabitForm = () => {
    setHabitTitle('');
    setHabitDesc('');
    setHabitFreq('daily');
    setHabitGoal(1);
    setEditingHabit(null);
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
      fetchConsistencySystem();
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
        fetchConsistencySystem();
        fetchHabitStats();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteHabit = async (id: number) => {
    try {
      await apiFetch(`/api/habits/${id}`, {
        method: 'DELETE'
      });
      fetchConsistencySystem();
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

  const getAiInsights = async (currentSchedule: Mission[]) => {
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
          taskType: 'complex',
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
    if (timelineMatrix.length === 0) return;

    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//LifePilot AI//EN\n";
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

    timelineMatrix.forEach(task => {
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

  const completionRate = selfAwareness?.productivityScore || 0;

  const filteredTasks = missions.filter(task => {
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

  const handleFocusComplete = async () => {
    if (!focusTask) return;
    try {
      await toggleDone(focusTask.id);
      setFocusTask(null);
      fetchNextAction();
      fetchAiInsights();
    } catch (error) {
      console.error("Failed to complete focus task:", error);
    }
  };

  const handleFocusCancel = () => {
    setFocusTask(null);
  };

  return (
    <ErrorBoundary>
      <div className={`min-h-screen text-text-primary font-sans selection:bg-primary/30 ${theme.id === 'elite' ? 'bg-bg-dark grid-background' : 'bg-background'}`}>
      {/* Focus Mode Overlay */}
      <AnimatePresence>
        {focusTask && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[200]"
          >
            <FocusMode 
              task={focusTask} 
              onComplete={handleFocusComplete} 
              onCancel={handleFocusCancel} 
            />
          </motion.div>
        )}
      </AnimatePresence>

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
            className="fixed inset-0 z-[110] bg-bg-dark flex items-center justify-center p-4 md:p-6 grid-background overflow-y-auto"
          >
            <div className="max-w-md w-full stitch-card p-6 md:p-12 text-center space-y-6 md:space-y-10 border-white/10 my-auto">
              <div className="size-16 md:size-24 bg-primary/10 rounded-[24px] md:rounded-[32px] flex items-center justify-center mx-auto text-primary shadow-inner border border-primary/20">
                <Sparkles size={32} className="md:hidden" />
                <Sparkles size={48} className="hidden md:block" />
              </div>
              
              <div className="space-y-2 md:space-y-3">
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter">{authMode === 'login' ? 'System Login' : 'Initialize Pilot'}</h2>
                <p className="text-slate-400 font-medium text-base md:text-lg">Elevate your cognitive architecture with AI.</p>
              </div>

              <form onSubmit={authMode === 'login' ? login : signup} className="space-y-4 md:space-y-5">
                <input 
                  type="email" 
                  placeholder="Neural ID (Email)" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 md:px-8 md:py-5 focus:border-primary/50 transition-all outline-none font-bold text-lg placeholder:text-slate-700"
                  required
                />
                <input 
                  type="password" 
                  placeholder="Access Key (Password)" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 md:px-8 md:py-5 focus:border-primary/50 transition-all outline-none font-bold text-lg placeholder:text-slate-700"
                  required
                />
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 md:py-6 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 text-sm md:text-base"
                >
                  {loading ? 'Processing...' : (authMode === 'login' ? 'Authorize' : 'Initialize')}
                </button>
              </form>

              <div className="relative py-1 md:py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em]">
                  <span className="bg-surface-dark px-4 md:px-6 text-slate-600">Secure Protocol</span>
                </div>
              </div>

              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className={`w-full py-4 md:py-5 bg-white/[0.03] border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 md:gap-4 hover:bg-white/10 transition-all text-xs md:text-sm ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <div className="size-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="size-5 md:size-6" />
                )}
                {loading ? 'Processing...' : 'Google Auth'}
              </button>

              <div className="pt-1 md:pt-2">
                <button 
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setError(null);
                    setAuthMessage(null);
                  }}
                  className="text-xs md:text-sm font-bold text-slate-500 hover:text-white transition-colors border-b border-white/5 pb-1"
                >
                  {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                </button>
              </div>
              
              {error && <p className="text-accent-urgent text-xs md:text-sm font-black uppercase tracking-widest">{error}</p>}
              {authMessage && <p className="text-primary text-xs md:text-sm font-black uppercase tracking-widest">{authMessage}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Schedule Modal */}
      <AnimatePresence>
        {showAiScheduleModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-bg-primary/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              className="glass-card p-6 md:p-10 max-w-2xl w-full space-y-6 md:space-y-8 border-primary/30 relative overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 size-48 bg-primary/20 blur-[60px] rounded-full"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 text-primary">
                    <Sparkles size={18} className="md:hidden" />
                    <Sparkles size={20} className="hidden md:block" />
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em]">Neural Temporal Alignment</span>
                  </div>
                  <h3 className="text-2xl md:text-4xl font-black tracking-tighter">Optimized Matrix</h3>
                </div>
                <button 
                  onClick={() => setShowAiScheduleModal(false)} 
                  className="size-10 md:size-12 flex items-center justify-center rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                >
                  <X size={20} className="md:hidden" />
                  <X size={24} className="hidden md:block" />
                </button>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-[24px] md:rounded-[32px] p-6 md:p-10 max-h-[50vh] md:max-h-[60vh] overflow-y-auto relative z-10 no-scrollbar shadow-inner">
                <div className="whitespace-pre-wrap text-slate-200 leading-relaxed font-medium text-lg md:text-xl italic">
                  "{aiScheduleContent}"
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 relative z-10">
                <button 
                  onClick={() => setShowAiScheduleModal(false)}
                  className="flex-1 py-4 md:py-6 bg-primary text-bg-dark rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all text-xs md:text-sm"
                >
                  Confirm Deployment
                </button>
                <button 
                  onClick={() => {
                    setShowAiScheduleModal(false);
                    setActiveTab('schedule');
                  }}
                  className="flex-1 py-4 md:py-6 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all text-xs md:text-sm"
                >
                  View Timeline
                </button>
              </div>
            </motion.div>
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
            className="fixed inset-0 z-[110] bg-bg-dark/80 backdrop-blur-xl flex items-center justify-center p-6 grid-background"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="stitch-card p-6 md:p-12 max-w-lg w-full space-y-6 md:space-y-10 border-white/10"
            >
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-2xl md:text-4xl font-black tracking-tighter">{editingHabit ? 'Refine Habit' : 'Forge Habit'}</h3>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Neural Pathway Construction</p>
                </div>
                <button onClick={() => setShowHabitModal(false)} className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={saveHabit} className="space-y-6 md:space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Habit Designation</label>
                  <input 
                    required
                    value={habitTitle}
                    onChange={(e) => setHabitTitle(e.target.value)}
                    placeholder="e.g., Deep Work Protocol"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 md:px-8 md:py-5 focus:border-primary/50 transition-all outline-none font-bold text-lg placeholder:text-slate-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Strategic Intent</label>
                  <textarea 
                    value={habitDesc}
                    onChange={(e) => setHabitDesc(e.target.value)}
                    placeholder="Define the purpose of this neural pathway..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 md:px-8 md:py-5 focus:border-primary/50 transition-all outline-none h-32 resize-none font-bold text-lg placeholder:text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Cycle Frequency</label>
                    <select 
                      value={habitFreq}
                      onChange={(e) => setHabitFreq(e.target.value as any)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 md:px-8 md:py-5 focus:border-primary/50 transition-all outline-none appearance-none font-bold cursor-pointer"
                    >
                      <option value="daily">Daily Cycle</option>
                      <option value="weekly">Weekly Cycle</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Target Intensity</label>
                    <input 
                      type="number"
                      min="1"
                      required
                      value={habitGoal}
                      onChange={(e) => setHabitGoal(parseInt(e.target.value))}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 md:px-8 md:py-5 focus:border-primary/50 transition-all outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 md:py-6 bg-primary text-bg-dark rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : editingHabit ? 'Update Pathway' : 'Forge Pathway'}
                  </button>

                  {editingHabit && (
                    <button 
                      type="button"
                      onClick={() => { deleteHabit(editingHabit.id); setShowHabitModal(false); }}
                      className="w-full py-3 md:py-5 bg-white/5 text-accent-red rounded-2xl font-black uppercase tracking-widest hover:bg-accent-red/10 transition-all"
                    >
                      Decommission Habit
                    </button>
                  )}
                </div>
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
            className="fixed inset-0 z-[105] bg-bg-dark/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-6 grid-background overflow-y-auto"
          >
            <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 my-auto">
              <div className="stitch-card p-6 md:p-12 space-y-4 md:space-y-8 border-white/5 bg-white/[0.02]">
                <div className="space-y-2">
                  <h3 className="text-xl md:text-3xl font-black tracking-tighter">Standard Tier</h3>
                  <p className="text-slate-500 font-medium text-sm md:text-base">Foundational cognitive support.</p>
                </div>
                <div className="text-4xl md:text-6xl font-black tracking-tighter">₹0 <span className="text-[10px] md:text-sm font-black text-slate-700 uppercase tracking-widest">/ Lifetime</span></div>
                <ul className="space-y-3 md:space-y-5 pt-4 md:pt-6">
                  {['Basic Tactical Matrix', 'Standard Timeline Flow', 'Limited Habit Forge (3)', 'Neural Notifications'].map(f => (
                    <li key={f} className="flex items-center gap-3 md:gap-4 text-slate-400 font-bold text-sm md:text-base">
                      <CheckCircle2 size={18} className="text-slate-700 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => setShowPricing(false)}
                  className="w-full py-4 md:py-6 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-slate-500 cursor-default text-xs md:text-sm"
                >
                  Current Protocol
                </button>
              </div>

              <div className="stitch-card p-6 md:p-12 space-y-4 md:space-y-8 border-primary/30 relative overflow-hidden bg-gradient-to-br from-primary/10 via-transparent to-transparent shadow-2xl shadow-primary/10">
                <div className="absolute top-4 right-4 md:top-6 md:right-6 bg-primary text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] px-3 md:px-4 py-1 md:py-1.5 rounded-full text-bg-dark">Elite Access</div>
                <div className="space-y-2">
                  <h3 className="text-xl md:text-3xl font-black tracking-tighter">Premium Tier</h3>
                  <p className="text-slate-400 font-medium text-sm md:text-base">Full neural architecture unlock.</p>
                </div>
                <div className="text-4xl md:text-6xl font-black tracking-tighter text-primary">₹499 <span className="text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-widest">/ Monthly</span></div>
                <ul className="space-y-3 md:space-y-5 pt-4 md:pt-6">
                  {['AI Neural Re-Routing', 'Advanced Performance Analytics', 'Unlimited Matrix Capacity', 'AI Cognitive Insights', 'Tactical Student Mode'].map(f => (
                    <li key={f} className="flex items-center gap-3 md:gap-4 text-white font-bold text-sm md:text-base">
                      <CheckCircle2 size={18} className="text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => initiatePayment(499)}
                  className="w-full py-4 md:py-6 bg-primary text-bg-dark rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition-all text-xs md:text-sm"
                >
                  Upgrade Protocol
                </button>
                <button 
                  onClick={() => setShowPricing(false)}
                  className="w-full text-center text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-all pt-2"
                >
                  Defer Upgrade
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Overlay */}
      <AnimatePresence>
        {showOnboarding && renderOnboarding()}
      </AnimatePresence>

      {/* Top Navigation / Header */}
      <header className={`flex items-center justify-between p-4 md:p-6 max-w-6xl mx-auto sticky top-0 z-40 backdrop-blur-2xl border-b w-full ${theme.id === 'elite' ? 'bg-bg-dark/40 border-white/5' : 'bg-background/80 border-divider'}`}>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="size-8 md:size-10 rounded-lg md:rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className={`${theme.id === 'elite' ? 'text-bg-dark' : 'text-white'} md:hidden`} size={16} />
            <Sparkles className={`${theme.id === 'elite' ? 'text-bg-dark' : 'text-white'} hidden md:block`} size={20} />
          </div>
          <h1 className={`text-lg md:text-2xl font-black tracking-tighter ${theme.id === 'elite' ? 'text-white' : 'text-text-primary'}`}>LifePilot <span className="text-primary">AI</span></h1>
          {user?.subscription_plan === 'premium' && (
            <span className="bg-primary/10 text-primary text-[7px] md:text-[8px] font-black uppercase tracking-widest px-1.5 md:px-2 py-0.5 md:py-1 rounded-md border border-primary/20">Premium</span>
          )}
        </div>
        <div className="flex gap-3 md:gap-4 items-center">
          <button 
            onClick={() => setShowAiPanel(!showAiPanel)}
            className={`size-8 md:size-10 flex items-center justify-center rounded-lg md:rounded-xl border transition-all relative ${theme.id === 'elite' ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'}`}
          >
            <Brain size={18} className="md:hidden" />
            <Brain size={20} className="hidden md:block" />
            <span className={`absolute top-2 right-2 md:top-2.5 md:right-2.5 size-1.5 md:size-2 bg-primary rounded-full ${theme.id === 'elite' ? 'shadow-[0_0_8px_rgba(0,242,255,0.8)]' : ''}`}></span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`size-8 md:size-10 flex items-center justify-center rounded-lg md:rounded-xl border transition-all ${theme.id === 'elite' ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'}`}
            title="Settings"
          >
            <Settings size={18} className="md:hidden" />
            <Settings size={20} className="hidden md:block" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pb-32 overflow-y-auto max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && renderDashboard()}
          {activeTab === 'tasks' && renderMissionMatrix()}
          {activeTab === 'schedule' && renderTimelineMatrix()}
          {activeTab === 'analytics' && renderSelfAwareness()}
          {activeTab === 'settings' && renderSettings()}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[94%] sm:w-[90%] max-w-lg">
        <div className={`stitch-card p-1.5 sm:p-2 flex items-center justify-between shadow-2xl backdrop-blur-3xl rounded-[32px] ${theme.id === 'elite' ? 'bg-black/60 border-white/10' : 'bg-white/80 border-divider'}`}>
          {[
            { id: 'home', icon: LayoutDashboard, label: theme.wording.dashboard.split(' ')[0] },
            { id: 'tasks', icon: Target, label: theme.wording.missions.split(' ')[0] },
            { id: 'schedule', icon: Clock, label: theme.wording.timeline.split(' ')[0] },
            { id: 'analytics', icon: Brain, label: theme.wording.awareness.split(' ')[0] },
            { id: 'settings', icon: Settings, label: 'Style' },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 sm:gap-1.5 px-3 sm:px-6 py-3 sm:py-4 rounded-[24px] sm:rounded-[28px] transition-all duration-500 ${
                activeTab === item.id ? 'nav-item-active shadow-xl shadow-primary/20 scale-105' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <item.icon size={20} strokeWidth={activeTab === item.id ? 3 : 2} className="sm:size-[22px]" />
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
    </ErrorBoundary>
  );
}
