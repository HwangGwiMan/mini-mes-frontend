<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-bold text-gray-900">대시보드</h2>
      <p class="text-sm text-gray-500 mt-1">Mini MES 현황을 확인합니다.</p>
    </div>

    <!-- 요약 카드 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="card in summaryCards"
        :key="card.key"
        class="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
      >
        <div :class="['flex items-center justify-center w-12 h-12 rounded-xl', card.bg]">
          <component :is="card.icon" :size="22" :class="card.color" />
        </div>
        <div>
          <p class="text-sm text-gray-500">{{ card.label }}</p>
          <p class="text-2xl font-bold text-gray-900 mt-0.5">{{ card.value }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Users, Package, ListOrdered } from 'lucide-vue-next'

const summaryCards = [
  { key: 'partner', label: '거래처', value: '-', icon: Users, bg: 'bg-blue-50', color: 'text-blue-600' },
  { key: 'item', label: '품목', value: '-', icon: Package, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  { key: 'common-code', label: '공통코드', value: '-', icon: ListOrdered, bg: 'bg-purple-50', color: 'text-purple-600' },
]
</script>
