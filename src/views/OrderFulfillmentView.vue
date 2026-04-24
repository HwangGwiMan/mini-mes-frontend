<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-xl font-bold text-gray-900">수주 이행 현황</h2>
      <p class="text-sm text-gray-500 mt-0.5">수주·출하·매출 진행 상황 및 이행률을 확인합니다.</p>
    </div>

    <SearchBar
      :model-value="search"
      :fields="basicSearchFields"
      @search="fetchData"
      @reset="resetSearch"
    />

    <button
      type="button"
      @click="showDetailSearch = !showDetailSearch"
      class="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors"
    >
      <ChevronDown
        :size="16"
        :class="{ 'rotate-180': showDetailSearch }"
        class="transition-transform"
      />
      {{ showDetailSearch ? '상세 검색 접기' : '상세 검색 보기' }}
    </button>

    <SearchBar
      v-if="showDetailSearch"
      :model-value="search"
      :fields="detailSearchFields"
      @search="fetchData"
      @reset="resetSearch"
    />

    <!-- 수주 목록 — 행 클릭 시 하단 디테일 갱신 -->
    <div>
      <DataTable
        :data="rows"
        :columns="columns"
        :loading="loading"
        table-id="order-fulfillment"
      >
        <template #actions="{ row }">
          <button
            @click="selectRow(row)"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
            :class="{ 'bg-blue-100 font-semibold': selectedRow?.salesOrderId === row.salesOrderId }"
          >
            <Eye :size="12" />
            상세
          </button>
        </template>

      </DataTable>
    </div>

    <!-- 디테일 패널 — 수주 선택 시 표시 -->
    <div v-if="selectedRow" class="border border-gray-200 rounded-xl bg-white shadow-sm">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="font-semibold text-gray-900">{{ selectedRow.orderNumber }}</span>
          <span class="text-sm text-gray-500">{{ selectedRow.partnerName }}</span>
          <span
            v-if="isDeliveryUrgent(selectedRow)"
            class="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"
          >
            납기 임박
          </span>
        </div>
        <button
          @click="selectedRow = null"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X :size="18" />
        </button>
      </div>

      <!-- 탭 헤더 -->
      <div class="flex border-b border-gray-100 px-5">
        <button
          v-for="tab in detailTabs"
          :key="tab.key"
          @click="activeDetailTab = tab.key"
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors mr-2"
          :class="
            activeDetailTab === tab.key
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          "
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 출하 탭 -->
      <div v-if="activeDetailTab === 'shipment'" class="p-5">
        <div v-if="detailLoading" class="text-center py-8 text-sm text-gray-400">불러오는 중...</div>
        <div v-else-if="detailShipments.length === 0" class="text-center py-8 text-sm text-gray-400">
          출하 내역이 없습니다.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-gray-500 border-b border-gray-100">
                <th class="text-left py-2 pr-4 font-medium">출하번호</th>
                <th class="text-left py-2 pr-4 font-medium">상태</th>
                <th class="text-left py-2 pr-4 font-medium">출하일자</th>
                <th class="text-right py-2 pr-4 font-medium">계획금액</th>
                <th class="text-right py-2 font-medium">실적금액</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="sh in detailShipments"
                :key="sh.id"
                class="border-b border-gray-50 hover:bg-gray-50"
              >
                <td class="py-2.5 pr-4 text-gray-900">{{ sh.shipmentNumber }}</td>
                <td class="py-2.5 pr-4">
                  <span :class="shipmentStatusClass(sh.statusCode)">
                    {{ shipmentStatusLabel(sh.statusCode) }}
                  </span>
                </td>
                <td class="py-2.5 pr-4 text-gray-600">{{ sh.shipmentDate ?? '-' }}</td>
                <td class="py-2.5 pr-4 text-right text-gray-900">
                  {{ sumPlannedAmount(sh) }}
                </td>
                <td class="py-2.5 text-right text-gray-900">
                  {{ sumActualAmount(sh) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 매출 탭 -->
      <div v-if="activeDetailTab === 'revenue'" class="p-5">
        <div v-if="detailLoading" class="text-center py-8 text-sm text-gray-400">불러오는 중...</div>
        <div v-else-if="detailRevenues.length === 0" class="text-center py-8 text-sm text-gray-400">
          매출 내역이 없습니다.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-gray-500 border-b border-gray-100">
                <th class="text-left py-2 pr-4 font-medium">매출번호</th>
                <th class="text-left py-2 pr-4 font-medium">상태</th>
                <th class="text-left py-2 pr-4 font-medium">매출일자</th>
                <th class="text-right py-2 font-medium">매출금액</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="rv in detailRevenues"
                :key="rv.id"
                class="border-b border-gray-50 hover:bg-gray-50"
              >
                <td class="py-2.5 pr-4 text-gray-900">{{ rv.revenueNumber }}</td>
                <td class="py-2.5 pr-4">
                  <span :class="revenueStatusClass(rv.statusCode)">
                    {{ revenueStatusLabel(rv.statusCode) }}
                  </span>
                </td>
                <td class="py-2.5 pr-4 text-gray-600">{{ rv.revenueDate }}</td>
                <td class="py-2.5 text-right text-gray-900">
                  {{ rv.totalAmount.toLocaleString() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

/**
 * 수주이행현황 화면.
 * 수주·출하·매출 데이터를 통합 조회하는 읽기 전용 현황판이다.
 * 상단: 검색 바 / 중단: 수주 목록(클릭 시 선택) / 하단: 선택 수주의 출하·매출 디테일 탭
 *
 * useCrudPage를 사용하지 않고 ref로 직접 상태를 관리한다 — CRUD 없이 조회만 하기 때문이다.
 * 납기 임박(D-7 이내, 미완료 수주)은 행 배경을 강조하여 시각적으로 구분한다.
 */
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ChevronDown, Eye, X } from 'lucide-vue-next'
import { createColumnHelper } from '@tanstack/vue-table'
import DataTable from '@/components/DataTable.vue'
import SearchBar from '@/components/SearchBar.vue'
import type { SearchFieldDef } from '@/components/SearchBar.vue'
import { orderFulfillmentApi, type OrderFulfillmentDto } from '@/api/orderFulfillment'
import { shipmentApi, type ShipmentDto } from '@/api/shipment'
import { revenueApi, type RevenueDto } from '@/api/revenue'
import { partnerApi } from '@/api/partner'
import { useScreenInit } from '@/composables/useScreenInit'

const { initialize } = useScreenInit()

// ── 상태 ──────────────────────────────────────────────────────────────────────
const rows = ref<OrderFulfillmentDto[]>([])
const loading = ref(false)
const selectedRow = ref<OrderFulfillmentDto | null>(null)
const activeDetailTab = ref<'shipment' | 'revenue'>('shipment')
const detailShipments = ref<ShipmentDto[]>([])
const detailRevenues = ref<RevenueDto[]>([])
const detailLoading = ref(false)
const showDetailSearch = ref(false)

const partnerOptions = ref<{ value: string; label: string }[]>([])
const orderStatusOptions = ref<{ value: string; label: string }[]>([])
const shipmentStatusOptions = ref<{ value: string; label: string }[]>([])

const search = reactive({
  orderNumber: '',
  partnerId: '',
  orderStatusCode: '',
  shipmentStatusCode: '',
  fromDate: '',
  toDate: '',
})

const detailTabs = [
  { key: 'shipment' as const, label: '출하 내역' },
  { key: 'revenue' as const, label: '매출 내역' },
]

// ── 데이터 조회 ───────────────────────────────────────────────────────────────
async function fetchData() {
  loading.value = true
  try {
    const { data } = await orderFulfillmentApi.getAll({
      orderNumber: search.orderNumber || undefined,
      partnerId: search.partnerId ? Number(search.partnerId) : undefined,
      orderStatusCode: search.orderStatusCode || undefined,
      shipmentStatusCode: search.shipmentStatusCode || undefined,
      fromDate: search.fromDate || undefined,
      toDate: search.toDate || undefined,
    })
    rows.value = data
    // 선택 수주가 목록에 더 이상 없으면 디테일 패널 닫기
    if (selectedRow.value && !data.find((r) => r.salesOrderId === selectedRow.value?.salesOrderId)) {
      selectedRow.value = null
    }
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  search.orderNumber = ''
  search.partnerId = ''
  search.orderStatusCode = ''
  search.shipmentStatusCode = ''
  search.fromDate = ''
  search.toDate = ''
  fetchData()
}

/** 수주 행 클릭 — 디테일 패널 출하·매출 동시 조회 */
async function selectRow(row: OrderFulfillmentDto) {
  selectedRow.value = row
  activeDetailTab.value = 'shipment'
  detailLoading.value = true
  detailShipments.value = []
  detailRevenues.value = []
  try {
    const [shipRes, revRes] = await Promise.all([
      shipmentApi.getAll({ salesOrderId: row.salesOrderId }),
      revenueApi.getAll({ salesOrderId: row.salesOrderId }),
    ])
    detailShipments.value = shipRes.data
    detailRevenues.value = revRes.data
  } finally {
    detailLoading.value = false
  }
}

// ── 컬럼 정의 ─────────────────────────────────────────────────────────────────
const columnHelper = createColumnHelper<OrderFulfillmentDto>()
const columns = computed(() => [
  columnHelper.accessor('orderNumber', { header: '수주번호', enableSorting: true }),
  columnHelper.accessor('partnerName', { header: '거래처', enableSorting: false }),
  columnHelper.accessor('orderDate', { header: '수주일자', enableSorting: true }),
  columnHelper.accessor('deliveryDate', {
    header: '납기일자',
    enableSorting: true,
    cell: (info) => {
      const val = info.getValue()
      if (!val) return '-'
      // 납기 임박(D-7 이내, 미완료) 강조
      if (isDeliveryUrgent(info.row.original)) {
        return `⚠ ${val}`
      }
      return val
    },
  }),
  columnHelper.accessor('orderStatusCode', {
    header: '수주상태',
    enableSorting: false,
    cell: (info) =>
      orderStatusOptions.value.find((o) => o.value === info.getValue())?.label ??
      info.getValue() ??
      '-',
  }),
  columnHelper.accessor('shipmentStatusCode', {
    header: '출하상태',
    enableSorting: false,
    cell: (info) => {
      const code = info.getValue()
      if (!code) return '-'
      return shipmentStatusOptions.value.find((o) => o.value === code)?.label ?? code
    },
  }),
  columnHelper.accessor('fulfillmentRate', {
    header: '이행률',
    enableSorting: true,
    cell: (info) => {
      const rate = info.getValue()
      if (rate === null || rate === undefined) return '-'
      const pct = Math.min(100, Math.max(0, rate))
      return `${pct.toFixed(1)}%`
    },
  }),
  columnHelper.accessor('totalOrderAmount', {
    header: '수주금액',
    enableSorting: true,
    cell: (info) => (info.getValue() ?? 0).toLocaleString(),
  }),
  columnHelper.accessor('totalRevenueAmount', {
    header: '매출금액(마감)',
    enableSorting: false,
    cell: (info) => (info.getValue() ?? 0).toLocaleString(),
  }),
  columnHelper.accessor('revenueStatusSummary', {
    header: '매출상태',
    enableSorting: false,
    cell: (info) => info.getValue() ?? '-',
  }),
])

// ── 검색 필드 ─────────────────────────────────────────────────────────────────
const basicSearchFields = computed<SearchFieldDef[]>(() => [
  { key: 'orderNumber', label: '수주번호', placeholder: '수주번호 검색' },
  {
    key: 'partnerId',
    label: '거래처',
    type: 'select',
    placeholder: '전체',
    options: partnerOptions.value,
  },
  {
    key: 'orderStatusCode',
    label: '수주상태',
    type: 'select',
    placeholder: '전체',
    options: orderStatusOptions.value,
  },
  {
    key: 'shipmentStatusCode',
    label: '출하상태',
    type: 'select',
    placeholder: '전체',
    options: shipmentStatusOptions.value,
  },
])

const detailSearchFields = computed<SearchFieldDef[]>(() => [
  { key: 'fromDate', label: '수주일자(부터)', type: 'date', placeholder: 'yyyy-mm-dd' },
  { key: 'toDate', label: '수주일자(까지)', type: 'date', placeholder: 'yyyy-mm-dd' },
])

// ── 납기 임박 판단 ─────────────────────────────────────────────────────────────
/** 납기일이 오늘로부터 7일 이내이고 수주가 완료(ORDER_STATUS_04)가 아닌 경우 임박으로 판단 */
function isDeliveryUrgent(row: OrderFulfillmentDto): boolean {
  if (!row.deliveryDate || row.orderStatusCode === 'ORDER_STATUS_04') return false
  const delivery = new Date(row.deliveryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = (delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= 7
}

// ── 출하 금액 집계 헬퍼 — 템플릿 내 람다 타입 추론 한계를 피하기 위해 분리
function sumPlannedAmount(sh: ShipmentDto): string {
  return sh.lines.reduce((s, l) => s + Number(l.plannedAmount), 0).toLocaleString()
}

function sumActualAmount(sh: ShipmentDto): string {
  if (!sh.lines.some((l) => l.actualAmount !== null)) return '-'
  return sh.lines.reduce((s, l) => s + Number(l.actualAmount ?? 0), 0).toLocaleString()
}

// ── 상태 레이블/배지 ──────────────────────────────────────────────────────────
function shipmentStatusLabel(code: string): string {
  return shipmentStatusOptions.value.find((o) => o.value === code)?.label ?? code
}

function shipmentStatusClass(code: string): string {
  if (code === 'SHIPMENT_STATUS_03') return 'text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full'
  if (code === 'SHIPMENT_STATUS_02') return 'text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full'
  return 'text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full'
}

function revenueStatusLabel(code: string): string {
  const map: Record<string, string> = {
    REVENUE_STATUS_01: '초안',
    REVENUE_STATUS_02: '마감',
    REVENUE_STATUS_03: '취소',
  }
  return map[code] ?? code
}

function revenueStatusClass(code: string): string {
  if (code === 'REVENUE_STATUS_02') return 'text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full'
  if (code === 'REVENUE_STATUS_03') return 'text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full'
  return 'text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full'
}

// ── 초기화 ────────────────────────────────────────────────────────────────────
onMounted(async () => {
  const { getCode } = await initialize(['ORDER_STATUS', 'SHIPMENT_STATUS'])
  const partnersRes = await partnerApi.getAll()
  partnerOptions.value = partnersRes.data.map((p: { id: number; code: string; name: string }) => ({
    value: String(p.id),
    label: `${p.code} - ${p.name}`,
  }))
  orderStatusOptions.value = getCode('ORDER_STATUS')
  shipmentStatusOptions.value = getCode('SHIPMENT_STATUS')
  await fetchData()
})
</script>
