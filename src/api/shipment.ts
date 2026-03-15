import api from './index'

export interface ShipmentLineDto {
  id: number
  salesOrderLineId: number
  itemId: number
  itemCode: string
  itemName: string
  plannedQuantity: number
  actualQuantity: number | null
  unitPrice: number
  plannedAmount: number
  actualAmount: number | null
  remarks: string
  sortOrder: number
}

export interface ShipmentDto {
  id: number
  shipmentNumber: string
  name: string // useCrudPage 호환용 (shipmentNumber와 동일)
  salesOrderId: number
  salesOrderNumber: string | null
  shipmentDate: string | null
  partnerId: number
  partnerName: string | null
  employeeId: number | null
  employeeName: string | null
  statusCode: string
  remarks: string
  lines: ShipmentLineDto[]
}

export interface ShipmentUpdateLineItem {
  id: number
  plannedQuantity: number
  remarks?: string
}

export interface ShipmentUpdateRequest {
  employeeId?: number | null
  statusCode: string
  remarks?: string
  lines: ShipmentUpdateLineItem[]
}

export interface ShipmentCompleteLineItem {
  id: number
  actualQuantity: number
}

export interface ShipmentCompleteRequest {
  shipmentDate: string
  lines: ShipmentCompleteLineItem[]
}

export interface ShipmentSearchParams {
  statusCode?: string
  salesOrderId?: number
  partnerId?: number
  fromDate?: string
  toDate?: string
}

export const shipmentApi = {
  getAll: (params?: ShipmentSearchParams) =>
    api.get<ShipmentDto[]>('/api/shipments', { params }),

  getById: (id: number) =>
    api.get<ShipmentDto>(`/api/shipments/${id}`),

  update: (id: number, data: ShipmentUpdateRequest) =>
    api.put<ShipmentDto>(`/api/shipments/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/shipments/${id}`),

  complete: (id: number, data: ShipmentCompleteRequest) =>
    api.post<ShipmentDto>(`/api/shipments/${id}/complete`, data),
}
