/**
 * 알림 벨 버튼.
 *
 * 읽지 않은 알림 수를 배지로 표시하고 클릭 시 드롭다운을 토글한다.
 * 드롭다운 외부 클릭 시 닫힌다.
 * ADR-007에서 정의한 Bell 아이콘 + 미확인 건수 배지 요구사항을 구현한다.
 *
 * @see doc/docs/adr/007-notification-sse-design.md
 */
<template>
  <div class="relative" ref="bellRef">
    <button
      class="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
      @click="open = !open"
    >
      <Bell :size="18" />
      <span
        v-if="store.unreadCount > 0"
        class="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none"
      >
        {{ store.unreadCount > 99 ? '99+' : store.unreadCount }}
      </span>
    </button>

    <Transition name="dropdown">
      <NotificationDropdown v-if="open" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Bell } from 'lucide-vue-next'
import { useNotificationStore } from '@/stores/notification'
import NotificationDropdown from './NotificationDropdown.vue'

const store = useNotificationStore()
const open = ref(false)
const bellRef = ref<HTMLElement | null>(null)

function handleOutsideClick(e: MouseEvent) {
  if (bellRef.value && !bellRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', handleOutsideClick))
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
