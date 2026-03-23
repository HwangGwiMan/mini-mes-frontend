<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">견적 관리</h2>
        <p class="text-sm text-gray-500 mt-0.5">견적 요청·응답 및 견적서를 관리합니다.</p>
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

    <DataTable :data="quotes" :columns="columnsComputed" :loading="loading" table-id="quote">
      <template #actions="{ row }">
        <div class="flex items-center gap-1.5">
          <button
            @click="openEdit(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            <Pencil :size="12" />
            수정
          </button>
          <button
            @click="confirmDelete(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
          >
            <Trash2 :size="12" />
            삭제
          </button>
          <!-- 제출 버튼: 작성중(01) 또는 반려(04) 상태 -->
          <button
            v-if="row.statusCode === 'QUOTE_STATUS_01' || row.statusCode === 'QUOTE_STATUS_04'"
            @click="handleSubmit(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-md hover:bg-yellow-100 transition-colors whitespace-nowrap"
          >
            <Send :size="12" />
            제출
          </button>
          <!-- 승인/반려 버튼: 제출(02) 상태 & 결재자 본인 -->
          <template v-if="row.statusCode === 'QUOTE_STATUS_02' && row.approverId === currentUser?.employeeId">
            <button
              @click="openApproveModal(row)"
              class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
            >
              <CheckCircle :size="12" />
              승인
            </button>
            <button
              @click="openRejectModal(row)"
              class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors whitespace-nowrap"
            >
              <XCircle :size="12" />
              반려
            </button>
          </template>
          <!-- 수주 전환 버튼: 승인(03) 상태 -->
          <button
            v-if="row.statusCode === 'QUOTE_STATUS_03'"
            @click="convertToOrder(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
          >
            <ArrowRightFromLine :size="12" />
            수주 전환
          </button>
          <!-- 결재 이력 버튼 -->
          <button
            @click="openHistoryModal(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            <History :size="12" />
            이력
          </button>
        </div>
      </template>
    </DataTable>

    <QuoteFormModal
      v-model="modalOpen"
      :title="editTarget ? '견적 수정' : '견적 등록'"
      :initial-data="editTarget"
      :partner-options="partnerOptions"
      :employee-options="employeeOptions"
      :item-options="itemOptions"
      :submitting="submitting"
      :error-msg="modalError"
      @confirm="handleQuoteConfirm"
    />

    <!-- 승인/반려 코멘트 모달 -->
    <ApprovalCommentModal
      v-model="commentModalOpen"
      :action="commentModalAction"
      :submitting="approvalSubmitting"
      @confirm="handleApprovalConfirm"
    />

    <!-- 결재 이력 모달 -->
    <QuoteApprovalHistoryModal
      v-model="historyModalOpen"
      :quote-id="historyQuoteId"
    />

    <!-- 삭제 확인 다이얼로그 -->
    <ConfirmDialog
      :open="!!deleteTarget"
      title="견적 삭제"
      :message="`'${deleteTarget?.quoteNumber}' 견적을 삭제하시겠습니까?`"
      :loading="submitting"
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />

    <!-- 수주 전환 확인 다이얼로그 -->
    <ConfirmDialog
      :open="!!convertTarget"
      title="수주 전환"
      :message="`견적 '${convertTarget?.quoteNumber}'을(를) 수주로 전환하시겠습니까?`"
      confirm-label="전환"
      variant="warning"
      :loading="convertSubmitting"
      @confirm="doConvertToOrder"
      @cancel="convertTarget = null"
    />

    <!-- 제출 확인 다이얼로그 -->
    <ConfirmDialog
      :open="!!submitTarget"
      title="견적 제출"
      :message="`견적 '${submitTarget?.quoteNumber}'을(를) 제출하시겠습니까?`"
      confirm-label="제출"
      variant="warning"
      :loading="submitConfirmLoading"
      @confirm="doHandleSubmit"
      @cancel="submitTarget = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  Plus, Pencil, Trash2, ChevronDown, ArrowRightFromLine,
  Send, CheckCircle, XCircle, History,
} from 'lucide-vue-next'
import { createColumnHelper } from '@tanstack/vue-table'
import DataTable from '@/components/DataTable.vue'
import SearchBar from '@/components/SearchBar.vue'
import QuoteFormModal from '@/components/QuoteFormModal.vue'
import ApprovalCommentModal from '@/components/ApprovalCommentModal.vue'
import QuoteApprovalHistoryModal from '@/components/QuoteApprovalHistoryModal.vue'
import type { SearchFieldDef } from '@/components/SearchBar.vue'
import { quoteApi, type QuoteDto, type QuoteRequest } from '@/api/quote'
import { orderApi } from '@/api/order'
import { partnerApi } from '@/api/partner'
import { employeeApi } from '@/api/employee'
import { itemApi } from '@/api/item'
import { commonCodeApi } from '@/api/commonCode'
import { useScreenInit, type CurrentUser } from '@/composables/useScreenInit'
import { useCrudPage } from '@/composables/useCrudPage'
import { useToast } from '@/composables/useToast'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const { initialize } = useScreenInit()
const { showSuccess, showError } = useToast()
const currentUser = ref<CurrentUser | null>(null)

