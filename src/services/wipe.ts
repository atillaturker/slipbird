import { Directory, File, Paths } from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';

import { getDb } from '@/db';
import { deleteAllData } from '@/db/reset';
import { RECEIPTS_DIR } from '@/lib/image-paths';

import { CACHE_KEYS } from './kv-keys';

/**
 * Deletes everything the app holds about the person's spending: receipts (rows and photos), budgets, merchant
 * rules, the scan queue and cached rates. Settings (language, home currency, alerts) are kept.
 */
export async function wipeAllData(): Promise<void> {
  await deleteAllData(getDb());
  const photos = new Directory(Paths.document, RECEIPTS_DIR);
  if (photos.exists) photos.delete();
  for (const key of Object.values(CACHE_KEYS)) Storage.removeItemSync(key);
  // Exported CSV/PDF files wait in the cache directory until the system clears it: remove them now.
  for (const entry of new Directory(Paths.cache).list()) {
    if (entry instanceof File && entry.name.startsWith('slipbird-')) entry.delete();
  }
}
