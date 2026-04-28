import api from './index'

export interface MaterialIssueLineDto {
  id: number
  workOrderMaterialId: number
  materialItemId: number
  materialItemCode: string
  materialItemName: string
  warehouseId: number
  warehouseName: string
  lotNo: string | null
  issuedQty: number
  sortOrder: number
}

export interface MaterialIssueDto {
  id: number
  materialIssueNumber: string
  name: string // = materialIssueNumber (useCrudPage 호환)
  workOrderId: number
  workOrderNumber: string
  itemId: number
  itemName: string
  statusCode: string // MI_STATUS_01(초안) / MI_STATUS_02(확정) / MI_STATUS_03(취소)
  issueDate: string
  remarks: string
  lines: MaterialIssueLineDto[]
}

export interface MaterialIssueLineRequest {
  id: number
  lotNo: string | null
  issuedQty: number
}

export interface MaterialIssueRequest {
  /** 생성 시 필수 — 수정 시 서버에서 무시 */
  workOrderId: number | null
  issueDate: string
  remarks: string
  lines: MaterialIssueLineRequest[]
}

export const MI_STATUS_LABELS: Record<string, string> = {
  MI_STATUS_01: '초안',
  MI_STATUS_02: '확정',
  MI_STATUS_03: '취소',
}

export const materialIssueApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<MaterialIssueDto[]>('/api/material-issues', { params }),

  getById: (id: number) =>
    api.get<MaterialIssueDto>(`/api/material-issues/${id}`),

  create: (data: MaterialIssueRequest) =>
    api.post<MaterialIssueDto>('/api/material-issues', data),

  update: (id: number, data: MaterialIssueRequest) =>
    api.put<MaterialIssueDto>(`/api/material-issues/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/material-issues/${id}`),

  confirm: (id: number) =>
    api.patch<void>(`/api/material-issues/${id}/confirm`),

  cancel: (id: number) =>
    api.patch<void>(`/api/material-issues/${id}/cancel`),
}
