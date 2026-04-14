/**
 * 작업지시 관리 화면.
 * - 검색: 작업지시 번호, 품목명, 상태
 * - 워크플로: 확정(초안→확정, 자재 선점), 취소(초안/확정→취소, 자재 해제)
 */
<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">작업지시</h2>
        <p class="text-sm text-gray-500 mt-0.5">생산 작업지시를 등록하고 자재 선점 워크플로를 관리합니다.</p>
      </div>
      <button
        @click="openCreate"
        class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus :size="15" />
        신규 등록
      </button>
    </div>

    <SearchBar
      :model-value="search"
      :fields="searchFields"
      @search="fetchData"
      @reset="resetSearch"
    />

    <DataTable :data="workOrders" :columns="columns" :loading="loading" table-id="work-order">
      <template #actions="{ row }">
        <div class="flex items-center gap-1.5">
          <!-- 수정: 초안(01) -->
          <button
            v-if="row.statusCode === 'WO_STATUS_01'"
            @click="openEdit(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            <Pencil :size="12" />
            수정
          </button>
          <!-- 상세: 확정(02) / 취소(03) -->
          <button
            v-else
            @click="openDetail(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            <Eye :size="12" />
            상세
          </button>
          <!-- 삭제: 초안(01) -->
          <button
            v-if="row.statusCode === 'WO_STATUS_01'"
            @click="confirmDelete(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
          >
            <Trash2 :size="12" />
            삭제
          </button>
          <!-- 확정: 초안(01) -->
          <button
            v-if="row.statusCode === 'WO_STATUS_01'"
            @click="handleConfirm(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
          >
            <CheckCircle :size="12" />
            확정
          </button>
          <!-- 취소: 초안(01) / 확정(02) -->
          <button
            v-if="row.statusCode === 'WO_STATUS_01' || row.statusCode === 'WO_STATUS_02'"
            @click="handleCancel(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors whitespace-nowrap"
          >
            <XCircle :size="12" />
            취소
          </button>
        </div>
      </template>
    </DataTable>

    <WorkOrderFormModal
      v-model="modalOpen"
      :title="modalTitle"
      :initial-data="editTarget"
      :sales-order-options="salesOrderOptions"
      :sales-order-line-map="salesOrderLineMap"
      :item-options="itemOptions"
      :warehouse-options="warehouseOptions"
      :submitting="submitting"
      :error-msg="modalError"
      @confirm="handleFormConfirm"
    />

    <!-- 삭제 확인 -->
    <ConfirmDialog
      :open="!!deleteTarget"
      title="작업지시 삭제"
      :message="`'${deleteTarget?.workOrderNumber}' 작업지시를 삭제하시겠습니까?`"
      :loading="submitting"
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />

    <!-- 확정 확인 -->
    <ConfirmDialog
      :open="!!confirmTarget"
      title="작업지시 확정"
      :message="`'${confirmTarget?.workOrderNumber}'을(를) 확정하시겠습니까? 투입 자재가 재고에서 선점됩니다.`"
      confirm-label="확정"
      :loading="actionLoading"
      @confirm="doConfirm"
      @cancel="confirmTarget = null"
    />

    <!-- 취소 확인 -->
    <ConfirmDialog
      :open="!!cancelTarget"
      title="작업지시 취소"
      :message="cancelMessage"
      confirm-label="취소"
      variant="danger"
      :loading="actionLoading"
      @confirm="doCancel"
      @cancel="cancelTarget = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Eye } from 'lucide-vue-next'
import { createColumnHelper } from '@tanstack/vue-table'
import DataTable from '@/components/DataTable.vue'
import SearchBar from '@/components/SearchBar.vue'
import WorkOrderFormModal from '@/components/WorkOrderFormModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { SearchFieldDef } from '@/components/SearchBar.vue'
import { workOrderApi, WO_STATUS_LABELS, type WorkOrderDto, type WorkOrderRequest } from '@/api/workOrder'
import { orderApi } from '@/api/order'
import { itemApi } from '@/api/item'
import { warehouseApi } from '@/api/warehouse'
import { useCrudPage } from '@/composables/useCrudPage'
import { useToast } from '@/composables/useToast'
import { extractErrorMessage, extractSaveErrorMessage } from '@/types/api-error'

