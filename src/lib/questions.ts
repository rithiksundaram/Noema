import type { AskedQuestion, QA, QuizAnswers } from './types';

/**
 * Built-in questions. Used as the starting point, and as a backup whenever
 * the AI can't be reached, so the app always works.
 */
type BankItem = AskedQuestion & { sentence: Record<string, string> };

const OPENER: BankItem = {
  topic: 'day',
  question: 'How was your day today?',
  options: ['Good', 'Okay', 'Not so good'],
  sentence: {
    Good: 'I had a good day today.',
    Okay: 'My day was okay.',
    'Not so good': 'Today was not such a good day for me.',
  },
};

const BANK: BankItem[] = [
  { topic: 'sleep', question: 'How did you sleep last night?', options: ['Very well', 'Okay', 'Not well'],
    sentence: { 'Very well': 'I slept very well last night.', Okay: 'I slept okay last night.', 'Not well': 'I did not sleep well last night.' } },
  { topic: 'food', question: 'What did you have for breakfast?', options: ['Toast', 'Eggs', 'Oatmeal', 'Just coffee or tea'],
    sentence: { Toast: 'I had toast for breakfast.', Eggs: 'I had eggs for breakfast.', Oatmeal: 'I had oatmeal for breakfast.', 'Just coffee or tea': 'I just had coffee or tea for breakfast.' } },
  { topic: 'food', question: 'What did you eat for lunch or dinner?', options: ['Soup', 'Sandwich', 'Rice', 'Something I cooked'],
    sentence: { Soup: 'I ate soup.', Sandwich: 'I had a sandwich.', Rice: 'I had rice.', 'Something I cooked': 'I cooked something myself.' } },
  { topic: 'people', question: 'Did you see or talk to anyone today?', options: ['Yes, a visitor', 'A phone call', 'No, quiet day'],
    sentence: { 'Yes, a visitor': 'I had a visitor today.', 'A phone call': 'I talked to someone on the phone today.', 'No, quiet day': 'It was a quiet day and I did not see anyone.' } },
  { topic: 'weather', question: 'What was the weather like?', options: ['Sunny', 'Cloudy', 'Rainy', 'Cold'],
    sentence: { Sunny: 'It was sunny today.', Cloudy: 'It was cloudy today.', Rainy: 'It rained today.', Cold: 'It was cold today.' } },
  { topic: 'outside', question: 'Did you go outside today?', options: ['Went for a walk', 'Sat outside', 'Went to the store', 'Stayed in'],
    sentence: { 'Went for a walk': 'I went for a walk.', 'Sat outside': 'I sat outside for a while.', 'Went to the store': 'I went to the store.', 'Stayed in': 'I stayed inside today.' } },
  { topic: 'activity', question: 'What did you spend time doing?', options: ['Watched TV', 'Cooked', 'Read', 'Rested'],
    sentence: { 'Watched TV': 'I watched TV.', Cooked: 'I spent time cooking.', Read: 'I spent time reading.', Rested: 'I rested.' } },
  { topic: 'health', question: 'How is your body feeling?', options: ['Feeling strong', 'A little tired', 'Some pain'],
    sentence: { 'Feeling strong': 'My body is feeling strong.', 'A little tired': 'I am feeling a little tired.', 'Some pain': 'I have had some pain.' } },
  { topic: 'smile', question: 'What made you smile today?', options: ['Family', 'Something funny', 'Nature', 'A good meal'],
    sentence: { Family: 'Thinking of my family made me smile.', 'Something funny': 'Something funny made me smile today.', Nature: 'Being around nature made me smile.', 'A good meal': 'A good meal made me smile.' } },
  { topic: 'mood', question: 'How are you feeling right now?', options: ['Happy', 'Calm', 'Tired', 'Lonely'],
    sentence: { Happy: 'Right now I feel happy.', Calm: 'Right now I feel calm.', Tired: 'Right now I feel tired.', Lonely: 'Right now I feel a bit lonely.' } },
  { topic: 'needs', question: 'Is there anything you need?', options: ['No, all good', 'Groceries', 'A call from you', 'Help with something'],
    sentence: { 'No, all good': 'I do not need anything right now.', Groceries: 'I could use some groceries.', 'A call from you': 'I would love a call from you.', 'Help with something': 'I could use some help with something.' } },
  { topic: 'tomorrow', question: 'What are you looking forward to?', options: ['Seeing family', 'A good rest', 'Going out', 'Nothing special'],
    sentence: { 'Seeing family': 'I am looking forward to seeing family.', 'A good rest': 'I am looking forward to a good rest.', 'Going out': 'I am looking forward to going out.', 'Nothing special': 'Nothing special is coming up.' } },
  { topic: 'family', question: 'Who in the family have you been thinking about?', options: ['My children', 'The grandkids', 'Everyone'],
    sentence: { 'My children': 'I have been thinking about my children.', 'The grandkids': 'I have been thinking about the grandkids.', Everyone: 'I have been thinking about everyone.' } },
  { topic: 'garden', question: 'How is the garden or your plants?', options: ['Growing well', 'Need water', 'Something bloomed'],
    sentence: { 'Growing well': 'My plants are growing well.', 'Need water': 'My plants need water.', 'Something bloomed': 'Something bloomed in the garden.' } },
  { topic: 'tv', question: 'Did you watch or listen to anything good?', options: ['A show', 'Music', 'The news', 'Church or prayer'],
    sentence: { 'A show': 'I watched a show.', Music: 'I listened to music.', 'The news': 'I watched the news.', 'Church or prayer': 'I listened to church or spent time in prayer.' } },
  { topic: 'memory', question: 'Did anything remind you of the old days?', options: ['Yes', 'A little', 'Not today'],
    sentence: { Yes: 'Something reminded me of the old days.', 'A little': 'I thought a little about the old days.', 'Not today': 'Nothing reminded me of the old days today.' } },
];

