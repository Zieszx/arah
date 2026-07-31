// ARAH — technical system deck.
// Palette and type come from the product itself: violet leads, cyan supports,
// near-white paper, serif display over sans body.
//
// Structure follows the academic order the brief asks for — introduction,
// framework and data, descriptive analysis, predictive analysis, findings,
// future work — with the engineering slides kept where they explain how a
// figure was produced.
//
// Two inputs are generated, not typed:
//   decks/descriptive-stats.json   python decks/describe_corpus.py
//   decks/assets/*.crop.png        python decks/crop_shots.py
const path = require('path');
const pptxgen = require('pptxgenjs');
const stats = require('./descriptive-stats.json');

const INK = '1B1830';
const VIOLET = '6D28D9';
const VIOLET_LT = '8B5CF6';
const VIOLET_PALE = 'EFEAFB';
const CYAN = '0E7490';
const CYAN_LT = '3A93A8';
const GREEN = '1F7A5A';
const AMBER = '9A5B12';
const PAPER = 'FAFAFC';
const WHITE = 'FFFFFF';
const TEXT = '1F1B2E';
const MUTED = '625D78';
const FAINT = '9A93AE';
const HAIR = 'E3E0EC';
const ON_DARK = 'CFC9E6';

const DISPLAY = 'Georgia';
const BODY = 'Calibri';
const MONO = 'Consolas';

// PowerPoint draws a dark hairline for a zero-width outline; 'none' is the
// only spelling that actually removes it. Every flat fill in this deck uses it.
const NO_LINE = { type: 'none' };

const W = 13.333;
const H = 7.5;
const M = 0.85;
const CW = W - M * 2;
const GAP = 0.31;
// Half the content width. Two columns at a hand-picked 6.06 ran to within a
// twentieth of an inch of the right edge against a 0.85" left margin, which
// reads as a mistake at full screen; deriving it keeps both margins equal.
const HALF = (CW - GAP) / 2;

// The sections the nav strip lists. Every content slide names the one it
// belongs to, and the strip bolds it — the same orientation cue the reference
// deck uses, so a reader always knows where they are in the argument.
const SECTIONS = [
  'Introduction',
  'Framework & data',
  'Architecture',
  'Descriptive analysis',
  'Predictive analysis',
  'Privacy',
  'Admin',
  'Findings',
  'Future work',
];

const shot = (name) => path.join(__dirname, 'assets', name);

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'ARAH';
pres.title = 'ARAH - System and Technical Overview';

const shadow = () => ({
  type: 'outer', color: '000000', blur: 10, offset: 2, angle: 135, opacity: 0.08,
});

function nav(s, active, dark = false) {
  const runs = [];
  SECTIONS.forEach((name, i) => {
    if (i) {
      runs.push({
        text: '  ·  ',
        options: { fontFace: BODY, fontSize: 8.5, color: dark ? '4A4270' : HAIR },
      });
    }
    const on = name === active;
    runs.push({
      text: name,
      options: {
        fontFace: BODY,
        fontSize: 8.5,
        bold: on,
        color: on ? (dark ? WHITE : VIOLET) : (dark ? '6F679B' : FAINT),
        charSpacing: 0.4,
      },
    });
  });
  s.addText(runs, {
    x: M, y: 0.26, w: CW, h: 0.24, margin: 0, valign: 'middle',
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: M, y: 0.56, w: CW, h: 0.012,
    fill: { color: dark ? '35305C' : HAIR }, line: NO_LINE,
  });
}

function slide(section, kicker, title, opts = {}) {
  const s = pres.addSlide();
  s.background = { color: opts.bg || PAPER };
  nav(s, section);
  s.addShape(pres.shapes.RECTANGLE, {
    x: M, y: 0.79, w: 0.11, h: 0.11, fill: { color: VIOLET }, line: NO_LINE,
  });
  s.addText(kicker.toUpperCase(), {
    x: M + 0.26, y: 0.69, w: CW - 0.26, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 10.5, bold: true, color: VIOLET, charSpacing: 3,
    valign: 'middle',
  });
  s.addText(title, {
    x: M, y: 1.06, w: opts.titleW || CW, h: opts.titleH || 0.62, margin: 0,
    fontFace: DISPLAY, fontSize: opts.titleSize || 32, color: TEXT, valign: 'top',
    lineSpacing: opts.titleSize ? opts.titleSize * 1.22 : 39,
  });
  return s;
}

function card(s, { x, y, w, h, fill = WHITE, accent = null }) {
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: fill },
    line: { color: HAIR, width: 0.75 },
    shadow: shadow(),
  });
  if (accent) {
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.055, h, fill: { color: accent }, line: NO_LINE,
    });
  }
}

// Head-and-body card, the shape most of this deck is made of. headH is worth
// setting whenever a heading wraps — the body starts below it, so leaving it at
// one line is what puts a second line of heading through the first line of body.
function panel(s, { x, y, w, h, accent, head, body, headSize = 16, bodySize = 11.5, headH = 0.32 }) {
  card(s, { x, y, w, h, accent });
  s.addText(head, {
    x: x + 0.3, y: y + 0.15, w: w - 0.6, h: headH, margin: 0,
    fontFace: DISPLAY, fontSize: headSize, color: TEXT, lineSpacing: headSize * 1.2,
  });
  s.addText(body, {
    x: x + 0.3, y: y + 0.2 + headH, w: w - 0.6, h: h - 0.34 - headH, margin: 0,
    fontFace: BODY, fontSize: bodySize, color: MUTED, lineSpacing: bodySize * 1.3,
  });
}

function note(s, text) {
  s.addText(text, {
    x: M, y: H - 0.78, w: CW, h: 0.36, margin: 0,
    fontFace: BODY, fontSize: 10.5, color: MUTED, valign: 'middle',
  });
}

// A screenshot plus the URL it was taken from. The caption matters: a reader
// should be able to open the same page and see the same thing.
function screenshot(s, { file, x, y, w, ratio, caption }) {
  const h = w / ratio;
  s.addImage({ path: shot(file), x, y, w, h });
  if (caption) {
    s.addText(caption, {
      x, y: y + h + 0.07, w, h: 0.24, margin: 0,
      fontFace: MONO, fontSize: 9, color: FAINT,
    });
  }
  return y + h + (caption ? 0.31 : 0);
}

const shortSat = stats.satisfactionByField;
const byCount = stats.fields;
const suppressed = byCount.filter((f) => f.suppressed);
const related = stats.relatedness.find((r) => r.related === 'Yes');
const unrelated = stats.relatedness.find((r) => r.related === 'No');
const best = shortSat[0];
const worst = shortSat[shortSat.length - 1];

