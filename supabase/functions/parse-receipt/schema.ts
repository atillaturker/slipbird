import { z } from 'npm:zod@4';

/**
 * The parser's contract (docs/SPEC.md §1.4). The app mirrors this shape in src/lib/parsed-receipt.ts —
 * change both together. Amounts stay strings exactly as printed; the app parses them.
 */

const confidence = z.enum(['high', 'low']);

export const categories = ['groceries', 'dining', 'transport', 'shopping', 'health', 'bills', 'home', 'entertainment', 'other'] as const;

export const ParsedReceiptSchema = z.object({
  merchant: z.object({
    value: z.string().nullable().describe('Store or business name as printed; null if not clearly printed. Never invent one.'),
    confidence,
  }),
  date: z.object({
    value: z.string().nullable().describe('Purchase date as YYYY-MM-DD, or null'),
    time: z.string().nullable().describe('Purchase time as HH:mm (24h), or null'),
    confidence,
  }),
  total: z.object({
    value: z.string().nullable().describe('Amount paid, exactly as printed (keep its separators), or null'),
    confidence,
  }),
  currency: z.object({
    value: z.string().nullable().describe('ISO 4217 code (TRY, USD, EUR, GBP, ...), or null if unknown'),
    confidence,
  }),
  tax: z.array(
    z.object({
      rate: z.number().nullable().describe('VAT/KDV rate in percent, e.g. 10 for %10'),
      amount: z.string().describe('Tax amount exactly as printed'),
    }),
  ),
  items: z.array(
    z.object({
      name: z.string(),
      qty: z.number().nullable(),
      amount: z.string().describe('Line amount exactly as printed'),
    }),
  ),
  paymentMethod: z.enum(['card', 'cash', 'other']).nullable(),
  category: z.object({ value: z.enum(categories), confidence }),
  documentType: z.enum(['receipt', 'invoice', 'other']),
});

export type ParsedReceipt = z.infer<typeof ParsedReceiptSchema>;

/** JSON Schema handed to the model (providers that support native structured output). */
export const parsedReceiptJsonSchema: Record<string, unknown> = (() => {
  const schema = z.toJSONSchema(ParsedReceiptSchema) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
})();

export const MAX_TEXT_LENGTH = 12_000;

export const ParseRequestSchema = z.object({
  text: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
  locale: z.string().min(2).max(35),
  deviceCurrency: z.string().regex(/^[A-Z]{3}$/),
  countryHint: z.string().length(2).nullable().optional(),
});

export type ParseRequest = z.infer<typeof ParseRequestSchema>;
