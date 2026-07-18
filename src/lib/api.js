import axios from 'axios'

const TOKEN_KEY = 'performa.accessToken'
const REFRESH_KEY = 'performa.refreshToken'
const USER_KEY = 'performa.user'

export const storage = {
  get accessToken() { return localStorage.getItem(TOKEN_KEY) },
  get refreshToken() { return localStorage.getItem(REFRESH_KEY) },
  get user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  },
  setSession({ accessToken, refreshToken, user }) {
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_KEY, refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = storage.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshPromise = null

// On 401, try one token refresh then replay the request; log out on failure.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const isAuthCall = original?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && !original._retried && !isAuthCall && storage.refreshToken) {
      original._retried = true
      try {
        refreshPromise ??= axios
          .post('/api/auth/refresh', { refreshToken: storage.refreshToken })
          .then((r) => {
            storage.setSession(r.data)
            return r.data.accessToken
          })
          .finally(() => { refreshPromise = null })
        const token = await refreshPromise
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      } catch {
        storage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export function apiErrorMessage(error) {
  return (
    error?.response?.data?.error ||
    error?.message ||
    'Something went wrong'
  )
}
