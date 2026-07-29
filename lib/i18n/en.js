// All user-facing copy for the auth screens lives here, not in components.
//
// v1 ships English only, but the product serves Malaysian post-SPM students
// and Bahasa Melayu is a known follow-up. Keeping every string in one
// locale module means adding BM later is "write lib/i18n/ms.js and pick a
// locale" — no component edits, no copy hunts through JSX.
//
// Error strings are written for a 17-year-old mid-form, not for a
// developer reading a stack trace: plain words, no vendor names, always a
// next step. Raw Supabase error messages must never reach the UI — the
// mapping in app/(auth)/actions.js translates error codes to these.
const en = {
  auth: {
    login: {
      metaTitle: 'Sign in — ARAH',
      metaDescription: 'Sign back in to pick up your quiz and results.',
      kicker: 'Welcome back',
      title: 'Sign back in.',
      subtitle: 'Your answers and results are where you left them.',
      submit: 'Sign in',
      pending: 'Signing in…',
      switchPrompt: 'First time here?',
      switchCta: 'Create an account',
    },
    signup: {
      metaTitle: 'Create an account — ARAH',
      metaDescription:
        'Create an account to take the quiz and keep your results.',
      kicker: '207 students before you',
      title: 'Start with an account.',
      subtitle:
        'It keeps your answers and results together, so you can come back to them.',
      submit: 'Create account',
      pending: 'Creating your account…',
      switchPrompt: 'Already have an account?',
      switchCta: 'Sign in',
      // Shown only if the account was created but the server couldn't
      // finish signing them in — the graceful fallback, never an error.
      createdSignInFallback:
        'Your account is ready — sign in with the email and password you just chose.',
    },
    fields: {
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      passwordHint: 'At least 8 characters.',
    },
    errors: {
      emailRequired: 'Enter your email so we know whose results these are.',
      emailInvalid: "That doesn't look like an email address. Check for typos.",
      passwordRequired: 'Enter your password.',
      passwordTooShort: 'Your password needs at least 8 characters.',
      confirmRequired: 'Type your password again so we know it’s right.',
      confirmMismatch: "These two passwords don't match. Try typing them again.",
      invalidCredentials:
        "That password doesn't match our records. Check it and try again.",
      emailNotConfirmed:
        'This email hasn’t been confirmed yet. Open the confirmation email we sent you, then sign in.',
      emailTaken:
        'This email already has an account. Try signing in instead.',
      weakPassword:
        'That password is too easy to guess. Make it longer or mix in some numbers.',
      rateLimited:
        'Too many tries in a row. Wait a minute, then try again.',
      generic:
        'Something went wrong on our side, not yours. Please try again.',
    },
    notice: {
      title: 'What happens to your answers',
      body: 'We store your answers and your results so you can come back to them. We do not sell them or share them with universities. You can delete everything from your account page at any time.',
    },
    // §5c sliding overlay panel — the gradient panel that covers whichever
    // form isn't active, and the compact band that replaces it below 768px.
    panel: {
      kicker: 'From a real student',
      // Ghost button on the panel: switches to the other form. Mirrors the
      // wording of the plain-text switchCta below each form (login.switchCta
      // / signup.switchCta) but shortened to fit a pill button on a busy
      // gradient.
      toLogin: 'Sign in',
      toSignup: 'Sign up',
      // Announced in the polite live region once the slide/crossfade
      // settles — a sighted user sees the panel move, a screen-reader user
      // needs to be told in words (§5c trap 3).
      signupRevealed: 'Sign-up form shown.',
      loginRevealed: 'Sign-in form shown.',
    },
  },

  quiz: {
    metaTitle: 'The quiz — ARAH',
    metaDescription:
      'Ten questions, matched against 207 real alumni outcomes. About three minutes.',
    // Section kickers — the quiz reads as a conversation in three parts,
    // not a form. Which part a question belongs to is decided by key in
    // lib/quiz/useQuizState.js; the copy lives here.
    sections: {
      about: 'About you',
      like: 'What you like',
      heading: 'Where you’re heading',
      // Used only by /contribute (Plan 4, Task 4), which reuses
      // QuestionCard/OptionGrid for its three outcome questions —
      // sectionForGroup(), lib/quiz/useQuizState.js, maps them here.
      outcome: 'What actually happened',
    },
    progressLabel: 'Question', // "Question 3 of 10"
    of: 'of',
    // Helper lines under the question.
    pickOne: 'Pick one.',
    pickUpTo: 'Pick up to', // "Pick up to 3."
    // Shown while a multi question is at its cap — explains why the other
    // options look unavailable, before the student even taps one.
    atLimit: 'That’s your', // "That's your 3 — unselect one to swap."
    atLimitTail: '— unselect one to swap.',
    // Shown when a tap tries to go past the cap. Never silently ignored.
    overLimitLead: 'You can pick up to',
    overLimitTail: 'Unselect one first, then choose this one.',
    // The pre-U question is the one question that is fine to skip.
    preuHelper:
      'It’s completely fine not to know yet — your prediction works either way.',
    notSure: 'Not sure yet',
    // The 1–5 public-speaking scale endpoints.
    speakingLow: 'Not comfortable at all',
    speakingHigh: 'Very comfortable',
    // Navigation + submission.
    back: 'Back',
    next: 'Next',
    submit: 'See my matches',
    submitting: 'Matching you against 207 alumni…',
    answerRequired: 'Pick an answer to keep going.',
    submitError:
      'We couldn’t get your results just now. Your answers are safe on this device — try again in a moment.',
  },

  results: {
    metaTitle: 'Your matches — ARAH',
    metaDescription:
      'Where students like you actually went — matched against real alumni outcomes.',
    kicker: 'Your matches',
    // Honesty framing, non-negotiable: the page reports what students like
    // this one CHOSE. It never says "you should study this" and the top
    // field is never presented as a decision.
    eyebrow: 'Students like you most often chose',
    // "44 of the 207 students most like you studied this." — the single
    // most important sentence on the page. Composed around the two counts
    // at the call site.
    explainOf: 'of the',
    explainTail: 'students most like you studied this.',
    listKicker: 'Your top five',
    listIntro:
      'Ranked by how often students with answers like yours ended up in each field.',
    // Alumni context stat labels. A stat that is absent from the stored
    // row is simply not rendered — never 0, never a dash, never imputed.
    statSatisfaction: 'Average satisfaction',
    statSatisfactionOutOf: 'out of 5',
    statDissatisfied: 'Ended up dissatisfied',
    statPreu: 'Most common pre-U route',
    // K-anonymity suppression, said plainly. "Only {n} students in our
    // data chose this — not enough to report satisfaction without risking
    // identifying someone."
    suppressedLead: 'Only',
    suppressedTail:
      'students in our data chose this — not enough to report satisfaction without risking identifying someone.',
    suppressedNoCount:
      'Too few students in our data chose this — not enough to report satisfaction without risking identifying someone.',
    marginalised: {
      notice:
        'You haven’t picked a pre-U route yet, so this is averaged across all five. Tell us your route to sharpen it.',
      busy: 'Sharpening your matches…',
      error:
        'We couldn’t re-run your matches just now. Everything below is unchanged — try again in a moment.',
    },
    dissent: {
      title: 'Not what you expected?',
      body:
        'That’s a fair answer. This page shows what students like you chose — not what you should do. Disagreeing with it is a legitimate outcome, so browse every field, including the ones ranked low, and decide for yourself.',
      cta: 'Explore every field',
    },
    // Quiet provenance line: "Matched against 207 alumni · model 2026-07-28".
    matchedAgainst: 'Matched against',
    alumni: 'alumni',
    model: 'model',
  },

  account: {
    metaTitle: 'Your account — ARAH',
    metaDescription: 'Your past quizzes and results, and account controls.',
    kicker: 'Your account',
    title: 'Your quizzes.',
    signedInAs: 'Signed in as',
    // Empty state — a student with no quiz history yet.
    empty: {
      title: 'Nothing here yet.',
      body: 'Take the quiz and your matches will show up on this page, so you can find them again later.',
      cta: 'Take the quiz',
    },
    // One history row.
    item: {
      matched: 'Matched to',
      marginalised: 'Averaged — no pre-U route yet',
      viewResults: 'View results',
    },
    // The orphan case: quiz_responses saved, predictions row never landed
    // (the ML service was down — proven live during Task 4 testing). This
    // must read as honest, not broken.
    orphan: {
      title: "Answers saved, prediction didn't finish.",
      body: 'Something interrupted matching last time. Your answers are still here — retry whenever you like.',
      retry: 'Retry',
      retrying: 'Retrying…',
      error: "That didn't work either. Your answers are still safe — try again in a moment.",
    },
    // Account deletion — a two-step, deliberate confirmation, never a
    // single accidental tap. See app/api/account/delete/route.js: this is
    // the promise made on the signup page (lib/i18n/en.js auth.notice),
    // and it must be genuinely destructive, not a soft hide.
    delete: {
      zoneTitle: 'Delete account',
      zoneBody:
        'Permanently remove your answers, results and account. This cannot be undone.',
      trigger: 'Delete your account',
      dialogTitle: 'Delete your account?',
      dialogBody:
        'This permanently removes every quiz you’ve taken, every result, and your account itself. There is no way to undo this. Type DELETE to confirm.',
      confirmLabel: 'Type DELETE to confirm',
      confirmPlaceholder: 'DELETE',
      cancel: 'Cancel',
      confirmCta: 'Permanently delete my account',
      deleting: 'Deleting…',
      errors: {
        confirmRequired: 'Type DELETE, exactly, to confirm.',
        generic:
          'We couldn’t delete your account just now. Nothing was changed — please try again in a moment.',
      },
    },
  },

  // /explore — the index (Task 2) and per-field detail (Task 3) pages.
  // Same honesty rules as /results: a suppressed field states its sample
  // size and says plainly why the rest is withheld, never a fabricated
  // number. `suppressedLead`/`suppressedTail`/`suppressedNoCount` are
  // deliberately the SAME strings `results` already uses (not a
  // near-duplicate) — one sentence, one place it could ever drift.
  explore: {
    metaTitle: 'Explore every field — ARAH',
    metaDescription:
      'All ten fields in the survey, in the students’ own numbers — sample size, satisfaction, and the routes that got them there.',
    kicker: '10 fields · 207 real students',
    title: 'Every field, in the numbers behind it.',
    body: 'Every card below is built from real alumni answers, sorted by how many students it is based on. The two smallest are honest about what they can’t tell you.',
    sampleSizeLabel: 'students in our data',
    statSatisfaction: 'Average satisfaction',
    statSatisfactionOutOf: '/5',
    statPreu: 'Most common route',
    cardCta: 'See the full picture',
    ctaTitle: 'Still not sure where you fit?',
    ctaBody: 'Answer ten questions and see where students like you actually went.',
    ctaButton: 'Take the quiz',
    // One editorial line per field, keyed by the slug from lib/explore/fields.js.
    // Descriptive category copy only — never a statistic, never fabricated data.
    fieldBlurbs: {
      'architecture-built-environment':
        'Architecture, urban planning and the built environment — for students who think in space and structure.',
      'business-management':
        'Accounting, finance, marketing and the general business track — the most chosen field in the survey.',
      'computer-science-software-data':
        'Software, cybersecurity and data — for students who want to build and analyse systems.',
      'creative-art': 'Fashion, interior and other creative design disciplines.',
      engineering:
        'Mechanical, civil, electrical and other engineering disciplines — building and solving with rigour.',
      'health-medical-sciences':
        'Medicine, pharmacy, dentistry and the other health professions.',
      'humanities-social-sciences':
        'Philosophy, language and the social sciences — understanding people and ideas.',
      'law-legal-studies': 'Law and legal studies — argument, precedent and process.',
      'media-communication':
        'Journalism, broadcasting and communication — telling stories for an audience.',
      'science-mathematics': 'Biology, chemistry, mathematics and the core sciences.',
    },
    detail: {
      kicker: 'field profile',
      back: 'Back to Explore',
      sampleSizeLabel: 'students in our data',
      satisfactionKicker: 'satisfaction distribution',
      satisfactionIntro:
        'How students in this field rated their own satisfaction, 1 to 5 — shares rounded to the nearest 5%, not exact headcounts.',
      satisfactionAxisLabel: 'of students',
      preuKicker: 'pre-university routes',
      preuIntro:
        'The pre-U programmes students in this field took before choosing it, rounded to the nearest 5%.',
      streamsKicker: 'SPM streams',
      streamsIntro:
        'The SPM streams students in this field came from, rounded to the nearest 5%.',
      quotesKicker: 'advice',
      quotesAttribution: 'From students who took this path',
      suppressedTitle: 'Not enough data to show a profile here.',
      suppressedBody:
        'We only show a full profile — satisfaction, routes, streams and advice — once a field has at least 10 students behind it, so no single answer can be worked out from the aggregate.',
    },
  },

  // /contribute (Plan 4, Task 4) — the give-back loop. Framed honestly, as
  // a real person donating real data about their own education: no
  // progress bars toward a badge, no "help us reach 300!" — see the task
  // brief's explicit instruction not to gamify this.
  contribute: {
    metaTitle: 'Contribute your answers — ARAH',
    metaDescription:
      'You already made this choice. Tell us what you actually chose and why, so the next student gets a better answer.',
    kicker: 'give back',
    title: 'You’ve been through this.',
    body: 'Tell us what you actually chose, and the next student gets a better answer. It’s the same ten questions the quiz asks, plus what you studied, why, and how it went.',
    // Sets the right expectation before anyone starts typing.
    reviewNotice:
      'A person reviews every submission before it can affect anyone’s results — nothing you send is used automatically.',
    signInPrompt: {
      title: 'Sign in to contribute.',
      body: 'We ask you to sign in so a person can review this against the rest of the data before it counts — the same reason the quiz does.',
      cta: 'Sign in',
    },
    outcomeKicker: 'What actually happened',
    // feature_spec.json's own preu label ("Which pre-U route are you
    // leaning towards?") is written for someone who hasn't decided yet —
    // exactly backwards for a contributor describing a route they already
    // completed. ContributeForm.jsx overrides the label with this one
    // (and `optional: false`) when rendering that one question; the raw
    // spec object itself is never mutated.
    preuLabel: 'Which pre-U route did you actually take?',
    fieldOfStudyLabel: 'What field did you actually study?',
    reasonsLabel: 'What were your main reasons for choosing it?',
    satisfactionLabel: 'Looking back, how satisfied are you with that choice?',
    satisfactionLow: 'Regret it',
    satisfactionHigh: 'Would choose it again',
    adviceKicker: 'advice',
    adviceLabel: 'What would you tell someone choosing right now?',
    adviceHint: 'A sentence or two is plenty — real and specific beats polished.',
    submit: 'Send my answers',
    submitting: 'Sending…',
    submitError:
      'We couldn’t save this just now. Nothing was lost — your answers are still in this form. Try again in a moment.',
    formErrorSummary: 'A few answers above need a second look before this can be saved.',
    // Thank-you state — replaces the form after a successful submit.
    thanks: {
      kicker: 'thank you',
      title: 'Sent — thank you.',
      body: 'A person reviews every contribution before it can change anyone’s results. Once it’s approved, it becomes part of what the next student sees.',
      cta: 'Back to Explore',
      another: 'Contribute another response',
    },
  },

  // Global chrome — the site header and footer on every page.
  chrome: {
    nav: {
      quiz: 'Quiz',
      explore: 'Explore',
      contribute: 'Contribute',
      account: 'Account',
    },
    login: 'Log in',
    logout: 'Log out',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    menuLabel: 'Menu',
    // One line under the mark. Plain claim, no adjectives about ourselves.
    footerBlurb:
      'A pathway finder for Malaysian SPM leavers, matched against what real students actually chose.',
    footerNav: {
      explore: 'Explore',
      contribute: 'Contribute',
      account: 'Account',
      privacy: 'Privacy',
    },
    // Provenance line: "Trained on 207 real SPM leavers · model 2026-07-28".
    trainedOn: 'Trained on 207 real SPM leavers',
    model: 'model',
    admin: 'Admin',
  },

  // Messages the API itself returns. The quiz UI shows its own copy on
  // failure, but anything a response body says must still be calm, plain
  // and free of internals — these are the only strings the route handler
  // is allowed to put in an error response.
  api: {
    authRequired: 'Sign in to submit the quiz.',
    invalidRequest:
      'That submission wasn’t in the shape we expected. Refresh the quiz and try again.',
    invalidAnswers:
      'Some answers were missing or not recognised. Go back and check these questions.',
    predictionUnavailable:
      'We couldn’t match you against the alumni just now. Your answers are safe — try again in a moment.',
    serverError: 'Something went wrong on our side, not yours. Please try again.',
    // /contribute (Plan 4, Task 4).
    contributeAuthRequired: 'Sign in to contribute your answers.',
    contributeInvalidRequest:
      'That submission wasn’t in the shape we expected. Refresh the page and try again.',
    contributeInvalidAnswers:
      'A few answers need a second look before we can save this.',
  },

  // The public landing page (Plan 4, Task 1) — the first thing a student
  // sees and the page the client screenshots for their own pitch. Every
  // figure here is real, taken from the 207-response 2025 survey
  // (docs/PROJECT-RECORD.md §4-5) — never rounded differently, never
  // invented, and the two accuracy paths in `proof` are always shown
  // together so nobody quotes only the flattering one.
  landing: {
    metaTitle: 'ARAH — Find the course that actually fits',
    metaDescription:
      'Matched against 207 real Malaysian SPM leavers — not guesswork. Answer ten questions, see where students like you actually went.',
    hero: {
      kicker: '207 students before you',
      title: 'Find the course that actually fits.',
      body: 'Matched against real outcomes from the students who took this quiz before you — not guesswork.',
      cta: 'Start the quiz',
    },
    finding: {
      kicker: 'the strongest signal in the data',
      title: 'Why you chose it matters more than what you chose.',
      body: 'Across 207 alumni, the single biggest predictor of regret wasn’t grades, prestige or salary — it was whether the choice was actually theirs.',
      passionLabel: 'Chose on personal interest',
      familyLabel: 'Chose for family expectation',
      satisfactionCaption: 'Average satisfaction, out of 5',
      dissatisfiedLead: 'dissatisfied',
      lessRegretLead: '11×',
      lessRegretTail: 'less regret',
      lessRegretBody:
        'Students who followed their own interest ended up dissatisfied 5% of the time. Students who chose to meet family expectations: 57%.',
      chartCaption: 'Average satisfaction out of 5, by reason for choosing (n = 120 vs n = 83).',
      chartLoading: 'Loading chart…',
    },
    how: {
      kicker: 'how it works',
      title: 'Four steps, about three minutes.',
      steps: [
        {
          n: '01',
          title: 'Answer ten questions',
          body: 'About your interests, strengths and what you actually enjoy doing — not a personality quiz.',
        },
        {
          n: '02',
          title: 'Matched against 207 real alumni',
          body: 'Your answers are compared against Malaysian SPM leavers who already made this choice and told us how it went.',
        },
        {
          n: '03',
          title: 'Ranked fields with confidence',
          body: 'See your top matches, how confident each one is, and exactly how many students it is based on.',
        },
        {
          n: '04',
          title: 'Explore what they chose and why',
          body: 'Read what real students in each field chose, and the advice they left for someone exactly where you are now.',
        },
      ],
    },
    proof: {
      kicker: 'how accurate is this, really',
      title: 'Both numbers, not just the flattering one.',
      body: 'Top-3 accuracy — whether a student’s actual field ended up in their top three matches — measured across all 207 alumni.',
      withRoute: { label: 'With a stated pre-U route', value: '69.1%' },
      withoutRoute: { label: 'Without one yet', value: '62.8%' },
      baseline: { label: 'Naive baseline — most popular field', value: '49.3%' },
      n: 'n = 207',
    },
    cta: {
      title: 'See where you actually fit.',
      body: 'Free, and takes about three minutes.',
      button: 'Start the quiz',
    },
  },
};

export default en;
