/**
 * 자재 입고 관리 화면.
 * - 검색: 입고번호, 거래처명, 상태
 * - 워크플로: 입고 확정(초안→입고완료), 취소(초안→취소)
 * - 확정 시 연결된 발주가 있으면 해당 PO도 입고완료 처리됨
 */
<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">자재 입고</h2>
        <p class="text-sm text-gray-500 mt-0.5">자재 입고를 등록하고 입고 확정 워크플로를 관리합니다.</p>
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

    <DataTable :data="goodsReceipts" :columns="columns" :loading="loading" table-id="goods-receipt">
      <template #actions="{ row }">
        <div class="flex items-center gap-1.5">
          <!-- 수정: 초안(01) -->
          <button
            v-if="row.statusCode === 'GR_STATUS_01'"
            @click="openEdit(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            <Pencil :size="12" />
            수정
          </button>
          <!-- 상세: 입고완료(02) / 취소(03) -->
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
            v-if="row.statusCode === 'GR_STATUS_01'"
            @click="confirmDelete(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
          >
            <Trash2 :size="12" />
            삭제
          </button>
          <!-- 입고 확정: 초안(01) -->
          <button
            v-if="row.statusCode === 'GR_STATUS_01'"
            @click="handleConfirm(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
          >
            <CheckCircle :size="12" />
            입고 확정
          </button>
          <!-- 취소: 초안(01) -->
          <button
            v-if="row.statusCode === 'GR_STATUS_01'"
            @click="handleCancel(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors whitespace-nowrap"
          >
            <XCircle :size="12" />
            취소
          </button>
        </div>
      </template>
    </DataTable>

    <GoodsReceiptFormModal
      v-model="modalOpen"
      :title="modalTitle"
      :initial-data="editTarget"
      :partner-options="partnerOptions"
      :item-options="itemOptions"
      :po-options="poOptions"
      :line-type-options="lineTypeOptions"
      :submitting="submitting"
      :error-msg="modalError"
      @confirm="handleFormConfirm"
    />

    <!-- 삭제 확인 -->
    <ConfirmDialog
      :open="!!deleteTarget"
      title="자재 입고 삭제"
      :message="`'${deleteTarget?.receiptNumber}' 입고를 삭제하시겠습니까?`"
      :loading="submitting"
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />

    <!-- 입고 확정 확인 -->
    <ConfirmDialog
      :open="!!confirmTarget"
      title="입고 확정"
      :message="`'${confirmTarget?.receiptNumber}'을(를) 입고 확정하시겠습니까?`"
      confirm-label="확정"
      :loading="actionLoading"
      @confirm="doConfirm"
      @cancel="confirmTarget = null"
    />

    <!-- 취소 확인 -->
    <ConfirmDialog
      :open="!!cancelTarget"
      title="입고 취소"
      :message="`'${cancelTarget?.receiptNumber}'을(를) 취소하시겠습니까?`"
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
import GoodsReceiptFormModal from '@/components/GoodsReceiptFormModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { SearchFieldDef } from '@/components/SearchBar.vue'
import { goodsReceiptApi, type GoodsReceiptDto, type GoodsReceiptRequest } from '@/api/goodsReceipt'
import { purchaseOrderApi } from '@/api/purchaseOrder'
import { partnerApi } from '@/api/partner'
import { itemApi } from '@/api/item'
import { useCrudPage } from '@/composables/useCrudPage'
import { useScreenInit } from '@/composables/useScreenInit'
import { useToast } from '@/composables/useToast'
import { extractErrorMessage, extractSaveErrorMessage } from '@/types/api-error'

const { showSuccess, showError } = useToast()

const partnerOptions = ref<{ value: string; label: string }[]>([])
const itemOptions = ref<{ value: string; label: string }[]>([])
// 발주됨(PO_STATUS_02) 상태 PO만 연결 가능 — 다른 상태 PO에 입고 연결 시 확정이 실패할 수 있음
const poOptions = ref<{ value: string; label: string }[]>([])
const statusOptions = ref<{ value: string; label: string }[]>([])
const lineTypeOptions = ref<{ value: string; label: string }[]>([])
const isDetailMode = ref(false)

const search = reactive({ receiptNumber: '', partnerName: '', statusCode: '' })

const {
  rows: goodsReceipts,
  loading,
  submitting,
  modalOpen,
  modalError,
  editTarget,
  deleteTarget,
  fetchData,
  confirmDelete,
  handleDelete,
} = useCrudPage<GoodsReceiptDto, GoodsReceiptRequest>({
  fetchFn: async () => {
    const { data } = await goodsReceiptApi.getAll({
      receiptNumber: search.receiptNumber || undefined,
      partnerName: search.partnerName || undefined,
      statusCode: search.statusCode || undefined,
    })
    return { data }
  },
  createFn: (data: GoodsReceiptRequest) => goodsReceiptApi.create(data),
  updateFn: (id: number, data: GoodsReceiptRequest) => goodsReceiptApi.update(id, data),
  deleteFn: (id: number) => goodsReceiptApi.delete(id),
  toPayload: (x) => x as unknown as GoodsReceiptRequest,
})

