'use client';

// The quiz's single source of truth. Every question, option and limit is
// read from services/ml/feature_spec.json via lib/features.js — nothing
// about the questions is hardcoded here, because a hardcoded option that
// drifts from the spec produces silently wrong predictions (the exact
// failure mode this project exists to prevent).
//
// What this hook owns:
//   - display order + section grouping (presentation-only concerns the
//     spec deliberately doesn't know about),
//   - answers state, with max_select enforced at the source so no UI
//     path can exceed it,
//   - a localStorage mirror keyed by spec version, so a refresh on a
//     flaky phone connection never loses progress and answers saved
//     against an older spec can never leak into a newer one,
//   - the payload builder, which omits `preu` entirely when the student
//     is not sure — the server marginalises over routes in that case.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getGroups, getSpec, validateAnswers } from '@/lib/features';
import en from '@/lib/i18n/en';

// Sentinel for the pre-U "Not sure yet" choice. It is a first-class answer
// in the UI but never appears in the payload — buildPayload() drops it,
// which is what triggers server-side marginalisation. The value is
// deliberately not a plausible option string.
export const NOT_SURE = '__not_sure_yet__';

// Presentation order — *about you*, then *what you like*, then *where
// you're heading*. Only keys live here; labels, options and limits always
// come from the spec. A key the spec drops disappears automatically, and
// a new spec key is appended (rather than lost) by the rank fallback.
const DISPLAY_ORDER = [
  'school',
  'results',
  'stream',
  'enjoyed',
  'difficult',
  'tasks',
  'traits',
  'personality',
  'speaking',
  'preu',
];

const SECTION_BY_KEY = {
  school: 'about',
  results: 'about',
  stream: 'about',
  preu: 'heading',
};

export function sectionForGroup(group) {
  return SECTION_BY_KEY[group.key] ?? 'like';
}

export function orderedGroups() {
  const rank = (g) => {
    const i = DISPLAY_ORDER.indexOf(g.key);
    return i === -1 ? DISPLAY_ORDER.length : i;
  };
  return [...getGroups()].sort((a, b) => rank(a) - rank(b));
}

function storageKey() {
  // Versioned so answers saved against an old spec never restore into a
  // new one — a stale option string would fail validation at best and
  // skew the vector at worst.
  //
  // Deliberately still "arah:quiz:..." after the /quiz -> /questions
  // rename (docs/design/light-theme-conversion.md §7): a student
  // mid-questions at deploy time has this key already in their browser,
  // and renaming it would silently orphan their in-progress answers on
  // the next page load. The key is an internal storage namespace, never
  // shown to anyone, so there is no user-visible cost to leaving it.
  return `arah:quiz:${getSpec().version}`;
}

/**
 * Filter a raw (possibly stale or hand-edited) localStorage payload down
 * to answers the current spec actually recognises.
 */
export function sanitizeStoredAnswers(groups, raw) {
  const answers = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return answers;
  for (const g of groups) {
    const v = raw[g.key];
    if (v == null) continue;
    if (g.type === 'num') {
      if (typeof v === 'number' && Number.isFinite(v) && v >= g.min && v <= g.max) {
        answers[g.key] = v;
      }
      continue;
    }
    if (g.type === 'multi') {
      if (Array.isArray(v)) {
        const kept = v.filter((x) => typeof x === 'string' && g.options.includes(x));
        const capped = g.max_select ? kept.slice(0, g.max_select) : kept;
        if (capped.length) answers[g.key] = capped;
      }
      continue;
    }
    // single
    if (typeof v === 'string' && (g.options.includes(v) || (g.optional && v === NOT_SURE))) {
      answers[g.key] = v;
    }
  }
  return answers;
}

export function isAnswered(group, value) {
  if (group.type === 'num') return typeof value === 'number' && Number.isFinite(value);
  if (group.type === 'multi') return Array.isArray(value) && value.length > 0;
  return typeof value === 'string' && value.length > 0;
}

/**
 * Answers as the API expects them: the NOT_SURE sentinel and any
 * unanswered optional group are omitted entirely (server-side
 * marginalisation), everything else passes through untouched.
 */
export function buildPayload(groups, answers) {
  const out = {};
  for (const g of groups) {
    const v = answers[g.key];
    if (!isAnswered(g, v)) continue;
    if (v === NOT_SURE) continue;
    out[g.key] = v;
  }
  return out;
}

