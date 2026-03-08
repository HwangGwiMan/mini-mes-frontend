import api from './index'

export interface ItemPriceDto {
  id: number
  name: string       // = itemName (useCrudPage TDto 호환)
  itemId: number
  itemCode: string
  itemName: string
  unitPrice: number
  remarks: string | null
  updatedAt: string | null
}

export interface ItemPriceRequest {
  itemId: number
  unitPrice: number
  remarks?: string | null
}

export interface ItemPriceSearchParams {
  itemCode?: string
  itemName?: string
}

export const priceApi = {
  getAll: (params?: ItemPriceSearchParams) =>
    api.get<ItemPriceDto[]>('/api/item-prices', { params }),

  getById: (id: number) =>
    api.get<ItemPriceDto>(`/api/item-prices/${id}`),

  create: (data: ItemPriceRequest) =>
    api.post<ItemPriceDto>('/api/item-prices', data),

  update: (id: number, data: ItemPriceRequest) =>
    api.put<ItemPriceDto>(`/api/item-prices/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/item-prices/${id}`),
}
