// The closing CTA — repeats the same FlowButton as the hero (no second
// button style) with one line of reassurance. A Server Component.
import FlowButton from '@/components/arah/FlowButton.jsx';
import en from '@/lib/i18n/en';

export default function Cta() {
  const t = en.landing.cta;

  return (
    <section className="mx-auto w-full max-w-[1440px] px-6 py-14 md:px-16 md:py-24">
      <div className="flex flex-col items-start border-t border-hairline pt-14 md:pt-20">
        <h2 className="font-display max-w-[18ch] text-[30px] leading-[1.15] md:text-[48px]">
          {t.title}
        </h2>
        <FlowButton href="/quiz" className="mt-8 w-fit">
          {t.button}
        </FlowButton>
        <p className="mt-4 text-[13px] text-muted-foreground">{t.body}</p>
      </div>
    </section>
  );
}
