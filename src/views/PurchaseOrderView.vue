/**
 * 구매 발주 관리 화면.
 * PurchaseRequestView와 구조가 동일하나 아래 차이점이 있다:
 * - 검색: 요청자 대신 거래처명(텍스트)
 * - 워크플로: 발주 확정(초안→발주됨), 취소(초안/발주됨→취소)
 * - PR 전환 진입: /purchase-order?fromPr=ID 쿼리로 자동 폼 오픈
 */
<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">구매 발주</h2>
        <p class="text-sm text-gray-500 mt-0.5">구매 발주를 등록하고 발주 확정 워크플로를 관리합니다.</p>
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

    <DataTable :data="purchaseOrders" :columns="columns" :loading="loading" table-id="purchase-order">
      <template #actions="{ row }">
        <div class="flex items-center gap-1.5">
          <!-- 수정: 초안(01) 또는 취소(04) -->
          <button
            v-if="row.statusCode === 'PO_STATUS_01' || row.statusCode === 'PO_STATUS_04'"
            @click="openEdit(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            <Pencil :size="12" />
            수정
          </button>
          <!-- 상세: 발주됨(02) / 입고완료(03) -->
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
            v-if="row.statusCode === 'PO_STATUS_01'"
            @click="confirmDelete(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
          >
            <Trash2 :size="12" />
            삭제
          </button>
          <!-- 발주 확정: 초안(01) -->
          <button
            v-if="row.statusCode === 'PO_STATUS_01'"
            @click="handleConfirm(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
          >
            <CheckCircle :size="12" />
            발주 확정
          </button>
          <!-- 취소: 초안(01) 또는 발주됨(02) -->
          <button
            v-if="row.statusCode === 'PO_STATUS_01' || row.statusCode === 'PO_STATUS_02'"
            @click="handleCancel(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors whitespace-nowrap"
          >
            <XCircle :size="12" />
            취소
          </button>
        </div>
      </template>
    </DataTable>

    <PurchaseOrderFormModal
      v-model="modalOpen"
      :title="modalTitle"
      :initial-data="editTarget"
      :partner-options="partnerOptions"
      :item-options="itemOptions"
      :submitting="submitting"
      :error-msg="modalError"
      @confirm="handleFormConfirm"
    />

    <!-- 삭제 확인 -->
    <ConfirmDialog
      :open="!!deleteTarget"
      title="구매 발주 삭제"
      :message="`'${deleteTarget?.orderNumber}' 발주를 삭제하시겠습니까?`"
      :loading="submitting"
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />

    <!-- 발주 확정 확인 -->
    <ConfirmDialog
      :open="!!confirmTarget"
      title="발주 확정"
      :message="`'${confirmTarget?.orderNumber}'을(를) 발주 확정하시겠습니까?`"
      confirm-label="확정"
      :loading="actionLoading"
      @confirm="doConfirm"
      @cancel="confirmTarget = null"
    />

    <!-- 취소 확인 -->
    <ConfirmDialog
      :open="!!cancelTarget"
      title="발주 취소"
      :message="`'${cancelTarget?.orderNumber}'을(를) 취소하시겠습니까?`"
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
import { useRoute } from 'vue-router'
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Eye } from 'lucide-vue-next'
import { createColumnHelper } from '@tanstack/vue-table'
import DataTable from '@/components/DataTable.vue'
import SearchBar from '@/components/SearchBar.vue'
import PurchaseOrderFormModal from '@/components/PurchaseOrderFormModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { SearchFieldDef } from '@/components/SearchBar.vue'
import { purchaseOrderApi, type PurchaseOrderDto, type PurchaseOrderRequest } from '@/api/purchaseOrder'
import { purchaseRequestApi } from '@/api/purchaseRequest'
import { partnerApi } from '@/api/partner'
import { itemApi } from '@/api/item'
import { commonCodeApi } from '@/api/commonCode'
import { useCrudPage } from '@/composables/useCrudPage'
import { useToast } from '@/composables/useToast'
import { extractErrorMessage, extractSaveErrorMessage } from '@/types/api-error'

const route = useRoute()
const { showSuccess, showError } = useToast()

const partnerOptions = ref<{ value: string; label: string }[]>([])
const itemOptions = ref<{ value: string; label: string }[]>([])
const statusOptions = ref<{ value: string; label: string }[]>([])
const isDetailMode = ref(false)

const search = reactive({ orderNumber: '', partnerName: '', statusCode: '' })

const {
  rows: purchaseOrders,
  loading,
  submitting,
  modalOpen,
  modalError,
  editTarget,
  deleteTarget,
  fetchData,
  confirmDelete,
  handleDelete,
} = useCrudPage<PurchaseOrderDto, PurchaseOrderRequest>({
  fetchFn: async () => {
    const { data } = await purchaseOrderApi.getAll({
      orderNumber: search.orderNumber || undefined,
      partnerName: search.partnerName || undefined,
      statusCode: search.statusCode || undefined,
    })
    return { data }
  },
  createFn: (data: PurchaseOrderRequest) => purchaseOrderApi.create(data),
  updateFn: (id: number, data: PurchaseOrderRequest) => purchaseOrderApi.update(id, data),
  deleteFn: (id: number) => purchaseOrderApi.delete(id),
  toPayload: (x) => x as unknown as PurchaseOrderRequest,
})