const TOPIC_MAP: Record<string, string[]> = {
  'Food & cooking': ['food'],
  Family: ['family'],
  'Garden & nature': ['garden', 'outside'],
  'TV & music': ['tv'],
  Health: ['health'],
  'Friends & neighbors': ['people'],
  'Walks & outings': ['outside'],
  Memories: ['memory'],
  Weather: ['weather'],
};

/** Picks the next built-in question that hasn't been asked yet, favoring her chosen topics. */
export function fallbackQuestion(quiz: QuizAnswers | undefined, asked: string[]): AskedQuestion {
  if (asked.length === 0) return OPENER;
  const favored = new Set((quiz?.topics ?? []).flatMap((t) => TOPIC_MAP[t] ?? []));
  const pool = [...BANK.filter((b) => favored.has(b.topic)), ...BANK.filter((b) => !favored.has(b.topic))];
  const next = pool.find((b) => !asked.includes(b.question));
  return next ?? { topic: 'extra', question: 'Is there anything else you want to tell your family?', options: ['No, that is all'] };
}

export const firstQuestion = () => OPENER;

/** Turns one answer into a plain first-person sentence without the AI. */
export function answerToSentence(qa: QA): string {
  const item = [OPENER, ...BANK].find((b) => b.question === qa.question);
  const known = item?.sentence[qa.answer];
  if (known) return known;
  const a = qa.answer.trim().replace(/[.!]+$/, '');
  if (!a) return '';
  return `${a.charAt(0).toUpperCase()}${a.slice(1)}.`;
}

/** Message used when there's no AI: her sentences, in order, in a few short paragraphs. */
export function offlineMessage(answers: QA[], firstName: string): string {
  const sentences = answers
    .filter((qa) => !/^no,? that is all$/i.test(qa.answer))
    .map(answerToSentence)
    .filter(Boolean);
  const paras: string[] = [];
  for (let i = 0; i < sentences.length; i += 4) paras.push(sentences.slice(i, i + 4).join(' '));
  return ['Hello family,', ...paras, firstName ? `— ${firstName}` : ''].filter(Boolean).join('\n\n');
}
