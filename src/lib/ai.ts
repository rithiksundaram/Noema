import { fallbackQuestion, offlineMessage } from './questions';
import type { AskedQuestion, QA, QuizAnswers } from './types';

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4.1-mini';
const TRANSCRIBE_MODEL = 'gpt-4o-mini-transcribe';
const BASE = 'https://api.openai.com/v1';

export const aiEnabled = () => API_KEY.length > 0;

/** The one rule the whole app is built around. Every AI prompt includes it. */
const NO_INVENTION = `
STRICT RULE: Never invent anything. Only use facts she actually said in her answers.
Do not add people, places, foods, feelings, times, reasons, or events she did not mention.
Do not add descriptions, adjectives, opinions, or reasons she did not give (no "fluttering birds", no "it always feels good", no "it brightened my day").
Do not add "I love you", "I miss you", "take care", or similar unless she said it.
If something is unclear, leave it out rather than guess.`;

function quizSummary(quiz?: QuizAnswers) {
  if (!quiz) return 'No personalization quiz on file.';
  return [
    `Hard for her: ${quiz.struggles.join(', ') || 'not given'}`,
    `Likes to talk about: ${quiz.topics.join(', ') || 'anything'}`,
    `Usually writes to: ${quiz.audience}`,
    quiz.note ? `Extra note from her: ${quiz.note}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

const transcriptOf = (answers: QA[]) =>
  answers.map((a, i) => `${i + 1}. Q: ${a.question}\n   Her answer: ${a.answer}`).join('\n');

async function chat(system: string, user: string, opts: { json?: boolean; temperature?: number } = {}) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: opts.temperature ?? 0.4,
      response_format: opts.json ? { type: 'json_object' } : undefined,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.choices?.[0]?.message?.content ?? '').trim() as string;
}

/**
 * Picks the next question. It reacts to what she just said (e.g. "a visitor" →
 * "Who came to visit?") and leans on topics from her quiz.
 */
export async function nextQuestion(quiz: QuizAnswers | undefined, answers: QA[]): Promise<AskedQuestion> {
  const asked = answers.map((a) => a.question);
  if (!aiEnabled() || answers.length === 0) return fallbackQuestion(quiz, asked);
  try {
    const out = await chat(
      `You help an older woman with speech difficulty and shaky hands share her day with family.
You ask ONE short, kind, simple question at a time (max 12 words), like a caring grandchild would.
- About half the time, follow up on her last answer to get one more concrete detail (who, what, where, how it felt).
- Otherwise move to a new everyday topic: sleep, meals, people, weather, going out, activities, health, mood, what made her smile, needs, what she looks forward to, or her favorite topics.
- Never repeat or rephrase a question already asked. Never ask about something she said she didn't do.
- Never assume something happened. Ask "Did you…?" before asking details about it (e.g. "Did you go in the garden?" not "What flowers did you see?").
- Give 3 or 4 answer buttons, each 1–4 words. Every button must be a direct, sensible answer to THIS question
  (for "Did you go outside?" → "Yes, for a walk", "Just the porch", "No, stayed in"). Never random or unrelated words.
  Include a "No" / "Not today" style button when it fits.
Reply as JSON: {"question": string, "options": string[], "topic": string}`,
      `About her:\n${quizSummary(quiz)}\n\nSo far:\n${transcriptOf(answers)}\n\nWrite question number ${answers.length + 1}.`,
      { json: true, temperature: 0.7 },
    );
    const q = JSON.parse(out) as AskedQuestion;
    if (!q.question || !Array.isArray(q.options) || q.options.length < 2 || asked.includes(q.question)) {
      return fallbackQuestion(quiz, asked);
    }
    const options = await checkOptions(q.question, q.options.slice(0, 4).map(String));
    return { question: q.question, options, topic: q.topic ?? 'ai' };
  } catch (e) {
    console.warn('nextQuestion failed, using built-in question', e);
    return fallbackQuestion(quiz, asked);
  }
}

/** Simple answers that fit almost any question, used if the AI's buttons don't make sense. */
const SAFE_OPTIONS = ['Yes', 'No', 'A little', 'Not sure'];

/**
 * Safety check on the answer buttons: a second, strict pass keeps only buttons that
 * actually answer the question. If too few survive, she gets plain Yes / No buttons instead.
 */
async function checkOptions(question: string, options: string[]): Promise<string[]> {
  try {
    const out = await chat(
      `You check answer buttons for a question shown to an older woman.
For each button, decide if it is a sensible, direct answer to the question. Unrelated, confusing, or odd buttons fail.
Reply as JSON: {"keep": boolean[]} in the same order as the buttons.`,
      `Question: ${question}\nButtons: ${JSON.stringify(options)}`,
      { json: true, temperature: 0 },
    );
    const keep = (JSON.parse(out) as { keep?: boolean[] }).keep ?? [];
    const good = options.filter((o, i) => keep[i] === true && o.trim().length > 0 && o.length <= 30);
    return good.length >= 2 ? good : SAFE_OPTIONS;
  } catch {
    return options;
  }
}

/** Sends her recording to OpenAI and returns the raw words it heard. */
export async function transcribe(uri: string): Promise<string> {
  const form = new FormData();
  const { appendRecording } = await import('./audioFile');
  await appendRecording(form, uri);
  form.append('model', TRANSCRIBE_MODEL);
  form.append('prompt', 'An older woman briefly describing her day in a few words, then saying "done".');
  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Transcription ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.text ?? '').trim();
}

/** Drops the "done" she says at the end. */
export const stripDone = (text: string) => text.replace(/[\s,.!]*\b(i'?m |i am |all )?done[\s.!]*$/i, '').trim();

/**
 * Works out what she meant from a few (maybe jumbled) words, as a short phrase.
 * This is what the app shows back in "I think you said…".
 */
export async function understand(question: string, heard: string): Promise<string> {
  const words = stripDone(heard);
  if (!words) return '';
  try {
    const out = await chat(
      `An older woman with speech difficulty answered a question with a few spoken words. The speech-to-text may be jumbled or have wrong words.
Write what she most likely meant as a short, clear first-person answer.
Drop filler words like "um". Fix obvious mis-hearings and grammar, but keep her meaning.
Keep EVERYTHING she said, even parts that don't answer the question and feelings like "I miss you all". Never remove a sentence she said.
Never add anything she didn't say.
If the words make no sense at all, reply exactly: ???`,
      `Question: ${question}\nWhat the microphone heard: "${words}"`,
      { temperature: 0.2 },
    );
    return out === '???' ? words : out.replace(/^"|"$/g, '');
  } catch {
    return words;
  }
}

export type Length = 'long' | 'medium';

/** Turns all of her answers into one flowing letter written as her. */
export async function writeMessage(answers: QA[], quiz: QuizAnswers | undefined, firstName: string, length: Length) {
  if (!aiEnabled()) return offlineMessage(answers, firstName);
  const tone =
    quiz?.tone === 'simple' ? 'short simple sentences' : quiz?.tone === 'me' ? 'plain and natural, like she talks' : 'warm and chatty';
  try {
    const draft = await chat(
      `You turn an older woman's short answers about her day into a letter to her family, written as her (first person, "I").
Your ONLY job is to smooth her words: fix grammar, make full sentences, and join them so they flow.
- Every sentence must come from one of her answers. Use the question only to make her answer a full sentence
  (Q "How did you sleep?" A "Not well" → "I did not sleep well last night.").
- Include every detail she gave, including small ones. Do not skip anything.
- Allowed additions: grammar words and simple joining words ("Also", "Today", "and"). Nothing else.
- Do not add descriptions, feelings, reasons, opinions, times, order of events, or wishes she did not say.
- Never include the questions themselves, and never ask the family questions.
- Tone: ${tone}. Use simple everyday words.
- ${length === 'long' ? 'Give each answer its own full sentence, grouped into a few short paragraphs.' : 'Keep it compact: combine related answers into fewer sentences.'}
- Start with "Hello family," on its own line. End with only her name "${firstName}" on its own line (no sign-off phrase).
${NO_INVENTION}`,
      `Her answers:\n${transcriptOf(answers)}`,
      { temperature: 0.2 },
    );
    return await factCheck(draft, answers);
  } catch (e) {
    console.warn('writeMessage failed, using offline message', e);
    return offlineMessage(answers, firstName);
  }
}

/**
 * Second pass: a strict checker removes anything in the letter that she didn't say.
 * This is the safety net behind "the app never makes things up".
 */
async function factCheck(letter: string, answers: QA[], extra = '') {
  try {
    const checked = await chat(
      `You are a strict fact checker. Compare the letter to her answers (and the questions they answer).
Remove or rewrite any word, phrase, or sentence that adds information not in her answers: extra descriptions, feelings, reasons, opinions, sign-offs, or wishes.
Keep everything that IS supported, keep the letter flowing and first person, keep "Hello family," and her name at the end.
Return only the corrected letter, with no notes.`,
      `Her answers:\n${transcriptOf(answers)}${extra ? `\nAlso her own words: ${extra}` : ''}\n\nLetter:\n${letter}`,
      { temperature: 0 },
    );
    return checked || letter;
  } catch {
    return letter;
  }
}

/** Applies an edit she asked for ("make it shorter", "mention the birds"). */
export async function editMessage(message: string, request: string, answers: QA[]) {
  if (!aiEnabled()) return message;
  const edited = await chat(
    `You edit a letter an older woman is sending to family. Apply her requested change and return only the full new letter.
Keep it first person and keep the "Hello family," start and her name at the end.
Anything she says in her edit request counts as her own words and may be added.
${NO_INVENTION}`,
    `Her original answers:\n${transcriptOf(answers)}\n\nCurrent letter:\n${message}\n\nHer requested change: ${request}`,
    { temperature: 0.3 },
  );
  return factCheck(edited, answers, request);
}
