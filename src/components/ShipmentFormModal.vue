/**
 * 출하 계획 수정 모달.
 * 출하대기/출하중 상태에서 담당자, 상태, 라인별 계획수량을 수정할 수 있다.
 * 출하완료 상태에서는 이 모달 대신 ShipmentCompleteModal을 사용한다.
 */
<template>
  <ModalShell
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="출하 계획 수정"
    :submitting="submitting"
    :error="errorMsg"
    max-width="max-w-3xl"
    @confirm="handleSubmit"
  >
    <!-- 헤더 정보 (읽기 전용) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">출하번호</label>
        <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
          {{ header.shipmentNumber }}
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">수주번호</label>
        <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
          {{ header.salesOrderNumber }}
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">거래처</label>
        <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
          {{ header.partnerName }}
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">상태 <span class="text-red-500">*</span></label>
        <select
          v-model="header.statusCode"
          required
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">담당자</label>
        <select
          v-model="header.employeeId"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option :value="null">담당자 선택</option>
          <option v-for="e in employeeOptions" :key="e.value" :value="Number(e.value)">{{ e.label }}</option>
        </select>
      </div>
      <div class="sm:col-span-2 lg:col-span-1">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">비고</label>
        <input
          v-model="header.remarks"
          type="text"
          maxlength="200"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>

    <!-- 라인 영역 -->
    <LineItemTable label="출하 상세" :locked="true" :empty="false">
      <template #head>
        <tr>
          <th class="px-3 py-2 text-left font-medium">품목</th>
          <th class="px-3 py-2 text-right font-medium w-28">계획수량</th>
          <th class="px-3 py-2 text-right font-medium w-24">단가</th>
          <th class="px-3 py-2 text-right font-medium w-28">계획금액</th>
          <th class="px-3 py-2 text-left font-medium">비고</th>
        </tr>
      </template>
      <template #body>
        <tr v-for="line in lines" :key="line.id" class="hover:bg-gray-50">
          <td class="px-3 py-2 text-gray-700">{{ line.itemCode }} {{ line.itemName }}</td>
          <td class="px-3 py-2">
            <input
              v-model.number="line.plannedQuantity"
              type="number"
              min="0.0001"
              step="0.0001"
              required
              class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </td>
          <td class="px-3 py-2 text-right text-gray-600 tabular-nums">{{ formatAmount(line.unitPrice) }}</td>
          <td class="px-3 py-2 text-right text-gray-600 tabular-nums">{{ formatAmount(line.plannedQuantity * line.unitPrice) }}</td>
          <td class="px-3 py-2">
            <input
              v-model="line.remarks"
              type="text"
              class="w-full min-w-[80px] px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </td>
        </tr>
      </template>
    </LineItemTable>
  </ModalShell>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ShipmentDto, ShipmentUpdateRequest } from '@/api/shipment'
import ModalShell from './ModalShell.vue'
import LineItemTable from './LineItemTable.vue'

interface LineForm {
  id: number
  itemCode: string
  itemName: string
  plannedQuantity: number
  unitPrice: number
  remarks: string
}

const props = defineProps<{
  modelValue: boolean
  initialData?: ShipmentDto | null
  employeeOptions: { value: string; label: string }[]
  statusOptions: { value: string; label: string }[]
  submitting?: boolean
  errorMsg?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: ShipmentUpdateRequest]
}>()

const header = ref({
  shipmentNumber: '',
  salesOrderNumber: '',
  partnerName: '',
  statusCode: '',
  employeeId: null as number | null,
  remarks: '',
})
const lines = ref<LineForm[]>([])

watch(
  () => props.modelValue,
  (open) => {
    if (open && props.initialData) {
      header.value = {
        shipmentNumber: props.initialData.shipmentNumber,
        salesOrderNumber: props.initialData.salesOrderNumber ?? '',
        partnerName: props.initialData.partnerName ?? '',
        statusCode: props.initialData.statusCode,
        employeeId: props.initialData.employeeId,
        remarks: props.initialData.remarks,
      }
      lines.value = props.initialData.lines.map((l) => ({
        id: l.id,
        itemCode: l.itemCode,
        itemName: l.itemName,
        plannedQuantity: l.plannedQuantity,
        unitPrice: l.unitPrice,
        remarks: l.remarks,
      }))
    }
  },
)

function formatAmount(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString('ko-KR') : '-'
}

function handleSubmit() {
  emit('confirm', {
    employeeId: header.value.employeeId,
    statusCode: header.value.statusCode,
    remarks: header.value.remarks,
    lines: lines.value.map((l) => ({
      id: l.id,
      plannedQuantity: l.plannedQuantity,
      remarks: l.remarks,
    })),
  })
}
</script>
