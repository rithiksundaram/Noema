import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Platform, Pressable, View } from 'react-native';

import { aiEnabled, transcribe, understand } from '@/lib/ai';
import { useStore } from '@/lib/store';
import { useDialog } from './Overlay';
import { Button, Txt } from './ui';

/** Louder than this (in dB) counts as her talking. */
const SPEECH_DB = -38;
/** Stop after this much quiet once she has said something. */
const QUIET_MS = 1800;
/** Give up if she says nothing at all for this long. */
const NOTHING_MS = 9000;
const MAX_MS = 45000;

type Phase = 'idle' | 'listening' | 'thinking';

/**
 * The mic button at the top of each question.
 * She taps it, says a few words, then says "done" (or just stops talking, or taps "I'm done").
 * We send the recording to OpenAI to hear it, then have the AI work out what she meant.
 */
export function VoiceRecorder({ question, onHeard }: { question: string; onHeard: (heard: string) => void }) {
  const { theme: t, settings } = useStore();
  const dialog = useDialog();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(recorder, 150);
  const [phase, setPhase] = useState<Phase>('idle');
  const heardSpeech = useRef(false);
  const lastLoud = useRef(0);
  const startedAt = useRef(0);
  const stopping = useRef(false);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== 'listening') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);

  // Watch the volume so we know when she has finished talking.
  useEffect(() => {
    if (phase !== 'listening' || !state.isRecording) return;
    const now = Date.now();
    if ((state.metering ?? -160) > SPEECH_DB) {
      heardSpeech.current = true;
      lastLoud.current = now;
    }
    const elapsed = now - startedAt.current;
    const quietFor = now - lastLoud.current;
    if (
      elapsed > MAX_MS ||
      (settings.autoStop && heardSpeech.current && quietFor > QUIET_MS) ||
      (!heardSpeech.current && elapsed > NOTHING_MS)
    ) {
      void finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.metering, state.isRecording, phase]);

  async function start() {
    if (!aiEnabled()) {
      void dialog.notify('Voice needs the AI key', 'Add an OpenAI key to the .env file to turn on voice answers.');
      return;
    }
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      if (Platform.OS === 'web') {
        void dialog.notify('Microphone is off', 'Allow the microphone in your browser (the icon in the address bar), then try again.');
      } else if (await dialog.confirm({ title: 'Microphone is off', message: 'Please allow the microphone so you can answer by talking.', confirmText: 'Open Settings', cancelText: 'Not now' })) {
        void Linking.openSettings();
      }
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    heardSpeech.current = false;
    stopping.current = false;
    startedAt.current = Date.now();
    lastLoud.current = Date.now();
    setPhase('listening');
  }

  async function finish(cancel = false) {
    if (stopping.current) return;
    stopping.current = true;
    const spoke = heardSpeech.current;
    setPhase(cancel ? 'idle' : 'thinking');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      if (cancel) return;
      const uri = recorder.uri;
      if (!uri || !spoke) {
        setPhase('idle');
        void dialog.notify("I didn't hear anything", 'Tap the microphone and try again, or tap an answer below.');
        return;
      }
      const raw = await transcribe(uri);
      const meaning = await understand(question, raw);
      setPhase('idle');
      if (!meaning) {
        void dialog.notify("I didn't catch that", 'Tap the microphone and try again, or tap an answer below.');
        return;
      }
      onHeard(meaning);
    } catch (e) {
      console.warn(e);
      setPhase('idle');
      void dialog.notify('Something went wrong', 'I could not understand the recording. Please try again or tap an answer.');
    }
  }

  if (phase === 'listening') {
    const level = Math.max(0, Math.min(1, ((state.metering ?? -60) + 60) / 50));
    return (
      <View style={{ alignItems: 'center', gap: 8 }}>
        <View style={{ width: 76, height: 76, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={{
              position: 'absolute',
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: t.colors.stamp,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] }),
              transform: [{ scale: 0.85 + level * 0.3 }],
            }}
          />
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: t.colors.stamp, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="mic" size={28} color="#fff" />
          </View>
        </View>
        <Txt weight="700" center>Listening… say a few words, then “done”.</Txt>
        <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
          <Button title="Cancel" variant="ghost" onPress={() => finish(true)} style={{ flex: 1 }} />
          <Button title="I'm done" icon="checkmark" onPress={() => finish()} style={{ flex: 2 }} />
        </View>
      </View>
    );
  }

  if (phase === 'thinking') {
    return (
      <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
        <Ionicons name="ellipsis-horizontal" size={30} color={t.colors.primary} />
        <Txt weight="600" center>Understanding what you said…</Txt>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Answer by talking"
      onPress={start}
      style={({ pressed }) => ({
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 18,
        height: 44 * t.scale,
        borderRadius: 22 * t.scale,
        backgroundColor: t.colors.soft,
        borderWidth: 2,
        borderColor: t.colors.primary,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Ionicons name="mic" size={20 * t.scale} color={t.colors.primary} />
      <Txt weight="700" color={t.colors.primary}>Tap to talk</Txt>
    </Pressable>
  );
}
