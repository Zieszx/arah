import Link from 'next/link';

// Shared chrome for /login and /signup: the same left-aligned editorial
// container as the demo hero (max 1280, generous gutters, vertically
// centred), with the ARAH logotype as the way back home. The (auth) route
// group exists so these two pages share this without affecting URLs.
export default function AuthLayout({ children }) {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col justify-center px-6 py-12 md:px-16 md:py-24">
      <Link
        href="/"
        className="font-display inline-flex min-h-11 w-fit items-center text-lg uppercase text-text/90 focus-visible:outline-2 focus-visible:outline-offset-2 md:text-xl"
        style={{ letterSpacing: '0.20em' }}
      >
        ARAH
      </Link>
      <div className="mt-8 md:mt-10">{children}</div>
    </main>
  );
}
