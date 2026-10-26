import { useColorScheme } from 'react-native';

import type { AccentName, Settings, TextSize } from './types';

export const ACCENTS: Record<AccentName, { label: string; light: string; dark: string; soft: string; softDark: string }> = {
  // Noema brand blue, from the logo (darkened slightly in light mode so white text stays readable).
  blue: { label: 'Noema', light: '#2F6FD8', dark: '#7FB0F2', soft: '#E2ECFB', softDark: '#18263D' },
  teal: { label: 'Teal', light: '#0F5C5C', dark: '#5CC2BC', soft: '#DCEDEA', softDark: '#173634' },
  orange: { label: 'Sunset', light: '#B44A17', dark: '#F29A62', soft: '#F8E3D5', softDark: '#3A2418' },

  plum: { label: 'Plum', light: '#6B2F6B', dark: '#D493D4', soft: '#F0E0EF', softDark: '#33203A' },
  green: { label: 'Garden', light: '#2A6A3B', dark: '#7FCB92', soft: '#DFEEDF', softDark: '#1B3322' },
};

/** One size setting scales every word and button in the app. "medium" is the default. */
export const TEXT_SIZES: TextSize[] = ['small', 'medium', 'large', 'xlarge'];
export const TEXT_SCALE: Record<TextSize, number> = { small: 0.9, medium: 1, large: 1.12, xlarge: 1.25 };
export const TEXT_SIZE_LABEL: Record<TextSize, string> = { small: 'Small', medium: 'Default', large: 'Large', xlarge: 'Extra large' };

export type Theme = ReturnType<typeof buildTheme>;

export function buildTheme(settings: Settings, systemDark: boolean) {
  const dark = settings.themeMode === 'dark' || (settings.themeMode === 'system' && systemDark);
  const accent = ACCENTS[settings.accent];
  const s = TEXT_SCALE[settings.textSize] ?? 1;
  return {
    dark,
    scale: s,
    colors: {
      bg: dark ? '#111515' : '#FFFFFF',
      card: dark ? '#1B2121' : '#F7F8FA',
      text: dark ? '#F3EFE7' : '#1D2828',
      muted: dark ? '#A5AFAD' : '#566262',
      border: dark ? '#2D3737' : '#E3E7ED',
      primary: dark ? accent.dark : accent.light,
      onPrimary: dark ? '#0E1414' : '#FFFFFF',
      soft: dark ? accent.softDark : accent.soft,
      stamp: '#E07A3F',
      danger: dark ? '#F08A7E' : '#B3261E',
      dangerSoft: dark ? '#3A1F1C' : '#FBE3E0',
      success: dark ? '#7FCB92' : '#2A6A3B',
    },
    font: {
      small: 14 * s,
      body: 17 * s,
      large: 20 * s,
      title: 25 * s,
      huge: 28 * s,
    },
    /** Height of normal buttons and inputs. */
    tap: 50 * s,
    /** Height of the important buttons (answers, next, send). */
    bigTap: 60 * s,
    radius: 16,
  };
}

export function useSystemDark() {
  return useColorScheme() === 'dark';
}

/**
 * Height of the bottom tab bar (without the home-bar area): top padding, the tab's own padding,
 * the icon box (at least 28px), and one line of label text.
 */
export function tabBarHeight(t: Theme) {
  return Math.ceil(6 + 10 + Math.max(28, 24 * t.scale) + t.font.small * 1.35 + 4);
}
