import type { ParsedReceipt } from '../parsed-receipt';

// What parse-receipt returns for the synthetic Çağrı receipt and info slip.
// Mirrors supabase/functions/parse-receipt/fixtures.ts — keep both in step.

export const cagriParsed: ParsedReceipt = {
  merchant: { value: 'Çağrı Mağazacılık A.Ş.', confidence: 'high' },
  merchantDisplay: 'Çağrı Market',
  date: { value: '2026-10-12', time: '18:42', confidence: 'high' },
  total: { value: '529,03', confidence: 'high' },
  currency: { value: 'TRY', confidence: 'high' },
  tax: [{ rate: null, amount: '33,07' }],
  items: [
    { name: 'ŞEKER 1 KG', qty: null, unit: null, amount: '54,90' },
    { name: 'YOĞURT 1500 GR', qty: null, unit: null, amount: '89,95' },
    { name: 'BEYAZ PEYNİR', qty: 0.876, unit: 'kg', amount: '192,68' },
    { name: 'EKMEK', qty: 2, unit: 'pcs', amount: '42,50' },
    { name: 'DETERJAN İÇ', qty: null, unit: null, amount: '149,00' },
  ],
  paymentMethod: 'card',
  category: { value: 'groceries', confidence: 'high' },
  documentType: 'receipt',
};

export const infoSlipParsed: ParsedReceipt = {
  merchant: { value: 'Çağrı Mağazacılık A.Ş.', confidence: 'high' },
  merchantDisplay: 'Çağrı Market',
  date: { value: '2026-10-12', time: '18:43', confidence: 'high' },
  total: { value: '529,03', confidence: 'high' },
  currency: { value: 'TRY', confidence: 'high' },
  tax: [],
  items: [],
  paymentMethod: 'card',
  category: { value: 'groceries', confidence: 'low' },
  documentType: 'info_slip',
};
