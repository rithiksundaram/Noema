import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, Share, View } from 'react-native';

import { Sheet, useDialog } from '@/components/Overlay';
import { Button, Screen, TopBar, Txt } from '@/components/ui';
import { formatDate, formatTime } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function MessageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { messages, removeMessage, lastSentId, setLastSentId, theme: t } = useStore();
  const [showWords, setShowWords] = useState(false);
  const dialog = useDialog();
  const msg = messages.find((m) => m.id === id);

  if (!msg) {
    return (
      <Screen>
        <TopBar title="Message" />
        <Txt muted center>This message was unsent.</Txt>
      </Screen>
    );
  }

  async function unsend() {
    const yes = await dialog.confirm({ title: 'Unsend this message?', message: 'Your family will no longer see it.', confirmText: 'Unsend', cancelText: 'Keep it', destructive: true });
    if (!yes) return;
    if (lastSentId === msg!.id) setLastSentId(null);
    removeMessage(msg!.id);
    router.back();
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

  return (
    <Screen
      scroll={false}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Unsend" variant="danger" icon="arrow-undo" onPress={unsend} style={{ flex: 1 }} />
          <Button title="Share" icon="share-outline" onPress={share} style={{ flex: 1 }} />
        </View>
      }
    >
      <TopBar title={formatDate(msg.createdAt)} />
      <Txt size="small" muted>
        Sent at {formatTime(msg.createdAt)} to {msg.recipientNames.join(', ')}
      </Txt>
      <View style={{ flex: 1, backgroundColor: t.colors.card, borderRadius: t.radius, borderWidth: 1, borderColor: t.colors.border, overflow: 'hidden' }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Txt color={t.colors.text} style={{ lineHeight: t.font.body * 1.45 }} selectable>
            {msg.text}
          </Txt>
        </ScrollView>
      </View>
      <Button title="Show my answers" variant="ghost" icon="list" onPress={() => setShowWords(true)} />
      <Sheet visible={showWords} onClose={() => setShowWords(false)}>
        <Screen edges={['bottom']}>
          <TopBar title="My answers" onBack={() => setShowWords(false)} />
          {msg.answers.map((a, i) => (
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