/* ── 1. Title ── */
{
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.14, h: H, fill: { color: VIOLET }, line: NO_LINE });
  nav(s, null, true);
  s.addText('A R A H', {
    x: M, y: 1.55, w: CW, h: 0.45, margin: 0,
    fontFace: DISPLAY, fontSize: 20, color: WHITE, charSpacing: 12,
  });
  s.addText('Built for students who have to\nchoose, with no way to compare.', {
    x: M, y: 2.2, w: 10.5, h: 1.8, margin: 0,
    fontFace: DISPLAY, fontSize: 38, color: WHITE, lineSpacing: 48,
  });
  s.addText('System and technical overview — framework, data, descriptive and predictive analysis', {
    x: M, y: 4.2, w: 10.5, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 15, color: ON_DARK,
  });
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 4.9, w: 4.2, h: 0.02, fill: { color: VIOLET_LT }, line: NO_LINE });
  s.addText('Next.js 16  ·  React 19  ·  Python 3.13  ·  scikit-learn  ·  Supabase Postgres  ·  Vercel', {
    x: M, y: 5.17, w: 11.2, h: 0.32, margin: 0,
    fontFace: MONO, fontSize: 11.5, color: '9A93BE',
  });
  s.addText('arah-sand.vercel.app', {
    x: M, y: 5.55, w: 11.2, h: 0.32, margin: 0,
    fontFace: MONO, fontSize: 12, color: VIOLET_LT,
  });
}

/* ── 2. Introduction ── */
{
  const s = slide('Introduction', 'Introduction', 'What it is, and what it is for.');

  panel(s, {
    x: M, y: 1.92, w: 5.3, h: 1.5, accent: VIOLET,
    head: 'The problem',
    body: 'A Malaysian student leaving SPM picks a field with almost nothing to compare against — a prospectus, a family opinion, and whatever their friends are doing. Nobody tells them what students like them actually went on to do, or whether they were glad of it.',
    bodySize: 11,
  });
  panel(s, {
    x: M, y: 3.55, w: 5.3, h: 1.5, accent: CYAN,
    head: 'What ARAH is',
    body: 'A pathway finder. Ten questions, matched against 207 real SPM leavers who already made the choice — returning the fields students with similar answers entered, the sample behind each, and how satisfied those students were.',
    bodySize: 11,
  });
  panel(s, {
    x: M, y: 5.18, w: 5.3, h: 1.4, accent: VIOLET_LT,
    head: 'Objectives',
    headSize: 15,
    body: '1.  Turn real outcomes into a comparison a student can act on.\n2.  Rank fields by evidence, and show the sample behind each.\n3.  Publish the uncertainty, and nothing where the data is thin.\n4.  Protect the 207 teenagers whose answers make it work.',
    bodySize: 10,
  });

  screenshot(s, {
    file: '01-landing.crop.png', x: M + 5.63, y: 1.92, w: 6.0, ratio: 1280 / 760,
    caption: 'arah-sand.vercel.app',
  });

  note(s, 'About three minutes end to end. Browsing needs no account; saving a result does.');
}

/* ── 3. The student journey ── */
{
  const s = slide('Introduction', 'How a student uses it', 'Four steps, about three minutes.');
  const steps = [
    ['01', 'Answer', 'Ten questions about results, subjects, interests, and how they like to work.', VIOLET],
    ['02', 'Match', 'Compared against 207 real Malaysian SPM leavers who already made the choice.', VIOLET_LT],
    ['03', 'Rank', 'Fields ordered by fit, each with a confidence level and the sample it rests on.', CYAN],
    ['04', 'Explore', 'What those students chose, how satisfied they were, and the advice they left.', CYAN_LT],
  ];
  const cw = 2.68, gap = 0.24;
  steps.forEach(([n, head, body, colour], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * (cw + gap);
    const y = 1.95 + row * 2.05;
    card(s, { x, y, w: cw, h: 1.86, accent: colour });
    s.addText(n, { x: x + 0.3, y: y + 0.16, w: 1, h: 0.3, margin: 0, fontFace: MONO, fontSize: 12.5, bold: true, color: colour });
    s.addText(head, { x: x + 0.3, y: y + 0.5, w: cw - 0.6, h: 0.34, margin: 0, fontFace: DISPLAY, fontSize: 18, color: TEXT });
    s.addText(body, { x: x + 0.3, y: y + 0.92, w: cw - 0.6, h: 0.82, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 15 });
  });

  screenshot(s, {
    file: '04-results-top.crop.png', x: M + 6.05, y: 1.95, w: 5.58, ratio: 930 / 670,
    caption: 'A stored result — /results/<id>, never recomputed',
  });

  note(s, 'The result is written once and read back. A student returning to the same link sees the same three fields, not a fresh roll of the model.');
}

/* ── 4. CRISP-DM and the data ── */
{
  const s = slide('Framework & data', 'CRISP-DM framework and data overview', 'A standard method, applied to one survey.');

  const phases = [
    ['Business understanding', 'What a student actually needs at the point of choosing — a comparison, not advice.', VIOLET],
    ['Data understanding', 'One survey of 207 SPM leavers: ten answers each, the field they entered, and how satisfied they are.', VIOLET],
    ['Data preparation', 'Cleaning, then a 55-slot one-hot encoding. One encoder in Python, a mirror in JavaScript, pinned by fixture tests.', VIOLET_LT],
    ['Modelling', 'Four scikit-learn classifiers — KNN, logistic regression, random forest, Bernoulli naive Bayes — combined by soft voting.', CYAN],
    ['Evaluation', 'Top-3 accuracy under repeated stratified cross-validation: five folds, five repeats. Never a single split.', CYAN_LT],
    ['Deployment', 'Shipped as a Python service on Vercel behind the Next.js app, with the artefacts committed alongside the code.', GREEN],
  ];
  let y = 1.92;
  phases.forEach(([head, body, colour], i) => {
    card(s, { x: M, y, w: 6.15, h: 0.72, accent: colour });
    s.addText(`${i + 1}`, {
      x: M + 0.22, y, w: 0.3, h: 0.72, margin: 0,
      fontFace: MONO, fontSize: 11, bold: true, color: colour, valign: 'middle',
    });
    s.addText(head, {
      x: M + 0.6, y: y + 0.09, w: 2.05, h: 0.55, margin: 0,
      fontFace: DISPLAY, fontSize: 13, color: TEXT, valign: 'middle', lineSpacing: 15,
    });
    s.addText(body, {
      x: M + 2.72, y, w: 3.32, h: 0.72, margin: 0,
      fontFace: BODY, fontSize: 9.5, color: MUTED, valign: 'middle', lineSpacing: 12,
    });
    y += 0.78;
  });

  const rx = M + 6.5;
  const rw = CW - 6.5;
  card(s, { x: rx, y: 1.92, w: rw, h: 1.4, fill: VIOLET_PALE });
  s.addText('The data', {
    x: rx + 0.3, y: 2.02, w: rw - 0.6, h: 0.3, margin: 0,
    fontFace: DISPLAY, fontSize: 16, color: TEXT,
  });
  s.addText('207 responses · 10 fields of study · 5 pre-U routes · satisfaction 1–5 · free-text advice. One Google Forms export, no third-party dataset. National MoHE enrolment figures are cited as context and never used as training rows.', {
    x: rx + 0.3, y: 2.37, w: rw - 0.6, h: 0.88, margin: 0,
    fontFace: BODY, fontSize: 11, color: MUTED, lineSpacing: 14.5,
  });

  screenshot(s, {
    file: '13-admin-survey-data.crop.png', x: rx + 0.46, y: 3.44, w: 4.2, ratio: 1150 / 800,
    caption: '/admin/survey-data — the corpus the model reads',
  });

  note(s, 'ml/train.py reads ml/data/survey.csv and nothing else. Every descriptive figure in the next three slides comes from decks/describe_corpus.py, reading that same file.');
}

