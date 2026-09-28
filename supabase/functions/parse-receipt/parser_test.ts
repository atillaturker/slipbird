// Run: deno test supabase/functions/parse-receipt  (or via Docker, see README)
import { assertEquals, assertRejects } from 'jsr:@std/assert@1';

import { createParser } from './providers/index.ts';
import { ParserError, type ProviderAdapter } from './providers/types.ts';
import { cagriExpected, infoSlipExpected } from './fixtures.ts';
import { parsedReceiptJsonSchema, ParsedReceiptSchema } from './schema.ts';

const valid = cagriExpected;

function fakeAdapter(outputs: string[]): ProviderAdapter & { calls: number } {
  const adapter = {
    name: 'fake',
    calls: 0,
    complete() {
      const text = outputs[Math.min(adapter.calls, outputs.length - 1)];
      adapter.calls += 1;
      return Promise.resolve({ text, usage: { inputTokens: 100, outputTokens: 50 } });
    },
  };
  return adapter;
}

const hints = { locale: 'tr-TR', deviceCurrency: 'TRY', countryHint: 'TR' };

Deno.test('returns a valid receipt on the first try', async () => {
  const adapter = fakeAdapter([JSON.stringify(valid)]);
  const { receipt, usage } = await createParser(adapter).parse('text', hints);
  assertEquals(receipt.total.value, '529,03');
  assertEquals(adapter.calls, 1);
  assertEquals(usage, { inputTokens: 100, outputTokens: 50 });
});

Deno.test('retries once on invalid JSON', async () => {
  const adapter = fakeAdapter(['{not json', JSON.stringify(valid)]);
  const { receipt, usage } = await createParser(adapter).parse('text', hints);
  assertEquals(receipt.merchant.value, 'Çağrı Mağazacılık A.Ş.');
  assertEquals(adapter.calls, 2);
  assertEquals(usage, { inputTokens: 200, outputTokens: 100 });
});

Deno.test('fails with parse_failed after two bad outputs', async () => {
  const adapter = fakeAdapter([JSON.stringify({ ...valid, category: { value: 'pets', confidence: 'high' } })]);
  const error = await assertRejects(() => createParser(adapter).parse('text', hints), ParserError);
  assertEquals(error.code, 'parse_failed');
  assertEquals(adapter.calls, 2);
});

Deno.test('passes provider errors through (busy stays busy)', async () => {
  const adapter: ProviderAdapter = { name: 'fake', complete: () => Promise.reject(new ParserError('busy')) };
  const error = await assertRejects(() => createParser(adapter).parse('text', hints), ParserError);
  assertEquals(error.code, 'busy');
});

Deno.test('json schema is plain JSON Schema for the model', () => {
  assertEquals(parsedReceiptJsonSchema.$schema, undefined);
  assertEquals(parsedReceiptJsonSchema.type, 'object');
});

Deno.test('Çağrı receipt: legal name + display name, repaired item names, weighed line with unit', () => {
  const r = ParsedReceiptSchema.parse(cagriExpected);
  assertEquals([r.merchant.value, r.merchantDisplay], ['Çağrı Mağazacılık A.Ş.', 'Çağrı Market']);
  assertEquals(r.items[2], { name: 'BEYAZ PEYNİR', qty: 0.876, unit: 'kg', amount: '192,68' });
  assertEquals(r.items.map((i) => i.name).join(' ').match(/[ÝÞÐýþð]|5EKER|Y0/g), null);
});

Deno.test('BİLGİ FİŞİ is an info_slip', () => {
  assertEquals(ParsedReceiptSchema.parse(infoSlipExpected).documentType, 'info_slip');
});

Deno.test('outputs missing the new fields are rejected (and retried)', () => {
  const { merchantDisplay: _drop, ...withoutDisplay } = cagriExpected;
  assertEquals(ParsedReceiptSchema.safeParse(withoutDisplay).success, false);
  const noUnit = { ...cagriExpected, items: [{ name: 'EKMEK', qty: 2, amount: '42,50' }] };
  assertEquals(ParsedReceiptSchema.safeParse(noUnit).success, false);
  assertEquals(ParsedReceiptSchema.safeParse({ ...cagriExpected, documentType: 'coupon' }).success, false);
});
