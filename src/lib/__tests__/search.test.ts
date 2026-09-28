import { buildSearchText, likePattern, normalizeSearch } from '../search';

describe('normalizeSearch', () => {
  it('folds Turkish letters both ways', () => {
    expect(normalizeSearch('İSTANBUL')).toBe('istanbul');
    expect(normalizeSearch('ıspanak')).toBe('ispanak');
    expect(normalizeSearch('ŞOK Market')).toBe('sok market');
    expect(normalizeSearch('Çiğ köfte')).toBe('cig kofte');
    expect(normalizeSearch('Gürsoy Ünlü Ödeme')).toBe('gursoy unlu odeme');
  });

  it('matches English capitals typed either way', () => {
    expect(normalizeSearch('IKEA')).toBe(normalizeSearch('ikea'));
    expect(normalizeSearch('Café')).toBe('cafe');
  });

  it('collapses whitespace', () => {
    expect(normalizeSearch('  Migros   Jet \n')).toBe('migros jet');
  });
});

describe('buildSearchText', () => {
  it('joins merchant, note and items', () => {
    expect(buildSearchText('Migros', 'Haftalık alışveriş', ['Süt', 'Ekmek'])).toBe('migros haftalik alisveris sut ekmek');
    expect(buildSearchText(null, null, [])).toBe('');
  });
});

describe('likePattern', () => {
  it('normalises and escapes wildcards', () => {
    expect(likePattern('ŞOK')).toBe('%sok%');
    expect(likePattern('50%_off')).toBe('%50\\%\\_off%');
  });
});
