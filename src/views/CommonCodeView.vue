<template>
  <div class="space-y-5">
    <!-- 페이지 헤더 -->
    <div>
      <h2 class="text-xl font-bold text-gray-900">공통코드 관리</h2>
      <p class="text-sm text-gray-500 mt-0.5">그룹코드와 상세코드를 관리합니다.</p>
    </div>

    <!-- 2패널 레이아웃 -->
    <div class="flex gap-5 items-start">

      <!-- ── 좌측: 그룹코드 패널 ── -->
      <div class="w-72 shrink-0 space-y-3">
        <!-- 패널 헤더 -->
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-700">그룹코드</h3>
          <button
            @click="openCreateGroup"
            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus :size="12" />
            등록
          </button>
        </div>

        <!-- 그룹 목록 -->
        <div class="space-y-1.5">
          <div
            v-if="groupsLoading"
            v-for="i in 3"
            :key="i"
            class="h-16 bg-gray-100 rounded-xl animate-pulse"
          />
          <p
            v-else-if="groups.length === 0"
            class="text-center text-sm text-gray-400 py-8 bg-white rounded-xl border border-gray-200"
          >
            등록된 그룹코드가 없습니다.
          </p>
          <div
            v-else
            v-for="group in groups"
            :key="group.id"
            @click="selectGroup(group)"
            :class="[
              'rounded-xl border p-3.5 cursor-pointer transition-all',
              selectedGroup?.id === group.id
                ? 'border-blue-400 bg-blue-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
            ]"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ group.groupCode }}</p>
                <p class="text-xs text-gray-500 mt-0.5 truncate">{{ group.groupName }}</p>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button
                  @click.stop="openEditGroup(group)"
                  class="p-1.5 text-blue-500 hover:bg-blue-100 rounded-md transition-colors"
                  title="수정"
                >
                  <Pencil :size="12" />
                </button>
                <button
                  @click.stop="groupDeleteTarget = group"
                  class="p-1.5 text-red-400 hover:bg-red-100 rounded-md transition-colors"
                  title="삭제"
                >
                  <Trash2 :size="12" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 우측: 코드 상세 패널 ── -->
      <div class="flex-1 min-w-0 space-y-3">
        <!-- 패널 헤더 -->
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-semibold text-gray-700">
              상세코드
              <span v-if="selectedGroup" class="ml-1.5 text-blue-600">
                — {{ selectedGroup.groupCode }} ({{ selectedGroup.groupName }})
              </span>
            </h3>
            <p v-if="!selectedGroup" class="text-xs text-gray-400 mt-0.5">
              좌측에서 그룹코드를 선택하세요.
            </p>
          </div>
          <button
            @click="openCreateCode"
            :disabled="!selectedGroup"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus :size="14" />
            신규 등록
          </button>
        </div>

        <!-- 코드 그리드 -->
        <DataTable :data="codes" :columns="codeColumns" :loading="codesLoading" table-id="common-code-detail">
          <template #actions="{ row }">
            <div class="flex items-center gap-1.5">
              <button
                @click="openEditCode(row)"
                class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
              >
                <Pencil :size="12" />
                수정
              </button>
              <button
                @click="codeDeleteTarget = row"
                class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
              >
                <Trash2 :size="12" />
                삭제
              </button>
            </div>
          </template>
        </DataTable>
      </div>
    </div>

    <!-- ── 그룹코드 등록/수정 모달 ── -->
    <CrudModal
      v-model="groupModalOpen"
      :title="groupEditTarget ? '그룹코드 수정' : '그룹코드 등록'"
      :fields="groupFields"
      :initial-data="groupEditTarget ? toGroupFormData(groupEditTarget) : undefined"
      :submitting="groupSubmitting"
      :error-msg="groupModalError"
      @confirm="handleSaveGroup"
    />

    <!-- ── 상세코드 등록/수정 모달 ── -->
    <CrudModal
      v-model="codeModalOpen"
      :title="codeEditTarget ? '코드 수정' : '코드 등록'"
      :fields="codeFields"
      :initial-data="codeEditTarget ? toCodeFormData(codeEditTarget) : undefined"
      :submitting="codeSubmitting"
      :error-msg="codeModalError"
      @confirm="handleSaveCode"
    />

    <!-- ── 그룹코드 삭제 확인 모달 ── -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="groupDeleteTarget"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @mousedown.self="groupDeleteTarget = null"
        >
          <div class="absolute inset-0 bg-black/40" />
          <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                <AlertTriangle :size="20" class="text-red-600" />
              </div>
              <div>
                <h3 class="text-base font-semibold text-gray-900">그룹코드 삭제</h3>
                <p class="text-sm text-gray-500 mt-0.5">하위 코드가 없어야 삭제할 수 있습니다.</p>
              </div>
            </div>
            <p class="text-sm text-gray-700 mb-6">
              <span class="font-medium">{{ groupDeleteTarget?.groupCode }}</span> 그룹을 삭제하시겠습니까?
            </p>
            <div v-if="groupDeleteError" class="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {{ groupDeleteError }}
            </div>
            <div class="flex justify-end gap-2">
              <button @click="groupDeleteTarget = null; groupDeleteError = ''" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">취소</button>
              <button @click="handleDeleteGroup" :disabled="groupSubmitting" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">삭제</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── 상세코드 삭제 확인 모달 ── -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="codeDeleteTarget"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @mousedown.self="codeDeleteTarget = null"
        >
          <div class="absolute inset-0 bg-black/40" />
          <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                <AlertTriangle :size="20" class="text-red-600" />
              </div>
              <div>
                <h3 class="text-base font-semibold text-gray-900">코드 삭제</h3>
                <p class="text-sm text-gray-500 mt-0.5">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>
            <p class="text-sm text-gray-700 mb-6">
              <span class="font-medium">{{ codeDeleteTarget?.name }}</span> 코드를 삭제하시겠습니까?
            </p>
            <div class="flex justify-end gap-2">
              <button @click="codeDeleteTarget = null" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">취소</button>
              <button @click="handleDeleteCode" :disabled="codeSubmitting" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">삭제</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-vue-next'
