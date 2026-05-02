<template>
  <header class="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shrink-0">
    <!-- 페이지 타이틀 / 브레드크럼 -->
    <div class="flex items-center gap-2 text-sm text-gray-500">
      <span
        v-for="(crumb, index) in breadcrumbs"
        :key="crumb.key"
        class="flex items-center gap-2"
      >
        <ChevronRight v-if="index > 0" :size="14" class="text-gray-300" />
        <RouterLink
          v-if="crumb.path && index < breadcrumbs.length - 1"
          :to="crumb.path"
          class="hover:text-gray-800 transition-colors"
        >
          {{ crumb.label }}
        </RouterLink>
        <span v-else class="text-gray-800 font-medium">{{ crumb.label }}</span>
      </span>
    </div>

    <!-- 우측 유저 영역 -->
    <div class="flex items-center gap-4">
      <!-- 알림 벨 -->
      <NotificationBell />

      <!-- 유저 드롭다운 -->
      <div class="relative" ref="userMenuRef">
        <button
          @click="userMenuOpen = !userMenuOpen"
          class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div class="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold">
            {{ userInitial }}
          </div>
          <span class="text-sm font-medium text-gray-700 hidden sm:block">
            {{ displayName }}
          </span>
          <ChevronDown :size="14" class="text-gray-400" />
        </button>

        <!-- 드롭다운 메뉴 -->
        <Transition name="dropdown">
          <div
            v-if="userMenuOpen"
            class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
          >
            <div class="px-4 py-3 border-b border-gray-100">
              <p class="text-xs text-gray-500">로그인 계정</p>
              <p class="text-sm font-medium text-gray-800 truncate">{{ displayName }}</p>
            </div>
            <div class="py-1">
              <button
                @click="handleLogout"
                class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut :size="15" />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { ChevronDown, ChevronRight, LogOut } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { menus, type MenuLeaf } from '@/config/menus'
import NotificationBell from '@/components/NotificationBell.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

const displayName = computed(() => authStore.username ?? '사용자')
const userInitial = computed(() => (authStore.username?.[0] ?? '?').toUpperCase())

// 현재 경로에 해당하는 브레드크럼 자동 생성
const breadcrumbs = computed(() => {
  const result: { key: string; label: string; path?: string }[] = []

  for (const item of menus) {
    if (item.type === 'leaf' && item.path === route.path) {
      result.push({ key: item.key, label: item.label })
      return result
    }
    if (item.type === 'group') {
      const child = item.children.find((c: MenuLeaf) => route.path.startsWith(c.path))
      if (child) {
        result.push({ key: item.key, label: item.label })
        result.push({ key: child.key, label: child.label, path: child.path })
        return result
      }
    }
  }

  return [{ key: 'home', label: '홈' }]
})

function handleLogout() {
  authStore.logout()
  router.push({ name: 'login' })
}

// 외부 클릭 시 드롭다운 닫기
function handleOutsideClick(e: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    userMenuOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', handleOutsideClick))
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
