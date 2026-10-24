export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

// Spreadsheet apps run a cell that starts with one of these as a formula, so
// a tenant named "=HYPERLINK(...)" could attack whoever opens the export.
const FORMULA_START = /^[=+\-@\t\r]/;
// A phone number such as +251911223344 starts with "+" but is harmless.
const PHONE_OR_NUMBER = /^[+-][\d\s().-]*$/;

function escapeCell(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';

  let text = String(raw);

  if (typeof raw === 'string' && FORMULA_START.test(text) && !PHONE_OR_NUMBER.test(text)) {
    text = `'${text}`;
  }

  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

/**
 * Builds a CSV that opens correctly in Excel: a UTF-8 byte-order mark (so
 * Amharic names display), CRLF line endings, and safely quoted cells.
 */
export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCell(c.value(row))).join(','),
  );

  return `\uFEFF${[header, ...lines].join('\r\n')}\r\n`;
}
