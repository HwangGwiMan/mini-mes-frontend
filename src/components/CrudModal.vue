<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @mousedown.self="$emit('update:modelValue', false)"
      >
        <!-- 배경 -->
        <div class="absolute inset-0 bg-black/40" />

        <!-- 모달 패널 -->
        <div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
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

          <!-- 폼 -->
          <form @submit.prevent="handleSubmit" class="px-6 py-5 space-y-4">
            <div v-for="field in fields" :key="field.key">
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                {{ field.label }}
                <span v-if="field.required" class="text-red-500 ml-0.5">*</span>
              </label>

              <!-- select 타입 -->
              <select
                v-if="field.type === 'select'"
                v-model="formData[field.key]"
                :required="field.required"
                class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
              >
                <option value="">{{ field.placeholder ?? `${field.label} 선택` }}</option>
                <option
                  v-for="opt in field.options ?? []"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>

              <!-- text / number 타입 -->
              <input
                v-else
                v-model="formData[field.key]"
                :type="field.type ?? 'text'"
                :placeholder="field.placeholder ?? `${field.label}을(를) 입력하세요`"
                :required="field.required"
                :maxlength="field.type === 'number' ? undefined : field.maxlength"
                :min="field.min"
                class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <!-- 오류 메시지 -->
            <div
              v-if="errorMsg"
              class="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600"
            >
              <AlertCircle :size="14" class="shrink-0" />
              <span>{{ errorMsg }}</span>
            </div>

            <!-- 버튼 -->
            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                @click="$emit('update:modelValue', false)"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                :disabled="submitting"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="submitting" class="flex items-center gap-1.5">
                  <Loader2 :size="14" class="animate-spin" />
                  저장 중...
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
import { ref, watch } from 'vue'
import { X, AlertCircle, Loader2 } from 'lucide-vue-next'

export interface FieldDef {
  key: string
  label: string
  type?: 'text' | 'number' | 'select'
  required?: boolean
  placeholder?: string
  maxlength?: number
  min?: number
  options?: { value: string; label: string }[]
}

const props = defineProps<{
  modelValue: boolean
  title: string
  fields: FieldDef[]
  initialData?: Record<string, string>
  submitting?: boolean
  errorMsg?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: Record<string, string>]
}>()

const formData = ref<Record<string, string>>({})

// 모달 열릴 때 초기 데이터 세팅
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      formData.value = props.fields.reduce(
        (acc, field) => {
          acc[field.key] = props.initialData?.[field.key] ?? ''
          return acc
        },
        {} as Record<string, string>,
      )
    }
  },
)

function handleSubmit() {
  emit('confirm', { ...formData.value })
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
