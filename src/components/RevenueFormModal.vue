<script setup lang="ts">
/**
 * 매출 생성/수정 폼 모달.
 * 생성 모드: 거래처 선택 → "품목 선택" 버튼으로 RevenueItemSelectModal 팝업 오픈
 *            → 선택된 수주 라인이 편집 가능한 라인으로 추가됨
 * 수정 모드: 기존 라인의 수량·단가·비고만 수정 가능 (거래처 변경 불가)
 */
import { ref, computed, watch, onMounted } from 'vue'
import { X, Plus, Trash2 } from 'lucide-vue-next'
import { partnerApi, type PartnerDto } from '@/api/partner'
import { employeeApi, type EmployeeDto } from '@/api/employee'
import type { RevenueDto, AvailableOrderLineDto, RevenueCreateRequest, RevenueUpdateRequest } from '@/api/revenue'
import RevenueItemSelectModal from './RevenueItemSelectModal.vue'

interface EditLine {
  id?: number              // 수정 모드에서만 존재
  salesOrderLineId: number
  salesOrderId: number
  orderNumber: string
  itemId: number
  itemCode: string
  itemName: string
  quantity: number
  unitPrice: number
  remarks: string
}

const props = defineProps<{
  modelValue: boolean
  editTarget: RevenueDto | null
  submitting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: RevenueCreateRequest | RevenueUpdateRequest]
}>()

const isEdit = computed(() => props.editTarget !== null)
const title = computed(() => isEdit.value ? '매출 수정' : '매출 등록')

// 헤더 폼
const partnerId = ref<number | null>(null)
const employeeId = ref<number | null>(null)
const revenueDate = ref('')
const remarks = ref('')

// 라인
const lines = ref<EditLine[]>([])

// 팝업
const itemSelectOpen = ref(false)

// 옵션 데이터
const partners = ref<PartnerDto[]>([])
const employees = ref<EmployeeDto[]>([])

onMounted(async () => {
  const [pRes, eRes] = await Promise.all([
    partnerApi.getAll(),
    employeeApi.getAll(),
  ])
  partners.value = pRes.data
  employees.value = eRes.data
})

// 모달 열릴 때 초기화
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    if (props.editTarget) {
      partnerId.value = props.editTarget.partnerId
      employeeId.value = props.editTarget.employeeId
      revenueDate.value = props.editTarget.revenueDate
      remarks.value = props.editTarget.remarks
      lines.value = props.editTarget.lines.map(l => ({
        id: l.id,
        salesOrderLineId: l.salesOrderLineId,
        salesOrderId: l.salesOrderId,
        orderNumber: l.orderNumber,
        itemId: l.itemId,
        itemCode: l.itemCode,
        itemName: l.itemName,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        remarks: l.remarks,
      }))
    } else {
      partnerId.value = null
      employeeId.value = null
      revenueDate.value = new Date().toISOString().slice(0, 10)
      remarks.value = ''
      lines.value = []
    }
  }
)

function onItemsSelected(selected: AvailableOrderLineDto[]) {
  // 이미 추가된 salesOrderLineId는 중복 추가하지 않음
  const existingIds = new Set(lines.value.map(l => l.salesOrderLineId))
  for (const item of selected) {
    if (!existingIds.has(item.salesOrderLineId)) {
      lines.value.push({
        salesOrderLineId: item.salesOrderLineId,
        salesOrderId: item.salesOrderId,
        orderNumber: item.orderNumber,
        itemId: item.itemId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        remarks: '',
      })
    }
  }
}

function removeLine(index: number) {
  lines.value.splice(index, 1)
}

const totalAmount = computed(() =>
  lines.value.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
)

function formatNumber(val: number) {
  return val.toLocaleString('ko-KR')
}

