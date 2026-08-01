// IzisTech — the quotation layout, shared by every quotation.
//
// Extracted from decks/quotation.js when a second quotation was needed, so the
// two documents cannot drift apart visually. Everything that varies between
// quotations is a parameter; everything that defines the template lives here.
//
// Laid out to the classic invoicing template the client referenced: small logo
// top-left, vendor block left with MADE FOR opposite, a fully boxed ledger
// table with a solid header bar and vertical rules, amount in words italic
// under the table on the left, and the totals stacked on the right.
//
// The crowding in an early draft came from long descriptions inside the table,
// not from the number of columns — the reference carries five columns and
// reads clean because every row is ONE line. So the table holds short item
// names only, and the detail moves to a Scope section below it.
//
// A4, because this is a Malaysian document.
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  LevelFormat, Footer,
} = require('docx');

// Header bar is a darkened brand teal rather than the logo's mid-tone: white
// text on #1A8F8F measures about 3.9:1, which is under the 4.5:1 floor. This
// lands near 5.9:1 and still reads as the same family.
const BAR = '146B6B';
const ACCENT = '1A8F8F';
const INK = '13322F';
const MUTED = '6B7280';
const RULE = 'B9C6C6';

const PAGE_W = 11906; // A4
const PAGE_H = 16838;
const MARGIN = 1440;
const CONTENT_W = PAGE_W - MARGIN * 2; // 9026

// ── Amount in words ────────────────────────────────────────────────────────
// Derived, never typed: a changed line must not leave a stale figure behind.
const ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
  'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
  'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

function underThousand(n) {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) {
    const r = n % 10;
    return r ? `${TENS[Math.floor(n / 10)]}-${ONES[r]}` : TENS[Math.floor(n / 10)];
  }
  const r = n % 100;
  const h = `${ONES[Math.floor(n / 100)]} HUNDRED`;
  return r ? `${h} ${underThousand(r)}` : h;
}

function inWords(amount) {
  const whole = Math.floor(amount);
  const sen = Math.round((amount - whole) * 100);
  let out = '';
  const th = Math.floor(whole / 1000);
  if (th) out += `${underThousand(th)} THOUSAND `;
  const rest = whole % 1000;
  if (rest) out += underThousand(rest);
  out = out.trim() || 'ZERO';
  return sen
    ? `${out} RINGGIT AND ${underThousand(sen)} SEN`
    : `${out} RINGGIT ONLY`;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const line = { style: BorderStyle.SINGLE, size: 4, color: RULE };
const boxed = { top: line, bottom: line, left: line, right: line };
const none = {
  top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
};
const pad = { top: 90, bottom: 90, left: 130, right: 130 };

const t = (text, o = {}) => new TextRun({ text, font: 'Arial', ...o });
const p = (text, o = {}) => {
  const { run = {}, ...rest } = o;
  return new Paragraph({ children: [t(text, run)], ...rest });
};
const money = (n) => n.toFixed(2);

function cell(children, { width, shading, borders = boxed, valign, margins = pad } = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    ...(shading ? { shading: { fill: shading, type: ShadingType.CLEAR } } : {}),
    margins,
    ...(valign ? { verticalAlign: valign } : {}),
    children: Array.isArray(children) ? children : [children],
  });
}

// DESCRIPTION | QTY | UNIT PRICE | AMOUNT — the reference's shape.
const COL = { desc: 4226, qty: 1000, unit: 1900, amt: 1900 };
const COLS = [COL.desc, COL.qty, COL.unit, COL.amt];

function head(label, width, align = AlignmentType.CENTER) {
  return cell(
    new Paragraph({ alignment: align, children: [t(label, { bold: true, size: 16, color: 'FFFFFF', characterSpacing: 20 })] }),
    { width, shading: BAR, borders: { top: none.top, bottom: none.bottom, left: none.left, right: none.right }, margins: { top: 120, bottom: 120, left: 130, right: 130 } }
  );
}

// Empty rows so the ledger keeps the formal boxed shape of the reference
// rather than stopping abruptly at the last item.
function fillerRow() {
  return new TableRow({
    children: COLS.map((w) => cell(p('', { run: { size: 16 } }), { width: w, margins: { top: 80, bottom: 80, left: 130, right: 130 } })),
  });
}

/**
 * Build a quotation document.
 *
 * @param {object} cfg
 * @param {object} cfg.VENDOR  { name, lines[], email, phone }
 * @param {object} cfg.CLIENT  { name, lines[] }
 * @param {object} cfg.QUOTE   { number, issued, validThrough, subject }
 * @param {string} cfg.LOGO    path to the logo, resolved against the CWD
 * @param {Array}  cfg.ITEMS   [description, qty, unitPrice][]
 * @param {Array}  cfg.SCOPE   [title, detail][]
 * @param {Array}  cfg.TERMS   string[]
 */
