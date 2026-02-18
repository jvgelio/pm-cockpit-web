import type { StorageAdapter } from './types'
import { indexedDBAdapter } from './indexedDBAdapter'

export type { StorageAdapter, FileEntry, FileEntryWithContent, StorageType } from './types'

// For web version, always use IndexedDB
export const storage: StorageAdapter = indexedDBAdapter

// Helper to check storage type
export function getStorageType(): 'indexeddb' {
  return 'indexeddb'
}

// Export adapters for direct access if needed
export { indexedDBAdapter }
