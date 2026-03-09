<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        @mousedown.self="$emit('update:modelValue', false)"
      >
        <div class="absolute inset-0 bg-black/40" />

        <div class="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl my-8">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div class="flex items-center gap-3">
              <h3 class="text-base font-semibold text-gray-900">{{ title }}</h3>
              <span
                v-if="isSubmitted"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
              >
                제출됨 — 수정 불가
              </span>
            </div>
            <button
              @click="$emit('update:modelValue', false)"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X :size="18" />
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="px-6 py-5 space-y-5">
            <!-- 헤더 영역 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div v-if="isEdit" class="lg:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1.5">견적번호</label>
                <div class="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
                  {{ header.quoteNumber }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">견적일자 <span class="text-red-500">*</span></label>
                <input
                  v-model="header.quoteDate"
                  type="date"
                  required
                  :disabled="isSubmitted"
                  class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">유효기간</label>
                <input
                  v-model="header.validUntil"
                  type="date"
                  :disabled="isSubmitted"
                  class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">거래처 <span class="text-red-500">*</span></label>
                <select
                  v-model="header.partnerId"
                  required
                  :disabled="isSubmitted"
                  class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="">거래처 선택</option>
                  <option v-for="p in partnerOptions" :key="p.value" :value="Number(p.value)">{{ p.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">담당자</label>
                <select
                  v-model="header.employeeId"
                  :disabled="isSubmitted"
                  class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="">담당자 선택</option>
                  <option v-for="e in employeeOptions" :key="e.value" :value="Number(e.value)">{{ e.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">결재자 <span class="text-red-500">*</span></label>
                <select
                  v-model="header.approverId"
                  required
                  :disabled="isSubmitted"
                  class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="">결재자 선택</option>
                  <option v-for="e in employeeOptions" :key="e.value" :value="Number(e.value)">{{ e.label }}</option>
                </select>
              </div>
              <div class="sm:col-span-2 lg:col-span-3">
                <label class="block text-sm font-medium text-gray-700 mb-1.5">비고</label>
                <input
                  v-model="header.remarks"
                  type="text"
                  maxlength="200"
                  placeholder="비고 입력"
                  :disabled="isSubmitted"
                  class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <!-- 라인 영역 -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-gray-700">견적 상세</label>
                <button
                  v-if="!isSubmitted"
                  type="button"
                  @click="addLine"
                  class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus :size="12" /> 행 추가
                </button>
              </div>
              <div class="overflow-x-auto rounded-lg border border-gray-200">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 text-gray-700">
                    <tr>
                      <th class="px-3 py-2 text-left font-medium">품목<span class="text-red-500 ml-0.5">*</span></th>
                      <th class="px-3 py-2 text-right font-medium w-24">수량<span class="text-red-500 ml-0.5">*</span></th>
                      <th class="px-3 py-2 text-right font-medium w-24">단가<span class="text-red-500 ml-0.5">*</span></th>
                      <th class="px-3 py-2 text-right font-medium w-24">금액</th>
                      <th class="px-3 py-2 text-left font-medium w-32">납기요청일</th>
                      <th class="px-3 py-2 text-left font-medium">비고</th>
                      <th v-if="!isSubmitted" class="px-3 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    <tr v-for="(line, idx) in lines" :key="idx" class="hover:bg-gray-50">
                      <td class="px-3 py-2">
                        <select
                          v-model="line.itemId"
                          required
                          :disabled="isSubmitted"
                          class="w-full min-w-[140px] px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          <option :value="0">품목 선택</option>
                          <option v-for="i in itemOptions" :key="i.value" :value="Number(i.value)">{{ i.label }}</option>
                        </select>
                      </td>
                      <td class="px-3 py-2">
                        <input
                          v-model.number="line.quantity"
                          type="number"
                          min="1"
                          step="1"
                          required
                          :disabled="isSubmitted"
                          class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                          @input="updateAmount(idx)"
                        />
                      </td>
                      <td class="px-3 py-2">
                        <input
                          v-model.number="line.unitPrice"
                          type="number"
                          min="0"
                          step="1"
                          required
                          :disabled="isSubmitted"
                          class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                          @input="updateAmount(idx)"
                        />
                      </td>
                      <td class="px-3 py-2 text-right text-gray-600 tabular-nums">{{ formatAmount(lineAmount(idx)) }}</td>
                      <td class="px-3 py-2">
                        <input
                          v-model="line.deliveryRequestDate"
                          type="date"
                          :disabled="isSubmitted"
                          class="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                      <td class="px-3 py-2">
                        <input
                          v-model="line.remarks"
                          type="text"
                          :disabled="isSubmitted"
                          class="w-full min-w-[80px] px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                      <td v-if="!isSubmitted" class="px-3 py-2">
                        <button
                          type="button"
                          @click="removeLine(idx)"
                          class="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="삭제"
                        >
                          <Trash2 :size="14" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-if="lines.length === 0" class="text-sm text-gray-500 py-3 text-center">견적 상세를 추가하세요.</p>
            </div>

            <div
              v-if="errorMsg"
              class="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600"
            >
              <AlertCircle :size="14" class="shrink-0" />
              <span>{{ errorMsg }}</span>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                @click="$emit('update:modelValue', false)"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {{ isSubmitted ? '닫기' : '취소' }}
              </button>
              <button
                v-if="!isSubmitted"
                type="submit"
                :disabled="submitting || lines.length === 0"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="submitting" class="flex items-center gap-1.5">
                  <Loader2 :size="14" class="animate-spin" /> 저장 중...
                </span>
                <span v-else>저장</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, Plus, Trash2, AlertCircle, Loader2 } from 'lucide-vue-next'
import type { QuoteRequest, QuoteLineRequest, QuoteDto } from '@/api/quote'

interface LineForm {
  itemId: number
  quantity: number
  unitPrice: number
  deliveryRequestDate: string
  remarks: string
}

const props = defineProps<{
  modelValue: boolean
  title: string
  initialData?: QuoteDto | null
  partnerOptions: { value: string; label: string }[]
  employeeOptions: { value: string; label: string }[]
  itemOptions: { value: string; label: string }[]
  submitting?: boolean
  errorMsg?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: QuoteRequest]
}>()

const isEdit = ref(false)
const isSubmitted = computed(() => header.value.statusCode === 'QUOTE_STATUS_02')

const header = ref({
  quoteNumber: '',
  quoteDate: '',
  validUntil: '',
  partnerId: 0,
  employeeId: 0 as number | 0,
  approverId: 0 as number | 0,
  statusCode: '',
  remarks: '',
})
const lines = ref<LineForm[]>([])

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      isEdit.value = !!props.initialData
      if (props.initialData) {
        header.value = {
          quoteNumber: props.initialData.quoteNumber,
          quoteDate: props.initialData.quoteDate,
          validUntil: props.initialData.validUntil ?? '',
          partnerId: props.initialData.partnerId,
          employeeId: props.initialData.employeeId ?? 0,
          approverId: props.initialData.approverId ?? 0,
          statusCode: props.initialData.statusCode ?? '',
          remarks: props.initialData.remarks ?? '',
        }
        lines.value = props.initialData.lines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          deliveryRequestDate: l.deliveryRequestDate ?? '',
          remarks: l.remarks ?? '',
        }))
      } else {
        const today = new Date().toISOString().slice(0, 10)
        header.value = {
          quoteNumber: '',
          quoteDate: today,
          validUntil: '',
          partnerId: 0,
          employeeId: 0,
          approverId: 0,
          statusCode: '',
          remarks: '',
        }
        lines.value = [{ itemId: 0, quantity: 0, unitPrice: 0, deliveryRequestDate: '', remarks: '' }]
      }
    }
  },
)

