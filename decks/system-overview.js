// ARAH — technical system deck.
// Palette and type come from the product itself: violet leads, cyan supports,
// near-white paper, serif display over sans body.
const pptxgen = require('pptxgenjs');

const INK = '1B1830';
const VIOLET = '6D28D9';
const VIOLET_LT = '8B5CF6';
const VIOLET_PALE = 'EFEAFB';
const CYAN = '0E7490';
const CYAN_LT = '3A93A8';
const GREEN = '1F7A5A';
const PAPER = 'FAFAFC';
const WHITE = 'FFFFFF';
const TEXT = '1F1B2E';
const MUTED = '625D78';
const HAIR = 'E3E0EC';
const ON_DARK = 'CFC9E6';

const DISPLAY = 'Georgia';
const BODY = 'Calibri';
const MONO = 'Consolas';

const W = 13.333;
const H = 7.5;
const M = 0.85;
const CW = W - M * 2;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'ARAH';
pres.title = 'ARAH - System and Technical Overview';

const shadow = () => ({
  type: 'outer', color: '000000', blur: 10, offset: 2, angle: 135, opacity: 0.08,
});

function slide(kicker, title, opts = {}) {
  const s = pres.addSlide();
  s.background = { color: opts.bg || PAPER };
  s.addShape(pres.shapes.RECTANGLE, {
    x: M, y: 0.55, w: 0.11, h: 0.11, fill: { color: VIOLET }, line: { width: 0 },
  });
  s.addText(kicker.toUpperCase(), {
    x: M + 0.26, y: 0.45, w: CW - 0.26, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 10.5, bold: true, color: VIOLET, charSpacing: 3,
    valign: 'middle',
  });
  s.addText(title, {
    x: M, y: 0.9, w: opts.titleW || CW, h: opts.titleH || 0.85, margin: 0,
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
      x, y, w: 0.055, h, fill: { color: accent }, line: { width: 0 },
    });
  }
}

function note(s, text) {
  s.addText(text, {
    x: M, y: H - 0.78, w: CW, h: 0.36, margin: 0,
    fontFace: BODY, fontSize: 10.5, color: MUTED, valign: 'middle',
  });
}

/* ── 1. Title ── */
{
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.14, h: H, fill: { color: VIOLET }, line: { width: 0 } });
  s.addText('A R A H', {
    x: M, y: 1.5, w: CW, h: 0.45, margin: 0,
    fontFace: DISPLAY, fontSize: 20, color: WHITE, charSpacing: 12,
  });
  s.addText('Built for students who have to\nchoose, with no way to compare.', {
    x: M, y: 2.15, w: 10.5, h: 1.8, margin: 0,
    fontFace: DISPLAY, fontSize: 38, color: WHITE, lineSpacing: 48,
  });
  s.addText('System and technical overview — architecture, stack, and data flow', {
    x: M, y: 4.15, w: 10.5, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 15, color: ON_DARK,
  });
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 4.85, w: 4.2, h: 0.02, fill: { color: VIOLET_LT }, line: { width: 0 } });
  s.addText('Next.js 16  ·  React 19  ·  Python 3.13  ·  scikit-learn  ·  Supabase Postgres  ·  Vercel', {
    x: M, y: 5.12, w: 11.2, h: 0.32, margin: 0,
    fontFace: MONO, fontSize: 11.5, color: '9A93BE',
  });
  s.addText('arah-sand.vercel.app', {
    x: M, y: 5.5, w: 11.2, h: 0.32, margin: 0,
    fontFace: MONO, fontSize: 12, color: VIOLET_LT,
  });
}

