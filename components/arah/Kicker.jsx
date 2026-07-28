import { cn } from '@/lib/utils';

/**
 * The `[ bracketed ]` micro-label motif from the Valeran reference.
 *
 * The brackets are purely decorative — they exist to be looked at, not
 * read out. Both bracket glyphs are wrapped in `aria-hidden="true"`
 * spans so a screen reader announces only the label text itself
 * ("Step one", say) instead of "left square bracket step one right
 * square bracket".
 */
export default function Kicker({ as: Comp = 'p', children, className, ...props }) {
  return (
    <Comp
      className={cn(
        'text-[10px] font-semibold uppercase text-violet-lt',
        className
      )}
      style={{ letterSpacing: '0.3em' }}
      {...props}
    >
      <span aria-hidden="true">[ </span>
      {children}
      <span aria-hidden="true"> ]</span>
    </Comp>
  );
}
