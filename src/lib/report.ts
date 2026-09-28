/** The monthly PDF report as HTML (printed to PDF by expo-print). Pure: every string and colour comes in. */

export type ReportPalette = {
  ink: string;
  inkMuted: string;
  rule: string;
  stamp: string;
  paperSunken: string;
};

export type ReportInput = {
  language: string;
  palette: ReportPalette;
  title: string;
  period: string;
  generated: string;
  totalLabel: string;
  total: string;
  countLabel: string;
  count: string;
  notes: string[];
  categoriesTitle: string;
  categories: { name: string; share: string; amount: string; color: string }[];
  receiptsTitle: string;
  columns: { date: string; merchant: string; category: string; amount: string };
  receipts: { date: string; merchant: string; category: string; amount: string }[];
  emptyText: string;
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// A4 in CSS pixels at 72 dpi, as expo-print takes it.
export const REPORT_PAGE = { width: 595, height: 842 } as const;

/** Colours are passed through a strict pattern before they reach a style attribute. */
function safeColor(value: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : '#000000';
}

export function buildReportHtml(r: ReportInput): string {
  const e = escapeHtml;
  const p = { ink: safeColor(r.palette.ink), muted: safeColor(r.palette.inkMuted), rule: safeColor(r.palette.rule), stamp: safeColor(r.palette.stamp), sunken: safeColor(r.palette.paperSunken) };

  const categoryRows = r.categories
    .map(
      (c) =>
        `<tr><td><span class="dot" style="background:${safeColor(c.color)}"></span>${e(c.name)}</td><td class="num muted">${e(c.share)}</td><td class="num">${e(c.amount)}</td></tr>`,
    )
    .join('');

  const receiptRows = r.receipts
    .map((x) => `<tr><td class="mono">${e(x.date)}</td><td>${e(x.merchant)}</td><td>${e(x.category)}</td><td class="num">${e(x.amount)}</td></tr>`)
    .join('');

  return `<!doctype html>
<html lang="${e(r.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(r.title)} — ${e(r.period)}</title>
<style>
  @page { margin: 36px 32px; }
  * { box-sizing: border-box; }
  body { margin: 0; color: ${p.ink}; font-family: 'Instrument Sans', -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; line-height: 1.45; }
  h1 { margin: 0; font-size: 22px; letter-spacing: -0.3px; }
  h2 { margin: 24px 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: ${p.muted}; }
  .sub { margin-top: 2px; color: ${p.muted}; }
  .summary { display: flex; gap: 32px; margin-top: 16px; padding: 12px 14px; border-radius: 8px; background: ${p.sunken}; }
  .summary div { flex: 1; }
  .label { color: ${p.muted}; }
  .big { margin-top: 2px; font-family: 'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace; font-size: 20px; font-weight: 600; }
  .note { margin-top: 8px; color: ${p.muted}; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { text-align: left; padding: 4px 6px; border-bottom: 1.5px solid ${p.ink}; color: ${p.muted}; font-weight: 500; }
  td { padding: 5px 6px; border-bottom: 1px solid ${p.rule}; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .num { text-align: right; font-family: 'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace; white-space: nowrap; }
  th.num { font-family: inherit; }
  .mono { font-family: 'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace; white-space: nowrap; }
  .muted { color: ${p.muted}; }
  .dot { display: inline-block; width: 8px; height: 8px; margin-right: 6px; border-radius: 50%; }
  .empty { padding: 12px 0; color: ${p.muted}; }
</style>
</head>
<body>
  <h1>${e(r.title)}</h1>
  <div class="sub">${e(r.period)} · ${e(r.generated)}</div>
  <div class="summary">
    <div><div class="label">${e(r.totalLabel)}</div><div class="big">${e(r.total)}</div></div>
    <div><div class="label">${e(r.countLabel)}</div><div class="big">${e(r.count)}</div></div>
  </div>
  ${r.notes.map((n) => `<div class="note">${e(n)}</div>`).join('')}

  <h2>${e(r.categoriesTitle)}</h2>
  ${categoryRows ? `<table><tbody>${categoryRows}</tbody></table>` : `<div class="empty">${e(r.emptyText)}</div>`}

  <h2>${e(r.receiptsTitle)}</h2>
  ${
    receiptRows
      ? `<table><thead><tr><th>${e(r.columns.date)}</th><th>${e(r.columns.merchant)}</th><th>${e(r.columns.category)}</th><th class="num">${e(r.columns.amount)}</th></tr></thead><tbody>${receiptRows}</tbody></table>`
      : `<div class="empty">${e(r.emptyText)}</div>`
  }
</body>
</html>`;
}
