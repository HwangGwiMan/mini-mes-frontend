<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">단가 관리</h2>
        <p class="text-sm text-gray-500 mt-0.5">품목별 기준 판매단가를 관리합니다.</p>
      </div>
      <button
        @click="openCreate"
        class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus :size="15" />
        신규 등록
      </button>
    </div>

    <SearchBar
      :model-value="search"
      :fields="searchFields"
      @search="fetchData"
      @reset="resetSearch"
    />

    <DataTable :data="prices" :columns="columns" :loading="loading" table-id="price">
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

    <CrudModal
      v-model="modalOpen"
      :title="editTarget ? '단가 수정' : '단가 등록'"
      :fields="fieldsComputed"
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
                <h3 class="text-base font-semibold text-gray-900">단가 삭제</h3>
                <p class="text-sm text-gray-500 mt-0.5">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>
            <p class="text-sm text-gray-700 mb-6">
              <span class="font-medium">{{ deleteTarget?.itemName }}</span> 품목의 단가를 삭제하시겠습니까?
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
import { priceApi, type ItemPriceDto, type ItemPriceRequest } from '@/api/price'
import { itemApi } from '@/api/item'
import { useCrudPage } from '@/composables/useCrudPage'

const itemOptions = ref<{ value: string; label: string }[]>([])

const search = reactive({ itemCode: '', itemName: '' })

const {
  rows: prices,
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
} = useCrudPage<ItemPriceDto, ItemPriceRequest>({
  fetchFn: () =>
    priceApi.getAll({
      itemCode: search.itemCode || undefined,
      itemName: search.itemName || undefined,
    }),
  createFn: (data) => priceApi.create(data),
  updateFn: (id, data) => priceApi.update(id, data),
  deleteFn: (id) => priceApi.delete(id),
  toPayload: buildPayload,
})

function resetSearch() {
  search.itemCode = ''
  search.itemName = ''
  fetchData()
}

function buildPayload(data: Record<string, string>): ItemPriceRequest {
  return {
    itemId: Number(data.itemId),
    unitPrice: Number(data.unitPrice),
    remarks: data.remarks || null,
  }
}

function toFormData(dto: ItemPriceDto): Record<string, string> {
  return {
    itemId: String(dto.itemId),
    unitPrice: String(dto.unitPrice),
    remarks: dto.remarks ?? '',
  }
}

const columnHelper = createColumnHelper<ItemPriceDto>()
const columns = [
  columnHelper.accessor('itemCode', { header: '품목코드', enableSorting: true }),
  columnHelper.accessor('itemName', { header: '품목명', enableSorting: true }),
  columnHelper.accessor('unitPrice', {
    header: '단가',
    enableSorting: true,
    cell: (info) => info.getValue()?.toLocaleString() ?? '-',
  }),
  columnHelper.accessor('remarks', {
    header: '비고',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor('updatedAt', {
    header: '최종수정일',
    enableSorting: true,
    cell: (info) => {
      const v = info.getValue()
      return v ? v.substring(0, 10) : '-'
    },
  }),
]

const searchFields: SearchFieldDef[] = [
  { key: 'itemCode', label: '품목코드', placeholder: '품목코드 검색' },
  { key: 'itemName', label: '품목명', placeholder: '품목명 검색' },
]

// 등록 시 품목 select, 수정 시 품목 readonly
const fieldsComputed = computed<FieldDef[]>(() => [
  editTarget.value
    ? {
        key: 'itemId',
        label: '품목',
        readonly: true,
        placeholder: `${editTarget.value.itemCode} - ${editTarget.value.itemName}`,
      }
    : { key: 'itemId', label: '품목', type: 'select', required: true, options: itemOptions.value },
  { key: 'unitPrice', label: '단가', type: 'number', required: true, min: 0 },
  { key: 'remarks', label: '비고', maxlength: 200 },
])

onMounted(async () => {
  const { data } = await itemApi.getAll()
  itemOptions.value = data.map((i: { id: number; code: string; name: string }) => ({
    value: String(i.id),
    label: `${i.code} - ${i.name}`,
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