const modalTitle = computed(() => {
  if (!editTarget.value) return '자재 입고 등록'
  if (isDetailMode.value) return '자재 입고 상세'
  return '자재 입고 수정'
})

const { initialize } = useScreenInit()

function openCreate() {
  editTarget.value = null
  isDetailMode.value = false
  modalError.value = ''
  modalOpen.value = true
}

async function openEdit(row: GoodsReceiptDto) {
  const { data } = await goodsReceiptApi.getById(row.id)
  editTarget.value = data
  isDetailMode.value = false
  modalError.value = ''
  modalOpen.value = true
}

async function openDetail(row: GoodsReceiptDto) {
  const { data } = await goodsReceiptApi.getById(row.id)
  editTarget.value = data
  isDetailMode.value = true
  modalError.value = ''
  modalOpen.value = true
}

function resetSearch() {
  search.receiptNumber = ''
  search.partnerName = ''
  search.statusCode = ''
  fetchData()
}

async function handleFormConfirm(payload: GoodsReceiptRequest) {
  submitting.value = true
  modalError.value = ''
  try {
    if (editTarget.value && editTarget.value.id !== 0) {
      await goodsReceiptApi.update(editTarget.value.id, payload)
      showSuccess(`'${editTarget.value.name}' 이(가) 수정되었습니다.`)
    } else {
      await goodsReceiptApi.create(payload)
      showSuccess('등록되었습니다.')
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

// 입고 확정
const confirmTarget = ref<GoodsReceiptDto | null>(null)
function handleConfirm(row: GoodsReceiptDto) { confirmTarget.value = row }
async function doConfirm() {
  if (!confirmTarget.value) return
  actionLoading.value = true
  try {
    await goodsReceiptApi.confirm(confirmTarget.value.id)
    confirmTarget.value = null
    showSuccess('입고 확정되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    showError(extractErrorMessage(err, '입고 확정 중 오류가 발생했습니다.'))
  } finally {
    actionLoading.value = false
  }
}

// 취소
const cancelTarget = ref<GoodsReceiptDto | null>(null)
function handleCancel(row: GoodsReceiptDto) { cancelTarget.value = row }
async function doCancel() {
  if (!cancelTarget.value) return
  actionLoading.value = true
  try {
    await goodsReceiptApi.cancel(cancelTarget.value.id)
    cancelTarget.value = null
    showSuccess('입고가 취소되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    showError(extractErrorMessage(err, '취소 중 오류가 발생했습니다.'))
  } finally {
    actionLoading.value = false
  }
}

const columnHelper = createColumnHelper<GoodsReceiptDto>()
const columns = computed(() => [
  columnHelper.accessor('receiptNumber', { header: '입고번호', enableSorting: true }),
  columnHelper.accessor('receiptDate', { header: '입고일자', enableSorting: true }),
  columnHelper.accessor('poNumber', {
    header: '발주번호',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor('partnerName', {
    header: '거래처',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor('statusCode', {
    header: '상태',
    enableSorting: false,
    cell: (info) =>
      statusOptions.value.find((o) => o.value === info.getValue())?.label ?? info.getValue() ?? '-',
  }),
  columnHelper.accessor('remarks', {
    header: '비고',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
])

const searchFields = computed<SearchFieldDef[]>(() => [
  { key: 'receiptNumber', label: '입고번호', placeholder: '입고번호 검색' },
  { key: 'partnerName', label: '거래처명', placeholder: '거래처명 검색' },
  {
    key: 'statusCode',
    label: '상태',
    type: 'select',
    placeholder: '전체',
    options: statusOptions.value,
  },
])

onMounted(async () => {
  const { getCode } = await initialize(['GR_STATUS', 'GR_LINE_TYPE'])
  const [partnersRes, itemsRes, poRes] = await Promise.all([
    partnerApi.getAll(),
    itemApi.getAll(),
    purchaseOrderApi.getAll({ statusCode: 'PO_STATUS_02' }),
  ])
  partnerOptions.value = partnersRes.data.map((p: { id: number; code: string; name: string }) => ({
    value: String(p.id),
    label: `${p.code} - ${p.name}`,
  }))
  itemOptions.value = itemsRes.data.map((i: { id: number; code: string; name: string }) => ({
    value: String(i.id),
    label: `${i.code} - ${i.name}`,
  }))
  poOptions.value = poRes.data.map((po: { id: number; orderNumber: string }) => ({
    value: String(po.id),
    label: po.orderNumber,
  }))
  statusOptions.value = getCode('GR_STATUS')
  lineTypeOptions.value = getCode('GR_LINE_TYPE')

  await fetchData()
})
</script>