import { createColumnHelper } from '@tanstack/vue-table'
import DataTable from '@/components/DataTable.vue'
import CrudModal from '@/components/CrudModal.vue'
import type { FieldDef } from '@/components/CrudModal.vue'
import { codeGroupApi, type CodeGroupDto, type CodeGroupRequest } from '@/api/codeGroup'
import { commonCodeApi, type CommonCodeDto, type CommonCodeRequest } from '@/api/commonCode'
import { useScreenInit } from '@/composables/useScreenInit'
import { extractErrorMessage, extractSaveErrorMessage } from '@/types/api-error'

const { initialize } = useScreenInit()

// ── 그룹코드 패널 상태 ────────────────────────────────────────────
const groups = ref<CodeGroupDto[]>([])
const groupsLoading = ref(false)
const selectedGroup = ref<CodeGroupDto | null>(null)

const groupModalOpen = ref(false)
const groupEditTarget = ref<CodeGroupDto | null>(null)
const groupSubmitting = ref(false)
const groupModalError = ref('')
const groupDeleteTarget = ref<CodeGroupDto | null>(null)
const groupDeleteError = ref('')

// ── 상세코드 패널 상태 ────────────────────────────────────────────
const codes = ref<CommonCodeDto[]>([])
const codesLoading = ref(false)

const codeModalOpen = ref(false)
const codeEditTarget = ref<CommonCodeDto | null>(null)
const codeSubmitting = ref(false)
const codeModalError = ref('')
const codeDeleteTarget = ref<CommonCodeDto | null>(null)

// ── 그룹코드 함수 ─────────────────────────────────────────────────
async function fetchGroups() {
  groupsLoading.value = true
  try {
    const { data } = await codeGroupApi.getAll()
    groups.value = data
  } finally {
    groupsLoading.value = false
  }
}

function selectGroup(group: CodeGroupDto) {
  selectedGroup.value = group
  fetchCodes()
}

function openCreateGroup() {
  groupEditTarget.value = null
  groupModalError.value = ''
  groupModalOpen.value = true
}

function openEditGroup(group: CodeGroupDto) {
  groupEditTarget.value = group
  groupModalError.value = ''
  groupModalOpen.value = true
}

async function handleSaveGroup(formData: Record<string, string>) {
  groupSubmitting.value = true
  groupModalError.value = ''
  try {
    const payload: CodeGroupRequest = {
      groupCode: formData.groupCode ?? '',
      groupName: formData.groupName ?? '',
      sortOrder: parseInt(formData.sortOrder ?? '0') || 0,
    }
    if (groupEditTarget.value) {
      await codeGroupApi.update(groupEditTarget.value.id, payload)
    } else {
      await codeGroupApi.create(payload)
    }
    groupModalOpen.value = false
    await fetchGroups()
  } catch (err: unknown) {
    groupModalError.value = extractSaveErrorMessage(err)
  } finally {
    groupSubmitting.value = false
  }
}

