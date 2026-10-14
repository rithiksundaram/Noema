import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/tabs';

import { useTheme } from '@/lib/store';

/** The two big bars at the bottom of the profile page: Family and Messages. */
export default function HomeTabs() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: t.colors.bg },
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.muted,
        tabBarStyle: { backgroundColor: t.colors.card, borderTopColor: t.colors.border, paddingTop: 4 },
        tabBarLabelStyle: { fontSize: t.font.small, fontWeight: '700' },
        tabBarIconStyle: { marginBottom: 2 },
      }}
    >
      <Tabs.Screen
        name="family"
        options={{ title: 'Family', tabBarIcon: ({ color }) => <Ionicons name="people" size={24 * t.scale} color={color} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: ({ color }) => <Ionicons name="mail" size={24 * t.scale} color={color} /> }}
      />
    </Tabs>
  );
}
