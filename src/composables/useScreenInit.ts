import api from '@/api'

export interface CurrentUser {
  username: string
  role: string
  employeeId: number | null
}

export function useScreenInit() {
  async function initialize(): Promise<CurrentUser> {
    const response = await api.post<{ data: { me: CurrentUser } }>('/graphql', {
      query: `{ me { username role employeeId } }`,
    })
    return response.data.data.me
  }

  return { initialize }
}
