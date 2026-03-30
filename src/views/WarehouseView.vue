/**
 * 창고 관리 화면
 * - 창고 기준정보 CRUD (코드, 창고명, 창고유형, 설명, 사용여부, 정렬순서)
 * - 수정 시 코드는 변경 불가 (readonly)
 * - Phase 2 재고 도메인 구현 후 삭제 시 재고 존재 여부 검증 추가 예정
 */
<template>
  <div class="space-y-5">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">창고 관리</h2>
        <p class="text-sm text-gray-500 mt-0.5">창고 기준정보를 조회하고 등록합니다.</p>
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
    <DataTable :data="warehouses" :columns="columns" :loading="loading" table-id="warehouse">
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
      :title="editTarget ? '창고 수정' : '창고 등록'"
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
                <h3 class="text-base font-semibold text-gray-900">창고 삭제</h3>
                <p class="text-sm text-gray-500 mt-0.5">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>
            <p class="text-sm text-gray-700 mb-6">
              <span class="font-medium">{{ deleteTarget?.name }}</span> 창고를 삭제하시겠습니까?
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
import { warehouseApi, type WarehouseDto } from '@/api/warehouse'
import { commonCodeApi } from '@/api/commonCode'
import { useScreenInit } from '@/composables/useScreenInit'
import { useCrudPage } from '@/composables/useCrudPage'

const { initialize } = useScreenInit()

// 창고유형 공통코드 옵션 (진입 시 선조회)
const warehouseTypeOptions = ref<{ value: string; label: string }[]>([])

// 검색 조건
const search = reactive({ code: '', name: '', useYn: '' })

// 공통 CRUD 상태 및 함수
const {
  rows: warehouses,
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
} = useCrudPage<WarehouseDto, ReturnType<typeof buildPayload>>({
  fetchFn: () =>
    warehouseApi.getAll({
      code: search.code || undefined,
      name: search.name || undefined,
      useYn: search.useYn !== '' ? search.useYn === 'true' : undefined,
    }),
  createFn: (data: ReturnType<typeof buildPayload>) => warehouseApi.create(data),
  updateFn: (id: number, data: ReturnType<typeof buildPayload>) => warehouseApi.update(id, data),
  deleteFn: (id: number) => warehouseApi.delete(id),
  toPayload: buildPayload,
})

function resetSearch() {
  search.code = ''
  search.name = ''
  search.useYn = ''
  fetchData()
}

function buildPayload(data: Record<string, string>) {
  return {
    code:              data.code ?? '',
    name:              data.name ?? '',
    warehouseTypeCode: data.warehouseTypeCode || null,
    description:       data.description || null,
    useYn:             data.useYn !== 'false',
    sortOrder:         parseInt(data.sortOrder ?? '0') || 0,
  }
}

// 컬럼 정의
const columnHelper = createColumnHelper<WarehouseDto>()
const columns = computed(() => [
  columnHelper.accessor('code', { header: '창고코드', enableSorting: true }),
  columnHelper.accessor('name', { header: '창고명', enableSorting: true }),
  columnHelper.accessor('warehouseTypeCode', {
    header: '창고유형',
    enableSorting: false,
    cell: (info) =>
      warehouseTypeOptions.value.find((o) => o.value === info.getValue())?.label ?? info.getValue() ?? '-',
  }),
  columnHelper.accessor('description', {
    header: '설명',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor('useYn', {
    header: '사용여부',
    enableSorting: true,
    cell: (info) => (info.getValue() ? '사용' : '미사용'),
  }),
  columnHelper.accessor('sortOrder', { header: '정렬순서', enableSorting: true }),
])

// 모달 폼 필드
const fields = computed<FieldDef[]>(() => [
  {
    key: 'code',
    label: '창고코드',
    required: true,
    maxlength: 50,
    placeholder: 'WH_001',
    // 수정 시 코드는 변경 불가 — 코드가 바뀌면 연결된 재고 데이터와 불일치 발생
    readonly: !!editTarget.value,
  },
  { key: 'name',              label: '창고명',   required: true,  maxlength: 100, placeholder: '원자재 창고' },
  { key: 'warehouseTypeCode', label: '창고유형', type: 'select',  required: false, placeholder: '창고유형 선택', options: warehouseTypeOptions.value },
  { key: 'description',       label: '설명',     required: false, maxlength: 200, placeholder: '창고 위치 또는 용도' },
  {
    key: 'useYn',
    label: '사용여부',
    type: 'select',
    required: true,
    options: [
      { value: 'true',  label: '사용' },
      { value: 'false', label: '미사용' },
    ],
  },
  { key: 'sortOrder', label: '정렬순서', type: 'number', required: false, min: 0, placeholder: '0' },
])

// 검색 필드 정의
const searchFields: SearchFieldDef[] = [
  { key: 'code', label: '창고코드', placeholder: '코드 검색' },
  { key: 'name', label: '창고명',   placeholder: '창고명 검색' },
  {
    key: 'useYn',
    label: '사용여부',
    type: 'select',
    options: [
      { value: '',      label: '전체' },
      { value: 'true',  label: '사용' },
      { value: 'false', label: '미사용' },
    ],
  },
]

// WarehouseDto → 모달 초기값 변환
function toFormData(dto: WarehouseDto): Record<string, string> {
  return {
    code:              dto.code              ?? '',
    name:              dto.name              ?? '',
    warehouseTypeCode: dto.warehouseTypeCode ?? '',
    description:       dto.description       ?? '',
    useYn:             String(dto.useYn),
    sortOrder:         String(dto.sortOrder),
  }
}

onMounted(async () => {
  await initialize()
  const { data } = await commonCodeApi.search('WAREHOUSE_TYPE')
  warehouseTypeOptions.value = data.map((c: { code: string; name: string }) => ({ value: c.code, label: c.name }))
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
