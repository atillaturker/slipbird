import { create } from 'zustand';

import { getDb } from '@/db';
import { listSpendRows, type SpendReceipt } from '@/db/spending';
import type { Rates } from '@/lib/currency-convert';
import { getRates } from '@/services/rates';
import { useSettings } from './settings';

type SpendingState = {
  rows: SpendReceipt[];
  rates: Rates | null;
  loaded: boolean;
  refresh: () => Promise<void>;
};

export const useSpending = create<SpendingState>((set) => ({
  rows: [],
  rates: null,
  loaded: false,
  refresh: async () => {
    const home = useSettings.getState().homeCurrency;
    // From 1 Jan last year: enough for "this year vs the same point last year" and the 6-month chart.
    const from = `${new Date().getFullYear() - 1}-01-01`;
    const rows = await listSpendRows(getDb(), from);
    set({ rows, loaded: true });
    // Rates may need the network; show home-currency totals meanwhile.
    set({ rates: await getRates(home) });
  },
}));
