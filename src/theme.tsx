import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeType = 'elite' | 'simple' | 'minimal';

export interface ThemeTokens {
  id: ThemeType;
  name: string;
  colors: {
    background: string;
    surface: string;
    primary: string;
    accent: string;
    danger: string;
    textPrimary: string;
    textSecondary: string;
    glow?: string;
    divider?: string;
  };
  typography: {
    fontSans: string;
    fontMono: string;
    headingWeight: string;
    bodyWeight: string;
  };
  spacing: {
    borderRadius: string;
    padding: string;
    cardPadding: string;
  };
  wording: {
    dashboard: string;
    missions: string;
    focusScore: string;
    execute: string;
    insight: string;
    timeline: string;
    awareness: string;
    pilot: string;
    neuralSync: string;
    tasks: string;
    dailyGoal: string;
    efficiency: string;
    activeMissions: string;
    activeTasks: string;
    activeFocus: string;
    score: string;
  };
  animations: {
    type: 'smooth' | 'bouncy' | 'minimal';
  };
}

export const themes: Record<ThemeType, ThemeTokens> = {
  elite: {
    id: 'elite',
    name: 'Elite AI',
    colors: {
      background: '#05070a',
      surface: '#0a0c12',
      primary: '#00f2ff',
      accent: '#00FFC6',
      danger: '#ff4b4b',
      textPrimary: '#ffffff',
      textSecondary: '#94a3b8',
      glow: 'rgba(0, 242, 255, 0.4)',
    },
    typography: {
      fontSans: '"Outfit", "Inter", sans-serif',
      fontMono: '"JetBrains Mono", monospace',
      headingWeight: '800',
      bodyWeight: '500',
    },
    spacing: {
      borderRadius: '32px',
      padding: '24px',
      cardPadding: '24px',
    },
    wording: {
      dashboard: 'Pilot Dashboard',
      missions: 'Mission Matrix',
      focusScore: 'Efficiency Index',
      execute: 'Execute Mission',
      insight: 'Neural Insight',
      timeline: 'Neural Timeline',
      awareness: 'Self Awareness',
      pilot: 'Pilot My Day',
      neuralSync: 'Neural Sync: Active',
      tasks: 'Missions',
      dailyGoal: 'Efficiency',
      efficiency: 'Efficiency',
      activeMissions: 'Active Missions',
      activeTasks: 'Active Missions',
      activeFocus: 'Active Missions',
      score: 'Efficiency Score',
    },
    animations: {
      type: 'smooth',
    },
  },
  simple: {
    id: 'simple',
    name: 'Simple & Friendly',
    colors: {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      primary: '#58CC02',
      accent: '#FFB800',
      danger: '#FF4B4B',
      textPrimary: '#3C3C3C',
      textSecondary: '#777777',
      divider: '#E5E5E5',
    },
    typography: {
      fontSans: '"Nunito", "Poppins", sans-serif',
      fontMono: 'monospace',
      headingWeight: '800',
      bodyWeight: '600',
    },
    spacing: {
      borderRadius: '24px',
      padding: '20px',
      cardPadding: '24px',
    },
    wording: {
      dashboard: 'Home',
      missions: 'Tasks',
      focusScore: 'Daily Goal',
      execute: 'Start',
      insight: 'AI Insight',
      timeline: 'Schedule',
      awareness: 'Analytics',
      pilot: 'Continue',
      neuralSync: 'You\'re doing great!',
      tasks: 'Tasks',
      dailyGoal: 'Daily Goal',
      efficiency: 'Progress',
      activeMissions: 'Up Next',
      activeTasks: 'Up Next',
      activeFocus: 'Up Next',
      score: 'Weekly Goal',
    },
    animations: {
      type: 'bouncy',
    },
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Clean',
    colors: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      primary: '#111111',
      accent: '#6B7280',
      danger: '#111111',
      textPrimary: '#111111',
      textSecondary: '#6B7280',
      divider: '#E5E7EB',
    },
    typography: {
      fontSans: '"Inter", "Helvetica", sans-serif',
      fontMono: 'monospace',
      headingWeight: '600',
      bodyWeight: '400',
    },
    spacing: {
      borderRadius: '12px',
      padding: '28px',
      cardPadding: '28px',
    },
    wording: {
      dashboard: 'Overview',
      missions: 'Focus',
      focusScore: 'Score',
      execute: 'Complete',
      insight: 'Note',
      timeline: 'Timeline',
      awareness: 'Analytics',
      pilot: 'Next',
      neuralSync: 'System Ready',
      tasks: 'Focus',
      dailyGoal: 'Score',
      efficiency: 'Score',
      activeMissions: 'Focus Items',
      activeTasks: 'Focus Items',
      activeFocus: 'Focus Items',
      score: 'Daily Score',
    },
    animations: {
      type: 'minimal',
    },
  },
};

interface ThemeContextType {
  theme: ThemeTokens;
  setTheme: (type: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeType, setThemeType] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved as ThemeType) || 'elite';
  });

  const theme = themes[themeType];

  useEffect(() => {
    localStorage.setItem('app-theme', themeType);
    // Apply theme class to root element
    const root = document.documentElement;
    root.classList.remove('theme-elite', 'theme-simple', 'theme-minimal');
    root.classList.add(`theme-${themeType}`);
  }, [themeType]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeType }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
