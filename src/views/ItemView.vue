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
      :fields="fields"
      :initial-data="editTarget ? { code: editTarget.code, name: editTarget.name } : undefined"
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
                <h3 class="text-base font-semibold text-gray-900">품목 삭제</h3>
                <p class="text-sm text-gray-500 mt-0.5">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>
            <p class="text-sm text-gray-700 mb-6">
              <span class="font-medium">{{ deleteTarget?.name }}</span> 품목을 삭제하시겠습니까?
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
import { onMounted } from 'vue'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-vue-next'
import { createColumnHelper } from '@tanstack/vue-table'
import DataTable from '@/components/DataTable.vue'
import CrudModal from '@/components/CrudModal.vue'
import SearchBar from '@/components/SearchBar.vue'
import type { FieldDef } from '@/components/CrudModal.vue'
import type { SearchFieldDef } from '@/components/SearchBar.vue'
import { itemApi, type ItemDto, type ItemRequest } from '@/api/item'
import { useScreenInit } from '@/composables/useScreenInit'
import { useCrudPage } from '@/composables/useCrudPage'

const { initialize } = useScreenInit()

// 공통 CRUD 상태 및 함수
const {
  rows: items,
  loading,
  submitting,
  modalOpen,
  modalError,
  editTarget,
  deleteTarget,
  search,
  fetchData,
  resetSearch,
  openCreate,
  openEdit,
  handleSave,
  confirmDelete,
  handleDelete,
} = useCrudPage<ItemDto, ItemRequest>({
  fetchFn: (params) => itemApi.getAll(params),
  createFn: (data) => itemApi.create(data),
  updateFn: (id, data) => itemApi.update(id, data),
  deleteFn: (id) => itemApi.delete(id),
  toPayload: (data) => ({ code: data.code, name: data.name }),
})

// 컬럼 정의
const columnHelper = createColumnHelper<ItemDto>()
const columns = [
  columnHelper.accessor('code', { header: '코드', enableSorting: true }),
  columnHelper.accessor('name', { header: '명칭', enableSorting: true }),
]

// 검색 필드 정의
const searchFields: SearchFieldDef[] = [
  { key: 'code', label: '코드', placeholder: '코드 검색' },
  { key: 'name', label: '명칭', placeholder: '명칭 검색' },
]

// 모달 폼 필드 정의
const fields: FieldDef[] = [
  { key: 'code', label: '코드', required: true, maxlength: 50,  placeholder: '품목 코드' },
  { key: 'name', label: '명칭', required: true, maxlength: 100, placeholder: '품목 명칭' },
]

onMounted(async () => {
  await initialize()
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
