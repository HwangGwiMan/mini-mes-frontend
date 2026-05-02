<template>
  <div class="flex h-screen bg-gray-50 overflow-hidden">
    <!-- 사이드바 -->
    <AppSidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />

    <!-- 메인 영역 -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <!-- 헤더 -->
      <AppHeader />

      <!-- 토스트 알림 -->
      <AppToast />

      <!-- 컨텐츠 -->
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView v-slot="{ Component, route }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import AppToast from '@/components/AppToast.vue'
import { useNotificationStore } from '@/stores/notification'

const sidebarCollapsed = ref(false)
const notificationStore = useNotificationStore()

onMounted(() => {
  notificationStore.loadNotifications()
  notificationStore.connectSse()
})

onUnmounted(() => {
  notificationStore.disconnectSse()
})
</script>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition: all 0.2s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateX(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
