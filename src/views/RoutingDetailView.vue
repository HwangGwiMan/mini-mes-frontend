<template>
  <div class="space-y-5">
    <!-- 로딩 중 -->
    <div v-if="loading" class="flex items-center justify-center py-20 text-gray-400 text-sm">
      불러오는 중...
    </div>

    <template v-else-if="routing">
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
              {{ routing.itemName }}
              <span class="ml-2 text-sm font-normal text-gray-500">{{ routing.itemCode }}</span>
            </h2>
            <span
              :class="routing.activeYn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
              class="px-2 py-0.5 rounded-full text-xs font-medium"
            >
              {{ routing.activeYn ? '활성' : '비활성' }}
            </span>
          </div>
          <p class="text-sm text-gray-500 mt-1 ml-8">
            BOM 버전: <strong>{{ routing.bomVersion }}</strong>
            &nbsp;·&nbsp;
            <router-link
              :to="`/bom/${routing.bomId}`"
              class="text-blue-500 hover:text-blue-700 underline underline-offset-2"
            >
              BOM 상세 보기
            </router-link>
          </p>
        </div>

        <!-- 액션 버튼 -->
        <div class="flex items-center gap-2">
          <button
            @click="editModalOpen = true"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Pencil :size="14" /> 수정
          </button>
          <button
            v-if="routing.activeYn"
            @click="deactivateOpen = true"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            비활성화
          </button>
        </div>
      </div>

      <!-- 버전 이력 (동일 품목의 다른 BOM 라우팅) -->
      <div v-if="versionHistory.length > 1" class="bg-gray-50 rounded-lg px-4 py-3">
        <p class="text-xs font-medium text-gray-500 mb-2">버전 이력 (동일 품목)</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="v in versionHistory"
            :key="v.id"
            @click="router.push(`/routing/${v.id}`)"
            :class="v.id === routing.id
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'"
            class="px-3 py-1 text-xs font-medium rounded-full transition-colors"
          >
            {{ v.bomVersion }}
          </button>
        </div>
      </div>

      <!-- 공정 단계 테이블 -->
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div class="px-5 py-3 border-b bg-gray-50">
          <h3 class="text-sm font-semibold text-gray-700">공정 단계 ({{ routing.steps.length }}단계)</h3>
        </div>
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-4 py-2.5 text-center font-medium text-gray-600 w-16">순서</th>
              <th class="px-4 py-2.5 text-left font-medium text-gray-600">공정 코드</th>
              <th class="px-4 py-2.5 text-left font-medium text-gray-600">공정명</th>
              <th class="px-4 py-2.5 text-right font-medium text-gray-600">표준시간(분)</th>
              <th class="px-4 py-2.5 text-left font-medium text-gray-600">비고</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="step in routing.steps"
              :key="step.id"
              class="border-b last:border-0 hover:bg-gray-50"
            >
              <td class="px-4 py-2.5 text-center text-gray-500 font-medium">{{ step.stepOrder }}</td>
              <td class="px-4 py-2.5 font-mono text-xs text-gray-600">{{ step.processCode }}</td>
              <td class="px-4 py-2.5">{{ step.processName }}</td>
              <td class="px-4 py-2.5 text-right tabular-nums">
                {{ step.standardTime != null ? step.standardTime : '-' }}
              </td>
              <td class="px-4 py-2.5 text-gray-500">{{ step.remarks || '-' }}</td>
            </tr>
            <tr v-if="routing.steps.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-gray-400">
                공정 단계가 없습니다.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 라우팅 수정 모달 -->
    <RoutingFormModal
      v-if="editModalOpen"
      v-model="editModalOpen"
      :edit-target="routing"
      @saved="loadRouting"
    />

    <!-- 비활성화 확인 다이얼로그 -->
    <ConfirmDialog
      :open="deactivateOpen"
      title="라우팅 비활성화"
      :message="`'${routing?.itemName} (${routing?.bomVersion})' 라우팅을 비활성화하시겠습니까?`"
      :loading="deactivating"
      @confirm="executeDeactivate"
      @cancel="deactivateOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 라우팅 상세 화면.
 * 선택한 BOM의 공정 순서를 표시한다.
 * - 동일 품목의 버전 이력 탭을 통해 버전 전환 가능
 * - BOM 상세 링크로 연결 BOM으로 이동 가능
 * - 이동은 모두 router.push로 URL 히스토리 스택에 기록되어 브라우저 뒤로가기 지원
 */
import { ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft, Pencil } from 'lucide-vue-next'
import RoutingFormModal from '@/components/RoutingFormModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { routingApi, type RoutingDto } from '@/api/routing'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const { showSuccess, showError } = useToast()

const routing = ref<RoutingDto | null>(null)
const loading = ref(false)
const versionHistory = ref<RoutingDto[]>([])

const editModalOpen = ref(false)
const deactivateOpen = ref(false)
const deactivating = ref(false)

async function loadRouting() {
  const id = Number(route.params.id)
  if (!id) return
  loading.value = true
  try {
    const res = await routingApi.getById(id)
    routing.value = res.data
    // 동일 품목의 버전 이력 조회
    const historyRes = await routingApi.getByItemId(res.data.itemId)
    versionHistory.value = historyRes.data
  } catch {
    showError('라우팅을 불러오는 중 오류가 발생했습니다.')
  } finally {
    loading.value = false
  }
}

async function executeDeactivate() {
  if (!routing.value) return
  deactivating.value = true
  try {
    await routingApi.deactivate(routing.value.id)
    deactivateOpen.value = false
    showSuccess('라우팅이 비활성화되었습니다.')
    await loadRouting()
  } catch {
    showError('비활성화 중 오류가 발생했습니다.')
  } finally {
    deactivating.value = false
  }
}

// 버전 전환 시 재조회
watch(() => route.params.id, loadRouting)

onMounted(loadRouting)
</script>
