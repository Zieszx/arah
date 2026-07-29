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
};

export default en;
