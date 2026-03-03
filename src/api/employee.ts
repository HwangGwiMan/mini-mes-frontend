import api from './index'

export interface EmployeeDto {
  id: number
  code: string
  name: string
  deptCode: string
  positionCode: string
  hireDate: string | null
  phone: string
  email: string
  useYn: boolean
  sortOrder: number
}

export interface EmployeeRequest {
  code: string
  name: string
  deptCode: string
  positionCode: string
  hireDate: string | null
  phone: string
  email: string
  useYn: boolean
  sortOrder: number
}

export interface EmployeeSearchParams {
  code?: string
  name?: string
  deptCode?: string
}

export const employeeApi = {
  getAll: (params?: EmployeeSearchParams) =>
    api.get<EmployeeDto[]>('/api/employees', { params }),

  getById: (id: number) =>
    api.get<EmployeeDto>(`/api/employees/${id}`),

  create: (data: EmployeeRequest) =>
    api.post<EmployeeDto>('/api/employees', data),

  update: (id: number, data: EmployeeRequest) =>
    api.put<EmployeeDto>(`/api/employees/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/api/employees/${id}`),
}