const partnerOptions = ref<{ value: string; label: string }[]>([])
const employeeOptions = ref<{ value: string; label: string }[]>([])
const itemOptions = ref<{ value: string; label: string }[]>([])
const statusOptions = ref<{ value: string; label: string }[]>([])

const showDetailSearch = ref(false)

const search = reactive({
  quoteNumber: '',
  partnerId: '',
  statusCode: '',
  fromDate: '',
  toDate: '',
})

const {
  rows: quotes,
  loading,
  submitting,
  modalOpen,
  modalError,
  editTarget,
  deleteTarget,
  fetchData,
  openCreate,
  openEdit: _openEdit,
  confirmDelete,
  handleDelete,
} = useCrudPage<QuoteDto, QuoteRequest>({
  fetchFn: async () => {
    const { data } = await quoteApi.getAll({
      quoteNumber: search.quoteNumber || undefined,
      partnerId: search.partnerId ? Number(search.partnerId) : undefined,
      statusCode: search.statusCode || undefined,
      fromDate: search.fromDate || undefined,
      toDate: search.toDate || undefined,
    })
    return { data }
  },
  createFn: (data: QuoteRequest) => quoteApi.create(data),
  updateFn: (id: number, data: QuoteRequest) => quoteApi.update(id, data),
  deleteFn: (id: number) => quoteApi.delete(id),
  toPayload: (x) => x as unknown as QuoteRequest,
})

async function openEdit(row: QuoteDto) {
  const { data } = await quoteApi.getById(row.id)
  editTarget.value = data
  modalError.value = ''
  modalOpen.value = true
}

function resetSearch() {
  search.quoteNumber = ''
  search.partnerId = ''
  search.statusCode = ''
  search.fromDate = ''
  search.toDate = ''
  fetchData()
}

// 수주 전환 확인 상태
const convertTarget = ref<QuoteDto | null>(null)
const convertSubmitting = ref(false)

function convertToOrder(row: QuoteDto) {
  convertTarget.value = row
}

