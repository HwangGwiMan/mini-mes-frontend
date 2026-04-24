/**
 * 구매 요청 관리 화면.
 * QuoteView와 동일한 구조로, 아래 차이점이 있다:
 * - 검색: 거래처 대신 요청자(사원 select)
 * - 승인자 지정 없음 — 검토중 상태에서 누구나 승인 가능
 * - 승인/반려 시 코멘트 입력 없음 (별도 이력 테이블 없음)
 * - 발주 전환 버튼: 승인됨(03) 상태에서만 노출 (PO 도메인 구현 전까지는 안내 메시지 표시)
 */
<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">구매 요청</h2>
        <p class="text-sm text-gray-500 mt-0.5">자재 구매 요청을 등록하고 승인 워크플로를 관리합니다.</p>
      </div>
      <button
        @click="openCreate"
        class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus :size="15" />
        신규 등록
      </button>
    </div>

    <!-- 기본 검색 -->
    <SearchBar
      :model-value="search"
      :fields="basicSearchFields"
      @search="fetchData"
      @reset="resetSearch"
    />

    <!-- 상세 검색 토글 -->
    <button
      type="button"
      @click="showDetailSearch = !showDetailSearch"
      class="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors"
    >
      <ChevronDown
        :size="16"
        :class="{ 'rotate-180': showDetailSearch }"
        class="transition-transform"
      />
      {{ showDetailSearch ? '상세 검색 접기' : '상세 검색 보기' }}
    </button>

    <!-- 상세 검색 -->
    <SearchBar
      v-if="showDetailSearch"
      :model-value="search"
      :fields="detailSearchFields"
      @search="fetchData"
      @reset="resetSearch"
    />

    <DataTable :data="purchaseRequests" :columns="columns" :loading="loading" table-id="purchase-request">
      <template #actions="{ row }">
        <div class="flex items-center gap-1.5">
          <!-- 수정 버튼: 초안(01) 또는 반려됨(04) 상태 -->
          <button
            v-if="row.statusCode === 'PR_STATUS_01' || row.statusCode === 'PR_STATUS_04'"
            @click="openEdit(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            <Pencil :size="12" />
            수정
          </button>
          <!-- 상세 조회 버튼: 수정 불가 상태 -->
          <button
            v-else
            @click="openDetail(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            <Eye :size="12" />
            상세
          </button>
          <!-- 삭제 버튼: 초안(01) 상태만 -->
          <button
            v-if="row.statusCode === 'PR_STATUS_01'"
            @click="confirmDelete(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
          >
            <Trash2 :size="12" />
            삭제
          </button>
          <!-- 제출 버튼: 초안(01) 또는 반려됨(04) 상태 -->
          <button
            v-if="row.statusCode === 'PR_STATUS_01' || row.statusCode === 'PR_STATUS_04'"
            @click="handleSubmitRequest(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-md hover:bg-yellow-100 transition-colors whitespace-nowrap"
          >
            <Send :size="12" />
            제출
          </button>
          <!-- 승인/반려 버튼: 검토중(02) 상태 -->
          <template v-if="row.statusCode === 'PR_STATUS_02'">
            <button
              @click="handleApprove(row)"
              class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
            >
              <CheckCircle :size="12" />
              승인
            </button>
            <button
              @click="handleReject(row)"
              class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors whitespace-nowrap"
            >
              <XCircle :size="12" />
              반려
            </button>
          </template>
          <!-- 발주 전환 버튼: 승인됨(03) 상태 -->
          <button
            v-if="row.statusCode === 'PR_STATUS_03'"
            @click="handleConvertToPo(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
          >
            <ArrowRightFromLine :size="12" />
            발주 전환
          </button>
        </div>
      </template>
    </DataTable>

    <PurchaseRequestFormModal
      v-model="modalOpen"
      :title="editTarget ? (isDetailMode ? '구매 요청 상세' : '구매 요청 수정') : '구매 요청 등록'"
      :initial-data="editTarget"
      :employee-options="employeeOptions"
      :item-options="itemOptions"
      :submitting="submitting"
      :error-msg="modalError"
      @confirm="handleFormConfirm"
    />

    <!-- 삭제 확인 다이얼로그 -->
    <ConfirmDialog
      :open="!!deleteTarget"
      title="구매 요청 삭제"
      :message="`'${deleteTarget?.requestNumber}' 구매 요청을 삭제하시겠습니까?`"
      :loading="submitting"
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />

    <!-- 제출 확인 다이얼로그 -->
    <ConfirmDialog
      :open="!!submitTarget"
      title="구매 요청 제출"
      :message="`'${submitTarget?.requestNumber}'을(를) 검토 요청하시겠습니까?`"
      confirm-label="제출"
      variant="warning"
      :loading="actionLoading"
      @confirm="doSubmit"
      @cancel="submitTarget = null"
    />

    <!-- 승인 확인 다이얼로그 -->
    <ConfirmDialog
      :open="!!approveTarget"
      title="구매 요청 승인"
      :message="`'${approveTarget?.requestNumber}'을(를) 승인하시겠습니까?`"
      confirm-label="승인"
      :loading="actionLoading"
      @confirm="doApprove"
      @cancel="approveTarget = null"
    />

    <!-- 반려 확인 다이얼로그 -->
    <ConfirmDialog
      :open="!!rejectTarget"
      title="구매 요청 반려"
      :message="`'${rejectTarget?.requestNumber}'을(를) 반려하시겠습니까?`"
      confirm-label="반려"
      variant="danger"
      :loading="actionLoading"
      @confirm="doReject"
      @cancel="rejectTarget = null"
    />

    <!-- 발주 전환 확인 다이얼로그 -->
    <ConfirmDialog
      :open="!!convertTarget"
      title="구매 발주 전환"
      :message="`'${convertTarget?.requestNumber}'을(를) 구매 발주로 전환하시겠습니까?`"
      confirm-label="전환"
      variant="warning"
      :loading="actionLoading"
      @confirm="doConvertToPo"
      @cancel="convertTarget = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus, Pencil, Trash2, ChevronDown, Send,
  CheckCircle, XCircle, ArrowRightFromLine, Eye,
} from 'lucide-vue-next'
import { createColumnHelper } from '@tanstack/vue-table'
import DataTable from '@/components/DataTable.vue'
import SearchBar from '@/components/SearchBar.vue'
import PurchaseRequestFormModal from '@/components/PurchaseRequestFormModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { SearchFieldDef } from '@/components/SearchBar.vue'
import { purchaseRequestApi, type PurchaseRequestDto, type PurchaseRequestRequest } from '@/api/purchaseRequest'
import { employeeApi } from '@/api/employee'
import { itemApi } from '@/api/item'
import { useCrudPage } from '@/composables/useCrudPage'
import { useScreenInit } from '@/composables/useScreenInit'
import { useToast } from '@/composables/useToast'
import { extractErrorMessage, extractSaveErrorMessage } from '@/types/api-error'

