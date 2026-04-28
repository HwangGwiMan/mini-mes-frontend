/**
 * 자재 출고 관리 화면.
 * - 검색: 출고번호, 작업지시 번호, 상태
 * - 워크플로: 확정(초안→확정, 재고 차감 PRODUCTION_OUT), 취소
 * - 생성 시 작업지시 선택 → 자재 라인 자동 복사
 */
<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">자재 출고</h2>
        <p class="text-sm text-gray-500 mt-0.5">작업지시별 투입 자재 출고를 등록하고 확정합니다.</p>
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

    <DataTable :data="materialIssues" :columns="columns" :loading="loading" table-id="material-issue">
      <template #actions="{ row }">
        <div class="flex items-center gap-1.5">
          <!-- 수정: 초안(01) -->
          <button
            v-if="row.statusCode === 'MI_STATUS_01'"
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
            v-if="row.statusCode === 'MI_STATUS_01'"
            @click="confirmDelete(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
          >
            <Trash2 :size="12" />
            삭제
          </button>
          <!-- 확정: 초안(01) -->
          <button
            v-if="row.statusCode === 'MI_STATUS_01'"
            @click="handleConfirm(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
          >
            <CheckCircle :size="12" />
            확정
          </button>
          <!-- 취소: 초안(01) / 확정(02) -->
          <button
            v-if="row.statusCode === 'MI_STATUS_01' || row.statusCode === 'MI_STATUS_02'"
            @click="handleCancel(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors whitespace-nowrap"
          >
            <XCircle :size="12" />
            취소
          </button>
        </div>
      </template>
    </DataTable>

    <MaterialIssueFormModal
      v-model="modalOpen"
      :title="modalTitle"
      :initial-data="editTarget"
      :work-order-options="workOrderOptions"
      :submitting="submitting"
      :error-msg="modalError"
      @confirm="handleFormConfirm"
    />

    <!-- 삭제 확인 -->
    <ConfirmDialog
      :open="!!deleteTarget"
      title="자재 출고 삭제"
      :message="`'${deleteTarget?.materialIssueNumber}' 자재 출고를 삭제하시겠습니까?`"
      :loading="submitting"
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />

    <!-- 확정 확인 -->
    <ConfirmDialog
      :open="!!confirmTarget"
      title="자재 출고 확정"
      :message="`'${confirmTarget?.materialIssueNumber}'을(를) 확정하시겠습니까? 재고에서 자재가 실제로 차감됩니다.`"
      confirm-label="확정"
      :loading="actionLoading"
      @confirm="doConfirm"
      @cancel="confirmTarget = null"
    />

    <!-- 취소 확인 -->
    <ConfirmDialog
      :open="!!cancelTarget"
      title="자재 출고 취소"
      :message="`'${cancelTarget?.materialIssueNumber}'을(를) 취소하시겠습니까?`"
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
import MaterialIssueFormModal from '@/components/MaterialIssueFormModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { SearchFieldDef } from '@/components/SearchBar.vue'
import { materialIssueApi, MI_STATUS_LABELS, type MaterialIssueDto, type MaterialIssueRequest } from '@/api/materialIssue'
import { workOrderApi } from '@/api/workOrder'
import { useCrudPage } from '@/composables/useCrudPage'
import { useToast } from '@/composables/useToast'
import { extractErrorMessage, extractSaveErrorMessage } from '@/types/api-error'

const { showSuccess, showError } = useToast()

// CONFIRMED 상태 작업지시 목록 — 출고 생성 시 선택
const workOrderOptions = ref<{ value: string; label: string }[]>([])

const search = reactive({ materialIssueNumber: '', workOrderNumber: '', statusCode: '' })

const {
  rows: materialIssues,
  loading,
  submitting,
  modalOpen,
  modalError,
  editTarget,
  deleteTarget,
  fetchData,
  confirmDelete,
  handleDelete,
} = useCrudPage<MaterialIssueDto, MaterialIssueRequest>({
  fetchFn: async () => {
    const { data } = await materialIssueApi.getAll({
      materialIssueNumber: search.materialIssueNumber || undefined,
      workOrderNumber: search.workOrderNumber || undefined,
      statusCode: search.statusCode || undefined,
    })
    return { data }
  },
  createFn: (data: MaterialIssueRequest) => materialIssueApi.create(data),
  updateFn: (id: number, data: MaterialIssueRequest) => materialIssueApi.update(id, data),
  deleteFn: (id: number) => materialIssueApi.delete(id),
  toPayload: (x) => x as unknown as MaterialIssueRequest,
})

