import type { ParsedReceipt } from '../parsed-receipt';

// What parse-receipt returns for the synthetic Çağrı receipt, its info slip and the 34-item receipt, plus the
// OCR rows they came from. Mirrors supabase/functions/parse-receipt/fixtures.ts — keep both in step.

export const cagriRows = `ÇAÐRI MAÐAZACILIK A.5.
ÇAĞRI MARKET
ATAŞEHİR ŞB.
TARİH: 12.10.2026  SAAT: 18:42
FİŞ NO: 0042
5EKER 1 KG  %1 *54,90
Y0ĞURT 1500 GR  %1 *89,95
0,876 KG X 219,95
BEYAZ PEYNÝR  %1 *192,68
2,238 KG X 59,99
MV.PATLICAN KEMER KG  %1 *134,26
2 AD X 21,25
EKMEK  %1 *42,50
DETERJAN ÝÇ  %20 *149,00
TOPKDV  *29,93
TOPLAM  *663,29
KREDİ KARTI  *663,29`.split('\n');

export const cagriParsed: ParsedReceipt = {
  merchant: { value: 'Çağrı Mağazacılık A.Ş.', confidence: 'high' },
  merchantDisplay: 'Çağrı Market',
  date: { value: '2026-10-12', time: '18:42', confidence: 'high' },
  total: { value: '663,29', confidence: 'high' },
  currency: { value: 'TRY', confidence: 'high' },
  tax: [{ rate: null, amount: '29,93' }],
  items: [
    { name: 'ŞEKER 1 KG', qty: null, unit: null, amount: '54,90' },
    { name: 'YOĞURT 1500 GR', qty: null, unit: null, amount: '89,95' },
    { name: 'BEYAZ PEYNİR', qty: 0.876, unit: 'kg', amount: '192,68' },
    { name: 'MV.PATLICAN KEMER KG', qty: 2.238, unit: 'kg', amount: '134,26' },
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
  total: { value: '663,29', confidence: 'high' },
  currency: { value: 'TRY', confidence: 'high' },
  tax: [],
  items: [

  ],
  paymentMethod: 'card',
  category: { value: 'groceries', confidence: 'low' },
  documentType: 'info_slip',
};

export const longRows = `MÝGROS TÝCARET A.5.
MIGROS
KADIKÖY MODA MAĞAZASI
TARİH: 11.10.2026  SAAT: 10:15
FİŞ NO: 1187
SÜT 1 LT  %1 *34,50
YUMURTA 15LI  %1 *89,90
1,452 KG X 39,90
DOMATES KG  %1 *57,93
0,968 KG X 34,95
SALATALIK KG  %1 *33,83
1,120 KG X 79,90
MUZ KG  %1 *89,49
ELMA STARKING  %1 *42,35
PÝRÝNÇ 1 KG  %1 *64,90
MAKARNA 500 GR  %1 *17,50
UN 2 KG  %1 *54,95
ZEYTÝNYAĞI 1 LT  %1 *349,00
AYÇÝÇEK YAĞI 2 LT  %1 *149,90
ÇAY 1000 GR  %1 *219,00
TÜRK KAHVESÝ 100 GR  %1 *59,90
5EFTALÝ SUYU 1 LT  %1 *39,95
2 AD X 32,50
MADEN SUYU 6LI  %1 *65,00
PEYNÝR KA5AR 400 GR  %1 *189,90
TEREYAĞI 250 GR  %1 *124,50
ZEYTÝN SÝYAH  %1 *98,75
SUCUK 250 GR  %1 *169,00
TAVUK BAGET KG  %1 *112,40
BULGUR PÝLAVLIK  %1 *38,90
MERCÝMEK KIRMIZI  %1 *56,25
SALÇA DOMATES  %1 *72,90
BÝSKÜVÝ  %1 *24,95
ÇÝKOLATA SÜTLÜ  %1 *44,50
CÝPS  %1 *39,90
KAĞIT HAVLU 6LI  %20 *129,90
TUVALET KAĞIDI 12  %20 *189,90
BULA5IK DETERJANI  %20 *94,90
ÇAMA5IR SUYU  %20 *42,90
DÝ5 MACUNU  %20 *67,50
5AMPUAN  %20 *119,90
POŞET  %20 *0,50
??? 8690000000017  %1 *27,40
TOPKDV  *131,02
TOPLAM  *3.012,95
KREDİ KARTI  *3.012,95`.split('\n');

export const longParsed: ParsedReceipt = {
  merchant: { value: 'Migros Ticaret A.Ş.', confidence: 'high' },
  merchantDisplay: 'Migros',
  date: { value: '2026-10-11', time: '10:15', confidence: 'high' },
  total: { value: '3.012,95', confidence: 'high' },
  currency: { value: 'TRY', confidence: 'high' },
  tax: [{ rate: null, amount: '131,02' }],
  items: [
    { name: 'SÜT 1 LT', qty: null, unit: null, amount: '34,50' },
    { name: 'YUMURTA 15Lİ', qty: null, unit: null, amount: '89,90' },
    { name: 'DOMATES KG', qty: 1.452, unit: 'kg', amount: '57,93' },
    { name: 'SALATALIK KG', qty: 0.968, unit: 'kg', amount: '33,83' },
    { name: 'MUZ KG', qty: 1.12, unit: 'kg', amount: '89,49' },
    { name: 'ELMA STARKING', qty: null, unit: null, amount: '42,35' },
    { name: 'PİRİNÇ 1 KG', qty: null, unit: null, amount: '64,90' },
    { name: 'MAKARNA 500 GR', qty: null, unit: null, amount: '17,50' },
    { name: 'UN 2 KG', qty: null, unit: null, amount: '54,95' },
    { name: 'ZEYTİNYAĞI 1 LT', qty: null, unit: null, amount: '349,00' },
    { name: 'AYÇİÇEK YAĞI 2 LT', qty: null, unit: null, amount: '149,90' },
    { name: 'ÇAY 1000 GR', qty: null, unit: null, amount: '219,00' },
    { name: 'TÜRK KAHVESİ 100 GR', qty: null, unit: null, amount: '59,90' },
    { name: 'ŞEFTALİ SUYU 1 LT', qty: null, unit: null, amount: '39,95' },
    { name: 'MADEN SUYU 6LI', qty: 2, unit: 'pcs', amount: '65,00' },
    { name: 'PEYNİR KAŞAR 400 GR', qty: null, unit: null, amount: '189,90' },
    { name: 'TEREYAĞI 250 GR', qty: null, unit: null, amount: '124,50' },
    { name: 'ZEYTİN SİYAH', qty: null, unit: null, amount: '98,75' },
    { name: 'SUCUK 250 GR', qty: null, unit: null, amount: '169,00' },
    { name: 'TAVUK BAGET KG', qty: null, unit: null, amount: '112,40' },
    { name: 'BULGUR PİLAVLIK', qty: null, unit: null, amount: '38,90' },
    { name: 'MERCİMEK KIRMIZI', qty: null, unit: null, amount: '56,25' },
    { name: 'SALÇA DOMATES', qty: null, unit: null, amount: '72,90' },
    { name: 'BİSKÜVİ', qty: null, unit: null, amount: '24,95' },
    { name: 'ÇİKOLATA SÜTLÜ', qty: null, unit: null, amount: '44,50' },
    { name: 'CİPS', qty: null, unit: null, amount: '39,90' },
    { name: 'KAĞIT HAVLU 6LI', qty: null, unit: null, amount: '129,90' },
    { name: 'TUVALET KAĞIDI 12', qty: null, unit: null, amount: '189,90' },
    { name: 'BULAŞIK DETERJANI', qty: null, unit: null, amount: '94,90' },
    { name: 'ÇAMAŞIR SUYU', qty: null, unit: null, amount: '42,90' },
    { name: 'DİŞ MACUNU', qty: null, unit: null, amount: '67,50' },
    { name: 'ŞAMPUAN', qty: null, unit: null, amount: '119,90' },
    { name: 'POŞET', qty: null, unit: null, amount: '0,50' },
    { name: '8690000000017', qty: null, unit: null, amount: '27,40' },
  ],
  paymentMethod: 'card',
  category: { value: 'groceries', confidence: 'high' },
  documentType: 'receipt',
};