function buildQuotation({ VENDOR, CLIENT, QUOTE, LOGO, ITEMS, SCOPE, TERMS }) {
  const items = ITEMS.map(([desc, qty, unit]) => ({ desc, qty, unit, amount: qty * unit }));
  const SUBTOTAL = items.reduce((s, i) => s + i.amount, 0);
  const TOTAL = SUBTOTAL;

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 18, color: INK } } } },
    numbering: {
      config: [{
        reference: 'terms',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 380, hanging: 260 } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: 1200, right: MARGIN, bottom: 1000, left: MARGIN },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 8 } },
              children: [t(`${VENDOR.name}   ·   ${VENDOR.email}   ·   ${VENDOR.phone}`, { size: 14, color: MUTED })],
            }),
          ],
        }),
      },
      children: [
        // ── Logo ───────────────────────────────────────────────────────────
        new Paragraph({
          spacing: { after: 260 },
          children: [
            new ImageRun({
              type: 'png',
              data: fs.readFileSync(LOGO),
              // 843x639 source, ratio held.
              transformation: { width: 66, height: 50 },
              altText: { title: 'IzisTech', description: 'IzisTech logo', name: 'IzisTech logo' },
            }),
          ],
        }),

        // ── Vendor left, MADE FOR right ────────────────────────────────────
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [4513, 4513],
          rows: [
            new TableRow({
              children: [
                cell(
                  [
                    // No VENDOR.name line here: the logo directly above already
                    // carries the wordmark, and repeating it as text read as the
                    // company name printed twice.
                    ...VENDOR.lines.map((l) => p(l, { spacing: { after: 30 }, run: { size: 16, color: MUTED } })),
                    p(`Email: ${VENDOR.email}`, { spacing: { after: 30 }, run: { size: 16, color: MUTED } }),
                    p(`Phone: ${VENDOR.phone}`, { run: { size: 16, color: MUTED } }),
                  ],
                  { width: 4513, borders: none, margins: { top: 0, bottom: 0, left: 0, right: 200 } }
                ),
                cell(
                  [
                    p('MADE FOR', { spacing: { after: 70 }, run: { bold: true, size: 16, color: INK, characterSpacing: 20 } }),
                    p(CLIENT.name, { spacing: { after: 30 }, run: { bold: true, size: 20, color: ACCENT } }),
                    ...CLIENT.lines.map((l) => p(l, { spacing: { after: 30 }, run: { size: 16, color: MUTED } })),
                  ],
                  { width: 4513, borders: none, margins: { top: 0, bottom: 0, left: 0, right: 0 } }
                ),
              ],
            }),
          ],
        }),

        p('', { spacing: { after: 340 } }),

        // ── Subject left, dates right ──────────────────────────────────────
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [4513, 4513],
          rows: [
            new TableRow({
              children: [
                cell(
                  [
                    p('SUBJECT', { spacing: { after: 50 }, run: { bold: true, size: 15, color: MUTED, characterSpacing: 20 } }),
                    p(QUOTE.subject, { run: { size: 17 } }),
                  ],
                  { width: 4513, borders: none, margins: { top: 0, bottom: 0, left: 0, right: 200 } }
                ),
                cell(
                  [
                    new Paragraph({
                      spacing: { after: 40 },
                      children: [t('Issue Date: ', { size: 16, color: MUTED }), t(QUOTE.issued, { size: 16 })],
                    }),
                    new Paragraph({
                      spacing: { after: 40 },
                      children: [t('Valid Through: ', { size: 16, color: MUTED }), t(QUOTE.validThrough, { size: 16, bold: true })],
                    }),
                    new Paragraph({
                      children: [t('Price Quote #: ', { size: 16, color: MUTED }), t(QUOTE.number, { size: 16, bold: true })],
                    }),
                  ],
                  { width: 4513, borders: none, margins: { top: 0, bottom: 0, left: 0, right: 0 } }
                ),
              ],
            }),
          ],
        }),

        p('', { spacing: { after: 400 } }),

        // ── Ledger ─────────────────────────────────────────────────────────
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: COLS,
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                head('DESCRIPTION', COL.desc, AlignmentType.LEFT),
                head('QTY', COL.qty),
                head('UNIT PRICE', COL.unit, AlignmentType.RIGHT),
                head('AMOUNT', COL.amt, AlignmentType.RIGHT),
              ],
            }),
            ...items.map((item) =>
              new TableRow({
                children: [
                  cell(p(item.desc, { run: { size: 17 } }), { width: COL.desc }),
                  cell(new Paragraph({ alignment: AlignmentType.CENTER, children: [t(String(item.qty), { size: 17 })] }), { width: COL.qty }),
                  cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [t(money(item.unit), { size: 17 })] }), { width: COL.unit }),
                  cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [t(money(item.amount), { size: 17 })] }), { width: COL.amt }),
                ],
              })
            ),
            fillerRow(),
            fillerRow(),
          ],
        }),

        p('', { spacing: { after: 160 } }),

        // ── Words left, totals right ───────────────────────────────────────
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [5226, 1900, 1900],
          rows: [
            new TableRow({
              children: [
                cell(
                  p(inWords(TOTAL), { run: { size: 15, italics: true, color: INK } }),
                  { width: 5226, borders: none, valign: VerticalAlign.BOTTOM, margins: { top: 60, bottom: 0, left: 0, right: 200 } }
                ),
                cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [t('SUBTOTAL', { size: 16, color: MUTED, characterSpacing: 20 })] }),
                  { width: 1900, borders: none, margins: { top: 60, bottom: 40, left: 0, right: 130 } }),
                cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [t(`RM ${money(SUBTOTAL)}`, { size: 17 })] }),
                  { width: 1900, borders: none, margins: { top: 60, bottom: 40, left: 0, right: 0 } }),
              ],
            }),
            new TableRow({
              children: [
                cell(p(''), { width: 5226, borders: none, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
                cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [t('TOTAL', { bold: true, size: 18, characterSpacing: 20 })] }),
                  { width: 1900, borders: { ...none, top: { style: BorderStyle.SINGLE, size: 4, color: RULE } }, margins: { top: 110, bottom: 60, left: 0, right: 130 } }),
                cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [t(`RM ${money(TOTAL)}`, { bold: true, size: 20, color: ACCENT })] }),
                  { width: 1900, borders: { ...none, top: { style: BorderStyle.SINGLE, size: 4, color: RULE } }, margins: { top: 110, bottom: 60, left: 0, right: 0 } }),
              ],
            }),
          ],
        }),

        p('All amounts in Malaysian Ringgit (MYR). No tax applied.', {
          spacing: { before: 100, after: 420 }, run: { size: 14, color: MUTED },
        }),

        // ── Scope ──────────────────────────────────────────────────────────
        // The detail the ledger deliberately leaves out.
        new Paragraph({
          spacing: { after: 160 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 8 } },
          children: [t('SCOPE OF WORK', { bold: true, size: 15, color: ACCENT, characterSpacing: 30 })],
        }),
        ...SCOPE.flatMap(([title, detail]) => [
          p(title, { spacing: { after: 30 }, run: { bold: true, size: 16 } }),
          p(detail, { spacing: { after: 120 }, run: { size: 15, color: MUTED } }),
        ]),

        // ── Terms ──────────────────────────────────────────────────────────
        new Paragraph({
          spacing: { before: 260, after: 160 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 8 } },
          children: [t('TERMS & CONDITIONS', { bold: true, size: 15, color: ACCENT, characterSpacing: 30 })],
        }),
        ...TERMS.map((l) =>
          new Paragraph({
            numbering: { reference: 'terms', level: 0 },
            spacing: { after: 80 },
            children: [t(l, { size: 15, color: MUTED })],
          })
        ),

        // ── Signatures ─────────────────────────────────────────────────────
        p('', { spacing: { after: 520 } }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [4513, 4513],
          rows: [
            new TableRow({
              children: [
                cell(
                  [
                    new Paragraph({
                      spacing: { after: 60 },
                      border: { top: { style: BorderStyle.SINGLE, size: 4, color: INK, space: 8 } },
                      children: [t('Authorised Signature', { size: 15, color: MUTED })],
                    }),
                    p(VENDOR.name, { run: { size: 16, bold: true } }),
                  ],
                  { width: 4513, borders: none, margins: { top: 0, bottom: 0, left: 0, right: 400 } }
                ),
                cell(
                  [
                    new Paragraph({
                      spacing: { after: 60 },
                      border: { top: { style: BorderStyle.SINGLE, size: 4, color: INK, space: 8 } },
                      children: [t('Client Acceptance', { size: 15, color: MUTED })],
                    }),
                    p(CLIENT.name, { run: { size: 16, bold: true } }),
                  ],
                  { width: 4513, borders: none, margins: { top: 0, bottom: 0, left: 400, right: 0 } }
                ),
              ],
            }),
          ],
        }),
      ],
    }],
  });

  return { doc, items, SUBTOTAL, TOTAL, words: inWords(TOTAL) };
}

/** Build and write. Returns the totals so the caller can report them. */
function writeQuotation(cfg, outPath) {
  const built = buildQuotation(cfg);
  return Packer.toBuffer(built.doc).then((buffer) => {
    fs.writeFileSync(outPath, buffer);
    return built;
  });
}

module.exports = { buildQuotation, writeQuotation, inWords, money };
