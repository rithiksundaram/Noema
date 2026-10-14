import { router } from 'expo-router';
import { View } from 'react-native';

import { Logo } from '@/components/Logo';
import { Button, Screen, Txt } from '@/components/ui';

export default function Welcome() {
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Logo size={96} />
        <Txt size="title" weight="800" center>
          Welcome to Noema
        </Txt>
        <Txt size="large" muted center>
          Share your day with your family.
        </Txt>
      </View>
      <View style={{ gap: 12, paddingBottom: 8 }}>
        <Button title="Sign up" big onPress={() => router.push('/sign-up')} />
        <Button title="Log in" big variant="secondary" onPress={() => router.push('/sign-in')} />
      </View>
    </Screen>
  );
}
