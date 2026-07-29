'use client';

// §5c sliding overlay panel (docs/design/visual-design-system.md).
//
// Signup occupies the left half, login the right half, both always
// mounted. A violet→cyan gradient panel slides horizontally *over the
// top*, covering one side and revealing the other — the panel moves, the
// forms never do. `active` comes from usePathname(), so /signup and
// /login stay two real routes (deep-linkable, back-button-correct) while
// this component itself is never unmounted between them (see the module
// doc in layout.jsx for why that persistence matters for the animation).
//
// The four §5c accessibility traps, each handled below:
//  1. inert on the covered pane (AuthPane) — both forms are always in the
//     DOM, so without it a keyboard user tabs into an invisible form.
//  2. Two separate <form> elements with distinct id/name
//     (app/(auth)/signup/signup-form.jsx, app/(auth)/login/login-form.jsx)
//     and already-correct autocomplete values (new-password vs
//     current-password) — unchanged from before this redesign.
//  3. Focus moves to the revealed form's first field once the transition
//     settles, and the change is announced in a polite live region.
//  4. Reduced motion: the CSS transitions below are always declared at
//     their real durations, and app/globals.css's blanket
//     `@media (prefers-reduced-motion: reduce)` rule (`transition-duration:
//     0.01ms !important`) collapses them to instant for anyone who asked
//     for less motion — the same mechanism FlowButton and the site header
//     already rely on. usePrefersReducedMotion() below exists only to keep
//     the *focus-move delay* (plain JS, not CSS) in step with what the
//     user actually sees.
//
// Hook-order rule: every hook below runs unconditionally, every render,
// before any conditional return — there is no conditional return here at
// all, by design.
import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Kicker from '@/components/arah/Kicker.jsx';
import SignupForm from './signup/signup-form.jsx';
import LoginForm from './login/login-form.jsx';
import { SwitchLink } from './form-controls.jsx';
import { sameOriginPath } from './next-param.js';
import { usePrefersReducedMotion } from '@/lib/motion/useReducedMotion.js';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';

const PANEL_DURATION = 380; // ms — desktop slide, §5c
const MOBILE_CROSSFADE_DURATION = 200; // ms — below 768px, "a short cross-fade"
const PANEL_EASE = 'ease-[cubic-bezier(0.16,1,0.3,1)]'; // §5c, matches §5b's stagger curve

