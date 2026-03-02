<template>
  <div class="w-full">
    <!-- 테이블 상단 툴바 -->
    <div v-if="tableId" class="flex justify-end mb-2">
      <div class="relative" ref="panelRoot">
        <button
          @click="panelOpen = !panelOpen"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Settings2 :size="13" />
          컬럼 설정
        </button>

        <!-- 설정 패널 팝오버 -->
        <Transition name="panel">
          <div
            v-if="panelOpen"
            class="absolute right-0 top-9 z-30 w-56 bg-white border border-gray-200 rounded-xl shadow-lg"
          >
            <!-- 패널 헤더 -->
            <div class="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
              <span class="text-xs font-semibold text-gray-700">컬럼 설정</span>
              <button
                @click="handleReset"
                class="text-xs text-blue-500 hover:text-blue-700 transition-colors"
              >
                초기화
              </button>
            </div>

            <!-- 컬럼 목록 (드래그 정렬 + 표시/숨김) -->
            <ul class="py-1 max-h-72 overflow-y-auto">
              <li
                v-for="col in orderedSettableColumns"
                :key="col.id"
                draggable="true"
                @dragstart="onDragStart(col.id)"
                @dragover.prevent="onDragOver(col.id)"
                @drop.prevent="onDrop"
                @dragend="dragOverId = null"
                :class="[
                  'flex items-center gap-2 px-3 py-2 cursor-default select-none transition-colors',
                  dragOverId === col.id ? 'bg-blue-50' : 'hover:bg-gray-50',
                ]"
              >
                <!-- 드래그 핸들 -->
                <GripVertical :size="14" class="text-gray-300 cursor-grab shrink-0" />
                <!-- 표시/숨김 체크박스 -->
                <input
                  type="checkbox"
                  :id="`col-vis-${col.id}`"
                  :checked="col.getIsVisible()"
                  @change="col.getToggleVisibilityHandler()($event)"
                  class="w-3.5 h-3.5 accent-blue-600 cursor-pointer shrink-0"
                />
                <label
                  :for="`col-vis-${col.id}`"
                  class="text-xs text-gray-700 cursor-pointer flex-1 truncate"
                >
                  {{ getColumnLabel(col) }}
                </label>
              </li>
            </ul>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 테이블 -->
    <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50">
            <!-- 순번 컬럼 -->
            <th class="w-12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              #
            </th>
            <th
              v-for="header in table.getFlatHeaders()"
              :key="header.id"
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
              :class="header.column.getCanSort() ? 'cursor-pointer select-none hover:text-gray-700' : ''"
              @click="header.column.getToggleSortingHandler()?.($event)"
            >
              <div class="flex items-center gap-1">
                <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
                <span v-if="header.column.getCanSort()" class="text-gray-400">
                  <ChevronsUpDown v-if="!header.column.getIsSorted()" :size="13" />
                  <ChevronUp v-else-if="header.column.getIsSorted() === 'asc'" :size="13" class="text-blue-500" />
                  <ChevronDown v-else :size="13" class="text-blue-500" />
                </span>
              </div>
            </th>
            <th
              v-if="$slots.actions"
              class="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
            >
              작업
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <template v-if="loading">
            <tr v-for="i in 5" :key="i">
              <td :colspan="table.getFlatHeaders().length + 2" class="px-4 py-3">
                <div class="h-4 bg-gray-100 rounded animate-pulse" />
              </td>
            </tr>
          </template>
          <template v-else-if="table.getRowModel().rows.length === 0">
            <tr>
              <td
                :colspan="table.getFlatHeaders().length + 2"
                class="px-4 py-10 text-center text-sm text-gray-400"
              >
                데이터가 없습니다.
              </td>
            </tr>
          </template>
          <template v-else>
            <tr
              v-for="(row, rowIndex) in table.getRowModel().rows"
              :key="row.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="px-4 py-3 text-gray-400 text-xs">
                {{ rowIndex + 1 }}
              </td>
              <td
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                class="px-4 py-3 text-gray-700"
              >
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </td>
              <td v-if="$slots.actions" class="px-4 py-3">
                <slot name="actions" :row="row.original" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- 하단 요약 -->
    <div class="mt-3 flex items-center justify-between text-xs text-gray-400">
      <span>전체 {{ table.getRowModel().rows.length }}건</span>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, unknown>">
