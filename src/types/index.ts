import { Timestamp } from 'firebase/firestore';

export interface Mission {
  id: string;
  title: string;
  impact: 'low' | 'moderate' | 'high' | 'critical';
  urgency: number;
  urgency_score?: number;
  importance: number; // Added importance
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

export interface User {
  id: number | string;
  email: string;
  plan: 'free' | 'premium';
  subscription_plan?: 'free' | 'premium' | 'trial'; // Added for compatibility
}

export interface LifeState {
  score: number;
  status: 'Focused' | 'Distracted' | 'Peak' | 'Low Energy' | 'Recovering';
  insight: string;
  focusLevel: number;
  hydration: number;
}

export interface Analytics {
  productivityScore: number;
  totalCompleted: number;
  focusTimeMinutes: number;
  habits: { id: number; title: string; streak: number; status: string }[];
}

export interface Habit {
  id: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly';
  goal_count: number;
  current_count: number;
  streak: number;
  last_completed_at?: string;
  created_at?: any;
}

export interface HabitStat {
  id: number;
  title: string;
  history: { date: string; count: number }[];
}

export interface MotivationState {
  current_streak: number;
  focus_streak: number;
  last_active_date: string; // YYYY-MM-DD
  recovery_mode: boolean;
  recovery_completions: number;
  daily_notifications_count: number;
  last_notification_date: string; // YYYY-MM-DD
  escalation_level: number;
}

export interface DailyScore {
  date: string;
  score: number;
  tasks_completed: number;
  focus_minutes: number;
  consistency_bonus: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
