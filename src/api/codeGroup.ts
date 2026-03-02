import api from './index'

export interface CodeGroupDto {
  id: number
  groupCode: string
  groupName: string
  sortOrder: number
}

export interface CodeGroupRequest {
  groupCode: string
  groupName: string
  sortOrder: number
}

export const codeGroupApi = {
  getAll: () => api.get<CodeGroupDto[]>('/api/code-groups'),

  create: (data: CodeGroupRequest) =>
    api.post<CodeGroupDto>('/api/code-groups', data),

  update: (id: number, data: CodeGroupRequest) =>
    api.put<CodeGroupDto>(`/api/code-groups/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/code-groups/${id}`),
}
