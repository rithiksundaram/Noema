import { ClerkProvider, useAuth, useUser } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OverlayProvider } from '@/components/Overlay';
import { PhoneFrame } from '@/components/PhoneFrame';
import { StoreProvider, useStore } from '@/lib/store';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export default function RootLayout() {
  if (!publishableKey) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#FBF6EE' }}>
        <Text style={{ fontSize: 22, fontWeight: '700', textAlign: 'center', color: '#1D2828' }}>
          Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env file, then restart Expo.
        </Text>
      </View>
    );
  }
  return (
    // On web Clerk keeps the session in browser cookies, so the phone token cache is only for iOS/Android.
    <ClerkProvider publishableKey={publishableKey} tokenCache={Platform.OS === 'web' ? undefined : tokenCache}>
      <SafeAreaProvider>
        <StoreProvider>
          <Framed />
        </StoreProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}

function Framed() {
  const { theme } = useStore();
  return (
    <PhoneFrame dark={theme.dark}>
      <OverlayProvider>
        <AppStack />
      </OverlayProvider>
    </PhoneFrame>
  );
}

/** Decides which part of the app you can see: sign-in, the quiz, or the main app. */
function AppStack() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { ready, theme } = useStore();

  if (!isLoaded || (isSignedIn && (!user || !ready))) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const onboarded = Boolean(user?.unsafeMetadata?.onboarded);

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!!isSignedIn && !onboarded}>
          <Stack.Screen name="quiz" />
        </Stack.Protected>
        <Stack.Protected guard={!!isSignedIn && onboarded}>
          <Stack.Screen name="(home)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="compose" options={{ gestureEnabled: false }} />
          <Stack.Screen name="message/[id]" />
          <Stack.Screen name="retake-quiz" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
