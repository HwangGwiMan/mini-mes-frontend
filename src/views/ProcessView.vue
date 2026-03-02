<template>
  <div class="space-y-5">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">공정 관리</h2>
        <p class="text-sm text-gray-500 mt-0.5">공정 정보를 조회하고 등록합니다.</p>
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
    <DataTable :data="processes" :columns="columns" :loading="loading" table-id="process">
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
      :title="editTarget ? '공정 수정' : '공정 등록'"
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
                <h3 class="text-base font-semibold text-gray-900">공정 삭제</h3>
                <p class="text-sm text-gray-500 mt-0.5">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>
            <p class="text-sm text-gray-700 mb-6">
              <span class="font-medium">{{ deleteTarget?.name }}</span> 공정을 삭제하시겠습니까?
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
import { processApi, type ProcessDto } from '@/api/process'
import { commonCodeApi } from '@/api/commonCode'
import { useScreenInit } from '@/composables/useScreenInit'
import { useCrudPage } from '@/composables/useCrudPage'

const { initialize } = useScreenInit()

// 공정유형 공통코드 옵션 (진입 시 선조회)
const processTypeOptions = ref<{ value: string; label: string }[]>([])

// 검색 조건
const search = reactive({ code: '', name: '' })

// 공통 CRUD 상태 및 함수
const {
  rows: processes,
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
} = useCrudPage<ProcessDto, ReturnType<typeof buildPayload>>({
  fetchFn: () =>
    processApi.getAll({
      code: search.code || undefined,
      name: search.name || undefined,
    }),
  createFn: (data: ReturnType<typeof buildPayload>) => processApi.create(data),
  updateFn: (id: number, data: ReturnType<typeof buildPayload>) => processApi.update(id, data),
  deleteFn: (id: number) => processApi.delete(id),
  toPayload: buildPayload,
})

function resetSearch() {
  search.code = ''
  search.name = ''
  fetchData()
}

function buildPayload(data: Record<string, string>) {
  return {
    code:            data.code,
    name:            data.name,
    processTypeCode: data.processTypeCode || '',
    standardTime:    data.standardTime ? parseInt(data.standardTime) : null,
    description:     data.description   || '',
    sortOrder:       parseInt(data.sortOrder) || 0,
  }
}

// 컬럼 정의
const columnHelper = createColumnHelper<ProcessDto>()
const columns = computed(() => [
  columnHelper.accessor('code', { header: '코드', enableSorting: true }),
  columnHelper.accessor('name', { header: '공정명', enableSorting: true }),
  columnHelper.accessor('processTypeCode', {
    header: '공정유형',
    enableSorting: false,
    cell: (info) =>
      processTypeOptions.value.find((o) => o.value === info.getValue())?.label ?? info.getValue() ?? '-',
  }),
  columnHelper.accessor('standardTime', {
    header: '표준시간(초)',
    enableSorting: true,
    cell: (info) => (info.getValue() != null ? `${info.getValue()}초` : '-'),
  }),
  columnHelper.accessor('sortOrder', { header: '정렬순서', enableSorting: true }),
])

// 모달 폼 필드
const fields = computed<FieldDef[]>(() => [
  { key: 'code',            label: '코드',       required: true,  maxlength: 50,  placeholder: 'PROC_001' },
  { key: 'name',            label: '공정명',     required: true,  maxlength: 100, placeholder: '공정 명칭' },
  { key: 'processTypeCode', label: '공정유형',   type: 'select',  required: false, placeholder: '공정유형 선택', options: processTypeOptions.value },
  { key: 'standardTime',    label: '표준시간(초)', type: 'number', required: false, min: 0, placeholder: '예: 30' },
  { key: 'description',     label: '설명',       required: false, maxlength: 200, placeholder: '공정에 대한 설명' },
  { key: 'sortOrder',       label: '정렬순서',   type: 'number',  required: false, min: 0, placeholder: '0' },
])

// 검색 필드 정의
const searchFields: SearchFieldDef[] = [
  { key: 'code', label: '코드',   placeholder: '코드 검색' },
  { key: 'name', label: '공정명', placeholder: '공정명 검색' },
]

// ProcessDto → 모달 초기값 변환
function toFormData(dto: ProcessDto): Record<string, string> {
  return {
    code:            dto.code            ?? '',
    name:            dto.name            ?? '',
    processTypeCode: dto.processTypeCode ?? '',
    standardTime:    dto.standardTime != null ? String(dto.standardTime) : '',
    description:     dto.description    ?? '',
    sortOrder:       String(dto.sortOrder),
  }
}

onMounted(async () => {
  await initialize()
  const { data } = await commonCodeApi.search('PROCESS_TYPE')
  processTypeOptions.value = data.map((c: { code: string; name: string }) => ({ value: c.code, label: c.name }))
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
