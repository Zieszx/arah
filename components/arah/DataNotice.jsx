import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';

/**
 * The plain-language data notice — a product requirement, not boilerplate.
 *
 * It sits inside the signup form, above the submit button, so a
 * 17-year-old reads what happens to their answers *before* they hand them
 * over — never behind a link, because most of this audience will not click
 * one. Copy lives in lib/i18n/en.js like everything else, so a Bahasa
 * Melayu version later is a locale swap, not a component edit.
 *
 * role="note" marks it as ancillary-but-related content for screen
 * readers. Sized to stay compact at 390px: the whole notice is ~5 short
 * lines, so the submit button below it remains in view.
 */
export default function DataNotice({ className }) {
  const t = en.auth.notice;
  return (
    <aside
      role="note"
      aria-label={t.title}
      className={cn('rounded-lg border bg-surface p-4', className)}
    >
      <p className="text-[13px] font-medium text-violet-lt">{t.title}</p>
      <p className="mt-1.5 text-[13px] leading-[1.6] text-muted-foreground">
        {t.body}
      </p>
    </aside>
  );
}
