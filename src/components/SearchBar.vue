<template>
  <div class="bg-white rounded-xl border border-gray-200 p-4">
    <div class="flex flex-wrap items-end gap-3">
      <div
        v-for="field in fields"
        :key="field.key"
        class="flex flex-col gap-1.5 min-w-36"
      >
        <label class="text-xs font-medium text-gray-600">{{ field.label }}</label>
        <select
          v-if="field.type === 'select' && field.options"
          :value="modelValue[field.key]"
          @change="onInput(field.key, ($event.target as HTMLSelectElement).value)"
          class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-36"
        >
          <option value="">{{ field.placeholder ?? '전체' }}</option>
          <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <input
          v-else
          :value="modelValue[field.key]"
          @input="onInput(field.key, ($event.target as HTMLInputElement).value)"
          :type="field.type === 'date' ? 'date' : 'text'"
          :placeholder="field.placeholder ?? (field.type === 'date' ? 'yyyy-mm-dd' : `${field.label} 검색`)"
          class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          @keyup.enter="$emit('search')"
        />
      </div>

      <div class="flex gap-2">
        <button
          @click="$emit('search')"
          class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Search :size="14" />
          검색
        </button>
        <button
          @click="$emit('reset')"
          class="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          초기화
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next'

export interface SearchFieldDef {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'select' | 'date'
  options?: { value: string; label: string }[]
}

const props = defineProps<{
  modelValue: Record<string, string>
  fields: SearchFieldDef[]
}>()

defineEmits<{
  search: []
  reset: []
}>()

// reactive 객체의 프로퍼티를 직접 변경하여 반응성 유지
function onInput(key: string, value: string) {
  props.modelValue[key] = value
}
</script>