export default function AuthShell({ quotes, children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname === '/login' ? 'login' : 'signup';
  const next = sameOriginPath(searchParams.get('next'));

  const [isDesktop, setIsDesktop] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const [announcement, setAnnouncement] = useState('');
  // Tracks the last *committed* active side, specifically so the
  // focus-move effect below can react to `active` changing and nothing
  // else. isDesktop/reducedMotion also live in that effect's dependency
  // array (the delay depends on them) and both resolve asynchronously
  // shortly after mount (their real value isn't knowable until an effect
  // runs — same reasoning as MatchBar/StaggerReveal); a naive
  // "skip only the very first invocation" flag would still fire when
  // those flags flip post-mount and wrongly steal focus on page load. Only
  // an actual change in `active` should ever move focus.
  const previousActiveRef = useRef(active);

  // Breakpoint match, same recipe as components/layout/header-client.jsx —
  // starts false (unknowable before an effect runs client-side), flips
  // after mount, stays live across resizes.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Trap 3: move focus to the revealed form's first field once the
  // transition settles, and announce it. A page load (or isDesktop/
  // reducedMotion resolving post-mount) leaves `active` equal to what it
  // already was, so the guard below is a no-op then — only a genuine
  // /signup ↔ /login navigation changes `active` and triggers this.
  useEffect(() => {
    if (previousActiveRef.current === active) {
      return undefined;
    }
    previousActiveRef.current = active;
    const delay = reducedMotion ? 0 : isDesktop ? PANEL_DURATION : MOBILE_CROSSFADE_DURATION;
    const timer = window.setTimeout(() => {
      const fieldId = active === 'signup' ? 'signup-email' : 'login-email';
      document.getElementById(fieldId)?.focus();
      setAnnouncement(
        active === 'signup' ? en.auth.panel.signupRevealed : en.auth.panel.loginRevealed
      );
    }, delay);
    return () => window.clearTimeout(timer);
  }, [active, isDesktop, reducedMotion]);

  const t = en.auth;
  const pool = quotes?.length ? quotes : [];
  // quoteCoveringLogin: shown on the panel while it sits over /login (i.e.
  // signup is active). quoteCoveringSignup: the reverse. Two distinct real
  // quotes so the panel's content actually changes as a student toggles,
  // rather than repeating one line both ways.
  const quoteCoveringLogin = pool[0] ?? null;
  const quoteCoveringSignup = pool[1] ?? pool[0] ?? null;
  const currentQuote = active === 'signup' ? quoteCoveringLogin : quoteCoveringSignup;

  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : '/signup';
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <div className="w-full">
      {/* Trap 3, continued: a sighted user sees the panel move; a
          screen-reader user is told nothing unless we say it here. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <MobileBand
        active={active}
        signupQuote={quoteCoveringLogin}
        loginQuote={quoteCoveringSignup}
        kicker={t.panel.kicker}
      />

      <div className="relative isolate grid grid-cols-1 overflow-hidden rounded-2xl border md:min-h-[620px] md:grid-cols-2">
        <AuthPane side="signup" active={active === 'signup'} className="md:col-start-1">
          <Kicker>{t.signup.kicker}</Kicker>
          <h1 className="font-display mt-5 max-w-[18ch] text-[30px] leading-[1.08] md:text-[42px]">
            {t.signup.title}
          </h1>
          <p className="mt-4 max-w-[40ch] text-[15px] text-muted-foreground md:text-base">
            {t.signup.subtitle}
          </p>
          <SignupForm next={next} className="mt-10 flex w-full max-w-[420px] flex-col gap-6" />
          <p className="mt-9 text-[13px] text-muted-foreground">
            {t.signup.switchPrompt}{' '}
            <SwitchLink href={loginHref}>{t.signup.switchCta}</SwitchLink>
          </p>
        </AuthPane>

        <AuthPane side="login" active={active === 'login'} className="md:col-start-2">
          <Kicker>{t.login.kicker}</Kicker>
          <h1 className="font-display mt-5 max-w-[18ch] text-[30px] leading-[1.08] md:text-[42px]">
            {t.login.title}
          </h1>
          <p className="mt-4 max-w-[40ch] text-[15px] text-muted-foreground md:text-base">
            {t.login.subtitle}
          </p>
          <LoginForm next={next} className="mt-10 flex w-full max-w-[420px] flex-col gap-6" />
          <p className="mt-9 text-[13px] text-muted-foreground">
            {t.login.switchPrompt}{' '}
            <SwitchLink href={signupHref}>{t.login.switchCta}</SwitchLink>
          </p>
        </AuthPane>

        {/* Desktop sliding panel — covers whichever pane isn't active.
            Only `transform` ever changes here; the pane content underneath
            never moves (§5c: "The panel is what moves; the forms do
            not."). Hidden below 768px — MobileBand replaces it there. */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 z-10 hidden w-1/2 md:block',
            'transition-transform duration-[380ms]',
            PANEL_EASE
          )}
          style={{ transform: active === 'signup' ? 'translateX(100%)' : 'translateX(0%)' }}
        >
          <div
            className="relative flex h-full flex-col justify-between overflow-hidden p-10 lg:p-14"
            style={{
              backgroundImage: 'linear-gradient(180deg, var(--color-violet), var(--color-cyan))',
            }}
          >
            {/* Scrim: white text directly on the raw gradient fails
                contrast at the cyan end (measured 1.81:1 — WCAG AA needs
                4.5:1). A flat ink scrim at 45% opacity brings both ends
                comfortably past AA (white on scrimmed cyan 5.19:1,
                scrimmed violet 11.19:1 — see auth-redesign-report.md)
                while the gradient itself still reads through underneath. */}
            <div className="absolute inset-0 bg-ink/45" aria-hidden="true" />
            <Kicker className="relative text-white/85">{t.panel.kicker}</Kicker>
            <blockquote className="relative">
              <p className="font-display text-[22px] leading-[1.3] text-white lg:text-[26px]">
                {currentQuote ? `“${currentQuote}”` : null}
              </p>
            </blockquote>
            <div className="relative">
              <Link
                href={active === 'signup' ? loginHref : signupHref}
                className={cn(
                  'inline-flex min-h-11 items-center justify-center rounded-full border border-white/50 px-6',
                  'text-sm font-semibold text-white transition-colors duration-200',
                  'hover:bg-white/10',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
                )}
              >
                {active === 'signup' ? t.panel.toLogin : t.panel.toSignup}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* /signup and /login each still resolve to a real page.jsx (route
          existence, its own <title>) — its rendered output is
          intentionally empty; the visible UI lives entirely above. */}
      {children}
    </div>
  );
}

