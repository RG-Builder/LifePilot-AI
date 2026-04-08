import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeType = 'elite' | 'simple' | 'minimal';

export interface ThemeTokens {
  id: ThemeType;
  name: string;
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    accent: string;
    text_primary: string;
    text_secondary: string;
    border: string;
    success: string;
    danger: string;
    glow?: string;
    elevation?: string;
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
    isDark: true,
    colors: {
      background: '#05070a',
      surface: '#0a0c12',
      primary: '#00f2ff',
      secondary: '#7c3aed',
      accent: '#00FFC6',
      text_primary: '#ffffff',
      text_secondary: '#94a3b8',
      border: 'rgba(255, 255, 255, 0.1)',
      success: '#10b981',
      danger: '#ff4b4b',
      glow: 'rgba(0, 242, 255, 0.3)',
      elevation: '0 8px 32px rgba(0, 0, 0, 0.4)',
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
    isDark: false,
    colors: {
      background: '#F7F9FC',
      surface: '#FFFFFF',
      primary: '#58CC02',
      secondary: '#1CB0F6',
      accent: '#FFB800',
      text_primary: '#3C3C3C',
      text_secondary: '#777777',
      border: '#E5E5E5',
      success: '#58CC02',
      danger: '#FF4B4B',
      elevation: '0 4px 12px rgba(0, 0, 0, 0.05)',
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
    isDark: false,
    colors: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      primary: '#111111',
      secondary: '#6B7280',
      accent: '#111111',
      text_primary: '#111111',
      text_secondary: '#6B7280',
      border: '#E5E7EB',
      success: '#059669',
      danger: '#DC2626',
      elevation: 'none',
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
  getTextColor: (bgColor: string) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeType, setThemeType] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('app-theme') as ThemeType;
    return (saved && themes[saved]) ? saved : 'elite';
  });

  const theme = themes[themeType] || themes.elite;

  const getTextColor = (bgColor: string) => {
    // Simple heuristic for hex colors
    if (!bgColor || !theme?.colors) return theme?.colors?.text_primary || '#000000';
    if (bgColor.startsWith('#')) {
      const hex = bgColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#000000' : '#FFFFFF';
    }
    return theme?.colors?.text_primary || '#000000';
  };

  useEffect(() => {
    if (!theme) return;
    localStorage.setItem('app-theme', themeType);
    const root = document.documentElement;
    
    // Apply tokens as CSS variables
    if (theme.colors) {
      Object.entries(theme.colors).forEach(([key, value]) => {
        if (value) root.style.setProperty(`--color-${key}`, value as string);
      });
    }
    
    if (theme.typography) {
      root.style.setProperty('--font-sans', theme.typography.fontSans);
      root.style.setProperty('--font-mono', theme.typography.fontMono);
    }
    
    if (theme.spacing) {
      root.style.setProperty('--border-radius', theme.spacing.borderRadius);
    }
    
    root.classList.remove('theme-elite', 'theme-simple', 'theme-minimal');
    root.classList.add(`theme-${themeType}`);
    
    // Set color scheme for browser UI
    root.style.colorScheme = theme.isDark ? 'dark' : 'light';
  }, [themeType, theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeType, getTextColor }}>
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