function addLine() {
  lines.value.push({ itemId: 0, quantity: 0, unitPrice: 0, deliveryRequestDate: '', remarks: '' })
}

function removeLine(idx: number) {
  lines.value.splice(idx, 1)
}

function updateAmount(_idx: number) {
  // reactive - no need to manually update
}

function lineAmount(idx: number): number {
  const line = lines.value[idx]
  if (!line) return 0
  return (line.quantity || 0) * (line.unitPrice || 0)
}

function formatAmount(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString('ko-KR') : '-'
}

function handleSubmit() {
  if (isSubmitted.value) return
  const validLines = lines.value.filter((l) => l.itemId > 0 && (l.quantity || 0) > 0)
  if (validLines.length === 0) return

  const lineRequests: QuoteLineRequest[] = validLines.map((l, i) => ({
    itemId: l.itemId,
    quantity: l.quantity || 0,
    unitPrice: l.unitPrice || 0,
    deliveryRequestDate: l.deliveryRequestDate || null,
    remarks: l.remarks || '',
    sortOrder: i,
  }))

  const payload: QuoteRequest = {
    quoteDate: header.value.quoteDate,
    validUntil: header.value.validUntil || null,
    partnerId: header.value.partnerId,
    employeeId: header.value.employeeId || null,
    approverId: header.value.approverId,
    remarks: header.value.remarks || '',
    lines: lineRequests,
  }
  emit('confirm', payload)
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
