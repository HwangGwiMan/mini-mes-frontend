<template>
  <div class="space-y-5">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">품목 관리</h2>
        <p class="text-sm text-gray-500 mt-0.5">품목 정보를 조회하고 등록합니다.</p>
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
    <DataTable :data="items" :columns="columns" :loading="loading" table-id="item">
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
      :title="editTarget ? '품목 수정' : '품목 등록'"
      :fields="fieldsComputed"
      :initial-data="editTarget ? toFormData(editTarget) : undefined"
      :submitting="submitting"
      :error-msg="modalError"
      @confirm="handleSave"
    />

    <ConfirmDialog
      :open="!!deleteTarget"
      title="품목 삭제"
      :message="`'${deleteTarget?.name}' 품목을 삭제하시겠습니까?`"
      :loading="submitting"
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { createColumnHelper } from '@tanstack/vue-table'
import DataTable from '@/components/DataTable.vue'
import CrudModal from '@/components/CrudModal.vue'
import SearchBar from '@/components/SearchBar.vue'
import type { FieldDef } from '@/components/CrudModal.vue'
import type { SearchFieldDef } from '@/components/SearchBar.vue'
import { itemApi, type ItemDto } from '@/api/item'
import { useScreenInit } from '@/composables/useScreenInit'
import { useCrudPage } from '@/composables/useCrudPage'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const { initialize } = useScreenInit()

// 품목유형/단위 공통코드 옵션 (진입 시 선조회)
const itemTypeOptions = ref<{ value: string; label: string }[]>([])
const unitOptions = ref<{ value: string; label: string }[]>([])

// 사용여부 옵션
const useYnOptions = [
  { value: 'true', label: '사용' },
  { value: 'false', label: '미사용' },
]

// 검색 조건
const search = reactive({ code: '', name: '' })

// 공통 CRUD 상태 및 함수
const {
  rows: items,
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
} = useCrudPage<ItemDto, ReturnType<typeof buildPayload>>({
  fetchFn: () =>
    itemApi.getAll({
      code: search.code || undefined,
      name: search.name || undefined,
    }),
  createFn: (data: ReturnType<typeof buildPayload>) => itemApi.create(data),
  updateFn: (id: number, data: ReturnType<typeof buildPayload>) => itemApi.update(id, data),
  deleteFn: (id: number) => itemApi.delete(id),
  toPayload: buildPayload,
})

function resetSearch() {
  search.code = ''
  search.name = ''
  fetchData()
}

function buildPayload(data: Record<string, string>) {
  return {
    code: data.code ?? '',
    name: data.name ?? '',
    itemTypeCode: data.itemTypeCode || '',
    unit: data.unit || '',
    spec: data.spec || '',
    description: data.description || '',
    useYn: data.useYn === 'true',
    sortOrder: parseInt(data.sortOrder ?? '0') || 0,
  }
}

// 컬럼 정의
const columnHelper = createColumnHelper<ItemDto>()
const columns = computed(() => [
  columnHelper.accessor('code', { header: '코드', enableSorting: true }),
  columnHelper.accessor('name', { header: '명칭', enableSorting: true }),
  columnHelper.accessor('itemTypeCode', {
    header: '품목유형',
    enableSorting: false,
    cell: (info) =>
      itemTypeOptions.value.find((o) => o.value === info.getValue())?.label ?? info.getValue() ?? '-',
  }),
  columnHelper.accessor('unit', {
    header: '단위',
    enableSorting: false,
    cell: (info) =>
      unitOptions.value.find((o) => o.value === info.getValue())?.label ?? info.getValue() ?? '-',
  }),
  columnHelper.accessor('spec', {
    header: '규격',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor('useYn', {
    header: '사용여부',
    enableSorting: true,
    cell: (info) => (info.getValue() ? '사용' : '미사용'),
  }),
])

// 검색 필드 정의
const searchFields: SearchFieldDef[] = [
  { key: 'code', label: '코드', placeholder: '코드 검색' },
  { key: 'name', label: '명칭', placeholder: '명칭 검색' },
]

// 모달 폼 필드 정의
const fieldsComputed = computed<FieldDef[]>(() => [
  { key: 'code', label: '코드', required: true, maxlength: 50, placeholder: '품목 코드' },
  { key: 'name', label: '명칭', required: true, maxlength: 100, placeholder: '품목 명칭' },
  {
    key: 'itemTypeCode',
    label: '품목유형',
    type: 'select',
    required: false,
    placeholder: '품목유형 선택',
    options: itemTypeOptions.value,
  },
  {
    key: 'unit',
    label: '단위',
    type: 'select',
    required: false,
    placeholder: '단위 선택',
    options: unitOptions.value,
  },
  { key: 'spec', label: '규격', required: false, maxlength: 100, placeholder: '규격 입력' },
  { key: 'description', label: '설명', required: false, maxlength: 200, placeholder: '설명 입력' },
  {
    key: 'useYn',
    label: '사용여부',
    type: 'select',
    required: false,
    placeholder: '사용여부 선택',
    options: useYnOptions,
  },
  { key: 'sortOrder', label: '정렬순서', type: 'number', required: false, min: 0, placeholder: '0' },
])

// ItemDto → 모달 초기값 변환
function toFormData(dto: ItemDto): Record<string, string> {
  return {
    code: dto.code ?? '',
    name: dto.name ?? '',
    itemTypeCode: dto.itemTypeCode ?? '',
    unit: dto.unit ?? '',
    spec: dto.spec ?? '',
    description: dto.description ?? '',
    useYn: dto.useYn ? 'true' : 'false',
    sortOrder: String(dto.sortOrder),
  }
}

onMounted(async () => {
  const { getCode } = await initialize(['ITEM_TYPE', 'UNIT'])
  itemTypeOptions.value = getCode('ITEM_TYPE')
  unitOptions.value = getCode('UNIT')
  await fetchData()
})
</script>

