import { buildReportHtml, escapeHtml, type ReportInput } from '../report';

const input = (patch: Partial<ReportInput> = {}): ReportInput => ({
  language: 'tr',
  palette: { ink: '#121613', inkMuted: '#555c55', rule: '#dfe2dc', stamp: '#0b6b4c', paperSunken: '#e6e8e2' },
  title: 'Slipbird raporu',
  period: 'Ekim 2026',
  generated: '12 Eki 2026',
  totalLabel: 'Toplam harcama',
  total: '₺6.633,00',
  countLabel: 'Fiş',
  count: '12',
  notes: [],
  categoriesTitle: 'Kategoriler',
  categories: [{ name: 'Market', share: '%62', amount: '₺4.112,00', color: '#2a78d6' }],
  receiptsTitle: 'Fişler',
  columns: { date: 'Tarih', merchant: 'İşletme', category: 'Kategori', amount: 'Tutar' },
  receipts: [{ date: '11 Eki', merchant: 'Çağrı Market', category: 'Market', amount: '₺663,29' }],
  emptyText: 'Bu ay fiş yok',
  ...patch,
});

describe('buildReportHtml', () => {
  it('has the title, period, totals, categories and receipts', () => {
    const html = buildReportHtml(input());
    expect(html).toContain('<html lang="tr">');
    expect(html).toContain('Slipbird raporu');
    expect(html).toContain('Ekim 2026');
    expect(html).toContain('₺6.633,00');
    expect(html).toContain('%62');
    expect(html).toContain('Çağrı Market');
    expect(html).toContain('<meta charset="utf-8">');
  });

  it('escapes text from receipts', () => {
    const html = buildReportHtml(input({ receipts: [{ date: '1 Eki', merchant: '<script>alert(1)</script> & "Co"', category: 'x', amount: '1' }] }));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;Co&quot;');
  });

  it('only lets hex colours into style attributes', () => {
    const html = buildReportHtml(input({ categories: [{ name: 'X', share: '', amount: '', color: 'red;background:url(x)' }] }));
    expect(html).not.toContain('url(x)');
    expect(html).toContain('background:#000000');
  });

  it('shows the empty text instead of empty tables', () => {
    const html = buildReportHtml(input({ categories: [], receipts: [] }));
    expect(html).not.toContain('<table>');
    expect(html.match(/Bu ay fiş yok/g)).toHaveLength(2);
  });

  it('adds notes and repeats the table header across pages', () => {
    const html = buildReportHtml(input({ notes: ['1 fiş dahil değil'] }));
    expect(html).toContain('1 fiş dahil değil');
    expect(html).toContain('thead { display: table-header-group; }');
  });
});

describe('escapeHtml', () => {
  it('escapes the five characters', () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;');
  });
});
