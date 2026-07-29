// /admin/algorithm-tester — run the live model directly (Plan 5, Task 6).
//
// requireAdmin() runs again here even though app/(admin)/layout.jsx
// already called it — same reasoning as every other admin page.jsx (see
// lib/auth/requireAdmin.js's header comment). Both calls share one cached
// DB read via React's cache().
//
// Everything interactive — the ten questions, the presets, the "what
// changed" diff — lives in AlgorithmTester.jsx, a client component. This
// file's only job is the gate and the page chrome.
import requireAdmin from '@/lib/auth/requireAdmin';
import Kicker from '@/components/arah/Kicker.jsx';
import AlgorithmTester from '@/components/admin/AlgorithmTester.jsx';
import en from '@/lib/i18n/en';

export const metadata = {
  title: en.admin.algorithmTester.metaTitle,
  robots: { index: false, follow: false },
};

export default async function AdminAlgorithmTesterPage() {
  await requireAdmin();
  const t = en.admin.algorithmTester;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Kicker className="text-violet-ink">{t.kicker}</Kicker>
        <h1 className="font-display mt-2 text-3xl text-ink md:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-[64ch] text-[15px] leading-[1.6] text-muted-foreground">
          {t.body}
        </p>
      </div>

      <AlgorithmTester />
    </div>
  );
}
