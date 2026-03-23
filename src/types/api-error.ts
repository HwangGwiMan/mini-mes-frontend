export interface ApiFieldError {
  field: string
  message: string
}

export interface ApiErrorResponse {
  message?: string
  errors?: ApiFieldError[]
}

/** 일반 오류 메시지 추출 (삭제·상태 변경 등 단순 요청용) */
export function extractErrorMessage(err: unknown, fallback = '오류가 발생했습니다.'): string {
  const e = err as { response?: { data?: ApiErrorResponse } }
  return e.response?.data?.message ?? fallback
}

/** 필드 오류 우선, 없으면 일반 메시지 추출 (저장 요청용) */
export function extractSaveErrorMessage(err: unknown, fallback = '저장 중 오류가 발생했습니다.'): string {
  const e = err as { response?: { data?: ApiErrorResponse } }
  return e.response?.data?.errors?.[0]?.message ?? e.response?.data?.message ?? fallback
}
