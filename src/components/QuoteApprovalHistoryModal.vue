<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @mousedown.self="$emit('update:modelValue', false)"
      >
        <div class="absolute inset-0 bg-black/40" />
        <div class="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="text-base font-semibold text-gray-900">결재 이력</h3>
            <button
              @click="$emit('update:modelValue', false)"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X :size="18" />
            </button>
          </div>
          <div class="px-6 py-5">
            <div v-if="loading" class="flex justify-center py-8">
              <Loader2 :size="24" class="animate-spin text-gray-400" />
            </div>
            <div v-else-if="approvals.length === 0" class="text-center text-sm text-gray-500 py-8">
              결재 이력이 없습니다.
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-gray-700">
                  <tr>
                    <th class="px-3 py-2 text-left font-medium">일시</th>
                    <th class="px-3 py-2 text-left font-medium">결재자</th>
                    <th class="px-3 py-2 text-left font-medium">결과</th>
                    <th class="px-3 py-2 text-left font-medium">코멘트</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="item in approvals" :key="item.id" class="hover:bg-gray-50">
                    <td class="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {{ formatDate(item.createdAt) }}
                    </td>
                    <td class="px-3 py-2">
                      <div class="font-medium text-gray-900">{{ item.approverName }}</div>
                      <div class="text-xs text-gray-400">{{ item.approverUsername }}</div>
                    </td>
                    <td class="px-3 py-2">
                      <span
                        :class="[
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          item.action === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800',
                        ]"
                      >
                        {{ item.action === 'APPROVED' ? '승인' : '반려' }}
                      </span>
                    </td>
                    <td class="px-3 py-2 text-gray-600 max-w-[240px] truncate">
                      {{ item.comment ?? '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="flex justify-end pt-4">
              <button
                type="button"
                @click="$emit('update:modelValue', false)"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                닫기
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
import type { ApprovalResponse } from '@/api/quote'
import { quoteApi } from '@/api/quote'

const props = defineProps<{
  modelValue: boolean
  quoteId: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const approvals = ref<ApprovalResponse[]>([])
const loading = ref(false)

watch(
  () => props.modelValue,
  async (open) => {
    if (open && props.quoteId != null) {
      loading.value = true
      try {
        const res = await quoteApi.getApprovals(props.quoteId)
        approvals.value = res.data
      } finally {
        loading.value = false
      }
    } else {
      approvals.value = []
    }
  },
)

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
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