import {
  useVueTable,
  getCoreRowModel,
  getSortedRowModel,
  FlexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type ColumnOrderState,
  type Column,
} from '@tanstack/vue-table'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ChevronsUpDown, ChevronUp, ChevronDown, Settings2, GripVertical } from 'lucide-vue-next'
import { useColumnSettings } from '@/composables/useColumnSettings'

const props = defineProps<{
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  tableId?: string
}>()

// ── 설정 패널 열림/닫힘 ───────────────────────────────────────────
const panelOpen = ref(false)
const panelRoot = ref<HTMLElement | null>(null)

function onClickOutside(e: MouseEvent) {
  if (panelRoot.value && !panelRoot.value.contains(e.target as Node)) {
    panelOpen.value = false
  }
}
onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))

// ── localStorage 연동 ────────────────────────────────────────────
const colSettings = props.tableId ? useColumnSettings(props.tableId) : null
const savedSettings = colSettings?.load() ?? null

// ── TanStack Table 상태 ──────────────────────────────────────────
const sorting = ref<SortingState>([])
const columnVisibility = ref<VisibilityState>(savedSettings?.visibility ?? {})
const columnOrder = ref<ColumnOrderState>(savedSettings?.order ?? [])

const table = useVueTable({
  get data() { return props.data },
  get columns() { return props.columns },
  state: {
    get sorting() { return sorting.value },
    get columnVisibility() { return columnVisibility.value },
    get columnOrder() { return columnOrder.value },
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
  },
  onColumnVisibilityChange: (updater) => {
    columnVisibility.value = typeof updater === 'function'
      ? updater(columnVisibility.value)
      : updater
  },
  onColumnOrderChange: (updater) => {
    columnOrder.value = typeof updater === 'function'
      ? updater(columnOrder.value)
      : updater
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
})

// ── 설정 저장 watch ──────────────────────────────────────────────
watch([columnVisibility, columnOrder], () => {
  colSettings?.save({
    visibility: columnVisibility.value,
    order: columnOrder.value,
  })
}, { deep: true })

// ── 설정 패널용 — 순서 반영된 컬럼 목록 ─────────────────────────
const orderedSettableColumns = computed<Column<T>[]>(() => {
  const allLeaf = table.getAllLeafColumns()
  const order = columnOrder.value

  if (order.length === 0) return allLeaf

  const map = new Map(allLeaf.map((c) => [c.id, c]))
  const ordered = order.map((id) => map.get(id)).filter(Boolean) as Column<T>[]
  // order에 없는 신규 컬럼은 뒤에 추가
  const rest = allLeaf.filter((c) => !order.includes(c.id))
  return [...ordered, ...rest]
})

// ColumnDef의 header가 string인 경우 라벨로 사용
function getColumnLabel(col: Column<T>): string {
  const header = col.columnDef.header
  return typeof header === 'string' ? header : col.id
}

// ── 초기화 ───────────────────────────────────────────────────────
function handleReset() {
  colSettings?.reset()
  columnVisibility.value = {}
  columnOrder.value = []
  panelOpen.value = false
}

// ── 드래그 앤 드롭 ───────────────────────────────────────────────
const dragSourceId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

function onDragStart(id: string) {
  dragSourceId.value = id
}

function onDragOver(id: string) {
  if (dragSourceId.value !== id) {
    dragOverId.value = id
  }
}

function onDrop() {
  if (!dragSourceId.value || !dragOverId.value) return
  if (dragSourceId.value === dragOverId.value) return

  const currentOrder = orderedSettableColumns.value.map((c) => c.id)
  const fromIdx = currentOrder.indexOf(dragSourceId.value)
  const toIdx = currentOrder.indexOf(dragOverId.value)

  const newOrder = [...currentOrder]
  newOrder.splice(fromIdx, 1)
  newOrder.splice(toIdx, 0, dragSourceId.value)

  columnOrder.value = newOrder
  dragSourceId.value = null
  dragOverId.value = null
}
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: all 0.15s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
