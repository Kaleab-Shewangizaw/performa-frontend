import axios from 'axios'

const TOKEN_KEY = 'performa.accessToken'
const REFRESH_KEY = 'performa.refreshToken'
const USER_KEY = 'performa.user'

// sessionStorage, not localStorage: the session must not survive the tab
// closing, for every role.
export const storage = {
  get accessToken() { return sessionStorage.getItem(TOKEN_KEY) },
  get refreshToken() { return sessionStorage.getItem(REFRESH_KEY) },
  get user() {
    try { return JSON.parse(sessionStorage.getItem(USER_KEY)) } catch { return null }
  },
  setSession({ accessToken, refreshToken, user }) {
    sessionStorage.setItem(TOKEN_KEY, accessToken)
    sessionStorage.setItem(REFRESH_KEY, refreshToken)
    sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clear() {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(REFRESH_KEY)
    sessionStorage.removeItem(USER_KEY)
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
