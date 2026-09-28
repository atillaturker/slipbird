import { categoryFromRule, normalizeMerchant } from '../merchant-rules';

describe('normalizeMerchant', () => {
  it.each([
    ['MİGROS TİCARET A.Ş.', 'migros'],
    ['Migros Ticaret A.S. Şube 123', 'migros'],
    ['Migros Jet #1234', 'migros jet'],
    ['BİM Birleşik Mağazalar A.Ş.', 'bim birlesik magazalar'],
    ['ŞOK MARKETLER TİC. A.Ş. 5123', 'sok marketler'],
    ['Kahve Dünyası Gıda San. ve Tic. Ltd. Şti.', 'kahve dunyasi gida'],
    ['Starbucks Coffee Store #12345', 'starbucks coffee'],
    ["Joe's Café, Inc.", 'joes cafe'],
    ['Tesco Stores Ltd', 'tesco stores'],
    ['  a101  ', 'a101'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeMerchant(input)).toBe(expected);
  });

  it('matches spelling variants of the same shop', () => {
    expect(normalizeMerchant('MIGROS')).toBe(normalizeMerchant('Migros Tic. A.Ş.'));
    expect(normalizeMerchant('Şok Market')).toBe(normalizeMerchant('SOK MARKET'));
  });

  it('keeps a name that is only a legal word', () => {
    expect(normalizeMerchant('Ticaret')).toBe('ticaret');
  });

  it('returns null for nothing', () => {
    expect(normalizeMerchant('')).toBeNull();
    expect(normalizeMerchant(null)).toBeNull();
    expect(normalizeMerchant('#123')).toBeNull();
  });
});

describe('categoryFromRule', () => {
  it('prefers the saved rule', () => {
    expect(categoryFromRule('dining', 'groceries')).toEqual({ category: 'dining', fromRule: true });
    expect(categoryFromRule(null, 'groceries')).toEqual({ category: 'groceries', fromRule: false });
  });
});
