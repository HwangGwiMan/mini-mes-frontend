/**
 * 재고 원장 화면.
 * - 현재고 / LOT별 재고 / 수불 이력 세 탭으로 구성 (단일 라우트 /inventory)
 * - warehouseId / itemId 필터는 탭 간 공유 — 탭 전환 시 검색값 유지
 * - 현재고 탭에서만 이동·조정 액션 버튼 노출
 * - ADJUST_OUT은 실수 방지를 위해 ConfirmDialog 2차 확인 추가
 */
<template>
  <div class="space-y-5">
    <!-- 헤더 -->
    <div>
      <h2 class="text-xl font-bold text-gray-900">재고 원장</h2>
      <p class="text-sm text-gray-500 mt-0.5">현재 재고 현황 및 수불 이력을 조회합니다.</p>
    </div>

    <!-- 탭 바 -->
    <div class="border-b border-gray-200">
      <nav class="flex gap-6">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="switchTab(tab.key)"
          class="pb-3 text-sm transition-colors whitespace-nowrap"
          :class="
            activeTab === tab.key
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          "
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- 검색 바 -->
    <SearchBar
      :model-value="search"
      :fields="activeSearchFields"
      @search="fetchData"
      @reset="resetSearch"
    />

    <!-- 수불이력 날짜 미지정 안내 배너 -->
    <div
      v-if="activeTab === 'transactions' && !search.fromDate && !search.toDate"
      class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700"
    >
      <Info :size="14" class="shrink-0" />
      날짜 범위를 지정하면 조회 성능이 향상됩니다.
    </div>

    <!-- 현재고 테이블 -->
    <DataTable
      v-if="activeTab === 'stock'"
      :data="stockRows"
      :columns="stockColumns"
      :loading="stockLoading"
      table-id="inventory-stock"
    >
      <template #actions="{ row }">
        <div class="flex items-center gap-1.5">
          <button
            @click="openTransfer(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            <ArrowLeftRight :size="12" />
            이동
          </button>
          <button
            @click="openAdjust(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors whitespace-nowrap"
          >
            <SlidersHorizontal :size="12" />
            조정
          </button>
        </div>
      </template>
    </DataTable>

    <!-- LOT별 재고 테이블 -->
    <DataTable
      v-if="activeTab === 'lots'"
      :data="lotRows"
      :columns="lotColumns"
      :loading="lotLoading"
      table-id="inventory-lots"
    />

    <!-- 수불 이력 테이블 -->
    <DataTable
      v-if="activeTab === 'transactions'"
      :data="txRows"
      :columns="txColumns"
      :loading="txLoading"
      table-id="inventory-tx"
    />

    <!-- 창고 간 이동 모달 -->
    <InventoryTransferModal
      v-model="transferOpen"
      :warehouse-options="warehouseOptions"
      :initial-item="actionTarget"
      :submitting="actionLoading"
      @confirm="handleTransfer"
    />

    <!-- 재고 조정 모달 -->
    <InventoryAdjustModal
      v-model="adjustOpen"
      :warehouse-options="warehouseOptions"
      :initial-item="actionTarget"
      :submitting="actionLoading"
      @confirm="onAdjustConfirm"
    />

    <!-- ADJUST_OUT 2차 확인 -->
    <ConfirmDialog
      :open="adjustConfirmOpen"
      title="출고 조정 확인"
      :message="`재고에서 ${pendingAdjustPayload?.qty?.toLocaleString()}개를 차감합니다. 계속하시겠습니까?`"
      confirm-label="조정 적용"
      variant="warning"
      :loading="actionLoading"
      @confirm="doAdjust(pendingAdjustPayload!)"
      @cancel="adjustConfirmOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, h, onMounted } from 'vue'
import { ArrowLeftRight, SlidersHorizontal, Info } from 'lucide-vue-next'
import { createColumnHelper } from '@tanstack/vue-table'
import DataTable from '@/components/DataTable.vue'
import SearchBar from '@/components/SearchBar.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import InventoryTransferModal from '@/components/InventoryTransferModal.vue'
import InventoryAdjustModal from '@/components/InventoryAdjustModal.vue'
import type { SearchFieldDef } from '@/components/SearchBar.vue'
import {
  inventoryApi,
  TX_TYPE_LABELS,
  type InventoryDto,
  type InventoryLotDto,
  type InventoryTxDto,
  type TransferRequest,
  type AdjustRequest,
} from '@/api/inventory'
import { warehouseApi } from '@/api/warehouse'
import { itemApi } from '@/api/item'
import { useToast } from '@/composables/useToast'
import { extractErrorMessage } from '@/types/api-error'

const { showSuccess, showError } = useToast()

// ── 탭 정의 ────────────────────────────────────────────────────────────────

