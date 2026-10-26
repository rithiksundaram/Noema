import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { useConnections } from '@/lib/connections';
import { useStore } from '@/lib/store';
import { useDialog } from './Overlay';
import { Txt } from './ui';

/** The small "Message sent" tag shown on the profile after sending, with an X and Unsend. */
export function SentTag() {
  const { lastSentId, setLastSentId, theme: t } = useStore();
  const { messages, unsend: unsendMessage } = useConnections();
  const dialog = useDialog();
  const msg = messages.find((m) => m.id === lastSentId);
  if (!msg) return null;

  async function unsend() {
    const yes = await dialog.confirm({ title: 'Unsend this message?', message: 'Your family will no longer see it.', confirmText: 'Unsend', cancelText: 'Keep it', destructive: true });
    if (!yes) return;
    try {
      await unsendMessage(msg!.id);
      setLastSentId(null);
    } catch (e) {
      void dialog.notify('Could not unsend', e instanceof Error ? e.message : undefined);
    }
  }

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        paddingRight: 6,
        borderRadius: 14,
        backgroundColor: t.colors.soft,
        borderWidth: 2,
        borderColor: t.colors.primary,
      }}
    >
      <Ionicons name="checkmark-circle" size={24 * t.scale} color={t.colors.success} />
      <View style={{ flex: 1 }}>
        <Txt weight="700">Message sent</Txt>
        <Txt size="small" muted numberOfLines={1}>To {msg.recipients.map((r) => r.name).join(', ')}</Txt>
      </View>
      <Pressable
        onPress={unsend}
        accessibilityRole="button"
        style={({ pressed }) => ({ paddingHorizontal: 12, minHeight: 38, borderRadius: 10, justifyContent: 'center', backgroundColor: t.colors.card, opacity: pressed ? 0.7 : 1 })}
      >
        <Txt size="small" weight="700" color={t.colors.danger}>Unsend</Txt>
      </Pressable>
      <Pressable onPress={() => setLastSentId(null)} accessibilityLabel="Close" hitSlop={10} style={{ alignSelf: 'flex-start', padding: 4 }}>
        <Ionicons name="close" size={20} color={t.colors.muted} />
      </Pressable>
    </View>
  );
}
