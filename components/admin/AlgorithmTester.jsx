'use client';

// The interactive half of /admin/algorithm-tester (Plan 5, Task 6): every
// question rendered straight from feature_spec.json (via lib/features.js
// / lib/quiz/useQuizState.js's orderedGroups() — never a hardcoded list),
// two one-click presets for the documented demo students, and a "what
// changed" diff that is the whole point of the screen: the clearest
// possible proof the model responds to input rather than guessing.
//
// All hooks run unconditionally, every render, before any conditional
// JSX (the project's hook-order rule — see lib/motion/useReducedMotion.js's
// header comment and MatchBar.jsx, which this component reuses). There is
// no early return anywhere above the hook calls in this file.
//
// Nothing here is stored: submission goes to app/api/admin/algorithm-tester/
// route.js, which forwards straight to the ML service and returns its raw
// response — no quiz_responses row, no predictions row, ever.
import { useCallback, useMemo, useState } from 'react';
import OptionGrid from '@/components/quiz/OptionGrid.jsx';
import MatchBar from '@/components/arah/MatchBar.jsx';
import Kicker from '@/components/arah/Kicker.jsx';
import { validateAnswers } from '@/lib/features';
import { orderedGroups, buildPayload, sectionForGroup } from '@/lib/quiz/useQuizState';
import { displayLabel } from '@/lib/i18n/labels';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';

const t = en.admin.algorithmTester;

// The two demo students from docs/PLAN-1-VS-AGREED.md §5 / docs/
// PROJECT-RECORD.md §4, reconstructed as real feature_spec.json option
// strings and verified live against the deployed ML service before being
// hardcoded here:
//   - technical: preu deliberately OMITTED — the documented 66.4% figure
//     is the MARGINALISED result (averaged across pre-U routes), not the
//     single-route 75.4% a stated "Foundation" route would produce. This
//     preset reproduced 66.6% top-ranked Computer Science against the
//     live model at the time this was written.
//   - arts: preu "Diploma", matching the documented, non-marginalised
//     28.9%-top-ranked Creative Art run.
const TECHNICAL_PRESET = {
  stream: ['Technical & Vocational (Sains Komputer, Rekacipta, Lukisan Kejuruteraan etc)'],
  enjoyed: ['Mathematical Subjects', 'Technology & Computing Subjects'],
  difficult: ['Language Subjects (B. Melayu, B. Inggeris, B. Arab)'],
  tasks: ['Analysing and interpreting data'],
  traits: ['Analytical', 'Observant', 'Strategic'],
  personality: 'Introvert',
  results: '6 - 8 As (A-, A, A+)',
  school: 'Public School (SMK / SMJKC)',
  speaking: 3,
};

const ARTS_PRESET = {
  stream: ['Arts'],
  enjoyed: [
    'Art, Humanities & Social Science Subjects (Art, History, P.Islam/Moral)',
    'Language Subjects (B. Melayu, B. Inggeris, B. Arab)',
  ],
  difficult: ['Mathematical Subjects'],
  tasks: ['Creating or designing things', 'Writing or storytelling'],
  traits: ['Creative', 'Outgoing', 'Persuasive'],
  personality: 'Extrovert',
  results: '3 - 5 As (A-, A, A+)',
  preu: 'Diploma',
  school: 'Public School (SMK / SMJKC)',
  speaking: 4,
};

function rankMap(ranked) {
  const m = new Map();
  (ranked ?? []).forEach((r, i) => m.set(r.field, { rank: i + 1, probability: r.probability }));
  return m;
}

/** Every field that appears in either run, sorted by its new rank. */
function buildRankingDiff(oldRanked, newRanked) {
  const oldMap = rankMap(oldRanked);
  const newMap = rankMap(newRanked);
  const fields = new Set([...oldMap.keys(), ...newMap.keys()]);
  return Array.from(fields)
    .map((field) => {
      const before = oldMap.get(field) ?? null;
      const after = newMap.get(field) ?? null;
      return {
        field,
        before,
        after,
        rankDelta: before && after ? before.rank - after.rank : null,
        probDelta: before && after ? after.probability - before.probability : null,
      };
    })
    .sort((a, b) => (a.after?.rank ?? 99) - (b.after?.rank ?? 99));
}

/** Which spec-group answers differ between two submitted payloads. */
function diffAnswerKeys(groups, oldPayload, newPayload) {
  const changed = [];
  for (const g of groups) {
    const before = oldPayload?.[g.key];
    const after = newPayload?.[g.key];
    const norm = (v) => JSON.stringify(Array.isArray(v) ? [...v].sort() : (v ?? null));
    if (norm(before) !== norm(after)) {
      changed.push({ key: g.key, label: g.label, before, after, type: g.type });
    }
  }
  return changed;
}

function formatValue(value, type) {
  if (value == null) return '—';
  if (Array.isArray(value)) return value.length ? value.map(displayLabel).join(', ') : '—';
  if (type === 'num') return String(value);
  return displayLabel(value);
}

