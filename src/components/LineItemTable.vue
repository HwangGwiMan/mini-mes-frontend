<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <label class="block text-sm font-medium text-gray-700">{{ label }}</label>
      <button
        v-if="!locked"
        type="button"
        @click="$emit('add')"
        class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <Plus :size="12" /> 행 추가
      </button>
    </div>
    <div class="overflow-x-auto rounded-lg border border-gray-200">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-700">
          <slot name="head" />
        </thead>
        <tbody class="divide-y divide-gray-100">
          <slot name="body" />
        </tbody>
        <tfoot v-if="$slots.footer">
          <slot name="footer" />
        </tfoot>
      </table>
    </div>
    <p v-if="empty" class="text-sm text-gray-500 py-3 text-center">
      {{ emptyMessage ?? `${label}을(를) 추가하세요.` }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { Plus } from 'lucide-vue-next'

defineProps<{
  label: string
  locked?: boolean
  empty?: boolean
  emptyMessage?: string
}>()

defineEmits<{
  add: []
}>()
</script>
