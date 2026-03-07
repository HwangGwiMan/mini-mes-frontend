import api from './index'

export interface QuoteLineDto {
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

export interface QuoteDto {
  id: number
  quoteNumber: string
  name: string
  quoteDate: string
  validUntil: string | null
  partnerId: number
  partnerCode: string
  partnerName: string
  employeeId: number | null
  employeeCode: string | null
  employeeName: string | null
  approverId: number | null
  approverCode: string | null
  approverName: string | null
  statusCode: string
  remarks: string | null
  lines: QuoteLineDto[]
}

export interface QuoteLineRequest {
  itemId: number
  quantity: number
  unitPrice: number
  deliveryRequestDate?: string | null
  remarks?: string
  sortOrder: number
}

export interface QuoteRequest {
  quoteDate: string
  validUntil?: string | null
  partnerId: number
  employeeId?: number | null
  approverId: number
  remarks?: string
  lines: QuoteLineRequest[]
}

export interface QuoteSearchParams {
  quoteNumber?: string
  partnerId?: number
  statusCode?: string
  fromDate?: string
  toDate?: string
}

export interface ApprovalRequest {
  comment?: string
}

export interface ApprovalResponse {
  id: number
  quoteId: number
  approverEmployeeId: number
  approverUsername: string
  approverName: string
  action: 'APPROVED' | 'REJECTED'
  comment: string | null
  createdAt: string
}

export const quoteApi = {
  getAll: (params?: QuoteSearchParams) =>
    api.get<QuoteDto[]>('/api/quotes', { params }),

  getById: (id: number) =>
    api.get<QuoteDto>(`/api/quotes/${id}`),

  create: (data: QuoteRequest) =>
    api.post<QuoteDto>('/api/quotes', data),

  update: (id: number, data: QuoteRequest) =>
    api.put<QuoteDto>(`/api/quotes/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/quotes/${id}`),

  submit: (id: number) =>
    api.patch<void>(`/api/quotes/${id}/submit`),

  approve: (id: number, data: ApprovalRequest) =>
    api.post<void>(`/api/quotes/${id}/approve`, data),

  reject: (id: number, data: ApprovalRequest) =>
    api.post<void>(`/api/quotes/${id}/reject`, data),

  getApprovals: (id: number) =>
    api.get<ApprovalResponse[]>(`/api/quotes/${id}/approvals`),
}
