// Shared chrome for /login and /signup: the same left-aligned editorial
// container as the demo hero (max 1280, generous gutters, vertically
// centred). The ARAH logotype that used to live here moved into the
// global SiteHeader (Task 7) — the way back home is now the header mark,
// same as every other page. The (auth) route group exists so these two
// pages share this without affecting URLs.
export default function AuthLayout({ children }) {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col justify-center px-6 py-12 md:px-16 md:py-24">
      {children}
    </main>
  );
}
