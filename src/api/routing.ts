import api from './index'

export interface RoutingStepDto {
  id: number
  processId: number
  processCode: string
  processName: string
  stepOrder: number
  standardTime: number | null
  remarks: string | null
}

export interface RoutingDto {
  id: number
  bomId: number
  itemId: number
  itemCode: string
  itemName: string
  name: string  // useCrudPage 호환용 (itemName과 동일)
  bomVersion: string
  activeYn: boolean
  stepCount: number
  steps: RoutingStepDto[]
}

export interface RoutingStepRequest {
  processId: number
  stepOrder: number
  standardTime?: number | null
  remarks?: string | null
}

export interface RoutingCreateRequest {
  bomId: number
  steps: RoutingStepRequest[]
}

export interface RoutingUpdateRequest {
  steps: RoutingStepRequest[]
}

export interface RoutingSearchParams {
  itemCode?: string
  itemName?: string
  bomVersion?: string
  activeYn?: boolean
}

export const routingApi = {
  getAll: (params?: RoutingSearchParams) =>
    api.get<RoutingDto[]>('/api/routings', { params }),

  getById: (id: number) =>
    api.get<RoutingDto>(`/api/routings/${id}`),

  getByBomId: (bomId: number) =>
    api.get<RoutingDto | null>(`/api/routings/by-bom/${bomId}`),

  getByItemId: (itemId: number) =>
    api.get<RoutingDto[]>(`/api/routings/by-item/${itemId}`),

  create: (data: RoutingCreateRequest) =>
    api.post<RoutingDto>('/api/routings', data),

  update: (id: number, data: RoutingUpdateRequest) =>
    api.put<RoutingDto>(`/api/routings/${id}`, data),

  deactivate: (id: number) =>
    api.patch<RoutingDto>(`/api/routings/${id}/deactivate`),
}
