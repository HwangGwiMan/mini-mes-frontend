<template>
  <div class="space-y-5">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">사원 관리</h2>
        <p class="text-sm text-gray-500 mt-0.5">사원 정보를 조회하고 등록합니다.</p>
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
      :fields="searchFieldsComputed"
      @search="fetchData"
      @reset="resetSearch"
    />

    <!-- 그리드 -->
    <DataTable :data="employees" :columns="columns" :loading="loading" table-id="employee">
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
      :title="editTarget ? '사원 수정' : '사원 등록'"
      :fields="fieldsComputed"
      :initial-data="editTarget ? toFormData(editTarget) : undefined"
      :submitting="submitting"
      :error-msg="modalError"
      @confirm="handleSave"
    />

    <ConfirmDialog
      :open="!!deleteTarget"
      title="사원 삭제"
      :message="`'${deleteTarget?.name}' 사원을 삭제하시겠습니까?`"
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
import { employeeApi, type EmployeeDto } from '@/api/employee'
import { useScreenInit } from '@/composables/useScreenInit'
import { useCrudPage } from '@/composables/useCrudPage'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const { initialize } = useScreenInit()

// 부서/직급 공통코드 옵션 (진입 시 선조회)
const deptOptions = ref<{ value: string; label: string }[]>([])
const positionOptions = ref<{ value: string; label: string }[]>([])

// 사용여부 옵션
const useYnOptions = [
  { value: 'true', label: '사용' },
  { value: 'false', label: '미사용' },
]

// 검색 조건 (사번, 성명, 부서)
const search = reactive({ code: '', name: '', deptCode: '' })

// 공통 CRUD 상태 및 함수
const {
  rows: employees,
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
} = useCrudPage<EmployeeDto, ReturnType<typeof buildPayload>>({
  fetchFn: () =>
    employeeApi.getAll({
      code: search.code || undefined,
      name: search.name || undefined,
      deptCode: search.deptCode || undefined,
    }),
  createFn: (data: ReturnType<typeof buildPayload>) => employeeApi.create(data),
  updateFn: (id: number, data: ReturnType<typeof buildPayload>) => employeeApi.update(id, data),
  deleteFn: (id: number) => employeeApi.delete(id),
  toPayload: buildPayload,
})

function resetSearch() {
  search.code = ''
  search.name = ''
  search.deptCode = ''
  fetchData()
}

function buildPayload(data: Record<string, string>) {
  return {
    code: data.code ?? '',
    name: data.name ?? '',
    deptCode: data.deptCode || '',
    positionCode: data.positionCode || '',
    hireDate: data.hireDate ? data.hireDate : null,
    phone: data.phone || '',
    email: data.email || '',
    useYn: data.useYn === 'true',
    sortOrder: parseInt(data.sortOrder ?? '0') || 0,
  }
}

// 컬럼 정의
const columnHelper = createColumnHelper<EmployeeDto>()
const columns = computed(() => [
  columnHelper.accessor('code', { header: '사번', enableSorting: true }),
  columnHelper.accessor('name', { header: '성명', enableSorting: true }),
  columnHelper.accessor('deptCode', {
    header: '부서',
    enableSorting: false,
    cell: (info) =>
      deptOptions.value.find((o) => o.value === info.getValue())?.label ?? info.getValue() ?? '-',
  }),
  columnHelper.accessor('positionCode', {
    header: '직급',
    enableSorting: false,
    cell: (info) =>
      positionOptions.value.find((o) => o.value === info.getValue())?.label ?? info.getValue() ?? '-',
  }),
  columnHelper.accessor('hireDate', {
    header: '입사일',
    enableSorting: true,
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor('phone', {
    header: '연락처',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor('useYn', {
    header: '사용여부',
    enableSorting: true,
    cell: (info) => (info.getValue() ? '사용' : '미사용'),
  }),
])

// 모달 폼 필드
const fieldsComputed = computed<FieldDef[]>(() => [
  { key: 'code', label: '사번', required: true, maxlength: 50, placeholder: '사번 입력' },
  { key: 'name', label: '성명', required: true, maxlength: 100, placeholder: '성명 입력' },
  {
    key: 'deptCode',
    label: '부서',
    type: 'select',
    required: false,
    placeholder: '부서 선택',
    options: deptOptions.value,
  },
  {
    key: 'positionCode',
    label: '직급',
    type: 'select',
    required: false,
    placeholder: '직급 선택',
    options: positionOptions.value,
  },
  { key: 'hireDate', label: '입사일', type: 'date', required: false, placeholder: '입사일' },
  { key: 'phone', label: '연락처', required: false, maxlength: 20, placeholder: '연락처 입력' },
  { key: 'email', label: '이메일', required: false, maxlength: 100, placeholder: '이메일 입력' },
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

// 검색 필드 (부서는 select로)
const searchFieldsComputed = computed<SearchFieldDef[]>(() => [
  { key: 'code', label: '사번', placeholder: '사번 검색' },
  { key: 'name', label: '성명', placeholder: '성명 검색' },
  {
    key: 'deptCode',
    label: '부서',
    type: 'select',
    placeholder: '전체',
    options: deptOptions.value,
  },
])

// EmployeeDto → 모달 초기값 변환
function toFormData(dto: EmployeeDto): Record<string, string> {
  return {
    code: dto.code ?? '',
    name: dto.name ?? '',
    deptCode: dto.deptCode ?? '',
    positionCode: dto.positionCode ?? '',
    hireDate: dto.hireDate ?? '',
    phone: dto.phone ?? '',
    email: dto.email ?? '',
    useYn: dto.useYn ? 'true' : 'false',
    sortOrder: String(dto.sortOrder),
  }
}

onMounted(async () => {
  const { getCode } = await initialize(['DEPT', 'POSITION'])
  deptOptions.value = getCode('DEPT')
  positionOptions.value = getCode('POSITION')
  await fetchData()
})
</script>

