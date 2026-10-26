export type Role = 'operator' | 'member';

export type QuizAnswers = {
  struggles: string[];
  answerStyle: 'tap' | 'voice' | 'both';
  textSize: TextSize;
  topics: string[];
  bestTime: string;
  audience: string;
  tone: 'warm' | 'simple' | 'me';
  note?: string;
};

export type TextSize = 'small' | 'medium' | 'large' | 'xlarge';
export type ThemeMode = 'system' | 'light' | 'dark';
export type AccentName = 'teal' | 'orange' | 'blue' | 'plum' | 'green';

export type Settings = {
  themeMode: ThemeMode;
  accent: AccentName;
  textSize: TextSize;
  answerStyle: 'tap' | 'voice' | 'both';
  autoStop: boolean;
  questionCount: number;
  messageLength: 'long' | 'medium';
  confirmVoice: boolean;
};

export type QA = {
  question: string;
  answer: string;
  /** How she answered — kept so the family view can show her real words. */
  via: 'tap' | 'voice' | 'type';
};

export type AskedQuestion = {
  question: string;
  options: string[];
  topic: string;
};
