import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'

let basePath: string = ''

export function setupFileSystemHandlers(dataPath: string) {
  basePath = dataPath

  // Read a file
  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    try {
      const fullPath = resolvePath(filePath)
      const content = await fs.readFile(fullPath, 'utf-8')
      return content
    } catch (error) {
      throw new Error(`Failed to read file: ${filePath}`)
    }
  })

  // Write a file
  ipcMain.handle(
    'fs:writeFile',
    async (_event, filePath: string, content: string) => {
      try {
        const fullPath = resolvePath(filePath)
        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.writeFile(fullPath, content, 'utf-8')
      } catch (error) {
        throw new Error(`Failed to write file: ${filePath}`)
      }
    }
  )

  // Read directory contents
  ipcMain.handle('fs:readDirectory', async (_event, dirPath: string) => {
    try {
      const fullPath = resolvePath(dirPath)
      const entries = await fs.readdir(fullPath, { withFileTypes: true })

      return entries.map((entry) => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
      }))
    } catch (error) {
      // Return empty array if directory doesn't exist
      return []
    }
  })

  // Read directory contents with file content (optimization)
  ipcMain.handle(
    'fs:readDirectoryWithContent',
    async (_event, dirPath: string, extensions?: string[]) => {
      try {
        const fullPath = resolvePath(dirPath)
        const entries = await fs.readdir(fullPath, { withFileTypes: true })

        const results = await Promise.all(
          entries.map(async (entry) => {
            const entryPath = path.join(dirPath, entry.name)
            const isFile = entry.isFile()
            let content = ''

            if (isFile) {
              const ext = path.extname(entry.name).toLowerCase()
              if (!extensions || extensions.includes(ext)) {
                try {
                  content = await fs.readFile(
                    path.join(fullPath, entry.name),
                    'utf-8'
                  )
                } catch {
                  // Ignore read errors for individual files
                }
              }
            }

            return {
              name: entry.name,
              path: entryPath,
              isDirectory: entry.isDirectory(),
              isFile,
              content,
            }
          })
        )

        return results
      } catch (error) {
        // Return empty array if directory doesn't exist
        return []
      }
    }
  )

  // Check if path exists
  ipcMain.handle('fs:exists', async (_event, filePath: string) => {
    try {
      const fullPath = resolvePath(filePath)
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  })

  // Create directory
  ipcMain.handle('fs:createDirectory', async (_event, dirPath: string) => {
    try {
      const fullPath = resolvePath(dirPath)
      await fs.mkdir(fullPath, { recursive: true })
    } catch (error) {
      throw new Error(`Failed to create directory: ${dirPath}`)
    }
  })

  // Delete file
  ipcMain.handle('fs:deleteFile', async (_event, filePath: string) => {
    try {
      const fullPath = resolvePath(filePath)
      await fs.unlink(fullPath)
    } catch (error) {
      throw new Error(`Failed to delete file: ${filePath}`)
    }
  })

  // Get file/directory stats
  ipcMain.handle('fs:getStats', async (_event, filePath: string) => {
    try {
      const fullPath = resolvePath(filePath)
      const stats = await fs.stat(fullPath)

      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
      }
    } catch (error) {
      throw new Error(`Failed to get stats: ${filePath}`)
    }
  })

  // Theme handlers (stored in localStorage on renderer, but we handle system theme)
  ipcMain.handle('theme:get', async () => {
    return 'system'
  })

  ipcMain.handle('theme:set', async (_event, _theme: string) => {
    // Theme is handled by the renderer process via localStorage
    // This is a placeholder for future native theme integration
  })
}

// Resolve a relative path to full path within the data directory
function resolvePath(relativePath: string): string {
  // If it's already absolute, use it directly
  if (path.isAbsolute(relativePath)) {
    return relativePath
  }
  // Otherwise, resolve relative to base path
  return path.join(basePath, relativePath)
}