/* ── 2. What it does ── */
{
  const s = slide('The problem it solves', 'A student answers ten questions.\nThe system answers with evidence.', { titleSize: 28, titleH: 1.05 });
  const steps = [
    ['01', 'Answer', 'Ten questions about results,\nsubjects, interests, and how\nthey like to work.', VIOLET],
    ['02', 'Match', 'Compared against 207 real\nMalaysian SPM leavers who\nalready made the choice.', VIOLET_LT],
    ['03', 'Rank', 'Fields ordered by fit, each\nwith a confidence level and\nthe sample it rests on.', CYAN],
    ['04', 'Explore', 'What those students chose,\nhow satisfied they were, and\nthe advice they left behind.', CYAN_LT],
  ];
  const cw = 2.82, gap = 0.32;
  steps.forEach(([n, head, body, colour], i) => {
    const x = M + i * (cw + gap);
    card(s, { x, y: 2.5, w: cw, h: 2.5, accent: colour });
    s.addText(n, { x: x + 0.32, y: 2.7, w: 1, h: 0.32, margin: 0, fontFace: MONO, fontSize: 13, bold: true, color: colour });
    s.addText(head, { x: x + 0.32, y: 3.08, w: cw - 0.62, h: 0.38, margin: 0, fontFace: DISPLAY, fontSize: 19, color: TEXT });
    s.addText(body, { x: x + 0.32, y: 3.56, w: cw - 0.62, h: 1.2, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED, lineSpacing: 17 });
  });
  note(s, 'About three minutes end to end. Browsing needs no account; saving a result does.');
}

/* ── 3. Architecture ── */
{
  const s = slide('Architecture', 'Two runtimes, one deployment.', { titleH: 0.6 });

  s.addShape(pres.shapes.RECTANGLE, {
    x: M + 4.7, y: 1.75, w: CW - 4.7, h: 1.45,
    fill: { color: VIOLET_PALE }, line: { color: HAIR, width: 0.75 },
  });
  s.addText('Why two services?', {
    x: M + 5.0, y: 1.9, w: CW - 5.3, h: 0.28, margin: 0,
    fontFace: DISPLAY, fontSize: 16, color: TEXT,
  });
  s.addText('Next.js cannot run scikit-learn, and rewriting the model in JavaScript would mean two implementations to keep in step. Vercel Services runs both from one repository and one deploy.', {
    x: M + 5.0, y: 2.25, w: CW - 5.3, h: 0.85, margin: 0,
    fontFace: BODY, fontSize: 12, color: MUTED, lineSpacing: 16,
  });

  const box = (x, y, w, h, title, body, accent) => {
    card(s, { x, y, w, h, accent });
    s.addText(title, { x: x + 0.3, y: y + 0.16, w: w - 0.6, h: 0.32, margin: 0, fontFace: DISPLAY, fontSize: 18, color: TEXT });
    s.addText(body, { x: x + 0.3, y: y + 0.56, w: w - 0.6, h: h - 0.7, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED, lineSpacing: 16 });
  };

  box(M, 1.75, 3.9, 1.45, 'Browser', 'React 19 interface, client-side\nvalidation, animated canvas', VIOLET);
  box(M, 3.75, 3.55, 1.95, 'Web service', 'Next.js 16 App Router\nServer Components, Server\nActions, route handlers', VIOLET_LT);
  box(M + 4.4, 3.75, 3.55, 1.95, 'ML service', 'Python 3.13 ASGI app\nscikit-learn ensemble loaded\nfrom model.joblib', CYAN);
  box(M + 8.8, 3.75, CW - 8.8, 1.95, 'Database', 'Supabase Postgres\nRow Level Security\n10 migrations', GREEN);

  const arrow = (x1, y1, x2, y2) => s.addShape(pres.shapes.LINE, {
    x: x1, y: y1, w: x2 - x1, h: y2 - y1,
    line: { color: VIOLET_LT, width: 1.75, endArrowType: 'triangle' },
  });
  arrow(M + 1.7, 3.25, M + 1.7, 3.7);
  arrow(M + 3.62, 4.72, M + 4.33, 4.72);
  arrow(M + 8.02, 4.72, M + 8.73, 4.72);

  note(s, 'vercel.json routes /api/ml/* to the Python runtime; every other path goes to Next.js.');
}

