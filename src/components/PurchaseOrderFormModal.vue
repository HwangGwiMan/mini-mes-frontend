/**
 * 구매 발주 폼 모달.
 * PurchaseRequestFormModal과 구조는 동일하나 아래 차이점이 있다:
 * - 요청자(requesterId) 대신 거래처(partnerId, partner select)
 * - 예상입고일(expectedArrivalDate) 필드 추가
 * - 라인에 단가(unitPrice) 필드 추가
 * - 발주됨(PO_STATUS_02) / 입고완료(PO_STATUS_03) 상태에서 수정 불가
 * - PR 전환 시 prLineId가 있는 라인에 "PR" 배지 표시
 */
<template>
  <ModalShell
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="title"
    :submitting="submitting"
    :error="internalError || errorMsg"
    :locked="isLocked"
    :confirm-disabled="lines.length === 0"
    max-width="max-w-5xl"
    @confirm="handleSubmit"
  >
    <template #status-badge>
      <span
        v-if="isLocked"
        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
      >
        {{ lockLabel }} — 수정 불가
      </span>
      <span
        v-if="isPrConversion"
        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
      >
        PR 전환
      </span>
    </template>

    <!-- 헤더 영역 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-if="isEdit" class="sm:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">발주번호</label>
        <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
          {{ header.orderNumber }}
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">발주일자 <span class="text-red-500">*</span></label>
        <input
          v-model="header.orderDate"
          type="date"
          required
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">거래처 <span class="text-red-500">*</span></label>
        <select
          v-model="header.partnerId"
          required
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option :value="0">거래처 선택</option>
          <option v-for="p in partnerOptions" :key="p.value" :value="Number(p.value)">{{ p.label }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">예상 입고일</label>
        <input
          v-model="header.expectedArrivalDate"
          type="date"
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>
      <div class="sm:col-span-2 lg:col-span-3">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">비고</label>
        <input
          v-model="header.remarks"
          type="text"
          maxlength="200"
          placeholder="비고 입력"
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>
    </div>

    <!-- 라인 영역 -->
    <LineItemTable
      label="발주 상세"
      :locked="isLocked"
      :empty="lines.length === 0"
      @add="addLine"
    >
      <template #head>
        <tr>
          <th class="px-3 py-2 text-left font-medium">품목<span class="text-red-500 ml-0.5">*</span></th>
          <th class="px-3 py-2 text-right font-medium w-28">발주 수량<span class="text-red-500 ml-0.5">*</span></th>
          <th class="px-3 py-2 text-right font-medium w-28">단가</th>
          <th class="px-3 py-2 text-left font-medium w-32">희망 납기일</th>
          <th class="px-3 py-2 text-left font-medium">비고</th>
          <th v-if="!isLocked" class="px-3 py-2 w-12"></th>
        </tr>
      </template>
      <template #body>
        <tr v-for="(line, idx) in lines" :key="idx" class="hover:bg-gray-50">
          <td class="px-3 py-2">
            <div class="flex items-center gap-1.5">
              <select
                v-model="line.itemId"
                required
                :disabled="isLocked || !!line.prLineId"
                class="w-full min-w-[140px] px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option :value="0">품목 선택</option>
                <option v-for="i in itemOptions" :key="i.value" :value="Number(i.value)">{{ i.label }}</option>
              </select>
              <!-- PR 전환된 라인은 품목 변경 불가 — 구매요청 추적을 위해 원본 품목 유지 -->
              <span
                v-if="line.prLineId"
                class="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700"
              >PR</span>
            </div>
          </td>
          <td class="px-3 py-2">
            <input
              v-model.number="line.orderedQuantity"
              type="number"
              min="0.0001"
              step="any"
              required
              :disabled="isLocked"
              class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
            />
          </td>
          <td class="px-3 py-2">
            <input
              v-model.number="line.unitPrice"
              type="number"
              min="0"
              step="any"
              placeholder="0"
              :disabled="isLocked"
              class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
            />
          </td>
          <td class="px-3 py-2">
            <input
              v-model="line.requiredDate"
              type="date"
              :disabled="isLocked"
              class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
            />
          </td>
          <td class="px-3 py-2">
            <input
              v-model="line.remarks"
              type="text"
              :disabled="isLocked"
              class="w-full min-w-[80px] px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
            />
          </td>
          <td v-if="!isLocked" class="px-3 py-2">
            <button
              type="button"
              @click="removeLine(idx)"
              class="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
              title="삭제"
            >
              <Trash2 :size="14" />
            </button>
          </td>
        </tr>
      </template>
    </LineItemTable>
  </ModalShell>
</template>

<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import type { PurchaseOrderRequest, PurchaseOrderLineRequest, PurchaseOrderDto } from '@/api/purchaseOrder'
import ModalShell from './ModalShell.vue'
import LineItemTable from './LineItemTable.vue'
import { useFormModal } from '@/composables/useFormModal'

interface LineForm {
  itemId: number
  orderedQuantity: number
  unitPrice: number | null
  requiredDate: string
  remarks: string
  prLineId: number | null
}

const props = defineProps<{
  modelValue: boolean
  title: string
  initialData?: PurchaseOrderDto | null
  partnerOptions: { value: string; label: string }[]
  itemOptions: { value: string; label: string }[]
  submitting?: boolean
  errorMsg?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: PurchaseOrderRequest]
}>()

