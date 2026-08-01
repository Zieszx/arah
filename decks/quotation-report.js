// IzisTech — price quotation for the capstone report, Chapters 3 and 4.
//
// Same layout as the system quotation (decks/quotation-layout.js), because it
// is the same client and the same template. Only the subject, the ledger and
// the terms differ.
//
// Run from decks/ — the logo and the output path are relative to the CWD:
//   cd decks && node quotation-report.js
const { writeQuotation } = require('./quotation-layout');

const VENDOR = {
  name: 'IzisTech',
  lines: ['Malaysia'],
  email: 'ieskandarzulqarnain@gmail.com',
  phone: '014-916 1793',
};
const CLIENT = { name: 'Nuha Khaleeda', lines: [] };
const QUOTE = {
  number: '1027',
  issued: '1 August 2026',
  validThrough: '1 September 2026',
  subject: 'ARAH — Capstone Report, Chapters 3 and 4',
};
const LOGO = 'izistech-logo.png';
const OUT = 'ARAH-Report-Quotation.docx';

// Short names in the table, detail in the Scope section. Totals RM 140.
const ITEMS = [
  ['Chapter 3 — Methodology', 1, 40],
  ['Chapter 4 — Results & Discussion', 1, 45],
  ['Model re-measurement & result charts', 1, 25],
  ['System diagrams & interface captures', 1, 20],
  ['Acceptance walkthrough & defect report', 1, 10],
];

const SCOPE = [
  ['Chapter 3 — Methodology', 'Software development life cycle across six phases, twenty-seven functional requirements in five modules and eighteen non-functional requirements in four categories, use case and activity diagrams, the four-layer architecture, the entity relationship diagram, and the tools and technologies section.'],
  ['Chapter 4 — Results & Discussion', 'Model training and evaluation, backend and API design, the interface and experience walkthrough, system testing, model testing, and the user acceptance testing instrument. Twenty tables in total across both chapters.'],
  ['Model re-measurement & result charts', 'Each of the four ensemble members re-measured alone under the project’s own repeated cross-validation protocol, reproducing the published 71.5% and 63.7% figures, plus the learning curve, confusion matrix, per-field recall and fold-variance charts drawn from those measurements rather than quoted.'],
  ['System diagrams & interface captures', 'Six diagrams drawn for the report — life cycle, use case, activity, prediction pipeline, architecture and entity relationship — seven result charts, and fourteen interface captures taken from the deployed system. Twenty-seven figures in total.'],
  ['Acceptance walkthrough & defect report', 'Twelve acceptance tasks executed against the deployment with response times recorded, three defects documented, and the two that were fixed re-measured after release.'],
];

const TERMS = [
  'Payment is due upon acceptance of delivery.',
  `This quotation is valid through ${QUOTE.validThrough}.`,
  'Covers Chapters 3 and 4 only. Chapters 1, 2 and 5 are outside this quotation.',
  'Delivered as a Word document styled to match the report format the unit uses, so it carries the same heading, caption and table styles and can be merged into the main report without restyling.',
  'Figure and table numbering runs from 1 within the delivered chapters, and will need renumbering once merged into the full report.',
  'No figure is quoted from memory. The accuracy results are reproducible from the delivered corpus using the measurement script already in the source code; the response times were measured against the deployed system.',
  'User acceptance testing with human participants is not included. The questionnaire is delivered ready to run, together with an analysis script that produces the charts and percentages once responses are collected.',
];

writeQuotation({ VENDOR, CLIENT, QUOTE, LOGO, ITEMS, SCOPE, TERMS }, OUT).then((r) => {
  console.log(`wrote ${OUT} — ${r.items.length} items, RM ${r.TOTAL.toFixed(2)}`);
  console.log(`in words: ${r.words}`);
});
