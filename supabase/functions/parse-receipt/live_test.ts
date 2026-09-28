// Opt-in: runs the real prompt against the configured model.
//   PARSE_LIVE=1 PARSER_PROVIDER=groq,gemini GROQ_MODEL=openai/gpt-oss-120b GROQ_API_KEY=<key> GEMINI_MODEL=<id> GEMINI_API_KEY=<key> \
//     npx deno test --allow-env --allow-net --config deno.json live_test.ts
// Checks behaviour the unit tests can't: OCR repairs, units, info slips — and that amounts are untouched.
import { assert, assertEquals } from 'jsr:@std/assert@1';

import { cagriExpected, cagriOcr, infoSlipOcr, longExpected, longOcr } from './fixtures.ts';
import { adaptersFromEnv, createParser } from './providers/index.ts';

const enabled = Deno.env.get('PARSE_LIVE') === '1';
const hints = { locale: 'tr-TR', deviceCurrency: 'TRY', countryHint: 'TR' };

Deno.test({ name: 'live: Çağrı receipt', ignore: !enabled }, async () => {
  const { receipt } = await createParser(adaptersFromEnv(Deno.env).adapters).parse(cagriOcr, hints);
  assertEquals(receipt.merchant.value?.replace(/\s+/g, ' '), 'Çağrı Mağazacılık A.Ş.');
  assert(receipt.merchantDisplay?.startsWith('Çağrı'), `merchantDisplay: ${receipt.merchantDisplay}`);
  assertEquals(receipt.total.value, '663,29');
  // Amounts copied exactly as printed.
  assertEquals(receipt.items.map((i) => i.amount), cagriExpected.items.map((i) => i.amount));
  const cheese = receipt.items.find((i) => i.amount === '192,68');
  assertEquals([cheese?.qty, cheese?.unit], [0.876, 'kg']);
  const eggplant = receipt.items.find((i) => i.amount === '134,26');
  assertEquals([eggplant?.qty, eggplant?.unit], [2.238, 'kg']);
  const names = receipt.items.map((i) => i.name).join(' | ');
  assert(!/[ÝÞÐýþð]/.test(names), names);
  assert(names.includes('ŞEKER') && names.includes('YOĞURT') && names.includes('PEYNİR'), names);
});

Deno.test({ name: 'live: BİLGİ FİŞİ', ignore: !enabled }, async () => {
  const { receipt } = await createParser(adaptersFromEnv(Deno.env).adapters).parse(infoSlipOcr, hints);
  assertEquals(receipt.documentType, 'info_slip');
  assertEquals(receipt.total.value, '663,29');
});

Deno.test({ name: 'live: long receipt, 34 items in order', ignore: !enabled }, async () => {
  const { receipt } = await createParser(adaptersFromEnv(Deno.env).adapters).parse(longOcr, hints);
  assertEquals(receipt.total.value, longExpected.total.value);
  assertEquals(receipt.items.map((i) => i.amount), longExpected.items.map((i) => i.amount));
});
