import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/expo';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { buildTheme, TEXT_SCALE, useSystemDark, type Theme } from './theme';
import type { FamilyMember, Message, Settings } from './types';

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

const MEMBER_COLORS = ['#0F5C5C', '#B44A17', '#24508F', '#6B2F6B', '#2A6A3B', '#8A6D1A'];

/** Bump when a default should be re-applied to existing saves. */
const SETTINGS_VERSION = 2;

type Data = { settings: Settings; family: FamilyMember[]; messages: Message[]; v?: number };

type Store = Data & {
  ready: boolean;
  theme: Theme;
  lastSentId: string | null;
  updateSettings: (patch: Partial<Settings>) => void;
  addMember: (m: Omit<FamilyMember, 'id' | 'color'>) => void;
  removeMember: (id: string) => void;
  addMessage: (m: Omit<Message, 'id' | 'createdAt'>) => Message;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  setLastSentId: (id: string | null) => void;
};

const StoreContext = createContext<Store | null>(null);

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Everything lives on the phone, saved separately for each signed-in account. */
export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const key = user ? `noema:${user.id}` : 'noema:guest';
  const systemDark = useSystemDark();

  const [data, setData] = useState<Data>({ settings: DEFAULT_SETTINGS, family: [], messages: [] });
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
      setData({
        settings,
        family: saved.family ?? [],
        messages: saved.messages ?? [],
        v: SETTINGS_VERSION,
      });
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
      addMember: (m) =>
        save((d) => ({
          ...d,
          family: [...d.family, { ...m, id: newId(), color: MEMBER_COLORS[d.family.length % MEMBER_COLORS.length] }],
        })),
      removeMember: (id) => save((d) => ({ ...d, family: d.family.filter((f) => f.id !== id) })),
      addMessage: (m) => {
        const msg: Message = { ...m, id: newId(), createdAt: Date.now() };
        save((d) => ({ ...d, messages: [msg, ...d.messages] }));
        return msg;
      },
      removeMessage: (id) => save((d) => ({ ...d, messages: d.messages.filter((x) => x.id !== id) })),
      clearMessages: () => save((d) => ({ ...d, messages: [] })),
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
