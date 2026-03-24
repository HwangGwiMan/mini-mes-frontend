/**
 * 매출 관리 화면.
 * 거래처를 선택하고 해당 거래처의 완료 수주 품목을 골라 매출을 수동으로 등록한다.
 * 상태 흐름: 초안(등록·수정·삭제 가능) → 마감 → 취소
 * 마감 처리 후에는 수정·삭제가 불가하며 취소만 허용된다.
 *
 * useCrudPage 사용: rows/loading/submitting/modal 상태 및 등록·수정·삭제 핸들러를 composable로 위임.
 * openEdit는 라인 항목 포함 상세 조회가 필요하므로 async로 오버라이드.
 * 마감/취소 액션은 useCrudPage 범위 밖이므로 별도 상태로 관리.
 */
<template>
  <div class="space-y-5">
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">매출 관리</h2>
        <p class="text-sm text-gray-500 mt-0.5">거래처별 수주 품목을 선택하여 매출을 등록하고 마감 처리합니다.</p>
      </div>
      <button
        @click="openCreate"
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus :size="16" />
        매출 등록
      </button>
    </div>

    <SearchBar :model-value="search" :fields="searchFields" @search="fetchData" @reset="resetSearch" />

    <DataTable :data="rows" :columns="columns" :loading="loading" table-id="revenue">
      <template #actions="{ row }">
        <button
          @click="openEdit(row)"
          class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
        >
          <Pencil :size="12" />수정
        </button>
        <!-- 초안: 마감 버튼 -->
        <button
          v-if="row.statusCode === 'REVENUE_STATUS_01'"
          @click="handleClose(row)"
          class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap"
        >
          <CheckCircle :size="12" />마감
        </button>
        <!-- 마감: 취소 버튼 -->
        <button
          v-if="row.statusCode === 'REVENUE_STATUS_02'"
          @click="handleCancel(row)"
          class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors whitespace-nowrap"
        >
          <XCircle :size="12" />취소
        </button>
        <!-- 초안: 삭제 버튼 -->
        <button
          v-if="row.statusCode === 'REVENUE_STATUS_01'"
          @click="confirmDelete(row)"
          class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap"
        >
          <Trash2 :size="12" />삭제
        </button>
      </template>
    </DataTable>

    <RevenueFormModal
      v-model="modalOpen"
      :edit-target="editTarget"
      :submitting="submitting"
      :error="modalError || null"
      @confirm="handleRevenueConfirm"
    />

    <!-- 삭제 확인 다이얼로그 -->
    <ConfirmDialog
      :open="!!deleteTarget"
      title="매출 삭제"
      :message="`'${deleteTarget?.revenueNumber}'을(를) 삭제하시겠습니까?`"
      :loading="submitting"
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />

    <!-- 마감 확인 다이얼로그 -->
    <ConfirmDialog
      :open="!!closeTarget"
      title="마감 처리"
      :message="`'${closeTarget?.revenueNumber}'을(를) 마감 처리하시겠습니까?`"
      confirm-label="마감"
      variant="warning"
      :loading="closeSubmitting"
      @confirm="doHandleClose"
      @cancel="closeTarget = null"
    />

    <!-- 마감 취소 확인 다이얼로그 -->
    <ConfirmDialog
      :open="!!cancelTarget"
      title="마감 취소"
      :message="`'${cancelTarget?.revenueNumber}' 마감을 취소하시겠습니까?`"
      confirm-label="취소 처리"
      variant="warning"
      :loading="cancelSubmitting"
      @confirm="doHandleCancel"
      @cancel="cancelTarget = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-vue-next'
import { revenueApi, type RevenueDto, type RevenueCreateRequest, type RevenueUpdateRequest } from '@/api/revenue'
import { commonCodeApi } from '@/api/commonCode'
import { partnerApi, type PartnerDto } from '@/api/partner'
import { useScreenInit } from '@/composables/useScreenInit'
import { useCrudPage } from '@/composables/useCrudPage'
import DataTable from '@/components/DataTable.vue'
import SearchBar from '@/components/SearchBar.vue'
import RevenueFormModal from '@/components/RevenueFormModal.vue'
import { useToast } from '@/composables/useToast'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { extractErrorMessage, extractSaveErrorMessage } from '@/types/api-error'

const { initialize } = useScreenInit()
const { showSuccess, showError } = useToast()

// 검색 상태
const search = reactive<Record<string, string>>({
  statusCode: '',
  partnerId: '',
  fromDate: '',
  toDate: '',
})

// 검색 옵션
const statusOptions = ref<{ value: string; label: string }[]>([])
const partnerOptions = ref<PartnerDto[]>([])

