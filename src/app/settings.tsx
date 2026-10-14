import { useClerk, useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { Sheet, useDialog } from '@/components/Overlay';
import { EditProfileModal } from '@/components/ProfileHeader';
import { Button, Card, Field, Screen, SectionTitle, TopBar, Txt, type IconName } from '@/components/ui';
import { aiEnabled } from '@/lib/ai';
import { clerkMessage } from '@/lib/clerkError';
import { useStore } from '@/lib/store';
import { ACCENTS, TEXT_SIZE_LABEL, TEXT_SIZES } from '@/lib/theme';
import type { AccentName, Settings, TextSize, ThemeMode } from '@/lib/types';

export default function SettingsScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { settings, updateSettings, clearMessages, messages, theme: t } = useStore();
  const [editProfile, setEditProfile] = useState(false);
  const [changePw, setChangePw] = useState(false);
  const dialog = useDialog();

  async function logOut() {
    const yes = await dialog.confirm({ title: 'Log out?', message: 'You can log back in with your username and password.', confirmText: 'Log out', destructive: true });
    if (yes) await signOut();
  }

  async function clearHistory() {
    const yes = await dialog.confirm({ title: 'Delete all sent messages?', message: 'This removes your message history from this device.', confirmText: 'Delete', destructive: true });
    if (yes) clearMessages();
  }

  return (
    <Screen>
      <TopBar title="Settings" />

      <SectionTitle>Account</SectionTitle>
      <Card style={{ padding: 0, gap: 0 }}>
        <Row icon="person" label="Name and photo" value={user?.fullName ?? ''} onPress={() => setEditProfile(true)} />
        <Row icon="at" label="Username" value={user?.username ?? ''} />
        <Row icon="key" label="Change password" onPress={() => setChangePw(true)} />
        <Row icon="clipboard" label="Redo my questions quiz" onPress={() => router.push('/retake-quiz')} last />
      </Card>

      <SectionTitle>Appearance</SectionTitle>
      <Card>
        <Txt weight="700">Light or dark</Txt>
        <Segmented<ThemeMode>
          value={settings.themeMode}
          onChange={(v) => updateSettings({ themeMode: v })}
          options={[
            { value: 'light', label: 'Light', icon: 'sunny' },
            { value: 'dark', label: 'Dark', icon: 'moon' },
            { value: 'system', label: 'Auto', icon: 'phone-portrait' },
          ]}
        />
        <Txt weight="700">Color</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {(Object.keys(ACCENTS) as AccentName[]).map((k) => {
            const on = settings.accent === k;
            return (
              <Pressable key={k} onPress={() => updateSettings({ accent: k })} accessibilityLabel={ACCENTS[k].label} style={{ alignItems: 'center', gap: 4 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: t.dark ? ACCENTS[k].dark : ACCENTS[k].light,
                    borderWidth: on ? 4 : 0,
                    borderColor: t.colors.text,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {on ? <Ionicons name="checkmark" size={22} color={t.colors.onPrimary} /> : null}
                </View>
                <Txt size="small" muted>{ACCENTS[k].label}</Txt>
              </Pressable>
            );
          })}
        </View>
        <Txt weight="700">Size of words and buttons</Txt>
        <Txt size="small" muted>Changes everything in the app at once.</Txt>
        <Segmented<TextSize>
          value={settings.textSize}
          onChange={(v) => updateSettings({ textSize: v })}
          options={TEXT_SIZES.map((s) => ({ value: s, label: s === 'xlarge' ? 'XL' : TEXT_SIZE_LABEL[s] }))}
        />
      </Card>

      <SectionTitle>Answering questions</SectionTitle>
      <Card>
        <Txt weight="700">How I answer</Txt>
        <Segmented<Settings['answerStyle']>
          value={settings.answerStyle}
          onChange={(v) => updateSettings({ answerStyle: v })}
          options={[
            { value: 'tap', label: 'Tap', icon: 'hand-left' },
            { value: 'voice', label: 'Talk', icon: 'mic' },
            { value: 'both', label: 'Both', icon: 'apps' },
          ]}
        />
        <Txt weight="700">Questions each time</Txt>
        <Segmented<number>
          value={settings.questionCount}
          onChange={(v) => updateSettings({ questionCount: v })}
          options={[10, 12, 15].map((n) => ({ value: n, label: String(n) }))}
        />
        <Toggle
          label="Stop listening when I go quiet"
          help="Or say “done” or tap “I'm done”."
          value={settings.autoStop}
          onChange={(v) => updateSettings({ autoStop: v })}
        />
      </Card>

      <SectionTitle>Messages</SectionTitle>
      <Card>
        <Txt weight="700">Message length</Txt>
        <Segmented<Settings['messageLength']>
          value={settings.messageLength}
          onChange={(v) => updateSettings({ messageLength: v })}
          options={[
            { value: 'long', label: 'Every detail' },
            { value: 'medium', label: 'Compact' },
          ]}
        />
        <Txt size="small" muted>Noema only smooths out what you said. It never adds anything new.</Txt>
      </Card>

      <SectionTitle>Privacy</SectionTitle>
      <Card style={{ padding: 0, gap: 0 }}>
        <Row icon="sparkles" label="AI helper" value={aiEnabled() ? 'On' : 'Off'} />
        <Row icon="trash" label={`Delete message history (${messages.length})`} onPress={clearHistory} danger last />
      </Card>
      <Txt size="small" muted>
        Your voice recordings are sent to OpenAI to be understood, and are not saved by Noema. Messages are stored on this device.
      </Txt>

      <SectionTitle>About</SectionTitle>
      <Card style={{ padding: 0, gap: 0 }}>
        <Row icon="mail" label="Noema" value="Version 1.0" last />
      </Card>

      <Button title="Log out" variant="danger" icon="log-out" onPress={logOut} />
      <View style={{ height: 20 }} />

      <EditProfileModal visible={editProfile} onClose={() => setEditProfile(false)} />
      <ChangePasswordModal visible={changePw} onClose={() => setChangePw(false)} />
    </Screen>
  );
}

function Row({ icon, label, value, onPress, last, danger }: { icon: IconName; label: string; value?: string; onPress?: () => void; last?: boolean; danger?: boolean }) {
  const { theme: t } = useStore();
  const color = danger ? t.colors.danger : t.colors.text;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        minHeight: t.tap,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={24} color={danger ? t.colors.danger : t.colors.primary} />
      <Txt weight="600" color={color} style={{ flex: 1 }}>{label}</Txt>
      {value ? <Txt muted numberOfLines={1} style={{ maxWidth: '45%' }}>{value}</Txt> : null}
      {onPress ? <Ionicons name="chevron-forward" size={20} color={t.colors.muted} /> : null}
    </Pressable>
  );
}

function Segmented<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: IconName }[] }) {
  const { theme: t } = useStore();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.colors.bg, borderRadius: 16, padding: 4, gap: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              minHeight: 42 * t.scale,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              paddingHorizontal: 4,
              backgroundColor: on ? t.colors.primary : 'transparent',
            }}
          >
            {o.icon ? <Ionicons name={o.icon} size={18} color={on ? t.colors.onPrimary : t.colors.muted} /> : null}
            <Txt size="small" weight="700" color={on ? t.colors.onPrimary : t.colors.text} numberOfLines={1}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function Toggle({ label, help, value, onChange }: { label: string; help?: ReactNode; value: boolean; onChange: (v: boolean) => void }) {
  const { theme: t } = useStore();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Txt weight="700">{label}</Txt>
        {help ? <Txt size="small" muted>{help}</Txt> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.colors.primary }} />
    </View>
  );
}

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useUser();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useDialog();

  async function save() {
    if (next.length < 8) return setError('Use at least 8 characters.');
    if (next !== confirm) return setError('The two new passwords do not match.');
    setBusy(true);
    try {
      await user?.updatePassword({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      setError('');
      onClose();
      void dialog.notify('Password changed');
    } catch (e) {
      setError(clerkMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Screen edges={['bottom']} footer={<Button title="Save new password" big loading={busy} onPress={save} />}>
        <TopBar title="Change password" onBack={onClose} />
        <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
        <Field label="New password" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" />
        <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" error={error} />
      </Screen>
    </Sheet>
  );
}
