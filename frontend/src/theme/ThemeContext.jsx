import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ACCENTS, DEFAULT_ACCENT, DEFAULT_MODE, THEME_STORAGE_KEY } from './themes.js';

const ThemeContext = createContext(null);

function readStored() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return { mode: DEFAULT_MODE, accent: DEFAULT_ACCENT };
    const parsed = JSON.parse(raw);
    const mode = parsed?.mode === 'dark' || parsed?.mode === 'light' ? parsed.mode : DEFAULT_MODE;
    const accent = ACCENTS.some(a => a.id === parsed?.accent) ? parsed.accent : DEFAULT_ACCENT;
    return { mode, accent };
  } catch {
    return { mode: DEFAULT_MODE, accent: DEFAULT_ACCENT };
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStored);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-mode', theme.mode);
    root.setAttribute('data-accent', theme.accent);
    root.style.colorScheme = theme.mode;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    } catch {
      // storage unavailable — theme just won't persist
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      ...theme,
      setMode: mode => setTheme(t => ({ ...t, mode })),
      setAccent: accent => setTheme(t => ({ ...t, accent })),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}