/**
 * 전역 토스트 알림 composable.
 * 모듈 수준의 reactive 배열을 공유하여 어느 컴포넌트에서 호출해도 같은 토스트 목록을 참조한다.
 * AppToast.vue에서 toasts를 구독하고, 뷰/composable에서 showSuccess/showError를 호출한다.
 */
import { reactive } from 'vue'

export interface Toast {
  id: number
  type: 'success' | 'error'
  message: string
}

// 모듈 싱글턴 — Pinia store 없이도 전역 상태 공유
const toasts = reactive<Toast[]>([])
let nextId = 0
const DURATION_MS = 4000

function show(type: 'success' | 'error', message: string) {
  const id = nextId++
  toasts.push({ id, type, message })
  setTimeout(() => {
    const idx = toasts.findIndex((t) => t.id === id)
    if (idx !== -1) toasts.splice(idx, 1)
  }, DURATION_MS)
}

export function useToast() {
  return {
    toasts,
    showSuccess: (message: string) => show('success', message),
    showError: (message: string) => show('error', message),
    dismiss: (id: number) => {
      const idx = toasts.findIndex((t) => t.id === id)
      if (idx !== -1) toasts.splice(idx, 1)
    },
  }
}
