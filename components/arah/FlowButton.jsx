'use client';

import { forwardRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Primary CTA pill, after the 21st.dev FlowButton the client picked.
 *
 * Renders a native <button> by default. Pass `href` (or `as="a"`) to
 * render a native <a> instead — same visual, same focus/disabled
 * handling, just a different tag, so this can sit anywhere a link or a
 * submit action is needed without a second component to maintain.
 *
 * The arrow's hover slide is a CSS transition (`group-hover`), which is
 * covered twice over for reduced-motion users: the site-wide
 * `@media (prefers-reduced-motion: reduce)` rule in app/globals.css
 * zeroes all transition durations, and `motion-reduce:` is applied
 * directly on the arrow as a second, explicit guarantee.
 */
const FlowButton = forwardRef(function FlowButton(
  { as, href, disabled = false, className, children, onClick, ...props },
  ref
) {
  const isLink = Boolean(href) || as === 'a';
  const Comp = isLink ? 'a' : as || 'button';

  function handleClick(event) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <Comp
      ref={ref}
      href={isLink ? (disabled ? undefined : href) : undefined}
      type={isLink ? undefined : 'button'}
      disabled={isLink ? undefined : disabled}
      aria-disabled={disabled || undefined}
      tabIndex={isLink && disabled ? -1 : undefined}
      onClick={handleClick}
      className={cn(
        // shape + label
        'group/flow inline-flex items-center justify-center gap-2 rounded-full',
        'px-6 py-3 text-sm font-semibold text-white select-none',
        // gradient fill — spec'd colors, never hardcoded elsewhere. Light-
        // theme re-check (light-theme-conversion.md §5): this exact check
        // caught a 1.81:1 white-on-cyan failure in the dark build; on the
        // light theme's violet(#6D28D9)->teal(#0E7490) gradient white
        // clears 4.5:1 at BOTH ends (7.10:1 / 5.36:1 measured).
        '[background-image:linear-gradient(90deg,var(--color-violet),var(--color-cyan))]',
        'transition-[filter] duration-200 ease-out hover:brightness-110',
        // a visible, high-contrast focus ring for keyboard users — this is
        // the primary action on every page, so the default faint ring is
        // not enough; cyan against the violet/cyan gradient reads clearly
        // in both directions.
        //
        // Deliberately no bare `outline-none` here: Tailwind v4's outline
        // utilities all read a shared, non-inherited `--tw-outline-style`
        // custom property (Preflight defaults it to `solid` on `*`).
        // `outline-none` sets that property to `none` unconditionally
        // (its selector isn't `:focus-visible`-gated), which permanently
        // wins the cascade for that property and silently defeats
        // `focus-visible:outline-2` too, since var() resolves the same
        // cascaded value everywhere it's read on the element. Skipping
        // `outline-none` leaves the property at Preflight's `solid`
        // default, which only becomes visible once `outline-width` is
        // actually set below, and only then, scoped to `:focus-visible`.
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        'focus-visible:outline-cyan',
        // disabled: button uses the native pseudo-class, anchors (which
        // cannot be natively disabled) key off aria-disabled instead
        'disabled:pointer-events-none disabled:opacity-50',
        'aria-disabled:pointer-events-none aria-disabled:opacity-50',
        className
      )}
      {...props}
    >
      <span>{children}</span>
      <ArrowRight
        aria-hidden="true"
        className={cn(
          'size-4 transition-transform duration-200 ease-out',
          'group-hover/flow:translate-x-1',
          'motion-reduce:transition-none motion-reduce:group-hover/flow:translate-x-0'
        )}
      />
    </Comp>
  );
});

export default FlowButton;
