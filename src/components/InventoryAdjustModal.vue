/**
 * 재고 조정 모달.
 * - ADJUST_IN: 재고 증가 (실사 초과분 등)
 * - ADJUST_OUT: 재고 감소 (폐기·손실 등) — 부모에서 ConfirmDialog 2차 확인 후 처리
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
            <h3 class="text-base font-semibold text-gray-900">재고 조정</h3>
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

            <!-- 창고 (읽기 전용 — 행에서 선택됨) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">창고</label>
              <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600">
                {{ warehouseName }}
              </div>
            </div>

            <!-- 조정 유형 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                조정 유형 <span class="text-red-500">*</span>
              </label>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" v-model="form.txType" value="ADJUST_IN" class="accent-blue-600" />
                  <span class="text-sm font-medium text-blue-600">입고 조정</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" v-model="form.txType" value="ADJUST_OUT" class="accent-red-500" />
                  <span class="text-sm font-medium text-red-500">출고 조정</span>
                </label>
              </div>
              <!-- 조정 유형 안내 -->
              <p
                class="mt-1.5 text-xs"
                :class="form.txType === 'ADJUST_IN' ? 'text-blue-500' : 'text-red-500'"
              >
                {{ form.txType === 'ADJUST_IN' ? '재고가 증가합니다.' : '재고가 감소합니다.' }}
              </p>
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
                placeholder="조정 수량 입력"
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
                class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
                :class="form.txType === 'ADJUST_IN' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'"
              >
                <SlidersHorizontal :size="14" />
                조정 적용
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
import { X, SlidersHorizontal } from 'lucide-vue-next'
import type { InventoryDto, AdjustRequest } from '@/api/inventory'

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
  confirm: [data: AdjustRequest]
}>()

const form = ref({
  qty: null as number | null,
  lotNo: '',
  txType: 'ADJUST_IN' as 'ADJUST_IN' | 'ADJUST_OUT',
})
const showLotField = ref(false)
const internalError = ref('')

// warehouseOptions에서 현재 창고명 찾기
const warehouseName = computed(() => {
  if (!props.initialItem) return '-'
  const opt = props.warehouseOptions.find(
    (o) => Number(o.value) === props.initialItem!.warehouseId,
  )
  return opt ? opt.label : String(props.initialItem.warehouseId)
})

// 모달이 열릴 때 폼 초기화
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.value.qty = null
      form.value.lotNo = ''
      form.value.txType = 'ADJUST_IN'
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

  if (!form.value.qty || form.value.qty <= 0) {
    internalError.value = '조정 수량을 입력하세요.'
    return
  }

  emit('confirm', {
    warehouseId: props.initialItem!.warehouseId,
    itemId: props.initialItem!.itemId,
    lotNo: showLotField.value && form.value.lotNo.trim() ? form.value.lotNo.trim() : undefined,
    qty: form.value.qty,
    txType: form.value.txType,
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
