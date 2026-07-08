import { create } from 'zustand'
import { authService } from '../services/api'

interface User {
  id: number
  full_name: string
  email: string
  role?: string
  access_level?: string
  user?: { access_level?: string }

  profile_completed?: boolean
  is_first_login?: boolean
  employee_id?: number
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean

  login: (email: string, password: string) => Promise<User>
  logout: () => void
  checkAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),

  token: localStorage.getItem('token'),

  isAuthenticated: !!localStorage.getItem('token'),

  loading: false,

  login: async (email: string, password: string) => {
    try {
      set({ loading: true })

      const response = await authService.login({
        email,
        password,
      })

      console.log('LOGIN RESPONSE:', response.data)

      const accessToken = response.data.access_token
      const userData = {
  ...response.data.user,
  profile_completed: response.data.profile_completed,
  is_first_login: response.data.is_first_login,
}
localStorage.setItem(
  "user",
  JSON.stringify(userData)
);

      const profileCompleted =
  response.data.profile_completed

const isFirstLogin =
  response.data.is_first_login

const role =
  response.data.role

      localStorage.setItem(
  'token',
  accessToken
)

localStorage.setItem(
  'user',
  JSON.stringify(userData)
)

localStorage.setItem(
  'user_id',
  String(response.data.user_id)
)

localStorage.setItem(
  'employee_id',
  String(response.data.employee_id)
)

      set({
        token: accessToken,
        user: userData,
        isAuthenticated: true,
        loading: false,
      })

      return {
  ...userData,

  role,

  profile_completed:
    profileCompleted,

  is_first_login:
    isFirstLogin,

  employee_id:
    response.data.employee_id
}

    } catch (error) {

      localStorage.removeItem('token')
      localStorage.removeItem('user')

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      })

      throw error
    }
  },

 logout: () => {

  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('user_id')
  localStorage.removeItem('employee_id')
  
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  },

  checkAuth: () => {

    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')

    if (token && user) {

      set({
        token,
        user: JSON.parse(user),
        isAuthenticated: true,
      })

    } else {

      localStorage.removeItem('token')
      localStorage.removeItem('user')

      set({
        token: null,
        user: null,
        isAuthenticated: false,
      })
    }
  },
}))