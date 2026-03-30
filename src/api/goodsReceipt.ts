import api from './index'

export interface GoodsReceiptLineDto {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  poLineId: number | null
  receiptTypeCode: string
  receivedQuantity: number
  unitPrice: number | null
  remarks: string
  sortOrder: number
}

export interface GoodsReceiptDto {
  id: number
  receiptNumber: string
  name: string // = receiptNumber (useCrudPage 호환)
  receiptDate: string
  poId: number | null
  poNumber: string | null
  partnerId: number
  partnerCode: string | null
  partnerName: string | null
  statusCode: string
  remarks: string
  lines: GoodsReceiptLineDto[]
}

export interface GoodsReceiptLineRequest {
  itemId: number
  poLineId: number | null
  receiptTypeCode: string
  receivedQuantity: number
  unitPrice: number | null
  remarks: string
  sortOrder: number
}

export interface GoodsReceiptRequest {
  receiptDate: string
  poId: number | null
  partnerId: number
  remarks: string
  lines: GoodsReceiptLineRequest[]
}

export const goodsReceiptApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<GoodsReceiptDto[]>('/api/goods-receipts', { params }),

  getById: (id: number) =>
    api.get<GoodsReceiptDto>(`/api/goods-receipts/${id}`),

  create: (data: GoodsReceiptRequest) =>
    api.post<GoodsReceiptDto>('/api/goods-receipts', data),

  update: (id: number, data: GoodsReceiptRequest) =>
    api.put<GoodsReceiptDto>(`/api/goods-receipts/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/goods-receipts/${id}`),

  confirm: (id: number) =>
    api.patch<void>(`/api/goods-receipts/${id}/confirm`),

  cancel: (id: number) =>
    api.patch<void>(`/api/goods-receipts/${id}/cancel`),
}