/* ── 5. Tools and techniques ── */
{
  const s = slide('Framework & data', 'Tools and techniques used', 'What it is built from.');
  const rows = [
    ['Language', 'JavaScript (JSX) · Python 3.13 · SQL', 'No TypeScript, by request — JSX throughout.'],
    ['Framework', 'Next.js 16.2 App Router · React 19.2', 'Server Components by default; client code only where the browser is needed.'],
    ['Styling', 'Tailwind CSS v4 · shadcn/ui · Radix · PrimeReact', 'CSS-first @theme configuration — v4 has no tailwind.config.js.'],
    ['Motion', 'GSAP · Motion · Lenis · custom canvas', 'Every animation gated on prefers-reduced-motion.'],
    ['Machine learning', 'scikit-learn · NumPy · pandas · Joblib', 'pandas is training-only and deliberately absent from the deployed service.'],
    ['Data', 'Supabase Postgres · Row Level Security', 'Access rules live in the database, not only in application code.'],
    ['Charts', 'Recharts', 'The same component set on public pages and in the admin console.'],
    ['Quality', 'Vitest · pytest · ESLint · Playwright', '372 JavaScript tests and 36 Python tests; 13 of them need production credentials.'],
  ];
  let y = 1.92;
  rows.forEach(([label, tech, why], i) => {
    if (i % 2 === 0) {
      s.addShape(pres.shapes.RECTANGLE, { x: M, y, w: CW, h: 0.545, fill: { color: WHITE }, line: NO_LINE });
    }
    s.addText(label, { x: M + 0.22, y, w: 2.1, h: 0.545, margin: 0, fontFace: BODY, fontSize: 12, bold: true, color: VIOLET, valign: 'middle' });
    s.addText(tech, { x: M + 2.45, y, w: 4.5, h: 0.545, margin: 0, fontFace: MONO, fontSize: 10.5, color: TEXT, valign: 'middle' });
    s.addText(why, { x: M + 7.15, y, w: CW - 7.35, h: 0.52, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, valign: 'middle' });
    y += 0.52;
  });

  y += 0.14;
  s.addShape(pres.shapes.RECTANGLE, { x: M, y, w: CW, h: 1.1, fill: { color: VIOLET_PALE }, line: { color: HAIR, width: 0.75 } });
  s.addText('Techniques', {
    x: M + 0.32, y: y + 0.12, w: CW - 0.64, h: 0.28, margin: 0,
    fontFace: DISPLAY, fontSize: 15, color: TEXT,
  });
  s.addText('Descriptive statistics over the corpus · one-hot encoding into 55 features · four-classifier soft-voting ensemble · repeated stratified cross-validation, five folds and five repeats · marginalisation over the unknown pre-U route · k-anonymity suppression, count banding and refresh gating on everything published.', {
    x: M + 0.32, y: y + 0.46, w: CW - 0.64, h: 0.58, margin: 0,
    fontFace: BODY, fontSize: 10.5, color: MUTED, lineSpacing: 14,
  });
}

/* ── 6. Architecture ── */
{
  const s = slide('Architecture', 'Architecture', 'Two runtimes, one deployment.');

  s.addShape(pres.shapes.RECTANGLE, {
    x: M + 4.7, y: 1.82, w: CW - 4.7, h: 1.45,
    fill: { color: VIOLET_PALE }, line: { color: HAIR, width: 0.75 },
  });
  s.addText('Why two services?', {
    x: M + 5.0, y: 1.97, w: CW - 5.3, h: 0.28, margin: 0,
    fontFace: DISPLAY, fontSize: 16, color: TEXT,
  });
  s.addText('Next.js cannot run scikit-learn, and rewriting the model in JavaScript would mean two implementations to keep in step. Vercel Services runs both from one repository and one deploy.', {
    x: M + 5.0, y: 2.32, w: CW - 5.3, h: 0.85, margin: 0,
    fontFace: BODY, fontSize: 12, color: MUTED, lineSpacing: 16,
  });

  const box = (x, y, w, h, title, body, accent) => {
    card(s, { x, y, w, h, accent });
    s.addText(title, { x: x + 0.3, y: y + 0.16, w: w - 0.6, h: 0.32, margin: 0, fontFace: DISPLAY, fontSize: 18, color: TEXT });
    s.addText(body, { x: x + 0.3, y: y + 0.56, w: w - 0.6, h: h - 0.7, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED, lineSpacing: 16 });
  };

  box(M, 1.82, 3.9, 1.45, 'Browser', 'React 19 interface, client-side\nvalidation, animated canvas', VIOLET);
  box(M, 3.82, 3.55, 1.95, 'Web service', 'Next.js 16 App Router\nServer Components, Server\nActions, route handlers', VIOLET_LT);
  box(M + 4.4, 3.82, 3.55, 1.95, 'ML service', 'Python 3.13 ASGI app\nscikit-learn ensemble loaded\nfrom model.joblib', CYAN);
  box(M + 8.8, 3.82, CW - 8.8, 1.95, 'Database', 'Supabase Postgres\nRow Level Security\n11 migrations', GREEN);

  const arrow = (x1, y1, x2, y2) => s.addShape(pres.shapes.LINE, {
    x: x1, y: y1, w: x2 - x1, h: y2 - y1,
    line: { color: VIOLET_LT, width: 1.75, endArrowType: 'triangle' },
  });
  arrow(M + 1.7, 3.32, M + 1.7, 3.77);
  arrow(M + 3.62, 4.79, M + 4.33, 4.79);
  arrow(M + 8.02, 4.79, M + 8.73, 4.79);

  note(s, 'vercel.json routes /api/ml/* to the Python runtime; every other path goes to Next.js.');
}

