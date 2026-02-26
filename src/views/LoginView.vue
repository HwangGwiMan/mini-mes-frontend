<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="w-full max-w-sm">
      <!-- 로고 -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-4">
          <span class="text-white font-bold text-xl">M</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Mini MES</h1>
        <p class="text-sm text-gray-500 mt-1">제조 실행 시스템</p>
      </div>

      <!-- 로그인 폼 -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 class="text-lg font-semibold text-gray-800 mb-6">로그인</h2>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">아이디</label>
            <input
              v-model="form.username"
              type="text"
              placeholder="아이디를 입력하세요"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              autocomplete="username"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
            <input
              v-model="form.password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              class="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              autocomplete="current-password"
            />
          </div>

          <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="loading">로그인 중...</span>
            <span v-else>로그인</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  errorMsg.value = ''
  loading.value = true
  try {
    const { data } = await api.post('/api/auth/login', {
      username: form.username,
      password: form.password,
    })
    authStore.setToken(data.token)
    router.push({ name: 'dashboard' })
  } catch {
    errorMsg.value = '아이디 또는 비밀번호가 올바르지 않습니다.'
  } finally {
    loading.value = false
  }
}
</script>
