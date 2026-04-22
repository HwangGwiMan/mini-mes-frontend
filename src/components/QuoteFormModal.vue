<template>
  <ModalShell
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="title"
    :submitting="submitting"
    :error="internalError || errorMsg"
    :locked="isSubmitted"
    :confirm-disabled="lines.length === 0"
    @confirm="handleSubmit"
  >
    <template #status-badge>
      <span
        v-if="isSubmitted"
        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
      >
        제출됨 — 수정 불가
      </span>
    </template>

    <!-- 헤더 영역 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-if="isEdit" class="lg:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">견적번호</label>
        <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
          {{ header.quoteNumber }}
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">견적일자 <span class="text-red-500">*</span></label>
        <input
          v-model="header.quoteDate"
          type="date"
          required
          :disabled="isSubmitted"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">유효기간</label>
        <input
          v-model="header.validUntil"
          type="date"
          :disabled="isSubmitted"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">거래처 <span class="text-red-500">*</span></label>
        <select
          v-model="header.partnerId"
          required
          :disabled="isSubmitted"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option value="">거래처 선택</option>
          <option v-for="p in partnerOptions" :key="p.value" :value="Number(p.value)">{{ p.label }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">담당자</label>
        <select
          v-model="header.employeeId"
          :disabled="isSubmitted"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option value="">담당자 선택</option>
          <option v-for="e in employeeOptions" :key="e.value" :value="Number(e.value)">{{ e.label }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">결재자 <span class="text-red-500">*</span></label>
        <select
          v-model="header.approverId"
          required
          :disabled="isSubmitted"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option value="">결재자 선택</option>
          <option v-for="e in employeeOptions" :key="e.value" :value="Number(e.value)">{{ e.label }}</option>
        </select>
      </div>
      <div class="sm:col-span-2 lg:col-span-3">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">비고</label>
        <input
          v-model="header.remarks"
          type="text"
          maxlength="200"
          placeholder="비고 입력"
          :disabled="isSubmitted"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>
    </div>

    <!-- 라인 영역 -->
    <LineItemTable
      label="견적 상세"
      :locked="isSubmitted"
      :empty="lines.length === 0"
      @add="addLine"
    >
      <template #head>
        <tr>
          <th class="px-3 py-2 text-left font-medium">품목<span class="text-red-500 ml-0.5">*</span></th>
          <th class="px-3 py-2 text-right font-medium w-24">수량<span class="text-red-500 ml-0.5">*</span></th>
          <th class="px-3 py-2 text-right font-medium w-24">단가<span class="text-red-500 ml-0.5">*</span></th>
          <th class="px-3 py-2 text-right font-medium w-24">금액</th>
          <th class="px-3 py-2 text-left font-medium w-32">납기요청일</th>
          <th class="px-3 py-2 text-left font-medium">비고</th>
          <th v-if="!isSubmitted" class="px-3 py-2 w-12"></th>
        </tr>
      </template>
      <template #body>
        <tr v-for="(line, idx) in lines" :key="idx" class="hover:bg-gray-50">
          <td class="px-3 py-2">
            <select
              v-model="line.itemId"
              required
              :disabled="isSubmitted"
              class="w-full min-w-[140px] px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option :value="0">품목 선택</option>
              <option v-for="i in itemOptions" :key="i.value" :value="Number(i.value)">{{ i.label }}</option>
            </select>
          </td>
          <td class="px-3 py-2">
            <input
              v-model.number="line.quantity"
              type="number"
              min="1"
              step="1"
              required
              :disabled="isSubmitted"
              class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
            />
          </td>
          <td class="px-3 py-2">
            <input
              v-model.number="line.unitPrice"
              type="number"
              min="0"
              step="1"
              required
              :disabled="isSubmitted"
              class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
            />
          </td>
          <td class="px-3 py-2 text-right text-gray-600 tabular-nums">{{ formatAmount(lineAmount(idx)) }}</td>
          <td class="px-3 py-2">
            <input
              v-model="line.deliveryRequestDate"
              type="date"
              :disabled="isSubmitted"
              class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
            />
          </td>
          <td class="px-3 py-2">
            <input
              v-model="line.remarks"
              type="text"
              :disabled="isSubmitted"
              class="w-full min-w-[80px] px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
            />
          </td>
          <td v-if="!isSubmitted" class="px-3 py-2">
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
import type { QuoteRequest, QuoteLineRequest, QuoteDto } from '@/api/quote'
import ModalShell from './ModalShell.vue'
import LineItemTable from './LineItemTable.vue'
import { useFormModal } from '@/composables/useFormModal'

interface LineForm {
  itemId: number
  quantity: number
  unitPrice: number
  deliveryRequestDate: string
  remarks: string
}

const props = defineProps<{
  modelValue: boolean
  title: string
  initialData?: QuoteDto | null
  partnerOptions: { value: string; label: string }[]
  employeeOptions: { value: string; label: string }[]
  itemOptions: { value: string; label: string }[]
  submitting?: boolean
  errorMsg?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: QuoteRequest]
}>()

const header = ref({
  quoteNumber: '',
  quoteDate: '',
  validUntil: '',
  partnerId: 0,
  employeeId: 0 as number | 0,
  approverId: 0 as number | 0,
  statusCode: '',
  remarks: '',
})
const lines = ref<LineForm[]>([])

// 결재 제출(QUOTE_STATUS_02) 이후 수정 불가 — 결재 진행 중 내용 변경 방지
const isSubmitted = computed(() => header.value.statusCode === 'QUOTE_STATUS_02')
const isLocked = isSubmitted

const { internalError, isEdit, handleSubmit } = useFormModal({
  modelValue: toRef(props, 'modelValue'),
  initialData: toRef(props, 'initialData'),
  isLocked,
  onOpen: (_isEdit, data) => {
    if (data) {
      header.value = {
        quoteNumber: data.quoteNumber,
        quoteDate: data.quoteDate,
        validUntil: data.validUntil ?? '',
        partnerId: data.partnerId,
        employeeId: data.employeeId ?? 0,
        approverId: data.approverId ?? 0,
        statusCode: data.statusCode ?? '',
        remarks: data.remarks ?? '',
      }
      lines.value = data.lines.map((l) => ({
        itemId: l.itemId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        deliveryRequestDate: l.deliveryRequestDate ?? '',
        remarks: l.remarks ?? '',
      }))
    } else {
      const today = new Date().toISOString().slice(0, 10)
      header.value = {
        quoteNumber: '', quoteDate: today, validUntil: '',
        partnerId: 0, employeeId: 0, approverId: 0, statusCode: '', remarks: '',
      }
      lines.value = [{ itemId: 0, quantity: 0, unitPrice: 0, deliveryRequestDate: '', remarks: '' }]
    }
  },
  validate: () => {
    const valid = lines.value.filter((l) => l.itemId > 0 && (l.quantity || 0) > 0)
    if (valid.length === 0) return '품목이 선택된 견적 상세를 1개 이상 추가해야 합니다.'
    return null
  },
  buildRequest: () => {
    const lineRequests: QuoteLineRequest[] = lines.value
      .filter((l) => l.itemId > 0 && (l.quantity || 0) > 0)
      .map((l, i) => ({
        itemId: l.itemId,
        quantity: l.quantity || 0,
        unitPrice: l.unitPrice || 0,
        deliveryRequestDate: l.deliveryRequestDate || null,
        remarks: l.remarks || '',
        sortOrder: i,
      }))
    return {
      quoteDate: header.value.quoteDate,
      validUntil: header.value.validUntil || null,
      partnerId: header.value.partnerId,
      employeeId: header.value.employeeId || null,
      approverId: header.value.approverId,
      remarks: header.value.remarks || '',
      lines: lineRequests,
    } satisfies QuoteRequest
  },
  onConfirm: (req) => emit('confirm', req),
})

function addLine() {
  lines.value.push({ itemId: 0, quantity: 0, unitPrice: 0, deliveryRequestDate: '', remarks: '' })
}

function removeLine(idx: number) {
  lines.value.splice(idx, 1)
}

function lineAmount(idx: number): number {
  const line = lines.value[idx]
  return (line?.quantity || 0) * (line?.unitPrice || 0)
}

function formatAmount(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString('ko-KR') : '-'
}
</script>
