import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ProfileHeader } from '@/components/ProfileHeader';
import { Card, Screen, Txt } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { useConnections, type MessageView } from '@/lib/connections';
import { useStore } from '@/lib/store';

type Sort = 'newest' | 'oldest' | 'longest' | 'recipient';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'longest', label: 'Longest' },
  { key: 'recipient', label: 'By person' },
];

export default function Messages() {
  const { theme: t } = useStore();
  const { messages } = useConnections();
  const [sort, setSort] = useState<Sort>('newest');

  const sorted = useMemo(() => {
    const list = [...messages];
    const by: Record<Sort, (a: MessageView, b: MessageView) => number> = {
      newest: (a, b) => b.createdAt - a.createdAt,
      oldest: (a, b) => a.createdAt - b.createdAt,
      longest: (a, b) => b.text.length - a.text.length,
      recipient: (a, b) => (a.recipients[0]?.name ?? '').localeCompare(b.recipients[0]?.name ?? ''),
    };
    return list.sort(by[sort]);
  }, [messages, sort]);

  return (
    <Screen edges={['top']}>
      <ProfileHeader />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/compose')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: t.radius,
          backgroundColor: t.colors.primary,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.onPrimary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={28} color={t.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt size="large" weight="800" color={t.colors.onPrimary}>New message</Txt>
          <Txt size="small" color={t.colors.onPrimary}>Tell your family about your day</Txt>
        </View>
      </Pressable>

      <Txt size="large" weight="800" style={{ marginTop: 4 }}>Sent messages</Txt>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Txt size="small" muted style={{ alignSelf: 'center', marginRight: 4 }}>Sort:</Txt>
        {SORTS.map((s) => {
          const on = s.key === sort;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSort(s.key)}
              accessibilityState={{ selected: on }}
              style={{
                paddingHorizontal: 12,
                minHeight: 34 * t.scale,
                borderRadius: 17 * t.scale,
                justifyContent: 'center',
                backgroundColor: on ? t.colors.primary : t.colors.card,
                borderWidth: 1,
                borderColor: on ? t.colors.primary : t.colors.border,
              }}
            >
              <Txt size="small" weight="700" color={on ? t.colors.onPrimary : t.colors.text}>{s.label}</Txt>
            </Pressable>
          );
        })}
      </View>

      {sorted.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Ionicons name="mail-outline" size={40} color={t.colors.muted} />
          <Txt weight="700" center>No messages yet</Txt>
          <Txt muted center>Tap “New message” to share your day.</Txt>
        </Card>
      ) : (
        sorted.map((m) => (
          <Pressable key={m.id} onPress={() => router.push({ pathname: '/message/[id]', params: { id: m.id } })}>
            {({ pressed }) => (
              <Card style={{ opacity: pressed ? 0.8 : 1, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Txt weight="700" style={{ flex: 1 }}>{formatDate(m.createdAt)}</Txt>
                  <Ionicons name="chevron-forward" size={22} color={t.colors.muted} />
                </View>
                <Txt size="small" muted>
                  To {m.recipients.map((r) => r.name).join(', ')}
                  {m.readBy.length ? ` · Read by ${m.readBy.length}` : ' · Not read yet'}
                </Txt>
                <Txt size="small" numberOfLines={2}>{m.text.replace(/^Hello family,\s*/i, '')}</Txt>
              </Card>
            )}
          </Pressable>
        ))
      )}
    </Screen>
  );
}
