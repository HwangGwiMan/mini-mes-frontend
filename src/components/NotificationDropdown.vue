/**
 * 알림 드롭다운 패널.
 *
 * 최근 50건 알림을 목록으로 표시하고 읽음 처리를 지원한다.
 * 항목 클릭 시 읽음 처리 후 referenceId가 있으면 type에 따라 해당 화면으로 이동한다.
 * "모두 읽음" 버튼으로 전체 읽음 처리가 가능하다.
 */
<template>
  <div
    class="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
  >
    <!-- 헤더 -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <span class="text-sm font-semibold text-gray-800">알림</span>
      <button
        v-if="store.unreadCount > 0"
        class="text-xs text-blue-600 hover:text-blue-800 transition-colors"
        @click="store.markAllRead()"
      >
        모두 읽음
      </button>
    </div>

    <!-- 목록 -->
    <ul class="max-h-96 overflow-y-auto divide-y divide-gray-50">
      <li v-if="store.notifications.length === 0" class="px-4 py-8 text-center text-sm text-gray-400">
        알림이 없습니다.
      </li>
      <li
        v-for="n in store.notifications"
        :key="n.id"
        class="flex gap-3 px-4 py-3 cursor-pointer transition-colors"
        :class="n.isRead ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'"
        @click="handleClick(n)"
      >
        <!-- 읽지 않음 배지 -->
        <span
          class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          :class="n.isRead ? 'bg-transparent' : 'bg-blue-500'"
        />
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-800 leading-snug">{{ n.message }}</p>
          <p class="mt-0.5 text-xs text-gray-400">{{ formatTime(n.createdAt) }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notification'
import type { NotificationDto, NotificationType } from '@/types/notification'

const store = useNotificationStore()
const router = useRouter()

// referenceId가 있을 때 type에 따라 이동할 경로
const typeToRoute: Partial<Record<NotificationType, string>> = {
  QUOTE_SUBMITTED: '/quote',
  QUOTE_APPROVED: '/quote',
  QUOTE_REJECTED: '/quote',
  PO_CREATED_FROM_PR: '/purchase-order',
  PO_CANCELLED: '/purchase-order',
  GOODS_RECEIPT_CONFIRMED: '/goods-receipt',
}

async function handleClick(n: NotificationDto) {
  if (!n.isRead) {
    await store.markRead(n.id)
  }
  const route = typeToRoute[n.type]
  if (route) {
    router.push(route)
  }
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}
</script>
