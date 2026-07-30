// Layout arithmetic for the response charts. Pure and shared, because two
// places need the same answer and disagreeing would be visible: the card
// reserves space before the chart loads, and the chart sizes itself once it
// mounts.
//
// This exists because of a real failure. The first version used a flat 38px
// per bar. At 390px the y-axis column is only ~104px wide, so a label like
// "Accountancy & Commerce (Perniagaan, Ekonomi etc)" wraps to four lines —
// about 56px of text in a 38px slot — and consecutive labels rendered on top
// of each other, unreadable. Row height has to follow how much the labels
// actually wrap, not a constant.

/** Width of the category-label column, by viewport. */
export function axisWidthFor(viewportWidth) {
  if (viewportWidth < 400) return 104;
  if (viewportWidth < 640) return 140;
  if (viewportWidth < 1024) return 190;
  return 260;
}

// Recharts' tick renderer wraps on word boundaries at ~12px. 0.5em average
// advance is a deliberate slight over-estimate of character width: guessing
// too wide costs a few pixels of whitespace, guessing too narrow puts labels
// back on top of each other.
const FONT_SIZE = 12;
const AVG_CHAR_WIDTH = FONT_SIZE * 0.5;
const LINE_HEIGHT = 14;
const MIN_ROW_HEIGHT = 38;

/** Roughly how many lines `label` wraps to inside `axisWidth` pixels. */
export function estimateLines(label, axisWidth) {
  const text = String(label ?? '');
  if (!text) return 1;
  const charsPerLine = Math.max(4, Math.floor(axisWidth / AVG_CHAR_WIDTH));
  // Word wrapping cannot split a long word, so a label whose longest word
  // exceeds the column still occupies at least one line for it.
  const words = text.split(/\s+/).filter(Boolean);
  let lines = 1;
  let used = 0;
  for (const word of words) {
    if (used === 0) {
      // First word on this line. It always fits here, even if it is longer
      // than the column — wrapping cannot break inside a word, so counting
      // it as a second line would over-reserve on every chart.
      used = word.length;
      continue;
    }
    const need = used + 1 + word.length;
    if (need <= charsPerLine) {
      used = need;
    } else {
      lines += 1;
      used = word.length;
    }
  }
  return lines;
}

/** Vertical space one bar's row needs, label wrapping included. */
export function rowHeightFor(entries, axisWidth) {
  const longest = entries.reduce(
    (max, entry) => Math.max(max, estimateLines(entry.label, axisWidth)),
    1
  );
  return Math.max(MIN_ROW_HEIGHT, longest * LINE_HEIGHT + 12);
}

/**
 * Total chart height.
 *
 * A linear scale is a column chart with a fixed height — its categories are
 * short numbers along the bottom and never wrap. Everything else is a
 * horizontal bar chart whose height grows with both the number of bars and
 * how far their labels wrap.
 */
export function chartHeightFor(entries, type, axisWidth) {
  if (type === 'num') return 220;
  const rows = Array.isArray(entries) ? entries : [];
  if (rows.length === 0) return 160;
  return Math.max(160, rows.length * rowHeightFor(rows, axisWidth) + 40);
}
