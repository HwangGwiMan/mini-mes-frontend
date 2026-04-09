import { z } from 'zod'

const ApiFieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
})

const ApiErrorResponseSchema = z.object({
  message: z.string().optional(),
  errors: z.array(ApiFieldErrorSchema).optional(),
})

const AxiosErrorSchema = z.object({
  response: z
    .object({
      data: ApiErrorResponseSchema,
    })
    .optional(),
})

export type ApiFieldError = z.infer<typeof ApiFieldErrorSchema>
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>

/** 일반 오류 메시지 추출 (삭제·상태 변경 등 단순 요청용) */
export function extractErrorMessage(err: unknown, fallback = '오류가 발생했습니다.'): string {
  const parsed = AxiosErrorSchema.safeParse(err)
  return parsed.success ? (parsed.data.response?.data.message ?? fallback) : fallback
}

/** 필드 오류 우선, 없으면 일반 메시지 추출 (저장 요청용) */
export function extractSaveErrorMessage(err: unknown, fallback = '저장 중 오류가 발생했습니다.'): string {
  const parsed = AxiosErrorSchema.safeParse(err)
  if (!parsed.success) return fallback
  const data = parsed.data.response?.data
  return data?.errors?.[0]?.message ?? data?.message ?? fallback
}
