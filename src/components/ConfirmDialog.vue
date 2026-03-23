/**
 * 공통 확인 다이얼로그.
 * 삭제·마감·전환 등 되돌릴 수 없는 작업 전 사용자 확인을 받는다.
 * variant에 따라 아이콘과 확인 버튼 색상이 달라진다.
 * - danger(기본): 삭제 등 파괴적 작업 → 빨간색
 * - warning: 마감·취소 등 주의 필요 작업 → 주황색
 */
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @mousedown.self="emit('cancel')"
      >
        <div class="absolute inset-0 bg-black/40" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <div class="flex items-center gap-3 mb-4">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full"
              :class="variant === 'warning' ? 'bg-orange-100' : 'bg-red-100'"
            >
              <AlertTriangle
                :size="20"
                :class="variant === 'warning' ? 'text-orange-500' : 'text-red-600'"
              />
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900">{{ title }}</h3>
              <p class="text-sm text-gray-500 mt-0.5">이 작업은 되돌릴 수 없습니다.</p>
            </div>
          </div>
          <p class="text-sm text-gray-700 mb-6">{{ message }}</p>
          <div class="flex justify-end gap-2">
            <button
              @click="emit('cancel')"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              @click="emit('confirm')"
              :disabled="loading"
              class="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
              :class="variant === 'warning' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-600 hover:bg-red-700'"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'warning'
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  confirmLabel: '삭제',
  variant: 'danger',
  loading: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
