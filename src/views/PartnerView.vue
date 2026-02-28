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
    <div class="bg-white rounded-xl border border-gray-200 p-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1.5 min-w-36">
          <label class="text-xs font-medium text-gray-600">코드</label>
          <input
            v-model="search.code"
            type="text"
            placeholder="코드 검색"
            class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @keyup.enter="fetchData"
          />
        </div>
        <div class="flex flex-col gap-1.5 min-w-36">
          <label class="text-xs font-medium text-gray-600">명칭</label>
          <input
            v-model="search.name"
            type="text"
            placeholder="명칭 검색"
            class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @keyup.enter="fetchData"
          />
        </div>
        <div class="flex gap-2">
          <button
            @click="fetchData"
            class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Search :size="14" />
            검색
          </button>
          <button
            @click="resetSearch"
            class="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            초기화
          </button>
        </div>
      </div>
    </div>

    <!-- 그리드 -->
    <DataTable :data="partners" :columns="columns" :loading="loading">
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
import { ref, reactive, onMounted } from 'vue'
import { Plus, Search, Pencil, Trash2, AlertTriangle } from 'lucide-vue-next'
import { createColumnHelper } from '@tanstack/vue-table'
import DataTable from '@/components/DataTable.vue'
import CrudModal from '@/components/CrudModal.vue'
import type { FieldDef } from '@/components/CrudModal.vue'
import { partnerApi, type PartnerDto } from '@/api/partner'

// 컬럼 정의
const columnHelper = createColumnHelper<PartnerDto>()
const columns = [
  columnHelper.accessor('code', {
    header: '코드',
    enableSorting: true,
  }),
  columnHelper.accessor('name', {
    header: '명칭',
    enableSorting: true,
  }),
]

// 폼 필드 정의
const fields: FieldDef[] = [
  { key: 'code', label: '코드', required: true, maxlength: 50, placeholder: '거래처 코드' },
  { key: 'name', label: '명칭', required: true, maxlength: 100, placeholder: '거래처 명칭' },
]

// 상태
const partners = ref<PartnerDto[]>([])
const loading = ref(false)
const submitting = ref(false)
const modalOpen = ref(false)
const modalError = ref('')
const editTarget = ref<PartnerDto | null>(null)
const deleteTarget = ref<PartnerDto | null>(null)

const search = reactive({ code: '', name: '' })

// 데이터 조회
async function fetchData() {
  loading.value = true
  try {
    const { data } = await partnerApi.getAll({
      code: search.code || undefined,
      name: search.name || undefined,
    })
    partners.value = data
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  search.code = ''
  search.name = ''
  fetchData()
}

// 등록 모달 열기
function openCreate() {
  editTarget.value = null
  modalError.value = ''
  modalOpen.value = true
}

// 수정 모달 열기
function openEdit(row: PartnerDto) {
  editTarget.value = row
  modalError.value = ''
  modalOpen.value = true
}

// 저장 처리 (등록/수정 공통)
async function handleSave(data: Record<string, string>) {
  submitting.value = true
  modalError.value = ''
  try {
    if (editTarget.value) {
      await partnerApi.update(editTarget.value.id, { code: data.code, name: data.name })
    } else {
      await partnerApi.create({ code: data.code, name: data.name })
    }
    modalOpen.value = false
    await fetchData()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    modalError.value = e.response?.data?.message ?? '저장 중 오류가 발생했습니다.'
  } finally {
    submitting.value = false
  }
}

// 삭제 확인 다이얼로그
function confirmDelete(row: PartnerDto) {
  deleteTarget.value = row
}

// 삭제 처리
async function handleDelete() {
  if (!deleteTarget.value) return
  submitting.value = true
  try {
    await partnerApi.delete(deleteTarget.value.id)
    deleteTarget.value = null
    await fetchData()
  } finally {
    submitting.value = false
  }
}

onMounted(fetchData)
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
