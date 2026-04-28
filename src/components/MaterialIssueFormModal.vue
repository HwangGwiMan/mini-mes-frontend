/**
 * 자재 출고 폼 모달.
 * - 헤더: 작업지시(생성 시 선택, 수정 시 읽기전용), 출고일자, 비고
 * - 라인: WorkOrderMaterial에서 복사된 고정 라인 (LOT, 출고수량만 편집 가능)
 * - 확정(MI_STATUS_02) 또는 취소(MI_STATUS_03) 상태에서 전체 읽기 전용
 */
<template>
  <ModalShell
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="title"
    :submitting="submitting"
    :error="internalError || errorMsg"
    :locked="isLocked"
    max-width="max-w-4xl"
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
        <label class="block text-sm font-medium text-gray-700 mb-1.5">출고번호</label>
        <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
          {{ header.materialIssueNumber }}
        </div>
      </div>

      <!-- 작업지시 선택 — 생성 시만 편집, 수정 시 읽기전용 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          작업지시 <span class="text-red-500">*</span>
        </label>
        <select
          v-if="!isEdit"
          v-model="header.workOrderId"
          required
          :disabled="isLocked"
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          @change="onWorkOrderChange"
        >
          <option :value="0">작업지시 선택</option>
          <option v-for="wo in workOrderOptions" :key="wo.value" :value="Number(wo.value)">
            {{ wo.label }}
          </option>
        </select>
        <!-- 수정 시에는 텍스트로만 표시 -->
        <div
          v-else
          class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500"
        >
          {{ header.workOrderNumber }}
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          출고일자 <span class="text-red-500">*</span>
        </label>
        <input
          v-model="header.issueDate"
          type="date"
          required
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

    <!-- 라인 영역 — 추가/삭제 없음, LOT·수량만 편집 -->
    <LineItemTable
      label="출고 상세"
      :locked="true"
      :empty="lines.length === 0"
    >
      <template #head>
        <tr>
          <th class="px-3 py-2 text-left font-medium">자재품목</th>
          <th class="px-3 py-2 text-left font-medium">창고</th>
          <th class="px-3 py-2 text-right font-medium w-28">계획수량</th>
          <th class="px-3 py-2 text-left font-medium w-32">LOT</th>
          <th class="px-3 py-2 text-right font-medium w-28">
            출고수량 <span v-if="!isLocked" class="text-red-500">*</span>
          </th>
        </tr>
      </template>
      <template #body>
        <tr v-if="lines.length === 0">
          <td colspan="5" class="px-3 py-4 text-center text-sm text-gray-400">
            작업지시를 선택하면 자재 목록이 표시됩니다.
          </td>
        </tr>
        <tr v-for="(line, idx) in lines" :key="idx" class="hover:bg-gray-50">
          <td class="px-3 py-2 text-sm">
            {{ line.materialItemCode }} — {{ line.materialItemName }}
          </td>
          <td class="px-3 py-2 text-sm text-gray-600">{{ line.warehouseName }}</td>
          <td class="px-3 py-2 text-sm text-right text-gray-500">{{ line.plannedQty }}</td>
          <td class="px-3 py-2">
            <input
              v-model="line.lotNo"
              type="text"
              maxlength="50"
              placeholder="LOT (선택)"
              :disabled="isLocked"
              class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
          </td>
          <td class="px-3 py-2">
            <input
              v-model.number="line.issuedQty"
              type="number"
              min="0.0001"
              step="any"
              required
              :disabled="isLocked"
              class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
          </td>
        </tr>
      </template>
    </LineItemTable>
  </ModalShell>
</template>

<script setup lang="ts">
import { ref, computed, toRef, type ComputedRef } from 'vue'
import type { MaterialIssueDto, MaterialIssueRequest } from '@/api/materialIssue'
import ModalShell from './ModalShell.vue'
import LineItemTable from './LineItemTable.vue'
import { useFormModal } from '@/composables/useFormModal'
import { workOrderApi } from '@/api/workOrder'

