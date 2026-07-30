// The public landing page (Plan 4, Task 1) — the first thing a Malaysian
// post-SPM student sees, and the page the client screenshots for their own
// pitch. Replaces the holding page.
//
// The narrative, in order: Hero -> Finding -> How it works -> Proof -> CTA.
// Proof shows BOTH accuracy figures, never only the higher one — see
// lib/i18n/en.js#landing.proof. A Server Component throughout — every section
// is static markup
// except the one Recharts chart inside Finding, which is dynamically
// imported client-side only (see components/landing/FindingChartLoader.jsx)
// so it never touches this page's own bundle.
//
// Hero is the first thing painted and needs no "entry" to reveal against
// (see components/landing/Hero.jsx for why it is intentionally left out of
// Reveal). The four sections after it each get GSAP ScrollTrigger's rise
// via Reveal.jsx, gated on useMotionCapability() — every section renders
// fully visible, unstyled by Reveal, on first paint; the animation is
// something that happens ON TOP of an already-complete page for capable
// users, never a precondition for the content existing.
import Hero from '@/components/landing/Hero.jsx';
import Finding from '@/components/landing/Finding.jsx';
import HowItWorks from '@/components/landing/HowItWorks.jsx';
import Proof from '@/components/landing/Proof.jsx';
import Cta from '@/components/landing/Cta.jsx';
import Reveal from '@/components/landing/Reveal.jsx';
import en from '@/lib/i18n/en';

export const metadata = {
  title: en.landing.metaTitle,
  description: en.landing.metaDescription,
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <Reveal>
        <Finding />
      </Reveal>
      <Reveal>
        <HowItWorks />
      </Reveal>
      <Reveal>
        <Proof />
      </Reveal>
      <Reveal>
        <Cta />
      </Reveal>
    </main>
  );
}
