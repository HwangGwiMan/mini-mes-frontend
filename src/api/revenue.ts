import api from './index'

export interface RevenueLineDto {
  id: number
  salesOrderLineId: number
  salesOrderId: number
  orderNumber: string
  itemId: number
  itemCode: string
  itemName: string
  quantity: number
  unitPrice: number
  amount: number
  remarks: string
  sortOrder: number
}

export interface RevenueDto {
  id: number
  revenueNumber: string
  name: string // useCrudPage 호환용 (revenueNumber와 동일)
  partnerId: number
  partnerName: string | null
  employeeId: number | null
  employeeName: string | null
  revenueDate: string
  statusCode: string
  totalAmount: number
  remarks: string
  lines: RevenueLineDto[]
}

/** 매출 생성 시 품목 선택 팝업에서 사용하는 수주 라인 타입 */
export interface AvailableOrderLineDto {
  salesOrderLineId: number
  salesOrderId: number
  orderNumber: string
  itemId: number
  itemCode: string
  itemName: string
  quantity: number
  unitPrice: number
}

export interface RevenueCreateLineItem {
  salesOrderLineId: number
  salesOrderId: number
  itemId: number
  quantity: number
  unitPrice: number
  remarks?: string
}

export interface RevenueCreateRequest {
  partnerId: number
  employeeId?: number | null
  revenueDate: string
  remarks?: string
  lines: RevenueCreateLineItem[]
}

export interface RevenueUpdateLineItem {
  id: number
  quantity: number
  unitPrice: number
  remarks?: string
}

export interface RevenueUpdateRequest {
  employeeId?: number | null
  revenueDate: string
  remarks?: string
  lines: RevenueUpdateLineItem[]
}

export interface RevenueSearchParams {
  statusCode?: string
  partnerId?: number
  fromDate?: string
  toDate?: string
}

export const revenueApi = {
  getAll: (params?: RevenueSearchParams) =>
    api.get<RevenueDto[]>('/api/revenues', { params }),

  getById: (id: number) =>
    api.get<RevenueDto>(`/api/revenues/${id}`),

  /** 거래처의 완료 수주 품목 목록 조회 — 매출 생성 팝업에서 사용 */
  getAvailableOrderLines: (partnerId: number) =>
    api.get<AvailableOrderLineDto[]>('/api/revenues/available-lines', { params: { partnerId } }),

  create: (data: RevenueCreateRequest) =>
    api.post<RevenueDto>('/api/revenues', data),

  update: (id: number, data: RevenueUpdateRequest) =>
    api.put<RevenueDto>(`/api/revenues/${id}`, data),

  /** 매출 마감: 초안 → 마감 */
  close: (id: number) =>
    api.post<RevenueDto>(`/api/revenues/${id}/close`),

  /** 마감 취소: 마감 → 취소 */
  cancel: (id: number) =>
    api.post<RevenueDto>(`/api/revenues/${id}/cancel`),

  delete: (id: number) =>
    api.delete<void>(`/api/revenues/${id}`),
}
