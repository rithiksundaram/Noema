import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/expo';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { buildTheme, TEXT_SCALE, useSystemDark, type Theme } from './theme';
import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  themeMode: 'light',
  accent: 'blue',
  textSize: 'medium',
  answerStyle: 'both',
  autoStop: true,
  questionCount: 10,
  messageLength: 'long',
  confirmVoice: true,
};

const AVATAR_COLORS = ['#0F5C5C', '#B44A17', '#24508F', '#6B2F6B', '#2A6A3B', '#8A6D1A'];

/** Same person, same color, on every device. */
export function colorFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Bump when a default should be re-applied to existing saves. */
const SETTINGS_VERSION = 2;

type Data = { settings: Settings; v?: number };

type Store = Data & {
  ready: boolean;
  theme: Theme;
  /** The message just sent, for the "Message sent" tag on the profile. */
  lastSentId: string | null;
  setLastSentId: (id: string | null) => void;
  updateSettings: (patch: Partial<Settings>) => void;
};

const StoreContext = createContext<Store | null>(null);

/** Per-device preferences (size, colors, answering style), saved separately for each account. */
export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const key = user ? `noema:${user.id}` : 'noema:guest';
  const systemDark = useSystemDark();

  const [data, setData] = useState<Data>({ settings: DEFAULT_SETTINGS });
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const ready = loadedKey === key;
  const [lastSentId, setLastSentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(key).then((raw) => {
      if (cancelled) return;
      const saved = raw ? (JSON.parse(raw) as Partial<Data>) : {};
      const settings = { ...DEFAULT_SETTINGS, ...saved.settings };
      // Older saves used sizes that no longer exist.
      if (!(settings.textSize in TEXT_SCALE)) settings.textSize = DEFAULT_SETTINGS.textSize;
      // v2: light mode became the default.
      if ((saved.v ?? 1) < 2) settings.themeMode = DEFAULT_SETTINGS.themeMode;
      setData({ settings, v: SETTINGS_VERSION });
      setLoadedKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const save = useCallback(
    (fn: (d: Data) => Data) => {
      setData((prev) => {
        const next = fn(prev);
        AsyncStorage.setItem(key, JSON.stringify(next));
        return next;
      });
    },
    [key],
  );

  const store = useMemo<Store>(
    () => ({
      ...data,
      ready,
      theme: buildTheme(data.settings, systemDark),
      lastSentId,
      setLastSentId,
      updateSettings: (patch) => save((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    }),
    [data, ready, systemDark, lastSentId, save],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

export const useTheme = () => useStore().theme;