type TabKey = 'stock' | 'lots' | 'transactions'
const tabs: { key: TabKey; label: string }[] = [
  { key: 'stock', label: '현재고' },
  { key: 'lots', label: 'LOT별 재고' },
  { key: 'transactions', label: '수불 이력' },
]
const activeTab = ref<TabKey>('stock')

// ── 공유 검색 상태 ──────────────────────────────────────────────────────────

const search = reactive({ warehouseId: '', itemId: '', fromDate: '', toDate: '' })

const baseSearchFields = computed<SearchFieldDef[]>(() => [
  { key: 'warehouseId', label: '창고', type: 'select', placeholder: '전체', options: warehouseOptions.value },
  { key: 'itemId', label: '품목', type: 'select', placeholder: '전체', options: itemOptions.value },
])

const txSearchFields = computed<SearchFieldDef[]>(() => [
  ...baseSearchFields.value,
  { key: 'fromDate', label: '기간(시작)', type: 'date' },
  { key: 'toDate', label: '기간(종료)', type: 'date' },
])

const activeSearchFields = computed(() =>
  activeTab.value === 'transactions' ? txSearchFields.value : baseSearchFields.value,
)

// ── 데이터 / 로딩 ──────────────────────────────────────────────────────────

const stockRows = ref<InventoryDto[]>([])
const lotRows = ref<InventoryLotDto[]>([])
const txRows = ref<InventoryTxDto[]>([])
const stockLoading = ref(false)
const lotLoading = ref(false)
const txLoading = ref(false)

// ── 참조 데이터 ────────────────────────────────────────────────────────────

const warehouseOptions = ref<{ value: string; label: string }[]>([])
const itemOptions = ref<{ value: string; label: string }[]>([])

// ── 액션 모달 상태 ─────────────────────────────────────────────────────────

const transferOpen = ref(false)
const adjustOpen = ref(false)
const actionTarget = ref<InventoryDto | null>(null)
const actionLoading = ref(false)
const adjustConfirmOpen = ref(false)
const pendingAdjustPayload = ref<AdjustRequest | null>(null)

// ── fetch ───────────────────────────────────────────────────────────────────

function buildParams() {
  return {
    warehouseId: search.warehouseId ? Number(search.warehouseId) : undefined,
    itemId: search.itemId ? Number(search.itemId) : undefined,
  }
}

async function fetchData() {
  const params = buildParams()
  if (activeTab.value === 'stock') {
    stockLoading.value = true
    try {
      const { data } = await inventoryApi.getStock(params)
      stockRows.value = data
    } finally {
      stockLoading.value = false
    }
  } else if (activeTab.value === 'lots') {
    lotLoading.value = true
    try {
      const { data } = await inventoryApi.getLots(params)
      lotRows.value = data
    } finally {
      lotLoading.value = false
    }
  } else {
    txLoading.value = true
    try {
      const { data } = await inventoryApi.getTransactions({
        ...params,
        fromDate: search.fromDate || undefined,
        toDate: search.toDate || undefined,
      })
      txRows.value = data
    } finally {
      txLoading.value = false
    }
  }
}

function resetSearch() {
  search.warehouseId = ''
  search.itemId = ''
  search.fromDate = ''
  search.toDate = ''
  fetchData()
}

// 탭 전환 시 해당 탭 데이터가 비어있으면 자동 fetch
function switchTab(tab: TabKey) {
  activeTab.value = tab
  const isEmpty =
    (tab === 'stock' && stockRows.value.length === 0 && !stockLoading.value) ||
    (tab === 'lots' && lotRows.value.length === 0 && !lotLoading.value) ||
    (tab === 'transactions' && txRows.value.length === 0 && !txLoading.value)
  if (isEmpty) fetchData()
}

// ── 액션 핸들러 ────────────────────────────────────────────────────────────

function openTransfer(row: InventoryDto) {
  actionTarget.value = row
  transferOpen.value = true
}

function openAdjust(row: InventoryDto) {
  actionTarget.value = row
  adjustOpen.value = true
}

