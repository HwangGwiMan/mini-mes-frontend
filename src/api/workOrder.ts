import api from './index'

export interface WorkOrderMaterialDto {
  id: number
  materialItemId: number
  materialItemCode: string
  materialItemName: string
  warehouseId: number
  warehouseName: string
  plannedQty: number
  sortOrder: number
}

export interface WorkOrderDto {
  id: number
  workOrderNumber: string
  name: string // = workOrderNumber (useCrudPage 호환)
  salesOrderId: number | null
  salesOrderNumber: string | null
  salesOrderLineId: number | null
  itemId: number
  itemCode: string
  itemName: string
  bomId: number
  bomVersionCode: string
  warehouseId: number
  warehouseName: string
  plannedQty: number
  statusCode: string // WO_STATUS_01(초안) / WO_STATUS_02(확정) / WO_STATUS_03(취소)
  plannedStartDate: string
  plannedEndDate: string | null
  remarks: string
  materials: WorkOrderMaterialDto[]
}

export interface WorkOrderRequest {
  salesOrderId: number | null
  salesOrderLineId: number | null
  itemId: number
  bomId: number
  warehouseId: number
  plannedQty: number
  plannedStartDate: string
  plannedEndDate: string | null
  remarks: string
}

export const WO_STATUS_LABELS: Record<string, string> = {
  WO_STATUS_01: '초안',
  WO_STATUS_02: '확정',
  WO_STATUS_03: '취소',
}

export const workOrderApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<WorkOrderDto[]>('/api/work-orders', { params }),

  getById: (id: number) =>
    api.get<WorkOrderDto>(`/api/work-orders/${id}`),

  create: (data: WorkOrderRequest) =>
    api.post<WorkOrderDto>('/api/work-orders', data),

  update: (id: number, data: WorkOrderRequest) =>
    api.put<WorkOrderDto>(`/api/work-orders/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/work-orders/${id}`),

  confirm: (id: number) =>
    api.patch<void>(`/api/work-orders/${id}/confirm`),

  cancel: (id: number) =>
    api.patch<void>(`/api/work-orders/${id}/cancel`),
}
