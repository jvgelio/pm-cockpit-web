import { useEffect, useCallback, useRef } from 'react'

type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta'

interface ShortcutOptions {
  key: string
  modifiers?: readonly ModifierKey[] | ModifierKey[]
  callback: () => void
  enabled?: boolean
}

/**
 * Hook for registering global keyboard shortcuts
 *
 * @example
 * useGlobalShortcut({
 *   key: 'i',
 *   modifiers: ['ctrl'],
 *   callback: () => openInbox(),
 * })
 */
export function useGlobalShortcut({
  key,
  modifiers = [],
  callback,
  enabled = true,
}: ShortcutOptions) {
  // Use a ref for callback to avoid re-registering event listener when callback changes
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Stable modifiers list
  const modifiersRef = useRef(modifiers)
  useEffect(() => {
    modifiersRef.current = modifiers
  }, [modifiers])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if the key matches
      // Use both key and code for robustness
      const keyMatch =
        event.key.toLowerCase() === key.toLowerCase() ||
        event.code.toLowerCase() === `key${key.toLowerCase()}`

      if (!keyMatch) {
        return
      }

      const currentModifiers = modifiersRef.current
      const ctrlRequired = currentModifiers.includes('ctrl')
      const altRequired = currentModifiers.includes('alt')
      const shiftRequired = currentModifiers.includes('shift')
      const metaRequired = currentModifiers.includes('meta')

      // Cross-platform "Cmd or Ctrl" check
      // On Mac, we typically want Cmd (metaKey) for shortcuts that use Ctrl on Windows
      const isMac = 
        typeof window !== 'undefined' && 
        (navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
         navigator.userAgent.indexOf('Mac') >= 0)
      
      let modifierMatches = true
      
      if (ctrlRequired) {
        // If ctrl is required, it must be either ctrlKey OR (if on Mac) metaKey
        const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey
        if (!cmdOrCtrl) modifierMatches = false
      } else {
        // If ctrl is NOT required, ensure NEITHER ctrl NOR meta (on Mac) is pressed
        const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey
        if (cmdOrCtrl) modifierMatches = false
      }

      if (altRequired !== event.altKey) modifierMatches = false
      if (shiftRequired !== event.shiftKey) modifierMatches = false
      
      // If meta is explicitly required (not just as a Mac-Ctrl substitute)
      if (metaRequired && !event.metaKey) modifierMatches = false
      // If meta is NOT required, and we are NOT on Mac (where it might be used as Ctrl substitute)
      if (!metaRequired && !isMac && event.metaKey) modifierMatches = false

      if (!modifierMatches) {
        return
      }

      // Don't trigger if typing in an input unless it's a modifier shortcut
      const target = event.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      const hasModifiers = ctrlRequired || altRequired || metaRequired
      
      if (isTyping && !hasModifiers) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      callbackRef.current()
    },
    [key] // Only depend on the key itself
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

/**
 * Hook specifically for Ctrl+I inbox shortcut
 */
export function useInboxShortcut(callback: () => void, enabled = true) {
  // The hook internal handles stable modifiers via Ref, so this is safe
  useGlobalShortcut({
    key: 'i',
    modifiers: ['ctrl'],
    callback,
    enabled,
  })
}
