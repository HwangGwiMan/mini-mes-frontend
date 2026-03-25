<template>
  <div class="space-y-5">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">라우팅 관리</h2>
        <p class="text-sm text-gray-500 mt-0.5">BOM별 생산 공정 순서를 조회하고 등록합니다.</p>
      </div>
      <button
        @click="openCreateModal"
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
      @search="loadData"
      @reset="resetSearch"
    />

    <!-- 그리드 -->
    <DataTable :data="rows" :columns="columns" :loading="loading" table-id="routing-list">
      <template #actions="{ row }">
        <button
          @click="router.push(`/routing/${row.original.id}`)"
          class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
        >
          <ChevronRight :size="12" />
          상세
        </button>
      </template>
    </DataTable>

    <!-- 라우팅 등록/수정 모달 -->
    <RoutingFormModal
      v-if="modalOpen"
      v-model="modalOpen"
      :edit-target="editTarget"
      @saved="loadData"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 라우팅 목록 화면.
 * BOM별 공정 순서 검색/목록 표시 및 신규 등록 진입점.
 * 행 클릭 시 라우팅 상세 화면으로 이동한다.
 */
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, ChevronRight } from 'lucide-vue-next'
import { createColumnHelper } from '@tanstack/vue-table'
import DataTable from '@/components/DataTable.vue'
import SearchBar from '@/components/SearchBar.vue'
import type { SearchFieldDef } from '@/components/SearchBar.vue'
import RoutingFormModal from '@/components/RoutingFormModal.vue'
import { routingApi, type RoutingDto } from '@/api/routing'
import { useScreenInit } from '@/composables/useScreenInit'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const { initialize } = useScreenInit()
const { showError } = useToast()

const rows = ref<RoutingDto[]>([])
const loading = ref(false)
const modalOpen = ref(false)
const editTarget = ref<RoutingDto | null>(null)

const activeYnOptions = [
  { value: '', label: '전체' },
  { value: 'true', label: '활성' },
  { value: 'false', label: '비활성' },
]

const search = reactive({ itemCode: '', itemName: '', bomVersion: '', activeYn: '' })

const searchFields: SearchFieldDef[] = [
  { key: 'itemCode', label: '완제품 코드', placeholder: '완제품 코드 검색' },
  { key: 'itemName', label: '완제품명', placeholder: '완제품명 검색' },
  { key: 'bomVersion', label: 'BOM 버전', placeholder: 'BOM 버전 검색' },
  { key: 'activeYn', label: '활성여부', type: 'select', options: activeYnOptions },
]

async function loadData() {
  loading.value = true
  try {
    const res = await routingApi.getAll({
      itemCode: search.itemCode || undefined,
      itemName: search.itemName || undefined,
      bomVersion: search.bomVersion || undefined,
      activeYn: search.activeYn === '' ? undefined : search.activeYn === 'true',
    })
    rows.value = res.data
  } catch {
    showError('라우팅 목록을 불러오는 중 오류가 발생했습니다.')
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  search.itemCode = ''
  search.itemName = ''
  search.bomVersion = ''
  search.activeYn = ''
  loadData()
}

function openCreateModal() {
  editTarget.value = null
  modalOpen.value = true
}

const columnHelper = createColumnHelper<RoutingDto>()
const columns = [
  columnHelper.accessor('itemCode', { header: '완제품 코드', enableSorting: true }),
  columnHelper.accessor('itemName', { header: '완제품명', enableSorting: true }),
  columnHelper.accessor('bomVersion', { header: 'BOM 버전', enableSorting: true }),
  columnHelper.accessor('stepCount', { header: '공정 수', enableSorting: false }),
  columnHelper.accessor('activeYn', {
    header: '활성여부',
    enableSorting: true,
    cell: (info) => (info.getValue() ? '활성' : '비활성'),
  }),
]

onMounted(async () => {
  await initialize()
  await loadData()
})
</script>
