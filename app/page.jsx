import FlowButton from '@/components/arah/FlowButton.jsx';
import Kicker from '@/components/arah/Kicker.jsx';

export const metadata = {
  title: 'ARAH — Post-SPM Pathway Finder',
  description: 'Find the course that actually fits, matched from real student outcomes.',
};

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col justify-center px-6 py-24 md:px-16">
      <div
        className="font-display text-lg uppercase text-text/90 md:text-xl"
        style={{ letterSpacing: '0.20em' }}
      >
        ARAH
      </div>

      <Kicker className="mt-8">post-SPM pathway finder</Kicker>

      <h1 className="font-display mt-6 max-w-[16ch] text-[36px] leading-[1.1] md:text-[56px]">
        The landing page is still being built.
      </h1>

      <p className="mt-6 max-w-[34ch] text-[15px] text-muted-foreground md:max-w-[46ch] md:text-base">
        In the meantime, see the design system running on the demo route.
      </p>

      <FlowButton href="/demo" className="mt-10 w-fit">
        View the demo
      </FlowButton>
    </main>
  );
}
