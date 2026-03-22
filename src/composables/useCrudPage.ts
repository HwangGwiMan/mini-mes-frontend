import { ref } from 'vue'
import type { Ref } from 'vue'
import { useToast } from '@/composables/useToast'

interface UseCrudPageOptions<TDto extends { id: number; name: string }, TReq> {
  fetchFn: () => Promise<{ data: TDto[] }>
  createFn: (data: TReq) => Promise<unknown>
  updateFn: (id: number, data: TReq) => Promise<unknown>
  deleteFn: (id: number) => Promise<unknown>
  toPayload: (formData: Record<string, string>) => TReq
}

export function useCrudPage<TDto extends { id: number; name: string }, TReq>(
  options: UseCrudPageOptions<TDto, TReq>,
) {
  const { fetchFn, createFn, updateFn, deleteFn, toPayload } = options
  const { showSuccess, showError } = useToast()

  const rows = ref<TDto[]>([]) as Ref<TDto[]>
  const loading = ref(false)
  const submitting = ref(false)
  const modalOpen = ref(false)
  const modalError = ref('')
  const editTarget = ref<TDto | null>(null) as Ref<TDto | null>
  const deleteTarget = ref<TDto | null>(null) as Ref<TDto | null>

  async function fetchData() {
    loading.value = true
    try {
      const { data } = await fetchFn()
      rows.value = data
    } finally {
      loading.value = false
    }
  }

  function openCreate() {
    editTarget.value = null
    modalError.value = ''
    modalOpen.value = true
  }

  function openEdit(row: TDto) {
    editTarget.value = row
    modalError.value = ''
    modalOpen.value = true
  }

  async function handleSave(formData: Record<string, string>) {
    submitting.value = true
    modalError.value = ''
    try {
      const payload = toPayload(formData)
      if (editTarget.value) {
        await updateFn(editTarget.value.id, payload)
        showSuccess(`'${editTarget.value.name}' 이(가) 수정되었습니다.`)
      } else {
        await createFn(payload)
        showSuccess('등록되었습니다.')
      }
      modalOpen.value = false
      await fetchData()
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string; errors?: { field: string; message: string }[] } }
      }
      const firstFieldError = e.response?.data?.errors?.[0]?.message
      // 필드 오류는 모달 내 인라인 표시, 일반 오류는 토스트로 표시
      if (firstFieldError || e.response?.data?.message) {
        modalError.value = firstFieldError ?? e.response?.data?.message ?? '저장 중 오류가 발생했습니다.'
      } else {
        showError('저장 중 오류가 발생했습니다.')
      }
    } finally {
      submitting.value = false
    }
  }

  function confirmDelete(row: TDto) {
    deleteTarget.value = row
  }

  async function handleDelete() {
    if (!deleteTarget.value) return
    submitting.value = true
    const targetName = deleteTarget.value.name
    try {
      await deleteFn(deleteTarget.value.id)
      deleteTarget.value = null
      showSuccess(`'${targetName}' 이(가) 삭제되었습니다.`)
      await fetchData()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      showError(e.response?.data?.message ?? '삭제 중 오류가 발생했습니다.')
    } finally {
      submitting.value = false
    }
  }

  return {
    rows,
    loading,
    submitting,
    modalOpen,
    modalError,
    editTarget,
    deleteTarget,
    fetchData,
    openCreate,
    openEdit,
    handleSave,
    confirmDelete,
    handleDelete,
  }
}
