// "How it works" — four steps, answer -> match -> rank -> explore. A
// Server Component: the step data is static copy from lib/i18n/en.js.
//
// The four step cards animate in one at a time via StaggerReveal
// (components/motion/StaggerReveal.jsx), the same §5b-tuned component the
// results page uses for its ranked list — reusing the kit rather than
// building a second stagger mechanism. StaggerReveal already owns its own
// reduced-motion fallback (children render at final position immediately,
// unconditionally, when motion is off or before capability is confirmed),
// so nothing extra is needed here for that guarantee.
import Kicker from '@/components/arah/Kicker.jsx';
import StaggerReveal from '@/components/motion/StaggerReveal.jsx';
import en from '@/lib/i18n/en';

export default function HowItWorks() {
  const t = en.landing.how;

  return (
    <section className="mx-auto w-full max-w-[1440px] px-6 py-14 md:px-16 md:py-24">
      <Kicker>{t.kicker}</Kicker>
      <h2 className="font-display mt-4 max-w-[20ch] text-[30px] leading-[1.15] md:text-[48px]">
        {t.title}
      </h2>

      <StaggerReveal className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 md:mt-16 md:grid-cols-4 md:gap-6">
        {t.steps.map((step) => (
          <div key={step.n} className="flex flex-col gap-3 border-t border-hairline pt-6">
            <span className="font-mono text-xs text-violet-lt">{step.n}</span>
            <h3 className="font-display text-[20px] leading-[1.2] text-text md:text-[22px]">
              {step.title}
            </h3>
            <p className="max-w-[38ch] text-[14px] leading-[1.6] text-muted-foreground">
              {step.body}
            </p>
          </div>
        ))}
      </StaggerReveal>
    </section>
  );
}