/* ── 4. Stack ── */
{
  const s = slide('Languages and frameworks', 'What it is built from.', { titleH: 0.6 });
  const rows = [
    ['Language', 'JavaScript (JSX) · Python 3.13 · SQL', 'No TypeScript, by request — JSX throughout.'],
    ['Framework', 'Next.js 16.2 App Router · React 19.2', 'Server Components by default; client code only where the browser is needed.'],
    ['Styling', 'Tailwind CSS v4 · shadcn/ui · Radix · PrimeReact', 'CSS-first @theme configuration — v4 has no tailwind.config.js.'],
    ['Motion', 'GSAP · Motion · Lenis · custom canvas', 'Every animation gated on prefers-reduced-motion.'],
    ['Machine learning', 'scikit-learn · NumPy · pandas · Joblib', 'pandas is training-only and deliberately absent from the deployed service.'],
    ['Data', 'Supabase Postgres · Row Level Security', 'Access rules live in the database, not only in application code.'],
    ['Charts', 'Recharts', 'The same component set on public pages and in the admin console.'],
    ['Quality', 'Vitest · pytest · ESLint · Playwright', '387 JavaScript tests and 36 Python tests.'],
  ];
  let y = 1.85;
  rows.forEach(([label, tech, why], i) => {
    if (i % 2 === 0) {
      s.addShape(pres.shapes.RECTANGLE, { x: M, y, w: CW, h: 0.62, fill: { color: WHITE }, line: { width: 0 } });
    }
    s.addText(label, { x: M + 0.22, y, w: 2.1, h: 0.62, margin: 0, fontFace: BODY, fontSize: 12.5, bold: true, color: VIOLET, valign: 'middle' });
    s.addText(tech, { x: M + 2.45, y, w: 4.5, h: 0.62, margin: 0, fontFace: MONO, fontSize: 11, color: TEXT, valign: 'middle' });
    s.addText(why, { x: M + 7.15, y, w: CW - 7.35, h: 0.62, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, valign: 'middle' });
    y += 0.62;
  });
}

/* ── 5. System flow ── */
{
  const s = slide('System flow', 'One request, end to end.', { titleH: 0.6 });
  const steps = [
    ['Browser', 'A student answers ten questions. Answers are validated in the browser against the same feature spec the model uses.', VIOLET],
    ['POST /api/questions', 'The Next.js route handler authenticates the session and writes the raw answers to quiz_responses.', VIOLET],
    ['Encode', 'Answers become a 55-feature vector. One encoder in Python, a mirror in JavaScript, held in step by fixture tests.', VIOLET_LT],
    ['POST /api/ml/predict', 'Rewritten to the Python service. The ensemble votes and returns a ranked probability for every field.', CYAN],
    ['Annotate', 'Each field is joined to its published statistics — sample size, satisfaction, confidence tier.', CYAN_LT],
    ['Store and redirect', 'The finished result is written to predictions; the student lands on /results/<id>. It is never recomputed.', GREEN],
  ];
  let y = 1.82;
  steps.forEach(([head, body, colour], i) => {
    s.addShape(pres.shapes.OVAL, { x: M, y: y + 0.12, w: 0.42, h: 0.42, fill: { color: colour }, line: { width: 0 } });
    s.addText(String(i + 1), {
      x: M, y: y + 0.12, w: 0.42, h: 0.42, margin: 0,
      fontFace: BODY, fontSize: 12.5, bold: true, color: WHITE, align: 'center', valign: 'middle',
    });
    if (i < steps.length - 1) {
      s.addShape(pres.shapes.RECTANGLE, { x: M + 0.2, y: y + 0.56, w: 0.022, h: 0.34, fill: { color: HAIR }, line: { width: 0 } });
    }
    s.addText(head, { x: M + 0.7, y: y + 0.1, w: 3.4, h: 0.3, margin: 0, fontFace: MONO, fontSize: 12.5, bold: true, color: TEXT });
    s.addText(body, { x: M + 4.25, y: y + 0.04, w: CW - 4.25, h: 0.55, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED, lineSpacing: 16 });
    y += 0.9;
  });
}

