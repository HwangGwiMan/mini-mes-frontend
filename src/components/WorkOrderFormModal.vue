/**
 * 작업지시 폼 모달.
 * - 헤더: 수주 연결(optional), 생산 품목, BOM 버전, 창고, 계획수량, 일정, 비고
 * - 품목 선택 후 해당 품목의 활성 BOM 목록을 동적 로드
 * - 확정(WO_STATUS_02) / 취소(WO_STATUS_03) 상태에서는 전체 읽기 전용
 */
<template>
  <ModalShell
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="title"
    :submitting="submitting"
    :error="internalError || errorMsg"
    :locked="isLocked"
    max-width="max-w-3xl"
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
        <label class="block text-sm font-medium text-gray-700 mb-1.5">작업지시 번호</label>
        <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
          {{ form.workOrderNumber }}
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">연결 수주</label>
        <select
          v-model="form.salesOrderId"
          :disabled="isLocked"
          @change="onSalesOrderChange"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option :value="null">수주 없음 (독립 생성)</option>
          <option v-for="so in salesOrderOptions" :key="so.value" :value="Number(so.value)">{{ so.label }}</option>
        </select>
      </div>

      <div v-if="form.salesOrderId">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">연결 수주 라인</label>
        <select
          v-model="form.salesOrderLineId"
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option :value="null">라인 없음</option>
          <option v-for="line in salesOrderLineOptions" :key="line.value" :value="Number(line.value)">{{ line.label }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">생산 품목 <span class="text-red-500">*</span></label>
        <select
          v-model="form.itemId"
          required
          :disabled="isLocked"
          @change="onItemChange"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option :value="0">품목 선택</option>
          <option v-for="i in itemOptions" :key="i.value" :value="Number(i.value)">{{ i.label }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">BOM 버전 <span class="text-red-500">*</span></label>
        <select
          v-model="form.bomId"
          required
          :disabled="isLocked || bomOptions.length === 0"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option :value="0">{{ form.itemId === 0 ? '품목 먼저 선택' : bomOptions.length === 0 ? 'BOM 없음' : 'BOM 선택' }}</option>
          <option v-for="b in bomOptions" :key="b.value" :value="Number(b.value)">{{ b.label }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">창고 <span class="text-red-500">*</span></label>
        <select
          v-model="form.warehouseId"
          required
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option :value="0">창고 선택</option>
          <option v-for="w in warehouseOptions" :key="w.value" :value="Number(w.value)">{{ w.label }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">계획 생산수량 <span class="text-red-500">*</span></label>
        <input
          v-model.number="form.plannedQty"
          type="number"
          min="0.0001"
          step="any"
          required
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">계획 시작일 <span class="text-red-500">*</span></label>
        <input
          v-model="form.plannedStartDate"
          type="date"
          required
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">계획 완료일</label>
        <input
          v-model="form.plannedEndDate"
          type="date"
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>

      <div class="sm:col-span-2 lg:col-span-3">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">비고</label>
        <input
          v-model="form.remarks"
          type="text"
          maxlength="200"
          placeholder="비고 입력"
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>
    </div>

    <!-- 투입 자재 미리보기 (BOM 전개 결과, 상세 보기 시) -->
    <div v-if="initialData && initialData.materials.length > 0">
      <label class="block text-sm font-medium text-gray-700 mb-2">투입 자재 (BOM 전개 결과)</label>
      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-700">
            <tr>
              <th class="px-3 py-2 text-left font-medium">자재 품목</th>
              <th class="px-3 py-2 text-left font-medium">창고</th>
              <th class="px-3 py-2 text-right font-medium w-28">계획 수량</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="m in initialData.materials" :key="m.id" class="hover:bg-gray-50">
              <td class="px-3 py-2">{{ m.materialItemCode }} — {{ m.materialItemName }}</td>
              <td class="px-3 py-2 text-gray-600">{{ m.warehouseName }}</td>
              <td class="px-3 py-2 text-right">{{ m.plannedQty.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </ModalShell>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { bomApi } from '@/api/bom'
import type { WorkOrderRequest, WorkOrderDto } from '@/api/workOrder'
import ModalShell from './ModalShell.vue'

interface Option {
  value: string
  label: string
}

interface SalesOrderLineOption {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: boolean
  title: string
  initialData?: WorkOrderDto | null
  salesOrderOptions: Option[]
  salesOrderLineMap: Record<number, SalesOrderLineOption[]>
  itemOptions: Option[]
  warehouseOptions: Option[]
  submitting?: boolean
  errorMsg?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: WorkOrderRequest]
}>()

const isEdit = ref(false)
const isLocked = computed(
  () =>
    props.initialData?.statusCode === 'WO_STATUS_02' ||
    props.initialData?.statusCode === 'WO_STATUS_03',
)
const lockLabel = computed(() =>
  props.initialData?.statusCode === 'WO_STATUS_02' ? '확정' : '취소',
)
const internalError = ref('')
const bomOptions = ref<Option[]>([])

const form = ref({
  workOrderNumber: '',
  salesOrderId: null as number | null,
  salesOrderLineId: null as number | null,
  itemId: 0,
  bomId: 0,
  warehouseId: 0,
  plannedQty: 0,
  plannedStartDate: '',
  plannedEndDate: '' as string | null,
  remarks: '',
})

const salesOrderLineOptions = computed<SalesOrderLineOption[]>(() => {
  if (!form.value.salesOrderId) return []
  return props.salesOrderLineMap[form.value.salesOrderId] ?? []
})

// BOM API 호출이 async라 useFormModal onOpen을 사용하지 않고 watch를 직접 유지
watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    internalError.value = ''
    bomOptions.value = []
    isEdit.value = !!props.initialData

    if (props.initialData) {
      const d = props.initialData
      form.value = {
        workOrderNumber: d.workOrderNumber,
        salesOrderId: d.salesOrderId,
        salesOrderLineId: d.salesOrderLineId,
        itemId: d.itemId,
        bomId: d.bomId,
        warehouseId: d.warehouseId,
        plannedQty: d.plannedQty,
        plannedStartDate: d.plannedStartDate,
        plannedEndDate: d.plannedEndDate ?? '',
        remarks: d.remarks ?? '',
      }
      if (d.itemId) await loadBomOptions(d.itemId)
    } else {
      const today = new Date().toISOString().slice(0, 10)
      form.value = {
        workOrderNumber: '', salesOrderId: null, salesOrderLineId: null,
        itemId: 0, bomId: 0, warehouseId: 0, plannedQty: 1,
        plannedStartDate: today, plannedEndDate: '', remarks: '',
      }
    }
  },
)

async function loadBomOptions(itemId: number) {
  bomOptions.value = []
  if (!itemId) return
  try {
    const res = await bomApi.getByItemId(itemId)
    bomOptions.value = res.data
      .filter((b) => b.activeYn)
      .map((b) => ({ value: String(b.id), label: `v${b.version}` }))
    if (bomOptions.value.length === 1) {
      form.value.bomId = Number(bomOptions.value[0]?.value ?? 0)
    }
  } catch {
    bomOptions.value = []
  }
}

async function onItemChange() {
  form.value.bomId = 0
  await loadBomOptions(form.value.itemId)
}

function onSalesOrderChange() {
  form.value.salesOrderLineId = null
}

function handleSubmit() {
  if (isLocked.value) return
  if (form.value.itemId === 0) { internalError.value = '생산 품목을 선택해야 합니다.'; return }
  if (form.value.bomId === 0) { internalError.value = 'BOM 버전을 선택해야 합니다.'; return }
  if (form.value.warehouseId === 0) { internalError.value = '창고를 선택해야 합니다.'; return }
  if (!form.value.plannedQty || form.value.plannedQty <= 0) { internalError.value = '계획 생산수량은 0보다 커야 합니다.'; return }
  internalError.value = ''

  emit('confirm', {
    salesOrderId: form.value.salesOrderId,
    salesOrderLineId: form.value.salesOrderLineId,
    itemId: form.value.itemId,
    bomId: form.value.bomId,
    warehouseId: form.value.warehouseId,
    plannedQty: form.value.plannedQty,
    plannedStartDate: form.value.plannedStartDate,
    plannedEndDate: form.value.plannedEndDate || null,
    remarks: form.value.remarks || '',
  })
}
</script>