const { showSuccess, showError } = useToast()

const salesOrderOptions = ref<{ value: string; label: string }[]>([])
const salesOrderLineMap = ref<Record<number, { value: string; label: string }[]>>({})
const itemOptions = ref<{ value: string; label: string }[]>([])
const warehouseOptions = ref<{ value: string; label: string }[]>([])

const search = reactive({ workOrderNumber: '', itemName: '', statusCode: '' })

const {
  rows: workOrders,
  loading,
  submitting,
  modalOpen,
  modalError,
  editTarget,
  deleteTarget,
  fetchData,
  confirmDelete,
  handleDelete,
} = useCrudPage<WorkOrderDto, WorkOrderRequest>({
  fetchFn: async () => {
    const { data } = await workOrderApi.getAll({
      workOrderNumber: search.workOrderNumber || undefined,
      itemName: search.itemName || undefined,
      statusCode: search.statusCode || undefined,
    })
    return { data }
  },
  createFn: (data: WorkOrderRequest) => workOrderApi.create(data),
  updateFn: (id: number, data: WorkOrderRequest) => workOrderApi.update(id, data),
  deleteFn: (id: number) => workOrderApi.delete(id),
  toPayload: (x) => x as unknown as WorkOrderRequest,
})

const modalTitle = computed(() => {
  if (!editTarget.value) return '작업지시 등록'
  if (editTarget.value.statusCode !== 'WO_STATUS_01') return '작업지시 상세'
  return '작업지시 수정'
})

function openCreate() {
  editTarget.value = null
  modalError.value = ''
  modalOpen.value = true
}

async function openEdit(row: WorkOrderDto) {
  const { data } = await workOrderApi.getById(row.id)
  editTarget.value = data
  modalError.value = ''
  modalOpen.value = true
}

async function openDetail(row: WorkOrderDto) {
  const { data } = await workOrderApi.getById(row.id)
  editTarget.value = data
  modalError.value = ''
  modalOpen.value = true
}

function resetSearch() {
  search.workOrderNumber = ''
  search.itemName = ''
  search.statusCode = ''
  fetchData()
}

async function handleFormConfirm(payload: WorkOrderRequest) {
  submitting.value = true
  modalError.value = ''
  try {
    if (editTarget.value && editTarget.value.id !== 0) {
      await workOrderApi.update(editTarget.value.id, payload)
      showSuccess(`'${editTarget.value.workOrderNumber}' 이(가) 수정되었습니다.`)
    } else {
      await workOrderApi.create(payload)
      showSuccess('작업지시가 등록되었습니다.')
    }
    modalOpen.value = false
    await fetchData()
  } catch (err: unknown) {
    modalError.value = extractSaveErrorMessage(err)
  } finally {
    submitting.value = false
  }
}

const actionLoading = ref(false)