// useCrudPage: fetchFn은 search reactive를 클로저로 캡처하여 검색 파라미터를 반영
// handleSave는 사용하지 않으므로 toPayload는 더미로 제공
const {
  rows, loading, submitting, modalOpen, modalError, editTarget, deleteTarget,
  fetchData, openCreate, confirmDelete, handleDelete,
} = useCrudPage<RevenueDto, RevenueCreateRequest | RevenueUpdateRequest>({
  fetchFn: () => revenueApi.getAll({
    statusCode: search.statusCode || undefined,
    partnerId: search.partnerId ? Number(search.partnerId) : undefined,
    fromDate: search.fromDate || undefined,
    toDate: search.toDate || undefined,
  }),
  createFn: (data) => revenueApi.create(data as RevenueCreateRequest),
  updateFn: (id, data) => revenueApi.update(id, data as RevenueUpdateRequest),
  deleteFn: revenueApi.delete,
  toPayload: () => ({}) as RevenueCreateRequest, // handleSave 미사용 — handleRevenueConfirm이 대신 처리
})

const searchFields = computed(() => [
  {
    key: 'statusCode', label: '상태', type: 'select' as const,
    options: [{ value: '', label: '전체' }, ...statusOptions.value],
  },
  {
    key: 'partnerId', label: '거래처', type: 'select' as const,
    options: [{ value: '', label: '전체' }, ...partnerOptions.value.map(p => ({ value: String(p.id), label: p.name }))],
  },
  { key: 'fromDate', label: '매출일(시작)', type: 'date' as const },
  { key: 'toDate', label: '매출일(종료)', type: 'date' as const },
])

const columnHelper = createColumnHelper<RevenueDto>()
const columns = [
  columnHelper.accessor('revenueNumber', { header: '매출번호' }),
  columnHelper.accessor('partnerName',   { header: '거래처' }),
  columnHelper.accessor('employeeName',  { header: '담당자' }),
  columnHelper.accessor('revenueDate',   { header: '매출일자' }),
  columnHelper.accessor('totalAmount', {
    header: '총금액',
    cell: ({ getValue }) => Number(getValue()).toLocaleString('ko-KR'),
  }),
  columnHelper.accessor('statusCode', {
    header: '상태',
    cell: ({ getValue }) => {
      const map: Record<string, string> = {
        REVENUE_STATUS_01: '초안',
        REVENUE_STATUS_02: '마감',
        REVENUE_STATUS_03: '취소',
      }
      return map[getValue()] ?? getValue()
    },
  }),
  columnHelper.accessor('remarks', { header: '비고' }),
]

function resetSearch() {
  Object.keys(search).forEach(k => (search[k] = ''))
  fetchData()
}

// useCrudPage의 openEdit는 동기(sync)이므로, 라인 항목 포함 상세 조회가 필요한 매출은 async로 오버라이드
async function openEdit(row: RevenueDto) {
  const { data } = await revenueApi.getById(row.id)
  editTarget.value = data
  modalError.value = ''
  modalOpen.value = true
}

// RevenueFormModal은 타입된 페이로드를 emit하므로 useCrudPage.handleSave(Record<string,string>) 대신 직접 처리
async function handleRevenueConfirm(payload: RevenueCreateRequest | RevenueUpdateRequest) {
  submitting.value = true
  modalError.value = ''
  try {
    if (editTarget.value) {
      await revenueApi.update(editTarget.value.id, payload as RevenueUpdateRequest)
      showSuccess('매출이 수정되었습니다.')
    } else {
      await revenueApi.create(payload as RevenueCreateRequest)
      showSuccess('매출이 등록되었습니다.')
    }
    modalOpen.value = false
    fetchData()
  } catch (err) {
    modalError.value = extractSaveErrorMessage(err)
  } finally {
    submitting.value = false
  }
}

// 마감 처리 확인 상태 — useCrudPage 범위 밖의 상태 전이이므로 별도 관리
const closeTarget = ref<RevenueDto | null>(null)
const closeSubmitting = ref(false)

function handleClose(row: RevenueDto) {
  closeTarget.value = row
}

async function doHandleClose() {
  if (!closeTarget.value) return
  closeSubmitting.value = true
  try {
    await revenueApi.close(closeTarget.value.id)
    closeTarget.value = null
    showSuccess('마감 처리되었습니다.')
    fetchData()
  } catch (err) {
    showError(extractErrorMessage(err, '마감 처리 중 오류가 발생했습니다.'))
  } finally {
    closeSubmitting.value = false
  }
}

// 마감 취소 확인 상태
const cancelTarget = ref<RevenueDto | null>(null)
const cancelSubmitting = ref(false)

function handleCancel(row: RevenueDto) {
  cancelTarget.value = row
}

async function doHandleCancel() {
  if (!cancelTarget.value) return
  cancelSubmitting.value = true
  try {
    await revenueApi.cancel(cancelTarget.value.id)
    cancelTarget.value = null
    showSuccess('마감 취소되었습니다.')
    fetchData()
  } catch (err) {
    showError(extractErrorMessage(err, '취소 처리 중 오류가 발생했습니다.'))
  } finally {
    cancelSubmitting.value = false
  }
}

onMounted(async () => {
  await initialize()
  const [statusRes, partnerRes] = await Promise.all([
    commonCodeApi.getAll({ codeGroup: 'REVENUE_STATUS' }),
    partnerApi.getAll(),
  ])
  statusOptions.value = statusRes.data.map((c: { code: string; name: string }) => ({
    value: c.code,
    label: c.name,
  }))
  partnerOptions.value = partnerRes.data
  fetchData()
})
</script>
