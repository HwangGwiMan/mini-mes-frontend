import api from './index'

export interface BomLineDto {
  id: number
  materialItemId: number
  materialItemCode: string
  materialItemName: string
  hasBom: boolean
  quantity: number
  unit: string
  remarks: string
  sortOrder: number
}

export interface BomDto {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  name: string  // useCrudPage 호환용 (itemName과 동일)
  version: string
  validFrom: string | null
  validTo: string | null
  activeYn: boolean
  lineCount: number
  lines: BomLineDto[]
}

export interface BomLineRequest {
  materialItemId: number
  quantity: number
  unit: string
  remarks: string
}

export interface BomCreateRequest {
  itemId: number
  version: string
  validFrom?: string | null
  validTo?: string | null
  lines: BomLineRequest[]
}

export interface BomUpdateRequest {
  validFrom?: string | null
  validTo?: string | null
  lines: BomLineRequest[]
}

export interface BomSearchParams {
  itemCode?: string
  itemName?: string
  version?: string
  activeYn?: boolean
}

export const bomApi = {
  getAll: (params?: BomSearchParams) =>
    api.get<BomDto[]>('/api/boms', { params }),

  getById: (id: number) =>
    api.get<BomDto>(`/api/boms/${id}`),

  getByItemId: (itemId: number) =>
    api.get<BomDto[]>(`/api/boms/by-item/${itemId}`),

  create: (data: BomCreateRequest) =>
    api.post<BomDto>('/api/boms', data),

  update: (id: number, data: BomUpdateRequest) =>
    api.put<BomDto>(`/api/boms/${id}`, data),

  deactivate: (id: number) =>
    api.patch<BomDto>(`/api/boms/${id}/deactivate`),

  copy: (id: number, newVersion: string) =>
    api.post<BomDto>(`/api/boms/${id}/copy`, { newVersion }),
}
