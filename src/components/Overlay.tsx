import { createContext, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/lib/store';
import { Button, Txt } from './ui';

/**
 * Sheets and pop-up dialogs are drawn here, inside the app's own frame.
 * (React Native's Modal and Alert escape the phone frame on web, or do nothing at all.)
 */
type Host = { set: (id: string, node: ReactNode | null) => void };
const HostContext = createContext<Host | null>(null);

type DialogOptions = { title: string; message?: string; confirmText?: string; cancelText?: string; destructive?: boolean };
type Dialog = { confirm: (o: DialogOptions) => Promise<boolean>; notify: (title: string, message?: string) => Promise<void> };
const DialogContext = createContext<Dialog | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  // A Map keeps sheets in the order they were opened.
  const [layers, setLayers] = useState<Map<string, ReactNode>>(new Map());
  const [dialog, setDialog] = useState<(DialogOptions & { alertOnly?: boolean; resolve: (v: boolean) => void }) | null>(null);

  const host = useMemo<Host>(
    () => ({
      set: (id, node) =>
        setLayers((prev) => {
          if (node == null && !prev.has(id)) return prev;
          const next = new Map(prev);
          if (node == null) next.delete(id);
          else next.set(id, node);
          return next;
        }),
    }),
    [],
  );

  const dialogApi = useMemo<Dialog>(
    () => ({
      confirm: (o) => new Promise((resolve) => setDialog({ ...o, resolve })),
      notify: (title, message) =>
        new Promise((resolve) => setDialog({ title, message, alertOnly: true, confirmText: 'OK', resolve: () => resolve() })),
    }),
    [],
  );

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <HostContext.Provider value={host}>
      <DialogContext.Provider value={dialogApi}>
        <View style={{ flex: 1 }}>
          {children}
          {[...layers].map(([id, node]) => (
            <View key={id} style={StyleSheet.absoluteFill}>
              {node}
            </View>
          ))}
          {dialog ? <DialogView {...dialog} onClose={close} /> : null}
        </View>
      </DialogContext.Provider>
    </HostContext.Provider>
  );
}

function DialogView({
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  destructive,
  alertOnly,
  onClose,
}: DialogOptions & { alertOnly?: boolean; onClose: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
      <View accessibilityRole="alert" style={{ width: '100%', maxWidth: 360, backgroundColor: t.colors.card, borderRadius: 22, padding: 20, gap: 12 }}>
        <Txt size="large" weight="800">{title}</Txt>
        {message ? <Txt muted>{message}</Txt> : null}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          {alertOnly ? null : <Button title={cancelText} variant="secondary" onPress={() => onClose(false)} style={{ flex: 1 }} />}
          <Button title={confirmText} variant={destructive ? 'danger' : 'primary'} onPress={() => onClose(true)} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

export function useDialog() {
  const d = useContext(DialogContext);
  if (!d) throw new Error('useDialog must be used inside OverlayProvider');
  return d;
}

/** A full-height panel that slides over the current screen, inside the app frame. */
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const host = useContext(HostContext);
  const id = useId();
  const t = useTheme();

  useEffect(() => {
    if (!host) return;
    host.set(
      id,
      visible ? (
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <Pressable style={{ height: 36 }} onPress={onClose} accessibilityLabel="Close" />
          <View style={{ flex: 1, backgroundColor: t.colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
            {children}
          </View>
        </View>
      ) : null,
    );
  });

  useEffect(() => () => host?.set(id, null), [host, id]);
  return null;
}
