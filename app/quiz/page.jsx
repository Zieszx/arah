// /quiz — Server Component shell (metadata lives here) around the fully
// client-side quiz flow. Authentication is enforced before this page ever
// renders: proxy.js redirects unauthenticated requests to /login?next=/quiz,
// and the /api/quiz route (Task 4) re-checks the session server-side.
import en from '@/lib/i18n/en';
import QuizFlow from '@/components/quiz/QuizFlow.jsx';

export const metadata = {
  title: en.quiz.metaTitle,
  description: en.quiz.metaDescription,
};

export default function QuizPage() {
  return <QuizFlow />;
}
