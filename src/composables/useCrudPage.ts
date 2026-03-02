import { ref, reactive } from 'vue'
import type { Ref } from 'vue'

interface UseCrudPageOptions<TDto extends { id: number; name: string }, TReq> {
  fetchFn: (params?: { code?: string; name?: string }) => Promise<{ data: TDto[] }>
  createFn: (data: TReq) => Promise<unknown>
  updateFn: (id: number, data: TReq) => Promise<unknown>
  deleteFn: (id: number) => Promise<unknown>
  toPayload: (formData: Record<string, string>) => TReq
}

export function useCrudPage<TDto extends { id: number; name: string }, TReq>(
  options: UseCrudPageOptions<TDto, TReq>,
) {
  const { fetchFn, createFn, updateFn, deleteFn, toPayload } = options

  const rows = ref<TDto[]>([]) as Ref<TDto[]>
  const loading = ref(false)
  const submitting = ref(false)
  const modalOpen = ref(false)
  const modalError = ref('')
  const editTarget = ref<TDto | null>(null) as Ref<TDto | null>
  const deleteTarget = ref<TDto | null>(null) as Ref<TDto | null>
  const search = reactive({ code: '', name: '' })

  async function fetchData() {
    loading.value = true
    try {
      const { data } = await fetchFn({
        code: search.code || undefined,
        name: search.name || undefined,
      })
      rows.value = data
    } finally {
      loading.value = false
    }
  }

  function resetSearch() {
    search.code = ''
    search.name = ''
    fetchData()
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
      } else {
        await createFn(payload)
      }
      modalOpen.value = false
      await fetchData()
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string; errors?: { field: string; message: string }[] } }
      }
      const firstFieldError = e.response?.data?.errors?.[0]?.message
      modalError.value =
        firstFieldError ?? e.response?.data?.message ?? '저장 중 오류가 발생했습니다.'
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
    try {
      await deleteFn(deleteTarget.value.id)
      deleteTarget.value = null
      await fetchData()
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
    search,
    fetchData,
    resetSearch,
    openCreate,
    openEdit,
    handleSave,
    confirmDelete,
    handleDelete,
  }
}
