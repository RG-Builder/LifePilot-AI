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
  Settings as SettingsIcon,
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
  Dumbbell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  auth, 
  db, 
  googleProvider,
  firebaseConfigExport as firebaseConfig
} from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp, 
  orderBy, 
  limit,
  setDoc,
  getDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { useTheme } from './theme';
import { GoogleGenAI } from '@google/genai';
import ErrorBoundary from './components/ErrorBoundary';
import { 
  Mission, 
  Habit, 
  User, 
  Analytics, 
  MotivationState,
  OperationType,
  LifeState,
  HabitStat
} from './types';
import { toDate, isToday, handleFirestoreError, getDocFromServer } from './lib/utils';
import confetti from 'canvas-confetti';

// Service Imports
import { 
  getMotivationState, 
  updateDailyScore, 
  checkStreaks, 
  generateBehaviorInsight, 
  handleRecoveryMode, 
  logReminder,
  MOTIVATION_MESSAGES
} from './services/motivationService';

// Component Imports
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { FocusScreen } from './screens/FocusScreen';
import { TasksScreen } from './screens/TasksScreen';
import { HabitsScreen } from './screens/HabitsScreen';
import { TimelineMatrix } from './components/views/TimelineMatrix';
import { InsightsScreen } from './screens/InsightsScreen';
import { SettingsView } from './components/views/SettingsView';
import { OnboardingOverlay as OnboardingFlow } from './components/onboarding/OnboardingOverlay';
import { AiPanel } from './components/ai/AiPanel';
import { NotificationsPanel } from './components/notifications/NotificationsPanel';
import { FocusMode } from './components/focus/FocusMode';
import { MissionCard } from './components/missions/MissionCard';
import { LifeStateEngine } from './components/dashboard/LifeStateEngine';

import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

const SUPPORT_EMAIL = "lifepilotai.app@gmail.com";

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

  // AI Initialization
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim() || '';
  const getGeminiClient = () => {
    if (!geminiApiKey) {
      setError("AI features are unavailable: missing VITE_GEMINI_API_KEY.");
      return null;
    }
    return new GoogleGenAI({ apiKey: geminiApiKey });
  };
  const MODEL_NAME = "gemini-flash-latest";

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
    if (firebaseUser) {
      setUser({ id: firebaseUser.uid, email: firebaseUser.email || '', plan: 'free' });
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
  }, [firebaseUser, authLoading]);

  useEffect(() => {
    if (missions.length > 0) {
      fetchNextAction();
    }
  }, [missions.length]);

  const handleAction = async (type: string, payload: any = {}) => {
    if (!firebaseUser) {
      setShowAuth(true);
      return;
    }

    // Sanitize payload to remove undefined values which Firestore doesn't support
    const sanitize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return {};
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
    const prompt = `As an AI Life Architect, analyze these tasks and create a high-performance schedule for today.
    Tasks: ${JSON.stringify(missions)}
    User Profile: ${JSON.stringify(userProfile)}
    Return a JSON array of tasks with suggested start and end times.`;

    try {
      const ai = getGeminiClient();
      if (!ai) return;
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const plan = JSON.parse(response.text || '[]');
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
    const prompt = `Analyze user performance data and provide 3 actionable, high-impact insights.
    Data: ${JSON.stringify({ missions, consistencySystem, lifeState })}
    Return a JSON array of objects with { insight_text, type }.`;

    try {
      const ai = getGeminiClient();
      if (!ai) return;
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const insights = JSON.parse(response.text || '[]');
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

  const editHabit = (habit: Habit) => {
    setHabitTitle(habit.title);
    setHabitDesc(habit.description);
    setHabitFreq(habit.frequency);
    setHabitGoal(habit.goal_count);
    setEditingHabit(habit);
    setShowHabitModal(true);
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
      const ai = getGeminiClient();
      if (!ai) return;
      const prompt = `Analyze these tasks and identify the single most important "Next Strategic Action" to take right now.
      Tasks: ${JSON.stringify(pendingTasks.map(t => ({ id: t.id, title: t.title, importance: t.importance, impact: t.impact_level, urgency: t.urgency_score })))}
      User Profile: ${JSON.stringify(userProfile)}
      Return ONLY the JSON object of the selected task ID: { "id": "TASK_ID" }`;

      try {
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
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
        importance: impactLevel, // Use impactLevel for importance or add a new state
        urgency_score: urgencyScore,
      estimated_effort: estimatedEffort,
      impact_level: impactLevel,
      duration,
      deadline: deadline ? Timestamp.fromDate(new Date(deadline)) : null,
      category,
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
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummy',
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
        {showAiPanel && (
          <AiPanel 
            missions={missions}
            consistencySystem={consistencySystem}
            userProfile={userProfile}
            setShowAiPanel={setShowAiPanel}
            MODEL_NAME={MODEL_NAME}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotifications && (
          <NotificationsPanel 
            aiInsights={aiInsights}
            setShowNotifications={setShowNotifications}
          />
        )}
      </AnimatePresence>

      {/* Onboarding Overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingFlow 
            theme={theme}
            onComplete={() => setShowOnboarding(false)}
          />
        )}
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
            <SettingsIcon size={18} className="md:hidden" />
            <SettingsIcon size={20} className="hidden md:block" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pb-32 overflow-y-auto max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <FocusScreen 
              missions={missions}
              theme={theme}
              motivationQuote={motivationQuote}
              nextAction={nextAction}
              selfAwareness={selfAwareness}
              motivationState={motivationState}
              dailyScore={dailyScore}
              user={user}
              handleAction={handleAction}
              setActiveTab={setActiveTab}
              setShowNotifications={setShowNotifications}
            />
          )}
          {activeTab === 'tasks' && (
            <TasksScreen 
              missions={missions}
              theme={theme}
              taskFilter={taskFilter}
              setTaskFilter={setTaskFilter}
              saveMission={saveMission}
              editingMission={editingMission}
              title={title}
              setTitle={setTitle}
              urgencyScore={urgencyScore}
              setUrgencyScore={setUrgencyScore}
              estimatedEffort={estimatedEffort}
              setEstimatedEffort={setEstimatedEffort}
              impactLevel={impactLevel}
              setImpactLevel={setImpactLevel}
              duration={duration}
              setDuration={setDuration}
              category={category}
              setCategory={setCategory}
              deadline={deadline}
              setDeadline={setDeadline}
              deadlineError={deadlineError}
              setDeadlineError={setDeadlineError}
              loading={loading}
              resetForm={resetForm}
              handleAction={handleAction}
            />
          )}
          {activeTab === 'habits' && (
            <HabitsScreen 
              consistencySystem={consistencySystem}
              theme={theme}
              resetHabitForm={resetHabitForm}
              setShowHabitModal={setShowHabitModal}
              editHabit={editHabit}
              handleAction={handleAction}
            />
          )}
          {activeTab === 'schedule' && (
            <TimelineMatrix 
              timelineMatrix={timelineMatrix}
              theme={theme}
              generateSchedule={generateSchedule}
              loading={loading}
              handleAction={handleAction}
            />
          )}
          {activeTab === 'analytics' && (
            <InsightsScreen 
              missions={missions}
              consistencySystem={consistencySystem}
              selfAwareness={selfAwareness}
              theme={theme}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsView 
              theme={theme}
              setTheme={setTheme}
              user={user}
              logout={logout}
              setShowPricing={setShowPricing}
              setShowPrivacy={() => {}}
              setShowTerms={() => {}}
            />
          )}
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
            { id: 'settings', icon: SettingsIcon, label: 'Style' },
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