function rankArrow(delta) {
  if (delta === null) return { symbol: '—', word: t.diffNewField, tone: 'text-muted-foreground' };
  if (delta > 0) return { symbol: '▲', word: t.diffRankUp, tone: 'text-teal' };
  if (delta < 0) return { symbol: '▼', word: t.diffRankDown, tone: 'text-danger' };
  return { symbol: '—', word: t.diffRankSame, tone: 'text-muted-foreground' };
}

function TesterQuestion({ group, value, atLimit, choose, toggle, setNumber, missing }) {
  const helper =
    group.type === 'multi' && group.max_select
      ? `${en.quiz.pickUpTo} ${group.max_select}.`
      : group.type === 'single'
        ? en.quiz.pickOne
        : null;

  return (
    <fieldset className="rounded-2xl border border-hairline bg-surface p-5">
      <Kicker as="legend" className="px-1 text-violet-ink">
        {en.quiz.sections[sectionForGroup(group)]}
      </Kicker>
      <p className={cn('font-display mt-2 text-lg leading-snug text-ink md:text-xl', missing && 'text-danger')}>
        {group.label}
      </p>
      {helper ? <p className="mt-1 text-[13px] text-muted-foreground">{helper}</p> : null}
      <div className="mt-4">
        <OptionGrid
          group={group}
          value={value}
          atLimit={atLimit}
          choose={choose}
          toggle={toggle}
          setNumber={setNumber}
        />
      </div>
    </fieldset>
  );
}

