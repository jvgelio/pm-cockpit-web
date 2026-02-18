export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size?: number
  modifiedAt?: Date
}

export interface FileEntryWithContent extends FileEntry {
  content?: string
}

export interface StorageAdapter {
  // File operations
  readFile(path: string): Promise<string | null>
  writeFile(path: string, content: string): Promise<void>
  deleteFile(path: string): Promise<void>
  exists(path: string): Promise<boolean>

  // Directory operations
  readDirectory(path: string): Promise<FileEntry[]>
  readDirectoryWithContent(
    path: string,
    extensions?: string[]
  ): Promise<FileEntryWithContent[]>
  createDirectory(path: string): Promise<void>

  // Utilities
  getBasePath(): string
}

export type StorageType = 'indexeddb'
