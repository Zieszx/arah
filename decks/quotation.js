// IzisTech — price quotation for the ARAH system build.
//
// The layout lives in decks/quotation-layout.js, shared with the report
// quotation so the two documents cannot drift apart visually. This file is
// only what makes this quotation this quotation.
//
// Run from decks/ — the logo and the output path are relative to the CWD:
//   cd decks && node quotation.js
const { writeQuotation } = require('./quotation-layout');

const VENDOR = {
  name: 'IzisTech',
  lines: ['Malaysia'],
  email: 'ieskandarzulqarnain@gmail.com',
  phone: '014-916 1793',
};
const CLIENT = { name: 'Nuha Khaleeda', lines: [] };
const QUOTE = {
  number: '1026',
  issued: '30 July 2026',
  validThrough: '30 August 2026',
  subject: 'ARAH — Post-SPM Academic Pathway Finder',
};
const LOGO = 'izistech-logo.png';
const OUT = 'ARAH-Quotation.docx';

// Short names in the table, detail in the Scope section.
const ITEMS = [
  ['Requirements & research', 1, 25],
  ['System design & database', 1, 30],
  ['Machine learning engine', 1, 55],
  ['Student web application', 1, 55],
  ['Administration console', 1, 45],
  ['Testing & quality assurance', 1, 20],
  ['Deployment & configuration', 1, 20],
  ['Documentation & handover', 1, 10],
];

const SCOPE = [
  ['Requirements & research', 'Study of the 207-response post-SPM survey, review of published Ministry of Higher Education statistics, evaluation of third-party datasets, and definition of the ten predictive questions and ten outcome fields.'],
  ['System design & database', 'PostgreSQL schema across 12 migrations, row-level access control, admin privilege separation, and the privacy rules that protect fields with small samples.'],
  ['Machine learning engine', 'Four-model prediction ensemble in Python, a feature encoder mirrored in JavaScript, the training pipeline, and accuracy measurement across both prediction paths.'],
  ['Student web application', 'Landing page, ten-question flow, ranked results, field explorer, contribution form, privacy page, authentication, and a full account area. Responsive 320px to 1920px.'],
  ['Administration console', 'Overview, response charts, survey data browser, student responses, contribution moderation, people management, and a live algorithm tester.'],
  ['Testing & quality assurance', '434 automated tests covering encoder parity, the privacy rules, and access guards, plus end-to-end verification of both user journeys against the live system.'],
  ['Deployment & configuration', 'Production deployment running two services from one repository, domain routing, and performance tuning.'],
  ['Documentation & handover', 'Technical documentation, retraining procedure, open-issues register, a restorable database export, and two presentation decks.'],
];

const TERMS = [
  'Payment is due upon acceptance of delivery.',
  `This quotation is valid through ${QUOTE.validThrough}.`,
  'Hosting runs on the client’s own Vercel and Supabase accounts. Third-party charges are billed to the client directly and are not included above.',
  'Support for defects in the delivered work is included for thirty (30) days from handover.',
  'All source code, data and materials transfer to the client upon payment.',
  'Accuracy is reported in full: 71.5% top-three accuracy with a stated pre-university route and 63.7% without, against a 49.3% baseline. Both figures appear in the system itself.',
  'The model is trained only on the 207 real survey responses. No synthetic or third-party data is used.',
];

writeQuotation({ VENDOR, CLIENT, QUOTE, LOGO, ITEMS, SCOPE, TERMS }, OUT).then((r) => {
  console.log(`wrote ${OUT} — ${r.items.length} items, RM ${r.TOTAL.toFixed(2)}`);
  console.log(`in words: ${r.words}`);
});
