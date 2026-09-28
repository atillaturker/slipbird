import { formatDecimalAmount } from './money';
import type { Receipt } from './types';

// Excel reads a UTF-8 file as UTF-8 only with a byte-order mark (Turkish letters otherwise turn to garbage).
const BOM = '﻿';
const NEWLINE = '\r\n';

export const CSV_COLUMNS = [
  'date',
  'time',
  'merchant',
  'category',
  'payment_method',
  'currency',
  'total',
  'vat_total',
  'document_type',
  'document_number',
  'source',
  'note',
  'item_name',
  'item_quantity',
  'item_unit',
  'item_amount',
] as const;

/**
 * Text that starts like a formula would be executed by a spreadsheet (=, +, -, @, tab, CR): a merchant or note
 * read from a receipt is untrusted, so those are made plain text with a leading apostrophe.
 */
function safeText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** RFC 4180: quote fields containing a comma, quote or line break; double the quotes. */
function field(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const text = (value: string | null | undefined) => field(safeText(value ?? ''));

function decimal(value: number | null, currency: string): string {
  return value === null ? '' : formatDecimalAmount(value, currency);
}

/**
 * One row per item (or one row for a receipt with no items), receipt columns repeated so any row can be
 * filtered. Receipt-level amounts (`total`, `vat_total`) appear only on a receipt's first row, so summing the
 * column never double counts. Amounts are plain decimals with dots; `currency` says which.
 */
export function buildCsv(receipts: Receipt[]): string {
  const rows: string[] = [CSV_COLUMNS.join(',')];
  for (const r of receipts) {
    const vat = r.taxes.reduce((sum, t) => sum + t.amountMinor, 0);
    const shared = (first: boolean) => [
      r.date,
      r.time ?? '',
      text(r.merchantDisplay ?? r.merchant),
      r.category,
      r.paymentMethod ?? '',
      r.currency,
      first ? decimal(r.totalMinor, r.currency) : '',
      first ? decimal(r.taxes.length ? vat : null, r.currency) : '',
      r.documentType ?? '',
      text(r.documentNumber),
      r.source,
      text(r.note),
    ];
    if (r.items.length === 0) {
      rows.push([...shared(true), '', '', '', ''].join(','));
      continue;
    }
    r.items.forEach((item, i) => {
      rows.push(
        [...shared(i === 0), text(item.name), item.qty === null ? '' : String(item.qty), item.unit ?? '', decimal(item.amountMinor, r.currency)].join(','),
      );
    });
  }
  return BOM + rows.join(NEWLINE) + NEWLINE;
}
