import api from './index'

export interface ProcessDto {
  id: number
  code: string
  name: string
  processTypeCode: string
  standardTime: number | null
  description: string
  sortOrder: number
}

export interface ProcessRequest {
  code: string
  name: string
  processTypeCode: string
  standardTime: number | null
  description: string
  sortOrder: number
}

export interface ProcessSearchParams {
  code?: string
  name?: string
}

export const processApi = {
  getAll: (params?: ProcessSearchParams) =>
    api.get<ProcessDto[]>('/api/processes', { params }),

  getById: (id: number) =>
    api.get<ProcessDto>(`/api/processes/${id}`),

  create: (data: ProcessRequest) =>
    api.post<ProcessDto>('/api/processes', data),

  update: (id: number, data: ProcessRequest) =>
    api.put<ProcessDto>(`/api/processes/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/processes/${id}`),
}
