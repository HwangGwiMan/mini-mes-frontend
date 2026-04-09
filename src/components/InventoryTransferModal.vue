/**
 * 창고 간 재고 이동 모달.
 * - 행 클릭 시 initialItem으로 품목·출발 창고가 자동 선택됨
 * - API 호출은 부모(InventoryView)가 담당 — 이 컴포넌트는 confirm 이벤트만 emit
 */
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @mousedown.self="close"
      >
        <div class="absolute inset-0 bg-black/40" />

        <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-xl">
          <!-- 헤더 -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="text-base font-semibold text-gray-900">창고 간 이동</h3>
            <button
              @click="close"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X :size="18" />
            </button>
          </div>

          <!-- 폼 -->
          <form @submit.prevent="handleSubmit" class="px-6 py-5 space-y-4">
            <!-- 품목 (읽기 전용) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">품목</label>
              <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600">
                {{ initialItem ? `${initialItem.itemCode} — ${initialItem.itemName}` : '-' }}
              </div>
            </div>

            <!-- 출발 창고 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                출발 창고 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.fromWarehouseId"
                class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="0" disabled>창고 선택</option>
                <option v-for="opt in warehouseOptions" :key="opt.value" :value="Number(opt.value)">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- 도착 창고 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                도착 창고 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.toWarehouseId"
                class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="0" disabled>창고 선택</option>
                <option v-for="opt in warehouseOptions" :key="opt.value" :value="Number(opt.value)">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- 수량 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                수량 <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="form.qty"
                type="number"
                min="0.0001"
                step="any"
                placeholder="이동 수량 입력"
                class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- LOT 번호 (선택) -->
            <div>
              <label class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5 cursor-pointer">
                <input type="checkbox" v-model="showLotField" class="accent-blue-600" />
                LOT 지정
              </label>
              <input
                v-if="showLotField"
                v-model="form.lotNo"
                type="text"
                placeholder="LOT 번호 입력"
                maxlength="100"
                class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- 오류 메시지 -->
            <p v-if="internalError" class="text-sm text-red-600">{{ internalError }}</p>

            <!-- 버튼 -->
            <div class="flex justify-end gap-2 pt-1">
              <button
                type="button"
                @click="close"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                :disabled="submitting"
                class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <ArrowLeftRight :size="14" />
                이동 확정
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, ArrowLeftRight } from 'lucide-vue-next'
import type { InventoryDto, TransferRequest } from '@/api/inventory'

interface Props {
  modelValue: boolean
  warehouseOptions: { value: string; label: string }[]
  initialItem?: InventoryDto | null
  submitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialItem: null,
  submitting: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: TransferRequest]
}>()

const form = ref({ fromWarehouseId: 0, toWarehouseId: 0, qty: null as number | null, lotNo: '' })
const showLotField = ref(false)
const internalError = ref('')

// 모달이 열릴 때 폼 초기화
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.value.fromWarehouseId = props.initialItem ? props.initialItem.warehouseId : 0
      form.value.toWarehouseId = 0
      form.value.qty = null
      form.value.lotNo = ''
      showLotField.value = false
      internalError.value = ''
    }
  },
)

function close() {
  emit('update:modelValue', false)
}

function handleSubmit() {
  internalError.value = ''

  if (!form.value.fromWarehouseId) {
    internalError.value = '출발 창고를 선택하세요.'
    return
  }
  if (!form.value.toWarehouseId) {
    internalError.value = '도착 창고를 선택하세요.'
    return
  }
  if (form.value.fromWarehouseId === form.value.toWarehouseId) {
    internalError.value = '출발 창고와 도착 창고가 같습니다.'
    return
  }
  if (!form.value.qty || form.value.qty <= 0) {
    internalError.value = '이동 수량을 입력하세요.'
    return
  }

  emit('confirm', {
    fromWarehouseId: form.value.fromWarehouseId,
    toWarehouseId: form.value.toWarehouseId,
    itemId: props.initialItem!.itemId,
    lotNo: showLotField.value && form.value.lotNo.trim() ? form.value.lotNo.trim() : undefined,
    qty: form.value.qty,
  })
}
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