function ResultPanel({ current }) {
  if (!current) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-hairline px-6 py-10 text-center">
        <p className="text-sm font-medium text-ink">{t.emptyResultTitle}</p>
        <p className="max-w-[48ch] text-sm leading-[1.6] text-muted-foreground">
          {t.emptyResultBody}
        </p>
      </div>
    );
  }

  const { result } = current;
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Kicker className="text-violet-ink">{t.resultKicker}</Kicker>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-hairline bg-surface-2 px-2.5 py-1 font-mono text-xs text-ink">
            {t.modelVersion}: {result.model_version}
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide',
              result.marginalised
                ? 'border-amber/30 bg-amber/10 text-amber'
                : 'border-hairline bg-surface-2 text-ink'
            )}
          >
            {result.marginalised ? t.marginalisedYes : t.marginalisedNo}
          </span>
        </div>
      </div>
      <h2 className="font-display mt-2 text-2xl text-ink md:text-[28px]">{t.resultTitle}</h2>
      <ul className="mt-5 flex flex-col gap-4">
        {result.ranked.map((entry, i) => (
          <li key={entry.field}>
            <MatchBar
              label={`${i + 1}. ${displayLabel(entry.field)}`}
              percent={entry.probability * 100}
              tone={i === 0 ? 'violet' : 'cyan'}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DiffPanel({ groups, previous, current }) {
  if (!previous || !current) return null;

  const changedAnswers = diffAnswerKeys(groups, previous.answers, current.answers);
  const rankingRows = buildRankingDiff(previous.result.ranked, current.result.ranked);
  const oldTop = previous.result.ranked[0]?.field ?? null;
  const newTop = current.result.ranked[0]?.field ?? null;
  const topChanged = oldTop !== newTop;

  return (
    <div className="rounded-2xl border border-violet/25 bg-violet-soft/30 p-5 md:p-6">
      <Kicker className="text-violet-ink">{t.diffKicker}</Kicker>
      <h2 className="font-display mt-2 text-2xl text-ink md:text-[28px]">{t.diffTitle}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t.diffIntro}</p>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t.diffChangedAnswers}
        </p>
        {changedAnswers.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">{t.diffNoChange}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {changedAnswers.map((c) => (
              <li key={c.key} className="text-sm leading-[1.5] text-ink">
                <span className="font-medium">{c.label}:</span>{' '}
                <span className="text-muted-foreground line-through decoration-danger/50">
                  {formatValue(c.before, c.type)}
                </span>{' '}
                <span aria-hidden="true">→</span>{' '}
                <span className="font-medium text-violet-ink">{formatValue(c.after, c.type)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-5 text-sm font-medium text-ink">
        {topChanged ? t.diffTopChanged : t.diffTopSame}
        {topChanged ? (
          <>
            : <span className="text-muted-foreground">{oldTop ? displayLabel(oldTop) : '—'}</span>{' '}
            <span aria-hidden="true">→</span>{' '}
            <span className="text-violet-ink">{newTop ? displayLabel(newTop) : '—'}</span>
          </>
        ) : null}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Field</th>
              <th className="py-2 pr-4 font-medium">Before</th>
              <th className="py-2 pr-4 font-medium">After</th>
              <th className="py-2 font-medium">Moved</th>
            </tr>
          </thead>
          <tbody>
            {rankingRows.map((row) => {
              const arrow = rankArrow(row.rankDelta);
              return (
                <tr key={row.field} className="border-b border-hairline/60 last:border-0">
                  <td className="py-2 pr-4 text-ink">{displayLabel(row.field)}</td>
                  <td className="py-2 pr-4 font-mono tabular-nums text-muted-foreground">
                    {row.before ? `#${row.before.rank} · ${(row.before.probability * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2 pr-4 font-mono tabular-nums text-ink">
                    {row.after ? `#${row.after.rank} · ${(row.after.probability * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className={cn('py-2 font-mono tabular-nums', arrow.tone)}>
                    <span aria-hidden="true">{arrow.symbol}</span> {arrow.word}
                    {row.probDelta !== null ? (
                      <span className="ml-1 text-muted-foreground">
                        ({row.probDelta >= 0 ? '+' : ''}
                        {(row.probDelta * 100).toFixed(1)}pp)
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const primaryButton = cn(
  'inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white',
  'bg-violet transition-colors duration-200 hover:bg-violet-ink active:bg-violet-pl',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet',
  'disabled:pointer-events-none disabled:opacity-50'
);

const secondaryButton = cn(
  'inline-flex min-h-11 items-center justify-center rounded-full border border-hairline px-5 text-sm font-medium text-ink',
  'transition-colors duration-200 hover:border-violet/40 hover:text-violet-ink active:text-violet-pl',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet',
  'disabled:pointer-events-none disabled:opacity-50'
);

export default function AlgorithmTester() {
  const groups = useMemo(() => orderedGroups(), []);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(null); // { answers, result }
  const [previous, setPrevious] = useState(null); // { answers, result } | null
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [missingKeys, setMissingKeys] = useState(null);

  const choose = useCallback((g, option) => {
    setAnswers((prev) => ({ ...prev, [g.key]: option }));
  }, []);

  const toggle = useCallback((g, option) => {
    setAnswers((prev) => {
      const list = Array.isArray(prev[g.key]) ? prev[g.key] : [];
      if (list.includes(option)) return { ...prev, [g.key]: list.filter((x) => x !== option) };
      if (g.max_select && list.length >= g.max_select) return prev;
      return { ...prev, [g.key]: [...list, option] };
    });
  }, []);

  const setNumber = useCallback((g, n) => {
    setAnswers((prev) => ({ ...prev, [g.key]: Math.min(Math.max(n, g.min), g.max) }));
  }, []);

  const atLimit = useCallback(
    (g) =>
      g.type === 'multi' &&
      Boolean(g.max_select) &&
      Array.isArray(answers[g.key]) &&
      answers[g.key].length >= g.max_select,
    [answers]
  );

  const runPrediction = useCallback(
    async (answersToRun) => {
      const payload = buildPayload(groups, answersToRun);
      const { ok, errors } = validateAnswers(payload);
      if (!ok) {
        setMissingKeys(new Set(Object.keys(errors)));
        setError(t.validationError);
        return;
      }
      setMissingKeys(null);
      setError(null);
      setSubmitting(true);
      try {
        const res = await fetch('/api/admin/algorithm-tester', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ answers: payload }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.message || t.errorBody);
        setCurrent((prevCurrent) => {
          setPrevious(prevCurrent);
          return { answers: payload, result: body };
        });
      } catch (err) {
        setError(err?.message || t.errorBody);
      } finally {
        setSubmitting(false);
      }
    },
    [groups]
  );

  function handlePreset(preset) {
    setAnswers(preset);
    runPrediction(preset);
  }

  function handleReset() {
    setAnswers({});
    setMissingKeys(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-2xl border border-hairline bg-surface p-5 md:p-6">
        <Kicker className="text-violet-ink">{t.presetsKicker}</Kicker>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handlePreset(TECHNICAL_PRESET)}
            disabled={submitting}
            className={secondaryButton}
          >
            {t.presetTechnical}
          </button>
          <button
            type="button"
            onClick={() => handlePreset(ARTS_PRESET)}
            disabled={submitting}
            className={secondaryButton}
          >
            {t.presetArts}
          </button>
          <button type="button" onClick={handleReset} disabled={submitting} className={secondaryButton}>
            {t.resetLabel}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <TesterQuestion
            key={group.key}
            group={group}
            value={answers[group.key]}
            atLimit={atLimit(group)}
            choose={choose}
            toggle={toggle}
            setNumber={setNumber}
            missing={missingKeys?.has(group.key)}
          />
        ))}
      </div>

      <div className="flex flex-col items-start gap-3">
        <button
          type="button"
          onClick={() => runPrediction(answers)}
          disabled={submitting}
          aria-busy={submitting || undefined}
          className={primaryButton}
        >
          {submitting ? t.submitting : t.submitLabel}
        </button>
        {error ? (
          <p role="alert" className="text-sm leading-[1.5] text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <ResultPanel current={current} />
      <DiffPanel groups={groups} previous={previous} current={current} />
    </div>
  );
}