export function useQuizState() {
  const groups = useMemo(() => orderedGroups(), []);
  const total = groups.length;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  // false until the localStorage restore has run — the page holds a
  // skeleton until then so a returning student never sees question 1
  // flash before their real position is restored.
  const [ready, setReady] = useState(false);
  // +1 forward / -1 backward, for direction-aware transitions.
  const [direction, setDirection] = useState(1);
  // Set when a tap tries to exceed max_select on the current question.
  const [limitNotice, setLimitNotice] = useState(null);
  // Set when Next is pressed on an unanswered required question.
  const [stepError, setStepError] = useState(null);

  const group = groups[step];

  // ---- restore once on mount ------------------------------------------
  // This effect genuinely synchronizes React state *from* an external
  // system (localStorage) exactly once, on mount. It cannot be a lazy
  // useState initializer: this component is server-rendered, and reading
  // window.localStorage during the first client render would make the
  // hydration pass disagree with the server HTML. The one-shot cascade is
  // the accepted cost of a mismatch-free restore.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = JSON.parse(window.localStorage.getItem(storageKey()) ?? 'null');
      const restored = sanitizeStoredAnswers(groups, raw?.answers);
      const savedStep =
        typeof raw?.step === 'number' && Number.isInteger(raw.step)
          ? Math.min(Math.max(raw.step, 0), groups.length - 1)
          : 0;
      if (Object.keys(restored).length) setAnswers(restored);
      if (savedStep > 0) setStep(savedStep);
    } catch {
      // Corrupt storage is treated as a fresh start, never a crash.
    }
    setReady(true);
  }, [groups]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ---- mirror every change back ---------------------------------------
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(storageKey(), JSON.stringify({ step, answers }));
    } catch {
      // Storage full / private mode — the in-memory state still works.
    }
  }, [ready, step, answers]);

  const clearNotices = useCallback(() => {
    setLimitNotice(null);
    setStepError(null);
  }, []);

  /** Radio-style choice (also handles the NOT_SURE sentinel for preu). */
  const choose = useCallback(
    (g, option) => {
      clearNotices();
      setAnswers((prev) => ({ ...prev, [g.key]: option }));
    },
    [clearNotices]
  );

  /**
   * Checkbox-style choice. Removing is always allowed; adding past
   * max_select is refused *here* — not in the UI — and surfaces a
   * notice instead of silently ignoring the tap.
   */
  const toggle = useCallback(
    (g, option) => {
      setStepError(null);
      const current = Array.isArray(answers[g.key]) ? answers[g.key] : [];
      if (!current.includes(option) && g.max_select && current.length >= g.max_select) {
        // Refuse *and say so* — a silently ignored tap reads as a broken
        // page. (The decision is made from rendered state, not inside the
        // updater: React runs functional updaters later, during render, so
        // a flag set in there could not be read back here.)
        setLimitNotice(
          `${en.quiz.overLimitLead} ${g.max_select}. ${en.quiz.overLimitTail}`
        );
        return;
      }
      setLimitNotice(null);
      setAnswers((prev) => {
        const list = Array.isArray(prev[g.key]) ? prev[g.key] : [];
        if (list.includes(option)) {
          return { ...prev, [g.key]: list.filter((x) => x !== option) };
        }
        // Re-checked inside the updater as a safety net against a stale
        // closure racing a queued update.
        if (g.max_select && list.length >= g.max_select) return prev;
        return { ...prev, [g.key]: [...list, option] };
      });
    },
    [answers]
  );

  /** The 1–5 scale. */
  const setNumber = useCallback(
    (g, n) => {
      clearNotices();
      const clamped = Math.min(Math.max(n, g.min), g.max);
      setAnswers((prev) => ({ ...prev, [g.key]: clamped }));
    },
    [clearNotices]
  );

  const atLimit = useCallback(
    (g) =>
      g.type === 'multi' &&
      Boolean(g.max_select) &&
      Array.isArray(answers[g.key]) &&
      answers[g.key].length >= g.max_select,
    [answers]
  );

  const next = useCallback(() => {
    const g = groups[step];
    // The optional pre-U question must never block — skipping it is a
    // legitimate answer, not a validation failure.
    if (!g.optional && !isAnswered(g, answers[g.key])) {
      setStepError(en.quiz.answerRequired);
      return false;
    }
    if (step < total - 1) {
      clearNotices();
      setDirection(1);
      setStep(step + 1);
    }
    return true;
  }, [groups, step, total, answers, clearNotices]);

  const back = useCallback(() => {
    if (step === 0) return;
    clearNotices();
    setDirection(-1);
    setStep(step - 1);
  }, [step, clearNotices]);

  const goTo = useCallback(
    (i) => {
      const target = Math.min(Math.max(i, 0), total - 1);
      clearNotices();
      setDirection(target >= step ? 1 : -1);
      setStep(target);
    },
    [step, total, clearNotices]
  );

  const payload = useCallback(() => buildPayload(groups, answers), [groups, answers]);

  /** Validate the payload the same way the server will. */
  const validate = useCallback(
    () => validateAnswers(buildPayload(groups, answers)),
    [groups, answers]
  );

  const clearSaved = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey());
    } catch {
      // Nothing to do — the redirect proceeds regardless.
    }
  }, []);

  return {
    groups,
    total,
    step,
    group,
    answers,
    ready,
    direction,
    limitNotice,
    stepError,
    isLast: step === total - 1,
    choose,
    toggle,
    setNumber,
    atLimit,
    next,
    back,
    goTo,
    payload,
    validate,
    clearSaved,
  };
}
