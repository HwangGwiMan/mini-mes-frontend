/**
 * 출하 관리 화면.
 * 출하 계획 탭(출하대기/출하중)과 출하 결과 탭(출하완료)으로 구분하여 표시한다.
 * 출하는 수주 등록 시 자동 생성되므로 신규 등록 버튼은 없다.
 * 출하 계획 탭에서는 계획 수정과 출하 완료 처리, 삭제(대기 상태만)를 지원한다.
 */
<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-xl font-bold text-gray-900">출하 관리</h2>
      <p class="text-sm text-gray-500 mt-0.5">출하 계획을 관리하고 출하 완료를 처리합니다.</p>
    </div>

    <div class="flex border-b border-gray-200">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        :class="['px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px', activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700']"
      >{{ tab.label }}</button>
    </div>

    <SearchBar :model-value="search" :fields="searchFields" @search="fetchData" @reset="resetSearch" />

    <template v-if="activeTab === 'plan'">
      <DataTable :data="rows" :columns="planColumns" :loading="loading" table-id="shipment-plan">
        <template #actions="{ row }">
          <button @click="openEdit(row)" class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap">
            <Pencil :size="12" />수정
          </button>
          <button @click="openComplete(row)" class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap">
            <PackageCheck :size="12" />출하완료
          </button>
          <button v-if="row.statusCode === 'SHIPMENT_STATUS_01'" @click="confirmDelete(row)" class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap">
            <Trash2 :size="12" />삭제
          </button>
        </template>
      </DataTable>
    </template>

    <template v-else>
      <DataTable :data="rows" :columns="resultColumns" :loading="loading" table-id="shipment-result">
        <template #actions="{ row }">
          <button @click="openDetail(row)" class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            <Eye :size="12" />상세
          </button>
        </template>
      </DataTable>
    </template>

    <ShipmentFormModal
      v-model="editModalOpen"
      :initial-data="editTarget"
      :employee-options="employeeOptions"
      :status-options="planStatusOptions"
      :submitting="submitting"
      :error-msg="modalError"
      @confirm="handleEditConfirm"
    />

    <ShipmentCompleteModal
      v-model="completeModalOpen"
      :initial-data="completeTarget"
      :submitting="submitting"
      :error-msg="completeError"
      @confirm="handleCompleteConfirm"
    />

    <!-- 출하 결과 상세: ShipmentFormModal을 읽기 전용 용도로 재사용 -->
    <ShipmentFormModal
      v-model="detailModalOpen"
      :initial-data="detailTarget"
      :employee-options="employeeOptions"
      :status-options="allStatusOptions"
      :submitting="false"
      @confirm="() => {}"
    />

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/40" @click="deleteTarget = null" />
          <div class="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h4 class="text-base font-semibold text-gray-900">출하 삭제</h4>
            <p class="text-sm text-gray-600">
              <span class="font-medium">{{ deleteTarget.shipmentNumber }}</span>을(를) 삭제하시겠습니까?
            </p>
            <div class="flex justify-end gap-2">
              <button @click="deleteTarget = null" class="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button @click="handleDelete" :disabled="submitting" class="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">삭제</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { Pencil, Trash2, PackageCheck, Eye } from 'lucide-vue-next'
import DataTable from '@/components/DataTable.vue'
import SearchBar from '@/components/SearchBar.vue'
import ShipmentFormModal from '@/components/ShipmentFormModal.vue'
import ShipmentCompleteModal from '@/components/ShipmentCompleteModal.vue'
import { shipmentApi, type ShipmentDto, type ShipmentUpdateRequest, type ShipmentCompleteRequest } from '@/api/shipment'
import { commonCodeApi } from '@/api/commonCode'
import { employeeApi } from '@/api/employee'
import { useScreenInit } from '@/composables/useScreenInit'
import { useToast } from '@/composables/useToast'

const { initialize } = useScreenInit()
const { showSuccess, showError } = useToast()
const tabs = [{ key: 'plan', label: '출하 계획' }, { key: 'result', label: '출하 결과' }]
const activeTab = ref<'plan' | 'result'>('plan')
const rows = ref<ShipmentDto[]>([])
const loading = ref(false)
const submitting = ref(false)
const modalError = ref('')
const completeError = ref('')
const editModalOpen = ref(false)
const editTarget = ref<ShipmentDto | null>(null)
const completeModalOpen = ref(false)
const completeTarget = ref<ShipmentDto | null>(null)
const detailModalOpen = ref(false)
const detailTarget = ref<ShipmentDto | null>(null)
const deleteTarget = ref<ShipmentDto | null>(null)
const employeeOptions = ref<{ value: string; label: string }[]>([])
const shipmentStatusOptions = ref<{ value: string; label: string }[]>([])

// 출하 계획 탭에서 상태 변경 시 출하완료로 직접 전환하지 않도록 제한한다
const planStatusOptions = computed(() => shipmentStatusOptions.value.filter((s) => s.value !== 'SHIPMENT_STATUS_03'))
const allStatusOptions = computed(() => shipmentStatusOptions.value)
const search = reactive<Record<string, string>>({ statusCode: '', fromDate: '', toDate: '' })

