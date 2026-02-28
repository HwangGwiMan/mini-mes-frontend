import api from './index'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: string
}

export interface SignupRequest {
  username: string
  password: string
}

export interface ErrorResponse {
  message: string
}

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/api/auth/login', data),

  signup: (data: SignupRequest) =>
    api.post<void>('/api/auth/signup', data),
}
