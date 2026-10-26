import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';

import { InviteCard } from '@/components/InviteCard';
import { ProfileHeader } from '@/components/ProfileHeader';
import { UsernameCard } from '@/components/UsernameCard';
import { Card, Screen, Txt } from '@/components/ui';
import { useConnections } from '@/lib/connections';
import { useTheme } from '@/lib/store';
import { tabBarHeight } from '@/lib/theme';

/**
 * Family member's app. Until they accept at least one invite they only see the
 * waiting screen: no inbox, nothing to receive.
 */
export default function MemberLayout() {
  const t = useTheme();
  const { ready, family, pending, messages, error } = useConnections();
  const insets = useSafeAreaInsets();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg, gap: 10 }}>
        <ActivityIndicator size="large" color={t.colors.primary} />
        {error ? <Txt size="small" color={t.colors.danger}>{error}</Txt> : null}
      </View>
    );
  }

  if (family.length === 0) return <Waiting />;

  const unread = messages.filter((m) => m.readBy.length === 0).length;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: t.colors.bg },
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.muted,
        // Tall enough for the icon + label at any text size, plus the home-bar area.
        tabBarStyle: { backgroundColor: t.colors.card, borderTopColor: t.colors.border, paddingTop: 6, height: tabBarHeight(t) + insets.bottom },
        tabBarLabelStyle: { fontSize: t.font.small, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarBadge: unread || undefined,
          tabBarIcon: ({ color }) => <Ionicons name="mail" size={24 * t.scale} color={color} />,
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: 'Family',
          tabBarBadge: pending.length || undefined,
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24 * t.scale} color={color} />,
        }}
      />
    </Tabs>
  );
}

function Waiting() {
  const t = useTheme();
  const { pending } = useConnections();
  return (
    <Screen>
      <ProfileHeader />
      {pending.length > 0 ? (
        <>
          <Txt size="large" weight="800">You have an invite</Txt>
          {pending.map((l) => (
            <InviteCard key={l.id} link={l} />
          ))}
        </>
      ) : (
        <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Ionicons name="hourglass-outline" size={40} color={t.colors.primary} />
          <Txt size="large" weight="800" center>Waiting to be paired</Txt>
          <Txt size="small" muted center>
            You can’t receive messages yet. Ask your family member to add you in Noema using your username below. Their invite will show up here.
          </Txt>
        </Card>
      )}
      <UsernameCard />
    </Screen>
  );
}
