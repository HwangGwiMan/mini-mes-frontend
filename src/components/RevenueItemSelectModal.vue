<script setup lang="ts">
/**
 * 매출 생성 시 품목 선택 팝업.
 * 거래처 ID를 받아 해당 거래처의 완료 수주 라인 목록을 표시하고,
 * 체크박스로 다중 선택 후 확인 시 선택된 라인 배열을 emit한다.
 */
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { revenueApi, type AvailableOrderLineDto } from '@/api/revenue'

const props = defineProps<{
  modelValue: boolean
  partnerId: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [lines: AvailableOrderLineDto[]]
}>()

const loading = ref(false)
const availableLines = ref<AvailableOrderLineDto[]>([])
const selectedIds = ref<Set<number>>(new Set())

watch(
  () => [props.modelValue, props.partnerId],
  async ([open, partnerId]) => {
    if (!open || !partnerId) return
    selectedIds.value = new Set()
    loading.value = true
    try {
      const res = await revenueApi.getAvailableOrderLines(partnerId as number)
      availableLines.value = res.data
    } finally {
      loading.value = false
    }
  }
)

function toggleAll(checked: boolean) {
  if (checked) {
    selectedIds.value = new Set(availableLines.value.map(l => l.salesOrderLineId))
  } else {
    selectedIds.value = new Set()
  }
}

function toggle(id: number) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
}

function handleConfirm() {
  const selected = availableLines.value.filter(l => selectedIds.value.has(l.salesOrderLineId))
  emit('confirm', selected)
  emit('update:modelValue', false)
}

function formatNumber(val: number) {
  return val.toLocaleString('ko-KR')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        @mousedown.self="$emit('update:modelValue', false)"
      >
        <div class="absolute inset-0 bg-black/40" />

        <div class="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl">
          <!-- 헤더 -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="text-base font-semibold text-gray-900">수주 품목 선택</h3>
            <button
              @click="$emit('update:modelValue', false)"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X :size="18" />
            </button>
          </div>

          <!-- 본문 -->
          <div class="px-6 py-4">
            <p class="text-sm text-gray-500 mb-3">완료 수주 품목 중 매출에 포함할 항목을 선택하세요.</p>

            <div v-if="loading" class="py-10 text-center text-sm text-gray-400">불러오는 중...</div>

            <div v-else-if="availableLines.length === 0" class="py-10 text-center text-sm text-gray-400">
              선택 가능한 수주 품목이 없습니다.
            </div>

            <div v-else class="overflow-auto max-h-80 rounded-lg border border-gray-200">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 text-left w-10">
                      <input
                        type="checkbox"
                        :checked="selectedIds.size === availableLines.length && availableLines.length > 0"
                        :indeterminate="selectedIds.size > 0 && selectedIds.size < availableLines.length"
                        @change="toggleAll(($event.target as HTMLInputElement).checked)"
                        class="rounded"
                      />
                    </th>
                    <th class="px-3 py-2 text-left text-gray-600 font-medium">수주번호</th>
                    <th class="px-3 py-2 text-left text-gray-600 font-medium">품목코드</th>
                    <th class="px-3 py-2 text-left text-gray-600 font-medium">품목명</th>
                    <th class="px-3 py-2 text-right text-gray-600 font-medium">수량</th>
                    <th class="px-3 py-2 text-right text-gray-600 font-medium">단가</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr
                    v-for="line in availableLines"
                    :key="line.salesOrderLineId"
                    class="hover:bg-blue-50 cursor-pointer"
                    @click="toggle(line.salesOrderLineId)"
                  >
                    <td class="px-3 py-2">
                      <input
                        type="checkbox"
                        :checked="selectedIds.has(line.salesOrderLineId)"
                        @click.stop
                        @change="toggle(line.salesOrderLineId)"
                        class="rounded"
                      />
                    </td>
                    <td class="px-3 py-2 text-gray-700">{{ line.orderNumber }}</td>
                    <td class="px-3 py-2 text-gray-700">{{ line.itemCode }}</td>
                    <td class="px-3 py-2 text-gray-900 font-medium">{{ line.itemName }}</td>
                    <td class="px-3 py-2 text-right text-gray-700">{{ formatNumber(line.quantity) }}</td>
                    <td class="px-3 py-2 text-right text-gray-700">{{ formatNumber(line.unitPrice) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p v-if="availableLines.length > 0" class="mt-2 text-xs text-gray-400">
              {{ selectedIds.size }}개 선택됨
            </p>
          </div>

          <!-- 푸터 -->
          <div class="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button
              type="button"
              @click="$emit('update:modelValue', false)"
              class="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              :disabled="selectedIds.size === 0"
              @click="handleConfirm"
              class="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              확인 ({{ selectedIds.size }}개)
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
