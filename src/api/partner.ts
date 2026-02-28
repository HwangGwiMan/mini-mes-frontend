import api from './index'

export interface PartnerDto {
  id: number
  code: string
  name: string
}

export interface PartnerRequest {
  code: string
  name: string
}

export interface PartnerSearchParams {
  code?: string
  name?: string
}

export const partnerApi = {
  getAll: (params?: PartnerSearchParams) =>
    api.get<PartnerDto[]>('/api/partners', { params }),

  getById: (id: number) =>
    api.get<PartnerDto>(`/api/partners/${id}`),

  create: (data: PartnerRequest) =>
    api.post<PartnerDto>('/api/partners', data),

  update: (id: number, data: PartnerRequest) =>
    api.put<PartnerDto>(`/api/partners/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/partners/${id}`),
}