/* ── 7. System flow ── */
{
  const s = slide('Architecture', 'System flow', 'One request, end to end.');
  const steps = [
    ['Browser', 'A student answers ten questions. Answers are validated in the browser against the same feature spec the model uses.', VIOLET],
    ['POST /api/questions', 'The Next.js route handler authenticates the session and writes the raw answers to quiz_responses.', VIOLET],
    ['Encode', 'Answers become a 55-feature vector. One encoder in Python, a mirror in JavaScript, held in step by fixture tests.', VIOLET_LT],
    ['POST /api/ml/predict', 'Rewritten to the Python service. The ensemble votes and returns a ranked probability for every field.', CYAN],
    ['Annotate', 'Each field is joined to its published statistics — sample size, satisfaction, confidence tier.', CYAN_LT],
    ['Store and redirect', 'The finished result is written to predictions; the student lands on /results/<id>. It is never recomputed.', GREEN],
  ];
  let y = 1.9;
  steps.forEach(([head, body, colour], i) => {
    s.addShape(pres.shapes.OVAL, { x: M, y: y + 0.12, w: 0.42, h: 0.42, fill: { color: colour }, line: NO_LINE });
    s.addText(String(i + 1), {
      x: M, y: y + 0.12, w: 0.42, h: 0.42, margin: 0,
      fontFace: BODY, fontSize: 12.5, bold: true, color: WHITE, align: 'center', valign: 'middle',
    });
    if (i < steps.length - 1) {
      s.addShape(pres.shapes.RECTANGLE, { x: M + 0.2, y: y + 0.56, w: 0.022, h: 0.34, fill: { color: HAIR }, line: NO_LINE });
    }
    s.addText(head, { x: M + 0.7, y: y + 0.1, w: 3.4, h: 0.3, margin: 0, fontFace: MONO, fontSize: 12.5, bold: true, color: TEXT });
    s.addText(body, { x: M + 4.25, y: y + 0.04, w: CW - 4.25, h: 0.55, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED, lineSpacing: 16 });
    y += 0.9;
  });
}

/* ── 8. Descriptive analysis 1 — the corpus ── */
{
  const s = slide('Descriptive analysis', 'Descriptive analysis · part 1', 'What 207 students actually chose.');

  s.addChart(pres.charts.BAR, [{
    name: 'Alumni',
    labels: byCount.map((f) => f.field).reverse(),
    values: byCount.map((f) => f.n).reverse(),
  }], {
    x: M - 0.1, y: 1.88, w: 6.6, h: 4.35, barDir: 'bar',
    chartColors: byCount.map((f) => (f.suppressed ? 'B0AAC4' : VIOLET)).reverse(),
    varyColors: true,
    chartArea: { fill: { color: PAPER } },
    plotArea: { fill: { color: PAPER } },
    catAxisLabelColor: MUTED, valAxisLabelColor: MUTED,
    catAxisLabelFontFace: BODY, valAxisLabelFontFace: BODY,
    catAxisLabelFontSize: 10.5, valAxisLabelFontSize: 9.5,
    valGridLine: { color: HAIR, size: 0.5 }, catGridLine: { style: 'none' },
    showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: TEXT,
    dataLabelFontFace: MONO, dataLabelFontSize: 10,
    valAxisMaxVal: 50, valAxisMinVal: 0,
    showLegend: false, barGapWidthPct: 40,
  });

  const rx = M + 6.75;
  const rw = CW - 6.75;

  panel(s, {
    x: rx, y: 1.92, w: rw, h: 1.5, accent: VIOLET,
    head: 'The classes are not balanced',
    headSize: 15,
    body: `Business & Management carries ${byCount[0].n} students; Humanities carries ${byCount[byCount.length - 1].n}. A model trained on this has far more to say about some fields than others, which is why the ensemble carries a naive Bayes term and the interface always prints the sample size.`,
    bodySize: 10.5,
  });

  panel(s, {
    x: rx, y: 3.55, w: rw, h: 1.5, accent: AMBER,
    head: 'Two fields publish nothing',
    headSize: 15,
    body: `${suppressed.map((f) => `${f.field} (${f.n})`).join(' and ')} fall below the k = ${stats.kThreshold} threshold. Their pages say so in plain words rather than showing a statistic drawn from single figures — the grey bars on the left.`,
    bodySize: 10.5,
  });

  const facts = [
    ['Who answered', `${stats.schools[0].n} public school · ${stats.schools[1].n} boarding · ${stats.schools[2].n} private · ${stats.schools[3].n} religious`],
    ['Pre-U routes', stats.routes.map((r) => `${r.route} ${r.n}`).join(' · ')],
    ['SPM results', `${stats.results[0].n} at 6–8 As · ${stats.results[1].n} at 3–5 As · ${stats.results[2].n} at 9+ As · ${stats.results[3].n} at 1–2 As`],
  ];
  let fy = 5.2;
  facts.forEach(([label, value]) => {
    s.addText(label.toUpperCase(), {
      x: rx, y: fy, w: rw, h: 0.18, margin: 0,
      fontFace: BODY, fontSize: 8.5, bold: true, color: VIOLET, charSpacing: 1.5,
    });
    s.addText(value, {
      x: rx, y: fy + 0.18, w: rw, h: 0.28, margin: 0,
      fontFace: MONO, fontSize: 9, color: MUTED, lineSpacing: 11.5,
    });
    fy += 0.48;
  });

  note(s, `n = ${stats.n} · generated by decks/describe_corpus.py from ml/data/survey.csv — the same file ml/train.py reads.`);
}

/* ── 9. Descriptive analysis 2 — satisfaction ── */
{
  const s = slide('Descriptive analysis', 'Descriptive analysis · part 2', 'Where students ended up glad of it.');

  s.addChart(pres.charts.BAR, [{
    name: 'Mean satisfaction',
    labels: shortSat.map((f) => f.field).reverse(),
    values: shortSat.map((f) => f.mean).reverse(),
  }], {
    x: M - 0.1, y: 1.88, w: 6.6, h: 4.35, barDir: 'bar',
    chartColors: shortSat.map((f) => (f.suppressed ? 'B0AAC4' : (f.mean >= 3.6 ? CYAN : VIOLET))).reverse(),
    varyColors: true,
    chartArea: { fill: { color: PAPER } },
    plotArea: { fill: { color: PAPER } },
    catAxisLabelColor: MUTED, valAxisLabelColor: MUTED,
    catAxisLabelFontFace: BODY, valAxisLabelFontFace: BODY,
    catAxisLabelFontSize: 10.5, valAxisLabelFontSize: 9.5,
    valGridLine: { color: HAIR, size: 0.5 }, catGridLine: { style: 'none' },
    showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: TEXT,
    dataLabelFontFace: MONO, dataLabelFontSize: 10, dataLabelFormatCode: '0.00',
    valAxisMaxVal: 5, valAxisMinVal: 0,
    showLegend: false, barGapWidthPct: 40,
  });

  const rx = M + 6.75;
  const rw = CW - 6.75;

  panel(s, {
    x: rx, y: 1.92, w: rw, h: 1.5, accent: CYAN,
    head: 'The spread is wide',
    headSize: 15,
    body: `${best.field} averages ${best.mean.toFixed(2)} of 5, with ${best.satisfiedShare}% rating themselves 4 or 5. ${worst.field} averages ${worst.mean.toFixed(2)}, with ${worst.satisfiedShare}%. A ranked shortlist that left satisfaction out would treat those two as the same result.`,
    bodySize: 10.5,
  });

  panel(s, {
    x: rx, y: 3.55, w: rw, h: 1.4, accent: VIOLET,
    head: 'So the product publishes it',
    headSize: 15,
    body: 'Every match carries average satisfaction and the share who ended up dissatisfied, next to the percentage — so a high match with an unhappy cohort reads as exactly that.',
    bodySize: 10.5,
  });

  panel(s, {
    x: rx, y: 5.08, w: rw, h: 1.4, accent: AMBER,
    head: 'The grey bars are not published',
    headSize: 15,
    body: `${suppressed.map((f) => `${f.field} (${f.n})`).join(' and ')} are shown here for completeness. In the product both pages publish no statistics at all — the same k = ${stats.kThreshold} rule that governs every figure on the site.`,
    bodySize: 10.5,
  });

  note(s, 'Mean of the 1–5 self-rating, computed by decks/describe_corpus.py over all 207 rows.');
}

