<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @mousedown.self="$emit('update:modelValue', false)"
      >
        <div class="absolute inset-0 bg-black/40" />
        <div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="text-base font-semibold text-gray-900">
              {{ action === 'approve' ? '승인' : '반려' }} 코멘트
            </h3>
            <button
              @click="$emit('update:modelValue', false)"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X :size="18" />
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">코멘트 (선택)</label>
              <textarea
                v-model="comment"
                rows="4"
                maxlength="500"
                placeholder="코멘트를 입력하세요."
                class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p class="text-xs text-gray-400 mt-1 text-right">{{ comment.length }} / 500</p>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button
                type="button"
                @click="$emit('update:modelValue', false)"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                :disabled="submitting"
                @click="handleConfirm"
                :class="[
                  'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700',
                ]"
              >
                <span v-if="submitting" class="flex items-center gap-1.5">
                  <Loader2 :size="14" class="animate-spin" />
                  처리 중...
                </span>
                <span v-else>{{ action === 'approve' ? '승인' : '반려' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
  action: 'approve' | 'reject'
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [comment: string]
}>()

const comment = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (open) comment.value = ''
  },
)

function handleConfirm() {
  emit('confirm', comment.value)
}
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
</style>
