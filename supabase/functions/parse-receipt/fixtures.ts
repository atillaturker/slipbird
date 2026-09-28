// Parser fixtures: OCR text as ML Kit produces it, and the output parse-receipt should return.
// SYNTHETIC — modelled on a real Çağrı Mağazacılık receipt (garbled Turkish letters, weighed lines) and a
// "BİLGİ FİŞİ"; replace with redacted real OCR text as more receipts are tested (docs/SPEC.md §5).
// Used by parser_test.ts (schema checks) and live_test.ts (the real model, opt-in).

export const cagriOcr = `ÇAÐRI MAÐAZACILIK A.5.
ÇAĞRI MARKET
ATAŞEHİR ŞB.
TARİH: 12.10.2026 SAAT: 18:42
FİŞ NO: 0042
5EKER 1 KG            %1 *54,90
Y0ĞURT 1500 GR        %1 *89,95
0,876 KG X 219,95
BEYAZ PEYNÝR          %1 *192,68
2 AD X 21,25
EKMEK                 %1 *42,50
DETERJAN ÝÇ           %20 *149,00
TOPKDV                     *33,07
TOPLAM                    *529,03
KREDİ KARTI               *529,03`;

export const cagriExpected = {
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
} as const;

export const infoSlipOcr = `ÇAĞRI MAĞAZACILIK A.Ş.
BİLGİ FİŞİ
MALİ DEĞERİ YOKTUR
E-ARŞİV FATURA NO: CGR2026000001234
TARİH: 12.10.2026 18:43
TOPLAM                    *529,03
KREDİ KARTI               *529,03`;

export const infoSlipExpected = {
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
} as const;