async function doConvertToOrder() {
  if (!convertTarget.value) return
  convertSubmitting.value = true
  try {
    await orderApi.convertFromQuote(convertTarget.value.id)
    convertTarget.value = null
    showSuccess('수주로 전환되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    showError(e.response?.data?.message ?? '수주 전환 중 오류가 발생했습니다.')
  } finally {
    convertSubmitting.value = false
  }
}

async function handleQuoteConfirm(payload: QuoteRequest) {
  submitting.value = true
  modalError.value = ''
  try {
    if (editTarget.value) {
      await quoteApi.update(editTarget.value.id, payload)
    } else {
      await quoteApi.create(payload)
    }
    modalOpen.value = false
    await fetchData()
  } catch (err: unknown) {
    const e = err as {
      response?: { data?: { message?: string; errors?: { field: string; message: string }[] } }
    }
    modalError.value =
      e.response?.data?.errors?.[0]?.message ??
      e.response?.data?.message ??
      '저장 중 오류가 발생했습니다.'
  } finally {
    submitting.value = false
  }
}

// 제출 확인 상태
const submitTarget = ref<QuoteDto | null>(null)
const submitConfirmLoading = ref(false)

function handleSubmit(row: QuoteDto) {
  submitTarget.value = row
}

async function doHandleSubmit() {
  if (!submitTarget.value) return
  submitConfirmLoading.value = true
  try {
    await quoteApi.submit(submitTarget.value.id)
    submitTarget.value = null
    showSuccess('제출되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    showError(e.response?.data?.message ?? '제출 중 오류가 발생했습니다.')
  } finally {
    submitConfirmLoading.value = false
  }
}

// 승인/반려 모달
const commentModalOpen = ref(false)
const commentModalAction = ref<'approve' | 'reject'>('approve')
const approvalSubmitting = ref(false)
const approvalTargetId = ref<number | null>(null)

function openApproveModal(row: QuoteDto) {
  approvalTargetId.value = row.id
  commentModalAction.value = 'approve'
  commentModalOpen.value = true
}

function openRejectModal(row: QuoteDto) {
  approvalTargetId.value = row.id
  commentModalAction.value = 'reject'
  commentModalOpen.value = true
}

async function handleApprovalConfirm(comment: string) {
  if (approvalTargetId.value == null) return
  approvalSubmitting.value = true
  try {
    if (commentModalAction.value === 'approve') {
      await quoteApi.approve(approvalTargetId.value, { comment })
      showSuccess('승인 처리되었습니다.')
    } else {
      await quoteApi.reject(approvalTargetId.value, { comment })
      showSuccess('반려 처리되었습니다.')
    }
    commentModalOpen.value = false
    await fetchData()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    showError(e.response?.data?.message ?? '처리 중 오류가 발생했습니다.')
  } finally {
    approvalSubmitting.value = false
  }
}

// 결재 이력
const historyModalOpen = ref(false)
const historyQuoteId = ref<number | null>(null)

function openHistoryModal(row: QuoteDto) {
  historyQuoteId.value = row.id
  historyModalOpen.value = true
}

const columnHelper = createColumnHelper<QuoteDto>()
const columnsComputed = computed(() => [
  columnHelper.accessor('quoteNumber', { header: '견적번호', enableSorting: true }),
  columnHelper.accessor('quoteDate', { header: '견적일자', enableSorting: true }),
  columnHelper.accessor('partnerName', { header: '거래처', enableSorting: false }),
  columnHelper.accessor('employeeName', {
    header: '담당자',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor('approverName', {
    header: '결재자',
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
  { key: 'quoteNumber', label: '견적번호', placeholder: '견적번호 검색' },
  {
    key: 'partnerId',
    label: '거래처',
    type: 'select',
    placeholder: '전체',
    options: partnerOptions.value,
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
  { key: 'fromDate', label: '견적일자(부터)', type: 'date', placeholder: 'yyyy-mm-dd' },
  { key: 'toDate', label: '견적일자(까지)', type: 'date', placeholder: 'yyyy-mm-dd' },
])

onMounted(async () => {
  currentUser.value = await initialize()
  const [partnersRes, employeesRes, itemsRes, statusRes] = await Promise.all([
    partnerApi.getAll(),
    employeeApi.getAll(),
    itemApi.getAll(),
    commonCodeApi.search('QUOTE_STATUS'),
  ])
  partnerOptions.value = partnersRes.data.map((p: { id: number; code: string; name: string }) => ({
    value: String(p.id),
    label: `${p.code} - ${p.name}`,
  }))
  employeeOptions.value = employeesRes.data.map((e: { id: number; code: string; name: string }) => ({
    value: String(e.id),
    label: `${e.code} - ${e.name}`,
  }))
  itemOptions.value = itemsRes.data.map((i: { id: number; code: string; name: string }) => ({
    value: String(i.id),
    label: `${i.code} - ${i.name}`,
  }))
  statusOptions.value = statusRes.data.map((c: { code: string; name: string }) => ({
    value: c.code,
    label: c.name,
  }))
  await fetchData()
})
</script>

