<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        @mousedown.self="$emit('update:modelValue', false)"
      >
        <div class="absolute inset-0 bg-black/40" />

        <div :class="['relative w-full bg-white rounded-2xl shadow-xl my-8', maxWidth ?? 'max-w-4xl']">
          <!-- 헤더 -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div class="flex items-center gap-3">
              <h3 class="text-base font-semibold text-gray-900">{{ title }}</h3>
              <slot name="status-badge" />
            </div>
            <button
              @click="$emit('update:modelValue', false)"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X :size="18" />
            </button>
          </div>

          <!-- 본문 -->
          <form @submit.prevent="$emit('confirm')" class="px-6 py-5 space-y-5">
            <slot />

            <!-- 에러 블록 -->
            <div
              v-if="error"
              class="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600"
            >
              <AlertCircle :size="14" class="shrink-0" />
              <span>{{ error }}</span>
            </div>

            <!-- 푸터 버튼 -->
            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                @click="$emit('update:modelValue', false)"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {{ locked ? '닫기' : '취소' }}
              </button>
              <button
                v-if="!locked"
                type="submit"
                :disabled="submitting || confirmDisabled"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="submitting" class="flex items-center gap-1.5">
                  <Loader2 :size="14" class="animate-spin" /> 저장 중...
                </span>
                <span v-else>저장</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X, AlertCircle, Loader2 } from 'lucide-vue-next'

defineProps<{
  modelValue: boolean
  title: string
  submitting?: boolean
  error?: string
  locked?: boolean
  maxWidth?: string
  confirmDisabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