const router = useRouter()
const { showSuccess, showError } = useToast()

const employeeOptions = ref<{ value: string; label: string }[]>([])
const itemOptions = ref<{ value: string; label: string }[]>([])
const statusOptions = ref<{ value: string; label: string }[]>([])
const showDetailSearch = ref(false)
// 상세 보기 모드 (수정 불가 상태에서 열기)
const isDetailMode = ref(false)

const search = reactive({
  requestNumber: '',
  requesterId: '',
  statusCode: '',
  fromDate: '',
  toDate: '',
})

const {
  rows: purchaseRequests,
  loading,
  submitting,
  modalOpen,
  modalError,
  editTarget,
  deleteTarget,
  fetchData,
  openCreate,
  confirmDelete,
  handleDelete,
} = useCrudPage<PurchaseRequestDto, PurchaseRequestRequest>({
  fetchFn: async () => {
    const { data } = await purchaseRequestApi.getAll({
      requestNumber: search.requestNumber || undefined,
      requesterId: search.requesterId ? Number(search.requesterId) : undefined,
      statusCode: search.statusCode || undefined,
      fromDate: search.fromDate || undefined,
      toDate: search.toDate || undefined,
    })
    return { data }
  },
  createFn: (data: PurchaseRequestRequest) => purchaseRequestApi.create(data),
  updateFn: (id: number, data: PurchaseRequestRequest) => purchaseRequestApi.update(id, data),
  deleteFn: (id: number) => purchaseRequestApi.delete(id),
  toPayload: (x) => x as unknown as PurchaseRequestRequest,
})

const { initialize } = useScreenInit()

/** 수정 — 상세 조회 후 모달 열기 (라인 포함) */
async function openEdit(row: PurchaseRequestDto) {
  const { data } = await purchaseRequestApi.getById(row.id)
  editTarget.value = data
  isDetailMode.value = false
  modalError.value = ''
  modalOpen.value = true
}

/** 상세 보기 — 수정 불가 상태에서 읽기 전용으로 열기 */
async function openDetail(row: PurchaseRequestDto) {
  const { data } = await purchaseRequestApi.getById(row.id)
  editTarget.value = data
  isDetailMode.value = true
  modalError.value = ''
  modalOpen.value = true
}

