import api from './index'

export interface PurchaseOrderLineDto {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  orderedQuantity: number
  unitPrice: number | null
  requiredDate: string | null
  remarks: string
  sortOrder: number
  prLineId: number | null
}

export interface PurchaseOrderDto {
  id: number
  orderNumber: string
  name: string // = orderNumber (useCrudPage 호환)
  orderDate: string
  partnerId: number
  partnerName: string | null
  expectedArrivalDate: string | null
  statusCode: string
  prId: number | null
  remarks: string
  lines: PurchaseOrderLineDto[]
}

export interface PurchaseOrderLineRequest {
  itemId: number
  orderedQuantity: number
  unitPrice: number | null
  requiredDate: string | null
  remarks: string
  sortOrder: number
  prLineId: number | null
}

export interface PurchaseOrderRequest {
  orderDate: string
  partnerId: number
  expectedArrivalDate: string | null
  remarks: string
  lines: PurchaseOrderLineRequest[]
}

export const purchaseOrderApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<PurchaseOrderDto[]>('/api/purchase-orders', { params }),

  getById: (id: number) =>
    api.get<PurchaseOrderDto>(`/api/purchase-orders/${id}`),

  create: (data: PurchaseOrderRequest) =>
    api.post<PurchaseOrderDto>('/api/purchase-orders', data),

  createFromPr: (prId: number, data: PurchaseOrderRequest) =>
    api.post<PurchaseOrderDto>(`/api/purchase-orders/from-pr/${prId}`, data),

  update: (id: number, data: PurchaseOrderRequest) =>
    api.put<PurchaseOrderDto>(`/api/purchase-orders/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/purchase-orders/${id}`),

  confirm: (id: number) =>
    api.patch<void>(`/api/purchase-orders/${id}/confirm`),

  cancel: (id: number) =>
    api.patch<void>(`/api/purchase-orders/${id}/cancel`),
}
