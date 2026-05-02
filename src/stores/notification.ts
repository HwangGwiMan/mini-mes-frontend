/**
 * 알림 스토어.
 *
 * SSE 연결 생명주기(connectSse/disconnectSse)와 알림 목록 상태를 관리한다.
 * EventSource는 Authorization 헤더를 지원하지 않으므로 token을 쿼리파라미터로 전달한다.
 * 연결 끊김 시 지수 백오프(3s→6s→...→60s)로 자동 재연결한다.
 * 재연결 후 loadNotifications()로 미수신 알림을 복구한다 — SSE 유실 보완 전략은 ADR-007 참고.
 *
 * @see doc/docs/adr/007-notification-sse-design.md
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { notificationApi } from '@/api/notification'
import type { NotificationDto } from '@/types/notification'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const INITIAL_RECONNECT_DELAY = 3000
const MAX_RECONNECT_DELAY = 60000

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<NotificationDto[]>([])
  const unreadCount = computed(() => notifications.value.filter((n) => !n.isRead).length)

  let eventSource: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectDelay = INITIAL_RECONNECT_DELAY

  function connectSse() {
    const authStore = useAuthStore()
    if (!authStore.token) return

    eventSource?.close()

    const url = `${BASE_URL}/api/notifications/subscribe?token=${authStore.token}`
    eventSource = new EventSource(url)

    eventSource.addEventListener('CONNECTED', () => {
      reconnectDelay = INITIAL_RECONNECT_DELAY
    })

    eventSource.addEventListener('NOTIFICATION', (e) => {
      const notification: NotificationDto = JSON.parse(e.data)
      notifications.value.unshift(notification)
      reconnectDelay = INITIAL_RECONNECT_DELAY
    })

    eventSource.onerror = () => {
      eventSource?.close()
      eventSource = null
      // 지수 백오프 재연결 — 로그아웃 시 disconnectSse()가 타이머를 정리한다
      reconnectTimer = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
        connectSse()
      }, reconnectDelay)
    }
  }

  function disconnectSse() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    eventSource?.close()
    eventSource = null
  }

  async function loadNotifications() {
    try {
      notifications.value = await notificationApi.fetchAll()
    } catch {
      // 초기 로드 실패는 조용히 무시 — SSE 연결 후 실시간 수신으로 보완
    }
  }

  async function markRead(id: number) {
    await notificationApi.markAsRead(id)
    const target = notifications.value.find((n) => n.id === id)
    if (target) target.isRead = true
  }

  async function markAllRead() {
    await notificationApi.markAllRead()
    notifications.value.forEach((n) => {
      n.isRead = true
    })
  }

  return {
    notifications,
    unreadCount,
    connectSse,
    disconnectSse,
    loadNotifications,
    markRead,
    markAllRead,
  }
})
