import type { StorageAdapter, FileEntry, FileEntryWithContent } from './types'

const DB_NAME = 'pm-cockpit-db'
const DB_VERSION = 1
const FILES_STORE = 'files'
const DIRECTORIES_STORE = 'directories'

interface StoredFile {
  path: string
  content: string
  size: number
  modifiedAt: Date
  createdAt: Date
}

interface StoredDirectory {
  path: string
  createdAt: Date
}

class IndexedDBAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  private async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('IndexedDB error:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Files store - key is the path
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const filesStore = db.createObjectStore(FILES_STORE, { keyPath: 'path' })
          filesStore.createIndex('directory', 'directory', { unique: false })
        }

        // Directories store - to track created directories
        if (!db.objectStoreNames.contains(DIRECTORIES_STORE)) {
          db.createObjectStore(DIRECTORIES_STORE, { keyPath: 'path' })
        }
      }
    })

    return this.initPromise
  }

  private async getDB(): Promise<IDBDatabase> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')
    return this.db
  }

  private getDirectory(path: string): string {
    const parts = path.split('/')
    parts.pop()
    return parts.join('/') || '/'
  }

  private normalizePath(path: string): string {
    // Remove leading/trailing slashes and normalize
    return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
  }

  getBasePath(): string {
    return ''
  }

  async readFile(path: string): Promise<string | null> {
    const db = await this.getDB()
    const normalizedPath = this.normalizePath(path)

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FILES_STORE, 'readonly')
      const store = transaction.objectStore(FILES_STORE)
      const request = store.get(normalizedPath)

      request.onsuccess = () => {
        const result = request.result as StoredFile | undefined
        resolve(result?.content ?? null)
      }

      request.onerror = () => reject(request.error)
    })
  }

  async writeFile(path: string, content: string): Promise<void> {
    const db = await this.getDB()
    const normalizedPath = this.normalizePath(path)
    const directory = this.getDirectory(normalizedPath)

    // Ensure parent directories exist
    if (directory && directory !== '/') {
      await this.createDirectory(directory)
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FILES_STORE, 'readwrite')
      const store = transaction.objectStore(FILES_STORE)

      const file: StoredFile = {
        path: normalizedPath,
        content,
        size: new Blob([content]).size,
        modifiedAt: new Date(),
        createdAt: new Date(),
      }

      // Check if file exists to preserve createdAt
      const getRequest = store.get(normalizedPath)
      getRequest.onsuccess = () => {
        const existing = getRequest.result as StoredFile | undefined
        if (existing) {
          file.createdAt = existing.createdAt
        }

        const putRequest = store.put(file)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async deleteFile(path: string): Promise<void> {
    const db = await this.getDB()
    const normalizedPath = this.normalizePath(path)

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FILES_STORE, 'readwrite')
      const store = transaction.objectStore(FILES_STORE)
      const request = store.delete(normalizedPath)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async exists(path: string): Promise<boolean> {
    const db = await this.getDB()
    const normalizedPath = this.normalizePath(path)

    // Check files
    const fileExists = await new Promise<boolean>((resolve, reject) => {
      const transaction = db.transaction(FILES_STORE, 'readonly')
      const store = transaction.objectStore(FILES_STORE)
      const request = store.get(normalizedPath)

      request.onsuccess = () => resolve(!!request.result)
      request.onerror = () => reject(request.error)
    })

    if (fileExists) return true

    // Check directories
    return new Promise<boolean>((resolve, reject) => {
      const transaction = db.transaction(DIRECTORIES_STORE, 'readonly')
      const store = transaction.objectStore(DIRECTORIES_STORE)
      const request = store.get(normalizedPath)

      request.onsuccess = () => resolve(!!request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async readDirectory(path: string): Promise<FileEntry[]> {
    const db = await this.getDB()
    const normalizedPath = this.normalizePath(path)
    const prefix = normalizedPath ? `${normalizedPath}/` : ''

    const entries: FileEntry[] = []
    const seenDirs = new Set<string>()

    // Get all files
    const files = await new Promise<StoredFile[]>((resolve, reject) => {
      const transaction = db.transaction(FILES_STORE, 'readonly')
      const store = transaction.objectStore(FILES_STORE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })

    for (const file of files) {
      if (!file.path.startsWith(prefix)) continue

      const relativePath = file.path.slice(prefix.length)
      const parts = relativePath.split('/')

      if (parts.length === 1) {
        // Direct child file
        entries.push({
          name: parts[0],
          path: file.path,
          isDirectory: false,
          size: file.size,
          modifiedAt: file.modifiedAt,
        })
      } else {
        // Subdirectory
        const dirName = parts[0]
        if (!seenDirs.has(dirName)) {
          seenDirs.add(dirName)
          entries.push({
            name: dirName,
            path: prefix + dirName,
            isDirectory: true,
          })
        }
      }
    }

    // Also check explicit directories
    const dirs = await new Promise<StoredDirectory[]>((resolve, reject) => {
      const transaction = db.transaction(DIRECTORIES_STORE, 'readonly')
      const store = transaction.objectStore(DIRECTORIES_STORE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })

    for (const dir of dirs) {
      if (!dir.path.startsWith(prefix)) continue

      const relativePath = dir.path.slice(prefix.length)
      const parts = relativePath.split('/')

      if (parts.length === 1 && parts[0] && !seenDirs.has(parts[0])) {
        seenDirs.add(parts[0])
        entries.push({
          name: parts[0],
          path: dir.path,
          isDirectory: true,
        })
      }
    }

    return entries.sort((a, b) => a.name.localeCompare(b.name))
  }

  async readDirectoryWithContent(
    path: string,
    extensions?: string[]
  ): Promise<FileEntryWithContent[]> {
    const entries = await this.readDirectory(path)
    const results: FileEntryWithContent[] = []

    for (const entry of entries) {
      if (entry.isDirectory) {
        results.push(entry)
        continue
      }

      // Check extension filter
      if (extensions && extensions.length > 0) {
        const ext = entry.name.split('.').pop()?.toLowerCase()
        if (!ext || !extensions.includes(`.${ext}`)) {
          results.push(entry)
          continue
        }
      }

      // Read content
      const content = await this.readFile(entry.path)
      results.push({
        ...entry,
        content: content ?? undefined,
      })
    }

    return results
  }

  async createDirectory(path: string): Promise<void> {
    const db = await this.getDB()
    const normalizedPath = this.normalizePath(path)

    if (!normalizedPath) return

    // Create all parent directories too
    const parts = normalizedPath.split('/')
    let currentPath = ''

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(DIRECTORIES_STORE, 'readwrite')
        const store = transaction.objectStore(DIRECTORIES_STORE)

        const dir: StoredDirectory = {
          path: currentPath,
          createdAt: new Date(),
        }

        const request = store.put(dir)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }
  }
}

export const indexedDBAdapter = new IndexedDBAdapter()