// 탭 전환 시 상태 필터 초기화 후 재조회
watch(activeTab, () => { search.statusCode = ''; fetchData() })

const searchFields = computed(() => [
  { key: 'statusCode', label: '상태', type: 'select' as const, options: activeTab.value === 'plan' ? planStatusOptions.value : [{ value: 'SHIPMENT_STATUS_03', label: '출하완료' }] },
  { key: 'fromDate', label: '등록일(부터)', type: 'date' as const },
  { key: 'toDate', label: '등록일(까지)', type: 'date' as const },
])

async function fetchData() {
  loading.value = true
  try {
    const { data } = await shipmentApi.getAll({
      statusCode: search.statusCode || undefined,
      fromDate: search.fromDate || undefined,
      toDate: search.toDate || undefined,
    })
    // 탭에 따라 클라이언트에서도 필터링하여 탭 간 데이터 혼재를 방지한다
    rows.value = activeTab.value === 'plan'
      ? data.filter((s) => s.statusCode !== 'SHIPMENT_STATUS_03')
      : data.filter((s) => s.statusCode === 'SHIPMENT_STATUS_03')
  } finally {
    loading.value = false
  }
}

function resetSearch() { search.statusCode = ''; search.fromDate = ''; search.toDate = ''; fetchData() }

async function openEdit(row: ShipmentDto) {
  const { data } = await shipmentApi.getById(row.id)
  editTarget.value = data; modalError.value = ''; editModalOpen.value = true
}
async function openComplete(row: ShipmentDto) {
  const { data } = await shipmentApi.getById(row.id)
  completeTarget.value = data; completeError.value = ''; completeModalOpen.value = true
}
async function openDetail(row: ShipmentDto) {
  const { data } = await shipmentApi.getById(row.id)
  detailTarget.value = data; detailModalOpen.value = true
}
function confirmDelete(row: ShipmentDto) { deleteTarget.value = row }

async function handleDelete() {
  if (!deleteTarget.value) return
  submitting.value = true
  const targetNumber = deleteTarget.value.shipmentNumber
  try {
    await shipmentApi.delete(deleteTarget.value.id)
    deleteTarget.value = null
    showSuccess(`'${targetNumber}' 이(가) 삭제되었습니다.`)
    await fetchData()
  } catch (err: any) {
    showError(err.response?.data?.message ?? '삭제 중 오류가 발생했습니다.')
  } finally {
    submitting.value = false
  }
}

async function handleEditConfirm(payload: ShipmentUpdateRequest) {
  if (!editTarget.value) return
  submitting.value = true; modalError.value = ''
  try {
    await shipmentApi.update(editTarget.value.id, payload)
    editModalOpen.value = false
    showSuccess('출하 계획이 수정되었습니다.')
    await fetchData()
  } catch (err: any) {
    modalError.value = err.response?.data?.message ?? '저장 중 오류가 발생했습니다.'
  } finally {
    submitting.value = false
  }
}

async function handleCompleteConfirm(payload: ShipmentCompleteRequest) {
  if (!completeTarget.value) return
  submitting.value = true; completeError.value = ''
  try {
    await shipmentApi.complete(completeTarget.value.id, payload)
    completeModalOpen.value = false
    showSuccess('출하 완료 처리되었습니다.')
    await fetchData()
  } catch (err: any) {
    completeError.value = err.response?.data?.message ?? '출하 완료 처리 중 오류가 발생했습니다.'
  } finally {
    submitting.value = false
  }
}

const columnHelper = createColumnHelper<ShipmentDto>()
const planColumns = computed(() => [
  columnHelper.accessor('shipmentNumber', { header: '출하번호' }),
  columnHelper.accessor('salesOrderNumber', { header: '수주번호' }),
  columnHelper.accessor('partnerName', { header: '거래처' }),
  columnHelper.accessor('employeeName', { header: '담당자' }),
  columnHelper.accessor('statusCode', {
    header: '상태',
    cell: (info) => shipmentStatusOptions.value.find((o) => o.value === info.getValue())?.label ?? info.getValue(),
  }),
])
const resultColumns = computed(() => [
  columnHelper.accessor('shipmentNumber', { header: '출하번호' }),
  columnHelper.accessor('salesOrderNumber', { header: '수주번호' }),
  columnHelper.accessor('partnerName', { header: '거래처' }),
  columnHelper.accessor('shipmentDate', { header: '출하일자' }),
  columnHelper.accessor('employeeName', { header: '담당자' }),
])

onMounted(async () => {
  await initialize()
  const [empRes, statusRes] = await Promise.all([
    employeeApi.getAll(),
    commonCodeApi.search('SHIPMENT_STATUS'),
  ])
  employeeOptions.value = (empRes.data as any[]).map((e) => ({ value: String(e.id), label: e.code + ' ' + e.name }))
  shipmentStatusOptions.value = (statusRes.data as any[]).map((c) => ({ value: c.code, label: c.name }))
  await fetchData()
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
