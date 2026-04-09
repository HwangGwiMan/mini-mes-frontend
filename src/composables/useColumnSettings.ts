import { z } from 'zod'
import { useAuthStore } from '@/stores/auth'

const ColumnSettingsSchema = z.object({
  // VisibilityState = Record<string, boolean>
  visibility: z.record(z.string(), z.boolean()),
  order: z.array(z.string()),
})

export type ColumnSettings = z.infer<typeof ColumnSettingsSchema>

export function useColumnSettings(tableId: string) {
  const auth = useAuthStore()

  function storageKey(): string {
    return `col-settings:${auth.username ?? 'guest'}:${tableId}`
  }

  function load(): ColumnSettings | null {
    try {
      const raw = localStorage.getItem(storageKey())
      if (!raw) return null
      const parsed = ColumnSettingsSchema.safeParse(JSON.parse(raw))
      // 스키마 불일치 시 null 반환 → 호출부에서 기본 컬럼 설정으로 fallback
      return parsed.success ? parsed.data : null
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
