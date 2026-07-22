import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'

// Generic list query: key + endpoint + params object -> { data, isLoading, ... }
export function useList(key, endpoint, params = {}) {
  return useQuery({
    queryKey: [key, params],
    queryFn: () => api.get(endpoint, { params }).then((r) => r.data),
    keepPreviousData: true,
  })
}

// Generic mutation with toast + cache invalidation.
export function useApiMutation({ mutationFn, invalidate, successMessage, onSuccess }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (invalidate) {
        const keys = Array.isArray(invalidate) ? invalidate : [invalidate]
        keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }))
      }
      if (successMessage) toast.success(successMessage)
      onSuccess?.(data)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })
}

export function useProductMeta() {
  return useQuery({
    queryKey: ['product-meta'],
    queryFn: () => api.get('/products/meta').then((r) => r.data),
    staleTime: Infinity,
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data.settings),
    staleTime: 5 * 60_000,
  })
}

// Company name + logo, readable before sign-in.
export function useBranding() {
  return useQuery({
    queryKey: ['branding'],
    queryFn: () => api.get('/settings/public').then((r) => r.data.branding),
    staleTime: 10 * 60_000,
    retry: false,
  })
}
