import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/store';
import { tabBarHeight } from '@/lib/theme';

/** The two big bars at the bottom of the profile page: Family and Messages. */
export default function HomeTabs() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
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