function handleSubmit() {
  if (!partnerId.value || !revenueDate.value || lines.value.length === 0) return

  if (isEdit.value) {
    emit('confirm', {
      employeeId: employeeId.value,
      revenueDate: revenueDate.value,
      remarks: remarks.value,
      lines: lines.value.map(l => ({
        id: l.id!,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        remarks: l.remarks,
      })),
    })
  } else {
    emit('confirm', {
      partnerId: partnerId.value,
      employeeId: employeeId.value,
      revenueDate: revenueDate.value,
      remarks: remarks.value,
      lines: lines.value.map(l => ({
        salesOrderLineId: l.salesOrderLineId,
        salesOrderId: l.salesOrderId,
        itemId: l.itemId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        remarks: l.remarks,
      })),
    })
  }
}
</script>

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
          <!-- 헤더 -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="text-base font-semibold text-gray-900">{{ title }}</h3>
            <button
              @click="$emit('update:modelValue', false)"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X :size="18" />
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="px-6 py-5 space-y-5">
            <!-- 헤더 필드 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <!-- 거래처 — 수정 모드에서는 읽기 전용 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  거래처 <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="partnerId"
                  required
                  :disabled="isEdit"
                  class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option :value="null" disabled>선택</option>
                  <option v-for="p in partners" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">담당자</label>
                <select
                  v-model="employeeId"
                  class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option :value="null">선택 안 함</option>
                  <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.name }}</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  매출일자 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="revenueDate"
                  type="date"
                  required
                  class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div class="lg:col-span-3">
                <label class="block text-sm font-medium text-gray-700 mb-1.5">비고</label>
                <input
                  v-model="remarks"
                  type="text"
                  maxlength="200"
                  placeholder="비고 사항을 입력하세요"
                  class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <!-- 매출 라인 -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-700">매출 품목</h4>
                <!-- 생성 모드에서만 품목 추가 가능 -->
                <button
                  v-if="!isEdit"
                  type="button"
                  :disabled="!partnerId"
                  @click="itemSelectOpen = true"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus :size="14" />
                  품목 선택
                </button>
              </div>

              <div v-if="lines.length === 0" class="py-6 text-center text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
                {{ !isEdit && !partnerId ? '거래처를 먼저 선택하세요' : '품목을 추가하세요' }}
              </div>

              <div v-else class="overflow-auto rounded-lg border border-gray-200">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-3 py-2 text-left text-gray-600 font-medium">수주번호</th>
                      <th class="px-3 py-2 text-left text-gray-600 font-medium">품목</th>
                      <th class="px-3 py-2 text-right text-gray-600 font-medium w-28">수량</th>
                      <th class="px-3 py-2 text-right text-gray-600 font-medium w-32">단가</th>
                      <th class="px-3 py-2 text-right text-gray-600 font-medium w-32">금액</th>
                      <th class="px-3 py-2 text-left text-gray-600 font-medium">비고</th>
                      <th v-if="!isEdit" class="px-3 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    <tr v-for="(line, idx) in lines" :key="line.salesOrderLineId">
                      <td class="px-3 py-2 text-gray-500 text-xs">{{ line.orderNumber }}</td>
                      <td class="px-3 py-2">
                        <div class="font-medium text-gray-900">{{ line.itemName }}</div>
                        <div class="text-xs text-gray-400">{{ line.itemCode }}</div>
                      </td>
                      <td class="px-3 py-2">
                        <input
                          v-model.number="line.quantity"
                          type="number"
                          min="0.0001"
                          step="0.0001"
                          required
                          class="w-full px-2 py-1 text-right rounded border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td class="px-3 py-2">
                        <input
                          v-model.number="line.unitPrice"
                          type="number"
                          min="0"
                          step="0.0001"
                          required
                          class="w-full px-2 py-1 text-right rounded border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td class="px-3 py-2 text-right text-gray-700">
                        {{ formatNumber(line.quantity * line.unitPrice) }}
                      </td>
                      <td class="px-3 py-2">
                        <input
                          v-model="line.remarks"
                          type="text"
                          maxlength="200"
                          class="w-full px-2 py-1 rounded border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td v-if="!isEdit" class="px-3 py-2">
                        <button
                          type="button"
                          @click="removeLine(idx)"
                          class="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 :size="14" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot class="bg-gray-50">
                    <tr>
                      <td :colspan="isEdit ? 4 : 4" class="px-3 py-2 text-right text-sm font-medium text-gray-600">합계</td>
                      <td class="px-3 py-2 text-right text-sm font-semibold text-blue-700">
                        {{ formatNumber(totalAmount) }}
                      </td>
                      <td :colspan="isEdit ? 1 : 2" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- 에러 메시지 -->
            <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

            <!-- 푸터 버튼 -->
            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                @click="$emit('update:modelValue', false)"
                class="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                :disabled="submitting || lines.length === 0"
                class="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {{ submitting ? '저장 중...' : '저장' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- 품목 선택 팝업 — z-index를 부모 모달보다 높게 설정 -->
  <RevenueItemSelectModal
    v-model="itemSelectOpen"
    :partner-id="partnerId"
    @confirm="onItemsSelected"
  />
</template>
