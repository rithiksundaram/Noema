import { useSignIn } from '@clerk/expo';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Field, Screen, TopBar, Txt } from '@/components/ui';
import { clerkMessage } from '@/lib/clerkError';
import { useTheme } from '@/lib/store';

export default function SignIn() {
  const { signIn, fetchStatus } = useSignIn();
  const t = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState('');
  const busy = fetchStatus === 'fetching';

  async function finish() {
    if (!signIn) return;
    if (signIn.status === 'complete') {
      const { error: e } = await signIn.finalize();
      if (e) setError(clerkMessage(e));
    } else if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
      // New device check: Clerk emails a code.
      await signIn.mfa.sendEmailCode();
      setNeedsCode(true);
    } else {
      setError('We could not log you in. Please check your username and password.');
    }
  }

  async function logIn() {
    if (!signIn) return;
    setError('');
    const { error: e } = await signIn.password({ identifier: username.trim(), password });
    if (e) return setError(clerkMessage(e));
    await finish();
  }

  async function verify() {
    if (!signIn) return;
    const { error: e } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
    if (e) return setError(clerkMessage(e));
    await finish();
  }

  return (
    <Screen
      footer={
        <>
          {needsCode ? (
            <Button title="Verify" big loading={busy} disabled={code.length < 6} onPress={verify} />
          ) : (
            <Button title="Log in" big loading={busy} disabled={!username || !password} onPress={logIn} />
          )}
          <Button title="New here? Sign up" variant="ghost" onPress={() => router.replace('/sign-up')} />
        </>
      }
    >
      <TopBar title="Log in" />
      <Txt size="title" weight="800">Welcome back</Txt>
      {error ? (
        <View style={{ backgroundColor: t.colors.dangerSoft, padding: 14, borderRadius: 14 }}>
          <Txt color={t.colors.danger}>{error}</Txt>
        </View>
      ) : null}
      {needsCode ? (
        <>
          <Txt muted>For your safety, we emailed you a 6-digit code.</Txt>
          <Field label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} />
        </>
      ) : (
        <>
          <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={logIn} />
        </>
      )}
    </Screen>
  );
}
