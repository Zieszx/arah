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
    passwordShow: 'Show password',
    passwordHide: 'Hide password',
    login: {
      metaTitle: 'Sign in — ARAH',
      metaDescription: 'Sign back in to pick up your answers and results.',
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
        'Create an account to answer the questions and keep your results.',
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

  // The `quiz` key stays (code stability — renaming it would touch ~20
  // files for no user-visible benefit); every VALUE below is the public
  // "Questions" wording per docs/design/light-theme-conversion.md §7.
  quiz: {
    metaTitle: 'Questions — ARAH',
    metaDescription:
      'Ten questions, matched against 207 real alumni outcomes. About three minutes.',
    // Section kickers — the quiz reads as a conversation in three parts,
    // not a form. Which part a question belongs to is decided by key in
    // lib/quiz/useQuizState.js; the copy lives here.
    sections: {
      about: 'About you',
      like: 'What you like',
      heading: 'Where you’re heading',
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
    // "Between 20 and 49 of the 207 students that are most similar to you
    // studied this." — the single most important sentence on the page.
    // Composed around the two counts at the call site: the count comes from
    // formatSampleSizeInSentence (which spells a band out in words, because
    // "20–49 of the 207" reads as a subtraction), the total from
    // lib/results/cohort.js.
    explainOf: 'of the',
    explainTail: 'students that are most similar to you studied this.',
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

  privacy: {
    metaTitle: 'Privacy — ARAH',
    metaDescription:
      'Exactly what ARAH stores, who can see it, and how to delete it.',
    kicker: 'Privacy',
    title: 'What we do with your answers.',
    intro:
      'Written plainly, because a policy nobody can read is not consent. Everything below describes what the system actually does — if you find a difference between this page and the product, the product is the bug.',
    updated: 'Last updated 30 July 2026',
    sections: [
      {
        heading: 'What we store',
        body: 'Three things. Your answers to the ten questions. The ranked result the model returned for them. And your account — an email address, and a display name if you set one. That is the whole list.',
      },
      {
        heading: 'Your email is only a way to sign in',
        body: 'Nothing is ever sent to it. There is no newsletter, no confirmation mail, no reminders — the system has no mailing function at all. It does not need to be an address you check, and you can change it from your account page at any time.',
      },
      {
        heading: 'Who can see your answers',
        body: 'You can. An administrator can, for support — the same person who runs the site. Nobody else. Your rows are locked to your account at the database level, not merely hidden in the interface, so another student cannot reach them even if something in the app were to go wrong.',
      },
      {
        heading: 'We do not sell it, and universities do not get it',
        body: 'Your answers are not shared with universities, colleges, recruiters, advertisers or anyone else, and they are not for sale. There is no export button in the admin console for exactly this reason.',
      },
      {
        heading: 'What the public pages show',
        body: 'The numbers on the explore pages are group totals from the 207 alumni who filled in the original survey — never from students using the site today. A field with fewer than ten students shows no statistics at all, sample sizes appear as ranges rather than exact counts, and published figures only move once several rows have changed. Those three rules exist together so that no single person can be identified by comparing one page against another.',
      },
      {
        heading: 'Free-text advice',
        body: 'The advice quotes shown around the site come from the original survey and are never attached to a field of study, a year, or anything else that could narrow down who wrote them. They appear as words alone.',
      },
      {
        heading: 'Deleting everything',
        body: 'The delete control on your account page removes your answers, your results and your account. It is immediate and it is not recoverable — we keep no shadow copy.',
      },
      {
        heading: 'Your password',
        body: 'Stored only as a salted hash. It cannot be shown to anyone, including an administrator, because it is not recoverable by anyone. You can change it from your account page using your current password. There is no reset-by-email link — the system sends no email — so keep it somewhere you can find it.',
      },
      {
        heading: 'Where the alumni data came from',
        body: 'The 207 records the model learns from were collected through a voluntary survey of Malaysian SPM leavers who agreed to share what they chose and how it went. No names, no identification numbers, no contact details were collected.',
      },
    ],
    contactHeading: 'Questions',
    contactBody:
      'If something here is unclear, or you want your data removed and cannot reach the delete control, contact whoever gave you this link.',
  },

  account: {
    metaTitle: 'Your account — ARAH',
    metaDescription: 'Your past answers and results, and account controls.',
    kicker: 'Your account',
    title: 'Your answers.',
    signedInAs: 'Signed in as',
    settings: {
      heading: 'Account settings',
      nameTitle: 'Display name',
      nameBody: 'What you are called on this account. Optional — leave it blank and nothing is shown.',
      nameLabel: 'Display name',
      namePlaceholder: 'Not set',
      emailTitle: 'Email address',
      emailBody:
        'Your email is only how you sign in. We never send anything to it, so it does not need to be an address you check.',
      emailLabel: 'Email',
      saveEmail: 'Change email',
      passwordTitle: 'Password',
      passwordBody:
        'You will need your current password to set a new one. There is no reset-by-email link, because this system does not send email at all — so keep this password somewhere you can find it.',
      currentPasswordLabel: 'Current password',
      currentPasswordHint: 'Confirms it is really you making this change.',
      newPasswordLabel: 'New password',
      newPasswordHint: 'At least 8 characters.',
      confirmPasswordLabel: 'Confirm new password',
      savePassword: 'Change password',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Saved.',
      errors: {
        signedOut: 'Your session has expired. Sign in again and retry.',
        nameTooLong: 'That display name is too long — 80 characters at most.',
        emailRequired: 'Enter an email address.',
        emailInvalid: "That doesn't look like an email address. Check for typos.",
        emailUnchanged: 'That is already your email address.',
        emailTaken: 'Another account already uses that email address.',
        currentPasswordRequired: 'Enter your current password to confirm this change.',
        currentPasswordWrong: "That current password doesn't match. Check it and try again.",
        passwordRequired: 'Enter a new password.',
        passwordTooShort: 'Your new password needs at least 8 characters.',
        passwordUnchanged: 'That is already your password. Choose a different one.',
        weakPassword:
          'That password is too easy to guess. Make it longer or mix in some numbers.',
        confirmMismatch: "These two passwords don't match. Try typing them again.",
        invalid: 'That request wasn’t in the shape we expected.',
        generic: 'Something went wrong on our side, not yours. Please try again.',
      },
    },
    // Empty state — a student with no quiz history yet.
    empty: {
      title: 'Nothing here yet.',
      body: 'Answer the questions and your matches will show up on this page, so you can find them again later.',
      cta: 'Answer the questions',
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
        'This permanently removes every set of answers you’ve submitted, every result, and your account itself. There is no way to undo this. Type DELETE to confirm.',
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
    ctaButton: 'Answer the questions',
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


  // Global chrome — the site header and footer on every page.
  // Announced politely by the route-level loading fallbacks. A sighted user
  // sees the skeleton; without these a screen-reader user meets silence.
  loading: {
    page: 'Loading page…',
    explore: 'Loading fields…',
    field: 'Loading this field…',
    results: 'Loading your matches…',
    questions: 'Loading the questions…',
    account: 'Loading your account…',
    admin: 'Loading…',
  },

  chrome: {
    nav: {
      questions: 'Questions',
      explore: 'Explore',
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
    authRequired: 'Sign in to submit your answers.',
    invalidRequest:
      'That submission wasn’t in the shape we expected. Refresh the page and try again.',
    invalidAnswers:
      'Some answers were missing or not recognised. Go back and check these questions.',
    predictionUnavailable:
      'We couldn’t match you against the alumni just now. Your answers are safe — try again in a moment.',
    serverError: 'Something went wrong on our side, not yours. Please try again.',
    admin: {
      authRequired: 'Sign in to do that.',
      forbidden: 'You don’t have access to do that.',
      invalidRequest: 'That request wasn’t in the shape we expected.',
      notPending: 'This submission was already reviewed by someone else, or no longer exists.',
    },
  },

  // The public landing page (Plan 4, Task 1) — the first thing a student
  // sees and the page the client screenshots for their own pitch. Every
  // figure here is real, taken from the 207-response 2025 survey
  // (docs/PROJECT-RECORD.md §4-5) — never rounded differently, never
  // invented. The `proof` section, which published both top-3 accuracy
  // figures side by side, was removed at the client's request.
  landing: {
    metaTitle: 'ARAH — Find the course that actually fits',
    metaDescription:
      'Matched against 207 real Malaysian SPM leavers — not guesswork. Answer ten questions, see where students like you actually went.',
    hero: {
      kicker: '207 students before you',
      title: 'Find the course that actually fits.',
      body: 'Matched against real outcomes from the students who answered these questions before you — not guesswork.',
      cta: 'Answer the questions',
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
          body: 'About your interests, strengths and what you actually enjoy doing — not a personality test.',
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
    cta: {
      title: 'See where you actually fit.',
      body: 'Free, and takes about three minutes.',
      button: 'Answer the questions',
    },
  },

  // Plan 5 — the admin console. Internal-only (requireAdmin() gates every
  // route under app/(admin)), but the client demos this screen directly,
  // so the same honesty rules as the public pages apply: both accuracy
  // figures shown with equal weight, every empty state explained rather
  // than left as a bare zero, and no field-level number ever exposed
  // through this UI to anyone who isn't already an admin.
  admin: {
    breadcrumbRoot: 'Admin',
    backToSite: 'Back to student site',
    signOut: 'Sign out',
    menuOpen: 'Open admin menu',
    menuClose: 'Close admin menu',
    menuLabel: 'Admin navigation',
    signedInAs: 'Signed in as',
    nav: {
      groupDashboard: 'Dashboard',
      groupData: 'Data',
      groupModel: 'Model',
      overview: 'Overview',
      responseCharts: 'Response Charts',
      surveyData: 'Survey Data',
      studentResponses: 'Student Responses',
      users: 'People',
      algorithmTester: 'Algorithm Tester',
      sectionLabel: 'Admin console',
    },
    overview: {
      metaTitle: 'Overview — Admin — ARAH',
      kicker: 'admin · overview',
      title: 'The whole dataset, at a glance.',
      body: 'Live counts from the database, straight from the tables the rest of the console reads.',
      stats: {
        totalAlumni: {
          label: 'Total alumni',
          caption: 'Verified survey rows the model is trained and matched against.',
        },
        studentsRegistered: {
          label: 'Students registered',
          caption: 'Accounts created on the site, whether or not they’ve answered yet.',
          zeroHint: 'No accounts yet. Every sign-up on /signup adds one here immediately.',
        },
        questionsCompleted: {
          label: 'Questions completed',
          caption: 'Full ten-question submissions, one per attempt.',
          zeroHint: 'No completed submissions yet. This counts every finished run through /questions, including repeats.',
        },
        predictionsIssued: {
          label: 'Predictions issued',
          caption: 'Matches the model has actually returned to a student.',
          zeroHint: 'No predictions yet. One lands here every time /questions finishes matching a student against the alumni data.',
        },
      },
      chart: {
        kicker: 'field distribution',
        title: 'Verified alumni by field of study',
        caption: 'Exact counts across all verified rows — not the banded, refresh-gated figures the public /explore pages show.',
        emptyTitle: 'No verified alumni rows yet.',
        emptyBody: 'This chart fills in once alumni_profiles has verified rows.',
        loading: 'Loading chart…',
      },
    },
    users: {
      metaTitle: 'People — Admin — ARAH',
      kicker: 'admin · people',
      title: 'Everyone with an account.',
      body: 'Students who have signed up, and whoever has admin access. Edit a display name or grant access from here.',
      passwordNotice:
        'Passwords are stored hashed and cannot be shown here, or anywhere else — not even to an admin. Someone who is signed in can change their own password and email under Account settings, using their current password. There is no reset-by-email link, because this system sends no email.',
      noName: 'No display name set',
      roleAdmin: 'Admin',
      roleStudent: 'Student',
      unconfirmed: 'Unconfirmed email',
      expand: 'Edit',
      collapse: 'Close',
      factJoined: 'Joined',
      factLastSeen: 'Last signed in',
      factSubmissions: 'Submissions',
      factConfirmed: 'Email confirmed',
      yes: 'Yes',
      no: 'No',
      displayNameLabel: 'Display name',
      displayNamePlaceholder: 'Not set',
      isAdminLabel: 'Has admin access',
      selfDemoteHint:
        'You cannot remove your own admin access — that would lock you out with no way back through the interface.',
      lastAdminHint:
        'This is the only admin account. Removing its access would lock everyone out and need a database console to undo.',
      save: 'Save changes',
      saving: 'Saving…',
      saved: 'Saved.',
      emptyTitle: 'No accounts yet.',
      emptyBody: 'Everyone who signs up on the site appears here immediately.',
      loadError: 'Couldn’t load the account list just now.',
      loadErrorHint: 'Refresh to retry.',
      errors: {
        invalid: 'That request wasn’t in the shape we expected.',
        missing: 'That account no longer exists.',
        self_demote: 'You cannot remove your own admin access.',
        last_admin: 'This is the only admin account — its access cannot be removed.',
        failed: 'Couldn’t save that just now. Try again.',
      },
    },
    responseCharts: {
      metaTitle: 'Response Charts — Admin — ARAH',
      kicker: 'admin · response charts',
      title: 'Every question, summarised.',
      body: 'The same view a Google Form gives you — one distribution per question, across whichever set of responses you pick. Exact counts, because this is the internal console; the public pages band and suppress these same figures.',
      sourceLabel: 'Responses to summarise',
      sourceAlumni: 'Alumni survey',
      sourceStudents: 'Student submissions',
      alumniCaption:
        'The verified survey rows the model is trained on — alumni reporting what they actually chose and how it went.',
      studentsCaption:
        'What current students have answered on the questions page. The same ten questions, but these describe where someone is now, not an outcome.',
      respondent: 'respondent',
      respondents: 'respondents',
      multiNote: 'multiple answers allowed, so bars total more than the respondent count',
      skipped: 'skipped',
      noAnswers: 'No one has answered this question yet.',
      chartLoading: 'Loading chart',
      emptyTitle: 'No responses to summarise yet.',
      emptyBody:
        'Charts appear as soon as there are responses. Student submissions land here the moment someone finishes the questions.',
      loadError: 'Couldn’t load the response summary just now.',
      loadErrorHint: 'Refresh to retry.',
    },
    pagination: {
      label: 'Pagination',
      previous: 'Previous page',
      next: 'Next page',
      page: 'Page',
      showing: 'Showing',
      of: 'of',
      perPage: 'Per page',
      empty: 'Nothing to show.',
    },
    surveyData: {
      metaTitle: 'Survey Data — Admin — ARAH',
      kicker: 'admin · survey data',
      // Deliberately not "All 207 rows" any more: the table is paginated and
      // searchable, so a hardcoded total would be wrong on every filtered
      // view. The count line under the search box carries the real number.
      title: 'Every verified alumni row.',
      body: 'The underlying survey the model is trained and matched against — searchable and sortable by field of study, stream, results band, pre-U route and satisfaction.',
      notice: 'These are real students’ words. Do not republish them attributed.',
      searchLabel: 'Search survey rows',
      searchPlaceholder: 'Search field, stream, pre-U route, advice…',
      countShowing: 'Showing',
      countOf: 'of',
      countRows: 'rows',
      countMatching: 'matching',
      emptySearchTitle: 'No rows match that search.',
      emptySearchBody: 'Try a different field, stream, or pre-U route — or clear the search to see all 207 again.',
      clearSearch: 'Clear search',
      columns: {
        field: 'Field of study',
        stream: 'Stream',
        results: 'Results band',
        preu: 'Pre-U route',
        satisfaction: 'Satisfaction',
        advice: 'Advice',
      },
      noAdvice: '—',
    },
    responses: {
      metaTitle: 'Student Responses — Admin — ARAH',
      kicker: 'admin · student responses',
      title: 'Every questions submission, with what the model returned.',
      body: 'When a student finished the questions, whether the result was marginalised (no pre-U route yet), and the field the model ranked first. Personal data, shown here for support — never exported.',
      columns: {
        submitted: 'Submitted',
        student: 'Student',
        marginalised: 'Marginalised',
        topField: 'Top predicted field',
      },
      marginalisedYes: 'Marginalised',
      marginalisedNo: 'Complete',
      unnamedStudent: 'Unnamed student',
      noPrediction: 'No prediction recorded',
      emptyAllTitle: 'No submissions yet.',
      emptyAllBody: 'This fills in the moment a student finishes the ten questions on /questions.',
      detail: {
        metaTitle: 'Submission — Admin — ARAH',
        back: 'Back to all responses',
        notFoundTitle: 'Submission not found.',
        notFoundBody: 'It may have been deleted, or the link is wrong.',
        answersKicker: 'the ten answers',
        answersTitle: 'What they answered',
        predictionKicker: 'the ranked prediction',
        predictionTitle: 'What the model returned',
        noPredictionBody: 'The questions were answered, but no prediction was ever stored for this submission — the model call may have failed at the time.',
        marginalisedNotice: 'This result was marginalised — the student had not settled on a pre-U route yet.',
      },
    },
    algorithmTester: {
      metaTitle: 'Algorithm Tester — Admin — ARAH',
      kicker: 'admin · algorithm tester',
      title: 'Run the model directly.',
      body: 'Every question from the live spec, posted straight to the ML service — the same call /questions makes. Nothing here is stored.',
      presetsKicker: 'demo presets',
      presetTechnical: 'Technical stream (expect: Computer Science, Software & Data)',
      presetArts: 'Arts stream (expect: Creative Art)',
      resetLabel: 'Clear answers',
      submitLabel: 'Run prediction',
      submitting: 'Running…',
      resultKicker: 'raw model output',
      resultTitle: 'Ranked fields',
      modelVersion: 'Model version',
      marginalisedYes: 'Marginalised — averaged across pre-U routes',
      marginalisedNo: 'Not marginalised',
      emptyResultTitle: 'No prediction yet.',
      emptyResultBody: 'Answer the ten questions (or load a preset) and run the prediction to see the raw ranked output.',
      errorTitle: 'The model call failed.',
      errorBody: 'Check the ML service is reachable and try again.',
      diffKicker: 'what changed',
      diffTitle: 'How the ranking moved',
      diffIntro: 'Compared against the previous run on this screen.',
      diffChangedAnswers: 'Answers changed',
      diffNoChange: 'No answers changed since the last run — re-running the same input.',
      diffRankUp: 'up',
      diffRankDown: 'down',
      diffRankSame: 'unchanged',
      diffNewField: 'new to top 10',
      diffTopChanged: 'Top pick changed',
      diffTopSame: 'Top pick unchanged',
      validationError: 'Answer every required question before running the prediction.',
    },
  },
};

export default en;