const modalTitle = computed(() => {
  if (!editTarget.value) return '구매 발주 등록'
  if (isDetailMode.value) return '구매 발주 상세'
  return '구매 발주 수정'
})

function openCreate() {
  editTarget.value = null
  isDetailMode.value = false
  modalError.value = ''
  modalOpen.value = true
}

async function openEdit(row: PurchaseOrderDto) {
  const { data } = await purchaseOrderApi.getById(row.id)
  editTarget.value = data
  isDetailMode.value = false
  modalError.value = ''
  modalOpen.value = true
}

async function openDetail(row: PurchaseOrderDto) {
  const { data } = await purchaseOrderApi.getById(row.id)
  editTarget.value = data
  isDetailMode.value = true
  modalError.value = ''
  modalOpen.value = true
}

/** PR 전환 진입: PR 상세를 조회하여 폼에 pre-fill */
async function openCreateFromPr(prId: number) {
  try {
    const { data: pr } = await purchaseRequestApi.getById(prId)
    const today = new Date().toISOString().slice(0, 10)
    // PR 라인을 PO 라인 형태로 변환 (prLineId 기록)
    editTarget.value = {
      id: 0,
      orderNumber: '',
      name: '',
      orderDate: today,
      partnerId: 0,
      partnerName: null,
      expectedArrivalDate: null,
      statusCode: 'PO_STATUS_01',
      prId: pr.id,
      remarks: `PR ${pr.requestNumber} 전환`,
      lines: pr.lines.map((l) => ({
        id: 0,
        itemId: l.itemId,
        itemCode: l.itemCode,
        itemName: l.itemName,
        orderedQuantity: l.requestedQuantity,
        unitPrice: null,
        requiredDate: l.requiredDate,
        remarks: l.remarks,
        sortOrder: l.sortOrder,
        prLineId: l.id,
      })),
    } as PurchaseOrderDto
    isDetailMode.value = false
    modalError.value = ''
    modalOpen.value = true
  } catch {
    showError('구매 요청 정보를 불러올 수 없습니다.')
  }
}

function resetSearch() {
  search.orderNumber = ''
  search.partnerName = ''
  search.statusCode = ''
  fetchData()
}

async function handleFormConfirm(payload: PurchaseOrderRequest) {
  submitting.value = true
  modalError.value = ''
  try {
    const prId = editTarget.value?.prId
    if (editTarget.value && editTarget.value.id !== 0) {
      await purchaseOrderApi.update(editTarget.value.id, payload)
      showSuccess(`'${editTarget.value.name}' 이(가) 수정되었습니다.`)
    } else if (prId) {
      await purchaseOrderApi.createFromPr(prId, payload)
      showSuccess('구매 요청이 발주로 전환되었습니다.')
    } else {
      await purchaseOrderApi.create(payload)
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

// 발주 확정
const confirmTarget = ref<PurchaseOrderDto | null>(null)
function handleConfirm(row: PurchaseOrderDto) { confirmTarget.value = row }
async function doConfirm() {
  if (!confirmTarget.value) return
  actionLoading.value = true
  try {
    await purchaseOrderApi.confirm(confirmTarget.value.id)
    confirmTarget.value = null
    showSuccess('발주 확정되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    showError(extractErrorMessage(err, '발주 확정 중 오류가 발생했습니다.'))
  } finally {
    actionLoading.value = false
  }
}

// 취소
const cancelTarget = ref<PurchaseOrderDto | null>(null)
function handleCancel(row: PurchaseOrderDto) { cancelTarget.value = row }
async function doCancel() {
  if (!cancelTarget.value) return
  actionLoading.value = true
  try {
    await purchaseOrderApi.cancel(cancelTarget.value.id)
    cancelTarget.value = null
    showSuccess('발주가 취소되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    showError(extractErrorMessage(err, '취소 중 오류가 발생했습니다.'))
  } finally {
    actionLoading.value = false
  }
}

const columnHelper = createColumnHelper<PurchaseOrderDto>()
const columns = computed(() => [
  columnHelper.accessor('orderNumber', { header: '발주번호', enableSorting: true }),
  columnHelper.accessor('orderDate', { header: '발주일자', enableSorting: true }),
  columnHelper.accessor('partnerName', {
    header: '거래처',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor('expectedArrivalDate', {
    header: '예상 입고일',
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
  { key: 'orderNumber', label: '발주번호', placeholder: '발주번호 검색' },
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
  const [partnersRes, itemsRes, statusRes] = await Promise.all([
    partnerApi.getAll(),
    itemApi.getAll(),
    commonCodeApi.search('PO_STATUS'),
  ])
  partnerOptions.value = partnersRes.data.map((p: { id: number; code: string; name: string }) => ({
    value: String(p.id),
    label: `${p.code} - ${p.name}`,
  }))
  itemOptions.value = itemsRes.data.map((i: { id: number; code: string; name: string }) => ({
    value: String(i.id),
    label: `${i.code} - ${i.name}`,
  }))
  statusOptions.value = statusRes.data.map((c: { code: string; name: string }) => ({
    value: c.code,
    label: c.name,
  }))

  // PR 전환 진입 처리
  const fromPr = route.query.fromPr
  if (fromPr) {
    await openCreateFromPr(Number(fromPr))
  }

  await fetchData()
})
</script>