// 확정
const confirmTarget = ref<WorkOrderDto | null>(null)
function handleConfirm(row: WorkOrderDto) { confirmTarget.value = row }
async function doConfirm() {
  if (!confirmTarget.value) return
  actionLoading.value = true
  try {
    await workOrderApi.confirm(confirmTarget.value.id)
    confirmTarget.value = null
    showSuccess('작업지시가 확정되었습니다. 투입 자재가 재고에서 선점되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    showError(extractErrorMessage(err, '확정 중 오류가 발생했습니다.'))
    confirmTarget.value = null
  } finally {
    actionLoading.value = false
  }
}

// 취소
const cancelTarget = ref<WorkOrderDto | null>(null)
const cancelMessage = computed(() => {
  if (!cancelTarget.value) return ''
  const msg = `'${cancelTarget.value.workOrderNumber}'을(를) 취소하시겠습니까?`
  if (cancelTarget.value.statusCode === 'WO_STATUS_02') {
    return msg + ' 선점된 자재 예약이 해제됩니다.'
  }
  return msg
})
function handleCancel(row: WorkOrderDto) { cancelTarget.value = row }
async function doCancel() {
  if (!cancelTarget.value) return
  actionLoading.value = true
  try {
    await workOrderApi.cancel(cancelTarget.value.id)
    cancelTarget.value = null
    showSuccess('작업지시가 취소되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    showError(extractErrorMessage(err, '취소 중 오류가 발생했습니다.'))
    cancelTarget.value = null
  } finally {
    actionLoading.value = false
  }
}

const columnHelper = createColumnHelper<WorkOrderDto>()
const columns = computed(() => [
  columnHelper.accessor('workOrderNumber', { header: '작업지시 번호', enableSorting: true }),
  columnHelper.accessor('itemName', {
    header: '생산 품목',
    enableSorting: false,
    cell: (info) => `${info.row.original.itemCode} — ${info.getValue()}`,
  }),
  columnHelper.accessor('bomVersionCode', {
    header: 'BOM 버전',
    enableSorting: false,
    cell: (info) => `v${info.getValue()}`,
  }),
  columnHelper.accessor('plannedQty', {
    header: '계획 수량',
    enableSorting: false,
    cell: (info) => info.getValue()?.toLocaleString() ?? '-',
  }),
  columnHelper.accessor('warehouseName', { header: '창고', enableSorting: false }),
  columnHelper.accessor('statusCode', {
    header: '상태',
    enableSorting: false,
    cell: (info) => WO_STATUS_LABELS[info.getValue()] ?? info.getValue(),
  }),
  columnHelper.accessor('plannedStartDate', { header: '계획 시작일', enableSorting: true }),
  columnHelper.accessor('salesOrderNumber', {
    header: '연결 수주',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
])

const statusFilterOptions = [
  { value: 'WO_STATUS_01', label: '초안' },
  { value: 'WO_STATUS_02', label: '확정' },
  { value: 'WO_STATUS_03', label: '취소' },
]

const searchFields = computed<SearchFieldDef[]>(() => [
  { key: 'workOrderNumber', label: '작업지시 번호', placeholder: '번호 검색' },
  { key: 'itemName', label: '품목명', placeholder: '품목명 검색' },
  {
    key: 'statusCode',
    label: '상태',
    type: 'select',
    placeholder: '전체',
    options: statusFilterOptions,
  },
])

onMounted(async () => {
  const [salesOrdersRes, itemsRes, warehousesRes] = await Promise.all([
    orderApi.getAll({ statusCode: 'ORDER_STATUS_02' }), // CONFIRMED 수주만
    itemApi.getAll(),
    warehouseApi.getAll(),
  ])

  // 수주 옵션
  salesOrderOptions.value = salesOrdersRes.data.map((so: { id: number; orderNumber: string; partnerName?: string }) => ({
    value: String(so.id),
    label: so.orderNumber,
  }))

  // 수주별 라인 맵 (상세 로드는 폼에서 필요 시 처리)
  const lineMap: Record<number, { value: string; label: string }[]> = {}
  for (const so of salesOrdersRes.data) {
    if (so.lines && Array.isArray(so.lines)) {
      lineMap[so.id] = so.lines.map((l: { id: number; itemCode?: string; itemName?: string; quantity?: number; sortOrder?: number }) => ({
        value: String(l.id),
        label: `${l.itemCode ?? ''} — ${l.itemName ?? ''} (${l.quantity ?? ''})`,
      }))
    }
  }
  salesOrderLineMap.value = lineMap

  itemOptions.value = itemsRes.data.map((i: { id: number; code: string; name: string }) => ({
    value: String(i.id),
    label: `${i.code} - ${i.name}`,
  }))
  warehouseOptions.value = warehousesRes.data.map((w: { id: number; code: string; name: string }) => ({
    value: String(w.id),
    label: `${w.code} - ${w.name}`,
  }))

  await fetchData()
})
</script>