async function handleDeleteGroup() {
  if (!groupDeleteTarget.value) return
  groupSubmitting.value = true
  groupDeleteError.value = ''
  try {
    await codeGroupApi.delete(groupDeleteTarget.value.id)
    if (selectedGroup.value?.id === groupDeleteTarget.value.id) {
      selectedGroup.value = null
      codes.value = []
    }
    groupDeleteTarget.value = null
    await fetchGroups()
  } catch (err: unknown) {
    groupDeleteError.value = extractErrorMessage(err, '삭제 중 오류가 발생했습니다.')
  } finally {
    groupSubmitting.value = false
  }
}

// ── 상세코드 함수 ─────────────────────────────────────────────────
async function fetchCodes() {
  if (!selectedGroup.value) return
  codesLoading.value = true
  try {
    const { data } = await commonCodeApi.getAll({ codeGroup: selectedGroup.value.groupCode })
    codes.value = data
  } finally {
    codesLoading.value = false
  }
}

function openCreateCode() {
  codeEditTarget.value = null
  codeModalError.value = ''
  codeModalOpen.value = true
}

function openEditCode(code: CommonCodeDto) {
  codeEditTarget.value = code
  codeModalError.value = ''
  codeModalOpen.value = true
}

async function handleSaveCode(formData: Record<string, string>) {
  if (!selectedGroup.value) return
  codeSubmitting.value = true
  codeModalError.value = ''
  try {
    const payload: CommonCodeRequest = {
      codeGroup: selectedGroup.value.groupCode,
      name: formData.name ?? '',
      sortOrder: parseInt(formData.sortOrder ?? '0') || 0,
    }
    if (codeEditTarget.value) {
      await commonCodeApi.update(codeEditTarget.value.id, payload)
    } else {
      await commonCodeApi.create(payload)
    }
    codeModalOpen.value = false
    await fetchCodes()
  } catch (err: unknown) {
    codeModalError.value = extractSaveErrorMessage(err)
  } finally {
    codeSubmitting.value = false
  }
}

async function handleDeleteCode() {
  if (!codeDeleteTarget.value) return
  codeSubmitting.value = true
  try {
    await commonCodeApi.delete(codeDeleteTarget.value.id)
    codeDeleteTarget.value = null
    await fetchCodes()
  } finally {
    codeSubmitting.value = false
  }
}

// ── 컬럼 및 필드 정의 ─────────────────────────────────────────────
const codeColumnHelper = createColumnHelper<CommonCodeDto>()
const codeColumns = [
  codeColumnHelper.accessor('code',      { header: '코드',     enableSorting: true }),
  codeColumnHelper.accessor('name',      { header: '코드명',   enableSorting: true }),
  codeColumnHelper.accessor('sortOrder', { header: '정렬순서', enableSorting: true }),
]

const groupFields: FieldDef[] = [
  { key: 'groupCode', label: '그룹코드', required: true,  maxlength: 50,  placeholder: 'TRADE_TYPE' },
  { key: 'groupName', label: '그룹명',   required: true,  maxlength: 100, placeholder: '거래구분' },
  { key: 'sortOrder', label: '정렬순서', type: 'number',  required: true, min: 0, placeholder: '0' },
]

const codeFields = computed<FieldDef[]>(() => {
  if (codeEditTarget.value) {
    return [
      { key: 'code',      label: '코드',     readonly: true },
      { key: 'name',      label: '코드명',   required: true, maxlength: 100, placeholder: '코드 명칭' },
      { key: 'sortOrder', label: '정렬순서', type: 'number', required: true, min: 0, placeholder: '0' },
    ]
  }
  return [
    { key: 'name',      label: '코드명',   required: true, maxlength: 100, placeholder: '코드 명칭' },
    { key: 'sortOrder', label: '정렬순서', type: 'number', required: true, min: 0, placeholder: '0' },
  ]
})

// ── 폼 초기값 변환 ────────────────────────────────────────────────
function toGroupFormData(dto: CodeGroupDto): Record<string, string> {
  return {
    groupCode: dto.groupCode,
    groupName: dto.groupName,
    sortOrder: String(dto.sortOrder),
  }
}

function toCodeFormData(dto: CommonCodeDto): Record<string, string> {
  return {
    code:      dto.code,
    name:      dto.name,
    sortOrder: String(dto.sortOrder),
  }
}

onMounted(async () => {
  await initialize()
  await fetchGroups()
})
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