// 발주됨(02) 또는 입고완료(03) 상태에서는 수정 불가
const isLocked = computed(
  () =>
    props.initialData?.statusCode === 'PO_STATUS_02' ||
    props.initialData?.statusCode === 'PO_STATUS_03',
)
const lockLabel = computed(() =>
  props.initialData?.statusCode === 'PO_STATUS_03' ? '입고완료' : '발주됨',
)
const isPrConversion = computed(() => !!props.initialData?.prId)

const header = ref({
  orderNumber: '',
  orderDate: '',
  partnerId: 0,
  expectedArrivalDate: '',
  remarks: '',
})
const lines = ref<LineForm[]>([])

const { internalError, isEdit, handleSubmit } = useFormModal({
  modelValue: toRef(props, 'modelValue'),
  initialData: toRef(props, 'initialData'),
  isLocked,
  onOpen: (_isEdit, data) => {
    if (data) {
      header.value = {
        orderNumber: data.orderNumber,
        orderDate: data.orderDate,
        partnerId: data.partnerId,
        expectedArrivalDate: data.expectedArrivalDate ?? '',
        remarks: data.remarks ?? '',
      }
      lines.value = data.lines.map((l) => ({
        itemId: l.itemId,
        orderedQuantity: l.orderedQuantity,
        unitPrice: l.unitPrice,
        requiredDate: l.requiredDate ?? '',
        remarks: l.remarks ?? '',
        prLineId: l.prLineId,
      }))
    } else {
      const today = new Date().toISOString().slice(0, 10)
      header.value = { orderNumber: '', orderDate: today, partnerId: 0, expectedArrivalDate: '', remarks: '' }
      lines.value = [{ itemId: 0, orderedQuantity: 0, unitPrice: null, requiredDate: '', remarks: '', prLineId: null }]
    }
  },
  validate: () => {
    if (header.value.partnerId === 0) return '거래처를 선택해야 합니다.'
    const valid = lines.value.filter((l) => l.itemId > 0 && (l.orderedQuantity || 0) > 0)
    if (valid.length === 0) return '품목이 선택된 발주 상세를 1개 이상 추가해야 합니다.'
    return null
  },
  buildRequest: () => {
    const lineRequests: PurchaseOrderLineRequest[] = lines.value
      .filter((l) => l.itemId > 0 && (l.orderedQuantity || 0) > 0)
      .map((l, i) => ({
        itemId: l.itemId,
        orderedQuantity: l.orderedQuantity,
        unitPrice: l.unitPrice ?? null,
        requiredDate: l.requiredDate || null,
        remarks: l.remarks || '',
        sortOrder: i,
        prLineId: l.prLineId,
      }))
    return {
      orderDate: header.value.orderDate,
      partnerId: header.value.partnerId,
      expectedArrivalDate: header.value.expectedArrivalDate || null,
      remarks: header.value.remarks || '',
      lines: lineRequests,
    } satisfies PurchaseOrderRequest
  },
  onConfirm: (req) => emit('confirm', req),
})

function addLine() {
  lines.value.push({ itemId: 0, orderedQuantity: 0, unitPrice: null, requiredDate: '', remarks: '', prLineId: null })
}

function removeLine(idx: number) {
  lines.value.splice(idx, 1)
}
</script>
