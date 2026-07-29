// /admin/responses/[id] — one submission in full: all ten answers beside
// the ranked prediction that student received (Plan 5, Task 4). Reads
// through lib/admin/responses.js#getResponseDetail (service-role client —
// see that module's header comment), gated by requireAdmin() like every
// other admin page.
//
// Every group renders from feature_spec.json via lib/features.js#getGroups
// — never a hardcoded list of ten questions — so this page can never
// silently drift from what the live /questions form actually asked. Field
// names and option labels render through displayLabel() at the point of
// display only; `answers` itself is never rewritten (the same one-way
// rule app/results/[id]/page.jsx follows).
import { notFound } from 'next/navigation';
import Link from 'next/link';
import requireAdmin from '@/lib/auth/requireAdmin';
import { getResponseDetail } from '@/lib/admin/responses';
import { getGroups } from '@/lib/features';
import { displayLabel } from '@/lib/i18n/labels';
import { formatSampleSize } from '@/lib/explore/sampleSize';
import { cn } from '@/lib/utils';
import Kicker from '@/components/arah/Kicker.jsx';
import ConfidenceBadge from '@/components/arah/ConfidenceBadge.jsx';
import MatchBar from '@/components/arah/MatchBar.jsx';
import en from '@/lib/i18n/en';

export const metadata = {
  title: en.admin.responses.detail.metaTitle,
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(iso) {
  const d = new Date(iso ?? '');
  return Number.isNaN(d.getTime()) ? '—' : DATE_FORMAT.format(d);
}

/** One answered question, rendered against its feature_spec.json group. */
function AnswerRow({ group, answers }) {
  const raw = answers?.[group.key];

  let content;
  if (group.type === 'num') {
    const hasValue = typeof raw === 'number' && Number.isFinite(raw);
    content = hasValue ? (
      <span className="font-mono tabular-nums text-ink">
        {raw} <span className="text-muted-foreground">/ {group.max}</span>
      </span>
    ) : (
      <span className="text-muted-foreground">Not answered</span>
    );
  } else {
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    content =
      list.length === 0 ? (
        <span className="text-muted-foreground">
          {group.optional ? 'Not answered (optional)' : 'Not answered'}
        </span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {list.map((v) => (
            <span
              key={v}
              className="inline-flex items-center rounded-full border border-hairline bg-surface-2 px-2.5 py-1 text-sm text-ink"
            >
              {displayLabel(v)}
            </span>
          ))}
        </div>
      );
  }

  return (
    <div className="border-t border-hairline py-4 first:border-t-0 first:pt-0">
      <dt className="text-sm text-muted-foreground">{group.label}</dt>
      <dd className="mt-2">{content}</dd>
    </div>
  );
}

function RankedEntry({ entry, rank }) {
  const display = formatSampleSize(entry.alumni_count, entry.alumni_band);
  return (
    <div className={cn('rounded-xl border p-4', rank === 0 ? 'border-violet/30 bg-violet-soft/40' : 'border-hairline bg-surface')}>
      <MatchBar
        label={displayLabel(entry.field)}
        percent={typeof entry.probability === 'number' ? entry.probability * 100 : 0}
        tone={rank === 0 ? 'cyan' : 'violet'}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ConfidenceBadge tier={entry.confidence} sampleSize={entry.alumni_count} />
        {display !== null ? (
          <span className="font-mono text-xs text-muted-foreground">n = {display}</span>
        ) : null}
      </div>
    </div>
  );
}

export default async function AdminResponseDetailPage({ params }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const detail = await getResponseDetail(id);
  if (!detail) notFound();

  const t = en.admin.responses.detail;
  const groups = getGroups();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/responses"
          className="inline-flex min-h-11 items-center text-sm text-violet-ink transition-colors duration-200 hover:text-violet-pl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
        >
          ← {t.back}
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Kicker className="text-violet-ink">{en.admin.responses.kicker}</Kicker>
            <h1 className="font-display mt-2 text-3xl text-ink md:text-4xl">
              {detail.studentName || en.admin.responses.unnamedStudent}
            </h1>
            <p className="mt-2 font-mono text-sm text-muted-foreground">
              {formatDate(detail.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {detail.prediction?.marginalised ? (
              <span className="inline-flex items-center rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-amber">
                {en.admin.responses.marginalisedYes}
              </span>
            ) : null}
            {detail.prediction?.modelVersion ? (
              <span className="inline-flex items-center rounded-full border border-hairline bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted-foreground">
                {detail.prediction.modelVersion}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {detail.disagreementField ? (
        <div className="rounded-2xl border border-violet/30 bg-violet-soft/50 p-5">
          <h2 className="font-display text-xl text-ink">{t.disagreementTitle}</h2>
          <p className="mt-2 max-w-[64ch] text-sm leading-[1.6] text-muted-foreground">
            {t.disagreementBody}
          </p>
          <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">{t.disagreementModelSaid}</dt>
              <dd className="mt-1 font-medium text-ink">
                {detail.prediction?.ranked?.[0]?.field
                  ? displayLabel(detail.prediction.ranked[0].field)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t.disagreementTheyContributed}</dt>
              <dd className="mt-1 font-medium text-violet-ink">
                {displayLabel(detail.disagreementField)}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {detail.prediction?.marginalised ? (
        <p className="max-w-[64ch] text-sm leading-[1.6] text-muted-foreground">
          {t.marginalisedNotice}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <Kicker className="text-violet-ink">{t.answersKicker}</Kicker>
          <h2 className="font-display mt-2 text-2xl text-ink">{t.answersTitle}</h2>
          <dl className="mt-5 rounded-2xl border border-hairline bg-surface p-5">
            {groups.map((group) => (
              <AnswerRow key={group.key} group={group} answers={detail.answers} />
            ))}
          </dl>
        </section>

        <section>
          <Kicker className="text-violet-ink">{t.predictionKicker}</Kicker>
          <h2 className="font-display mt-2 text-2xl text-ink">{t.predictionTitle}</h2>
          {!detail.prediction || detail.prediction.ranked.length === 0 ? (
            <div className="mt-5 flex min-h-[160px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-hairline px-6 text-center">
              <p className="text-sm text-muted-foreground">{t.noPredictionBody}</p>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              {detail.prediction.ranked.map((entry, i) => (
                <RankedEntry key={entry.field} entry={entry} rank={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
