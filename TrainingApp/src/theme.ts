import { create } from 'zustand';

const dark = {
    bg: '#0f1923',
    card: '#172636',
    border: '#20354b',
    primary: '#0056b2',
    primaryBg: 'rgba(0,86,178,0.12)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    t1: '#f1f5f9',   // text primary
    t2: '#94a3b8',   // text secondary
    tMuted: '#8dacce',   // text muted
    tLight: '#64748b',   // text light
    white: '#ffffff',
    black: '#000000',
};

const light = {
    bg: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    primary: '#0056b2',
    primaryBg: 'rgba(0,86,178,0.12)',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    t1: '#0f172a',
    t2: '#475569',
    tMuted: '#64748b',
    tLight: '#94a3b8',
    white: '#ffffff',
    black: '#000000',
};

export const useThemeStore = create<any>((set) => ({
    isDark: true,
    C: dark,
    toggleTheme: () => set((state: any) => ({
        isDark: !state.isDark,
        C: !state.isDark ? dark : light,
    })),
}));

export const TAB_H = 68;

// Legacy export fallback
export const C = dark;
