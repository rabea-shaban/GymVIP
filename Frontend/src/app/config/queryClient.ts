import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 5, // 5 seconds fresh window for rapid dynamic sync
      gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 0,
    },
  },
})
