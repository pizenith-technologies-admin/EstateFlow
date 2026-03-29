import { QueryClient } from '@tanstack/react-query';
import { api } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      queryFn: async ({ queryKey }) => {
        const response = await api.get(queryKey[0] as string);
        return response.data;
      },
    },
  },
});
