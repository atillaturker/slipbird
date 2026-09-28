// Run: deno test supabase/functions/parse-receipt  (or via Docker, see README)
import { assertEquals, assertRejects } from 'jsr:@std/assert@1';

import { createParser } from './providers/index.ts';
import { ParserError, type ProviderAdapter } from './providers/types.ts';
import { parsedReceiptJsonSchema } from './schema.ts';

const valid = {
  merchant: { value: 'Migros', confidence: 'high' },
  date: { value: '2026-10-12', time: '18:42', confidence: 'high' },
  total: { value: '1.234,56', confidence: 'high' },
  currency: { value: 'TRY', confidence: 'high' },
  tax: [{ rate: 10, amount: '112,23' }],
  items: [{ name: 'Süt', qty: 2, amount: '42,50' }],
  paymentMethod: 'card',
  category: { value: 'groceries', confidence: 'high' },
  documentType: 'receipt',
};

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
  assertEquals(receipt.total.value, '1.234,56');
  assertEquals(adapter.calls, 1);
  assertEquals(usage, { inputTokens: 100, outputTokens: 50 });
});

Deno.test('retries once on invalid JSON', async () => {
  const adapter = fakeAdapter(['{not json', JSON.stringify(valid)]);
  const { receipt, usage } = await createParser(adapter).parse('text', hints);
  assertEquals(receipt.merchant.value, 'Migros');
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