/* ── 5b. How the predictive analysis works ── */
{
  const s = slide('How the predictive analysis works', 'From ten answers to a ranked list.', { titleH: 0.6 });

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

  let y = 1.85;
  stages.forEach(([step, head, body, colour], i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: M, y, w: CW, h: 0.86, fill: { color: WHITE }, line: { color: HAIR, width: 0.75 },
      shadow: shadow(),
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: M, y, w: 0.055, h: 0.86, fill: { color: colour }, line: { width: 0 },
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

/* ── 5c. What it is not ── */
{
  const s = slide('How the predictive analysis works', 'What it is, in plain terms.', { titleH: 0.6 });

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

  const colW = 6.06;
  [left, right].forEach((column, ci) => {
    let y = 1.85;
    column.forEach(([head, body]) => {
      const x = M + ci * (colW + 0.31);
      card(s, { x, y, w: colW, h: 1.35, accent: ci === 0 ? VIOLET : CYAN });
      s.addText(head, {
        x: x + 0.3, y: y + 0.16, w: colW - 0.6, h: 0.3, margin: 0,
        fontFace: DISPLAY, fontSize: 16, color: TEXT,
      });
      s.addText(body, {
        x: x + 0.3, y: y + 0.52, w: colW - 0.6, h: 0.72, margin: 0,
        fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 15,
      });
      y += 1.5;
    });
  });

  note(
    s,
    'Every one of these boundaries is enforced in the product copy, not just stated here — the results page never uses the word “should”.'
  );
}

/* ── 6. The model ── */
{
  const s = slide('The model', 'Four algorithms vote. None decides alone.', { titleH: 0.6 });
  const models = [
    ['K-Nearest\nNeighbours', 'k = 15, cosine', 'Finds the students who answered most like you.', 'weight 2', VIOLET],
    ['Logistic\nRegression', 'balanced classes', 'Learns which single answers push toward which field.', 'weight 2', VIOLET_LT],
    ['Random\nForest', '600 trees', 'Catches combinations — results and subject and temperament.', 'weight 1', CYAN],
    ['Bernoulli\nNaive Bayes', 'alpha = 0.5', 'Steadies the vote where a field has few examples.', 'weight 1', CYAN_LT],
  ];
  const cw = 2.82, gap = 0.32;
  models.forEach(([name, cfg, why, w8, colour], i) => {
    const x = M + i * (cw + gap);
    card(s, { x, y: 1.85, w: cw, h: 2.85, accent: colour });
    s.addText(name, { x: x + 0.3, y: 2.05, w: cw - 0.62, h: 0.75, margin: 0, fontFace: DISPLAY, fontSize: 17, color: TEXT, lineSpacing: 22 });
    s.addText(cfg, { x: x + 0.3, y: 2.85, w: cw - 0.62, h: 0.26, margin: 0, fontFace: MONO, fontSize: 10.5, color: colour });
    s.addText(why, { x: x + 0.3, y: 3.2, w: cw - 0.62, h: 1.05, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED, lineSpacing: 16 });
    s.addText(w8, { x: x + 0.3, y: 4.3, w: cw - 0.62, h: 0.26, margin: 0, fontFace: MONO, fontSize: 10.5, color: MUTED });
  });
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 5.05, w: CW, h: 1.15, fill: { color: VIOLET_PALE }, line: { color: HAIR, width: 0.75 } });
  s.addText('Soft voting', { x: M + 0.32, y: 5.2, w: CW - 0.64, h: 0.3, margin: 0, fontFace: DISPLAY, fontSize: 17, color: TEXT });
  s.addText('Each model returns a probability per field, and the four are averaged by weight. A model that is confidently wrong gets outvoted — which is the point. Scored with repeated stratified cross-validation: five folds, five repeats, never a single split.', {
    x: M + 0.32, y: 5.55, w: CW - 0.64, h: 0.6, margin: 0,
    fontFace: BODY, fontSize: 12, color: MUTED, lineSpacing: 16,
  });
}

/* ── 7. Accuracy ── */
{
  const s = slide('Accuracy', 'Both numbers, not just the flattering one.', { titleH: 0.6 });
  s.addChart(pres.charts.BAR, [{
    name: 'Top-3 accuracy',
    labels: ['With a stated\npre-U route', 'Without one yet', 'Naive baseline'],
    values: [71.5, 63.7, 49.3],
  }], {
    x: M, y: 1.85, w: 6.5, h: 3.6, barDir: 'col',
    chartColors: [VIOLET, CYAN, 'B0AAC4'],
    chartArea: { fill: { color: PAPER } },
    plotArea: { fill: { color: PAPER } },
    catAxisLabelColor: MUTED, valAxisLabelColor: MUTED,
    catAxisLabelFontFace: BODY, valAxisLabelFontFace: BODY,
    catAxisLabelFontSize: 11, valAxisLabelFontSize: 10,
    valGridLine: { color: HAIR, size: 0.5 }, catGridLine: { style: 'none' },
    valAxisMaxVal: 100, valAxisMinVal: 0,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: TEXT,
    dataLabelFontFace: MONO, dataLabelFontSize: 12, dataLabelFormatCode: '0.0"%"',
    showLegend: false,
  });
  const facts = [
    ['Top-3, not top-1', 'Success means the student’s actual field landed in the top three — the way the result is actually presented.'],
    ['n = 207', 'The confidence interval is roughly six points. A one- or two-point move is noise, not improvement.'],
    ['Honest about the gap', 'The lower figure appears on the site too. A student with no pre-U route yet gets the weaker prediction, and is told so.'],
  ];
  let y = 1.9;
  facts.forEach(([head, body]) => {
    card(s, { x: M + 7.0, y, w: CW - 7.0, h: 1.15, accent: VIOLET_LT });
    s.addText(head, { x: M + 7.3, y: y + 0.14, w: CW - 7.62, h: 0.3, margin: 0, fontFace: DISPLAY, fontSize: 16, color: TEXT });
    s.addText(body, { x: M + 7.3, y: y + 0.48, w: CW - 7.62, h: 0.6, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 15 });
    y += 1.28;
  });
  note(s, 'An early single-split run read 74.4%. It was an artefact of one lucky seed and was withdrawn. These figures come from ml/measure_paths.py, a committed script, so they can be re-run rather than trusted.');
}

/* ── 8. Privacy ── */
{
  const s = slide('Privacy engineering', 'The data is 207 teenagers. It is treated that way.', { titleH: 0.6 });
  const items = [
    ['k-anonymity', 'A field with fewer than 10 students publishes no statistics at all. It says so plainly rather than showing a number.', VIOLET],
    ['Count banding', 'Sample sizes appear as ranges — 10 to 19, 20 to 49 — never exact counts, so two pages cannot be subtracted.', VIOLET],
    ['Refresh gating', 'Published aggregates only move once at least three rows have changed, closing the temporal-differencing attack.', VIOLET],
    ['Row Level Security', 'A student can read only their own responses, enforced in Postgres — so an application bug cannot leak the rest.', CYAN],
    ['Locked at the grant layer', 'Admin routes are guarded in the app and the tables are locked by database privilege. One is convenience; the other is the control.', CYAN],
    ['The account is theirs', 'A student changes their own name, email and password — current password required — and deleting the account removes the responses and predictions, verified by row counts.', CYAN],
  ];
  const cw = 3.75, gap = 0.31;
  items.forEach(([head, body, colour], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = M + col * (cw + gap);
    const y = 1.9 + row * 1.85;
    card(s, { x, y, w: cw, h: 1.62, accent: colour });
    s.addText(head, { x: x + 0.3, y: y + 0.18, w: cw - 0.62, h: 0.3, margin: 0, fontFace: DISPLAY, fontSize: 16, color: TEXT });
    s.addText(body, { x: x + 0.3, y: y + 0.56, w: cw - 0.62, h: 0.95, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 15 });
  });
}

/* ── 9. Admin ── */
{
  const s = slide('Admin console', 'Seven sections, behind a role flag.', { titleH: 0.6 });
  const secs = [
    ['Overview', 'Live counts, recent activity, and where students drop off.'],
    ['Response Charts', 'Every question summarised as a distribution, Google-Forms style.'],
    ['Survey data', 'The 207-row corpus the model learns from, searchable and sortable.'],
    ['Responses', 'Every submission with the prediction it produced, opened row by row.'],
    ['Contributions', 'The moderation queue — approve or reject what students give back.'],
    ['People', 'Accounts, display names and who has admin access.'],
    ['Algorithm tester', 'Enter answers by hand and watch the model rank them live.'],
  ];
  let y = 1.85;
  secs.forEach(([head, body], i) => {
    card(s, { x: M, y, w: 7.4, h: 0.68, accent: i === 4 ? CYAN : VIOLET });
    s.addText(head, { x: M + 0.32, y, w: 2.55, h: 0.68, margin: 0, fontFace: DISPLAY, fontSize: 15.5, color: TEXT, valign: 'middle' });
    s.addText(body, { x: M + 3.0, y, w: 4.25, h: 0.68, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, valign: 'middle' });
    y += 0.78;
  });
  card(s, { x: M + 7.85, y: 1.85, w: CW - 7.85, h: 5.24, fill: INK });
  s.addText('Access control', { x: M + 8.2, y: 2.1, w: CW - 8.55, h: 0.32, margin: 0, fontFace: DISPLAY, fontSize: 19, color: WHITE });
  s.addText('Sidebar navigation, responsive from 320 to 1920 pixels.\n\nEntry is a discreet Admin button in the site footer — present for an admin, absent from the page entirely for everyone else, not merely hidden with CSS.\n\nVerified against production: the demo student account is redirected away from all five admin routes; the admin account reaches all five.', {
    x: M + 8.2, y: 2.55, w: CW - 8.55, h: 2.9, margin: 0,
    fontFace: BODY, fontSize: 12, color: ON_DARK, lineSpacing: 16.5,
  });
}

/* ── 10. Give-back loop ── */
{
  // Kept to one line: at 32pt the longer wording wrapped and the second line
  // ran into the cards at y=1.9.
  const s = slide('The give-back loop', 'How it improves, with a human in the loop.', { titleH: 0.6 });
  const chain = [
    ['Student contributes', 'An alumnus submits what they\nactually chose, and how it went.', VIOLET],
    ['Held unverified', 'Lands in alumni_profiles with\nverified = false. Nothing changes yet.', VIOLET_LT],
    ['Admin approves', 'Moderation queue. Approval\nrefreshes the published statistics.', CYAN],
    ['Human retrains', 'Export, refit, read the score,\ncommit, redeploy.', GREEN],
  ];
  const cw = 2.82, gap = 0.32;
  chain.forEach(([head, body, colour], i) => {
    const x = M + i * (cw + gap);
    card(s, { x, y: 1.9, w: cw, h: 1.9, accent: colour });
    s.addText(head, { x: x + 0.3, y: 2.08, w: cw - 0.62, h: 0.58, margin: 0, fontFace: DISPLAY, fontSize: 16.5, color: TEXT, lineSpacing: 21 });
    s.addText(body, { x: x + 0.3, y: 2.72, w: cw - 0.62, h: 0.9, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, lineSpacing: 15 });
    if (i < chain.length - 1) {
      s.addShape(pres.shapes.LINE, {
        x: x + cw + 0.05, y: 2.85, w: gap - 0.1, h: 0,
        line: { color: VIOLET_LT, width: 1.75, endArrowType: 'triangle' },
      });
    }
  });
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 4.2, w: CW, h: 1.65, fill: { color: INK }, line: { width: 0 } });
  s.addText('Retraining is deliberately manual.', {
    x: M + 0.35, y: 4.4, w: CW - 0.7, h: 0.36, margin: 0,
    fontFace: DISPLAY, fontSize: 20, color: WHITE,
  });
  s.addText('The model changes the advice given to teenagers about their education, and at 207 rows a small batch can move accuracy by more than the noise floor. A person reads the new score before it ships. That gate is a feature, not a missing automation — it can be revisited once the corpus is in the thousands.', {
    x: M + 0.35, y: 4.85, w: CW - 0.7, h: 0.85, margin: 0,
    fontFace: BODY, fontSize: 12.5, color: ON_DARK, lineSpacing: 17,
  });
  note(s, 'npm run export:training   →   python ml/train.py   →   read the accuracy   →   commit the artefacts   →   redeploy');
}

