import { api } from '@/services/api'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  gymName: string
  ownerName: string
  email: string
  phone: string
  password: string
  city?: string
}

export interface AuthResponseData {
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    role: 'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'TRAINER'
  }
  gym: {
    id: string
    name: string
    slug: string
    city: string | null
    currency: string
  }
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponseData> => {
    const res = await api.post('/auth/login', payload)
    return res.data.data
  },

  register: async (payload: RegisterPayload): Promise<AuthResponseData> => {
    const res = await api.post('/auth/register', payload)
    return res.data.data
  },

  getMe: async (): Promise<AuthResponseData> => {
    const res = await api.get('/auth/me')
    return res.data.data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },
}
