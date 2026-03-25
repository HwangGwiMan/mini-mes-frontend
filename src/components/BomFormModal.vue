<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      <!-- 모달 헤더 -->
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <h3 class="text-lg font-semibold text-gray-900">
          {{ editTarget ? 'BOM 수정' : 'BOM 등록' }}
        </h3>
        <button @click="$emit('update:modelValue', false)" class="text-gray-400 hover:text-gray-600">
          <X :size="20" />
        </button>
      </div>

      <!-- 모달 본문 -->
      <div class="overflow-y-auto flex-1 px-6 py-4 space-y-5">
        <!-- 에러 메시지 -->
        <p v-if="errorMsg" class="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{{ errorMsg }}</p>

        <!-- 헤더 섹션 -->
        <div class="grid grid-cols-2 gap-4">
          <!-- 완제품 품목 (신규 등록 시만 선택 가능) -->
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">완제품 품목 <span class="text-red-500">*</span></label>
            <select
              v-model="form.itemId"
              :disabled="!!editTarget"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">품목 선택</option>
              <option v-for="item in items" :key="item.id" :value="item.id">
                {{ item.code }} — {{ item.name }}
              </option>
            </select>
          </div>

          <!-- 버전 (신규 등록 시만 입력 가능) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">버전 <span class="text-red-500">*</span></label>
            <input
              v-model="form.version"
              :disabled="!!editTarget"
              type="text"
              maxlength="20"
              placeholder="예: v1.0"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <!-- 유효기간 시작 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">유효기간 시작</label>
            <input
              v-model="form.validFrom"
              type="date"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- 유효기간 종료 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">유효기간 종료</label>
            <input
              v-model="form.validTo"
              type="date"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <!-- 자재 라인 섹션 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-semibold text-gray-800">자재 목록</h4>
            <button
              @click="addLine"
              type="button"
              class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus :size="13" /> 행 추가
            </button>
          </div>

          <div class="border border-gray-200 rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-2 text-left font-medium text-gray-600 w-2/5">자재 품목 <span class="text-red-500">*</span></th>
                  <th class="px-3 py-2 text-left font-medium text-gray-600 w-1/6">소요량 <span class="text-red-500">*</span></th>
                  <th class="px-3 py-2 text-left font-medium text-gray-600 w-1/6">단위</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-600">비고</th>
                  <th class="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(line, idx) in form.lines"
                  :key="idx"
                  class="border-t border-gray-100"
                >
                  <td class="px-2 py-1.5">
                    <select
                      v-model="line.materialItemId"
                      class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">선택</option>
                      <option v-for="item in items" :key="item.id" :value="item.id">
                        {{ item.code }} — {{ item.name }}
                      </option>
                    </select>
                  </td>
                  <td class="px-2 py-1.5">
                    <input
                      v-model.number="line.quantity"
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td class="px-2 py-1.5">
                    <input
                      v-model="line.unit"
                      type="text"
                      maxlength="20"
                      placeholder="EA"
                      class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td class="px-2 py-1.5">
                    <input
                      v-model="line.remarks"
                      type="text"
                      maxlength="200"
                      class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td class="px-2 py-1.5 text-center">
                    <button @click="removeLine(idx)" type="button" class="text-red-400 hover:text-red-600">
                      <Trash2 :size="14" />
                    </button>
                  </td>
                </tr>
                <tr v-if="form.lines.length === 0">
                  <td colspan="5" class="px-3 py-4 text-center text-sm text-gray-400">
                    자재 라인이 없습니다. 행 추가 버튼을 눌러 입력하세요.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 모달 푸터 -->
      <div class="flex justify-end gap-2 px-6 py-4 border-t">
        <button
          @click="$emit('update:modelValue', false)"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          취소
        </button>
        <button
          @click="submit"
          :disabled="submitting"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {{ submitting ? '저장 중...' : '저장' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * BOM 등록/수정 전용 모달.
 * 헤더(완제품, 버전, 유효기간)와 자재 라인 목록을 함께 입력받는다.
 * editTarget이 있으면 수정 모드(완제품·버전 변경 불가), 없으면 등록 모드로 동작한다.
 */
import { ref, reactive, onMounted } from 'vue'
import { X, Plus, Trash2 } from 'lucide-vue-next'
import { itemApi, type ItemDto } from '@/api/item'
import { bomApi, type BomDto } from '@/api/bom'
import { useToast } from '@/composables/useToast'

interface LineForm {
  materialItemId: number | ''
  quantity: number | ''
  unit: string
  remarks: string
}

const props = defineProps<{
  modelValue: boolean
  editTarget: BomDto | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'saved'): void
}>()

const { showSuccess, showError } = useToast()

const submitting = ref(false)
const errorMsg = ref('')
const items = ref<ItemDto[]>([])

const form = reactive({
  itemId: '' as number | '',
  version: '',
  validFrom: '',
  validTo: '',
  lines: [] as LineForm[],
})

function addLine() {
  form.lines.push({ materialItemId: '', quantity: '', unit: '', remarks: '' })
}

function removeLine(idx: number) {
  form.lines.splice(idx, 1)
}

function initForm() {
  if (props.editTarget) {
    form.itemId = props.editTarget.itemId
    form.version = props.editTarget.version
    form.validFrom = props.editTarget.validFrom ?? ''
    form.validTo = props.editTarget.validTo ?? ''
    form.lines = props.editTarget.lines.map((l) => ({
      materialItemId: l.materialItemId,
      quantity: l.quantity,
      unit: l.unit ?? '',
      remarks: l.remarks ?? '',
    }))
  } else {
    form.itemId = ''
    form.version = ''
    form.validFrom = ''
    form.validTo = ''
    form.lines = []
  }
}

async function submit() {
  errorMsg.value = ''

  if (!form.itemId) {
    errorMsg.value = '완제품 품목을 선택하세요.'
    return
  }
  if (!form.version.trim()) {
    errorMsg.value = '버전을 입력하세요.'
    return
  }
  if (form.lines.length === 0) {
    errorMsg.value = '자재 라인을 최소 1개 이상 입력하세요.'
    return
  }
  for (const line of form.lines) {
    if (!line.materialItemId) {
      errorMsg.value = '자재 품목이 선택되지 않은 행이 있습니다.'
      return
    }
    if (!line.quantity || line.quantity <= 0) {
      errorMsg.value = '소요량은 0보다 커야 합니다.'
      return
    }
  }

  submitting.value = true
  try {
    const lines = form.lines.map((l) => ({
      materialItemId: l.materialItemId as number,
      quantity: l.quantity as number,
      unit: l.unit,
      remarks: l.remarks,
    }))

    if (props.editTarget) {
      await bomApi.update(props.editTarget.id, {
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
        lines,
      })
      showSuccess('BOM이 수정되었습니다.')
    } else {
      await bomApi.create({
        itemId: form.itemId as number,
        version: form.version,
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
        lines,
      })
      showSuccess('BOM이 등록되었습니다.')
    }

    emit('saved')
    emit('update:modelValue', false)
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? 'BOM 저장 중 오류가 발생했습니다.'
    errorMsg.value = msg
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  const res = await itemApi.getAll()
  items.value = res.data
  initForm()
})
</script>
