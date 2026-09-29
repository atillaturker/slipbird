import { z } from 'npm:zod@4';

/**
 * The parser's contract (docs/SPEC.md §1.4). The app mirrors this shape in src/lib/parsed-receipt.ts —
 * change both together. Amounts stay strings exactly as printed; the app parses them.
 */

const confidence = z.enum(['high', 'low']);

export const categories = ['groceries', 'dining', 'transport', 'shopping', 'health', 'bills', 'home', 'entertainment', 'other'] as const;

export const ParsedReceiptSchema = z.object({
  merchant: z.object({
    value: z
      .string()
      .nullable()
      .describe('Legal business name as printed, with obvious OCR errors fixed (e.g. "Çağrı Mağazacılık A.Ş."); null if not printed. Never invent one.'),
    confidence,
  }),
  merchantDisplay: z
    .string()
    .nullable()
    .describe('Short brand/store name people know, e.g. "Çağrı Market" for "Çağrı Mağazacılık A.Ş."; null if no merchant.'),
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
      name: z.string().describe('Item name with Turkish characters repaired where OCR garbled them'),
      qty: z.number().nullable().describe('Quantity or weight, e.g. 0.876 for "0,876 KG X 219,95"'),
      unit: z
        .enum(['pcs', 'kg', 'g', 'l'])
        .nullable()
        .describe('Unit of qty: pcs counted, kg or g weighed, l by volume. null exactly when qty is null. A size inside the product name ("SÜT 1 LT") is not a quantity.'),
      amount: z.string().describe('Line amount exactly as printed'),
    }),
  ),
  paymentMethod: z.enum(['card', 'cash', 'other']).nullable(),
  category: z.object({ value: z.enum(categories), confidence }),
  documentType: z.enum(['receipt', 'invoice', 'info_slip', 'other']),
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
  /** Opaque local receipt id + the app's attempt number: lets logs tell client duplicates from provider retries. */
  receiptRef: z.string().max(64).optional(),
  attempt: z.number().int().min(1).max(1000).optional(),
  /** Development only, honoured when ALLOW_PARSER_OVERRIDE=true: "provider:model" to try one model instead of the chain. */
  debugProvider: z
    .string()
    .regex(/^(gemini|groq):[A-Za-z0-9._\/-]{1,80}$/)
    .optional(),
});

export type ParseRequest = z.infer<typeof ParseRequestSchema>;
