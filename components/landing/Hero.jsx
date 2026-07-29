// The landing hero — promoted and refined from app/demo/page.jsx (the
// design-system reference build) into the real, shipping first screen.
//
// Left-aligned editorial layout over the live particle field (Valeran
// reference, docs/design/visual-design-system.md §7) — deliberately not
// centred. A Server Component: nothing here needs the browser, so it costs
// nothing in client JS. FlowButton is a client component internally, but
// importing it does not make this component's own render logic client-side.
//
// No ARAH logotype here — it already lives in the global SiteHeader
// (mounted in app/layout.jsx), and repeating it would put two marks on one
// screen, same reasoning as the holding page it replaces.
//
// Not wrapped in the landing page's GSAP Reveal: the hero is the first
// thing painted, already in view at load with no scrolling involved, so
// "reveal on entry" has nothing to trigger against. Wrapping it would only
// risk a flash (visible at SSR paint -> briefly hidden once JS confirms
// motion is enabled -> faded back in) on the one section that must never
// blink.
import FlowButton from '@/components/arah/FlowButton.jsx';
import Kicker from '@/components/arah/Kicker.jsx';
import en from '@/lib/i18n/en';

export default function Hero() {
  const t = en.landing.hero;

  return (
    <section className="mx-auto flex min-h-[88vh] w-full max-w-[1440px] flex-col justify-center px-6 py-24 md:px-16">
      <Kicker>{t.kicker}</Kicker>

      <h1 className="font-display mt-6 max-w-[16ch] text-[42px] leading-[1.08] md:text-[64px]">
        {t.title}
      </h1>

      <p className="mt-6 max-w-[34ch] text-[15px] leading-[1.6] text-muted-foreground md:max-w-[46ch] md:text-base">
        {t.body}
      </p>

      <FlowButton href="/questions" className="mt-10 w-fit">
        {t.cta}
      </FlowButton>
    </section>
  );
}
