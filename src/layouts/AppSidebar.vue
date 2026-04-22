<template>
  <aside
    :class="[
      'flex flex-col h-full bg-gray-900 text-white transition-all duration-300 ease-in-out',
      collapsed ? 'w-16' : 'w-64',
    ]"
  >
    <!-- 로고 영역 -->
    <div class="flex items-center h-16 px-4 border-b border-gray-700 shrink-0">
      <div class="flex items-center gap-3 overflow-hidden">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shrink-0">
          <span class="text-white font-bold text-sm">M</span>
        </div>
        <Transition name="fade">
          <span v-if="!collapsed" class="font-semibold text-base whitespace-nowrap">
            Mini MES
          </span>
        </Transition>
      </div>
    </div>

    <!-- 네비게이션 메뉴 -->
    <nav class="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-1 px-2">
      <template v-for="item in visibleMenus" :key="item.key">
        <!-- 단독 메뉴 (leaf) -->
        <RouterLink
          v-if="item.type === 'leaf'"
          :to="item.path"
          custom
          v-slot="{ isActive, navigate }"
        >
          <button
            @click="navigate"
            :title="collapsed ? item.label : undefined"
            :class="[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white',
            ]"
          >
            <component :is="item.icon" :size="18" class="shrink-0" />
            <Transition name="fade">
              <span v-if="!collapsed" class="whitespace-nowrap">{{ item.label }}</span>
            </Transition>
          </button>
        </RouterLink>

        <!-- 그룹 메뉴 (group) -->
        <div v-else-if="item.type === 'group' && item.children.length > 0">
          <!-- 그룹 헤더 -->
          <button
            @click="toggleGroup(item.key)"
            :title="collapsed ? item.label : undefined"
            :class="[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isGroupActive(item)
                ? 'text-blue-400'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white',
            ]"
          >
            <component :is="item.icon" :size="18" class="shrink-0" />
            <Transition name="fade">
              <div v-if="!collapsed" class="flex flex-1 items-center justify-between min-w-0">
                <span class="flex-1 text-left whitespace-nowrap">{{ item.label }}</span>
                <ChevronDown
                  :size="14"
                  :class="[
                    'transition-transform duration-200',
                    openGroups.has(item.key) ? 'rotate-180' : '',
                  ]"
                />
              </div>
            </Transition>
          </button>

          <!-- 그룹 자식 메뉴 -->
          <Transition
            @before-enter="onBeforeEnter"
            @enter="onEnter"
            @after-enter="onAfterEnter"
            @before-leave="onBeforeLeave"
            @leave="onLeave"
            @after-leave="onAfterLeave"
          >
            <div
              v-if="!collapsed && openGroups.has(item.key)"
              class="mt-1 ml-4 space-y-1 border-l border-gray-700 pl-3"
            >
              <RouterLink
                v-for="child in item.children"
                :key="child.key"
                :to="child.path"
                custom
                v-slot="{ isActive, navigate }"
              >
                <button
                  @click="navigate"
                  :class="[
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                  ]"
                >
                  <component v-if="child.icon" :is="child.icon" :size="15" class="shrink-0" />
                  <span class="whitespace-nowrap">{{ child.label }}</span>
                </button>
              </RouterLink>
            </div>
          </Transition>

          <!-- 접힌 상태에서 자식 아이콘들 tooltip 표시용 -->
          <template v-if="collapsed">
            <RouterLink
              v-for="child in item.children"
              :key="child.key"
              :to="child.path"
              custom
              v-slot="{ isActive, navigate }"
            >
              <button
                @click="navigate"
                :title="child.label"
                :class="[
                  'w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-800 hover:text-white',
                ]"
              >
                <component v-if="child.icon" :is="child.icon" :size="15" class="shrink-0" />
              </button>
            </RouterLink>
          </template>
        </div>
      </template>
    </nav>

    <!-- 접기/펼치기 버튼 -->
    <div class="shrink-0 border-t border-gray-700 p-3">
      <button
        @click="$emit('toggle')"
        class="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        :title="collapsed ? '사이드바 펼치기' : '사이드바 접기'"
      >
        <PanelLeftClose v-if="!collapsed" :size="18" />
        <PanelLeftOpen v-else :size="18" />
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useRoute } from 'vue-router'
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import { menus, type MenuGroup } from '@/config/menus'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  collapsed: boolean
}>()

defineEmits<{
  toggle: []
}>()

const route = useRoute()
const authStore = useAuthStore()

/**
 * 메뉴 항목의 roles와 현재 사용자 role을 대조한다.
 * roles 미지정이면 전체 공개. URL 직접 접근은 막지 않는다. (ADR-010)
 */
function hasAccess(roles?: string[]): boolean {
  if (!roles || roles.length === 0) return true
  return !!authStore.role && roles.includes(authStore.role)
}

const visibleMenus = computed(() =>
  menus
    .filter((item) => hasAccess(item.roles))
    .map((item) => {
      if (item.type !== 'group') return item
      return { ...item, children: item.children.filter((child) => hasAccess(child.roles)) }
    })
    .filter((item) => item.type !== 'group' || item.children.length > 0),
)

// 현재 라우트에 해당하는 그룹을 기본 열림 상태로
const initialOpenGroups = new Set<string>(
  menus
    .filter((item): item is MenuGroup => item.type === 'group')
    .filter((group) => group.children.some((child) => route.path === child.path))
    .map((group) => group.key),
)

const openGroups = ref<Set<string>>(initialOpenGroups)

function toggleGroup(key: string) {
  if (openGroups.value.has(key)) {
    openGroups.value.delete(key)
  } else {
    openGroups.value.add(key)
  }
}

function isGroupActive(item: MenuGroup): boolean {
  return item.children.some((child) => route.path.startsWith(child.path))
}

function onBeforeEnter(el: Element) {
  const e = el as HTMLElement
  e.style.maxHeight = '0'
  e.style.overflow = 'hidden'
  e.style.opacity = '0'
}

function onEnter(el: Element, done: () => void) {
  const e = el as HTMLElement
  const height = e.scrollHeight
  e.style.transition = 'max-height 0.25s ease, opacity 0.2s ease'
  requestAnimationFrame(() => {
    e.style.maxHeight = height + 'px'
    e.style.opacity = '1'
  })
  e.addEventListener('transitionend', done, { once: true })
}

function onAfterEnter(el: Element) {
  const e = el as HTMLElement
  e.style.maxHeight = ''
  e.style.overflow = ''
  e.style.opacity = ''
  e.style.transition = ''
}

function onBeforeLeave(el: Element) {
  const e = el as HTMLElement
  e.style.maxHeight = e.scrollHeight + 'px'
  e.style.overflow = 'hidden'
}

function onLeave(el: Element, done: () => void) {
  const e = el as HTMLElement
  e.style.transition = 'max-height 0.25s ease, opacity 0.2s ease'
  requestAnimationFrame(() => {
    e.style.maxHeight = '0'
    e.style.opacity = '0'
  })
  e.addEventListener('transitionend', done, { once: true })
}

function onAfterLeave(el: Element) {
  const e = el as HTMLElement
  e.style.maxHeight = ''
  e.style.overflow = ''
  e.style.opacity = ''
  e.style.transition = ''
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