function resetSearch() {
  search.requestNumber = ''
  search.requesterId = ''
  search.statusCode = ''
  search.fromDate = ''
  search.toDate = ''
  fetchData()
}

async function handleFormConfirm(payload: PurchaseRequestRequest) {
  submitting.value = true
  modalError.value = ''
  try {
    if (editTarget.value) {
      await purchaseRequestApi.update(editTarget.value.id, payload)
      showSuccess(`'${editTarget.value.name}' 이(가) 수정되었습니다.`)
    } else {
      await purchaseRequestApi.create(payload)
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

// 워크플로 액션 공통 로딩 상태
const actionLoading = ref(false)

// 제출
const submitTarget = ref<PurchaseRequestDto | null>(null)
function handleSubmitRequest(row: PurchaseRequestDto) { submitTarget.value = row }
async function doSubmit() {
  if (!submitTarget.value) return
  actionLoading.value = true
  try {
    await purchaseRequestApi.submit(submitTarget.value.id)
    submitTarget.value = null
    showSuccess('검토 요청되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    showError(extractErrorMessage(err, '제출 중 오류가 발생했습니다.'))
  } finally {
    actionLoading.value = false
  }
}

// 승인
const approveTarget = ref<PurchaseRequestDto | null>(null)
function handleApprove(row: PurchaseRequestDto) { approveTarget.value = row }
async function doApprove() {
  if (!approveTarget.value) return
  actionLoading.value = true
  try {
    await purchaseRequestApi.approve(approveTarget.value.id)
    approveTarget.value = null
    showSuccess('승인 처리되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    showError(extractErrorMessage(err, '승인 중 오류가 발생했습니다.'))
  } finally {
    actionLoading.value = false
  }
}

// 반려
const rejectTarget = ref<PurchaseRequestDto | null>(null)
function handleReject(row: PurchaseRequestDto) { rejectTarget.value = row }
async function doReject() {
  if (!rejectTarget.value) return
  actionLoading.value = true
  try {
    await purchaseRequestApi.reject(rejectTarget.value.id)
    rejectTarget.value = null
    showSuccess('반려 처리되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    showError(extractErrorMessage(err, '반려 중 오류가 발생했습니다.'))
  } finally {
    actionLoading.value = false
  }
}

// 발주 전환 — PO 화면으로 이동하여 PR 데이터 pre-fill
const convertTarget = ref<PurchaseRequestDto | null>(null)
function handleConvertToPo(row: PurchaseRequestDto) { convertTarget.value = row }
function doConvertToPo() {
  if (!convertTarget.value) return
  const prId = convertTarget.value.id
  convertTarget.value = null
  router.push({ name: 'purchase-order', query: { fromPr: String(prId) } })
}

const columnHelper = createColumnHelper<PurchaseRequestDto>()
const columns = computed(() => [
  columnHelper.accessor('requestNumber', { header: '요청번호', enableSorting: true }),
  columnHelper.accessor('requestDate', { header: '요청일자', enableSorting: true }),
  columnHelper.accessor('requesterName', {
    header: '요청자',
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

const basicSearchFields = computed<SearchFieldDef[]>(() => [
  { key: 'requestNumber', label: '요청번호', placeholder: '요청번호 검색' },
  {
    key: 'requesterId',
    label: '요청자',
    type: 'select',
    placeholder: '전체',
    options: employeeOptions.value,
  },
  {
    key: 'statusCode',
    label: '상태',
    type: 'select',
    placeholder: '전체',
    options: statusOptions.value,
  },
])

const detailSearchFields = computed<SearchFieldDef[]>(() => [
  { key: 'fromDate', label: '요청일자(부터)', type: 'date', placeholder: 'yyyy-mm-dd' },
  { key: 'toDate', label: '요청일자(까지)', type: 'date', placeholder: 'yyyy-mm-dd' },
])

onMounted(async () => {
  const { getCode } = await initialize(['PR_STATUS'])
  const [employeesRes, itemsRes] = await Promise.all([
    employeeApi.getAll(),
    itemApi.getAll(),
  ])
  employeeOptions.value = employeesRes.data.map((e: { id: number; code: string; name: string }) => ({
    value: String(e.id),
    label: `${e.code} - ${e.name}`,
  }))
  itemOptions.value = itemsRes.data.map((i: { id: number; code: string; name: string }) => ({
    value: String(i.id),
    label: `${i.code} - ${i.name}`,
  }))
  statusOptions.value = getCode('PR_STATUS')
  await fetchData()
})
</script>
