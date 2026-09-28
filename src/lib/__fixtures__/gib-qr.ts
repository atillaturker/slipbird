// Spec-shaped GİB QR payloads (docs/SPEC.md §1.2). NOT taken from real invoices; tax ids are fake.
// Replace/extend with real, redacted payloads before M4 closes.

export const earsivDotDecimal = JSON.stringify({
  vkntckn: '1234567890',
  avkntckn: '11111111111',
  senaryo: 'EARSIVFATURA',
  tip: 'SATIS',
  tarih: '2026-10-12',
  no: 'GIB2026000000123',
  ettn: '3f2b8c1e-7a4d-4f6e-9b2a-1c5d8e9f0a12',
  parabirimi: 'TRY',
  malhizmettoplam: '1000.00',
  'kdvmatrah(20)': '800.00',
  'hesaplanankdv(20)': '160.00',
  'kdvmatrah(10)': '200.00',
  'hesaplanankdv(10)': '20.00',
  vergidahil: '1180.00',
  odenecek: '1180.00',
});

export const efaturaDecimalComma = JSON.stringify({
  vkntckn: '9876543210',
  avkntckn: '1234567890',
  senaryo: 'TICARIFATURA',
  tip: 'SATIS',
  tarih: '05.03.2026',
  no: 'ABC2026000000042',
  ettn: 'a1b2c3d4-0000-4000-8000-123456789abc',
  parabirimi: 'TL',
  malhizmettoplam: '2.500,00',
  'kdvmatrah(1)': '2.500,00',
  'hesaplanankdv(1)': '25,00',
  vergidahil: '2.525,00',
  odenecek: '2.525,00',
});

export const missingOptionalKeys = JSON.stringify({
  vkntckn: '1234567890',
  tarih: '2026-09-30',
  vergidahil: '45.90',
});

export const foreignCurrency = JSON.stringify({
  ettn: 'ffffffff-1111-4222-8333-444444444444',
  no: 'GIB2026000000999',
  tarih: '2026-08-01',
  parabirimi: 'EUR',
  'hesaplanankdv(20)': '10.00',
  odenecek: '60.00',
});

export const oddKeyCasing = JSON.stringify({
  VKNTCKN: '1234567890',
  Tarih: '2026-07-14',
  'HesaplananKDV (20)': '3,40',
  Odenecek: '20,40',
});
