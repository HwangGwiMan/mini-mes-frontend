/**
 * 출하 완료 처리 모달.
 * 실출하일자와 라인별 실출하수량을 입력받아 출하를 완료 처리한다.
 * 부분 출하를 허용하므로 실출하수량이 계획수량보다 적어도 된다.
 * 계획수량이 기본값으로 채워지며 사용자가 수정할 수 있다.
 */
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        @mousedown.self="$emit('update:modelValue', false)"
      >
        <div class="absolute inset-0 bg-black/40" />

        <div class="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl my-8">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="text-base font-semibold text-gray-900">출하 완료 처리</h3>
            <button
              @click="$emit('update:modelValue', false)"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X :size="18" />
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="px-6 py-5 space-y-5">
            <!-- 출하 기본 정보 -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">출하번호</label>
                <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
                  {{ initialData?.shipmentNumber }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">수주번호</label>
                <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
                  {{ initialData?.salesOrderNumber }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  출하일자 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="shipmentDate"
                  type="date"
                  required
                  class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <!-- 라인별 실출하수량 입력 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">실출하 수량 입력</label>
              <div class="overflow-x-auto rounded-lg border border-gray-200">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 text-gray-700">
                    <tr>
                      <th class="px-3 py-2 text-left font-medium">품목</th>
                      <th class="px-3 py-2 text-right font-medium w-28">계획수량</th>
                      <th class="px-3 py-2 text-right font-medium w-28">실출하수량</th>
                      <th class="px-3 py-2 text-right font-medium w-24">단가</th>
                      <th class="px-3 py-2 text-right font-medium w-28">실출하금액</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    <tr v-for="line in lines" :key="line.id" class="hover:bg-gray-50">
                      <td class="px-3 py-2 text-gray-700">
                        {{ line.itemCode }} {{ line.itemName }}
                      </td>
                      <td class="px-3 py-2 text-right text-gray-500 tabular-nums">
                        {{ line.plannedQuantity.toLocaleString('ko-KR') }}
                      </td>
                      <td class="px-3 py-2">
                        <input
                          v-model.number="line.actualQuantity"
                          type="number"
                          min="0"
                          step="0.0001"
                          required
                          class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td class="px-3 py-2 text-right text-gray-600 tabular-nums">
                        {{ formatAmount(line.unitPrice) }}
                      </td>
                      <td class="px-3 py-2 text-right text-gray-700 tabular-nums font-medium">
                        {{ formatAmount(line.actualQuantity * line.unitPrice) }}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot class="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colspan="4" class="px-3 py-2 text-sm font-medium text-gray-700 text-right">합계</td>
                      <td class="px-3 py-2 text-right text-sm font-semibold text-gray-900 tabular-nums">
                        {{ formatAmount(totalActualAmount) }}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div v-if="errorMsg" class="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              <AlertCircle :size="14" class="shrink-0" />
              <span>{{ errorMsg }}</span>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                @click="$emit('update:modelValue', false)"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                :disabled="submitting"
                class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="submitting" class="flex items-center gap-1.5">
                  <Loader2 :size="14" class="animate-spin" />
                  처리 중...
                </span>
                <span v-else>출하 완료</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, AlertCircle, Loader2 } from 'lucide-vue-next'
import type { ShipmentDto, ShipmentCompleteRequest } from '@/api/shipment'

interface LineForm {
  id: number
  itemCode: string
  itemName: string
  plannedQuantity: number
  actualQuantity: number
  unitPrice: number
}

const props = defineProps<{
  modelValue: boolean
  initialData?: ShipmentDto | null
  submitting?: boolean
  errorMsg?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: ShipmentCompleteRequest]
}>()

const shipmentDate = ref('')
const lines = ref<LineForm[]>([])

// 계획수량을 실출하수량 기본값으로 채운다
watch(
  () => props.modelValue,
  (open) => {
    if (open && props.initialData) {
      shipmentDate.value = new Date().toISOString().slice(0, 10)
      lines.value = props.initialData.lines.map((l) => ({
        id: l.id,
        itemCode: l.itemCode,
        itemName: l.itemName,
        plannedQuantity: l.plannedQuantity,
        actualQuantity: l.plannedQuantity, // 계획수량을 기본값으로 설정
        unitPrice: l.unitPrice,
      }))
    }
  },
)

const totalActualAmount = computed(() =>
  lines.value.reduce((sum, l) => sum + (l.actualQuantity || 0) * l.unitPrice, 0),
)

function formatAmount(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString('ko-KR') : '-'
}

function handleSubmit() {
  const payload: ShipmentCompleteRequest = {
    shipmentDate: shipmentDate.value,
    lines: lines.value.map((l) => ({
      id: l.id,
      actualQuantity: l.actualQuantity,
    })),
  }
  emit('confirm', payload)
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
.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
