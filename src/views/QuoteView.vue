<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-xl font-bold text-gray-900">견적 관리</h2>
      <p class="text-sm text-gray-500 mt-0.5">견적 요청·응답 및 견적서를 관리합니다. (준비 중)</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useScreenInit } from '@/composables/useScreenInit'

const { initialize } = useScreenInit()

onMounted(async () => {
  await initialize()
})
</script>