// One pane = one side's full content (kicker, headline, form, switch
// link). Both panes are always mounted and always occupy their own grid
// cell on desktop (signup left, login right, per §5c) — the sliding panel
// is what visually covers the inactive one, not this component. Below
// 768px both panes share the same grid cell (mobile-first `col-start-1
// row-start-1`, overridden to separate columns at `md:`) so they overlap
// exactly and can cross-fade between each other.
//
// The inactive pane is `absolute` on mobile (and only on mobile) — a
// grid track sizes to the tallest thing sharing its cell regardless of
// opacity, so a plain opacity toggle left the page stretched to fit
// whichever form is currently invisible, leaving a slab of dead space
// under the shorter one. `position: absolute` removes it from that
// height calculation while it's covered; `md:static` puts it straight
// back into normal flow at the two-column breakpoint, where each pane
// owns its own column and this problem doesn't exist.
function AuthPane({ side, active, className, children }) {
  return (
    <div
      inert={!active}
      aria-hidden={!active}
      className={cn(
        'col-start-1 row-start-1 bg-surface p-8 sm:p-10 md:static md:bg-transparent md:p-12 lg:p-16',
        'transition-opacity duration-200',
        PANEL_EASE,
        'md:opacity-100 md:pointer-events-auto',
        active
          ? 'static opacity-100 pointer-events-auto'
          : 'absolute inset-0 opacity-0 pointer-events-none',
        className
      )}
      data-auth-pane={side}
    >
      {children}
    </div>
  );
}

// Below 768px there's no room for a side-by-side split (§5c): the panel
// becomes a compact band above the active form, showing one quote. Both
// quote cards are mounted (mirroring AuthPane's overlap trick) and
// cross-fade via opacity; neither carries interactive content, so unlike
// AuthPane this needs aria-hidden on the inactive card but not `inert`.
function MobileBand({ active, signupQuote, loginQuote, kicker }) {
  return (
    <div className="relative mb-6 grid grid-cols-1 overflow-hidden rounded-2xl md:hidden">
      {['signup', 'login'].map((side) => {
        const quote = side === 'signup' ? signupQuote : loginQuote;
        const isActive = active === side;
        return (
          <div
            key={side}
            aria-hidden={!isActive}
            className={cn(
              'relative col-start-1 row-start-1 transition-opacity duration-200',
              PANEL_EASE,
              isActive ? 'opacity-100' : 'opacity-0'
            )}
            style={{
              backgroundImage: 'linear-gradient(90deg, var(--color-violet), var(--color-cyan))',
            }}
          >
            {/* Scrim, sized to the full box (see the desktop panel's
                identical comment on why white text needs it). */}
            <div className="absolute inset-0 bg-ink/45" aria-hidden="true" />
            <div className="relative px-6 py-5">
              <Kicker className="text-white/85">{kicker}</Kicker>
              <p className="font-display mt-2 text-[17px] leading-[1.35] text-white">
                {quote ? `“${quote}”` : null}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
