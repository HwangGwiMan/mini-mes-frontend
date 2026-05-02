/**
 * 인증 상태 스토어.
 *
 * role은 로그인 후 useScreenInit().initialize()에서 받아 setRole()로 저장한다.
 * visibleMenus(AppSidebar)가 이 값을 구독해 메뉴 접근 권한을 필터링한다.
 *
 * @see docs/adr/010-menu-role-based-access.md
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useNotificationStore } from '@/stores/notification'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const username = ref<string | null>(localStorage.getItem('username'))
  const role = ref<string | null>(localStorage.getItem('role'))

  const isLoggedIn = computed(() => !!token.value)

  function login(accessToken: string, loginUsername: string) {
    token.value = accessToken
    username.value = loginUsername
    localStorage.setItem('token', accessToken)
    localStorage.setItem('username', loginUsername)
  }

  function setRole(userRole: string) {
    role.value = userRole
    localStorage.setItem('role', userRole)
  }

  function logout() {
    useNotificationStore().disconnectSse()
    token.value = null
    username.value = null
    role.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('role')
  }

  return { token, username, role, isLoggedIn, login, setRole, logout }
})
