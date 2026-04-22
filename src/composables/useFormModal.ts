import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'

interface UseFormModalOptions<TDto, TReq> {
  modelValue: Ref<boolean>
  initialData: Ref<TDto | null | undefined>
  isLocked: ComputedRef<boolean>
  /** 모달이 열릴 때 폼 상태를 초기화한다. isEdit과 현재 데이터를 인자로 받는다. */
  onOpen: (isEdit: boolean, data: TDto | null) => void
  /** 유효성 검사. 통과하면 null, 실패하면 에러 메시지 문자열을 반환한다. */
  validate: () => string | null
  buildRequest: () => TReq
  onConfirm: (req: TReq) => void
}

export function useFormModal<TDto, TReq>(options: UseFormModalOptions<TDto, TReq>) {
  const internalError = ref('')
  const isEdit = computed(() => !!options.initialData.value)

  watch(options.modelValue, (open) => {
    if (!open) return
    internalError.value = ''
    options.onOpen(isEdit.value, options.initialData.value ?? null)
  })

  function handleSubmit() {
    if (options.isLocked.value) return
    const err = options.validate()
    if (err) {
      internalError.value = err
      return
    }
    internalError.value = ''
    options.onConfirm(options.buildRequest())
  }

  return { internalError, isEdit, handleSubmit }
}
