import { useEffect, useState } from 'react';
import { create } from 'zustand';

import { getDb } from '@/db';
import { deleteReceipt, getReceipt, hasReceipts, listReceipts, saveReceipt } from '@/db/receipts';
import type { Receipt, ReceiptInput, ReceiptSummary } from '@/lib/types';
import { deleteReceiptImages } from '@/services/images';
import type { Category } from '@/theme';

type ReceiptsState = {
  list: ReceiptSummary[];
  /** False only when there are no receipts at all (not just no matches). */
  hasAny: boolean;
  loaded: boolean;
  query: string;
  category: Category | null;
  /** Bumped on every write so detail hooks refetch. */
  revision: number;
  setQuery: (query: string) => void;
  setCategory: (category: Category | null) => void;
  refresh: () => Promise<void>;
  save: (input: ReceiptInput, id?: string) => Promise<string>;
  remove: (id: string) => Promise<void>;
};

export const useReceipts = create<ReceiptsState>((set, get) => ({
  list: [],
  hasAny: false,
  loaded: false,
  query: '',
  category: null,
  revision: 0,

  setQuery: (query) => {
    set({ query });
    void get().refresh();
  },
  setCategory: (category) => {
    set({ category });
    void get().refresh();
  },

  refresh: async () => {
    const db = getDb();
    const { query, category } = get();
    const [list, hasAny] = await Promise.all([listReceipts(db, { query, category }), hasReceipts(db)]);
    // Ignore a stale response if the filter changed while this query ran.
    if (get().query === query && get().category === category) set({ list, hasAny, loaded: true });
  },

  save: async (input, id) => {
    const savedId = await saveReceipt(getDb(), input, id);
    set((s) => ({ revision: s.revision + 1 }));
    await get().refresh();
    return savedId;
  },

  remove: async (id) => {
    set((s) => ({ list: s.list.filter((r) => r.id !== id) }));
    await deleteReceipt(getDb(), id);
    try {
      deleteReceiptImages(id);
    } catch {
      // The row is gone; a leftover image folder is harmless and holds nothing the app shows.
    }
    set((s) => ({ revision: s.revision + 1 }));
    await get().refresh();
  },
}));

/** One receipt with items and taxes; refetches after any write. `undefined` while loading, `null` if missing. */
export function useReceipt(id: string | undefined): Receipt | null | undefined {
  const revision = useReceipts((s) => s.revision);
  const [result, setResult] = useState<{ id: string; receipt: Receipt | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void getReceipt(getDb(), id).then((receipt) => {
      if (active) setResult({ id, receipt });
    });
    return () => {
      active = false;
    };
  }, [id, revision]);

  if (!id) return null;
  return result?.id === id ? result.receipt : undefined;
}
