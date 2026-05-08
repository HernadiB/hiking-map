import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';

import { darkPalette, lightPalette } from './theme';
import type { ThemePalette } from './theme';

type AppThemeMode = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'hiking-map.theme-mode.v1';

type AppThemeContextValue = {
  colors: ThemePalette;
  mode: AppThemeMode;
  resolvedTheme: ResolvedTheme;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

const paletteCssVariables: Array<[keyof ThemePalette, string]> = [
  ['background', '--hm-background'],
  ['panel', '--hm-panel'],
  ['panelRaised', '--hm-panel-raised'],
  ['inputBackground', '--hm-input-background'],
  ['border', '--hm-border'],
  ['text', '--hm-text'],
  ['textMuted', '--hm-text-muted'],
  ['accent', '--hm-accent'],
  ['accentStrong', '--hm-accent-strong'],
  ['sand', '--hm-sand'],
  ['sandText', '--hm-sand-text'],
  ['routeBase', '--hm-route-base'],
  ['routeBaseSoft', '--hm-route-base-soft'],
  ['highlight', '--hm-highlight'],
  ['highlightSoft', '--hm-highlight-soft'],
  ['highlightText', '--hm-highlight-text'],
  ['success', '--hm-success'],
  ['error', '--hm-error'],
  ['warning', '--hm-warning'],
  ['chartClimb', '--hm-chart-climb'],
  ['chartDescent', '--hm-chart-descent'],
  ['chartRolling', '--hm-chart-rolling'],
  ['chartFlat', '--hm-chart-flat'],
];

function readStoredThemeMode(): AppThemeMode {
  if (typeof localStorage === 'undefined') {
    return 'system';
  }

  const storedValue = localStorage.getItem(THEME_STORAGE_KEY);
  return storedValue === 'dark' || storedValue === 'light' || storedValue === 'system'
    ? storedValue
    : 'system';
}

function storeThemeMode(mode: AppThemeMode) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<AppThemeMode>('system');

  useEffect(() => {
    setMode(readStoredThemeMode());
  }, []);

  const resolvedTheme: ResolvedTheme =
    mode === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : mode;
  const colors = resolvedTheme === 'dark' ? darkPalette : lightPalette;

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    document.body.style.backgroundColor = colors.background;
    paletteCssVariables.forEach(([paletteKey, variableName]) => {
      document.documentElement.style.setProperty(variableName, colors[paletteKey]);
    });
  }, [colors.background, resolvedTheme]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      colors,
      mode,
      resolvedTheme,
      toggleTheme: () => {
        const nextMode = resolvedTheme === 'dark' ? 'light' : 'dark';
        setMode(nextMode);
        storeThemeMode(nextMode);
      },
    }),
    [colors, mode, resolvedTheme]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);

  if (!value) {
    throw new Error('useAppTheme must be used inside AppThemeProvider.');
  }

  return value;
}
