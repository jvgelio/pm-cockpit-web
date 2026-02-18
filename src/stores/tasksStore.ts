import { create } from 'zustand'
import type { Task, TaskStatus, TaskPriority } from '@/types'
import {
  parseTask,
  serializeTask,
  generateTaskId,
  generateTaskFilename,
} from '@/lib/markdown'
import { storage } from '@/lib/storage'

// ============================================
// Tasks Store
// ============================================

interface TasksState {
  // Data
  tasks: Task[]
  isLoading: boolean
  error: string | null

  // Actions
  loadTasks: () => Promise<void>
  createTask: (data: {
    title: string
    description?: string
    priority?: TaskPriority
    dueDate?: Date
    initiativeId?: string
    tags?: string[]
  }) => Promise<Task>
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'filePath' | 'createdAt'>>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<void>
  reopenTask: (id: string) => Promise<void>

  // Queries
  getTaskById: (id: string) => Task | undefined
  getTasksByStatus: (status: TaskStatus) => Task[]
  getTasksForInitiative: (initiativeId: string) => Task[]
  getPendingTasks: () => Task[]
  getOverdueTasks: () => Task[]
  searchTasks: (query: string) => Task[]
}

export const useTasksStore = create<TasksState>((set, get) => ({
  // Initial state
  tasks: [],
  isLoading: false,
  error: null,

  // Load tasks from filesystem
  loadTasks: async () => {
    set({ isLoading: true, error: null })

    try {
      const tasks: Task[] = []

      // Check if tasks folder exists
      const tasksExists = await storage.exists('tasks')
      if (!tasksExists) {
        await storage.createDirectory('tasks')
      }

      // Load task files
      const entries = await storage.readDirectory('tasks')
      for (const entry of entries) {
        if (!entry.isDirectory && entry.name.endsWith('.md')) {
          try {
            const content = await storage.readFile(entry.path)
            if (content) {
              const task = parseTask(content, entry.path)
              tasks.push(task)
            }
          } catch {
            console.warn(`Failed to parse task: ${entry.path}`)
          }
        }
      }

      // Sort by priority (urgent first) then by due date
      tasks.sort((a, b) => {
        const priorityOrder: Record<TaskPriority, number> = {
          urgent: 0,
          high: 1,
          medium: 2,
          low: 3,
        }
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        if (priorityDiff !== 0) return priorityDiff

        // Then by due date (soonest first, no due date last)
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime()
        }
        if (a.dueDate) return -1
        if (b.dueDate) return 1

        return 0
      })

      set({ tasks, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load tasks',
        isLoading: false,
      })
    }
  },

  // Create new task
  createTask: async (data) => {
    const state = get()
    const existingIds = state.tasks.map((t) => t.id)
    const newId = generateTaskId(existingIds)
    const fileName = generateTaskFilename(newId, data.title)
    const filePath = `tasks/${fileName}`

    const task: Task = {
      id: newId,
      title: data.title,
      description: data.description,
      status: 'pending',
      priority: data.priority || 'medium',
      dueDate: data.dueDate,
      initiativeId: data.initiativeId,
      tags: data.tags || [],
      createdAt: new Date(),
      filePath,
    }

    const content = serializeTask(task)
    await storage.writeFile(filePath, content)

    // Add to state
    set({ tasks: [task, ...state.tasks] })

    return task
  },

  // Update task
  updateTask: async (id, updates) => {
    const state = get()
    const taskIndex = state.tasks.findIndex((t) => t.id === id)
    if (taskIndex === -1) {
      throw new Error(`Task not found: ${id}`)
    }

    const task = state.tasks[taskIndex]
    const updatedTask: Task = { ...task, ...updates }

    const content = serializeTask(updatedTask)
    await storage.writeFile(task.filePath, content)

    const newTasks = [...state.tasks]
    newTasks[taskIndex] = updatedTask
    set({ tasks: newTasks })
  },

  // Delete task
  deleteTask: async (id) => {
    const state = get()
    const task = state.tasks.find((t) => t.id === id)
    if (!task) {
      throw new Error(`Task not found: ${id}`)
    }

    await storage.deleteFile(task.filePath)
    set({ tasks: state.tasks.filter((t) => t.id !== id) })
  },

  // Complete task
  completeTask: async (id) => {
    const state = get()
    const task = state.tasks.find((t) => t.id === id)
    if (!task) {
      throw new Error(`Task not found: ${id}`)
    }

    await get().updateTask(id, {
      status: 'done',
      completedAt: new Date(),
    })
  },

  // Reopen task
  reopenTask: async (id) => {
    const state = get()
    const task = state.tasks.find((t) => t.id === id)
    if (!task) {
      throw new Error(`Task not found: ${id}`)
    }

    await get().updateTask(id, {
      status: 'pending',
      completedAt: undefined,
    })
  },

  // Get task by ID
  getTaskById: (id) => {
    const state = get()
    return state.tasks.find((t) => t.id === id)
  },

  // Get tasks by status
  getTasksByStatus: (status) => {
    const state = get()
    return state.tasks.filter((t) => t.status === status)
  },

  // Get tasks for initiative
  getTasksForInitiative: (initiativeId) => {
    const state = get()
    return state.tasks.filter((t) => t.initiativeId === initiativeId)
  },

  // Get pending tasks (not done, not cancelled)
  getPendingTasks: () => {
    const state = get()
    return state.tasks.filter(
      (t) => t.status === 'pending' || t.status === 'in_progress'
    )
  },

  // Get overdue tasks
  getOverdueTasks: () => {
    const state = get()
    const now = new Date()
    return state.tasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate < now &&
        t.status !== 'done' &&
        t.status !== 'cancelled'
    )
  },

  // Search tasks
  searchTasks: (query) => {
    const state = get()
    const lowerQuery = query.toLowerCase()

    return state.tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(lowerQuery) ||
        t.description?.toLowerCase().includes(lowerQuery) ||
        t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    )
  },
}))
