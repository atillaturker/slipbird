import { fitForParser, isReadable, joinPages, MAX_PARSER_CHARS } from '../ocr-text';

describe('joinPages', () => {
  it('marks page breaks after the first page', () => {
    expect(joinPages(['MIGROS\nSüt 42,50', ' TOPLAM 42,50 '])).toBe('MIGROS\nSüt 42,50\n--- page 2 ---\nTOPLAM 42,50');
  });
});

describe('isReadable', () => {
  it('needs at least 20 real characters', () => {
    expect(isReadable('MIGROS TOPLAM 42,50')).toBe(false); // 17 non-space chars
    expect(isReadable('MIGROS JET TOPLAM 142,50')).toBe(true);
    expect(isReadable('--- page 2 ---\n  \n ')).toBe(false);
  });
});

describe('fitForParser', () => {
  it('leaves short text alone', () => {
    expect(fitForParser('abc')).toBe('abc');
  });

  it('keeps the start and the end of long text within the limit', () => {
    const text = `HEADER ${'x'.repeat(20_000)} TOPLAM 42,50`;
    const fitted = fitForParser(text);
    expect(fitted.length).toBeLessThanOrEqual(MAX_PARSER_CHARS);
    expect(fitted.startsWith('HEADER')).toBe(true);
    expect(fitted.endsWith('TOPLAM 42,50')).toBe(true);
  });
});
