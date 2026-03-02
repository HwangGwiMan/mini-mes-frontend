<template>
  <div class="space-y-5">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">거래처 관리</h2>
        <p class="text-sm text-gray-500 mt-0.5">거래처 정보를 조회하고 등록합니다.</p>
      </div>
      <button
        @click="openCreate"
        class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus :size="15" />
        신규 등록
      </button>
    </div>

    <!-- 검색 영역 -->
    <SearchBar
      :model-value="search"
      :fields="searchFields"
      @search="fetchData"
      @reset="resetSearch"
    />

    <!-- 그리드 -->
    <DataTable :data="partners" :columns="columns" :loading="loading" table-id="partner">
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
        </div>
      </template>
    </DataTable>

    <!-- 등록/수정 모달 -->
    <CrudModal
      v-model="modalOpen"
      :title="editTarget ? '거래처 수정' : '거래처 등록'"
      :fields="fields"
      :initial-data="editTarget ? toFormData(editTarget) : undefined"
      :submitting="submitting"
      :error-msg="modalError"
      @confirm="handleSave"
    />

    <!-- 삭제 확인 모달 -->
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
                <h3 class="text-base font-semibold text-gray-900">거래처 삭제</h3>
                <p class="text-sm text-gray-500 mt-0.5">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>
            <p class="text-sm text-gray-700 mb-6">
              <span class="font-medium">{{ deleteTarget?.name }}</span> 거래처를 삭제하시겠습니까?
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
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-vue-next'
import { createColumnHelper } from '@tanstack/vue-table'
import DataTable from '@/components/DataTable.vue'
import CrudModal from '@/components/CrudModal.vue'
import SearchBar from '@/components/SearchBar.vue'
import type { FieldDef } from '@/components/CrudModal.vue'
import type { SearchFieldDef } from '@/components/SearchBar.vue'
import { partnerApi, type PartnerDto } from '@/api/partner'
import { commonCodeApi } from '@/api/commonCode'
import { useScreenInit } from '@/composables/useScreenInit'
import { useCrudPage } from '@/composables/useCrudPage'

const { initialize } = useScreenInit()

// 거래구분 공통코드 옵션 (진입 시 선조회)
const tradeTypeOptions = ref<{ value: string; label: string }[]>([])

// 검색 조건
const search = reactive({ code: '', name: '' })

// 공통 CRUD 상태 및 함수
const {
  rows: partners,
  loading,
  submitting,
  modalOpen,
  modalError,
  editTarget,
  deleteTarget,
  fetchData,
  openCreate,
  openEdit,
  handleSave,
  confirmDelete,
  handleDelete,
} = useCrudPage<PartnerDto, ReturnType<typeof buildPayload>>({
  fetchFn: () =>
    partnerApi.getAll({
      code: search.code || undefined,
      name: search.name || undefined,
    }),
  createFn: (data: ReturnType<typeof buildPayload>) => partnerApi.create(data),
  updateFn: (id: number, data: ReturnType<typeof buildPayload>) => partnerApi.update(id, data),
  deleteFn: (id: number) => partnerApi.delete(id),
  toPayload: buildPayload,
})

function resetSearch() {
  search.code = ''
  search.name = ''
  fetchData()
}

function buildPayload(data: Record<string, string>) {
  return {
    code:           data.code,
    name:           data.name,
    tradeTypeCode:  data.tradeTypeCode  || undefined,
    businessNumber: data.businessNumber || undefined,
    ceoName:        data.ceoName        || undefined,
    address:        data.address        || undefined,
    phone1:         data.phone1         || undefined,
    phone2:         data.phone2         || undefined,
  }
}

// 컬럼 정의
const columnHelper = createColumnHelper<PartnerDto>()
const columns = computed(() => [
  columnHelper.accessor('code',           { header: '코드',     enableSorting: true }),
  columnHelper.accessor('name',           { header: '명칭',     enableSorting: true }),
  columnHelper.accessor('tradeTypeCode',  {
    header: '거래구분',
    enableSorting: false,
    cell: (info) =>
      tradeTypeOptions.value.find((o) => o.value === info.getValue())?.label ?? info.getValue() ?? '-',
  }),
  columnHelper.accessor('businessNumber', {
    header: '사업자번호',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor('ceoName',  { header: '대표자명', enableSorting: true,  cell: (info) => info.getValue() ?? '-' }),
  columnHelper.accessor('phone1',   { header: '연락처',   enableSorting: false, cell: (info) => info.getValue() ?? '-' }),
])

// 모달 폼 필드 (거래구분 옵션은 동적 주입)
const fields = computed<FieldDef[]>(() => [
  { key: 'code',           label: '코드',       required: true,  maxlength: 50,  placeholder: '거래처 코드' },
  { key: 'name',           label: '명칭',       required: true,  maxlength: 100, placeholder: '거래처 명칭' },
  { key: 'tradeTypeCode',  label: '거래구분',   type: 'select',  required: false, placeholder: '거래구분 선택', options: tradeTypeOptions.value },
  { key: 'businessNumber', label: '사업자번호', required: false, maxlength: 20,  placeholder: '123-45-67890' },
  { key: 'ceoName',        label: '대표자명',  required: false, maxlength: 50,  placeholder: '대표자명' },
  { key: 'address',        label: '주소',       required: false, maxlength: 200, placeholder: '주소' },
  { key: 'phone1',         label: '연락처1',   required: false, maxlength: 20,  placeholder: '02-1234-5678' },
  { key: 'phone2',         label: '연락처2',   required: false, maxlength: 20,  placeholder: '010-1234-5678' },
])

// 검색 필드 정의
const searchFields: SearchFieldDef[] = [
  { key: 'code', label: '코드', placeholder: '코드 검색' },
  { key: 'name', label: '명칭', placeholder: '명칭 검색' },
]

// PartnerDto → 모달 초기값 변환
function toFormData(dto: PartnerDto): Record<string, string> {
  return {
    code:           dto.code           ?? '',
    name:           dto.name           ?? '',
    tradeTypeCode:  dto.tradeTypeCode  ?? '',
    businessNumber: dto.businessNumber ?? '',
    ceoName:        dto.ceoName        ?? '',
    address:        dto.address        ?? '',
    phone1:         dto.phone1         ?? '',
    phone2:         dto.phone2         ?? '',
  }
}

onMounted(async () => {
  await initialize()
  const { data } = await commonCodeApi.search('TRADE_TYPE')
  tradeTypeOptions.value = data.map((c: { code: string; name: string }) => ({ value: c.code, label: c.name }))
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
