<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      <!-- 모달 헤더 -->
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <h3 class="text-lg font-semibold text-gray-900">
          {{ editTarget ? '라우팅 수정' : '라우팅 등록' }}
        </h3>
        <button @click="$emit('update:modelValue', false)" class="text-gray-400 hover:text-gray-600">
          <X :size="20" />
        </button>
      </div>

      <!-- 모달 본문 -->
      <div class="overflow-y-auto flex-1 px-6 py-4 space-y-5">
        <!-- 에러 메시지 -->
        <p v-if="errorMsg" class="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{{ errorMsg }}</p>

        <!-- BOM 선택 섹션 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">BOM <span class="text-red-500">*</span></label>
          <select
            v-if="!editTarget"
            v-model="form.bomId"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">BOM 선택</option>
            <option v-for="bom in boms" :key="bom.id" :value="bom.id">
              {{ bom.itemCode }} — {{ bom.itemName }} ({{ bom.bomVersion }})
            </option>
          </select>
          <!-- 수정 모드: BOM 변경 불가 -->
          <div
            v-else
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
          >
            {{ editTarget.itemCode }} — {{ editTarget.itemName }} ({{ editTarget.bomVersion }})
          </div>
        </div>

        <!-- 공정 단계 섹션 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-semibold text-gray-800">공정 단계</h4>
            <button
              @click="addStep"
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
                  <th class="px-3 py-2 text-left font-medium text-gray-600 w-10">순서</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-600 w-2/5">공정 <span class="text-red-500">*</span></th>
                  <th class="px-3 py-2 text-left font-medium text-gray-600 w-1/5">표준시간(분)</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-600">비고</th>
                  <th class="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(step, idx) in form.steps"
                  :key="idx"
                  class="border-t border-gray-100"
                >
                  <td class="px-2 py-1.5 text-center text-gray-500">{{ idx + 1 }}</td>
                  <td class="px-2 py-1.5">
                    <select
                      v-model="step.processId"
                      class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">선택</option>
                      <option v-for="p in processes" :key="p.id" :value="p.id">
                        {{ p.code }} — {{ p.name }}
                      </option>
                    </select>
                  </td>
                  <td class="px-2 py-1.5">
                    <input
                      v-model.number="step.standardTime"
                      type="number"
                      min="0"
                      placeholder="분"
                      class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td class="px-2 py-1.5">
                    <input
                      v-model="step.remarks"
                      type="text"
                      maxlength="200"
                      class="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td class="px-2 py-1.5 text-center">
                    <button @click="removeStep(idx)" type="button" class="text-red-400 hover:text-red-600">
                      <Trash2 :size="14" />
                    </button>
                  </td>
                </tr>
                <tr v-if="form.steps.length === 0">
                  <td colspan="5" class="px-3 py-4 text-center text-sm text-gray-400">
                    공정 단계가 없습니다. 행 추가 버튼을 눌러 입력하세요.
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
 * 라우팅 등록/수정 전용 모달.
 * 헤더(BOM 선택)와 공정 단계 목록을 함께 입력받는다.
 * editTarget이 있으면 수정 모드(BOM 변경 불가), 없으면 등록 모드로 동작한다.
 * 등록 모드의 BOM 목록은 활성 BOM 전체를 불러온다.
 */
import { ref, reactive, onMounted } from 'vue'
import { X, Plus, Trash2 } from 'lucide-vue-next'
import { bomApi, type BomDto } from '@/api/bom'
import { processApi, type ProcessDto } from '@/api/process'
import { routingApi, type RoutingDto } from '@/api/routing'
import { useToast } from '@/composables/useToast'

interface StepForm {
  processId: number | ''
  standardTime: number | ''
  remarks: string
}

const props = defineProps<{
  modelValue: boolean
  editTarget: RoutingDto | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'saved'): void
}>()

const { showSuccess, showError } = useToast()

const submitting = ref(false)
const errorMsg = ref('')
const boms = ref<BomDto[]>([])
const processes = ref<ProcessDto[]>([])

const form = reactive({
  bomId: '' as number | '',
  steps: [] as StepForm[],
})

function addStep() {
  form.steps.push({ processId: '', standardTime: '', remarks: '' })
}

function removeStep(idx: number) {
  form.steps.splice(idx, 1)
}

function initForm() {
  if (props.editTarget) {
    form.bomId = props.editTarget.bomId
    form.steps = props.editTarget.steps.map((s) => ({
      processId: s.processId,
      standardTime: s.standardTime ?? '',
      remarks: s.remarks ?? '',
    }))
  } else {
    form.bomId = ''
    form.steps = []
  }
}

async function submit() {
  errorMsg.value = ''

  if (!form.bomId) {
    errorMsg.value = 'BOM을 선택하세요.'
    return
  }
  if (form.steps.length === 0) {
    errorMsg.value = '공정 단계를 최소 1개 이상 입력하세요.'
    return
  }
  for (const step of form.steps) {
    if (!step.processId) {
      errorMsg.value = '공정이 선택되지 않은 행이 있습니다.'
      return
    }
  }

  submitting.value = true
  try {
    const steps = form.steps.map((s, idx) => ({
      processId: s.processId as number,
      stepOrder: idx + 1,
      standardTime: s.standardTime !== '' ? (s.standardTime as number) : null,
      remarks: s.remarks || null,
    }))

    if (props.editTarget) {
      await routingApi.update(props.editTarget.id, { steps })
      showSuccess('라우팅이 수정되었습니다.')
    } else {
      await routingApi.create({ bomId: form.bomId as number, steps })
      showSuccess('라우팅이 등록되었습니다.')
    }

    emit('saved')
    emit('update:modelValue', false)
  } catch (err: any) {
    const msg = err?.response?.data?.message ?? '라우팅 저장 중 오류가 발생했습니다.'
    errorMsg.value = msg
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  const [bomsRes, processesRes] = await Promise.all([
    bomApi.getAll({ activeYn: true }),
    processApi.getAll(),
  ])
  boms.value = bomsRes.data
  processes.value = processesRes.data
  initForm()
})
</script>