/* ── 11. Quality ── */
{
  const s = slide('Quality and verification', 'What has actually been proven.', { titleH: 0.6 });
  const stats = [
    ['387', 'JavaScript tests', VIOLET],
    ['36', 'Python tests', VIOLET_LT],
    ['84', 'commits', CYAN],
    ['10', 'database migrations', CYAN_LT],
  ];
  const cw = 2.82, gap = 0.32;
  stats.forEach(([n, label, colour], i) => {
    const x = M + i * (cw + gap);
    card(s, { x, y: 1.85, w: cw, h: 1.45, accent: colour });
    s.addText(n, { x: x + 0.3, y: 2.0, w: cw - 0.62, h: 0.72, margin: 0, fontFace: MONO, fontSize: 38, bold: true, color: colour });
    s.addText(label, { x: x + 0.3, y: 2.78, w: cw - 0.62, h: 0.3, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });
  });
  const proofs = [
    ['Encoder parity', 'Fixture tests pin the JavaScript encoder to the Python one, so the browser and the model can never disagree about what a student said.'],
    ['Privacy boundaries', 'Suppression, banding, and the refresh gate each have tests that fail if a published number becomes more precise than it should be.'],
    ['Role separation', 'Proven against the live production site, not only in unit tests.'],
    ['Full journey', 'Login through to a stored result, driven in a real browser.'],
  ];
  proofs.forEach(([head, body], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * (6.06 + 0.31);
    const y = 3.6 + row * 1.2;
    card(s, { x, y, w: 6.06, h: 1.02, accent: VIOLET });
    s.addText(head, { x: x + 0.3, y: y + 0.13, w: 5.5, h: 0.3, margin: 0, fontFace: DISPLAY, fontSize: 15.5, color: TEXT });
    s.addText(body, { x: x + 0.3, y: y + 0.45, w: 5.55, h: 0.5, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, lineSpacing: 14 });
  });
}

