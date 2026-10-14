import { useClerk, useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useStore } from '@/lib/store';
import { TEXT_SIZE_LABEL, TEXT_SIZES } from '@/lib/theme';
import type { QuizAnswers, TextSize } from '@/lib/types';
import { Button, Choice, Field, ProgressBar, Screen, TopBar, Txt, type IconName } from './ui';

type Q =
  | { key: 'struggles' | 'topics'; title: string; help: string; multi: true; options: { label: string; icon: IconName }[] }
  | { key: 'answerStyle' | 'textSize' | 'bestTime' | 'audience' | 'tone'; title: string; help: string; multi?: false; options: { label: string; value: string; icon: IconName; description?: string }[] }
  | { key: 'note'; title: string; help: string; text: true };

const QUESTIONS: Q[] = [
  {
    key: 'struggles',
    title: 'What is hard about telling people about your day?',
    help: 'Pick all that fit.',
    multi: true,
    options: [
      { label: 'Finding the right words', icon: 'chatbubble-ellipses' },
      { label: 'Speaking clearly', icon: 'mic-off' },
      { label: 'Typing on a phone', icon: 'phone-portrait' },
      { label: 'Remembering details', icon: 'bulb' },
      { label: 'Getting tired quickly', icon: 'bed' },
      { label: 'Phone calls are hard', icon: 'call' },
    ],
  },
  {
    key: 'answerStyle',
    title: 'How do you like to answer?',
    help: 'You can change this later.',
    options: [
      { label: 'Tap big buttons', value: 'tap', icon: 'hand-left' },
      { label: 'Say a few words', value: 'voice', icon: 'mic' },
      { label: 'Both', value: 'both', icon: 'apps' },
    ],
  },
  {
    key: 'textSize',
    title: 'Which size is easiest to read?',
    help: 'The whole app changes as you pick. You can change it later in Settings.',
    options: TEXT_SIZES.map((s) => ({ label: TEXT_SIZE_LABEL[s], value: s, icon: 'text' as IconName })),
  },
  {
    key: 'topics',
    title: 'What do you like to talk about?',
    help: 'We will ask more about these.',
    multi: true,
    options: [
      { label: 'Food & cooking', icon: 'restaurant' },
      { label: 'Family', icon: 'people' },
      { label: 'Garden & nature', icon: 'leaf' },
      { label: 'TV & music', icon: 'musical-notes' },
      { label: 'Health', icon: 'heart' },
      { label: 'Friends & neighbors', icon: 'home' },
      { label: 'Walks & outings', icon: 'walk' },
      { label: 'Weather', icon: 'partly-sunny' },
      { label: 'Memories', icon: 'images' },
    ],
  },
  {
    key: 'bestTime',
    title: 'When do you like to share your day?',
    help: '',
    options: [
      { label: 'Morning', value: 'Morning', icon: 'sunny' },
      { label: 'Afternoon', value: 'Afternoon', icon: 'partly-sunny' },
      { label: 'Evening', value: 'Evening', icon: 'moon' },
    ],
  },
  {
    key: 'audience',
    title: 'Who do you write to the most?',
    help: '',
    options: [
      { label: 'My children', value: 'My children', icon: 'person' },
      { label: 'My grandchildren', value: 'My grandchildren', icon: 'happy' },
      { label: 'Friends', value: 'Friends', icon: 'heart-circle' },
      { label: 'Everyone', value: 'Everyone', icon: 'people-circle' },
    ],
  },
  {
    key: 'tone',
    title: 'How should your messages sound?',
    help: '',
    options: [
      { label: 'Warm and chatty', value: 'warm', icon: 'sunny', description: 'Full, friendly sentences' },
      { label: 'Short and simple', value: 'simple', icon: 'remove', description: 'Easy, plain sentences' },
      { label: 'Just like me', value: 'me', icon: 'person-circle', description: 'Close to how I talk' },
    ],
  },
  { key: 'note', title: 'Anything else we should know?', help: 'Optional. You can skip this.', text: true },
];

const EMPTY: QuizAnswers = { struggles: [], answerStyle: 'both', textSize: 'medium', topics: [], bestTime: 'Evening', audience: 'Everyone', tone: 'warm' };

export function QuizFlow({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { updateSettings, settings, theme: t } = useStore();
  const saved = user?.unsafeMetadata?.quiz as QuizAnswers | undefined;
  const [answers, setAnswers] = useState<QuizAnswers>({ ...EMPTY, ...saved, textSize: settings.textSize });
  const [i, setI] = useState(0);
  const [saving, setSaving] = useState(false);
  const q = QUESTIONS[i];
  const last = i === QUESTIONS.length - 1;

  function pickSingle(key: string, value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
    if (key === 'textSize') updateSettings({ textSize: value as TextSize });
    if (key === 'answerStyle') updateSettings({ answerStyle: value as QuizAnswers['answerStyle'] });
  }

  function toggleMulti(key: 'struggles' | 'topics', label: string) {
    setAnswers((a) => ({ ...a, [key]: a[key].includes(label) ? a[key].filter((x) => x !== label) : [...a[key], label] }));
  }

  async function next() {
    if (!last) return setI(i + 1);
    if (!user) return;
    setSaving(true);
    try {
      await user.updateMetadata({ unsafeMetadata: { quiz: answers, onboarded: true } });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      footer={<Button title={last ? 'Finish' : 'Next'} big icon={last ? 'checkmark' : 'arrow-forward'} loading={saving} onPress={next} />}
    >
      <TopBar
        title={`Question ${i + 1} of ${QUESTIONS.length}`}
        onBack={i > 0 ? () => setI(i - 1) : (onCancel ?? (() => signOut()))}
      />
      <ProgressBar value={(i + 1) / QUESTIONS.length} />
      <Txt size="title" weight="800">{q.title}</Txt>
      {q.help ? <Txt size="small" muted>{q.help}</Txt> : null}
      <View style={{ gap: 8 }}>
        {'text' in q ? (
          <Field
            label="Your note"
            multiline
            placeholder="For example: I can't hear well on the phone."
            value={answers.note ?? ''}
            onChangeText={(v) => setAnswers((a) => ({ ...a, note: v }))}
            style={{ minHeight: 120, textAlignVertical: 'top' }}
          />
        ) : q.multi ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {q.options.map((o) => {
              const on = answers[q.key].includes(o.label);
              return (
                <Pressable
                  key={o.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => toggleMulti(q.key, o.label)}
                  style={({ pressed }) => ({
                    width: '48.5%',
                    minHeight: 72 * t.scale,
                    borderRadius: t.radius,
                    borderWidth: 2,
                    borderColor: on ? t.colors.primary : t.colors.border,
                    backgroundColor: on ? t.colors.soft : t.colors.card,
                    padding: 10,
                    gap: 4,
                    justifyContent: 'center',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Ionicons name={o.icon} size={22 * t.scale} color={t.colors.primary} />
                    {on ? <Ionicons name="checkmark-circle" size={20 * t.scale} color={t.colors.primary} /> : null}
                  </View>
                  <Txt size="small" weight="700">{o.label}</Txt>
                </Pressable>
              );
            })}
          </View>
        ) : (
          q.options.map((o) => (
            <Choice
              key={o.value}
              label={o.label}
              icon={o.icon}
              description={o.description}
              selected={answers[q.key] === o.value}
              onPress={() => pickSingle(q.key, o.value)}
            />
          ))
        )}
      </View>
    </Screen>
  );
}
