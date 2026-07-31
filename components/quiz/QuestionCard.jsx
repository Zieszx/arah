'use client';

// One question screen: section kicker, the question itself as a
// <legend> inside a <fieldset> (so every option group is natively
// labelled for assistive tech), a helper line, the options, and the
// per-question notices.
//
// The legend takes programmatic focus when the student navigates between
// questions, so keyboard and screen-reader users land on the question
// text — not somewhere below it. Programmatic .focus() on tabIndex={-1}
// doesn't match :focus-visible, so no ring flashes for mouse users.
import { useEffect, useRef } from 'react';
import Kicker from '@/components/arah/Kicker.jsx';
import OptionGrid from './OptionGrid.jsx';
import { sectionForGroup } from '@/lib/quiz/useQuizState';
import en from '@/lib/i18n/en';

function helperLine(group) {
  // The "fine not to know yet" reassurance only applies when the
  // question genuinely IS optional here — the quiz's preu group always
  // is (feature_spec.json), but a caller may reuse this
  // component for the same ten questions and deliberately renders preu
  // with `optional: false`: a contributor already knows which pre-U
  // route they took, so "not sure yet" would be false reassurance there.
  if (group.key === 'preu' && group.optional) return en.quiz.preuHelper;
  if (group.type === 'multi' && group.max_select) {
    return `${en.quiz.pickUpTo} ${group.max_select}.`;
  }
  if (group.type === 'single') return en.quiz.pickOne;
  return null;
}

export default function QuestionCard({
  group,
  value,
  atLimit,
  limitNotice,
  stepError,
  choose,
  toggle,
  setNumber,
  focusOnMount = false,
}) {
  const legendRef = useRef(null);

  useEffect(() => {
    if (focusOnMount) legendRef.current?.focus();
  }, [focusOnMount]);

  const helper = helperLine(group);
  const showStandingLimit = atLimit && !limitNotice;

  return (
    <div>
      <Kicker>{en.quiz.sections[sectionForGroup(group)]}</Kicker>

      <fieldset className="mt-5 border-0 p-0">
        <legend
          ref={legendRef}
          tabIndex={-1}
          className="font-display max-w-[22ch] text-[28px] leading-[1.12] text-text md:text-[40px]"
        >
          {group.label}
        </legend>

        {helper ? (
          <p className="mt-3 max-w-[52ch] text-[14px] text-muted-foreground md:text-[15px]">
            {helper}
          </p>
        ) : null}

        <div className="mt-7 md:mt-9">
          <OptionGrid
            group={group}
            value={value}
            atLimit={atLimit}
            choose={choose}
            toggle={toggle}
            setNumber={setNumber}
          />
        </div>

        {/* Notices. role="status" is a built-in polite live region, so a
            refused tap past max_select is announced, not just shown. The
            standing at-limit line appears the moment the cap is reached —
            the greyed options are explained before anyone taps them. */}
        <div role="status" className="mt-4 min-h-5 text-[13px] leading-[1.5]">
          {limitNotice ? (
            <p className="text-amber">{limitNotice}</p>
          ) : showStandingLimit ? (
            <p className="text-amber">
              {en.quiz.atLimit} {group.max_select} {en.quiz.atLimitTail}
            </p>
          ) : null}
        </div>
        {stepError ? (
          <p role="alert" className="mt-1 text-[13px] leading-[1.5] text-danger">
            {stepError}
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}
