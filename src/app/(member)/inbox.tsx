import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { InviteCard } from '@/components/InviteCard';
import { ProfileHeader } from '@/components/ProfileHeader';
import { Avatar, Card, Screen, Txt } from '@/components/ui';
import { useConnections } from '@/lib/connections';
import { formatDate } from '@/lib/format';
import { colorFor, useTheme } from '@/lib/store';

/** Family member's inbox: messages from the people they accepted. */
export default function Inbox() {
  const t = useTheme();
  const { user } = useUser();
  const { messages, family, pending } = useConnections();
  const names = family.map((l) => l.other.name.split(' ')[0]).join(' and ');

  return (
    <Screen edges={['top']}>
      <ProfileHeader />
      {pending.map((l) => (
        <InviteCard key={l.id} link={l} />
      ))}
      <Txt size="large" weight="800" style={{ marginTop: 4 }}>Inbox</Txt>

      {messages.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Ionicons name="mail-outline" size={40} color={t.colors.muted} />
          <Txt weight="700" center>No messages yet</Txt>
          <Txt size="small" muted center>When {names} shares their day, it will show up here.</Txt>
        </Card>
      ) : (
        messages.map((m) => {
          const unread = !m.readBy.includes(user?.id ?? '');
          return (
            <Pressable key={m.id} onPress={() => router.push({ pathname: '/message/[id]', params: { id: m.id } })}>
              {({ pressed }) => (
                <Card style={{ opacity: pressed ? 0.8 : 1, flexDirection: 'row', gap: 12, borderColor: unread ? t.colors.primary : t.colors.border }}>
                  <Avatar name={m.from.name} uri={m.from.imageUrl} color={colorFor(m.from.id)} size={44 * t.scale} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {unread ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: t.colors.primary }} /> : null}
                      <Txt weight={unread ? '800' : '600'} style={{ flex: 1 }} numberOfLines={1}>{m.from.name}</Txt>
                    </View>
                    <Txt size="small" muted>{formatDate(m.createdAt)}</Txt>
                    <Txt size="small" numberOfLines={2}>{m.text.replace(/^Hello family,\s*/i, '')}</Txt>
                  </View>
                </Card>
              )}
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
