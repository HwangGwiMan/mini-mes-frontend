import api from './index'

export interface SalesOrderLineDto {
  id: number
  itemId: number
  itemCode: string
  itemName: string
  quantity: number
  unitPrice: number
  amount: number
  deliveryRequestDate: string | null
  remarks: string | null
  sortOrder: number
}

export interface SalesOrderDto {
  id: number
  orderNumber: string
  name: string
  orderDate: string
  deliveryDate: string | null
  partnerId: number
  partnerCode: string
  partnerName: string
  employeeId: number | null
  employeeCode: string | null
  employeeName: string | null
  quoteId: number | null
  quoteNumber: string | null
  statusCode: string
  remarks: string | null
  lines: SalesOrderLineDto[]
}

export interface SalesOrderLineRequest {
  itemId: number
  quantity: number
  unitPrice: number
  deliveryRequestDate?: string | null
  remarks?: string
  sortOrder: number
}

export interface SalesOrderRequest {
  orderDate: string
  deliveryDate?: string | null
  partnerId: number
  employeeId?: number | null
  quoteId?: number | null
  statusCode?: string
  remarks?: string
  lines: SalesOrderLineRequest[]
}

export interface SalesOrderSearchParams {
  orderNumber?: string
  partnerId?: number
  statusCode?: string
  fromDate?: string
  toDate?: string
}

export const orderApi = {
  getAll: (params?: SalesOrderSearchParams) =>
    api.get<SalesOrderDto[]>('/api/sales-orders', { params }),

  getById: (id: number) =>
    api.get<SalesOrderDto>(`/api/sales-orders/${id}`),

  create: (data: SalesOrderRequest) =>
    api.post<SalesOrderDto>('/api/sales-orders', data),

  update: (id: number, data: SalesOrderRequest) =>
    api.put<SalesOrderDto>(`/api/sales-orders/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/sales-orders/${id}`),

  convertFromQuote: (quoteId: number) =>
    api.post<SalesOrderDto>(`/api/sales-orders/from-quote/${quoteId}`),
}
