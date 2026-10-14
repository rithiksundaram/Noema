import { router } from 'expo-router';

import { QuizFlow } from '@/components/QuizFlow';

export default function RetakeQuiz() {
  return <QuizFlow onDone={() => router.back()} onCancel={() => router.back()} />;
}
