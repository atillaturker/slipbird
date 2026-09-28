import { formatDecimal, parseDecimal } from '../number';

describe('parseDecimal', () => {
  it('accepts either decimal separator and a percent sign', () => {
    expect(parseDecimal('0,45')).toBe(0.45);
    expect(parseDecimal('1.5')).toBe(1.5);
    expect(parseDecimal(' 2 ')).toBe(2);
    expect(parseDecimal('%10')).toBe(10);
    expect(parseDecimal('20 %')).toBe(20);
  });

  it('rejects anything else', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('-1')).toBeNull();
    expect(parseDecimal('1.000,5')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
  });
});

describe('formatDecimal', () => {
  it('uses the locale separator without grouping', () => {
    expect(formatDecimal(0.45, 'tr')).toBe('0,45');
    expect(formatDecimal(0.45, 'en')).toBe('0.45');
    expect(formatDecimal(1000, 'en')).toBe('1000');
    expect(formatDecimal(10, 'tr')).toBe('10');
  });
});
