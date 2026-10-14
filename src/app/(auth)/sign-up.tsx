import { useSignUp } from '@clerk/expo';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Choice, Field, ProgressBar, Screen, TopBar, Txt } from '@/components/ui';
import { clerkMessage } from '@/lib/clerkError';
import { useTheme } from '@/lib/store';
import type { Role } from '@/lib/types';

type Step = 'details' | 'role' | 'email' | 'code';

export default function SignUp() {
  const { signUp, fetchStatus } = useSignUp();
  const t = useTheme();
  const [step, setStep] = useState<Step>('details');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<Role>('operator');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const busy = fetchStatus === 'fetching';

  function checkDetails() {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'Please enter your first name.';
    if (!/^[a-zA-Z0-9_-]{4,64}$/.test(username)) e.username = 'Use at least 4 letters or numbers, no spaces.';
    if (password.length < 8) e.password = 'Use at least 8 characters.';
    if (confirm !== password) e.confirm = 'The two passwords do not match.';
    setErrors(e);
    if (Object.keys(e).length === 0) setStep('role');
  }

  async function finishIfComplete() {
    if (!signUp) return;
    if (signUp.status === 'complete') {
      const { error } = await signUp.finalize();
      if (error) setErrors({ form: clerkMessage(error) });
      return;
    }
    // Some Clerk apps also require an email address. Ask for it only if needed.
    if (signUp.missingFields.includes('email_address') || signUp.unverifiedFields.includes('email_address')) {
      setStep(signUp.emailAddress ? 'code' : 'email');
      if (signUp.emailAddress) await signUp.verifications.sendEmailCode();
      return;
    }
    setErrors({ form: `Clerk still needs: ${signUp.missingFields.join(', ')}. Check your Clerk dashboard settings.` });
  }

  async function createAccount() {
    if (!signUp) return;
    setErrors({});
    const { error } = await signUp.create({
      username,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      unsafeMetadata: { role, onboarded: role === 'member' },
    });
    if (error) {
      setErrors({ form: clerkMessage(error) });
      setStep('details');
      return;
    }
    await finishIfComplete();
  }

  async function addEmail() {
    if (!signUp) return;
    const { error } = await signUp.update({ emailAddress: email.trim() } as never);
    if (error) return setErrors({ email: clerkMessage(error) });
    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) return setErrors({ email: clerkMessage(sendError) });
    setErrors({});
    setStep('code');
  }

  async function verify() {
    if (!signUp) return;
    const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
    if (error) return setErrors({ code: clerkMessage(error) });
    await finishIfComplete();
  }

  const stepIndex = { details: 1, role: 2, email: 3, code: 3 }[step];

  return (
    <Screen
      footer={
        step === 'details' ? (
          <Button title="Next" big icon="arrow-forward" onPress={checkDetails} />
        ) : step === 'role' ? (
          <Button title="Create my account" big loading={busy} onPress={createAccount} />
        ) : step === 'email' ? (
          <Button title="Send me a code" big loading={busy} disabled={!email.includes('@')} onPress={addEmail} />
        ) : (
          <Button title="Verify" big loading={busy} disabled={code.length < 6} onPress={verify} />
        )
      }
    >
      <TopBar title="Create account" onBack={step === 'role' ? () => setStep('details') : undefined} />
      <ProgressBar value={stepIndex / 3} />

      {errors.form ? (
        <View style={{ backgroundColor: t.colors.dangerSoft, padding: 14, borderRadius: 14 }}>
          <Txt color={t.colors.danger}>{errors.form}</Txt>
        </View>
      ) : null}

      {step === 'details' && (
        <>
          <Txt size="title" weight="800">About you</Txt>
          <Field label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" error={errors.firstName} />
          <Field label="Last name (optional)" value={lastName} onChangeText={setLastName} autoComplete="family-name" />
          <Field
            label="Username"
            hint="Your own unique name for logging in."
            value={username}
            onChangeText={(v) => setUsername(v.replace(/\s/g, ''))}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username-new"
            error={errors.username}
          />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" error={errors.password} />
          <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" error={errors.confirm} />
        </>
      )}

      {step === 'role' && (
        <>
          <Txt size="title" weight="800">Who is this account for?</Txt>
          <Choice
            icon="mail-open"
            label="Operator"
            description="I will share my day and send messages to my family."
            selected={role === 'operator'}
            onPress={() => setRole('operator')}
          />
          <Choice
            icon="people"
            label="Member"
            description="I am family and want to receive messages."
            selected={role === 'member'}
            onPress={() => setRole('member')}
          />
          {role === 'operator' ? (
            <Txt muted>Next, a few quick questions so Noema can fit the way you like to share.</Txt>
          ) : null}
        </>
      )}

      {step === 'email' && (
        <>
          <Txt size="title" weight="800">Add an email</Txt>
          <Txt muted>We need an email to finish setting up your account.</Txt>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={errors.email} />
        </>
      )}

      {step === 'code' && (
        <>
          <Txt size="title" weight="800">Check your email</Txt>
          <Txt muted>We sent a 6-digit code to {email || signUp?.emailAddress}.</Txt>
          <Field label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} error={errors.code} />
        </>
      )}
    </Screen>
  );
}