/* ── 10. Descriptive analysis 3 — the stream question ── */
{
  const s = slide('Descriptive analysis', 'Descriptive analysis · part 3', 'Does staying in your SPM stream make you happier?');

  s.addChart(pres.charts.BAR, [
    {
      name: 'Field related to stream',
      labels: ['1', '2', '3', '4', '5'],
      values: related.distribution,
    },
    {
      name: 'Field not related',
      labels: ['1', '2', '3', '4', '5'],
      values: unrelated.distribution,
    },
  ], {
    x: M - 0.1, y: 1.92, w: 5.9, h: 3.4, barDir: 'col', barGrouping: 'clustered',
    chartColors: [VIOLET, CYAN],
    chartArea: { fill: { color: PAPER } },
    plotArea: { fill: { color: PAPER } },
    catAxisLabelColor: MUTED, valAxisLabelColor: MUTED,
    catAxisLabelFontFace: BODY, valAxisLabelFontFace: BODY,
    catAxisLabelFontSize: 10.5, valAxisLabelFontSize: 9.5,
    valGridLine: { color: HAIR, size: 0.5 }, catGridLine: { style: 'none' },
    valAxisMaxVal: 40, valAxisMinVal: 0,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: MUTED,
    dataLabelFontFace: MONO, dataLabelFontSize: 9, dataLabelFormatCode: '0"%"',
    showLegend: true, legendPos: 'b', legendColor: MUTED, legendFontFace: BODY, legendFontSize: 10,
  });

  s.addText('Self-rated satisfaction, 1 to 5 — share of each group', {
    x: M, y: 5.4, w: 5.7, h: 0.24, margin: 0,
    fontFace: BODY, fontSize: 10, color: FAINT,
  });

  s.addText(`Matriculation is the outlier on the right — median ${stats.routes.find((r) => r.route === 'Matriculation').median} against 4 for every other route, on ${stats.routes.find((r) => r.route === 'Matriculation').n} students. Reported as an observation, not a claim: at that sample it is not separable from noise.`, {
    x: M, y: 5.82, w: 5.7, h: 0.8, margin: 0,
    fontFace: BODY, fontSize: 10.5, color: MUTED, lineSpacing: 14,
  });

  // A five-number summary per pre-U route, drawn rather than charted —
  // PowerPoint has no box plot, and the shapes are exact.
  const bx = M + 6.15;
  const bw = CW - 6.15;
  card(s, { x: bx, y: 1.92, w: bw, h: 3.3 });
  s.addText('Satisfaction spread by pre-U route', {
    x: bx + 0.3, y: 2.02, w: bw - 0.6, h: 0.3, margin: 0,
    fontFace: DISPLAY, fontSize: 15, color: TEXT,
  });
  s.addText('Box is the middle half, line is the median, whisker is the full range.', {
    x: bx + 0.3, y: 2.33, w: bw - 0.6, h: 0.24, margin: 0,
    fontFace: BODY, fontSize: 9.5, color: FAINT,
  });

  const plotX = bx + 1.62;
  const plotW = bw - 2.0;
  const scale = (v) => plotX + ((v - 1) / 4) * plotW;

  [1, 2, 3, 4, 5].forEach((tick) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: scale(tick), y: 2.66, w: 0.007, h: 2.28,
      fill: { color: 'EDEBF3' }, line: NO_LINE,
    });
    s.addText(String(tick), {
      x: scale(tick) - 0.12, y: 4.97, w: 0.24, h: 0.19, margin: 0,
      fontFace: MONO, fontSize: 8.5, color: FAINT, align: 'center',
    });
  });

  let ry = 2.76;
  stats.routes.forEach((route) => {
    const colour = route.median <= 2.5 ? AMBER : VIOLET;
    const mid = ry + 0.15;
    s.addText(`${route.route}`, {
      x: bx + 0.3, y: ry - 0.05, w: 1.2, h: 0.21, margin: 0,
      fontFace: BODY, fontSize: 9.5, color: TEXT, valign: 'middle',
    });
    s.addText(`n=${route.n}`, {
      x: bx + 0.3, y: ry + 0.14, w: 1.2, h: 0.18, margin: 0,
      fontFace: MONO, fontSize: 8, color: FAINT, valign: 'middle',
    });
    // Whisker, with a cap at each end so the full range is legible even where
    // it coincides with the box edge.
    s.addShape(pres.shapes.RECTANGLE, {
      x: scale(route.min), y: mid - 0.012, w: scale(route.max) - scale(route.min), h: 0.024,
      fill: { color: '8F87A8' }, line: NO_LINE,
    });
    [route.min, route.max].forEach((cap) => {
      s.addShape(pres.shapes.RECTANGLE, {
        x: scale(cap) - 0.012, y: mid - 0.09, w: 0.024, h: 0.18,
        fill: { color: '8F87A8' }, line: NO_LINE,
      });
    });
    // Interquartile box.
    s.addShape(pres.shapes.RECTANGLE, {
      x: scale(route.q1), y: mid - 0.115, w: Math.max(scale(route.q3) - scale(route.q1), 0.05), h: 0.23,
      fill: { color: colour }, line: NO_LINE,
    });
    // Median.
    s.addShape(pres.shapes.RECTANGLE, {
      x: scale(route.median) - 0.022, y: mid - 0.155, w: 0.044, h: 0.31,
      fill: { color: WHITE }, line: NO_LINE,
    });
    ry += 0.45;
  });

  panel(s, {
    x: bx, y: 5.34, w: bw, h: 1.45, accent: CYAN,
    head: 'The stream is not the answer',
    headSize: 15,
    body: `Students whose field matched their SPM stream average ${related.mean.toFixed(2)} of 5 (n=${related.n}); those who switched average ${unrelated.mean.toFixed(2)} (n=${unrelated.n}). Following the stream is not what makes people glad of the choice — which is why the model matches on the whole answer set, not the stream alone.`,
    bodySize: 10.5,
  });
}

