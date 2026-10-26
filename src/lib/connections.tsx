import { useAuth } from '@clerk/expo';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState } from 'react-native';

import type { AppState, LinkView, MessageView } from '@/server/state';
import type { QA } from './types';

export type { LinkView, MessageView };

/** How often to check for new invites and messages while the app is open. */
const REFRESH_MS = 5000;

type Connections = {
  ready: boolean;
  error: string | null;
  links: LinkView[];
  /** Accepted connections only. */
  family: LinkView[];
  pending: LinkView[];
  messages: MessageView[];
  refresh: () => Promise<void>;
  invite: (username: string, relation: string) => Promise<void>;
  removeLink: (id: string) => Promise<void>;
  respond: (id: string, accept: boolean) => Promise<void>;
  send: (m: { text: string; answers: QA[]; recipientIds: string[] }) => Promise<string>;
  unsend: (id: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
};

const Ctx = createContext<Connections | null>(null);

export class ApiError extends Error {}

/** Talks to Noema's server (the /api routes) as the signed-in person. */
export function ConnectionsProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const api = useCallback(
    async <T,>(path: string, init?: { method?: string; body?: unknown }): Promise<T> => {
      const token = await getToken();
      const res = await fetch(`/api/${path}`, {
        method: init?.method ?? 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(json.error ?? 'Something went wrong. Please try again.');
      return json as T;
    },
    [getToken],
  );

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      setState(await api<AppState>('state'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach Noema.');
    } finally {
      busy.current = false;
    }
  }, [api]);

  useEffect(() => {
    if (!isSignedIn) return;
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => {
      if (RNAppState.currentState === 'active') void refresh();
    }, REFRESH_MS);
    const sub = RNAppState.addEventListener('change', (s) => s === 'active' && void refresh());
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      sub.remove();
    };
  }, [isSignedIn, refresh]);

  const value = useMemo<Connections>(() => {
    const links = state?.links ?? [];
    return {
      ready: state !== null,
      error,
      links,
      family: links.filter((l) => l.status === 'accepted'),
      pending: links.filter((l) => l.status === 'pending'),
      messages: state?.messages ?? [],
      refresh,
      invite: async (username, relation) => setState(await api<AppState>('links', { method: 'POST', body: { username, relation } })),
      removeLink: async (id) => setState(await api<AppState>(`links/${id}`, { method: 'DELETE' })),
      respond: async (id, accept) => setState(await api<AppState>(`links/${id}/respond`, { method: 'POST', body: { accept } })),
      send: async (m) => {
        const res = await api<{ id: string; state: AppState }>('messages', { method: 'POST', body: m });
        setState(res.state);
        return res.id;
      },
      unsend: async (id) => setState(await api<AppState>(`messages/${id}`, { method: 'DELETE' })),
      markRead: async (id) => setState(await api<AppState>(`messages/${id}/read`, { method: 'POST' })),
    };
  }, [state, error, refresh, api]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConnections() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useConnections must be used inside ConnectionsProvider');
  return c;
}
