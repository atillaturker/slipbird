import en from '../en.json';
import tr from '../tr.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? { ...acc, [path]: value } : { ...acc, ...flatten(value, path) };
  }, {});
}

const flatEn = flatten(en);
const flatTr = flatten(tr);

describe('translations', () => {
  it('have the same keys in en and tr', () => {
    expect(Object.keys(flatTr).sort()).toEqual(Object.keys(flatEn).sort());
  });

  it('have no empty strings', () => {
    for (const [key, value] of Object.entries({ ...flatEn, ...flatTr })) {
      expect([key, value.trim().length > 0]).toEqual([key, true]);
    }
  });

  it('use the same interpolation variables in both languages', () => {
    const vars = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort();
    for (const key of Object.keys(flatEn)) {
      expect([key, vars(flatTr[key] ?? '')]).toEqual([key, vars(flatEn[key])]);
    }
  });

  it('contain no exclamation marks', () => {
    for (const [key, value] of Object.entries({ ...flatEn, ...flatTr })) {
      expect([key, value.includes('!')]).toEqual([key, false]);
    }
  });
});