/* ── 11. Predictive analysis 1 — the pipeline ── */
{
  const s = slide('Predictive analysis', 'Predictive analysis · part 1', 'From ten answers to a ranked list.');

  const stages = [
    [
      '1. Encode',
      'The ten answers become a 55-number vector',
      'Each option a student can pick becomes one slot, set to 1 if they picked it. "Science stream" is one slot, "enjoys maths" another. The 1-5 comfort scale is scaled into the same range so no single answer dominates by virtue of being a bigger number.',
      VIOLET,
    ],
    [
      '2. Compare',
      'Against all 207 encoded alumni',
      'The same encoding was applied to every alumnus, so a student and an alumnus are directly comparable — 55 numbers against 55 numbers. This is what makes "students like you" a measurement rather than a figure of speech.',
      VIOLET_LT,
    ],
    [
      '3. Vote',
      'Four models each score every field',
      'Nearest-neighbours asks who answered most like you. Regression asks which answers historically pointed where. The forest looks for combinations. Naive Bayes steadies thin classes. Each returns a probability per field; the four are averaged.',
      CYAN,
    ],
    [
      '4. Marginalise',
      'Unknown pre-U route is averaged, not guessed',
      'A student who has not chosen a pre-U route yet is predicted once for every route, and the results are averaged weighted by how common each route is. Nothing is invented on their behalf — the uncertainty is carried through instead of hidden.',
      CYAN_LT,
    ],
    [
      '5. Rank',
      'Sorted, with the sample behind each',
      'Fields are ordered by probability. Each carries the number of alumni it rests on, so a 20% match built on 44 students is visibly different from one built on 11.',
      GREEN,
    ],
  ];

  let y = 1.92;
  stages.forEach(([step, head, body, colour]) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: M, y, w: CW, h: 0.86, fill: { color: WHITE }, line: { color: HAIR, width: 0.75 },
      shadow: shadow(),
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: M, y, w: 0.055, h: 0.86, fill: { color: colour }, line: NO_LINE,
    });
    s.addText(step, {
      x: M + 0.3, y, w: 1.35, h: 0.86, margin: 0,
      fontFace: MONO, fontSize: 12, bold: true, color: colour, valign: 'middle',
    });
    s.addText(head, {
      x: M + 1.7, y, w: 3.4, h: 0.86, margin: 0,
      fontFace: DISPLAY, fontSize: 16, color: TEXT, valign: 'middle', lineSpacing: 19,
    });
    s.addText(body, {
      x: M + 5.3, y, w: CW - 5.6, h: 0.86, margin: 0,
      fontFace: BODY, fontSize: 11, color: MUTED, valign: 'middle', lineSpacing: 14.5,
    });
    y += 0.95;
  });

  note(
    s,
    'Nothing here is a rule someone wrote down. Every relationship in the model was learned from what 207 real students actually did.'
  );
}

/* ── 12. Predictive analysis 2 — the model ── */
{
  const s = slide('Predictive analysis', 'Predictive analysis · part 2', 'Four algorithms vote. None decides alone.');
  const models = [
    ['K-Nearest\nNeighbours', 'k = 15, cosine', 'Finds the students who answered most like you.', 'weight 2', VIOLET],
    ['Logistic\nRegression', 'balanced classes', 'Learns which single answers push toward which field.', 'weight 2', VIOLET_LT],
    ['Random\nForest', '600 trees', 'Catches combinations — results and subject and temperament.', 'weight 1', CYAN],
    ['Bernoulli\nNaive Bayes', 'alpha = 0.5', 'Steadies the vote where a field has few examples.', 'weight 1', CYAN_LT],
  ];
  const cw = 2.82, gap = 0.32;
  models.forEach(([name, cfg, why, w8, colour], i) => {
    const x = M + i * (cw + gap);
    card(s, { x, y: 1.92, w: cw, h: 2.85, accent: colour });
    s.addText(name, { x: x + 0.3, y: 2.12, w: cw - 0.62, h: 0.75, margin: 0, fontFace: DISPLAY, fontSize: 17, color: TEXT, lineSpacing: 22 });
    s.addText(cfg, { x: x + 0.3, y: 2.92, w: cw - 0.62, h: 0.26, margin: 0, fontFace: MONO, fontSize: 10.5, color: colour });
    s.addText(why, { x: x + 0.3, y: 3.27, w: cw - 0.62, h: 1.05, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED, lineSpacing: 16 });
    s.addText(w8, { x: x + 0.3, y: 4.37, w: cw - 0.62, h: 0.26, margin: 0, fontFace: MONO, fontSize: 10.5, color: MUTED });
  });
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 5.12, w: CW, h: 1.15, fill: { color: VIOLET_PALE }, line: { color: HAIR, width: 0.75 } });
  s.addText('Soft voting', { x: M + 0.32, y: 5.27, w: CW - 0.64, h: 0.3, margin: 0, fontFace: DISPLAY, fontSize: 17, color: TEXT });
  s.addText('Each model returns a probability per field, and the four are averaged by weight. A model that is confidently wrong gets outvoted — which is the point. Scored with repeated stratified cross-validation: five folds, five repeats, never a single split.', {
    x: M + 0.32, y: 5.62, w: CW - 0.64, h: 0.6, margin: 0,
    fontFace: BODY, fontSize: 12, color: MUTED, lineSpacing: 16,
  });
}

/* ── 13. Predictive analysis 3 — run live ── */
{
  const s = slide('Predictive analysis', 'Predictive analysis · part 3', 'The same model, run by hand.');

  screenshot(s, {
    file: '15-algorithm-tester.crop.png', x: M, y: 1.92, w: 6.9, ratio: 1140 / 660,
    caption: '/admin/algorithm-tester — posted to the live ML service, nothing stored',
  });

  const rx = M + 7.25;
  const rw = CW - 7.25;

  panel(s, {
    x: rx, y: 1.92, w: rw, h: 1.45, accent: VIOLET,
    head: 'Not a mock-up',
    headSize: 15,
    body: 'The tester posts to the same /api/ml/predict endpoint the questions page uses, and prints the raw ranked probabilities before the interface rounds or annotates anything.',
    bodySize: 10.5,
  });
  panel(s, {
    x: rx, y: 3.5, w: rw, h: 1.45, accent: CYAN,
    head: 'The shape of a real answer',
    headSize: 15,
    body: 'A technical-stream preset returns Computer Science at 68%, Business at 19%, then a long tail under 5%. The top three carry the mass; the rest is reported as near-zero rather than padded.',
    bodySize: 10.5,
  });
  panel(s, {
    x: rx, y: 5.08, w: rw, h: 1.45, accent: AMBER,
    head: 'Marginalised, and it says so',
    headSize: 15,
    body: 'The badge on the output records that no pre-U route was given, so the prediction is an average across all five routes, weighted by how common each is, rather than a guess at which one the student will take.',
    bodySize: 10.5,
  });

  note(s, 'Model version is stamped on every run. A prediction made against an older artefact can be told apart from one made after a retrain.');
}

