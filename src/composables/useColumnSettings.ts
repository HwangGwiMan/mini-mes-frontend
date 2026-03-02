import type { VisibilityState } from '@tanstack/vue-table'
import { useAuthStore } from '@/stores/auth'

export interface ColumnSettings {
  visibility: VisibilityState
  order: string[]
}

export function useColumnSettings(tableId: string) {
  const auth = useAuthStore()

  function storageKey(): string {
    return `col-settings:${auth.username ?? 'guest'}:${tableId}`
  }

  function load(): ColumnSettings | null {
    try {
      const raw = localStorage.getItem(storageKey())
      return raw ? (JSON.parse(raw) as ColumnSettings) : null
    } catch {
      return null
    }
  }

  function save(settings: ColumnSettings): void {
    localStorage.setItem(storageKey(), JSON.stringify(settings))
  }

  function reset(): void {
    localStorage.removeItem(storageKey())
  }

  return { load, save, reset }
}
