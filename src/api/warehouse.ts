import api from './index'

export interface WarehouseDto {
  id: number
  code: string
  name: string
  warehouseTypeCode: string | null
  description: string | null
  useYn: boolean
  sortOrder: number
}

export interface WarehouseRequest {
  code: string
  name: string
  warehouseTypeCode: string | null
  description: string | null
  useYn: boolean
  sortOrder: number
}

export interface WarehouseSearchParams {
  code?: string
  name?: string
  useYn?: boolean
}

export const warehouseApi = {
  getAll: (params?: WarehouseSearchParams) =>
    api.get<WarehouseDto[]>('/api/warehouses', { params }),

  getById: (id: number) =>
    api.get<WarehouseDto>(`/api/warehouses/${id}`),

  create: (data: WarehouseRequest) =>
    api.post<WarehouseDto>('/api/warehouses', data),

  update: (id: number, data: WarehouseRequest) =>
    api.put<WarehouseDto>(`/api/warehouses/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/warehouses/${id}`),
}