/* ── 14. What it is not ── */
{
  const s = slide('Predictive analysis', 'Predictive analysis · scope', 'What it is, in plain terms.');

  const left = [
    ['It is a comparison, not a verdict', 'The output is “students who answered like you most often chose this”. The model has no opinion about what anyone should do, and the interface never phrases it as advice.'],
    ['It is classification, not a score', 'There is no aptitude number and no ranking of students. The model picks among ten fields; it never rates the person.'],
    ['Top-3, because that is the honest unit', 'A single answer would overstate the certainty available from 207 people. Three keeps the shortlist useful and truthful.'],
  ];
  const right = [
    ['Not a personality test', 'Nothing is inferred about character. The questions ask what someone did and what they enjoy, and the answers are matched to outcomes.'],
    ['Not a prediction of success', 'The model says where similar students went, not how well anyone will do there. It has no data on outcomes beyond satisfaction.'],
    ['Not a substitute for a counsellor', 'It is a starting shortlist backed by evidence, meant to inform a conversation rather than replace one.'],
  ];

  const colW = HALF;
  [left, right].forEach((column, ci) => {
    let y = 1.92;
    column.forEach(([head, body]) => {
      const x = M + ci * (colW + GAP);
      panel(s, { x, y, w: colW, h: 1.35, accent: ci === 0 ? VIOLET : CYAN, head, body });
      y += 1.5;
    });
  });

  note(
    s,
    'Every one of these boundaries is enforced in the product copy, not just stated here — the results page never uses the word “should”.'
  );
}

/* ── 15. Privacy ── */
{
  const s = slide('Privacy', 'Privacy engineering', 'The data is 207 teenagers. It is treated that way.');
  const items = [
    ['k-anonymity', 'A field with fewer than 10 students publishes no statistics at all. It says so plainly rather than showing a number.', VIOLET],
    ['Count banding', 'Sample sizes appear as ranges — 10 to 19, 20 to 49 — never exact counts, so two pages cannot be subtracted.', VIOLET],
    ['Refresh gating', 'Published aggregates only move once at least three rows have changed, closing the temporal-differencing attack.', VIOLET_LT],
    ['Row Level Security', 'A student can read only their own responses, enforced in Postgres — so an application bug cannot leak the rest.', CYAN],
    ['Locked at the grant layer', 'Admin routes are guarded in the app and the tables are locked by database privilege. One is convenience; the other is the control.', CYAN_LT],
    ['The account is theirs', 'Name, email and password are the student’s to change, and deleting the account removes the responses and predictions.', GREEN],
  ];
  let y = 1.92;
  items.forEach(([head, body, colour]) => {
    card(s, { x: M, y, w: 6.5, h: 0.76, accent: colour });
    s.addText(head, {
      x: M + 0.3, y, w: 1.95, h: 0.76, margin: 0,
      fontFace: DISPLAY, fontSize: 13, color: TEXT, valign: 'middle', lineSpacing: 15,
    });
    s.addText(body, {
      x: M + 2.34, y, w: 3.9, h: 0.76, margin: 0,
      fontFace: BODY, fontSize: 9.5, color: MUTED, valign: 'middle', lineSpacing: 12,
    });
    y += 0.78;
  });

  screenshot(s, {
    file: '08-field-suppressed.crop.png', x: M + 6.9, y: 1.92, w: 4.35, ratio: 790 / 740,
    caption: '/explore/humanities-social-sciences — 7 students, so nothing is published',
  });

  note(s, 'Suppression, banding and the refresh gate each have a test that fails if a published number becomes more precise than it should be.');
}

/* ── 16. Admin console ── */
{
  const s = slide('Admin', 'Admin console', 'Six sections, behind a role flag.');
  const secs = [
    ['Overview', 'Live counts, recent activity, and where students drop off.'],
    ['Response Charts', 'Every question summarised as a distribution, Google-Forms style.'],
    ['Survey Data', 'The corpus the model learns from, searchable and sortable.'],
    ['Student Responses', 'Every submission with the prediction it produced, opened row by row.'],
    ['People', 'Accounts, display names and who has admin access.'],
    ['Algorithm Tester', 'Enter answers by hand and watch the model rank them live.'],
  ];
  let y = 1.92;
  secs.forEach(([head, body]) => {
    card(s, { x: M, y, w: 7.1, h: 0.66, accent: VIOLET });
    s.addText(head, { x: M + 0.32, y, w: 2.5, h: 0.66, margin: 0, fontFace: DISPLAY, fontSize: 14.5, color: TEXT, valign: 'middle' });
    s.addText(body, { x: M + 2.95, y, w: 4.0, h: 0.66, margin: 0, fontFace: BODY, fontSize: 10.5, color: MUTED, valign: 'middle' });
    y += 0.73;
  });

  const rx = M + 7.5;
  const rw = CW - 7.5;
  screenshot(s, {
    file: '12-admin-response-charts.crop.png', x: rx, y: 1.92, w: 4.13, ratio: 1150 / 800,
    caption: '/admin/response-charts',
  });

  card(s, { x: rx, y: 5.2, w: rw, h: 1.72, fill: INK });
  s.addText('Access control', { x: rx + 0.32, y: 5.34, w: rw - 0.64, h: 0.3, margin: 0, fontFace: DISPLAY, fontSize: 16, color: WHITE });
  s.addText('Entry is a discreet Admin button in the site footer — present for an admin, absent from the page entirely for everyone else, not merely hidden with CSS. Verified against production: the demo student account is redirected away from every admin route.', {
    x: rx + 0.32, y: 5.7, w: rw - 0.64, h: 1.06, margin: 0,
    fontFace: BODY, fontSize: 10, color: ON_DARK, lineSpacing: 13.5,
  });
}

