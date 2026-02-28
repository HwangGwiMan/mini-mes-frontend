<template>
  <div class="w-full">
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
} from '@tanstack/vue-table'
import { ref } from 'vue'
import { ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-vue-next'

const props = defineProps<{
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
}>()

const sorting = ref<SortingState>([])

const table = useVueTable({
  get data() { return props.data },
  get columns() { return props.columns },
  state: {
    get sorting() { return sorting.value },
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
})
</script>