async function handleTransfer(payload: TransferRequest) {
  actionLoading.value = true
  try {
    await inventoryApi.transfer(payload)
    transferOpen.value = false
    showSuccess('창고 간 이동이 완료되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    showError(extractErrorMessage(err, '이동 처리 중 오류가 발생했습니다.'))
  } finally {
    actionLoading.value = false
  }
}

function onAdjustConfirm(payload: AdjustRequest) {
  // ADJUST_OUT은 파괴적 작업이므로 2차 확인
  if (payload.txType === 'ADJUST_OUT') {
    pendingAdjustPayload.value = payload
    adjustOpen.value = false
    adjustConfirmOpen.value = true
  } else {
    doAdjust(payload)
  }
}

async function doAdjust(payload: AdjustRequest) {
  actionLoading.value = true
  adjustConfirmOpen.value = false
  try {
    await inventoryApi.adjust(payload)
    adjustOpen.value = false
    showSuccess('재고 조정이 완료되었습니다.')
    await fetchData()
  } catch (err: unknown) {
    showError(extractErrorMessage(err, '재고 조정 중 오류가 발생했습니다.'))
  } finally {
    actionLoading.value = false
    pendingAdjustPayload.value = null
  }
}

// ── 컬럼 정의 ───────────────────────────────────────────────────────────────

const stockColumnHelper = createColumnHelper<InventoryDto>()
const stockColumns = computed(() => [
  stockColumnHelper.accessor('itemCode', { header: '품목코드', enableSorting: true }),
  stockColumnHelper.accessor('itemName', { header: '품목명', enableSorting: true }),
  stockColumnHelper.accessor('qtyOnHand', {
    header: '재고수량',
    enableSorting: true,
    cell: (info) => info.getValue().toLocaleString(),
  }),
  stockColumnHelper.accessor('qtyReserved', {
    header: '예약수량',
    enableSorting: false,
    cell: (info) => info.getValue().toLocaleString(),
  }),
  stockColumnHelper.accessor('availableQty', {
    header: '가용수량',
    enableSorting: true,
    cell: (info) => {
      const v = info.getValue()
      return h(
        'span',
        { class: v > 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium' },
        v.toLocaleString(),
      )
    },
  }),
])

const lotColumnHelper = createColumnHelper<InventoryLotDto>()
const lotColumns = computed(() => [
  lotColumnHelper.accessor('itemCode', { header: '품목코드', enableSorting: true }),
  lotColumnHelper.accessor('itemName', { header: '품목명', enableSorting: true }),
  lotColumnHelper.accessor('lotNo', { header: 'LOT번호', enableSorting: true }),
  lotColumnHelper.accessor('expiryDate', {
    header: '유효기한',
    enableSorting: true,
    cell: (info) => {
      const val = info.getValue()
      if (!val) return h('span', { class: 'text-gray-400' }, '-')
      // 로컬 날짜 기준 비교 (UTC 자정 이슈 방지)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expiry = new Date(val + 'T00:00:00')
      const diffDays = Math.floor((expiry.getTime() - today.getTime()) / 86400000)
      if (diffDays < 0) return h('span', { class: 'text-red-600 font-semibold' }, `${val} (만료)`)
      if (diffDays <= 30)
        return h('span', { class: 'text-amber-600 font-medium' }, `${val} (D-${diffDays})`)
      return h('span', {}, val)
    },
  }),
  lotColumnHelper.accessor('qtyOnHand', {
    header: '재고수량',
    enableSorting: false,
    cell: (info) => info.getValue().toLocaleString(),
  }),
  lotColumnHelper.accessor('qtyReserved', {
    header: '예약수량',
    enableSorting: false,
    cell: (info) => info.getValue().toLocaleString(),
  }),
  lotColumnHelper.accessor('availableQty', {
    header: '가용수량',
    enableSorting: false,
    cell: (info) => {
      const v = info.getValue()
      return h(
        'span',
        { class: v > 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium' },
        v.toLocaleString(),
      )
    },
  }),
])

const txColumnHelper = createColumnHelper<InventoryTxDto>()
const txColumns = computed(() => [
  txColumnHelper.accessor('txDate', { header: '거래일자', enableSorting: true }),
  txColumnHelper.accessor('itemCode', { header: '품목코드', enableSorting: true }),
  txColumnHelper.accessor('itemName', { header: '품목명', enableSorting: false }),
  txColumnHelper.accessor('lotNo', {
    header: 'LOT번호',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
  txColumnHelper.accessor('txType', {
    header: '거래유형',
    enableSorting: false,
    cell: (info) => TX_TYPE_LABELS[info.getValue()] ?? info.getValue(),
  }),
  txColumnHelper.accessor('qtyDelta', {
    header: '수량',
    enableSorting: false,
    cell: (info) => {
      const v = info.getValue()
      const prefix = v > 0 ? '+' : ''
      return h(
        'span',
        { class: v > 0 ? 'text-blue-600 font-medium' : 'text-red-500 font-medium' },
        `${prefix}${v.toLocaleString()}`,
      )
    },
  }),
  txColumnHelper.accessor('refType', {
    header: '참조유형',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
  txColumnHelper.accessor('refId', {
    header: '참조ID',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
  txColumnHelper.accessor('createdBy', { header: '처리자', enableSorting: false }),
])

// ── 초기화 ──────────────────────────────────────────────────────────────────

onMounted(async () => {
  const [whRes, itemRes] = await Promise.all([warehouseApi.getAll(), itemApi.getAll()])
  warehouseOptions.value = whRes.data.map((w) => ({
    value: String(w.id),
    label: `${w.code} - ${w.name}`,
  }))
  itemOptions.value = itemRes.data.map((i) => ({
    value: String(i.id),
    label: `${i.code} - ${i.name}`,
  }))
  await fetchData()
})
</script>
