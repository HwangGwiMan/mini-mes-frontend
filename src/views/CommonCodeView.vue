<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-bold text-gray-900">공통코드 관리</h2>
      <p class="text-sm text-gray-500 mt-1">공통코드 정보를 조회하고 등록합니다.</p>
    </div>
    <div class="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
      준비 중입니다.
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
