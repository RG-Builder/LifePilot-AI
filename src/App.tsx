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
  ChevronUp,
  ChevronDown,
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
  status: 'pending' | 'completed' | 'overdue';
  category: string;
  startTime?: string;
  endTime?: string;
  completed_at?: string;
  created_at: string;
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
            <p className="text-text_secondary font-medium">{displayMessage}</p>
            <div className="pt-4 space-y-4">
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-accent-red text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-accent-red/20 hover:brightness-110 transition-all"
              >
                Re-Initialize System
              </button>
              <p className="text-xs text-text_secondary">
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
  const [onboardingData, setOnboardingData] = useState({
    mission: 'focus',
    wakeTime: '06:30',
    wakePeriod: 'AM',
    bedTime: '10:45',
    bedPeriod: 'PM',
    directive: 'focus'
  });
  const [lastAiCall, setLastAiCall] = useState(0);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const renderOnboarding = () => {
    if (theme.id === 'simple') {
      return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col font-sans overflow-y-auto no-scrollbar">
          {/* Header */}
          <div className="p-6 flex items-center justify-between border-b border-border sticky top-0 bg-white/80 backdrop-blur-md z-20">
            <button onClick={() => setOnboardingStep(Math.max(1, onboardingStep - 1))} className="text-text_secondary hover:text-text_primary">
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1 mx-8 h-3 bg-border rounded-full overflow-hidden relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(onboardingStep / 4) * 100}%` }}
                className="h-full bg-primary rounded-full"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Rocket size={14} className="text-primary" />
              </div>
            </div>
            <button onClick={() => completeOnboarding()} className="text-text_secondary hover:text-text_primary">
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
                    <h2 className="text-3xl font-extrabold text-text_primary leading-tight">
                      What's your main <span className="text-primary italic">mission?</span>
                    </h2>
                    <p className="text-text_secondary font-semibold">Choose the focus area where you want LifePilot AI to help you excel this week.</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { id: 'focus', title: 'Deep Focus', desc: 'Eliminate distractions and crush your big projects.', icon: <Target className="text-primary" />, bg: 'bg-primary/10' },
                      { id: 'habits', title: 'Healthy Habits', desc: 'Consistency is key. Build routines that actually stick.', icon: <Dumbbell className="text-success" />, bg: 'bg-success/10' },
                      { id: 'sleep', title: 'Better Sleep', desc: 'Optimize your wind-down and wake up fully energized.', icon: <Moon className="text-secondary" />, bg: 'bg-secondary/10' },
                      { id: 'time', title: 'More Free Time', desc: 'Automate the boring stuff to focus on what you love.', icon: <Clock className="text-accent" />, bg: 'bg-accent/10' }
                    ].map(item => (
                      <button 
                        key={item.id}
                        onClick={() => {
                          setOnboardingData(prev => ({ ...prev, mission: item.id }));
                          setOnboardingStep(2);
                        }}
                        className={`w-full p-6 bg-surface border-2 rounded-[24px] flex items-center gap-6 text-left transition-all group active:scale-[0.98] ${onboardingData.mission === item.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      >
                        <div className={`size-14 rounded-2xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-extrabold text-text_primary">{item.title}</h4>
                          <p className="text-sm text-text_secondary font-medium">{item.desc}</p>
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
                    <div className="inline-block px-4 py-1 bg-accent text-black text-[10px] font-black uppercase tracking-widest rounded-full transform -rotate-2">Calibration</div>
                    <h2 className="text-3xl font-extrabold text-text_primary leading-tight">Let's set your flight plan</h2>
                    <p className="text-text_secondary font-semibold">Your pilot adapts to your natural rhythm. Tell us when you start and end your day.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="p-8 bg-surface rounded-[32px] border-2 border-border space-y-6 relative overflow-hidden">
                      <div className="absolute top-4 right-4 text-text_secondary/10"><Sun size={64} /></div>
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="size-12 bg-primary rounded-2xl flex items-center justify-center text-black shadow-lg shadow-primary/20">
                          <Sun size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-extrabold text-text_primary">Wake Up Time</h4>
                          <p className="text-xs text-text_secondary font-bold uppercase">Early Bird</p>
                        </div>
                      </div>
                      <div className="flex justify-center items-center gap-4 bg-background p-6 rounded-2xl border-2 border-border">
                        <div className="flex flex-col items-center">
                          <button 
                            onClick={() => {
                              const [h, m] = onboardingData.wakeTime.split(':');
                              const newH = (parseInt(h) % 12) + 1;
                              setOnboardingData(prev => ({ ...prev, wakeTime: `${newH.toString().padStart(2, '0')}:${m}` }));
                            }}
                            className="text-text_secondary hover:text-primary transition-colors"
                          ><ChevronUp size={20} /></button>
                          <div className="text-5xl font-black text-text_primary">{onboardingData.wakeTime}</div>
                          <button 
                            onClick={() => {
                              const [h, m] = onboardingData.wakeTime.split(':');
                              const newH = parseInt(h) === 1 ? 12 : parseInt(h) - 1;
                              setOnboardingData(prev => ({ ...prev, wakeTime: `${newH.toString().padStart(2, '0')}:${m}` }));
                            }}
                            className="text-text_secondary hover:text-primary transition-colors"
                          ><ChevronDown size={20} /></button>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => setOnboardingData(prev => ({ ...prev, wakePeriod: 'AM' }))}
                            className={`px-4 py-1 text-xs font-black rounded-lg transition-all ${onboardingData.wakePeriod === 'AM' ? 'bg-primary text-black' : 'bg-surface text-text_secondary'}`}
                          >AM</button>
                          <button 
                            onClick={() => setOnboardingData(prev => ({ ...prev, wakePeriod: 'PM' }))}
                            className={`px-4 py-1 text-xs font-black rounded-lg transition-all ${onboardingData.wakePeriod === 'PM' ? 'bg-primary text-black' : 'bg-surface text-text_secondary'}`}
                          >PM</button>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 bg-surface rounded-[32px] border-2 border-border space-y-6 relative overflow-hidden">
                      <div className="absolute top-4 right-4 text-text_secondary/10"><Moon size={64} /></div>
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="size-12 bg-secondary rounded-2xl flex items-center justify-center text-black shadow-lg shadow-secondary/20">
                          <Moon size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-extrabold text-text_primary">Bedtime</h4>
                          <p className="text-xs text-text_secondary font-bold uppercase">Night Owl</p>
                        </div>
                      </div>
                      <div className="flex justify-center items-center gap-4 bg-background p-6 rounded-2xl border-2 border-border">
                        <div className="flex flex-col items-center">
                          <button 
                            onClick={() => {
                              const [h, m] = onboardingData.bedTime.split(':');
                              const newH = (parseInt(h) % 12) + 1;
                              setOnboardingData(prev => ({ ...prev, bedTime: `${newH.toString().padStart(2, '0')}:${m}` }));
                            }}
                            className="text-text_secondary hover:text-secondary transition-colors"
                          ><ChevronUp size={20} /></button>
                          <div className="text-5xl font-black text-text_primary">{onboardingData.bedTime}</div>
                          <button 
                            onClick={() => {
                              const [h, m] = onboardingData.bedTime.split(':');
                              const newH = parseInt(h) === 1 ? 12 : parseInt(h) - 1;
                              setOnboardingData(prev => ({ ...prev, bedTime: `${newH.toString().padStart(2, '0')}:${m}` }));
                            }}
                            className="text-text_secondary hover:text-secondary transition-colors"
                          ><ChevronDown size={20} /></button>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => setOnboardingData(prev => ({ ...prev, bedPeriod: 'AM' }))}
                            className={`px-4 py-1 text-xs font-black rounded-lg transition-all ${onboardingData.bedPeriod === 'AM' ? 'bg-secondary text-black' : 'bg-surface text-text_secondary'}`}
                          >AM</button>
                          <button 
                            onClick={() => setOnboardingData(prev => ({ ...prev, bedPeriod: 'PM' }))}
                            className={`px-4 py-1 text-xs font-black rounded-lg transition-all ${onboardingData.bedPeriod === 'PM' ? 'bg-secondary text-black' : 'bg-surface text-text_secondary'}`}
                          >PM</button>
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
                    <div className="relative size-48 bg-primary rounded-full flex items-center justify-center text-black shadow-2xl shadow-primary/40">
                      <Sparkles size={64} />
                    </div>
                  </div>

                  <div className="text-center space-y-4">
                    <h2 className="text-4xl font-black text-text_primary">Building your perfect day...</h2>
                    <p className="text-text_secondary font-semibold">Our AI is orchestrating your habits, goals, and breaks into a seamless flow.</p>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="h-4 bg-surface rounded-full overflow-hidden relative">
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
          <div className="p-6 bg-surface border-t border-border sticky bottom-0">
            <div className="max-w-md mx-auto flex gap-4">
              <button 
                onClick={() => setOnboardingStep(Math.max(1, onboardingStep - 1))}
                className="px-6 py-4 bg-surface border-2 border-border rounded-2xl text-text_secondary font-black uppercase tracking-widest hover:bg-background active:scale-95 transition-all"
              >
                Back
              </button>
              <button 
                onClick={() => {
                  if (onboardingStep < 3) setOnboardingStep(onboardingStep + 1);
                  else completeOnboarding();
                }}
                className="flex-1 py-4 bg-primary text-black rounded-2xl font-black uppercase tracking-widest shadow-[0_4px_0_var(--color-primary-dark)] hover:brightness-110 active:translate-y-[2px] active:shadow-[0_2px_0_var(--color-primary-dark)] transition-all flex items-center justify-center gap-3"
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
      <div className="fixed inset-0 z-[200] bg-background flex flex-col grid-background overflow-y-auto no-scrollbar">
        {/* Onboarding Header */}
        <div className="flex items-center justify-between p-8 sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => completeOnboarding()}
              className="size-10 flex items-center justify-center rounded-xl bg-surface hover:bg-surface/80 text-text_secondary transition-all"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Calibration Sequence</span>
            </div>
          </div>
          <div className="bg-surface px-4 py-1.5 rounded-full border border-border">
            <span className="text-[10px] font-black uppercase tracking-widest text-text_secondary">Step 0{onboardingStep}</span>
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
                    <h2 className="text-4xl sm:text-7xl font-black tracking-tighter text-text_primary leading-none">LIFE <span className="text-primary">PILOT</span></h2>
                    <p className="text-text_secondary text-[10px] font-black uppercase tracking-[0.4em]">Your High-Performance Digital Partner</p>
                  </div>

                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-[48px] blur-xl opacity-50 group-hover:opacity-100 transition-all duration-1000"></div>
                    <div className="relative stitch-card p-6 sm:p-12 border-border flex flex-col items-center gap-8">
                      <div className="absolute top-6 right-8 text-right hidden sm:block">
                        <div className="text-[8px] font-black text-text_secondary uppercase tracking-widest mb-1">Core Status</div>
                        <div className="text-[10px] font-black text-primary uppercase tracking-widest">Stable // 98.4%</div>
                      </div>
                      
                      <div className="size-32 sm:size-48 rounded-[32px] sm:rounded-[40px] bg-surface border border-border flex items-center justify-center relative overflow-hidden shadow-inner">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
                        <div className="relative z-10 size-16 sm:size-24 bg-primary/10 rounded-2xl sm:rounded-3xl flex items-center justify-center text-primary border border-primary/20 shadow-2xl">
                          <Brain size={32} className="sm:size-[48px] animate-pulse-subtle" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20">
                          <div className="h-full bg-primary w-2/3 animate-pulse"></div>
                        </div>
                      </div>

                      <div className="text-center space-y-2">
                        <div className="text-[10px] font-black text-secondary uppercase tracking-widest">Neural Sync</div>
                        <div className="text-xs font-black text-text_primary uppercase tracking-[0.2em]">READY_FOR_BOOT</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="stitch-card p-6 sm:p-8 border-border space-y-4 hover:border-primary/20 transition-all group">
                      <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Sparkles size={20} className="sm:size-[24px]" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest text-text_primary">Autonomous Optimization</h4>
                        <p className="text-[10px] sm:text-xs text-text_secondary leading-relaxed">Dynamic scheduling that adapts to your physiological performance peaks.</p>
                      </div>
                    </div>
                    <div className="stitch-card p-6 sm:p-8 border-border space-y-4 hover:border-secondary/20 transition-all group">
                      <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                        <Fingerprint size={20} className="sm:size-[24px]" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-widest text-text_primary">Biometric Integration</h4>
                        <p className="text-[10px] sm:text-xs text-text_secondary leading-relaxed">Seamlessly bridges with your wearables for real-time life-state mapping.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 sm:pt-8">
                    <button 
                      onClick={() => setOnboardingStep(2)}
                      className="flex-1 py-6 sm:py-8 bg-primary text-black rounded-2xl sm:rounded-[24px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all group text-sm sm:text-base"
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
                    <h2 className="text-4xl sm:text-7xl font-black tracking-tighter text-text_primary leading-none">SET <br/><span className="text-primary">DIRECTIVES</span></h2>
                    <p className="text-text_secondary font-medium text-sm sm:text-lg max-w-lg">Define the operational parameters for your LifePilot AI. These goals will calibrate your cognitive environment and mission prioritizations.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {[
                      { id: 'focus', title: 'Peak Focus', desc: 'Eliminate peripheral noise. High-intensity cognitive output with automated distraction suppression.', icon: <Target size={20} />, color: 'text-primary' },
                      { id: 'mastery', title: 'Calm Mastery', desc: 'Maintain equilibrium. Managed stress levels and sustainable productivity flow.', icon: <Moon size={20} />, color: 'text-secondary' },
                      { id: 'creative', title: 'Creative Velocity', desc: 'Maximize lateral thinking. AI-assisted ideation and high-output synthesis.', icon: <Sparkles size={20} />, color: 'text-accent' },
                      { id: 'physical', title: 'Physical Peak', desc: 'Bio-optimization. Integration with somatic data for peak physiological performance.', icon: <Activity size={20} />, color: 'text-danger' }
                    ].map(directive => (
                      <button 
                        key={directive.id}
                        onClick={() => {
                          setOnboardingData(prev => ({ ...prev, directive: directive.id }));
                          setOnboardingStep(3);
                        }}
                        className={`stitch-card p-5 sm:p-8 border-2 transition-all text-left flex items-start gap-4 sm:gap-6 group relative overflow-hidden ${onboardingData.directive === directive.id ? 'border-primary bg-primary/5' : 'border-border hover:border-text_primary/20 hover:bg-surface/80'}`}
                      >
                        <div className={`size-10 sm:size-14 rounded-xl sm:rounded-2xl bg-surface flex items-center justify-center ${directive.color} group-hover:scale-110 transition-transform shrink-0`}>
                          {directive.icon}
                        </div>
                        <div className="space-y-1 sm:space-y-2 flex-1">
                          <h4 className={`text-lg sm:text-2xl font-black tracking-tight ${directive.color}`}>{directive.title}</h4>
                          <p className="text-text_secondary text-[10px] sm:text-sm leading-relaxed font-medium">{directive.desc}</p>
                        </div>
                        <div className="absolute top-4 right-4 size-1.5 sm:size-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 shadow-[0_0_10px_var(--color-primary)] transition-all"></div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-8">
                    <div className="text-center space-y-1 sm:space-y-2">
                      <div className="text-[8px] sm:text-[10px] font-black text-text_secondary uppercase tracking-widest">Calibration Load</div>
                      <div className="text-2xl sm:text-4xl font-black text-text_primary">84%</div>
                    </div>
                    <div className="h-1.5 sm:h-2 w-full bg-surface rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '84%' }}
                        className="h-full bg-primary shadow-[0_0_15px_var(--color-primary-dark)]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-6 sm:gap-12 pt-2 sm:pt-4">
                    <div className="flex items-center gap-2">
                      <div className="size-1 bg-primary rounded-full animate-pulse"></div>
                      <span className="text-[7px] sm:text-[8px] font-black text-text_secondary uppercase tracking-widest">Neural Link Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-1 bg-secondary rounded-full"></div>
                      <span className="text-[7px] sm:text-[8px] font-black text-text_secondary uppercase tracking-widest">Latency 14ms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-1 bg-accent rounded-full"></div>
                      <span className="text-[7px] sm:text-[8px] font-black text-text_secondary uppercase tracking-widest">Encryption: Quantum</span>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 sm:pt-8">
                    <button 
                      onClick={() => setOnboardingStep(1)}
                      className="size-14 sm:size-20 bg-surface border border-border rounded-xl sm:rounded-2xl flex items-center justify-center text-text_secondary hover:text-text_primary hover:bg-surface/80 transition-all"
                    >
                      <ChevronLeft size={20} className="sm:size-[24px]" />
                    </button>
                    <button 
                      onClick={() => setOnboardingStep(3)}
                      className="flex-1 py-4 sm:py-6 bg-primary text-black rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-3 text-sm sm:text-base"
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
                    <h2 className="text-4xl sm:text-7xl font-black tracking-tighter text-text_primary leading-none">SYSTEM <br/>SYNTHESIS</h2>
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
                        <div className="text-4xl sm:text-6xl font-black tracking-tighter text-text_primary">84%</div>
                        <div className="text-[8px] sm:text-[10px] font-black text-text_secondary uppercase tracking-widest">Integrity</div>
                      </div>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-1.5 sm:size-2 bg-primary rounded-full shadow-[0_0_10px_var(--color-primary)]"></div>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {[
                      { label: 'Neural Link', status: 'Analyzing focus peaks across circadian rhythms...', progress: 65, color: 'bg-primary' },
                      { label: 'Architect', status: 'Architecting mission matrix for maximum output...', progress: 100, color: 'bg-secondary' },
                      { label: 'Sync', status: 'Synchronizing life-pilot protocols to biological baseline...', progress: 45, color: 'bg-accent' }
                    ].map(proc => (
                      <div key={proc.label} className="stitch-card p-5 sm:p-6 border-border space-y-3 sm:space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={`size-1.5 sm:size-2 rounded-full ${proc.color}`}></div>
                          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-text_primary">{proc.label}</span>
                        </div>
                        <p className="text-[10px] sm:text-xs font-medium text-text_secondary">{proc.status}</p>
                        <div className="h-1 sm:h-1.5 w-full bg-surface rounded-full overflow-hidden">
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
                      className="size-14 sm:size-20 bg-surface border border-border rounded-xl sm:rounded-2xl flex items-center justify-center text-text_secondary hover:text-text_primary hover:bg-surface/80 transition-all"
                    >
                      <ChevronLeft size={20} className="sm:size-[24px]" />
                    </button>
                    <div className="flex-1 flex flex-col items-center justify-center gap-1.5 sm:gap-2">
                      <div className="h-1 w-24 sm:w-32 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-[84%]"></div>
                      </div>
                      <span className="text-[8px] sm:text-[10px] font-black text-text_secondary uppercase tracking-widest">84% Compiled</span>
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
                    <h2 className="text-4xl sm:text-7xl font-black tracking-tighter text-text_primary leading-none">CALIBRATE <br/><span className="text-primary">ROUTINE</span></h2>
                    <p className="text-primary text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em]">Protocol 8.4: Chronotype Alignment</p>
                  </div>

                  <div className="stitch-card p-6 sm:p-12 border-border flex flex-col items-center gap-6 sm:gap-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
                    <div className="text-[8px] sm:text-[10px] font-black text-text_secondary uppercase tracking-widest">Primary Awakening</div>
                    <div className="flex items-center gap-4 sm:gap-8">
                      <div className="flex flex-col items-center">
                        <button 
                          onClick={() => {
                            const [h, m] = onboardingData.wakeTime.split(':');
                            const newH = (parseInt(h) % 12) + 1;
                            setOnboardingData(prev => ({ ...prev, wakeTime: `${newH.toString().padStart(2, '0')}:${m}` }));
                          }}
                          className="text-text_secondary hover:text-primary transition-colors"
                        ><ChevronUp size={32} /></button>
                        <div className="flex items-baseline gap-1 sm:gap-2">
                          <span className="text-5xl sm:text-8xl font-black tracking-tighter text-text_primary">{onboardingData.wakeTime}</span>
                          <span className="text-lg sm:text-2xl font-black text-text_secondary uppercase">{onboardingData.wakePeriod}</span>
                        </div>
                        <button 
                          onClick={() => {
                            const [h, m] = onboardingData.wakeTime.split(':');
                            const newH = parseInt(h) === 1 ? 12 : parseInt(h) - 1;
                            setOnboardingData(prev => ({ ...prev, wakeTime: `${newH.toString().padStart(2, '0')}:${m}` }));
                          }}
                          className="text-text_secondary hover:text-primary transition-colors"
                        ><ChevronDown size={32} /></button>
                      </div>
                    </div>
                    <div 
                      onClick={() => setOnboardingData(prev => ({ ...prev, wakePeriod: prev.wakePeriod === 'AM' ? 'PM' : 'AM' }))}
                      className="relative size-48 sm:size-64 group cursor-pointer active:scale-95 transition-all"
                    >
                      <div className="absolute inset-0 border border-border rounded-[32px] sm:rounded-[48px] rotate-45"></div>
                      <div className="absolute inset-3 sm:inset-4 border border-border rounded-[28px] sm:rounded-[40px] rotate-45"></div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 sm:gap-4">
                        <div className="size-12 sm:size-16 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
                          <Sparkles size={24} className="sm:size-[32px]" />
                        </div>
                        <div className="text-[8px] sm:text-[10px] font-black text-text_primary uppercase tracking-widest">Set Wake Time</div>
                      </div>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-3 sm:size-4 bg-primary rounded-full shadow-[0_0_15px_var(--color-primary)] border-2 sm:border-4 border-background"></div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 sm:pt-8">
                    <button 
                      onClick={() => setOnboardingStep(3)}
                      className="size-14 sm:size-20 bg-surface border border-border rounded-xl sm:rounded-2xl flex items-center justify-center text-text_secondary hover:text-text_primary hover:bg-surface/80 transition-all"
                    >
                      <ChevronLeft size={20} className="sm:size-[24px]" />
                    </button>
                    <button 
                      onClick={() => completeOnboarding()}
                      className="flex-1 py-6 sm:py-8 bg-primary text-black rounded-2xl sm:rounded-[24px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all group text-sm sm:text-base"
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

  const completeOnboarding = async () => {
    localStorage.setItem('lifepilot_onboarded', 'true');
    setShowOnboarding(false);
    
    // Add a default mission based on onboarding selection if no missions exist
    if (missions.length === 0 && token) {
      try {
        const missionTitles: Record<string, string> = {
          focus: 'Deep Focus Protocol',
          habits: 'Consistency Reinforcement',
          sleep: 'Circadian Alignment',
          time: 'Temporal Efficiency Audit',
          mastery: 'Equilibrium Maintenance',
          creative: 'Synthesis Sprint',
          physical: 'Somatic Calibration'
        };
        
        const title = missionTitles[onboardingData.mission] || missionTitles[onboardingData.directive] || 'Initial Calibration';
        
        await apiFetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            importance: 'high',
            impact_level: 'high',
            urgency_score: 5,
            estimated_effort: 60,
            duration: 60,
            is_habit: onboardingData.mission === 'habits',
            category: onboardingData.mission === 'physical' ? 'health' : 'work'
          })
        });
        await fetchMissions();
        generateSchedule();
      } catch (e) {
        console.error("Failed to create default mission:", e);
      }
    } else if (missions.length > 0) {
      generateSchedule();
    }
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
             style={{ background: theme.id === 'elite' ? 'radial-gradient(circle at center, rgba(var(--color-primary-rgb, 0, 242, 255), 0.1), transparent)' : 'transparent' }} />
        
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
            <span className={`text-5xl sm:text-7xl font-black tracking-tighter text-text_primary`}>{lifeState.score}</span>
            <span className="text-xl sm:text-2xl font-bold text-primary/60 ml-1">%</span>
          </div>
          <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
            <div className={`size-1.5 bg-primary rounded-full ${theme.animations.type !== 'minimal' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Optimal</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-xs text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-text_secondary">
          <Zap className="size-3 text-primary" />
          {theme.wording.insight}
        </div>
        <p className="text-sm font-medium text-text_primary leading-relaxed">
          {lifeState.insight}
        </p>
      </div>
    </div>
  );

  const MissionCard: React.FC<{ mission: Mission }> = ({ mission }) => {
    const impactColor = mission.impact === 'critical' ? 'text-danger' : mission.impact === 'high' ? 'text-primary' : 'text-secondary';
    const buttonClass = mission.status === 'completed' ? 'mission-button-completed' : mission.impact === 'critical' ? 'mission-button-critical' : mission.impact === 'high' ? 'mission-button-high' : 'mission-button-moderate';

    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirmDelete) {
        deleteTask(mission.id);
      } else {
        setConfirmDelete(true);
        setTimeout(() => setConfirmDelete(false), 3000);
      }
    };

    return (
      <motion.div 
        layout
        initial={theme.animations.type !== 'minimal' ? { opacity: 0, y: 20 } : { opacity: 1 }}
        animate={{ opacity: 1, y: 0 }}
        className={`stitch-card p-4 sm:p-6 group relative overflow-hidden transition-all ${mission.status === 'completed' ? 'opacity-60 grayscale-[0.5]' : ''}`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-widest ${impactColor}`}>
                {mission.status === 'overdue' ? 'OVERDUE' : mission.impact} {theme.id === 'elite' ? 'Impact' : theme.id === 'simple' ? 'Level' : ''}
              </span>
              <span className="text-[10px] font-bold text-text_secondary/50 uppercase tracking-widest">•</span>
              <span className="text-[10px] font-bold text-text_secondary uppercase tracking-widest">
                {mission.category}
              </span>
            </div>
            <h3 className={`text-xl font-bold tracking-tight transition-colors ${theme.id === 'elite' ? 'text-text_primary group-hover:text-primary' : 'text-text_primary'} ${mission.status === 'completed' ? 'line-through opacity-50' : ''}`}>
              {mission.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDelete}
              className={`size-8 rounded-lg flex items-center justify-center transition-all ${confirmDelete ? 'bg-danger text-white' : 'text-text_secondary hover:text-danger hover:bg-danger/10 opacity-40 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`}
              title={confirmDelete ? "Click again to confirm" : "Delete Mission"}
            >
              {confirmDelete ? <X size={16} /> : <Trash2 size={16} />}
            </button>
            <div className={`size-10 rounded-xl flex items-center justify-center text-text_secondary bg-surface border border-border`}>
              {mission.category === 'health' ? <Heart size={20} /> : mission.category === 'work' ? <Briefcase size={20} /> : <Target size={20} />}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6">
          <div className="flex items-center gap-1.5 text-text_secondary">
            <Clock size={14} />
            <span className="text-xs font-medium">{mission.duration}m</span>
          </div>
          {mission.deadline && (
            <div className={`flex items-center gap-1.5 ${mission.status === 'overdue' ? 'text-danger' : 'text-text_secondary'}`}>
              <Clock size={14} />
              <span className="text-xs font-medium">
                {new Date(mission.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          {mission.status === 'completed' && mission.completed_at && (
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle2 size={14} />
              <span className="text-xs font-medium">
                Completed {new Date(mission.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        <button 
          onClick={() => toggleDone(mission.id)}
          className={`${buttonClass} w-full flex items-center justify-center gap-2`}
        >
          {mission.status === 'completed' ? 'Restore Mission' : theme.wording.execute}
          {mission.status === 'completed' ? <RotateCcw size={18} /> : <ArrowRight size={18} />}
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
              {deadlineError && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] font-bold text-danger uppercase tracking-widest ml-1"
                >
                  {deadlineError}
                </motion.p>
              )}
            </div>
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
              <MissionCard key={mission.id} mission={mission} />
            ))}
          {missions.filter(m => {
            if (taskFilter === 'all') return true;
            if (taskFilter === 'pending') return m.status === 'pending';
            if (taskFilter === 'completed') return m.status === 'completed';
            if (taskFilter === 'overdue') return m.status === 'overdue';
            return true;
          }).length === 0 && (
            <div className={`p-12 md:p-24 text-center border border-dashed rounded-[32px] md:rounded-[48px] ${theme.id === 'elite' ? 'text-text_secondary/50 border-border bg-surface/50' : 'text-text_secondary border-primary/20 bg-primary/5'}`}>
              <Sparkles size={48} className="mx-auto mb-6 opacity-10" />
              <p className="font-black uppercase tracking-[0.3em] text-[10px] md:text-sm">{theme.id === 'elite' ? 'Matrix is empty' : 'No tasks yet'}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderHabits = () => (
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
          <div key={habit.id} className="stitch-card p-6 border-border group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-text_secondary">
              <Dumbbell size={80} />
            </div>
            
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Activity size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-text_primary">{habit.title}</h3>
                  <p className="text-xs font-medium text-text_secondary mt-1">{habit.description}</p>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-text_secondary">
                      <Flame size={14} className="text-danger" />
                      Streak: {habit.streak}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-text_secondary">
                      <Target size={14} className="text-primary" />
                      Goal: {habit.current_count}/{habit.goal_count} {habit.frequency}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => completeHabit(habit.id)}
                  className={`size-10 rounded-xl flex items-center justify-center transition-all ${habit.current_count >= habit.goal_count ? 'bg-success/20 text-success cursor-default' : 'bg-primary text-black hover:scale-110 shadow-lg shadow-primary/20'}`}
                  disabled={habit.current_count >= habit.goal_count}
                >
                  <Check size={20} strokeWidth={3} />
                </button>
                <button 
                  onClick={() => editHabit(habit)}
                  className="size-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text_secondary hover:text-text_primary transition-all"
                >
                  <Settings size={18} />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 h-1.5 w-full bg-surface rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (habit.current_count / habit.goal_count) * 100)}%` }}
                className={`h-full ${habit.current_count >= habit.goal_count ? 'bg-success' : 'bg-primary'}`}
              />
            </div>
          </div>
        ))}

        {consistencySystem.length === 0 && (
          <div className="p-12 md:p-24 text-center border border-dashed border-border rounded-[32px] md:rounded-[48px] bg-surface/50">
            <Dumbbell size={48} className="mx-auto mb-6 opacity-10 text-text_secondary" />
            <p className="font-black uppercase tracking-[0.3em] text-[10px] md:text-sm text-text_secondary">No consistency protocols active</p>
            <button 
              onClick={() => { resetHabitForm(); setShowHabitModal(true); }}
              className="mt-6 px-8 py-4 bg-primary/10 text-primary rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary/20 transition-all"
            >
              Initialize First Protocol
            </button>
          </div>
        )}
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
          <h2 className={`text-2xl md:text-5xl font-black tracking-tighter text-text_primary`}>{theme.wording.schedule}</h2>
          <p className="text-text_secondary text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-2">
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
        <div className="absolute left-[23px] sm:left-[27px] top-4 bottom-4 w-1 bg-gradient-to-b from-primary via-secondary to-accent opacity-10 rounded-full"></div>
        
        {timelineMatrix.length > 0 ? timelineMatrix.map((mission, idx) => (
          <div key={mission.id} className="relative group">
            {/* Timeline Node */}
            <div className={`absolute -left-[38px] sm:-left-[45px] top-2 size-7 sm:size-9 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-background z-10 flex items-center justify-center transition-all duration-500 ${mission.status === 'completed' ? 'bg-primary' : 'bg-primary shadow-lg shadow-primary/40'}`}>
              {mission.status === 'completed' ? <Check size={14} className="text-black" /> : <div className="size-1.5 rounded-full bg-white animate-pulse"></div>}
            </div>
            
            <div className="stitch-card stitch-card-hover p-6 sm:p-8 border-border relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-surface rounded-lg text-[10px] font-black text-primary uppercase tracking-widest border border-primary/10">{mission.startTime}</span>
                    <span className="text-[10px] font-black text-text_secondary uppercase tracking-widest">{mission.duration} MIN {theme.id === 'elite' ? 'DURATION' : ''}</span>
                  </div>
                  <h4 className={`text-xl sm:text-2xl font-black tracking-tight ${mission.status === 'completed' ? 'text-text_secondary line-through' : 'text-text_primary'}`}>{mission.title}</h4>
                </div>
                <button 
                  onClick={() => toggleDone(mission.id)}
                  className={`size-10 sm:size-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ml-auto sm:ml-0 ${mission.status === 'completed' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface text-text_secondary hover:text-text_primary hover:bg-primary hover:text-black'}`}
                >
                  <CheckCircle2 size={20} />
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className={`stitch-card p-12 sm:p-24 text-center space-y-6 border-dashed ${theme.id === 'elite' ? 'border-border' : 'border-primary/20'}`}>
            <Clock size={48} className="mx-auto text-text_secondary opacity-20" />
            <div className="space-y-2">
              <p className="text-text_secondary font-bold text-lg italic">{theme.id === 'elite' ? 'Timeline Matrix not initialized.' : 'No schedule generated yet.'}</p>
              <p className="text-text_secondary text-xs font-medium">{theme.id === 'elite' ? 'Run AI Re-Route to generate your optimized path.' : 'Click the button above to plan your day!'}</p>
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
        <h2 className={`text-3xl sm:text-5xl font-black tracking-tighter text-text_primary`}>{theme.wording.analytics}</h2>
        <p className="text-text_secondary text-[10px] font-black uppercase tracking-[0.3em]">
          {theme.id === 'elite' ? 'Neural Performance Analytics & Growth' : theme.id === 'simple' ? 'See how much you\'ve grown!' : 'Your performance metrics.'}
        </p>
      </div>

      {/* Performance Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
        <div className="stitch-card p-6 sm:p-10 space-y-4 sm:space-y-6 border-border">
          <div className="text-[10px] font-black text-text_secondary uppercase tracking-widest">{theme.id === 'elite' ? 'Cognitive Efficiency' : 'Efficiency'}</div>
          <div className="text-4xl sm:text-6xl font-black tracking-tighter text-primary">92%</div>
          <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-primary w-[92%] shadow-[0_0_10px_var(--color-primary)]" />
          </div>
        </div>
        <div className="stitch-card p-6 sm:p-10 space-y-4 sm:space-y-6 border-border">
          <div className="text-[10px] font-black text-text_secondary uppercase tracking-widest">{theme.id === 'elite' ? 'Consistency Index' : 'Consistency'}</div>
          <div className="text-4xl sm:text-6xl font-black tracking-tighter text-secondary">8.4</div>
          <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-secondary w-[84%] shadow-[0_0_10px_var(--color-secondary)]" />
          </div>
        </div>
        <div className="stitch-card p-6 sm:p-10 space-y-4 sm:space-y-6 border-border">
          <div className="text-[10px] font-black text-text_secondary uppercase tracking-widest">{theme.id === 'elite' ? 'Focus Resilience' : 'Focus'}</div>
          <div className="text-4xl sm:text-6xl font-black tracking-tighter text-primary">High</div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i <= 4 ? 'bg-primary shadow-[0_0_10px_var(--color-primary)]' : 'bg-surface'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Growth Visualization */}
      <div className="glass-card p-8 border-border space-y-6">
        <div className="flex items-center justify-between">
          <h3 className={`text-xl font-bold tracking-tight text-text_primary`}>{theme.id === 'elite' ? 'Growth Trajectory' : 'Your Progress'}</h3>
          <div className="flex items-center gap-2">
            <div className="size-2 bg-primary rounded-full" />
            <span className="text-[10px] font-bold text-text_secondary uppercase tracking-widest">{theme.wording.score}</span>
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
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 10, fontWeight: 'bold' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-primary)', borderRadius: '16px' }}
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
            {task.status === 'overdue' && (
              <div className="px-2 py-0.5 rounded-full bg-danger/20 text-[10px] font-black uppercase tracking-widest text-danger">
                Overdue
              </div>
            )}
          </div>
          
          <h3 className={`text-xl md:text-2xl font-black tracking-tighter mb-2 text-text_primary`}>
            {task.title}
          </h3>
          
          <div className="flex flex-wrap items-center gap-4 text-text_secondary text-xs font-bold uppercase tracking-widest mb-6">
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
            className="w-full py-4 bg-primary text-black font-black uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/30"
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
              onClick={onCancel}
              className="px-10 md:px-14 py-5 md:py-7 bg-surface text-text_secondary font-black uppercase tracking-widest rounded-2xl hover:bg-danger/20 hover:text-danger transition-all border border-border"
            >
              Abort Mission
            </button>
            <button 
              onClick={onComplete}
              className="px-10 md:px-14 py-5 md:py-7 bg-primary text-black font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-primary/30"
            >
              Mission Complete
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
          <h1 className={`text-2xl md:text-3xl font-black tracking-tighter text-text_primary`}>
            {theme.wording.dashboard.split(' ')[0]} <span className="text-primary">{theme.wording.dashboard.split(' ')[1] || ''}</span>
          </h1>
          <p className="text-[10px] md:text-xs font-bold text-text_secondary uppercase tracking-[0.2em] mt-1">
            {theme.wording.neuralSync}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className={`text-xs font-black uppercase tracking-widest text-text_primary`}>Level 12</div>
            <div className="w-24 h-1.5 bg-border rounded-full mt-1 overflow-hidden">
              <div className="w-3/4 h-full bg-primary" />
            </div>
          </div>
          <div className={`size-10 md:size-12 rounded-xl md:rounded-2xl flex items-center justify-center text-text_secondary bg-surface border border-border`}>
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
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text_secondary">AI Insight</h2>
            <Brain size={14} className="text-primary" />
          </div>
          <div className="stitch-card p-4 bg-surface border-l-4 border-primary">
            <p className="text-sm font-bold text-text_primary leading-relaxed">
              {aiInsights.length > 0 ? aiInsights[0].insight_text : "Analyzing your performance patterns... stay focused."}
            </p>
          </div>
          
          {/* Basic Analytics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-3 border-border">
              <div className="text-[8px] font-black uppercase tracking-widest text-text_secondary mb-1">Done Today</div>
              <div className="text-xl font-black text-text_primary">{missions.filter(m => m.status === 'completed' && m.completed_at && new Date(m.completed_at).toDateString() === new Date().toDateString()).length}</div>
            </div>
            <div className="glass-card p-3 border-border">
              <div className="text-[8px] font-black uppercase tracking-widest text-text_secondary mb-1">Focus Time</div>
              <div className="text-xl font-black text-primary">{selfAwareness?.focusTimeMinutes || 0}m</div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Actions */}
      <div className="space-y-4">
        <button 
          onClick={generateSchedule}
          className="pilot-button"
        >
          <Sparkles className="size-5 md:size-6" />
          {theme.wording.pilot}
        </button>
        
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <button 
            onClick={() => setActiveTab('tasks')}
            className="stitch-card p-4 md:p-5 flex flex-col items-center gap-3 hover:bg-surface transition-all"
          >
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <LayoutGrid size={20} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest text-text_primary`}>{theme.wording.missions}</span>
          </button>
          <button 
            onClick={() => setActiveTab('schedule')}
            className="stitch-card p-4 md:p-5 flex flex-col items-center gap-3 hover:bg-surface transition-all"
          >
            <div className="size-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
              <Activity size={20} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest text-text_primary`}>{theme.wording.timeline}</span>
          </button>
        </div>
      </div>

      {/* Active Missions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-0">
          <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-text_secondary">{theme.wording.activeMissions}</h2>
          <button className="text-[10px] font-black uppercase tracking-widest text-primary">View All</button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {missions.filter(m => m.status === 'pending').slice(0, 3).map(mission => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      </div>

      {/* Consistency Pulse */}
      <div className={`stitch-card p-4 md:p-6 bg-primary/5 border-border`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="size-10 md:size-12 rounded-xl md:rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
            <Activity size={20} className="md:hidden" />
            <Activity size={24} className="hidden md:block" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-primary">Consistency Pulse</div>
            <div className={`text-base md:text-lg font-bold text-text_primary`}>92% Stability</div>
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
        <h2 className={`text-3xl font-black tracking-tighter text-text_primary`}>System <span className="text-primary">Configuration</span></h2>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text_secondary">UI Personality & Preferences</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className={`text-sm font-black uppercase tracking-widest text-text_primary`}>Select UI Personality</h3>
          <div className="grid grid-cols-1 gap-4">
            {(['elite', 'simple', 'minimal'] as ThemeType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`stitch-card p-6 flex items-center justify-between transition-all ${theme.id === t ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:bg-surface'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`size-12 rounded-2xl flex items-center justify-center ${t === 'elite' ? 'bg-primary/10 text-primary' : t === 'simple' ? 'bg-success/10 text-success' : 'bg-surface text-text_secondary'}`}>
                    {t === 'elite' ? <Zap size={24} /> : t === 'simple' ? <Sparkles size={24} /> : <Target size={24} />}
                  </div>
                  <div className="text-left">
                    <div className={`font-black uppercase tracking-widest ${theme.id === t ? 'text-primary' : 'text-text_primary'}`}>
                      {t === 'elite' ? 'Elite AI' : t === 'simple' ? 'Simple & Friendly' : 'Minimal Clean'}
                    </div>
                    <div className="text-[10px] font-medium text-text_secondary">
                      {t === 'elite' ? 'Futuristic, powerful, system-driven' : t === 'simple' ? 'Friendly, motivating, easy' : 'Clean, focused, distraction-free'}
                    </div>
                  </div>
                </div>
                {theme.id === t && (
                  <div className="size-6 bg-primary rounded-full flex items-center justify-center text-black">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="stitch-card p-6 border-border space-y-6">
          <h3 className={`text-sm font-black uppercase tracking-widest text-text_primary`}>Account Protocol</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text_secondary">
                  <UserIcon size={20} />
                </div>
                <div>
                  <div className={`text-xs font-black uppercase tracking-widest text-text_primary`}>Neural ID</div>
                  <div className="text-[10px] font-medium text-text_secondary">{user?.email}</div>
                </div>
              </div>
              <button onClick={logout} className="text-[10px] font-black uppercase tracking-widest text-danger hover:brightness-110">De-Authorize</button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Shield size={20} />
                </div>
                <div>
                  <div className={`text-xs font-black uppercase tracking-widest text-text_primary`}>Subscription</div>
                  <div className="text-[10px] font-medium text-text_secondary">{user?.subscription_plan === 'premium' ? 'Elite Access Active' : 'Standard Protocol'}</div>
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
        const now = new Date();
        setMissions(data.map((m: any) => {
          let status = m.status;
          if (status === 'pending' && m.deadline && new Date(m.deadline) < now) {
            status = 'overdue';
          }
          
          return {
            ...m,
            status,
            impact: m.importance >= 8 ? 'critical' : m.importance >= 6 ? 'high' : m.importance >= 4 ? 'moderate' : 'low',
            urgency: m.importance
          };
        }));
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
    // Optimistic UI update
    setMissions(prev => prev.map(m => {
      if (m.id === id) {
        const newStatus = m.status === 'completed' ? 'pending' : 'completed';
        return { ...m, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined };
      }
      return m;
    }));

    try {
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

      await fetchMissions();
      await fetchSelfAwareness();
      await fetchNextAction();
      await fetchAiInsights();
      if (timelineMatrix.length > 0) generateSchedule();
    } catch (error) {
      console.error("Toggle error:", error);
      setError("Failed to update mission status.");
      fetchMissions(); // Rollback
    }
  };

  const deleteTask = async (id: number) => {
    // Optimistic UI update
    const originalMissions = [...missions];
    setMissions(prev => prev.filter(m => m.id !== id));

    try {
      const res = await apiFetch(`/api/tasks/${id}`, { 
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Failed to delete task");
      
      await fetchMissions();
      await fetchSelfAwareness();
      await fetchNextAction();
      await fetchAiInsights();
      
      if (activeTab === 'schedule') {
        generateSchedule();
      }
    } catch (error) {
      console.error("Delete error:", error);
      setError("Could not delete task. Please try again.");
      setMissions(originalMissions); // Rollback
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-2xl p-8 border border-danger/30 shadow-2xl">
          <div className="flex items-center gap-3 text-danger mb-6">
            <AlertCircle className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-text_primary">Connection Issue</h1>
          </div>
          
          <div className="space-y-4 text-text_secondary mb-8">
            <p className="text-sm leading-relaxed">
              We're having trouble reaching your Firestore database. If you just set up Firebase, a <strong>full page refresh</strong> may be required.
            </p>
            <div className="bg-background p-3 rounded-lg font-mono text-xs text-danger break-all border border-border">
              {error}
            </div>
            
            <div className="pt-4 space-y-3">
              <p className="text-sm font-semibold text-text_primary">Troubleshooting Steps:</p>
              <ul className="list-disc list-inside text-xs space-y-2 opacity-80">
                <li><strong>Refresh the page</strong> (Ctrl+R or Cmd+R).</li>
                <li>Ensure the database is created in the <a href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data`} target="_blank" className="text-primary underline">Firestore Console</a>.</li>
                <li>Check if your internet connection is stable.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-primary text-black rounded-xl font-medium transition-colors hover:brightness-110"
            >
              Refresh & Retry
            </button>
            <button 
              onClick={clearSession}
              className="w-full py-3 bg-surface hover:bg-surface/80 text-text_primary rounded-xl font-medium transition-colors border border-border"
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
      <div className={`min-h-screen text-text_primary font-sans selection:bg-primary/30 bg-background ${theme.id === 'elite' ? 'grid-background' : ''}`}>
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
            className="fixed inset-0 z-[110] bg-background flex items-center justify-center p-4 md:p-6 grid-background overflow-y-auto"
          >
            <div className="max-w-md w-full stitch-card p-6 md:p-12 text-center space-y-6 md:space-y-10 border-border bg-surface my-auto">
              <div className="size-16 md:size-24 bg-primary/10 rounded-[24px] md:rounded-[32px] flex items-center justify-center mx-auto text-primary shadow-inner border border-primary/20">
                <Sparkles size={32} className="md:hidden" />
                <Sparkles size={48} className="hidden md:block" />
              </div>
              
              <div className="space-y-2 md:space-y-3">
                <h2 className={`text-3xl md:text-5xl font-black tracking-tighter text-text_primary`}>{authMode === 'login' ? 'System Login' : 'Initialize Pilot'}</h2>
                <p className="text-text_secondary font-medium text-base md:text-lg">Elevate your cognitive architecture with AI.</p>
              </div>

              <form onSubmit={authMode === 'login' ? login : signup} className="space-y-4 md:space-y-5">
                <input 
                  type="email" 
                  placeholder="Neural ID (Email)" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-2xl px-4 py-3 md:px-8 md:py-5 focus:border-primary/50 transition-all outline-none font-bold text-lg placeholder:text-text_secondary/30 text-text_primary"
                  required
                />
                <input 
                  type="password" 
                  placeholder="Access Key (Password)" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-2xl px-4 py-3 md:px-8 md:py-5 focus:border-primary/50 transition-all outline-none font-bold text-lg placeholder:text-text_secondary/30 text-text_primary"
                  required
                />
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 md:py-6 bg-primary text-black rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 text-sm md:text-base"
                >
                  {loading ? 'Processing...' : (authMode === 'login' ? 'Authorize' : 'Initialize')}
                </button>
              </form>

              <div className="relative py-1 md:py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em]">
                  <span className="bg-surface px-4 md:px-6 text-text_secondary">Secure Protocol</span>
                </div>
              </div>

              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className={`w-full py-4 md:py-5 bg-surface border border-border text-text_primary rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 md:gap-4 hover:bg-surface/80 transition-all text-xs md:text-sm ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <div className="size-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
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
                  className="text-xs md:text-sm font-bold text-text_secondary hover:text-text_primary transition-colors border-b border-border pb-1"
                >
                  {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                </button>
              </div>
              
              {error && <p className="text-danger text-xs md:text-sm font-black uppercase tracking-widest">{error}</p>}
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
            className="fixed inset-0 z-[120] bg-background/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              className="glass-card p-6 md:p-10 max-w-2xl w-full space-y-6 md:space-y-8 border-primary/30 relative overflow-hidden bg-surface"
            >
              <div className="absolute -top-24 -right-24 size-48 bg-primary/20 blur-[60px] rounded-full"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 text-primary">
                    <Sparkles size={18} className="md:hidden" />
                    <Sparkles size={20} className="hidden md:block" />
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em]">Neural Temporal Alignment</span>
                  </div>
                  <h3 className={`text-2xl md:text-4xl font-black tracking-tighter text-text_primary`}>Optimized Matrix</h3>
                </div>
                <button 
                  onClick={() => setShowAiScheduleModal(false)} 
                  className="size-10 md:size-12 flex items-center justify-center rounded-xl md:rounded-2xl bg-surface hover:bg-surface/80 text-text_secondary hover:text-text_primary transition-all border border-border"
                >
                  <X size={20} className="md:hidden" />
                  <X size={24} className="hidden md:block" />
                </button>
              </div>

              <div className="bg-background border border-border rounded-[24px] md:rounded-[32px] p-6 md:p-10 max-h-[50vh] md:max-h-[60vh] overflow-y-auto relative z-10 no-scrollbar shadow-inner">
                <div className="whitespace-pre-wrap text-text_primary leading-relaxed font-medium text-lg md:text-xl italic">
                  "{aiScheduleContent}"
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 relative z-10">
                <button 
                  onClick={() => setShowAiScheduleModal(false)}
                  className="flex-1 py-4 md:py-6 bg-primary text-black rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all text-xs md:text-sm"
                >
                  Confirm Deployment
                </button>
                <button 
                  onClick={() => {
                    setShowAiScheduleModal(false);
                    setActiveTab('schedule');
                  }}
                  className="flex-1 py-4 md:py-6 bg-surface border border-border text-text_primary rounded-2xl font-black uppercase tracking-widest hover:bg-surface/80 transition-all text-xs md:text-sm"
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
            className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-xl flex items-center justify-center p-6 grid-background"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="stitch-card p-6 md:p-12 max-w-lg w-full space-y-6 md:space-y-10 border-border bg-surface"
            >
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className={`text-2xl md:text-4xl font-black tracking-tighter text-text_primary`}>{editingHabit ? 'Refine Habit' : 'Forge Habit'}</h3>
                  <p className="text-text_secondary text-[10px] font-black uppercase tracking-[0.3em]">Neural Pathway Construction</p>
                </div>
                <button onClick={() => setShowHabitModal(false)} className="size-10 rounded-xl bg-background flex items-center justify-center text-text_secondary hover:text-text_primary transition-all border border-border">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={saveHabit} className="space-y-6 md:space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text_secondary ml-1">Habit Designation</label>
                  <input 
                    required
                    value={habitTitle}
                    onChange={(e) => setHabitTitle(e.target.value)}
                    placeholder="e.g., Deep Work Protocol"
                    className="w-full bg-background border border-border rounded-2xl px-4 py-3 md:px-8 md:py-5 focus:border-primary/50 transition-all outline-none font-bold text-lg placeholder:text-text_secondary/30 text-text_primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text_secondary ml-1">Strategic Intent</label>
                  <textarea 
                    value={habitDesc}
                    onChange={(e) => setHabitDesc(e.target.value)}
                    placeholder="Define the purpose of this neural pathway..."
                    className="w-full bg-background border border-border rounded-2xl px-4 py-3 md:px-8 md:py-5 focus:border-primary/50 transition-all outline-none h-32 resize-none font-bold text-lg placeholder:text-text_secondary/30 text-text_primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text_secondary ml-1">Cycle Frequency</label>
                    <select 
                      value={habitFreq}
                      onChange={(e) => setHabitFreq(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-2xl px-4 py-3 md:px-8 md:py-5 focus:border-primary/50 transition-all outline-none appearance-none font-bold cursor-pointer text-text_primary"
                    >
                      <option value="daily" className="bg-surface">Daily Cycle</option>
                      <option value="weekly" className="bg-surface">Weekly Cycle</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text_secondary ml-1">Target Intensity</label>
                    <input 
                      type="number"
                      min="1"
                      required
                      value={habitGoal}
                      onChange={(e) => setHabitGoal(parseInt(e.target.value))}
                      className="w-full bg-background border border-border rounded-2xl px-4 py-3 md:px-8 md:py-5 focus:border-primary/50 transition-all outline-none font-bold text-text_primary"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 md:py-6 bg-primary text-black rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : editingHabit ? 'Update Pathway' : 'Forge Pathway'}
                  </button>

                  {editingHabit && (
                    <button 
                      type="button"
                      onClick={() => { deleteHabit(editingHabit.id); setShowHabitModal(false); }}
                      className="w-full py-3 md:py-5 bg-surface text-danger rounded-2xl font-black uppercase tracking-widest hover:bg-danger/10 transition-all border border-border"
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
            className="fixed inset-0 z-[105] bg-background/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-6 grid-background overflow-y-auto"
          >
            <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 my-auto">
              <div className="stitch-card p-6 md:p-12 space-y-4 md:space-y-8 border-border bg-surface">
                <div className="space-y-2">
                  <h3 className={`text-xl md:text-3xl font-black tracking-tighter text-text_primary`}>Standard Tier</h3>
                  <p className="text-text_secondary font-medium text-sm md:text-base">Foundational cognitive support.</p>
                </div>
                <div className={`text-4xl md:text-6xl font-black tracking-tighter text-text_primary`}>₹0 <span className="text-[10px] md:text-sm font-black text-text_secondary uppercase tracking-widest">/ Lifetime</span></div>
                <ul className="space-y-3 md:space-y-5 pt-4 md:pt-6">
                  {['Basic Tactical Matrix', 'Standard Timeline Flow', 'Limited Habit Forge (3)', 'Neural Notifications'].map(f => (
                    <li key={f} className="flex items-center gap-3 md:gap-4 text-text_secondary font-bold text-sm md:text-base">
                      <CheckCircle2 size={18} className="text-text_secondary/50 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => setShowPricing(false)}
                  className="w-full py-4 md:py-6 bg-surface border border-border rounded-2xl font-black uppercase tracking-widest text-text_secondary cursor-default text-xs md:text-sm"
                >
                  Current Protocol
                </button>
              </div>

              <div className="stitch-card p-6 md:p-12 space-y-4 md:space-y-8 border-primary/30 relative overflow-hidden bg-gradient-to-br from-primary/10 via-surface to-surface shadow-2xl shadow-primary/10">
                <div className="absolute top-4 right-4 md:top-6 md:right-6 bg-primary text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] px-3 md:px-4 py-1 md:py-1.5 rounded-full text-black">Elite Access</div>
                <div className="space-y-2">
                  <h3 className={`text-xl md:text-3xl font-black tracking-tighter text-text_primary`}>Premium Tier</h3>
                  <p className="text-text_secondary font-medium text-sm md:text-base">Full neural architecture unlock.</p>
                </div>
                <div className="text-4xl md:text-6xl font-black tracking-tighter text-primary">₹499 <span className="text-[10px] md:text-sm font-black text-text_secondary uppercase tracking-widest">/ Monthly</span></div>
                <ul className="space-y-3 md:space-y-5 pt-4 md:pt-6">
                  {['AI Neural Re-Routing', 'Advanced Performance Analytics', 'Unlimited Matrix Capacity', 'AI Cognitive Insights', 'Tactical Student Mode'].map(f => (
                    <li key={f} className="flex items-center gap-3 md:gap-4 text-text_primary font-bold text-sm md:text-base">
                      <CheckCircle2 size={18} className="text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => initiatePayment(499)}
                  className="w-full py-4 md:py-6 bg-primary text-black rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all text-xs md:text-sm"
                >
                  Upgrade Protocol
                </button>
                <button 
                  onClick={() => setShowPricing(false)}
                  className="w-full text-center text-[8px] md:text-[10px] font-black uppercase tracking-widest text-text_secondary hover:text-text_primary transition-all pt-2"
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
      <header className={`flex items-center justify-between p-4 md:p-6 max-w-6xl mx-auto sticky top-0 z-40 backdrop-blur-2xl border-b w-full bg-background/80 border-border`}>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="size-8 md:size-10 rounded-lg md:rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="text-black md:hidden" size={16} />
            <Sparkles className="text-black hidden md:block" size={20} />
          </div>
          <h1 className={`text-lg md:text-2xl font-black tracking-tighter text-text_primary`}>LifePilot <span className="text-primary">AI</span></h1>
          {user?.subscription_plan === 'premium' && (
            <span className="bg-primary/10 text-primary text-[7px] md:text-[8px] font-black uppercase tracking-widest px-1.5 md:px-2 py-0.5 md:py-1 rounded-md border border-primary/20">Premium</span>
          )}
        </div>
        <div className="flex gap-3 md:gap-4 items-center">
          <button 
            onClick={() => setShowAiPanel(!showAiPanel)}
            className={`size-8 md:size-10 flex items-center justify-center rounded-lg md:rounded-xl border transition-all relative bg-surface border-border text-text_secondary hover:text-text_primary`}
          >
            <Brain size={18} className="md:hidden" />
            <Brain size={20} className="hidden md:block" />
            <span className={`absolute top-2 right-2 md:top-2.5 md:right-2.5 size-1.5 md:size-2 bg-primary rounded-full`}></span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`size-8 md:size-10 flex items-center justify-center rounded-lg md:rounded-xl border transition-all bg-surface border-border text-text_secondary hover:text-text_primary`}
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
          {activeTab === 'habits' && renderHabits()}
          {activeTab === 'schedule' && renderTimelineMatrix()}
          {activeTab === 'analytics' && renderSelfAwareness()}
          {activeTab === 'settings' && renderSettings()}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[94%] sm:w-[90%] max-w-lg">
        <div className={`stitch-card p-1.5 sm:p-2 flex items-center justify-between shadow-2xl backdrop-blur-3xl rounded-[32px] bg-surface border-border`}>
          {[
            { id: 'home', icon: LayoutDashboard, label: theme.wording.dashboard.split(' ')[0] },
            { id: 'tasks', icon: Target, label: theme.wording.missions.split(' ')[0] },
            { id: 'habits', icon: Dumbbell, label: 'Habits' },
            { id: 'schedule', icon: Clock, label: theme.wording.timeline.split(' ')[0] },
            { id: 'analytics', icon: Brain, label: theme.wording.awareness.split(' ')[0] },
            { id: 'settings', icon: Settings, label: 'Style' },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 sm:gap-1.5 px-3 sm:px-6 py-3 sm:py-4 rounded-[24px] sm:rounded-[28px] transition-all duration-500 ${
                activeTab === item.id ? 'bg-primary text-black shadow-xl shadow-primary/20 scale-105' : 'text-text_secondary hover:text-text_primary hover:bg-surface'
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
