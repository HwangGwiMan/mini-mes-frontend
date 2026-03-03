<template>
  <div class="space-y-5">
    <div>
      <h2 class="text-xl font-bold text-gray-900">출하 관리</h2>
      <p class="text-sm text-gray-500 mt-0.5">출하 지시 및 출하 현황을 관리합니다. (준비 중)</p>
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