interface LineForm {
  id: number
  materialItemCode: string
  materialItemName: string
  warehouseName: string
  plannedQty: number
  lotNo: string
  issuedQty: number
}

const props = defineProps<{
  modelValue: boolean
  title: string
  initialData?: MaterialIssueDto | null
  workOrderOptions: { value: string; label: string }[]
  submitting?: boolean
  errorMsg?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: MaterialIssueRequest]
}>()

// 확정(02) 또는 취소(03) 상태에서 수정 불가
const isLocked: ComputedRef<boolean> = computed(
  () =>
    props.initialData?.statusCode === 'MI_STATUS_02' ||
    props.initialData?.statusCode === 'MI_STATUS_03',
)
const lockLabel = computed(() =>
  props.initialData?.statusCode === 'MI_STATUS_02' ? '확정' : '취소',
)

const header = ref({
  materialIssueNumber: '',
  workOrderId: 0,
  workOrderNumber: '',
  issueDate: '',
  remarks: '',
})
const lines = ref<LineForm[]>([])

const { internalError, isEdit, handleSubmit } = useFormModal({
  modelValue: toRef(props, 'modelValue'),
  initialData: toRef(props, 'initialData'),
  isLocked,
  onOpen: (_isEdit, data) => {
    const today = new Date().toISOString().slice(0, 10)
    if (data) {
      header.value = {
        materialIssueNumber: data.materialIssueNumber,
        workOrderId: data.workOrderId,
        workOrderNumber: data.workOrderNumber,
        issueDate: data.issueDate,
        remarks: data.remarks ?? '',
      }
      // 기존 라인: DTO에서 복원 (plannedQty는 별도 조회 불필요 — 표시 전용)
      lines.value = data.lines.map((l) => ({
        id: l.id,
        materialItemCode: l.materialItemCode,
        materialItemName: l.materialItemName,
        warehouseName: l.warehouseName,
        plannedQty: l.issuedQty, // 수정 화면에서는 기존 출고수량을 계획수량으로 표시
        lotNo: l.lotNo ?? '',
        issuedQty: l.issuedQty,
      }))
    } else {
      header.value = { materialIssueNumber: '', workOrderId: 0, workOrderNumber: '', issueDate: today, remarks: '' }
      lines.value = []
    }
  },
  validate: () => {
    if (!isEdit.value && header.value.workOrderId === 0) return '작업지시를 선택해야 합니다.'
    if (!header.value.issueDate) return '출고일자를 입력해야 합니다.'
    if (lines.value.length === 0) return '출고 라인이 없습니다. 작업지시를 선택하면 라인이 자동 생성됩니다.'
    const invalid = lines.value.find((l) => !l.issuedQty || l.issuedQty <= 0)
    if (invalid) return '모든 라인의 출고 수량은 0보다 커야 합니다.'
    return null
  },
  buildRequest: (): MaterialIssueRequest => ({
    workOrderId: isEdit.value ? null : header.value.workOrderId,
    issueDate: header.value.issueDate,
    remarks: header.value.remarks || '',
    lines: lines.value.map((l) => ({
      id: l.id,
      lotNo: l.lotNo || null,
      issuedQty: l.issuedQty,
    })),
  } satisfies MaterialIssueRequest),
  onConfirm: (req) => emit('confirm', req),
})

/** 작업지시 선택 시 해당 WO의 자재 목록을 자동으로 라인에 로드 */
async function onWorkOrderChange() {
  const woId = header.value.workOrderId
  if (!woId) {
    lines.value = []
    return
  }
  try {
    const res = await workOrderApi.getById(woId)
    lines.value = res.data.materials.map((m) => ({
      id: m.id,
      materialItemCode: m.materialItemCode,
      materialItemName: m.materialItemName,
      warehouseName: m.warehouseName,
      plannedQty: m.plannedQty,
      lotNo: '',
      issuedQty: m.plannedQty,
    }))
  } catch {
    lines.value = []
  }
}
</script>
