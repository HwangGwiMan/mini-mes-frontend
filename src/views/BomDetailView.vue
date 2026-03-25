<template>
  <div class="space-y-5">
    <!-- 로딩 중 -->
    <div v-if="loading" class="flex items-center justify-center py-20 text-gray-400 text-sm">
      불러오는 중...
    </div>

    <template v-else-if="bom">
      <!-- 헤더 -->
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-2">
            <button
              @click="router.back()"
              class="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft :size="20" />
            </button>
            <h2 class="text-xl font-bold text-gray-900">
              {{ bom.itemName }}
              <span class="ml-2 text-sm font-normal text-gray-500">{{ bom.itemCode }}</span>
            </h2>
            <span
              :class="bom.activeYn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
              class="px-2 py-0.5 rounded-full text-xs font-medium"
            >
              {{ bom.activeYn ? '활성' : '비활성' }}
            </span>
          </div>
          <p class="text-sm text-gray-500 mt-1 ml-8">
            버전: <strong>{{ bom.version }}</strong>
            <template v-if="bom.validFrom || bom.validTo">
              &nbsp;·&nbsp;유효기간: {{ bom.validFrom ?? '??' }} ~ {{ bom.validTo ?? '??' }}
            </template>
          </p>
        </div>

        <!-- 액션 버튼 -->
        <div class="flex items-center gap-2">
          <button
            @click="openEditModal"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Pencil :size="14" /> 수정
          </button>
          <button
            @click="startCopy"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Copy :size="14" /> 복사
          </button>
          <button
            v-if="bom.activeYn"
            @click="confirmDeactivate"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            비활성화
          </button>
        </div>
      </div>

      <!-- 버전 이력 (동일 품목의 다른 버전 BOM) -->
      <div v-if="versionHistory.length > 1" class="bg-gray-50 rounded-lg px-4 py-3">
        <p class="text-xs font-medium text-gray-500 mb-2">버전 이력 (동일 품목)</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="v in versionHistory"
            :key="v.id"
            @click="navigateToBom(v.id)"
            :class="v.id === bom.id
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'"
            class="px-3 py-1 text-xs font-medium rounded-full transition-colors"
          >
            {{ v.version }}
          </button>
        </div>
      </div>

      <!-- 자재 목록 테이블 -->
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div class="px-5 py-3 border-b bg-gray-50">
          <h3 class="text-sm font-semibold text-gray-700">투입 자재 목록 ({{ bom.lines.length }}건)</h3>
        </div>
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-4 py-2.5 text-left font-medium text-gray-600">자재 코드</th>
              <th class="px-4 py-2.5 text-left font-medium text-gray-600">자재명</th>
              <th class="px-4 py-2.5 text-right font-medium text-gray-600">소요량</th>
              <th class="px-4 py-2.5 text-left font-medium text-gray-600">단위</th>
              <th class="px-4 py-2.5 text-left font-medium text-gray-600">비고</th>
              <th class="px-4 py-2.5 text-center font-medium text-gray-600">하위 BOM</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="line in bom.lines"
              :key="line.id"
              class="border-b last:border-0 hover:bg-gray-50"
            >
              <td class="px-4 py-2.5 font-mono text-xs text-gray-600">{{ line.materialItemCode }}</td>
              <td class="px-4 py-2.5">{{ line.materialItemName }}</td>
              <td class="px-4 py-2.5 text-right tabular-nums">{{ line.quantity }}</td>
              <td class="px-4 py-2.5 text-gray-500">{{ line.unit || '-' }}</td>
              <td class="px-4 py-2.5 text-gray-500">{{ line.remarks || '-' }}</td>
              <td class="px-4 py-2.5 text-center">
                <!-- hasBom이 true인 자재만 [상세▶] 버튼 표시 — ADR-001 드릴다운 내비게이션 결정 -->
                <button
                  v-if="line.hasBom"
                  @click="drillDown(line.materialItemId)"
                  class="flex items-center gap-1 mx-auto px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
                >
                  상세 <ChevronRight :size="12" />
                </button>
                <span v-else class="text-gray-300 text-xs">—</span>
              </td>
            </tr>
            <tr v-if="bom.lines.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-sm text-gray-400">
                자재 목록이 없습니다.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- BOM 수정 모달 -->
    <BomFormModal
      v-if="editModalOpen"
      v-model="editModalOpen"
      :edit-target="bom"
      @saved="loadBom"
    />

    <!-- 복사 모달 -->
    <div
      v-if="copyModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 class="text-base font-semibold text-gray-900">BOM 복사</h3>
        <p class="text-sm text-gray-500">복사할 새 버전을 입력하세요.</p>
        <input
          v-model="newVersion"
          type="text"
          maxlength="20"
          placeholder="예: v2.0"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p v-if="copyError" class="text-sm text-red-600">{{ copyError }}</p>
        <div class="flex justify-end gap-2">
          <button
            @click="copyModalOpen = false"
            class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >취소</button>
          <button
            @click="executeCopy"
            :disabled="copying"
            class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {{ copying ? '복사 중...' : '복사' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 비활성화 확인 다이얼로그 -->
    <ConfirmDialog
      :open="deactivateOpen"
      title="BOM 비활성화"
      :message="`'${bom?.itemName} ${bom?.version}' BOM을 비활성화하시겠습니까?`"
      :loading="deactivating"
      @confirm="executeDeactivate"
      @cancel="deactivateOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * BOM 상세 화면 (화면 2).
 * 선택한 BOM의 헤더 정보와 투입 자재 목록을 표시한다.
 * - 동일 품목의 버전 이력 탭을 통해 버전 전환 가능
 * - 자재 중 하위 BOM이 있는 항목은 [상세▶] 버튼으로 드릴다운 가능 (ADR-001)
 * - 이동은 모두 router.push로 URL 히스토리 스택에 기록되어 브라우저 뒤로가기 지원
 */
import { ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft, Pencil, Copy, ChevronRight } from 'lucide-vue-next'
import BomFormModal from '@/components/BomFormModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { bomApi, type BomDto } from '@/api/bom'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const { showSuccess, showError } = useToast()

const bom = ref<BomDto | null>(null)
const loading = ref(false)
const versionHistory = ref<BomDto[]>([])

const editModalOpen = ref(false)
const copyModalOpen = ref(false)
const newVersion = ref('')
const copyError = ref('')
const copying = ref(false)

const deactivateOpen = ref(false)
const deactivating = ref(false)

async function loadBom() {
  const id = Number(route.params.id)
  if (!id) return
  loading.value = true
  try {
    const res = await bomApi.getById(id)
    bom.value = res.data
    // 동일 품목의 버전 이력 조회
    const historyRes = await bomApi.getByItemId(res.data.itemId)
    versionHistory.value = historyRes.data
  } catch {
    showError('BOM을 불러오는 중 오류가 발생했습니다.')
  } finally {
    loading.value = false
  }
}

/** 자재의 하위 BOM 목록에서 최신 BOM id를 찾아 해당 상세 화면으로 이동 */
async function drillDown(materialItemId: number) {
  try {
    const res = await bomApi.getByItemId(materialItemId)
    if (res.data.length === 0) {
      showError('해당 자재의 BOM을 찾을 수 없습니다.')
      return
    }
    // 활성 BOM 우선, 없으면 첫 번째
    const target = res.data.find((b) => b.activeYn) ?? res.data[0]
    navigateToBom(target.id)
  } catch {
    showError('하위 BOM을 불러오는 중 오류가 발생했습니다.')
  }
}

function navigateToBom(id: number) {
  router.push(`/bom/${id}`)
}

function openEditModal() {
  editModalOpen.value = true
}

function startCopy() {
  newVersion.value = ''
  copyError.value = ''
  copyModalOpen.value = true
}

async function executeCopy() {
  if (!newVersion.value.trim()) {
    copyError.value = '새 버전을 입력하세요.'
    return
  }
  copying.value = true
  copyError.value = ''
  try {
    const res = await bomApi.copy(bom.value!.id, newVersion.value)
    copyModalOpen.value = false
    showSuccess(`버전 '${newVersion.value}' BOM이 복사되었습니다.`)
    navigateToBom(res.data.id)
  } catch (err: any) {
    copyError.value = err?.response?.data?.message ?? '복사 중 오류가 발생했습니다.'
  } finally {
    copying.value = false
  }
}

function confirmDeactivate() {
  deactivateOpen.value = true
}

async function executeDeactivate() {
  if (!bom.value) return
  deactivating.value = true
  try {
    await bomApi.deactivate(bom.value.id)
    deactivateOpen.value = false
    showSuccess('BOM이 비활성화되었습니다.')
    await loadBom()
  } catch {
    showError('비활성화 중 오류가 발생했습니다.')
  } finally {
    deactivating.value = false
  }
}

// 같은 화면에서 다른 BOM id로 이동할 때 (드릴다운, 버전 전환) 재조회
watch(() => route.params.id, loadBom)

onMounted(loadBom)
</script>
