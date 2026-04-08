import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  Timestamp,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

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

export const MOTIVATION_MESSAGES = {
  REWARDS: [
    "Neural pathway reinforced.",
    "Efficiency optimized.",
    "Strategic objective secured.",
    "Momentum building.",
    "Peak performance detected."
  ],
  RECOVERY: [
    "System rebooting. Let's start with one small win.",
    "Focusing on the essentials. Just one task to reset.",
    "Protocol simplified. Start tiny, build back up."
  ],
  ESCALATION: [
    { level: 1, text: "Gentle reminder: Your next objective awaits." },
    { level: 2, text: "Direct prompt: Action required on your primary task." },
    { level: 3, text: "Simplified protocol: Just start for 5 minutes. That's it." }
  ],
  NUDGES: {
    START_NOW: "Start: {task} ({duration}m)",
    PROGRESS: "You're close. Finish {task} to secure your streak.",
    RESET: "System reset. Complete one task to re-engage."
  }
};

export async function getMotivationState(userId: string): Promise<MotivationState> {
  const stateDoc = doc(db, 'users', userId, 'motivation', 'state');
  const snap = await getDoc(stateDoc);
  
  if (snap.exists()) {
    return snap.data() as MotivationState;
  }
  
  const initialState: MotivationState = {
    current_streak: 0,
    focus_streak: 0,
    last_active_date: new Date().toISOString().split('T')[0],
    recovery_mode: false,
    recovery_completions: 0,
    daily_notifications_count: 0,
    last_notification_date: new Date().toISOString().split('T')[0],
    escalation_level: 0
  };
  
  await setDoc(stateDoc, initialState);
  return initialState;
}

export async function updateDailyScore(userId: string, tasks: any[], focusMinutes: number): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const completedToday = tasks.filter(t => {
    if (!t.completed_at) return false;
    const d = t.completed_at.seconds ? new Date(t.completed_at.seconds * 1000) : new Date(t.completed_at);
    return d.toISOString().split('T')[0] === today;
  });

  const taskScore = Math.min(60, completedToday.length * 10);
  const focusScore = Math.min(30, Math.floor(focusMinutes / 10) * 5);
  const consistencyBonus = completedToday.length > 3 ? 10 : 0;
  
  const totalScore = Math.min(100, taskScore + focusScore + consistencyBonus);
  
  const scoreDoc = doc(db, 'users', userId, 'daily_scores', today);
  await setDoc(scoreDoc, {
    user_id: userId,
    date: today,
    score: totalScore,
    tasks_completed: completedToday.length,
    focus_minutes: focusMinutes,
    consistency_bonus: consistencyBonus
  }, { merge: true });
  
  return totalScore;
}

export async function checkStreaks(userId: string, tasks: any[]): Promise<{ current: number, focus: number }> {
  const state = await getMotivationState(userId);
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  if (state.last_active_date === today) return { current: state.current_streak, focus: state.focus_streak };
  
  const completedYesterday = tasks.filter(t => {
    if (!t.completed_at) return false;
    const d = t.completed_at.seconds ? new Date(t.completed_at.seconds * 1000) : new Date(t.completed_at);
    return d.toISOString().split('T')[0] === yesterday;
  }).length > 0;

  let newStreak = state.current_streak;
  if (completedYesterday) {
    newStreak += 1;
  } else if (state.last_active_date !== yesterday) {
    newStreak = 0;
  }
  
  const stateDoc = doc(db, 'users', userId, 'motivation', 'state');
  await updateDoc(stateDoc, {
    current_streak: newStreak,
    last_active_date: today
  });
  
  return { current: newStreak, focus: state.focus_streak };
}

export async function generateBehaviorInsight(userId: string): Promise<string | null> {
  const tasksRef = collection(db, 'users', userId, 'tasks');
  const q = query(tasksRef, where('status', '==', 'completed'), orderBy('completed_at', 'desc'), limit(20));
  const snap = await getDocs(q);
  
  if (snap.empty) return null;
  
  const completions = snap.docs.map(d => {
    const data = d.data();
    const date = data.completed_at.seconds ? new Date(data.completed_at.seconds * 1000) : new Date(data.completed_at);
    return {
      hour: date.getHours(),
      duration: data.duration || 30
    };
  });
  
  // Simple heuristic insights
  const eveningCompletions = completions.filter(c => c.hour >= 18).length;
  if (eveningCompletions > completions.length * 0.6) {
    return "Neural activity peaks after 6 PM. Schedule your critical missions for the evening.";
  }
  
  const shortTasks = completions.filter(c => c.duration <= 15).length;
  if (shortTasks > completions.length * 0.7) {
    return "Micro-missions (under 15 min) are your primary driver. Break large objectives down for maximum efficiency.";
  }
  
  return "Consistency detected in morning routines. Leverage this momentum for deep work.";
}

export async function handleRecoveryMode(userId: string, missedCount: number): Promise<boolean> {
  const stateDoc = doc(db, 'users', userId, 'motivation', 'state');
  const state = await getMotivationState(userId);
  
  if (missedCount >= 3 && !state.recovery_mode) {
    await updateDoc(stateDoc, {
      recovery_mode: true,
      recovery_completions: 0,
      escalation_level: 0
    });
    return true;
  }
  
  return state.recovery_mode;
}

export async function logReminder(userId: string, taskId: string, type: string) {
  const logsRef = collection(db, 'users', userId, 'reminder_logs');
  await addDoc(logsRef, {
    user_id: userId,
    task_id: taskId,
    type,
    sent_at: serverTimestamp(),
    action_taken: false
  });
  
  const stateDoc = doc(db, 'users', userId, 'motivation', 'state');
  const state = await getMotivationState(userId);
  const today = new Date().toISOString().split('T')[0];
  
  const count = state.last_notification_date === today ? state.daily_notifications_count + 1 : 1;
  
  await updateDoc(stateDoc, {
    daily_notifications_count: count,
    last_notification_date: today,
    escalation_level: (state.escalation_level + 1) % 4
  });
}
