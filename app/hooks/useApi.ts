// app/hooks/useApi.ts
import { useState, useCallback } from 'react';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export function useApi<T = any>(): {
  data: T | null;
  loading: boolean;
  error: string | null;
  request: <R = T>(
    url: string, 
    options?: RequestInit, 
    config?: UseApiOptions
  ) => Promise<R | null>;
  clearError: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async<R = T> (
      url: string,
      options: RequestInit = {},
      {
        onSuccess,
        onError,
      }: UseApiOptions = {}
    ): Promise<R | null> => {
      try {
        setLoading(true);
        setError(null);

        console.log({
          url, options
        })
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Erro na requisição: ${response.statusText}`
          );
        }

        const responseData = await response.json() as R;
        setData(responseData as unknown as T);
        
        if (onSuccess) {
          onSuccess(responseData);
        }

        return responseData;
      } catch (err) {
        console.error(err)
        const errorMessage =
          err instanceof Error ? err.message : 'Ocorreu um erro desconhecido';

        setError(errorMessage);
        
        if (onError) {
          onError(err as Error);
        } else {
          console.error('Erro na requisição:', err);
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { data, loading, error, request, clearError };
}

// Utility function for common HTTP methods
export const createApiClient = <T = any>(baseUrl: string) => {
  const { request } = useApi<T>();

  return {
    get: (endpoint: string, options?: RequestInit) =>
      request(`${baseUrl}${endpoint}`, { ...options, method: 'GET' }),

    post: (endpoint: string, body: any, options?: RequestInit) =>
      request(`${baseUrl}${endpoint}`, {
        ...options,
        method: 'POST',
        body: JSON.stringify(body),
      }),

    put: (endpoint: string, body: any, options?: RequestInit) =>
      request(`${baseUrl}${endpoint}`, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(body),
      }),

    delete: (endpoint: string, options?: RequestInit) =>
      request(`${baseUrl}${endpoint}`, { ...options, method: 'DELETE' }),
  };
};

// Example usage:
// const api = createApiClient('https://api.example.com');
// const { data, loading, error } = await api.get('/users');
// await api.post('/users', { name: 'John' });