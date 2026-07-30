// /privacy — what the system stores, who can see it, and how to delete it.
//
// The footer has linked here from every page since the chrome shipped, with a
// comment saying a 404 was "expected and fine" during development. It stopped
// being fine at delivery: on a product whose whole argument is honest handling
// of teenagers' data, a Privacy link that goes nowhere is the worst possible
// broken link. Caught by watching which URLs the browser prefetched.
//
// Every claim here is checked against the code, not aspirational:
//   - "locked at the database level" is the RLS policies in 0001/0005
//   - the suppression, banding and refresh-gate rules are 0002/0009/0010
//   - "no export button" is a real constraint on lib/admin/responses.js
//   - "sends no email" is why signup uses admin.createUser with email_confirm
// If any of those change, this page changes with them. The copy lives in
// lib/i18n/en.js like the rest.
//
// A static Server Component: no session, no database, nothing to personalise.
import Kicker from '@/components/arah/Kicker.jsx';
import en from '@/lib/i18n/en';

const t = en.privacy;

export const metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-8 md:px-16 md:py-12">
      <section className="mt-6 max-w-[720px] md:mt-10">
        <Kicker>{t.kicker}</Kicker>
        <h1 className="font-display mt-3 text-[42px] leading-[1.08] md:text-[56px]">
          {t.title}
        </h1>
        <p className="mt-6 text-[17px] leading-[1.65] text-muted-foreground">{t.intro}</p>
        <p className="mt-4 font-mono text-xs text-muted-foreground">{t.updated}</p>
      </section>

      <section className="mt-14 max-w-[720px] md:mt-20">
        <div className="flex flex-col gap-10">
          {t.sections.map((section) => (
            <div key={section.heading}>
              <h2 className="font-display text-[24px] leading-[1.2] text-text md:text-[28px]">
                {section.heading}
              </h2>
              <p className="mt-3 text-[16px] leading-[1.7] text-muted-foreground">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 max-w-[720px] border-t border-hairline pt-10 md:mt-20">
        <h2 className="font-display text-[24px] leading-[1.2] text-text md:text-[28px]">
          {t.contactHeading}
        </h2>
        <p className="mt-3 text-[16px] leading-[1.7] text-muted-foreground">
          {t.contactBody}
        </p>
      </section>
    </main>
  );
}
