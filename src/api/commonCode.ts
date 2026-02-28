import api from './index'

export interface CommonCodeDto {
  id: number
  codeGroup: string
  code: string
  name: string
  sortOrder: number
}

export const commonCodeApi = {
  search: (groupCode: string) =>
    api.post<CommonCodeDto[]>('/api/common-codes/search', { groupCode }),
}
