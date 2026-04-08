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
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { GoogleGenAI, Type } from "@google/genai";
import { useTheme, ThemeType } from './theme';
import { 
  getMotivationState, 
  updateDailyScore, 
  checkStreaks, 
  generateBehaviorInsight, 
  handleRecoveryMode, 
  logReminder,
  MOTIVATION_MESSAGES,
  MotivationState
} from './services/motivationService';

interface Mission {
  id: string;
  title: string;
  impact: 'low' | 'moderate' | 'high' | 'critical';
  urgency: number;
  urgency_score?: number;
  estimated_effort?: number;
  impact_level?: number;
  duration: number;
  deadline?: any;
  is_habit: boolean;
  streak: number;
  status: 'pending' | 'completed' | 'overdue';
  category: string;
  startTime?: string;
  endTime?: string;
  completed_at?: any;
  created_at: any;
}

const toDate = (val: any): Date => {
  if (!val) return new Date(0);
  if (val instanceof Date) return val;
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date(val);
};

const isToday = (val: any): boolean => {
  const d = toDate(val);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};

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
  id: string;
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
          const msg = this.state.error.message;
          if (msg.includes('insufficient permissions')) {
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
  const [firebaseUser, authLoading, authError] = useAuthState(auth);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('lifepilot_token'));
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPricing, setShowPricing] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // Firestore Collections
  const tasksRef = firebaseUser ? collection(db, 'users', firebaseUser.uid, 'tasks') : null;
  const habitsRef = firebaseUser ? collection(db, 'users', firebaseUser.uid, 'habits') : null;
  const goalsRef = firebaseUser ? collection(db, 'users', firebaseUser.uid, 'goals') : null;
  const insightsRef = firebaseUser ? collection(db, 'users', firebaseUser.uid, 'ai_insights') : null;

  const [dbTasks, tasksLoading, tasksError] = useCollection(tasksRef ? query(tasksRef, orderBy('created_at', 'desc')) : null);
  const [dbHabits, habitsLoading, habitsError] = useCollection(habitsRef ? query(habitsRef, orderBy('created_at', 'desc')) : null);
  const [dbGoals, goalsLoading, goalsError] = useCollection(goalsRef ? query(goalsRef, orderBy('created_at', 'desc')) : null);
  const [dbInsights, insightsLoading, insightsError] = useCollection(insightsRef ? query(insightsRef, orderBy('created_at', 'desc'), limit(10)) : null);

  const [missions, setMissions] = useState<Mission[]>([]);
  const [nextAction, setNextAction] = useState<Mission | null>(null);
  const [motivationQuote, setMotivationQuote] = useState("Your potential is limited only by your focus.");
  const [focusTask, setFocusTask] = useState<Mission | null>(null);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [goalsState, setGoalsState] = useState<any[]>([]);
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
  const [motivationState, setMotivationState] = useState<MotivationState | null>(null);
  const [dailyScore, setDailyScore] = useState<number>(0);
  const [microReward, setMicroReward] = useState<string | null>(null);
  const [activeReminder, setActiveReminder] = useState<string | null>(null);
  const [lastInteractionTime, setLastInteractionTime] = useState<number>(Date.now());

  // Sync Firestore data to state
  useEffect(() => {
    if (dbTasks) setMissions(dbTasks.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as Mission)));
    if (dbHabits) setConsistencySystem(dbHabits.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as Habit)));
    if (dbGoals) setGoalsState(dbGoals.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    if (dbInsights) setAiInsights(dbInsights.docs.map(doc => ({ ...doc.data(), id: doc.id })));
  }, [dbTasks, dbHabits, dbGoals, dbInsights]);

  // Fetch motivation state
  useEffect(() => {
    if (firebaseUser) {
      getMotivationState(firebaseUser.uid).then(setMotivationState);
    }
  }, [firebaseUser]);

  // Update streaks and score
  useEffect(() => {
    if (firebaseUser && missions.length > 0) {
      checkStreaks(firebaseUser.uid, missions).then(streaks => {
        if (motivationState) {
          setMotivationState({ ...motivationState, ...streaks });
        }
      });
      
      const focusMins = selfAwareness?.focusTimeMinutes || 0;
      updateDailyScore(firebaseUser.uid, missions, focusMins).then(setDailyScore);
    }
  }, [firebaseUser, missions, selfAwareness]);

  // AI Insight Generation
  useEffect(() => {
    const generateInsight = async () => {
      if (firebaseUser && Math.random() > 0.7) {
        const insight = await generateBehaviorInsight(firebaseUser.uid);
        if (insight) {
          setMotivationQuote(insight);
        }
      }
    };
    generateInsight();
  }, [firebaseUser]);

  // Adaptive Reminders & Escalation Logic
  useEffect(() => {
    if (!firebaseUser || !nextAction) return;

    const checkInactivity = async () => {
      const now = Date.now();
      const inactiveTime = now - lastInteractionTime;
      
      // Level 1: Gentle Reminder (10 mins inactivity)
      if (inactiveTime > 600000 && inactiveTime < 610000) {
        const msg = MOTIVATION_MESSAGES.ESCALATION[0].text;
        setActiveReminder(msg);
        logReminder(firebaseUser.uid, nextAction.id, 'start_now');
      }
      
      // Level 2: Direct Action Prompt (20 mins inactivity)
      if (inactiveTime > 1200000 && inactiveTime < 1210000) {
        const msg = MOTIVATION_MESSAGES.ESCALATION[1].text;
        setActiveReminder(msg);
        logReminder(firebaseUser.uid, nextAction.id, 'start_now');
      }
      
      // Level 3: Simplified Protocol (30 mins inactivity)
      if (inactiveTime > 1800000 && inactiveTime < 1810000) {
        const msg = MOTIVATION_MESSAGES.ESCALATION[2].text;
        setActiveReminder(msg);
        logReminder(firebaseUser.uid, nextAction.id, 'start_now');
        
        // Trigger Recovery Mode if not already active
        handleRecoveryMode(firebaseUser.uid, 3).then(active => {
          if (active && motivationState) {
            setMotivationState({ ...motivationState, recovery_mode: true });
          }
        });
      }
    };

    const interval = setInterval(checkInactivity, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [firebaseUser, nextAction, lastInteractionTime, motivationState]);

  // Track interactions
  useEffect(() => {
    const handleInteraction = () => {
      setLastInteractionTime(Date.now());
      setActiveReminder(null);
    };
    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  useEffect(() => {
    if (!authLoading) {
      setIsAuthReady(true);
      if (firebaseUser) {
        setUser({ id: 1, email: firebaseUser.email || '', plan: 'free' });
        // Fetch profile
        const userDoc = doc(db, 'users', firebaseUser.uid);
        getDocFromServer(userDoc).then(snap => {
          if (snap.exists()) {
            setUserProfile(snap.data());
          } else {
            // Create profile if not exists
            const initialProfile = {
              firebase_uid: firebaseUser.uid,
              email: firebaseUser.email,
              subscription_plan: 'trial',
              role: 'user',
              created_at: serverTimestamp()
            };
            setDoc(userDoc, initialProfile).catch(err => {
              handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
            });
            setUserProfile(initialProfile);
          }
        }).catch(err => {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        });
      } else {
        setUser(null);
      }
    }
  }, [firebaseUser, authLoading]);

  useEffect(() => {
    if (missions.length > 0) {
      fetchNextAction();
    }
  }, [missions]);

  useEffect(() => {
    const quotes = [
      "Your potential is limited only by your focus.",
      "Discipline is the bridge between goals and accomplishment.",
      "The only way to do great work is to love what you do.",
      "Success is not final, failure is not fatal: it is the courage to continue that counts.",
      "Don't watch the clock; do what it does. Keep going.",
      "The future depends on what you do today.",
      "Action is the foundational key to all success."
    ];
    setMotivationQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    
    const interval = setInterval(() => {
      setMotivationQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, 3600000); // Change quote every hour

    return () => clearInterval(interval);
  }, []);

  const handleAction = async (type: string, payload: any = {}) => {
    if (!firebaseUser) {
      setShowAuth(true);
      return;
    }

    // Sanitize payload to remove undefined values which Firestore doesn't support
    const sanitize = (obj: any) => {
      const newObj: any = {};
      const allowed = [
        'id', 'title', 'importance', 'urgency_score', 'estimated_effort', 'impact_level', 
        'duration', 'deadline', 'category', 'status', 'is_habit', 'streak', 
        'completed_at', 'created_at', 'startTime', 'endTime', 'updated_at', 'data',
        'firebase_uid', 'email', 'subscription_plan', 'role', 'trial_used',
        'description', 'frequency', 'goal_count', 'current_count', 'last_completed_at',
        'type', 'target_date', 'start_time', 'end_time', 'duration_minutes', 
        'distractions_count', 'efficiency_score', 'insight_text', 'is_read'
      ];
      Object.keys(obj).forEach(key => {
        if (allowed.includes(key) && obj[key] !== undefined) {
          newObj[key] = obj[key];
        }
      });
      return newObj;
    };

    const cleanPayload = sanitize(payload);

    try {
      switch (type) {
        case 'ADD_TASK': {
          if (!tasksRef) return;
          try {
            await addDoc(tasksRef, {
              ...cleanPayload,
              user_id: firebaseUser.uid,
              status: 'pending',
              created_at: serverTimestamp(),
              streak: 0,
              is_habit: cleanPayload.is_habit || false
            });
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'tasks');
          }
          break;
        }
        case 'COMPLETE_TASK': {
          if (!tasksRef) return;
          try {
            const taskDoc = doc(tasksRef, cleanPayload.id);
            await updateDoc(taskDoc, {
              status: 'completed',
              completed_at: serverTimestamp(),
              streak: (cleanPayload.streak || 0) + 1
            });
            
            // Motivation Engine Integration
            if (firebaseUser) {
              const focusMins = selfAwareness?.focusTimeMinutes || 0;
              const newScore = await updateDailyScore(firebaseUser.uid, missions, focusMins);
              setDailyScore(newScore);
              
              // Micro-reward
              const msg = MOTIVATION_MESSAGES.REWARDS[Math.floor(Math.random() * MOTIVATION_MESSAGES.REWARDS.length)];
              setMicroReward(msg);
              setTimeout(() => setMicroReward(null), 3000);

              // Recovery mode check
              if (motivationState?.recovery_mode) {
                const stateDoc = doc(db, 'users', firebaseUser.uid, 'motivation', 'state');
                const newCompletions = motivationState.recovery_completions + 1;
                if (newCompletions >= 2) {
                  await updateDoc(stateDoc, { recovery_mode: false, recovery_completions: 0 });
                  setMotivationState({ ...motivationState, recovery_mode: false, recovery_completions: 0 });
                } else {
                  await updateDoc(stateDoc, { recovery_completions: newCompletions });
                  setMotivationState({ ...motivationState, recovery_completions: newCompletions });
                }
              }
            }

            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `tasks/${cleanPayload.id}`);
          }
          break;
        }
        case 'UPDATE_TASK': {
          if (!tasksRef) return;
          const taskDoc = doc(tasksRef, cleanPayload.id);
          await updateDoc(taskDoc, {
            ...sanitize(cleanPayload.data || {}),
            updated_at: serverTimestamp()
          });
          break;
        }
        case 'DELETE_TASK': {
          if (!tasksRef) return;
          await deleteDoc(doc(tasksRef, cleanPayload.id));
          break;
        }
        case 'PILOT_MY_DAY': {
          await generateDayPlan();
          break;
        }
        case 'GENERATE_INSIGHTS': {
          await generateAiInsights();
          break;
        }
        case 'START_FOCUS': {
          setFocusTask(cleanPayload.task);
          break;
        }
        case 'STOP_FOCUS': {
          setFocusTask(null);
          break;
        }
        case 'TOGGLE_HABIT': {
          if (!habitsRef) return;
          const habitDoc = doc(habitsRef, cleanPayload.id);
          await updateDoc(habitDoc, {
            current_count: (cleanPayload.current_count || 0) + 1,
            last_completed_at: serverTimestamp(),
            streak: (cleanPayload.streak || 0) + 1
          });
          confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
          break;
        }
        case 'ADD_HABIT': {
          if (!habitsRef) return;
          await addDoc(habitsRef, {
            ...cleanPayload,
            user_id: firebaseUser.uid,
            current_count: 0,
            streak: 0,
            created_at: serverTimestamp()
          });
          break;
        }
        case 'DELETE_HABIT': {
          if (!habitsRef) return;
          await deleteDoc(doc(habitsRef, cleanPayload.id));
          break;
        }
        case 'UPDATE_HABIT': {
          if (!habitsRef) return;
          const habitDoc = doc(habitsRef, cleanPayload.id);
          await updateDoc(habitDoc, {
            ...cleanPayload,
            updated_at: serverTimestamp()
          });
          break;
        }
        default:
          console.warn(`Unhandled action type: ${type}`);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, type);
    }
  };

  const generateDayPlan = async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `As an AI Life Architect, analyze these tasks and create a high-performance schedule for today.
    Tasks: ${JSON.stringify(missions)}
    User Profile: ${JSON.stringify(userProfile)}
    Return a JSON array of tasks with suggested start and end times.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const plan = JSON.parse(response.text);
      // Update tasks with times in Firestore
      if (tasksRef && Array.isArray(plan)) {
        for (const item of plan) {
          const existing = missions.find(m => m.title === item.title);
          if (existing && item.startTime && item.endTime) {
            try {
              const updateData: any = {
                updated_at: serverTimestamp()
              };
              if (item.startTime) updateData.startTime = String(item.startTime);
              if (item.endTime) updateData.endTime = String(item.endTime);
              
              await updateDoc(doc(tasksRef, existing.id), updateData);
            } catch (err) {
              console.error(`Failed to update task ${existing.id}:`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error("AI Day Planning failed:", err);
    }
  };

  const generateAiInsights = async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Analyze user performance data and provide 3 actionable, high-impact insights.
    Data: ${JSON.stringify({ missions, consistencySystem, lifeState })}
    Return a JSON array of objects with { insight_text, type }.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const insights = JSON.parse(response.text);
      if (insightsRef && Array.isArray(insights)) {
        for (const insight of insights) {
          await addDoc(insightsRef, {
            ...insight,
            user_id: firebaseUser?.uid,
            is_read: false,
            created_at: serverTimestamp()
          });
        }
      }
    } catch (err) {
      console.error("AI Insight generation failed:", err);
    }
  };

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

  const startEdit = (mission: Mission) => {
    setEditingMission(mission);
    setTitle(mission.title);
    setUrgencyScore(mission.urgency_score || 5);
    setEstimatedEffort(mission.estimated_effort || 3);
    setImpactLevel(mission.impact_level || 5);
    setDuration(mission.duration || 30);
    setDeadline(mission.deadline ? toDate(mission.deadline).toISOString().slice(0, 16) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
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
  const [showNotifications, setShowNotifications] = useState(false);

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
      if (!firebaseUser) {
        setShowAuth(true);
      }
    }
    
    // Request notification permission
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, [firebaseUser, isAuthReady]);

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
          const deadlineDate = toDate(task.deadline);
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
    if (missions.length === 0 && firebaseUser) {
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
        
        await handleAction('ADD_TASK', {
          title,
          importance: 8,
          impact_level: 8,
          urgency_score: 5,
          estimated_effort: 3,
          duration: 60,
          is_habit: onboardingData.mission === 'habits',
          category: onboardingData.mission === 'physical' ? 'health' : 'work'
        });
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

  const resetForm = () => {
    setTitle('');
    setUrgencyScore(5);
    setEstimatedEffort(3);
    setImpactLevel(5);
    setDuration(30);
    setDeadline('');
    setEditingMission(null);
  };

  const resetHabitForm = () => {
    setHabitTitle('');
    setHabitDesc('');
    setHabitFreq('daily');
    setHabitGoal(1);
    setEditingHabit(null);
  };

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

  const LifeStateEngine = () => {
    const todayMissions = missions.filter(m => 
      isToday(m.created_at) || 
      (m.deadline && isToday(m.deadline)) || 
      (m.completed_at && isToday(m.completed_at))
    );
    const completedToday = todayMissions.filter(m => m.status === 'completed' && m.completed_at && isToday(m.completed_at)).length;
    const totalToday = todayMissions.length;
    const efficiency = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
    
    // Motivation Engine Score
    const displayScore = dailyScore || efficiency;

    return (
      <div className="flex flex-col items-center py-8 sm:py-12">
        <div className="diamond-container mb-8 sm:mb-12">
          {/* Outer Glows */}
          <div className={`diamond-glow scale-110 opacity-50 ${displayScore > 80 ? 'bg-success' : displayScore > 50 ? 'bg-primary' : 'bg-danger'}`} />
          
          {/* Main Shape */}
          <div className={`absolute inset-0 border-2 border-primary/30 ${theme.id === 'elite' ? 'rotate-45 rounded-xl' : theme.id === 'simple' ? 'rounded-full' : 'rounded-lg'} transition-all duration-500`} 
               style={{ background: theme.id === 'elite' ? 'radial-gradient(circle at center, rgba(var(--color-primary-rgb, 0, 242, 255), 0.1), transparent)' : 'transparent' }} />
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-1">Daily Drive</span>
            <div className="flex items-baseline">
              <span className={`text-5xl sm:text-7xl font-black tracking-tighter text-text_primary`}>{displayScore}</span>
              <span className="text-xl sm:text-2xl font-bold text-primary/60 ml-1">%</span>
            </div>
            <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
              <div className={`size-1.5 bg-primary rounded-full ${theme.animations.type !== 'minimal' ? 'animate-pulse' : ''}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                {motivationState?.recovery_mode ? 'Recovery Mode' : displayScore > 80 ? 'Optimal' : displayScore > 50 ? 'Stable' : 'Low Power'}
              </span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-xs text-center space-y-4">
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-secondary">
                <Flame size={16} fill="currentColor" />
                <span className="text-lg font-black">{motivationState?.current_streak || 0}</span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-text_secondary">Streak</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-primary">
                <Zap size={16} fill="currentColor" />
                <span className="text-lg font-black">{motivationState?.focus_streak || 0}</span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-text_secondary">Focus</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-text_secondary">
              <Brain className="size-3 text-primary" />
              Neural Insight
            </div>
            <p className="text-sm font-medium text-text_primary leading-relaxed">
              {motivationQuote}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const MissionCard: React.FC<{ mission: Mission }> = ({ mission }) => {
    const impactColor = mission.impact === 'critical' ? 'text-danger' : mission.impact === 'high' ? 'text-primary' : 'text-secondary';
    const buttonClass = mission.status === 'completed' ? 'mission-button-completed' : mission.impact === 'critical' ? 'mission-button-critical' : mission.impact === 'high' ? 'mission-button-high' : 'mission-button-moderate';

    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirmDelete) {
        handleAction('DELETE_TASK', { id: mission.id });
      } else {
        setConfirmDelete(true);
        setTimeout(() => setConfirmDelete(false), 3000);
      }
    };

    return (
      <motion.div 
        layout
        whileHover={{ scale: 1.01, borderColor: 'var(--color-primary)' }}
        initial={theme.animations.type !== 'minimal' ? { opacity: 0, y: 20 } : { opacity: 1 }}
        animate={{ opacity: 1, y: 0 }}
        className={`stitch-card p-4 sm:p-6 group relative overflow-hidden transition-all border-transparent hover:border-primary/30 ${mission.status === 'completed' ? 'opacity-60 grayscale-[0.5]' : ''}`}
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
                {toDate(mission.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          {mission.status === 'completed' && mission.completed_at && (
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle2 size={14} />
              <span className="text-xs font-medium">
                Completed {toDate(mission.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

          <div className="flex items-center gap-2">
            {mission.status !== 'completed' && (
              <button 
                onClick={() => handleAction('COMPLETE_TASK', { id: mission.id, streak: mission.streak })}
                className="size-10 md:size-12 rounded-xl md:rounded-2xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all"
              >
                <CheckCircle2 size={20} />
              </button>
            )}
            <button 
              onClick={() => handleAction('START_FOCUS', { task: mission })}
              className="size-11 rounded-xl bg-surface border border-border text-text_secondary flex items-center justify-center hover:text-primary hover:border-primary/30 transition-all"
            >
              <Zap size={18} />
            </button>
          </div>
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

  const getGrowthData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      return d;
    });

    return last7Days.map(date => {
      const dayName = days[date.getDay()];
      const dayMissions = missions.filter(m => {
        const missionDate = toDate(m.created_at);
        return missionDate.toDateString() === date.toDateString();
      });
      
      const completedCount = missions.filter(m => 
        m.status === 'completed' && 
        m.completed_at && 
        toDate(m.completed_at).toDateString() === date.toDateString()
      ).length;
      
      // Calculate a score based on completion rate and impact
      const totalImpact = dayMissions.reduce((acc, m) => acc + (m.impact_level || 5), 0);
      const completedImpact = missions.filter(m => 
        m.status === 'completed' && 
        m.completed_at && 
        toDate(m.completed_at).toDateString() === date.toDateString()
      ).reduce((acc, m) => acc + (m.impact_level || 5), 0);

      const score = dayMissions.length > 0 ? Math.round((completedImpact / totalImpact) * 100) : 0;
      return { day: dayName, score: Math.max(score, completedCount > 0 ? 20 : 0) };
    });
  };

  const getConsistencyPulse = () => {
    if (consistencySystem.length === 0) return Array.from({ length: 12 }, () => 20);
    
    const base = (consistencySystem.reduce((acc, h) => acc + (h.current_count / h.goal_count), 0) / consistencySystem.length) * 100;
    
    return Array.from({ length: 12 }, (_, i) => {
      const noise = Math.sin(i + Date.now() / 100000) * 10;
      return Math.max(20, Math.min(100, base + noise));
    });
  };

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
                  onClick={() => handleAction('TOGGLE_HABIT', { id: habit.id, current_count: habit.current_count, streak: habit.streak })}
                  className={`size-10 rounded-xl flex items-center justify-center transition-all ${habit.current_count >= habit.goal_count ? 'bg-success/20 text-success cursor-default' : 'bg-primary text-black hover:scale-110 shadow-lg shadow-primary/20'}`}
                  disabled={habit.current_count >= habit.goal_count}
                >
                  <Check size={20} strokeWidth={3} />
                </button>
                <button 
                  onClick={() => handleAction('DELETE_HABIT', { id: habit.id })}
                  className="size-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text_secondary hover:text-danger transition-all"
                >
                  <Trash2 size={18} />
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
                  onClick={() => handleAction('COMPLETE_TASK', { id: mission.id, streak: mission.streak })}
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

  const renderSelfAwareness = () => {
    const completedMissions = missions.filter(m => m.status === 'completed');
    const totalMissions = missions.length;
    const cognitiveEfficiency = totalMissions > 0 ? Math.round((completedMissions.length / totalMissions) * 100) : 0;
    
    const habitConsistency = consistencySystem.length > 0 ? 
      Math.round((consistencySystem.reduce((acc, h) => acc + (h.current_count / h.goal_count), 0) / consistencySystem.length) * 100) : 0;

    return (
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
            <div className="text-4xl sm:text-6xl font-black tracking-tighter text-primary">{cognitiveEfficiency}%</div>
            <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
              <div className="h-full bg-primary shadow-[0_0_10px_var(--color-primary)]" style={{ width: `${cognitiveEfficiency}%` }} />
            </div>
          </div>
          <div className="stitch-card p-6 sm:p-10 space-y-4 sm:space-y-6 border-border">
            <div className="text-[10px] font-black text-text_secondary uppercase tracking-widest">{theme.id === 'elite' ? 'Consistency Index' : 'Consistency'}</div>
            <div className="text-4xl sm:text-6xl font-black tracking-tighter text-secondary">{habitConsistency}%</div>
            <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
              <div className="h-full bg-secondary shadow-[0_0_10px_var(--color-secondary)]" style={{ width: `${habitConsistency}%` }} />
            </div>
          </div>
          <div className="stitch-card p-6 sm:p-10 space-y-4 sm:space-y-6 border-border">
            <div className="text-[10px] font-black text-text_secondary uppercase tracking-widest">{theme.id === 'elite' ? 'Focus Resilience' : 'Focus'}</div>
            <div className="text-4xl sm:text-6xl font-black tracking-tighter text-primary">{cognitiveEfficiency > 80 ? 'High' : cognitiveEfficiency > 50 ? 'Med' : 'Low'}</div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-2 flex-1 rounded-full ${i <= Math.ceil(cognitiveEfficiency / 20) ? 'bg-primary shadow-[0_0_10px_var(--color-primary)]' : 'bg-surface'}`} />
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
              <AreaChart data={getGrowthData()}>
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
  };

  const NextActionCard = ({ task, onStartFocus }: { task: Mission | null, onStartFocus: (task: Mission) => void }) => {
    if (!task) return null;
    
    return (
      <div className={`stitch-card p-6 ${motivationState?.recovery_mode ? 'bg-secondary/10 border-secondary/30' : 'bg-primary/10 border-primary/30'} relative overflow-hidden group`}>
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Zap size={80} className={motivationState?.recovery_mode ? 'text-secondary' : 'text-primary'} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className={`px-2 py-0.5 rounded-full ${motivationState?.recovery_mode ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'} text-[10px] font-black uppercase tracking-widest`}>
              {motivationState?.recovery_mode ? 'Recovery Objective' : 'Primary Objective'}
            </div>
            {task.status === 'overdue' && (
              <div className="px-2 py-0.5 rounded-full bg-danger/20 text-[10px] font-black uppercase tracking-widest text-danger">
                Overdue
              </div>
            )}
          </div>
          
          <div className="text-[10px] font-black uppercase tracking-widest text-text_secondary mb-1">Do this now:</div>
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
          </div>
          
          <button 
            onClick={() => handleAction('START_FOCUS', { task })}
            className={`w-full py-4 ${motivationState?.recovery_mode ? 'bg-secondary' : 'bg-primary'} text-black font-black uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg ${motivationState?.recovery_mode ? 'shadow-secondary/30' : 'shadow-primary/30'}`}
          >
            <Play size={18} fill="currentColor" />
            Engage Focus Mode
          </button>
        </div>
      </div>
    );
  };

  const AiPanel = () => {
    const [query, setQuery] = useState('');
    const [chat, setChat] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const askAi = async () => {
      if (!query.trim()) return;
      const userMsg = query;
      setQuery('');
      setChat(prev => [...prev, { role: 'user', text: userMsg }]);
      setIsGenerating(true);

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `User Query: ${userMsg}\nContext: ${JSON.stringify({ missions, consistencySystem, userProfile })}\nAs an AI Life Architect, provide a concise, high-impact response.`,
        });
        setChat(prev => [...prev, { role: 'ai', text: response.text || "I'm processing your request." }]);
      } catch (err) {
        setChat(prev => [...prev, { role: 'ai', text: "Neural link interrupted. Please try again." }]);
      } finally {
        setIsGenerating(false);
      }
    };

    return (
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l border-border z-[150] shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Brain size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tighter text-text_primary">AI Architect</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Neural Sync Active</p>
            </div>
          </div>
          <button onClick={() => setShowAiPanel(false)} className="text-text_secondary hover:text-text_primary">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {chat.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <Sparkles size={48} className="mx-auto text-primary opacity-20" />
              <p className="text-text_secondary font-bold text-sm italic">"How can I optimize your performance today?"</p>
            </div>
          )}
          {chat.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl font-medium text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-black' : 'bg-surface border border-border text-text_primary'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-surface border border-border p-4 rounded-2xl flex gap-1">
                <div className="size-1.5 bg-primary rounded-full animate-bounce" />
                <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border bg-surface">
          <div className="relative">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askAi()}
              placeholder="Ask your AI Architect..."
              className="w-full bg-background border border-border rounded-xl px-4 py-4 pr-12 outline-none focus:border-primary transition-all font-bold text-text_primary"
            />
            <button 
              onClick={askAi}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-10 bg-primary text-black rounded-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const NotificationsPanel = () => {
    return (
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l border-border z-[150] shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
              <Bell size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tighter text-text_primary">Neural Alerts</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary">System Status: Optimal</p>
            </div>
          </div>
          <button onClick={() => setShowNotifications(false)} className="text-text_secondary hover:text-text_primary">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {aiInsights.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <Bell size={48} className="mx-auto text-text_secondary opacity-10" />
              <p className="text-text_secondary font-bold text-sm">No new alerts detected.</p>
            </div>
          ) : (
            aiInsights.map((insight, i) => (
              <div key={i} className="stitch-card p-4 border-border bg-surface flex gap-4">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Zap size={18} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-text_primary">{insight.insight_text}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text_secondary">
                    {toDate(insight.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
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
        handleAction('COMPLETE_TASK', { id: task.id, streak: task.streak });
        handleAction('STOP_FOCUS');
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
              onClick={() => handleAction('STOP_FOCUS')}
              className="px-10 md:px-14 py-5 md:py-7 bg-surface text-text_secondary font-black uppercase tracking-widest rounded-2xl hover:bg-danger/20 hover:text-danger transition-all border border-border"
            >
              Abort Mission
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

  const renderDashboard = () => {
    const todayMissions = missions.filter(m => 
      isToday(m.created_at) || 
      (m.deadline && isToday(m.deadline)) || 
      (m.completed_at && isToday(m.completed_at))
    );
    const completedToday = todayMissions.filter(m => m.status === 'completed' && m.completed_at && isToday(m.completed_at)).length;
    const totalToday = todayMissions.length;
    const dailyEfficiency = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

    return (
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
              <div className={`text-xs font-black uppercase tracking-widest text-text_primary`}>Level {Math.floor(missions.filter(m => m.status === 'completed').length / 5) + 1}</div>
              <div className="w-24 h-1.5 bg-border rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(missions.filter(m => m.status === 'completed').length % 5) * 20}%` }} />
              </div>
            </div>
            <div className={`size-10 md:size-12 rounded-xl md:rounded-2xl flex items-center justify-center text-text_secondary bg-surface border border-border cursor-pointer hover:text-primary transition-all`} onClick={() => setShowNotifications(true)}>
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
              onStartFocus={(task) => handleAction('START_FOCUS', { task })} 
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text_secondary">AI Insight</h2>
              <Brain size={14} className="text-primary cursor-pointer hover:scale-110 transition-transform" onClick={() => handleAction('GENERATE_INSIGHTS')} />
            </div>
            <div className="stitch-card p-4 bg-surface border-l-4 border-primary">
              <p className="text-sm font-bold text-text_primary leading-relaxed">
                {motivationQuote}
              </p>
            </div>
            
            {/* Basic Analytics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-3 border-border">
                <div className="text-[8px] font-black uppercase tracking-widest text-text_secondary mb-1">Done Today</div>
                <div className="text-xl font-black text-text_primary">{completedToday}</div>
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
            onClick={() => handleAction('PILOT_MY_DAY')}
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
            <button onClick={() => setActiveTab('tasks')} className="text-[10px] font-black uppercase tracking-widest text-primary">View All</button>
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
              <div className={`text-base md:text-lg font-bold text-text_primary`}>{Math.round(getConsistencyPulse().reduce((a, b) => a + b, 0) / 12)}% Stability</div>
            </div>
          </div>
          <div className="flex gap-1 h-8 items-end">
            {getConsistencyPulse().map((h, i) => (
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
  };
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

  const fetchNextAction = async () => {
    const pendingTasks = missions.filter(m => m.status === 'pending');
    if (pendingTasks.length === 0) {
      setNextAction(null);
      return;
    }

    // Client-side heuristic first for speed
    const sorted = [...pendingTasks].sort((a, b) => {
      // Priority formula: (Importance * 0.4) + (Impact * 0.4) + (Urgency * 0.2)
      const scoreA = (a.importance * 0.4) + ((a.impact_level || 5) * 0.4) + ((a.urgency_score || 5) * 0.2);
      const scoreB = (b.importance * 0.4) + ((b.impact_level || 5) * 0.4) + ((b.urgency_score || 5) * 0.2);
      return scoreB - scoreA;
    });

    setNextAction(sorted[0]);

    // Optional: Use AI to refine if there are many tasks
    if (pendingTasks.length > 5) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Analyze these tasks and identify the single most important "Next Strategic Action" to take right now.
      Tasks: ${JSON.stringify(pendingTasks.map(t => ({ id: t.id, title: t.title, importance: t.importance, impact: t.impact_level, urgency: t.urgency_score })))}
      User Profile: ${JSON.stringify(userProfile)}
      Return ONLY the JSON object of the selected task ID: { "id": "TASK_ID" }`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        const selected = JSON.parse(response.text);
        if (selected && selected.id) {
          const fullTask = missions.find(m => m.id === selected.id);
          if (fullTask) setNextAction(fullTask);
        }
      } catch (err) {
        console.error("AI Next Action selection failed:", err);
      }
    }
  };

  useEffect(() => {
    if (missions.length > 0) {
      fetchNextAction();
    }
  }, [missions.length]);

  const saveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title,
      importance: urgencyScore,
      urgency_score: urgencyScore,
      estimated_effort: estimatedEffort,
      impact_level: impactLevel,
      duration,
      deadline: deadline ? Timestamp.fromDate(new Date(deadline)) : null,
      category: 'work',
    };

    if (editingMission) {
      await handleAction('UPDATE_TASK', { id: editingMission.id, data: payload });
      setEditingMission(null);
    } else {
      await handleAction('ADD_TASK', payload);
    }
    resetForm();
  };

  const generateSchedule = async () => {
    setLoading(true);
    await handleAction('PILOT_MY_DAY');
    setLoading(false);
  };

  const saveHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;

    const payload = {
      title: habitTitle,
      description: habitDesc,
      frequency: habitFreq,
      goal_count: habitGoal,
    };

    if (editingHabit) {
      await handleAction('UPDATE_HABIT', { id: editingHabit.id, ...payload });
      setEditingHabit(null);
    } else {
      await handleAction('ADD_HABIT', payload);
    }
    setShowHabitModal(false);
    resetHabitForm();
  };

  const completeHabit = async (id: string) => {
    const habit = consistencySystem.find(h => h.id === id);
    if (!habit) return;
    await handleAction('TOGGLE_HABIT', { id, current_count: habit.current_count, streak: habit.streak });
  };

  const deleteHabit = async (id: string) => {
    await handleAction('DELETE_HABIT', { id });
  };

  const generateInsights = async () => {
    setLoading(true);
    await handleAction('GENERATE_INSIGHTS');
    setLoading(false);
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
    if (taskFilter === 'overdue') return task.deadline && toDate(task.deadline) < new Date() && task.status === 'pending';
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
      await handleAction('COMPLETE_TASK', { id: focusTask.id, streak: focusTask.streak });
      setFocusTask(null);
      await generateDayPlan();
      await generateAiInsights();
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

      {/* Smart Reminder Banner */}
      <AnimatePresence>
        {activeReminder && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-20 left-4 right-4 z-[110] glass-card p-4 border-primary bg-primary/10 flex items-center gap-4 shadow-2xl"
          >
            <div className="size-10 rounded-full bg-primary flex items-center justify-center text-black">
              <Zap size={20} />
            </div>
            <div className="flex-1">
              <div className="text-[8px] font-black uppercase tracking-widest text-primary mb-1">Neural Nudge</div>
              <p className="text-sm font-bold text-text_primary">{activeReminder}</p>
            </div>
            <button 
              onClick={() => setActiveReminder(null)}
              className="text-text_secondary hover:text-text_primary"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Micro-reward Toast */}
      <AnimatePresence>
        {microReward && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-primary text-black rounded-full font-black uppercase tracking-widest text-xs shadow-2xl flex items-center gap-3"
          >
            <Sparkles size={16} />
            {microReward}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recovery Mode Banner */}
      <AnimatePresence>
        {motivationState?.recovery_mode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-secondary text-black text-center py-2 text-[10px] font-black uppercase tracking-[0.2em] sticky top-0 z-[120]"
          >
            Recovery Mode Active: Complete 2 tasks to reset system momentum.
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

      <AnimatePresence>
        {showAiPanel && <AiPanel />}
      </AnimatePresence>

      <AnimatePresence>
        {showNotifications && <NotificationsPanel />}
      </AnimatePresence>

      {/* Onboarding Overlay */}
      <AnimatePresence>
        {showOnboarding && renderOnboarding()}
      </AnimatePresence>

      {/* Top Navigation / Header */}
      <header className={`flex items-center justify-between p-4 md:p-6 max-w-6xl mx-auto sticky top-0 z-40 backdrop-blur-2xl border-b w-full bg-background/80 border-border`}>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="size-8 md:size-10 rounded-lg md:rounded-xl bg-[#dedede] flex items-center justify-center shadow-lg shadow-primary/20">
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
              style={{ backgroundColor: item.id === 'home' ? '#a0a0a0' : undefined }}
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
