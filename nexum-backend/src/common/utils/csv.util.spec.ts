import { toCsv } from './csv.util';

interface Row {
  name: string | null;
  qty?: number;
}

const columns = [
  { header: 'Name', value: (r: Row) => r.name },
  { header: 'Qty', value: (r: Row) => r.qty },
];

const body = (csv: string) => csv.replace('\uFEFF', '').trimEnd().split('\r\n');

describe('toCsv', () => {
  it('starts with a UTF-8 BOM and uses CRLF line endings', () => {
    const csv = toCsv(columns, [{ name: 'A', qty: 1 }]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(body(csv)).toEqual(['Name,Qty', 'A,1']);
  });

  it('quotes cells containing commas, quotes and newlines', () => {
    const lines = body(
      toCsv(columns, [
        { name: 'Kebede, Abebe' },
        { name: 'She said "hi"' },
        { name: 'two\nlines' },
      ]),
    );
    expect(lines[1]).toBe('"Kebede, Abebe",');
    expect(lines[2]).toBe('"She said ""hi""",');
    expect(lines[3]).toBe('"two\nlines",');
  });

  it('turns null and undefined into empty cells', () => {
    expect(body(toCsv(columns, [{ name: null }]))[1]).toBe(',');
  });

  it('neutralises spreadsheet formulas', () => {
    const lines = body(
      toCsv(columns, [
        { name: '=HYPERLINK("http://evil","click")' },
        { name: '@SUM(A1:A9)' },
        { name: '+cmd|x' },
        { name: '-2+3' },
      ]),
    );
    expect(lines[1].startsWith(`"'=HYPERLINK`)).toBe(true);
    expect(lines[2]).toBe("'@SUM(A1:A9),");
    expect(lines[3]).toBe("'+cmd|x,");
    expect(lines[4]).toBe("'-2+3,");
  });

  it('leaves phone numbers and real numbers alone', () => {
    const lines = body(
      toCsv(columns, [{ name: '+251911223344', qty: -5 }]),
    );
    expect(lines[1]).toBe('+251911223344,-5');
  });

  it('keeps Amharic text intact', () => {
    expect(body(toCsv(columns, [{ name: 'አበበ ከበደ' }]))[1]).toBe('አበበ ከበደ,');
  });
});