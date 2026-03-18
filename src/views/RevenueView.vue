/**
 * 매출 관리 화면.
 * 거래처를 선택하고 해당 거래처의 완료 수주 품목을 골라 매출을 수동으로 등록한다.
 * 상태 흐름: 초안(등록·수정·삭제 가능) → 마감 → 취소
 * 마감 처리 후에는 수정·삭제가 불가하며 취소만 허용된다.
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
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="deleteTarget"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @mousedown.self="deleteTarget = null"
        >
          <div class="absolute inset-0 bg-black/40" />
          <div class="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 class="text-base font-semibold text-gray-900 mb-2">매출 삭제</h3>
            <p class="text-sm text-gray-600 mb-6">
              <strong>{{ deleteTarget.revenueNumber }}</strong>을(를) 삭제하시겠습니까?<br/>
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div class="flex justify-end gap-2">
              <button
                @click="deleteTarget = null"
                class="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >취소</button>
              <button
                @click="handleDelete"
                class="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
              >삭제</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-vue-next'
import { revenueApi, type RevenueDto, type RevenueCreateRequest, type RevenueUpdateRequest } from '@/api/revenue'
import { commonCodeApi } from '@/api/commonCode'
import { partnerApi, type PartnerDto } from '@/api/partner'
import { useScreenInit } from '@/composables/useScreenInit'
import DataTable from '@/components/DataTable.vue'
import SearchBar from '@/components/SearchBar.vue'
import RevenueFormModal from '@/components/RevenueFormModal.vue'

const { initialize } = useScreenInit()

// 검색 상태
const search = reactive<Record<string, string>>({
  statusCode: '',
  partnerId: '',
  fromDate: '',
  toDate: '',
})

// 테이블 데이터
const rows = ref<RevenueDto[]>([])
const loading = ref(false)

// 모달 상태
const modalOpen = ref(false)
const submitting = ref(false)
const modalError = ref('')
const editTarget = ref<RevenueDto | null>(null)
const deleteTarget = ref<RevenueDto | null>(null)

// 검색 옵션
const statusOptions = ref<{ value: string; label: string }[]>([])
const partnerOptions = ref<PartnerDto[]>([])

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

const columns: ColumnDef<RevenueDto>[] = [
  { accessorKey: 'revenueNumber', header: '매출번호' },
  { accessorKey: 'partnerName', header: '거래처' },
  { accessorKey: 'employeeName', header: '담당자' },
  { accessorKey: 'revenueDate', header: '매출일자' },
  {
    accessorKey: 'totalAmount',
    header: '총금액',
    cell: ({ getValue }) => Number(getValue()).toLocaleString('ko-KR'),
  },
  {
    accessorKey: 'statusCode',
    header: '상태',
    cell: ({ row }) => {
      const map: Record<string, string> = {
        REVENUE_STATUS_01: '초안',
        REVENUE_STATUS_02: '마감',
        REVENUE_STATUS_03: '취소',
      }
      return map[row.original.statusCode] ?? row.original.statusCode
    },
  },
  { accessorKey: 'remarks', header: '비고' },
]

async function fetchData() {
  loading.value = true
  try {
    const { data } = await revenueApi.getAll({
      statusCode: search.statusCode || undefined,
      partnerId: search.partnerId ? Number(search.partnerId) : undefined,
      fromDate: search.fromDate || undefined,
      toDate: search.toDate || undefined,
    })
    rows.value = data
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  Object.keys(search).forEach(k => (search[k] = ''))
  fetchData()
}

function openCreate() {
  editTarget.value = null
  modalError.value = ''
  modalOpen.value = true
}

async function openEdit(row: RevenueDto) {
  // 상세 조회(라인 포함)로 editTarget 설정
  const { data } = await revenueApi.getById(row.id)
  editTarget.value = data
  modalError.value = ''
  modalOpen.value = true
}

function confirmDelete(row: RevenueDto) {
  deleteTarget.value = row
}

async function handleDelete() {
  if (!deleteTarget.value) return
  try {
    await revenueApi.delete(deleteTarget.value.id)
    deleteTarget.value = null
    fetchData()
  } catch (err) {
    const e = err as { response?: { data?: { message?: string } } }
    alert(e.response?.data?.message ?? '삭제 중 오류가 발생했습니다.')
  }
}

async function handleClose(row: RevenueDto) {
  if (!confirm(`${row.revenueNumber}을(를) 마감 처리하시겠습니까?`)) return
  try {
    await revenueApi.close(row.id)
    fetchData()
  } catch (err) {
    const e = err as { response?: { data?: { message?: string } } }
    alert(e.response?.data?.message ?? '마감 처리 중 오류가 발생했습니다.')
  }
}

async function handleCancel(row: RevenueDto) {
  if (!confirm(`${row.revenueNumber} 마감을 취소하시겠습니까?`)) return
  try {
    await revenueApi.cancel(row.id)
    fetchData()
  } catch (err) {
    const e = err as { response?: { data?: { message?: string } } }
    alert(e.response?.data?.message ?? '취소 처리 중 오류가 발생했습니다.')
  }
}

async function handleRevenueConfirm(payload: RevenueCreateRequest | RevenueUpdateRequest) {
  submitting.value = true
  modalError.value = ''
  try {
    if (editTarget.value) {
      await revenueApi.update(editTarget.value.id, payload as RevenueUpdateRequest)
    } else {
      await revenueApi.create(payload as RevenueCreateRequest)
    }
    modalOpen.value = false
    fetchData()
  } catch (err) {
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
