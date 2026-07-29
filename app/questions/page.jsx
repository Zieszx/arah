// /questions — Server Component shell (metadata lives here) around the
// fully client-side quiz flow (still called "quiz" in code — see
// lib/i18n/en.js's top comment on that key). Authentication is enforced
// before this page ever renders: proxy.js redirects unauthenticated
// requests to /login?next=/questions, and the /api/questions route
// (Task 4) re-checks the session server-side. /quiz still works — it
// 301s here via next.config.mjs's redirects().
import en from '@/lib/i18n/en';
import QuizFlow from '@/components/quiz/QuizFlow.jsx';

export const metadata = {
  title: en.quiz.metaTitle,
  description: en.quiz.metaDescription,
};

export default function QuizPage() {
  return <QuizFlow />;
}
