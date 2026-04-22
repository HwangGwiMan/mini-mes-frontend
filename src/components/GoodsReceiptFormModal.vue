/**
 * 자재 입고 폼 모달.
 * - 헤더: 입고일자, 발주 연결(optional), 거래처, 비고
 * - 라인: 품목, 입고유형(직접/발주), 입고수량, 단가, 비고
 * - 입고완료(GR_STATUS_02) 또는 취소(GR_STATUS_03) 상태에서 전체 읽기 전용
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
    </template>

    <!-- 헤더 영역 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-if="isEdit">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">입고번호</label>
        <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
          {{ header.receiptNumber }}
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">입고일자 <span class="text-red-500">*</span></label>
        <input
          v-model="header.receiptDate"
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
        <label class="block text-sm font-medium text-gray-700 mb-1.5">연결 발주</label>
        <select
          v-model="header.poId"
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <!-- 직접 입고 시 발주 없이 등록 가능 -->
          <option :value="null">발주 없음 (직접 입고)</option>
          <option v-for="po in poOptions" :key="po.value" :value="Number(po.value)">{{ po.label }}</option>
        </select>
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
      label="입고 상세"
      :locked="isLocked"
      :empty="lines.length === 0"
      @add="addLine"
    >
      <template #head>
        <tr>
          <th class="px-3 py-2 text-left font-medium">품목<span class="text-red-500 ml-0.5">*</span></th>
          <th class="px-3 py-2 text-left font-medium w-32">입고유형<span class="text-red-500 ml-0.5">*</span></th>
          <th class="px-3 py-2 text-right font-medium w-28">입고수량<span class="text-red-500 ml-0.5">*</span></th>
          <th class="px-3 py-2 text-right font-medium w-28">단가</th>
          <th class="px-3 py-2 text-left font-medium">비고</th>
          <th v-if="!isLocked" class="px-3 py-2 w-12"></th>
        </tr>
      </template>
      <template #body>
        <tr v-for="(line, idx) in lines" :key="idx" class="hover:bg-gray-50">
          <td class="px-3 py-2">
            <select
              v-model="line.itemId"
              required
              :disabled="isLocked"
              class="w-full min-w-[140px] px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option :value="0">품목 선택</option>
              <option v-for="i in itemOptions" :key="i.value" :value="Number(i.value)">{{ i.label }}</option>
            </select>
          </td>
          <td class="px-3 py-2">
            <select
              v-model="line.receiptTypeCode"
              required
              :disabled="isLocked"
              class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option v-for="t in lineTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </td>
          <td class="px-3 py-2">
            <input
              v-model.number="line.receivedQuantity"
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
import type { GoodsReceiptRequest, GoodsReceiptLineRequest, GoodsReceiptDto } from '@/api/goodsReceipt'
import ModalShell from './ModalShell.vue'
import LineItemTable from './LineItemTable.vue'
import { useFormModal } from '@/composables/useFormModal'

interface LineForm {
  itemId: number
  receiptTypeCode: string
  receivedQuantity: number
  unitPrice: number | null
  remarks: string
  poLineId: number | null
}

const props = defineProps<{
  modelValue: boolean
  title: string
  initialData?: GoodsReceiptDto | null
  partnerOptions: { value: string; label: string }[]
  itemOptions: { value: string; label: string }[]
  poOptions: { value: string; label: string }[]
  lineTypeOptions: { value: string; label: string }[]
  submitting?: boolean
  errorMsg?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: GoodsReceiptRequest]
}>()

// 입고완료(02) 또는 취소(03) 상태에서는 수정 불가
const isLocked = computed(
  () =>
    props.initialData?.statusCode === 'GR_STATUS_02' ||
    props.initialData?.statusCode === 'GR_STATUS_03',
)
const lockLabel = computed(() =>
  props.initialData?.statusCode === 'GR_STATUS_02' ? '입고완료' : '취소',
)

const header = ref({
  receiptNumber: '',
  receiptDate: '',
  poId: null as number | null,
  partnerId: 0,
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
        receiptNumber: data.receiptNumber,
        receiptDate: data.receiptDate,
        poId: data.poId,
        partnerId: data.partnerId,
        remarks: data.remarks ?? '',
      }
      lines.value = data.lines.map((l) => ({
        itemId: l.itemId,
        receiptTypeCode: l.receiptTypeCode,
        receivedQuantity: l.receivedQuantity,
        unitPrice: l.unitPrice,
        remarks: l.remarks ?? '',
        poLineId: l.poLineId,
      }))
    } else {
      const today = new Date().toISOString().slice(0, 10)
      header.value = { receiptNumber: '', receiptDate: today, poId: null, partnerId: 0, remarks: '' }
      lines.value = [{ itemId: 0, receiptTypeCode: 'GR_LINE_TYPE_01', receivedQuantity: 0, unitPrice: null, remarks: '', poLineId: null }]
    }
  },
  validate: () => {
    if (header.value.partnerId === 0) return '거래처를 선택해야 합니다.'
    const valid = lines.value.filter((l) => l.itemId > 0 && (l.receivedQuantity || 0) > 0)
    if (valid.length === 0) return '품목이 선택된 입고 상세를 1개 이상 추가해야 합니다.'
    return null
  },
  buildRequest: () => {
    const lineRequests: GoodsReceiptLineRequest[] = lines.value
      .filter((l) => l.itemId > 0 && (l.receivedQuantity || 0) > 0)
      .map((l, i) => ({
        itemId: l.itemId,
        poLineId: l.poLineId,
        receiptTypeCode: l.receiptTypeCode,
        receivedQuantity: l.receivedQuantity,
        unitPrice: l.unitPrice ?? null,
        remarks: l.remarks || '',
        sortOrder: i,
      }))
    return {
      receiptDate: header.value.receiptDate,
      poId: header.value.poId,
      partnerId: header.value.partnerId,
      remarks: header.value.remarks || '',
      lines: lineRequests,
    } satisfies GoodsReceiptRequest
  },
  onConfirm: (req) => emit('confirm', req),
})

function addLine() {
  lines.value.push({ itemId: 0, receiptTypeCode: 'GR_LINE_TYPE_01', receivedQuantity: 0, unitPrice: null, remarks: '', poLineId: null })
}

function removeLine(idx: number) {
  lines.value.splice(idx, 1)
}
</script>
