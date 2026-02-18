import { contextBridge, ipcRenderer } from 'electron'

console.log('Preload script loading...')

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File System Operations
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('fs:writeFile', filePath, content),
    readDirectory: (dirPath: string) =>
      ipcRenderer.invoke('fs:readDirectory', dirPath),
    readDirectoryWithContent: (dirPath: string, extensions?: string[]) =>
      ipcRenderer.invoke('fs:readDirectoryWithContent', dirPath, extensions),
    exists: (path: string) => ipcRenderer.invoke('fs:exists', path),
    createDirectory: (dirPath: string) =>
      ipcRenderer.invoke('fs:createDirectory', dirPath),
    deleteFile: (filePath: string) =>
      ipcRenderer.invoke('fs:deleteFile', filePath),
    getStats: (path: string) => ipcRenderer.invoke('fs:getStats', path),
  },

  // App Operations
  app: {
    getDataPath: () => ipcRenderer.invoke('app:getDataPath'),
    selectDataDirectory: () => ipcRenderer.invoke('dialog:selectDataDirectory'),
  },

  // Theme
  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
    set: (theme: 'light' | 'dark' | 'system') =>
      ipcRenderer.invoke('theme:set', theme),
  },
})

console.log('Preload script loaded successfully, electronAPI exposed')

// Type definitions for the exposed API
export interface ElectronAPI {
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

export interface DirectoryEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}



export interface DirectoryEntryWithContent extends DirectoryEntry {
  content?: string
}

export interface FileStats {
  size: number
  created: Date
  modified: Date
  isDirectory: boolean
  isFile: boolean
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
