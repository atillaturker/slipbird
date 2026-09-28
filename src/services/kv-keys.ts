/**
 * kv-store keys for caches and bookkeeping — everything "Delete all data" clears. Settings (language, home
 * currency, budget alerts) are the person's choices and stay.
 */
export const CACHE_KEYS = {
  scanQueue: 'scanQueue',
  parseLeases: 'parseLeases',
  exchangeRates: 'exchangeRates',
  budgetAlertsSent: 'budgetAlertsSent',
  quotaNoticeMonth: 'quotaNoticeMonth',
} as const;