/* ── 17. Quality ── */
{
  const s = slide('Admin', 'Quality and verification', 'What has actually been proven.');
  const counts = [
    ['359', 'JavaScript tests passing', VIOLET],
    ['36', 'Python tests passing', VIOLET_LT],
    ['103', 'commits', CYAN],
    ['11', 'database migrations', CYAN_LT],
  ];
  const cw = 2.82, gap = 0.32;
  counts.forEach(([n, label, colour], i) => {
    const x = M + i * (cw + gap);
    card(s, { x, y: 1.92, w: cw, h: 1.45, accent: colour });
    s.addText(n, { x: x + 0.3, y: 2.07, w: cw - 0.62, h: 0.72, margin: 0, fontFace: MONO, fontSize: 38, bold: true, color: colour });
    s.addText(label, { x: x + 0.3, y: 2.85, w: cw - 0.62, h: 0.3, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });
  });
  const proofs = [
    ['Encoder parity', 'Fixture tests pin the JavaScript encoder to the Python one, so the browser and the model can never disagree about what a student said.'],
    ['Privacy boundaries', 'Suppression, banding, and the refresh gate each have tests that fail if a published number becomes more precise than it should be.'],
    ['Role separation', 'A further 13 tests drive the real production site. They are skipped, not silently passed, when no production credentials are present.'],
    ['Full journey', 'Login through to a stored result, driven in a real browser.'],
  ];
  proofs.forEach(([head, body], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * (HALF + GAP);
    const y = 3.67 + row * 1.3;
    panel(s, { x, y, w: HALF, h: 1.12, accent: VIOLET, head, body, headSize: 15.5, bodySize: 11 });
  });
  note(s, 'Re-derive rather than trust: npm test · python -m pytest · ls supabase/migrations/*.sql. 372 JavaScript tests are defined; 359 run without production credentials.');
}

/* ── 18. Findings ── */
{
  const s = slide('Findings', 'Findings', 'What the data and the model actually showed.');

  const findings = [
    [
      'The corpus is uneven, and the product admits it',
      `Field counts run from ${byCount[0].n} down to ${byCount[byCount.length - 1].n}. Two fields sit below the k = ${stats.kThreshold} threshold and publish nothing at all rather than a statistic drawn from single figures.`,
      VIOLET,
    ],
    [
      'Satisfaction is not uniform, so it is published',
      `${best.field} averages ${best.mean.toFixed(2)} of 5 (${best.satisfiedShare}% rating 4 or 5); ${worst.field} averages ${worst.mean.toFixed(2)} (${worst.satisfiedShare}%). Every match carries its own satisfaction figure next to the percentage.`,
      CYAN,
    ],
    [
      'Staying in your SPM stream does not predict happiness',
      `Related ${related.mean.toFixed(2)} of 5 against unrelated ${unrelated.mean.toFixed(2)}. The stream alone is a poor guide, which is why the model matches on all ten answers rather than routing by stream.`,
      VIOLET_LT,
    ],
    [
      'Accuracy is measured, not advertised',
      'Top-3 accuracy is 71.5% with a stated pre-U route and 63.7% without, by repeated stratified cross-validation. Both are re-runnable from ml/measure_paths.py; neither is published in the product.',
      CYAN_LT,
    ],
    [
      'The honest unit is three fields, not one',
      'At n = 207 the confidence interval is about six points. A single named field would claim a precision the sample cannot support.',
      GREEN,
    ],
    [
      'Every published number is traceable',
      'Descriptive figures come from decks/describe_corpus.py, accuracy from ml/measure_paths.py, counts from the test runners — all committed, all re-runnable.',
      AMBER,
    ],
  ];

  const cw = 3.75, gap = 0.31;
  findings.forEach(([head, body, colour], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = M + col * (cw + gap);
    const y = 1.92 + row * 2.15;
    panel(s, { x, y, w: cw, h: 1.95, accent: colour, head, body, headSize: 14, bodySize: 10.5, headH: 0.52 });
  });

  note(s, 'The descriptive findings above are what justify the design decisions on the previous slides — they were not written to fit them.');
}

/* ── 19. Future work ── */
{
  const s = slide('Future work', 'Future work', 'What 207 students cannot yet tell us.');

  const items = [
    ['Grow the corpus', 'The sample is the binding constraint on everything else. At roughly a thousand rows the two suppressed fields become publishable and the confidence interval narrows from about six points.', VIOLET],
    ['Automate the retrain', 'The manual gate exists because a small batch can move accuracy by more than the noise floor. Once the corpus is large enough that it cannot, the export-refit-redeploy chain can run unattended.', VIOLET_LT],
    ['Outcomes beyond satisfaction', 'The survey knows whether a student is glad of the choice, and nothing about employment, earnings or time to graduate. Those are the questions students ask next.', CYAN],
    ['Widen the questions', 'Cost and location are the two reasons students give for a choice that the current ten questions do not capture at all.', CYAN_LT],
    ['Follow the same students', 'Satisfaction was captured once. Re-asking a year on would show whether it holds, and would turn a snapshot into a trend.', GREEN],
    ['Independent evaluation', 'Cross-validation measures the model against its own corpus. A held-out cohort from a different intake year would measure it against the world.', AMBER],
  ];

  const cw = 3.75, gap = 0.31;
  items.forEach(([head, body, colour], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = M + col * (cw + gap);
    const y = 1.92 + row * 2.05;
    panel(s, { x, y, w: cw, h: 1.85, accent: colour, head, body, headSize: 15, bodySize: 10.5 });
  });

  note(s, 'Nothing on this list is blocked by the architecture. Every one of them is waiting on more students answering the same ten questions.');
}

/* ── 20. Closing ── */
{
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.14, h: H, fill: { color: VIOLET }, line: NO_LINE });
  s.addText('WHAT MAKES IT DEFENSIBLE', {
    x: M, y: 1.3, w: CW, h: 0.34, margin: 0,
    fontFace: BODY, fontSize: 11, bold: true, color: VIOLET_LT, charSpacing: 3,
  });
  s.addText('It says “students like you chose this.”\nIt does not say “you should study this.”', {
    x: M, y: 1.85, w: 11, h: 1.7, margin: 0,
    fontFace: DISPLAY, fontSize: 30, color: WHITE, lineSpacing: 44,
  });
  const closes = [
    'Nothing in the model is a rule someone wrote down — every relationship was learned from what 207 real students did.',
    'Fields with too few students show an honest message, never an invented statistic.',
    'Every number on screen can be traced back to the students it came from.',
  ];
  let y = 3.85;
  closes.forEach((t) => {
    s.addShape(pres.shapes.RECTANGLE, { x: M, y: y + 0.11, w: 0.09, h: 0.09, fill: { color: VIOLET_LT }, line: NO_LINE });
    s.addText(t, { x: M + 0.32, y, w: 11, h: 0.32, margin: 0, fontFace: BODY, fontSize: 14, color: ON_DARK, valign: 'middle' });
    y += 0.55;
  });
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 5.75, w: 4.2, h: 0.02, fill: { color: VIOLET }, line: NO_LINE });
  s.addText('arah-sand.vercel.app', {
    x: M, y: 5.95, w: 8, h: 0.34, margin: 0,
    fontFace: MONO, fontSize: 13, color: VIOLET_LT,
  });
}

pres.writeFile({ fileName: 'ARAH-System-Overview.pptx' }).then((f) => console.log('wrote', f));
