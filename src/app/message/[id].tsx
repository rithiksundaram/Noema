import { useUser } from '@clerk/expo';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, Share, View } from 'react-native';

import { Sheet, useDialog } from '@/components/Overlay';
import { Avatar, Button, Screen, TopBar, Txt } from '@/components/ui';
import { useConnections } from '@/lib/connections';
import { formatDate, formatTime } from '@/lib/format';
import { colorFor, useStore } from '@/lib/store';

/** One message. Operators can unsend and see who read it; family members just read it. */
export default function MessageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();
  const { lastSentId, setLastSentId, theme: t } = useStore();
  const { messages, unsend: unsendMessage, markRead } = useConnections();
  const [showWords, setShowWords] = useState(false);
  const dialog = useDialog();
  const msg = messages.find((m) => m.id === id);
  const mine = msg?.from.id === user?.id;

  // Opening a message as family marks it read, so the sender knows it arrived.
  useEffect(() => {
    if (msg && !mine && user && !msg.readBy.includes(user.id)) void markRead(msg.id).catch(() => {});
  }, [msg, mine, user, markRead]);

  if (!msg) {
    return (
      <Screen>
        <TopBar title="Message" />
        <Txt muted center>This message is no longer available.</Txt>
      </Screen>
    );
  }

  async function unsend() {
    const yes = await dialog.confirm({ title: 'Unsend this message?', message: 'Your family will no longer see it.', confirmText: 'Unsend', cancelText: 'Keep it', destructive: true });
    if (!yes) return;
    try {
      if (lastSentId === msg!.id) setLastSentId(null);
      await unsendMessage(msg!.id);
      router.back();
    } catch (e) {
      void dialog.notify('Could not unsend', e instanceof Error ? e.message : undefined);
    }
  }

  async function share() {
    // Computers often have no share menu, so copy the message instead.
    if (Platform.OS === 'web' && !navigator.share) {
      await navigator.clipboard.writeText(msg!.text);
      return dialog.notify('Copied', 'The message is copied. Paste it into a text or email.');
    }
    try {
      await Share.share({ message: msg!.text });
    } catch {}
  }

  const readNames = msg.recipients.filter((r) => msg.readBy.includes(r.id)).map((r) => r.name);

  return (
    <Screen
      scroll={false}
      footer={
        mine ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Unsend" variant="danger" icon="arrow-undo" onPress={unsend} style={{ flex: 1 }} />
            <Button title="Share" icon="share-outline" onPress={share} style={{ flex: 1 }} />
          </View>
        ) : (
          <Button title="Back to inbox" variant="secondary" icon="mail" onPress={() => router.back()} />
        )
      }
    >
      <TopBar title={formatDate(msg.createdAt)} />
      {mine ? (
        <Txt size="small" muted>
          Sent at {formatTime(msg.createdAt)} to {msg.recipients.map((r) => r.name).join(', ')}
          {'\n'}
          {readNames.length ? `Read by ${readNames.join(', ')}` : 'Not read yet'}
        </Txt>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar name={msg.from.name} uri={msg.from.imageUrl} color={colorFor(msg.from.id)} size={36 * t.scale} />
          <Txt size="small" muted>From {msg.from.name} · {formatTime(msg.createdAt)}</Txt>
        </View>
      )}
      <View style={{ flex: 1, backgroundColor: t.colors.card, borderRadius: t.radius, borderWidth: 1, borderColor: t.colors.border, overflow: 'hidden' }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Txt style={{ lineHeight: t.font.body * 1.45 }} selectable>
            {msg.text}
          </Txt>
        </ScrollView>
      </View>
      {mine && msg.answers?.length ? <Button title="Show my answers" variant="ghost" icon="list" onPress={() => setShowWords(true)} /> : null}
      <Sheet visible={showWords} onClose={() => setShowWords(false)}>
        <Screen edges={['bottom']}>
          <TopBar title="My answers" onBack={() => setShowWords(false)} />
          {(msg.answers ?? []).map((a, i) => (
            <View key={i} style={{ gap: 2 }}>
              <Txt size="small" muted>{a.question}</Txt>
              <Txt>“{a.answer}”</Txt>
            </View>
          ))}
        </Screen>
      </Sheet>
    </Screen>
  );
}
