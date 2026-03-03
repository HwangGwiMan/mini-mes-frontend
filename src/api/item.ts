import api from './index'

export interface ItemDto {
  id: number
  code: string
  name: string
  itemTypeCode: string
  unit: string
  spec: string
  description: string
  useYn: boolean
  sortOrder: number
}

export interface ItemRequest {
  code: string
  name: string
  itemTypeCode: string
  unit: string
  spec: string
  description: string
  useYn: boolean
  sortOrder: number
}

export interface ItemSearchParams {
  code?: string
  name?: string
}

export const itemApi = {
  getAll: (params?: ItemSearchParams) =>
    api.get<ItemDto[]>('/api/items', { params }),

  getById: (id: number) =>
    api.get<ItemDto>(`/api/items/${id}`),

  create: (data: ItemRequest) =>
    api.post<ItemDto>('/api/items', data),

  update: (id: number, data: ItemRequest) =>
    api.put<ItemDto>(`/api/items/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/items/${id}`),
}
