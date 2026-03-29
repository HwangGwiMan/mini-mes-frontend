import api from './index'

export interface PurchaseRequestLineDto {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  requestedQuantity: number
  requiredDate: string | null
  remarks: string
  sortOrder: number
}

export interface PurchaseRequestDto {
  id: number
  requestNumber: string
  name: string // = requestNumber (useCrudPage 호환)
  requestDate: string
  requesterId: number | null
  requesterName: string | null
  statusCode: string
  remarks: string
  lines: PurchaseRequestLineDto[]
}

export interface PurchaseRequestLineRequest {
  itemId: number
  requestedQuantity: number
  requiredDate: string | null
  remarks: string
  sortOrder: number
}

export interface PurchaseRequestRequest {
  requestDate: string
  requesterId: number | null
  remarks: string
  lines: PurchaseRequestLineRequest[]
}

export const purchaseRequestApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<PurchaseRequestDto[]>('/api/purchase-requests', { params }),

  getById: (id: number) =>
    api.get<PurchaseRequestDto>(`/api/purchase-requests/${id}`),

  create: (data: PurchaseRequestRequest) =>
    api.post<PurchaseRequestDto>('/api/purchase-requests', data),

  update: (id: number, data: PurchaseRequestRequest) =>
    api.put<PurchaseRequestDto>(`/api/purchase-requests/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/purchase-requests/${id}`),

  submit: (id: number) =>
    api.patch<void>(`/api/purchase-requests/${id}/submit`),

  approve: (id: number) =>
    api.post<void>(`/api/purchase-requests/${id}/approve`),

  reject: (id: number) =>
    api.post<void>(`/api/purchase-requests/${id}/reject`),

  convertToPo: (id: number) =>
    api.post<unknown>(`/api/purchase-requests/${id}/convert-to-po`),
}
