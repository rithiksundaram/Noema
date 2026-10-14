import { QuizFlow } from '@/components/QuizFlow';

/** First-time personalization quiz. Finishing it marks the account as onboarded, which opens the app. */
export default function Quiz() {
  return <QuizFlow onDone={() => {}} />;
}