/* ── 12. Closing ── */
{
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.14, h: H, fill: { color: VIOLET }, line: { width: 0 } });
  s.addText('WHAT MAKES IT DEFENSIBLE', {
    x: M, y: 1.3, w: CW, h: 0.34, margin: 0,
    fontFace: BODY, fontSize: 11, bold: true, color: VIOLET_LT, charSpacing: 3,
  });
  s.addText('It says “students like you chose this.”\nIt does not say “you should study this.”', {
    x: M, y: 1.85, w: 11, h: 1.7, margin: 0,
    fontFace: DISPLAY, fontSize: 30, color: WHITE, lineSpacing: 44,
  });
  const closes = [
    'Both accuracy figures are published, including the weaker one.',
    'Fields with too few students show an honest message, never an invented statistic.',
    'Every number on screen can be traced back to the students it came from.',
  ];
  let y = 3.85;
  closes.forEach((t) => {
    s.addShape(pres.shapes.RECTANGLE, { x: M, y: y + 0.11, w: 0.09, h: 0.09, fill: { color: VIOLET_LT }, line: { width: 0 } });
    s.addText(t, { x: M + 0.32, y, w: 11, h: 0.32, margin: 0, fontFace: BODY, fontSize: 14, color: ON_DARK, valign: 'middle' });
    y += 0.55;
  });
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 5.75, w: 4.2, h: 0.02, fill: { color: VIOLET }, line: { width: 0 } });
  s.addText('arah-sand.vercel.app', {
    x: M, y: 5.95, w: 8, h: 0.34, margin: 0,
    fontFace: MONO, fontSize: 13, color: VIOLET_LT,
  });
}

pres.writeFile({ fileName: 'ARAH-System-Overview.pptx' }).then((f) => console.log('wrote', f));