const modalTitle = computed(() => {
  if (!editTarget.value) return '자재 출고 등록'
  if (editTarget.value.statusCode !== 'MI_STATUS_01') return '자재 출고 상세'
  return '자재 출고 수정'
})

function openCreate() {
  editTarget.value = null
  modalError.value = ''
  modalOpen.value = true
}

async function openEdit(row: MaterialIssueDto) {
  const { data } = await materialIssueApi.getById(row.id)
  editTarget.value = data
  modalError.value = ''
  modalOpen.value = true
}

async function openDetail(row: MaterialIssueDto) {
  const { data } = await materialIssueApi.getById(row.id)
  editTarget.value = data
  modalError.value = ''
  modalOpen.value = true
}

function resetSearch() {
  search.materialIssueNumber = ''
  search.workOrderNumber = ''
  search.statusCode = ''
  fetchData()
}

async function handleFormConfirm(payload: MaterialIssueRequest) {
  submitting.value = true
  modalError.value = ''
  try {
    if (editTarget.value && editTarget.value.id !== 0) {
      await materialIssueApi.update(editTarget.value.id, payload)
      showSuccess(`'${editTarget.value.materialIssueNumber}' 이(가) 수정되었습니다.`)
    } else {
      await materialIssueApi.create(payload)
      showSuccess('자재 출고가 등록되었습니다.')
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
const confirmTarget = ref<MaterialIssueDto | null>(null)
function handleConfirm(row: MaterialIssueDto) { confirmTarget.value = row }
async function doConfirm() {
  if (!confirmTarget.value) return
  actionLoading.value = true
  try {
    await materialIssueApi.confirm(confirmTarget.value.id)
    confirmTarget.value = null
    showSuccess('자재 출고가 확정되었습니다. 재고가 차감되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    showError(extractErrorMessage(err, '확정 중 오류가 발생했습니다.'))
    confirmTarget.value = null
  } finally {
    actionLoading.value = false
  }
}

// 취소
const cancelTarget = ref<MaterialIssueDto | null>(null)
function handleCancel(row: MaterialIssueDto) { cancelTarget.value = row }
async function doCancel() {
  if (!cancelTarget.value) return
  actionLoading.value = true
  try {
    await materialIssueApi.cancel(cancelTarget.value.id)
    cancelTarget.value = null
    showSuccess('자재 출고가 취소되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    showError(extractErrorMessage(err, '취소 중 오류가 발생했습니다.'))
    cancelTarget.value = null
  } finally {
    actionLoading.value = false
  }
}

const columnHelper = createColumnHelper<MaterialIssueDto>()
const columns = computed(() => [
  columnHelper.accessor('materialIssueNumber', { header: '출고번호', enableSorting: true }),
  columnHelper.accessor('workOrderNumber', { header: '작업지시 번호', enableSorting: false }),
  columnHelper.accessor('itemName', { header: '품목명', enableSorting: false }),
  columnHelper.accessor('issueDate', { header: '출고일자', enableSorting: true }),
  columnHelper.accessor('statusCode', {
    header: '상태',
    enableSorting: false,
    cell: (info) => MI_STATUS_LABELS[info.getValue()] ?? info.getValue(),
  }),
  columnHelper.accessor('remarks', {
    header: '비고',
    enableSorting: false,
    cell: (info) => info.getValue() || '-',
  }),
])

const statusFilterOptions = [
  { value: 'MI_STATUS_01', label: '초안' },
  { value: 'MI_STATUS_02', label: '확정' },
  { value: 'MI_STATUS_03', label: '취소' },
]

const searchFields = computed<SearchFieldDef[]>(() => [
  { key: 'materialIssueNumber', label: '출고번호', placeholder: '번호 검색' },
  { key: 'workOrderNumber', label: '작업지시 번호', placeholder: '번호 검색' },
  {
    key: 'statusCode',
    label: '상태',
    type: 'select',
    placeholder: '전체',
    options: statusFilterOptions,
  },
])

onMounted(async () => {
  // CONFIRMED 상태 작업지시만 출고 등록 대상
  const { data } = await workOrderApi.getAll({ statusCode: 'WO_STATUS_02' })
  workOrderOptions.value = data.map((wo) => ({
    value: String(wo.id),
    label: `${wo.workOrderNumber} — ${wo.itemName}`,
  }))

  await fetchData()
})
</script>
