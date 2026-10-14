import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Sheet, useDialog } from '@/components/Overlay';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { Button, Card, Chip, Choice, Field, ProgressBar, Screen, TopBar, Txt } from '@/components/ui';
import { editMessage, nextQuestion, writeMessage } from '@/lib/ai';
import { firstQuestion } from '@/lib/questions';
import { useStore } from '@/lib/store';
import type { AskedQuestion, QA, QuizAnswers } from '@/lib/types';

type Stage = 'questions' | 'checkpoint' | 'writing' | 'review' | 'send';

/** How many more questions "Ask me more" adds. */
const MORE = 3;
const SKIPPED = '(skipped)';

export default function Compose() {
  const { user } = useUser();
  const { settings, family, addMessage, setLastSentId, addMember, theme: t } = useStore();
  const dialog = useDialog();
  const quiz = user?.unsafeMetadata?.quiz as QuizAnswers | undefined;
  const firstName = user?.firstName ?? '';

  const [stage, setStage] = useState<Stage>('questions');
  const [answers, setAnswers] = useState<QA[]>([]);
  const [current, setCurrent] = useState<AskedQuestion>(firstQuestion());
  /** The question (with its buttons) behind each answer, so Back can re-ask it. */
  const [asked, setAsked] = useState<AskedQuestion[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [target, setTarget] = useState(Math.max(10, settings.questionCount));
  const [heard, setHeard] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [message, setMessage] = useState('');
  const [editingText, setEditingText] = useState(false);
  const [editBusy, setEditBusy] = useState<string | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [answersOpen, setAnswersOpen] = useState(false);
  const [recipients, setRecipients] = useState<string[]>(() => family.map((f) => f.id));
  const loadId = useRef(0);
  const knownIds = useRef(family.map((f) => f.id));

  const showMic = settings.answerStyle !== 'tap';
  const realAnswers = answers.filter((a) => a.answer !== SKIPPED);

  // Keep the recipient list in step with the family list (e.g. after a quick add below).
  useEffect(() => {
    setRecipients((r) => {
      const ids = family.map((f) => f.id);
      const added = ids.filter((id) => !knownIds.current.includes(id));
      knownIds.current = ids;
      return [...r.filter((id) => ids.includes(id)), ...added];
    });
  }, [family]);

  async function loadNext(list: QA[]) {
    const id = ++loadId.current;
    setLoadingQ(true);
    const q = await nextQuestion(quiz, list);
    if (id !== loadId.current) return;
    setCurrent(q);
    setLoadingQ(false);
  }

  function answer(text: string, via: QA['via']) {
    const a = text.trim();
    if (!a) return;
    const list = [...answers, { question: current.question, answer: a, via }];
    setAnswers(list);
    setAsked([...asked, current]);
    setHeard(null);
    setTyping(false);
    if (list.length >= target) setStage('checkpoint');
    else void loadNext(list);
  }

  function goBack() {
    if (stage === 'review') return setStage('checkpoint');
    if (stage === 'send') return setStage('review');
    if (stage === 'checkpoint' || (stage === 'questions' && answers.length > 0)) {
      // Re-ask the previous question.
      loadId.current++;
      setLoadingQ(false);
      setCurrent(asked[asked.length - 1]);
      setAsked(asked.slice(0, -1));
      setAnswers(answers.slice(0, -1));
      setHeard(null);
      setStage('questions');
      return;
    }
    confirmLeave();
  }

  async function confirmLeave() {
    if (answers.length === 0 && !message) return router.back();
    const stop = await dialog.confirm({ title: 'Stop this message?', message: 'Your answers will not be saved.', confirmText: 'Stop', cancelText: 'Keep going', destructive: true });
    if (stop) router.back();
  }

  async function write() {
    setStage('writing');
    const text = await writeMessage(realAnswers, quiz, firstName, settings.messageLength);
    setMessage(text);
    setStage('review');
  }

  function askMore() {
    setTarget(answers.length + MORE);
    setStage('questions');
    void loadNext(answers);
  }

  async function applyEdit(label: string, request: string) {
    setEditBusy(label);
    try {
      setMessage(await editMessage(message, request, realAnswers));
    } catch {
      void dialog.notify('Could not change it', 'Please try again.');
    } finally {
      setEditBusy(null);
    }
  }

  function send() {
    const chosen = family.filter((f) => recipients.includes(f.id));
    const msg = addMessage({ text: message.trim(), answers: realAnswers, recipientIds: chosen.map((f) => f.id), recipientNames: chosen.map((f) => f.name) });
    setLastSentId(msg.id);
    router.dismissTo('/family');
  }

  // ---------- Screens ----------

  if (stage === 'writing') {
    return (
      <Screen scroll={false} contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={t.colors.primary} />
        <Txt size="large" weight="700" center>Writing your message…</Txt>
        <Txt muted center>Using only what you told me.</Txt>
      </Screen>
    );
  }

  if (stage === 'checkpoint') {
    return (
      <Screen
        scroll={false}
        footer={
          <>
            <Button title="Write my message" big icon="create" disabled={realAnswers.length === 0} onPress={write} />
            <Button title="Ask me a few more" variant="secondary" icon="add-circle" onPress={askMore} />
          </>
        }
      >
        <TopBar title="All done!" onBack={goBack} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Ionicons name="sparkles" size={48} color={t.colors.stamp} />
          <Txt size="title" weight="800" center>You answered {answers.length} questions</Txt>
          <Txt muted center>I will turn your answers into a message for your family.</Txt>
          <Button title="See my answers" variant="ghost" icon="list" onPress={() => setAnswersOpen(true)} />
        </View>
        <Sheet visible={answersOpen} onClose={() => setAnswersOpen(false)}>
          <Screen edges={['bottom']}>
            <TopBar title="Your answers" onBack={() => setAnswersOpen(false)} />
            {realAnswers.map((a, i) => (
              <View key={i} style={{ gap: 2 }}>
                <Txt size="small" muted>{a.question}</Txt>
                <Txt>“{a.answer}”</Txt>
              </View>
            ))}
          </Screen>
        </Sheet>
      </Screen>
    );
  }

  if (stage === 'review') {
    const edits = [
      { label: 'Shorter', icon: 'remove' as const, request: 'Make it shorter.' },
      { label: 'Simpler words', icon: 'text' as const, request: 'Use simpler, everyday words.' },
    ];
    return (
      <Screen
        scroll={false}
        footer={<Button title="Looks good — choose who gets it" big icon="arrow-forward" disabled={!!editBusy || !message.trim()} onPress={() => setStage('send')} />}
      >
        <TopBar title="Your message" onBack={goBack} />
        <View style={{ flex: 1, backgroundColor: t.colors.card, borderRadius: t.radius, borderWidth: 1, borderColor: t.colors.border, overflow: 'hidden' }}>
          {editingText ? (
            <TextInput
              multiline
              value={message}
              onChangeText={setMessage}
              autoFocus
              style={{ flex: 1, padding: 16, fontSize: t.font.body, lineHeight: t.font.body * 1.45, color: t.colors.text, textAlignVertical: 'top' }}
            />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Txt color={t.colors.text} style={{ lineHeight: t.font.body * 1.45 }}>{message}</Txt>
            </ScrollView>
          )}
          {editBusy ? (
            <View style={{ ...absoluteFill, backgroundColor: t.dark ? 'rgba(27,33,33,0.85)' : 'rgba(247,248,250,0.85)', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <ActivityIndicator color={t.colors.primary} />
              <Txt color={t.colors.text} weight="600">{editBusy}…</Txt>
            </View>
          ) : null}
        </View>

        <Txt size="small" weight="700" muted>Want to change anything?</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label="Say a change" icon="mic" onPress={() => setChangeOpen(true)} disabled={!!editBusy} />
          {edits.map((e) => (
            <Chip key={e.label} label={e.label} icon={e.icon} disabled={!!editBusy} onPress={() => applyEdit(e.label, e.request)} />
          ))}
          <Chip label={editingText ? 'Done editing' : 'Edit myself'} icon={editingText ? 'checkmark' : 'pencil'} active={editingText} onPress={() => setEditingText(!editingText)} />
          <Chip label="Rewrite" icon="refresh" disabled={!!editBusy} onPress={() => write()} />
        </View>

        <ChangeSheet
          visible={changeOpen}
          onClose={() => setChangeOpen(false)}
          onSubmit={(req) => {
            setChangeOpen(false);
            void applyEdit('Making your change', req);
          }}
        />
      </Screen>
    );
  }

  if (stage === 'send') {
    const allOn = family.length > 0 && recipients.length === family.length;
    const label =
      recipients.length === 0
        ? 'Pick someone first'
        : allOn && family.length > 1
          ? 'Send to everyone'
          : `Send to ${recipients.length === 1 ? family.find((f) => f.id === recipients[0])?.name : `${recipients.length} people`}`;
    return (
      <Screen footer={<Button title={label} big icon="paper-plane" disabled={recipients.length === 0} onPress={send} />}>
        <TopBar title="Who gets it?" onBack={goBack} />
        {family.length > 1 ? (
          <Choice label="Everyone" icon="people" selected={allOn} onPress={() => setRecipients(allOn ? [] : family.map((f) => f.id))} />
        ) : null}
        {family.map((f) => (
          <Choice
            key={f.id}
            label={f.name}
            description={f.relation}
            selected={recipients.includes(f.id)}
            onPress={() => setRecipients((r) => (r.includes(f.id) ? r.filter((x) => x !== f.id) : [...r, f.id]))}
          />
        ))}
        <QuickAdd onAdd={(name) => addMember({ name, relation: 'Family' })} first={family.length === 0} />
      </Screen>
    );
  }

  // stage === 'questions'
  const n = answers.length + 1;
  return (
    <Screen
      scroll={false}
      footer={
        heard ? null : (
          <View style={{ gap: 10 }}>
            {loadingQ
              ? null
              : current.options.map((o) => <Button key={o} title={o} big variant="secondary" onPress={() => answer(o, 'tap')} />)}
            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
              <Button title="Type instead" variant="ghost" icon="create-outline" onPress={() => setTyping(true)} />
              <Button title="Skip" variant="ghost" icon="play-skip-forward-outline" onPress={() => answer(SKIPPED, 'tap')} />
            </View>
          </View>
        )
      }
    >
      <TopBar
        title={`Question ${n} of ${target}`}
        onBack={goBack}
        right={
          <Pressable onPress={confirmLeave} hitSlop={10} accessibilityLabel="Stop">
            <Ionicons name="close" size={26} color={t.colors.muted} />
          </Pressable>
        }
      />
      <ProgressBar value={answers.length / target} />

      <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
        {loadingQ ? (
          <View style={{ alignItems: 'center', gap: 10 }}>
            <ActivityIndicator size="large" color={t.colors.primary} />
            <Txt muted center>Thinking of the next question…</Txt>
          </View>
        ) : (
          <Txt size="huge" weight="800" center>{current.question}</Txt>
        )}

        {heard ? (
          <Card style={{ borderColor: t.colors.primary, borderWidth: 2 }}>
            <Txt size="small" muted>I think you said:</Txt>
            <Txt>“{heard}”</Txt>
            <Txt size="small" muted>Is that right?</Txt>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Try again" variant="secondary" icon="mic" onPress={() => setHeard(null)} style={{ flex: 1 }} />
              <Button title="Yes" icon="checkmark" onPress={() => answer(heard, 'voice')} style={{ flex: 1 }} />
            </View>
          </Card>
        ) : showMic && !loadingQ ? (
          <VoiceRecorder key={current.question} question={current.question} onHeard={setHeard} />
        ) : null}
      </View>

      <TypeSheet visible={typing} question={current.question} onClose={() => setTyping(false)} onSubmit={(v) => answer(v, 'type')} />
    </Screen>
  );
}

const absoluteFill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

function TypeSheet({ visible, question, onClose, onSubmit }: { visible: boolean; question: string; onClose: () => void; onSubmit: (v: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Screen
        edges={['bottom']}
        footer={
          <Button
            title="Use this answer"
            big
            disabled={!value.trim()}
            onPress={() => {
              onSubmit(value);
              setValue('');
            }}
          />
        }
      >
        <TopBar title="Type your answer" onBack={onClose} />
        <Txt size="large" weight="700">{question}</Txt>
        <Field label="A few words is enough" value={value} onChangeText={setValue} autoFocus multiline style={{ minHeight: 90, textAlignVertical: 'top' }} />
      </Screen>
    </Sheet>
  );
}

/** "Say a change": she says or types what to change, e.g. "mention the birds". */
function ChangeSheet({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (v: string) => void }) {
  const [value, setValue] = useState('');
  const q = 'What would you like to change?';
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Screen
        edges={['bottom']}
        footer={
          <Button
            title="Make this change"
            big
            disabled={!value.trim()}
            onPress={() => {
              onSubmit(value);
              setValue('');
            }}
          />
        }
      >
        <TopBar title="Change something" onBack={onClose} />
        <Txt size="large" weight="700">{q}</Txt>
        <Txt size="small" muted>For example: “Say I made soup, not stew” or “Mention the birds.”</Txt>
        <VoiceRecorder question={q} onHeard={setValue} />
        <Field label="Or type it" value={value} onChangeText={setValue} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
      </Screen>
    </Sheet>
  );
}

function QuickAdd({ onAdd, first }: { onAdd: (name: string) => void; first?: boolean }) {
  const [name, setName] = useState('');
  return (
    <Card>
      <Txt weight="700">{first ? 'Add someone to send it to' : 'Add someone else'}</Txt>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field label="Their name" value={name} onChangeText={setName} placeholder="For example: Iyla" />
        </View>
        <Button
          title="Add"
          icon="person-add"
          variant="soft"
          disabled={!name.trim()}
          onPress={() => {
            onAdd(name.trim());
            setName('');
          }}
        />
      </View>
    </Card>
  );
}
