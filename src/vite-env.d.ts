/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_SERVER_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Electron API types
interface DirectoryEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}

interface DirectoryEntryWithContent extends DirectoryEntry {
  content?: string
}

interface FileStats {
  size: number
  created: Date
  modified: Date
  isDirectory: boolean
  isFile: boolean
}

interface ElectronAPI {
  fs: {
    readFile: (filePath: string) => Promise<string>
    writeFile: (filePath: string, content: string) => Promise<void>
    readDirectory: (dirPath: string) => Promise<DirectoryEntry[]>
    readDirectoryWithContent: (
      dirPath: string,
      extensions?: string[]
    ) => Promise<DirectoryEntryWithContent[]>
    exists: (path: string) => Promise<boolean>
    createDirectory: (dirPath: string) => Promise<void>
    deleteFile: (filePath: string) => Promise<void>
    getStats: (path: string) => Promise<FileStats>
  }
  app: {
    getDataPath: () => Promise<string>
    selectDataDirectory: () => Promise<string | null>
  }
  theme: {
    get: () => Promise<'light' | 'dark' | 'system'>
    set: (theme: 'light' | 'dark' | 'system') => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export { }
