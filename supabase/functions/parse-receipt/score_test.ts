import { assertEquals } from 'jsr:@std/assert@1';

import { cagriExpected, gramsExpected, longExpected } from './fixtures.ts';
import { fold, scoreParse } from './score.ts';
import { ParsedReceiptSchema } from './schema.ts';

const parse = (v: unknown) => ParsedReceiptSchema.parse(v);

Deno.test('fold ignores case, Turkish letters and accents', () => {
  assertEquals(fold('ÇAĞRI MAĞAZACILIK A.Ş.'), fold('Çağrı Mağazacılık A.Ş.'));
  assertEquals(fold('İSTANBUL ışık'), 'istanbul isik');
});

Deno.test('the fixtures score perfectly against themselves', () => {
  for (const f of [cagriExpected, gramsExpected, longExpected]) {
    const score = scoreParse(parse(f), f);
    assertEquals(score.notes, []);
    assertEquals(score.passed, score.total);
  }
});

Deno.test('capital letters for the merchant are fine (a printed name in capitals)', () => {
  const upper = parse({ ...cagriExpected, merchant: { value: 'ÇAĞRI MAĞAZACILIK A.Ş.', confidence: 'high' } });
  assertEquals(scoreParse(upper, cagriExpected).checks.merchant, true);
});

Deno.test('250 g and 0.25 kg are the same answer, but a missing or wrong unit is caught', () => {
  const items = (patch: Record<string, unknown>) => gramsExpected.items.map((i, n) => (n === 0 ? { ...i, ...patch } : i));
  assertEquals(scoreParse(parse({ ...gramsExpected, items: items({ qty: 0.35, unit: 'kg' }) }), gramsExpected).checks.quantities, true);
  assertEquals(scoreParse(parse({ ...gramsExpected, items: items({ unit: null }) }), gramsExpected).checks.quantities, false);
  assertEquals(scoreParse(parse({ ...gramsExpected, items: items({ qty: 350, unit: 'kg' }) }), gramsExpected).checks.quantities, false);
});

Deno.test('a unit invented for a pack size is caught', () => {
  const items = cagriExpected.items.map((i, n) => (n === 0 ? { ...i, qty: 1, unit: 'kg' } : i));
  const score = scoreParse(parse({ ...cagriExpected, items }), cagriExpected);
  assertEquals(score.checks.quantities, false);
});

Deno.test('a missing currency and a changed amount are caught', () => {
  const noCurrency = scoreParse(parse({ ...cagriExpected, currency: { value: null, confidence: 'low' } }), cagriExpected);
  assertEquals(noCurrency.checks.currency, false);
  const items = cagriExpected.items.map((i, n) => (n === 1 ? { ...i, amount: '89,59' } : i));
  assertEquals(scoreParse(parse({ ...cagriExpected, items }), cagriExpected).checks.amounts, false);
});
