import api from './index'

export interface CommonCodeDto {
  id: number
  codeGroup: string
  code: string
  name: string
  sortOrder: number
}

export interface CommonCodeRequest {
  codeGroup: string
  name: string
  sortOrder: number
}

export interface CommonCodeSearchParams {
  codeGroup?: string
  code?: string
  name?: string
}

export const commonCodeApi = {
  getAll: (params?: CommonCodeSearchParams) =>
    api.get<CommonCodeDto[]>('/api/common-codes', { params }),

  search: (groupCode: string) =>
    api.post<CommonCodeDto[]>('/api/common-codes/search', { groupCode }),

  create: (data: CommonCodeRequest) =>
    api.post<CommonCodeDto>('/api/common-codes', data),

  update: (id: number, data: CommonCodeRequest) =>
    api.put<CommonCodeDto>(`/api/common-codes/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/common-codes/${id}`),
}
