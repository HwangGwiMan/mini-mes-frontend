/**
 * 구매 요청 폼 모달.
 * QuoteFormModal과 동일한 구조이나 아래 차이점이 있다:
 * - 거래처(partnerId) 대신 요청자(requesterId, 사원 select)
 * - 라인에 단가/금액 없음 — 수량·소요예정일만 관리
 * - 승인자(approverId), 유효기간(validUntil) 없음
 * - 검토중(PR_STATUS_02) 상태에서 수정 불가
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
    @confirm="handleSubmit"
  >
    <template #status-badge>
      <span
        v-if="isLocked"
        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
      >
        검토중 — 수정 불가
      </span>
    </template>

    <!-- 헤더 영역 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-if="isEdit" class="sm:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">요청번호</label>
        <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
          {{ header.requestNumber }}
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">요청일자 <span class="text-red-500">*</span></label>
        <input
          v-model="header.requestDate"
          type="date"
          required
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">요청자</label>
        <select
          v-model="header.requesterId"
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option :value="null">요청자 선택</option>
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
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>
    </div>

    <!-- 라인 영역 -->
    <LineItemTable
      label="구매 요청 상세"
      :locked="isLocked"
      :empty="lines.length === 0"
      @add="addLine"
    >
      <template #head>
        <tr>
          <th class="px-3 py-2 text-left font-medium">품목<span class="text-red-500 ml-0.5">*</span></th>
          <th class="px-3 py-2 text-right font-medium w-28">요청 수량<span class="text-red-500 ml-0.5">*</span></th>
          <th class="px-3 py-2 text-left font-medium w-32">소요 예정일</th>
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
            <input
              v-model.number="line.requestedQuantity"
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
import type { PurchaseRequestRequest, PurchaseRequestLineRequest, PurchaseRequestDto } from '@/api/purchaseRequest'
import ModalShell from './ModalShell.vue'
import LineItemTable from './LineItemTable.vue'
import { useFormModal } from '@/composables/useFormModal'

interface LineForm {
  itemId: number
  requestedQuantity: number
  requiredDate: string
  remarks: string
}

const props = defineProps<{
  modelValue: boolean
  title: string
  initialData?: PurchaseRequestDto | null
  employeeOptions: { value: string; label: string }[]
  itemOptions: { value: string; label: string }[]
  submitting?: boolean
  errorMsg?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: PurchaseRequestRequest]
}>()

// 검토중(PR_STATUS_02) 상태에서는 수정 불가 — 제출 이후 내용 변경 방지
const isLocked = computed(() => props.initialData?.statusCode === 'PR_STATUS_02')

const header = ref({
  requestNumber: '',
  requestDate: '',
  requesterId: null as number | null,
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
        requestNumber: data.requestNumber,
        requestDate: data.requestDate,
        requesterId: data.requesterId,
        remarks: data.remarks ?? '',
      }
      lines.value = data.lines.map((l) => ({
        itemId: l.itemId,
        requestedQuantity: l.requestedQuantity,
        requiredDate: l.requiredDate ?? '',
        remarks: l.remarks ?? '',
      }))
    } else {
      const today = new Date().toISOString().slice(0, 10)
      header.value = { requestNumber: '', requestDate: today, requesterId: null, remarks: '' }
      lines.value = [{ itemId: 0, requestedQuantity: 0, requiredDate: '', remarks: '' }]
    }
  },
  validate: () => {
    const valid = lines.value.filter((l) => l.itemId > 0 && (l.requestedQuantity || 0) > 0)
    if (valid.length === 0) return '품목이 선택된 구매 요청 상세를 1개 이상 추가해야 합니다.'
    return null
  },
  buildRequest: () => {
    const validLines: PurchaseRequestLineRequest[] = lines.value
      .filter((l) => l.itemId > 0 && (l.requestedQuantity || 0) > 0)
      .map((l, i) => ({
        itemId: l.itemId,
        requestedQuantity: l.requestedQuantity,
        requiredDate: l.requiredDate || null,
        remarks: l.remarks || '',
        sortOrder: i,
      }))
    return {
      requestDate: header.value.requestDate,
      requesterId: header.value.requesterId,
      remarks: header.value.remarks || '',
      lines: validLines,
    } satisfies PurchaseRequestRequest
  },
  onConfirm: (req) => emit('confirm', req),
})

function addLine() {
  lines.value.push({ itemId: 0, requestedQuantity: 0, requiredDate: '', remarks: '' })
}

function removeLine(idx: number) {
  lines.value.splice(idx, 1)
}
</script>
