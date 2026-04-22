<template>
  <ModalShell
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="title"
    :submitting="submitting"
    :error="internalError || errorMsg"
    :confirm-disabled="lines.length === 0"
    @confirm="handleSubmit"
  >
    <!-- 헤더 영역 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-if="isEdit" class="lg:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">수주번호</label>
        <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
          {{ header.orderNumber }}
        </div>
      </div>
      <div v-if="header.quoteNumber" class="lg:col-span-1">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">원견적번호</label>
        <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
          {{ header.quoteNumber }}
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">수주일자 <span class="text-red-500">*</span></label>
        <input
          v-model="header.orderDate"
          type="date"
          required
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">납기일</label>
        <input
          v-model="header.deliveryDate"
          type="date"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">거래처 <span class="text-red-500">*</span></label>
        <select
          v-model="header.partnerId"
          required
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">거래처 선택</option>
          <option v-for="p in partnerOptions" :key="p.value" :value="Number(p.value)">{{ p.label }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">담당자</label>
        <select
          v-model="header.employeeId"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">담당자 선택</option>
          <option v-for="e in employeeOptions" :key="e.value" :value="Number(e.value)">{{ e.label }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">상태</label>
        <select
          v-model="header.statusCode"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">상태 선택</option>
          <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
      <div class="sm:col-span-2 lg:col-span-3">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">비고</label>
        <input
          v-model="header.remarks"
          type="text"
          maxlength="200"
          placeholder="비고 입력"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>

    <!-- 라인 영역 -->
    <LineItemTable
      label="수주 상세"
      :empty="lines.length === 0"
      @add="addLine"
    >
      <template #head>
        <tr>
          <th class="px-3 py-2 text-left font-medium">품목</th>
          <th class="px-3 py-2 text-right font-medium w-24">수량</th>
          <th class="px-3 py-2 text-right font-medium w-24">단가</th>
          <th class="px-3 py-2 text-right font-medium w-24">금액</th>
          <th class="px-3 py-2 text-left font-medium w-32">납기요청일</th>
          <th class="px-3 py-2 text-left font-medium">비고</th>
          <th class="px-3 py-2 w-12"></th>
        </tr>
      </template>
      <template #body>
        <tr v-for="(line, idx) in lines" :key="idx" class="hover:bg-gray-50">
          <td class="px-3 py-2">
            <select
              v-model="line.itemId"
              required
              class="w-full min-w-[140px] px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option :value="0">품목 선택</option>
              <option v-for="i in itemOptions" :key="i.value" :value="Number(i.value)">{{ i.label }}</option>
            </select>
          </td>
          <td class="px-3 py-2">
            <input
              v-model.number="line.quantity"
              type="number"
              min="0.0001"
              step="0.0001"
              required
              class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </td>
          <td class="px-3 py-2">
            <input
              v-model.number="line.unitPrice"
              type="number"
              min="0"
              step="0.01"
              required
              class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </td>
          <td class="px-3 py-2 text-right text-gray-600 tabular-nums">{{ formatAmount(lineAmount(idx)) }}</td>
          <td class="px-3 py-2">
            <input
              v-model="line.deliveryRequestDate"
              type="date"
              class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </td>
          <td class="px-3 py-2">
            <input
              v-model="line.remarks"
              type="text"
              class="w-full min-w-[80px] px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </td>
          <td class="px-3 py-2">
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
import type { SalesOrderRequest, SalesOrderLineRequest, SalesOrderDto } from '@/api/order'
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
  initialData?: SalesOrderDto | null
  partnerOptions: { value: string; label: string }[]
  employeeOptions: { value: string; label: string }[]
  itemOptions: { value: string; label: string }[]
  statusOptions: { value: string; label: string }[]
  submitting?: boolean
  errorMsg?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: SalesOrderRequest]
}>()

const isLocked = computed(() => false)

const header = ref({
  orderNumber: '',
  orderDate: '',
  deliveryDate: '',
  quoteNumber: '',
  partnerId: 0,
  employeeId: 0 as number | 0,
  statusCode: '',
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
        deliveryDate: data.deliveryDate ?? '',
        quoteNumber: data.quoteNumber ?? '',
        partnerId: data.partnerId,
        employeeId: data.employeeId ?? 0,
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
        orderNumber: '', orderDate: today, deliveryDate: '', quoteNumber: '',
        partnerId: 0, employeeId: 0, statusCode: '', remarks: '',
      }
      lines.value = [{ itemId: 0, quantity: 0, unitPrice: 0, deliveryRequestDate: '', remarks: '' }]
    }
  },
  validate: () => {
    const valid = lines.value.filter((l) => l.itemId > 0 && (l.quantity || 0) > 0)
    if (valid.length === 0) return '품목이 선택된 수주 상세를 1개 이상 추가해야 합니다.'
    return null
  },
  buildRequest: () => {
    const lineRequests: SalesOrderLineRequest[] = lines.value
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
      orderDate: header.value.orderDate,
      deliveryDate: header.value.deliveryDate || null,
      partnerId: header.value.partnerId,
      employeeId: header.value.employeeId || null,
      statusCode: header.value.statusCode || '',
      remarks: header.value.remarks || '',
      lines: lineRequests,
    } satisfies SalesOrderRequest
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
