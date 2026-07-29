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
  },

  quiz: {
    metaTitle: 'The quiz — ARAH',
    metaDescription:
      'Ten questions, matched against 207 real alumni outcomes. About ten minutes.',
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

  // Global chrome — the site header and footer on every page.
  chrome: {
    nav: {
      quiz: 'Quiz',
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
  },
};

export default en;
