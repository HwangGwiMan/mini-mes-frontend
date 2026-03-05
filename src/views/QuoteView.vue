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

    <!-- 상세 검색 (접었다 펼침) -->
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
          <button
            v-if="row.statusCode === 'QUOTE_STATUS_03'"
            @click="convertToOrder(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
          >
            <ArrowRightFromLine :size="12" />
            수주 전환
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
      :status-options="statusOptions"
      :submitting="submitting"
      :error-msg="modalError"
      @confirm="handleQuoteConfirm"
    />

    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="deleteTarget"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @mousedown.self="deleteTarget = null"
        >
          <div class="absolute inset-0 bg-black/40" />
          <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                <AlertTriangle :size="20" class="text-red-600" />
              </div>
              <div>
                <h3 class="text-base font-semibold text-gray-900">견적 삭제</h3>
                <p class="text-sm text-gray-500 mt-0.5">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>
            <p class="text-sm text-gray-700 mb-6">
              <span class="font-medium">{{ deleteTarget?.quoteNumber }}</span> 견적을 삭제하시겠습니까?
            </p>
            <div class="flex justify-end gap-2">
              <button
                @click="deleteTarget = null"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                @click="handleDelete"
                :disabled="submitting"
                class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2, AlertTriangle, ChevronDown, ArrowRightFromLine } from 'lucide-vue-next'
import { createColumnHelper } from '@tanstack/vue-table'
import DataTable from '@/components/DataTable.vue'
import SearchBar from '@/components/SearchBar.vue'
import QuoteFormModal from '@/components/QuoteFormModal.vue'
import type { SearchFieldDef } from '@/components/SearchBar.vue'
import { quoteApi, type QuoteDto, type QuoteRequest } from '@/api/quote'
import { orderApi } from '@/api/order'
import { partnerApi } from '@/api/partner'
import { employeeApi } from '@/api/employee'
import { itemApi } from '@/api/item'
import { commonCodeApi } from '@/api/commonCode'
import { useScreenInit } from '@/composables/useScreenInit'
import { useCrudPage } from '@/composables/useCrudPage'

const { initialize } = useScreenInit()

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

const convertError = ref('')

async function convertToOrder(row: QuoteDto) {
  if (!confirm(`견적 ${row.quoteNumber}을(를) 수주로 전환하시겠습니까?`)) return
  convertError.value = ''
  try {
    await orderApi.convertFromQuote(row.id)
    await fetchData()
  } catch (err: unknown) {
    const e = err as {
      response?: { data?: { message?: string } }
    }
    alert(e.response?.data?.message ?? '수주 전환 중 오류가 발생했습니다.')
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
  await initialize()
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

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
